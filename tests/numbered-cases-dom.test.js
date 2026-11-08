// Exercise the real editor handlers with the existing DOM mock. No layout claims.
const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const harness=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button,selectAction,justify,partitionCases};')(require);
const {env,node,input,button,selectAction,justify,partitionCases}=harness;
const M=require('../assets/interactive.js');
const sameSet=(a,b)=>M.setEq(M.parseSet(a),M.parseSet(b));
function exercise(start,rich){
 const E=env(),d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':'x=4 or x=-1'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const row=n=>{const r=d.querySelectorAll('.as-step')[n-2];assert.ok(r,'missing line '+n);return r;};
 function choose(select,n){const option=select.children.find(o=>o.textContent==='שורה '+n);assert.ok(option,'line '+n+' unavailable: '+select.textContent);select.value=option.value;select.dispatchEvent({type:'change'});}
 function source(n,from){choose(row(n).querySelector('.as-source-line'),from);}
 function action(n,op,value){const r=row(n);if(rich)r.querySelector('.pw-input').focus();const field=selectAction(r,op);if(value!==undefined)input(field.querySelector('.as-justification-value'),value);return field;}
 function commit(n){const r=row(n);button(r,'הצגת התוצאה הצפויה').click();const result=r.querySelector('.as-action-preview');assert.ok(result.querySelector('button'),'preview failed: '+result.textContent);button(result,'יישום הצעד והמשך').click();assert.equal(r.querySelector('.as-editor').hidden,true,'commit failed: '+d.textContent);}
 function open(n,from,choice,at){source(n,from);action(n,'splitOr');if(at!==undefined)row(n).querySelector('[data-split-at="'+at+'"]').click();row(n).querySelector('[data-case-choice="'+choice+'"]').click();commit(n);}
 function close(n,opening,conclusion){action(n,'endCase');choose(row(n).querySelector('.as-opening-line'),opening);choose(row(n).querySelector('.as-conclusion-line'),conclusion);commit(n);}
 function merge(n,from,closures){source(n,from);action(n,'merge');for(const number of closures){const box=row(n).querySelector('[data-cite-line="'+number+'"]');assert.ok(box,'missing closure '+number);box.checked=true;box.dispatchEvent({type:'change'});}commit(n);}
 function text(n){return E.context.CourseMathInput.read(row(n).querySelector('.pw-input'));}
 return {E,d,row,source,action,commit,open,close,merge,text,choose};
}
for(const rich of [false,true]){
 const t=exercise('|2x-3|=5',rich);
 assert.doesNotMatch(t.d.textContent,/פתיחת המקרים/);
 t.action(2,'abs');t.commit(2);
 t.source(3,2);t.action(3,'splitOr');button(t.row(3),'הצגת התוצאה הצפויה').click();assert.match(t.row(3).textContent,/בחרו איזה מקרה/);
 t.open(3,2,1);assert.equal(t.d.querySelectorAll('.as-branch').length,0,'opening one case does not create case containers');
 t.action(4,'add','3');t.commit(4);t.action(5,'div','2');t.commit(5);
 assert.doesNotMatch(t.d.textContent,/✓ הפתרון נכון/,'one solved case cannot finish the exercise');
 t.close(6,3,5);
 assert.match(t.row(6).querySelector('.as-compact').textContent,/משורה 3.*בשורה 5/);
 assert.ok(!t.row(7).querySelector('.as-source-line').children.some(o=>o.textContent==='שורה 5'),'closed case is absent from source choices');
 t.open(7,2,0);t.action(8,'add','3');t.commit(8);t.action(9,'div','2');t.commit(9);t.close(10,7,9);
 t.merge(11,2,[6,10]);assert.match(t.d.textContent,/✓ הפתרון נכון/);
 assert.equal(sameSet('{-1,4}',t.text(11)),true);
 assert.equal(t.row(3).querySelector('.as-compact').hidden,false,'case argument remains visible after merging');
 // Editing inside a closed case invalidates the later closures and union.
 button(t.row(4),'עריכה').click();input(t.row(4).querySelector('.pw-input'),'2x=1');
 button(t.d.querySelector('.algebra-work').querySelectorAll('.ix-bar').at(-1),'בדיקת הפתרון').click();
 assert.equal(t.row(11).querySelector('.as-editor').hidden,false);assert.doesNotMatch(t.d.textContent,/✓ הפתרון נכון/);
}
for(const rich of [false,true]){
 const t=exercise('1/x<2',rich);
 button(t.row(2),'הצגת צעד אפשרי').click();button(t.row(2).querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 assert.equal(t.row(2).querySelector('.as-editor').hidden,true);
 t.open(3,2,0);t.action(4,'mul','x');t.commit(4);assert.equal(sameSet('(1/2,inf)',t.text(4)),true);
 t.action(5,'div','2');t.commit(5);t.close(6,3,5);
 t.open(7,2,1);t.action(8,'mul','x');t.commit(8);t.action(9,'div','2');t.commit(9);t.close(10,7,9);
 t.merge(11,2,[6,10]);assert.match(t.text(11),/וגם|and/);assert.doesNotMatch(t.d.textContent,/✓ הפתרון נכון/);
 t.action(12,'conditions');t.commit(12);assert.match(t.d.textContent,/✓ הפתרון נכון/);
}
{
 const t=exercise('x=1 or x=2 or x=3',false);
 t.open(2,1,1,1);t.open(3,2,0);t.close(4,3,3);t.open(5,2,1);t.close(6,5,5);t.merge(7,2,[4,6]);t.close(8,2,7);
 t.open(9,1,0,1);t.close(10,9,9);t.merge(11,1,[8,10]);assert.match(t.d.textContent,/✓ הפתרון נכון/);
}
{
 const t=exercise('3-2x<7',false);t.action(2,'sub','3');t.commit(2);
 t.source(3,1);justify(t.row(3),[{op:'sub',value:'3'},{op:'div',value:'-2'}]);t.commit(3);
 assert.match(t.row(3).querySelector('.as-compact').textContent,/לפי שורה 1/);
 button(t.row(2),'עריכה').click();button(t.row(2),'מחיקת הצעד').click();
 // Stable source IDs still cite the original start, not a shifted row number.
 button(t.row(2),'בדיקת הצעד והמשך').click();assert.match(t.d.textContent,/✓ הפתרון נכון/);
}
{
 const t=exercise('|2x-3|=5',false);
 partitionCases(t.row(2),['2x-3>=0','2x-3<0']);t.open(3,2,0);
 t.action(4,'mul','2x-3');button(t.row(4),'הצגת התוצאה הצפויה').click();assert.match(t.row(4).querySelector('.as-action-preview').textContent,/אינו אפס/);
 const tool=t.action(4,'replace').querySelector('.as-replacements'),choice=tool.querySelector('[data-part="0.0"]');choice.checked=true;choice.dispatchEvent({type:'change'});
 const entry=tool.querySelector('.as-replacement');input(entry.querySelector('.as-replacement-input'),'2x-3');button(entry,'בדיקת ההחלפה').click();assert.match(entry.textContent,/ההחלפה נכונה/);
 t.commit(4);assert.equal(M.relationSource(M.parseRelation(t.text(4))),'2x - 3 = 5');
}
{
 const t=exercise('3-2x<7',false);t.action(2,'sub','3');t.commit(2);t.action(3,'div','-2');t.commit(3);
 button(t.row(2),'עריכה').click();button(t.row(2),'מחיקת הצעד').click();button(t.row(2),'בדיקת הצעד והמשך').click();
 assert.match(t.d.textContent,/שצוטטה נמחקה/);assert.doesNotMatch(t.d.textContent,/✓ הפתרון נכון/);
}
console.log('Numbered-case DOM flows passed: both input adapters, reverse order, nested cases, citations, merge, weak assumptions and editing.');
