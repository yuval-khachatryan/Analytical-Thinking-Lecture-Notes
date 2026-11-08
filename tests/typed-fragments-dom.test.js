const fs=require('node:fs'),assert=require('node:assert/strict'),M=require('../assets/interactive.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button,selectAction};')(require);
function exercise(start,rich){
 const E=env(),d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':'x>1/2 or x<0'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const rows=()=>d.querySelectorAll('.as-step');
 function type(field,text){field.focus();input(field,text);}
 function tool(row,op){selectAction(row,op);return row.querySelector(op==='replace'?'.as-replacements':'.as-conditions');}
 function pick(panel,text){type(panel.querySelector('.as-fragment-input'),text);button(panel,'בחירת החלק').click();}
 function commit(row){button(row,'הצגת התוצאה הצפויה').click();const result=row.querySelector('.as-action-preview');assert.ok(result.querySelector('button'),result.textContent);button(result,'יישום הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,d.textContent);}
 function text(row){return M.relationSource(M.parseRelation(E.context.CourseMathInput.read(row.querySelector('.pw-input'))));}
 return {E,d,rows,type,tool,pick,commit,text};
}
for(const rich of [false,true]){
 // Exact route in 1.3.9: split by sign first, then exclude the zero alternative.
 const t=exercise('1/x<2',rich),first=t.rows()[0],sign=selectAction(first,'splitSign');
 t.type(sign.querySelector('.as-justification-value'),'x');t.commit(first);
 assert.match(t.text(first),/x = 0/);
 const second=t.rows()[1],panel=t.tool(second,'conditionReplace');
 t.pick(panel,rich?String.raw`x=0\text{ וגם }\frac{1}{x}<2`:'x=0 and 1/x<2');
 const entry=panel.querySelector('.as-condition-replacement');assert.ok(entry,panel.textContent);
 const reason=entry.querySelector('.as-condition-reason');reason.value='denominator';reason.dispatchEvent({type:'change'});
 assert.equal(entry.querySelector('.as-condition-exclusion').hidden,false);
 t.type(entry.querySelector('.as-condition-input'),rich?String.raw`\varnothing`:'∅');
 t.type(entry.querySelector('.as-condition-denominator'),'x-1');button(entry,'בדיקת הפישוט').click();assert.match(entry.textContent,/אינו מכנה/);
 t.type(entry.querySelector('.as-condition-denominator'),'x');button(entry,'בדיקת הפישוט').click();assert.match(entry.textContent,/הפישוט נכון/);
 t.commit(second);assert.equal(t.text(second),'x > 0 וגם 1/x < 2 או x < 0 וגם 1/x < 2');
 assert.match(second.querySelector('.as-compact').textContent,/המכנה/);
 assert.ok(second.querySelector('a[href="#box-warn-zero-division"]')||second.querySelector('.as-compact').textContent.includes('box-warn-zero-division'));
 assert.doesNotMatch(t.d.querySelector('.algebra-work').textContent,/✓ הפתרון נכון/);

 const c=exercise('x>0 and x>1/2 or x<0 and x<1/2',rich),row=c.rows()[0],p=c.tool(row,'conditionReplace');
 c.pick(p,'x>0 and x>1/2');const selected=p.querySelector('.as-condition-replacement');
 c.type(selected.querySelector('.as-condition-input'),rich?String.raw`x>\frac12`:'x>1/2');
 c.type(p.querySelector('.as-fragment-input'),'x>7');button(row,'הצגת התוצאה הצפויה').click();assert.match(row.querySelector('.as-result').textContent,/בחירת החלק/,'unconfirmed typing cannot silently apply an earlier selection');
 button(p,'בחירת החלק').click();assert.match(p.textContent,/אינו נמצא/);
 c.type(p.querySelector('.as-fragment-input'),'');c.commit(row);
 assert.equal(c.text(row),'x > 1/2 או x < 0 וגם x < 1/2');

 const repeated=exercise('2x-3+3=5+3 or 2x-3+3=-5+3',rich),ar=repeated.rows()[0],ap=repeated.tool(ar,'replace');
 repeated.pick(ap,'2x-3+3');assert.equal(ap.querySelectorAll('.as-fragment-match').length,2);
 assert.equal(ap.querySelectorAll('.as-replacement').length,0,'ambiguous input must not select all occurrences');
 assert.ok(ap.querySelectorAll('.as-part-match').length>0);
 ap.querySelectorAll('.as-fragment-match')[1].click();const replacement=ap.querySelector('.as-replacement');
 repeated.type(replacement.querySelector('.as-replacement-input'),'2x');repeated.commit(ar);
 assert.equal(repeated.text(ar),'2x - 3 + 3 = 5 + 3 או 2x = -5 + 3');

 const duplicate=exercise('x>0 and x>1 or x>0 and x<-1',rich),dr=duplicate.rows()[0],dp=duplicate.tool(dr,'conditionReplace');
 duplicate.pick(dp,'x>0');assert.equal(dp.querySelectorAll('.as-fragment-match').length,2);
 dp.querySelectorAll('.as-fragment-match')[1].click();assert.equal(dp.querySelector('.as-condition-replacement').getAttribute('data-condition-path'),'and.1.0.1');
 button(dp.querySelector('.as-condition-replacement'),'מחיקת הבחירה').click();assert.equal(dp.querySelectorAll('.as-condition-replacement').length,0);
 // Clicking a fragment fills the same editable identification field.
 const cb=dp.querySelector('[data-condition="and.0.0.2"]');cb.checked=true;cb.dispatchEvent({type:'change'});
 assert.equal(M.relationSource(M.parseRelation(duplicate.E.context.CourseMathInput.read(dp.querySelector('.as-fragment-input')))),'x > 0 וגם x > 1');
}
console.log('Typed-selection DOM checks passed in both input adapters, including sign split, denominator exclusion, duplicates, drafts and deletion.');
