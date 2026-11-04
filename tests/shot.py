#!/usr/bin/env python3
"""Screenshot one box of the rendered lecture, optionally after typing/clicking.

usage: shot.py <box-id> <out.png> [js-actions] [height]
The page is copied to _book/zz-test.html (deleted afterwards). The injected script
hides everything before the box, then runs the actions (JS, may use helpers
type(sel, text), click(sel), wait(ms)) after interactive.js has initialised.
"""
import os, subprocess, sys, time, urllib.parse
here = os.path.dirname(os.path.abspath(__file__))
book = os.path.join(here, '..', '_book')
src = os.path.join(book, os.environ.get('PAGE', '01-Introduction.html'))
dst = os.path.join(book, 'zz-test.html')
box, out = sys.argv[1], sys.argv[2]
actions = sys.argv[3] if len(sys.argv) > 3 else ''
height = sys.argv[4] if len(sys.argv) > 4 else '1500'
inject = r'''<script>
window.addEventListener("load", function () {
  var id = new URLSearchParams(location.search).get("id");
  var el = document.getElementById(id);
  if (!el) { document.body.innerHTML = "<h1>no element " + id + "</h1>"; return; }
  var n = el;
  while (n && n !== document.body) {
    var p = n.previousElementSibling;
    while (p) { p.style.display = "none"; p = p.previousElementSibling; }
    n = n.parentElement;
  }
  document.querySelectorAll("#quarto-sidebar, #quarto-margin-sidebar, header, nav.quarto-page-breadcrumbs").forEach(function (x) { x.style.display = "none"; });
  function type(sel, text, i) { var e = document.querySelectorAll(sel)[i || 0]; e.focus(); e.value = text; e.dispatchEvent(new Event("input", {bubbles: true})); }
  function click(sel, i) { document.querySelectorAll(sel)[i || 0].click(); }
  function key(sel, k, i) { var e = document.querySelectorAll(sel)[i || 0]; e.dispatchEvent(new KeyboardEvent("keydown", {key: k, bubbles: true})); }
  function select(sel, v, i) { var e = document.querySelectorAll(sel)[i || 0]; e.value = v; e.dispatchEvent(new Event("change", {bubbles: true})); }
  setTimeout(function () { try { ACTIONS } catch (e) { document.body.insertAdjacentHTML("afterbegin", "<pre>" + e + "</pre>"); } window.scrollTo(0, 0); }, 1500);
});
</script>'''.replace('ACTIONS', actions)
html = open(src, encoding='utf-8').read().replace('</body>', inject + '</body>')
open(dst, 'w', encoding='utf-8').write(html)
try:
    url = 'file://' + os.path.abspath(dst) + '?id=' + urllib.parse.quote(box)
    subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--disable-gpu',
                    '--hide-scrollbars', '--window-size=1100,' + height, '--force-device-scale-factor=' + os.environ.get('SCALE', '1'), '--virtual-time-budget=15000',
                    '--screenshot=' + os.path.abspath(out), url], check=True, capture_output=True)
finally:
    os.remove(dst)
print('ok', out)
