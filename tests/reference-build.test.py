from pathlib import Path
from tempfile import TemporaryDirectory
from html.parser import HTMLParser
import importlib.util,json,re
spec=importlib.util.spec_from_file_location('refs','tools/build-references.py');refs=importlib.util.module_from_spec(spec);spec.loader.exec_module(refs)
class Links(HTMLParser):
 def __init__(self,s):super().__init__();self.links=[];self.feed(s)
 def handle_starttag(self,t,a):
  if t=='a':self.links.append(dict(a))
def data(html):return json.loads(re.search(r'<script id="book-reference-data" type="application/json">(.*?)</script>',html,re.S)[1])
with TemporaryDirectory(dir='tmp',prefix='reference-build-') as d:
 p=Path(d)
 (p/'01-Introduction.html').write_text('<html><head></head><body><div id="box-def-floor" class="thmbox"><p>הערך השלם <span class="math">\\(\\lfloor x\\rfloor\\)</span></p><div>nested content</div><a href="#box-next">Next</a><img src="figures/floor.svg"></div><div id="box-next" class="thmbox"><p>Next definition</p><a href="#box-def-floor">Back</a></div></body></html>')
 (p/'02-Sequences.html').write_text('<html><head></head><body><a href="01-Introduction.html#box-def-floor">Floor</a><a href="#box-local">Local</a><a href="#section">Section</a><a href="https://example.org/#box-ext">External</a><div id="box-local" class="thmbox">Local</div></body></html>')
 refs.build(p);html=(p/'02-Sequences.html').read_text();cache=data(html)
 assert cache['page']=='02-Sequences.html'
 assert set(cache['boxes'])=={'01-Introduction.html#box-def-floor','01-Introduction.html#box-next'}
 floor=cache['boxes']['01-Introduction.html#box-def-floor']
 assert 'nested content' in floor and '\\lfloor x\\rfloor' in floor
 assert 'href="01-Introduction.html#box-next"' in floor
 links=Links(html).links
 assert all(a['target']=='_blank' and 'noopener' in a['rel'] for a in links[:2])
 assert 'target' not in links[2] and 'target' not in links[3]
 assert '\\u003cdiv' in html
 refs.build(p);assert (p/'02-Sequences.html').read_text()==html,'Repeated builds are idempotent'
print('Reference build: full nested boxes, math, rebased links, recursive references, safe JSON, fallback targets and repeat builds passed.')
