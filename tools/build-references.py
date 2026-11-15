#!/usr/bin/env python3
"""Embed referenced chapter boxes so inline previews also work from local files."""
from html.parser import HTMLParser
from html import escape
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, unquote
import json, os, posixpath, re

CACHE = re.compile(r'<script id="book-reference-data" type="application/json">[\s\S]*?</script>\s*')

def destination(href, page):
    u = urlsplit(href)
    if u.scheme or u.netloc or not u.fragment.startswith('box-'):
        return None
    file = posixpath.normpath(posixpath.join(posixpath.dirname(page), unquote(u.path))) if u.path else page
    if file.endswith('.qmd'):
        file = file[:-4] + '.html'
    return file + '#' + unquote(u.fragment)

class Scan(HTMLParser):
    def __init__(self, html, page, fragment=False):
        super().__init__(convert_charrefs=True)
        self.html, self.page, self.fragment = html, page, fragment
        self.offsets = [0]
        for line in html.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.divs, self.boxes, self.refs, self.edits = [], {}, [], []
        self.feed(html)
    def position(self):
        line, col = self.getpos()
        return self.offsets[line - 1] + col
    def handle_starttag(self, tag, attrs):
        data, start, raw = dict(attrs), self.position(), self.get_starttag_text()
        if tag == 'div':
            self.divs.append((start, data.get('id', '')))
        changed = False
        if tag == 'a' and 'href' in data:
            key = destination(data['href'], self.page)
            if key:
                self.refs.append(key)
                data['data-xref'] = key
                data['target'] = '_blank'
                data['rel'] = ' '.join(sorted(set((data.get('rel') or '').split()) | {'noopener'}))
                changed = True
        if self.fragment:
            for attr in ('href', 'src', 'poster'):
                value = data.get(attr)
                if not value:
                    continue
                u = urlsplit(value)
                if u.scheme or u.netloc:
                    continue
                path = posixpath.normpath(posixpath.join(posixpath.dirname(self.page), u.path)) if u.path else self.page
                if path.endswith('.qmd'):
                    path = path[:-4] + '.html'
                data[attr] = urlunsplit(('', '', path, u.query, u.fragment))
                changed = True
        if changed:
            replacement = '<' + tag + ''.join(' ' + k + ('="' + escape(v, quote=True) + '"' if v is not None else '') for k, v in data.items()) + '>'
            self.edits.append((start, start + len(raw), replacement))
    def handle_endtag(self, tag):
        if tag == 'div' and self.divs:
            start, identifier = self.divs.pop()
            if identifier.startswith('box-'):
                end = self.html.index('>', self.position()) + 1
                self.boxes[identifier] = self.html[start:end]
    def rewritten(self):
        result = self.html
        for start, end, replacement in reversed(self.edits):
            result = result[:start] + replacement + result[end:]
        return result

def build(output):
    pages = {p.name: CACHE.sub('', p.read_text()) for p in output.glob('*.html')}
    scans = {name: Scan(html, name) for name, html in pages.items()}
    total = 0
    for page, scan in scans.items():
        pending, visited, boxes = list(scan.refs), set(), {}
        while pending:
            key = pending.pop()
            if key in visited:
                continue
            visited.add(key)
            file, identifier = key.split('#', 1)
            target = scans.get(file)
            if file == page or not target or identifier not in target.boxes:
                continue
            fragment = Scan(target.boxes[identifier], file, fragment=True)
            boxes[key] = fragment.rewritten()
            pending.extend(fragment.refs)
        payload = json.dumps({'page': page, 'boxes': boxes}, ensure_ascii=False).replace('<', '\\u003c')
        result = scan.rewritten().replace('</head>', '<script id="book-reference-data" type="application/json">' + payload + '</script>\n</head>', 1)
        (output / page).write_text(result)
        total += len(boxes)
    print(f'Inline references: {total} cross-chapter boxes embedded; reference fallbacks open in a new tab.')

if __name__ == '__main__':
    build(Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', '_book')).resolve())
