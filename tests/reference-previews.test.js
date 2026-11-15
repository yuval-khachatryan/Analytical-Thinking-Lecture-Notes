const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env(),doc=E.document;
const original=node(doc,'div',{id:'box-local',class:'thmbox'});node(original,'p',{},'Local definition');
const paragraph=node(doc,'p'),local=node(paragraph,'a',{href:'#box-local'},'Local');
const cross=node(paragraph,'a',{href:'01-Introduction.html#box-def-floor','data-xref':'01-Introduction.html#box-def-floor'},'הגדרת הערך השלם');
const missing=node(paragraph,'a',{href:'01-Introduction.html#box-missing'},'Missing');
const section=node(paragraph,'a',{href:'#section'},'Section');
const target=node(doc,'div',{id:'box-def-floor',class:'thmbox thmbox-definition'});target.remove();
node(target,'p',{},'הגדרת הערך השלם');node(target,'span',{id:'floor-math',class:'math'},'\\(\\lfloor x\\rfloor\\)');
node(target,'a',{href:'01-Introduction.html#box-next','data-xref':'01-Introduction.html#box-next'},'Next definition');
const next=node(doc,'div',{id:'box-next',class:'thmbox'});next.remove();node(next,'p',{},'Nested definition');
const fixtures={'<div>floor fixture</div>':target,'<div>next fixture</div>':next};
node(doc,'script',{id:'book-reference-data'},JSON.stringify({page:'02-Sequences.html',boxes:{'01-Introduction.html#box-def-floor':'<div>floor fixture</div>','01-Introduction.html#box-next':'<div>next fixture</div>'}}));
// Browser HTML parsing is represented by known fixture trees in this DOM mock.
// The build test separately checks the real serialized HTML fragments.
const create=doc.createElement;
doc.createElement=function(tag){const el=create(tag);if(tag==='div')Object.defineProperty(el,'innerHTML',{get(){return this._text;},set(html){this.replaceChildren();this._text='';if(fixtures[html])this.appendChild(fixtures[html].cloneNode(true));else this.textContent=html;}});return el;};
let fetches=0;E.context.fetch=()=>{fetches++;throw Error('offline');};
E.run(fs.readFileSync('assets/interactive.js','utf8'));doc.dispatchEvent({type:'DOMContentLoaded'});
function click(link,extra={}){let prevented=false;doc.dispatchEvent({type:'click',button:0,target:link,preventDefault(){prevented=true;},...extra});return prevented;}
assert.equal(cross.getAttribute('target'),'_blank');assert.equal(local.getAttribute('target'),'_blank');assert.equal(section.getAttribute('target'),null);
assert.equal(click(cross),true);let panel=doc.querySelector('.xref-panel');assert.ok(panel);assert.equal(panel.previousSibling,paragraph);assert.match(panel.textContent,/הגדרת הערך השלם/);assert.equal(panel.querySelector('[id]'),null);assert.equal(cross.getAttribute('aria-expanded'),'true');assert.equal(fetches,0);
let jump=panel.querySelector('.xref-jump');assert.equal(jump.getAttribute('href'),'01-Introduction.html#box-def-floor');assert.equal(jump.getAttribute('target'),'_blank');assert.match(jump.getAttribute('rel'),/noopener/);assert.equal(click(jump),false);
let inner=panel.querySelector('a[data-xref]');assert.equal(click(inner),true);assert.equal(doc.querySelectorAll('.xref-panel').length,2);
assert.equal(click(cross),true);assert.equal(doc.querySelectorAll('.xref-panel').length,0);assert.equal(inner.getAttribute('aria-expanded'),'false');
assert.equal(click(cross),true);doc.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(doc.querySelector('.xref-panel'),null);
assert.equal(click(local),true);panel=doc.querySelector('.xref-panel');assert.match(panel.textContent,/Local definition/);assert.equal(panel.querySelector('.xref-jump').getAttribute('target'),'_blank');panel.querySelector('.xref-close').click();assert.equal(doc.querySelector('.xref-panel'),null);
for(const mods of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{button:1}]){assert.equal(click(cross,mods),false);assert.equal(doc.querySelector('.xref-panel'),null);}
assert.equal(click(missing),false);assert.equal(missing.getAttribute('target'),'_blank');assert.equal(click(section),false);assert.equal(fetches,0);
console.log('Reference previews: offline cross-chapter and nested copies, local refs, close/toggle/Escape, modifiers and new-tab fallbacks passed. Browser layout not verified.');
