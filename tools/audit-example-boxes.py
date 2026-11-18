"""Check rendered chapters for teaching boxes nested inside examples.

Run from Notes after rendering: python tools/audit-example-boxes.py
Answer controls and explicitly requested folded model solutions are not
additional theorem-style teaching boxes and remain part of their workspaces.
"""
from html.parser import HTMLParser
from pathlib import Path
import sys


class ExampleBoxes(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attributes):
        if tag != 'div':
            return
        attrs = dict(attributes)
        classes = set(attrs.get('class', '').split())
        examples = [parent for parent in self.stack
                    if set(parent.get('class', '').split()) &
                    {'thmbox-example', 'thmbox-worked-question'}]
        if 'thmbox' in classes and examples:
            parent = examples[-1]
            self.errors.append((parent.get('id') or parent.get('title'),
                                attrs.get('id') or attrs.get('title') or classes))
        self.stack.append(attrs)

    def handle_endtag(self, tag):
        if tag == 'div':
            self.stack.pop()


errors = []
for chapter in ['01-Introduction.html', '02-Sequences.html']:
    parser = ExampleBoxes()
    parser.feed((Path('_book') / chapter).read_text())
    errors.extend((chapter, parent, child) for parent, child in parser.errors)

if errors:
    for chapter, parent, child in errors:
        print(f'{chapter}: {child} is inside {parent}')
    sys.exit(1)
print('Both chapters: no teaching boxes nested inside examples or worked questions.')
