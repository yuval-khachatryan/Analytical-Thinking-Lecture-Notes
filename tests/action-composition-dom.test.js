const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button,selectAction};')(require);
function setup(start,rich){
 const E=env(),d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':'x=4 or x=-1'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.as-step'),add=button(row,'צירוף פעולה');
 const count=()=>row.querySelectorAll('.as-justification-entry').length;
 const type=(f,s)=>{f.focus();input(f,s);};
 return {E,d,row,add,count,type};
}
for(const rich of [false,true]){
 const t=setup('3+2x=7',rich);
 assert.equal(t.add.disabled,true);t.add.click();t.add.click();assert.equal(t.count(),1);
 const first=selectAction(t.row,'sub');assert.equal(t.add.disabled,true);
 t.type(first.querySelector('.as-justification-value'),'3+');assert.equal(t.add.disabled,true);
 t.type(first.querySelector('.as-justification-value'),'3');assert.equal(t.add.disabled,false);
 t.add.click();assert.equal(t.count(),2);assert.equal(t.add.disabled,true);t.add.click();assert.equal(t.count(),2);
 const second=selectAction(t.row,'div',1);t.type(second.querySelector('.as-justification-value'),'0');assert.equal(t.add.disabled,true);
 t.type(second.querySelector('.as-justification-value'),'2');assert.equal(t.add.disabled,false);
 t.type(first.querySelector('.as-justification-value'),'');assert.equal(t.add.disabled,true,'an earlier unfinished action blocks appending too');
 t.type(first.querySelector('.as-justification-value'),'3');assert.equal(t.add.disabled,false);
 button(t.row,'הצגת התוצאה הצפויה').click();assert.ok(t.row.querySelector('.as-action-preview').querySelector('button'));
 // Whole-line case operations cannot be selected as part of a compound step.
 selectAction(t.row,'splitCustom',1);
 assert.equal(second.querySelector('option[value="splitCustom"]').getAttribute('disabled'),'');
 assert.equal(t.add.disabled,true);button(t.row,'הצגת התוצאה הצפויה').click();assert.match(t.row.querySelector('.as-result').textContent,/בשורה נפרדת/);
 button(second,'מחיקת הפעולה').click();assert.equal(t.count(),1);
 for(const op of ['splitSign','splitCustom','splitOr','endCase','merge','combine']){
  selectAction(t.row,op);assert.equal(t.add.disabled,true,op);t.add.click();assert.equal(t.count(),1,op);
 }
 const custom=t.row.querySelector('.as-justification-rule').querySelector('option[value="combine"]');assert.equal(custom.getAttribute('disabled'),null,'single-action choices become available again');

 const abs=setup('|2x-3|=5',rich);selectAction(abs.row,'abs');assert.equal(abs.add.disabled,false);
 abs.add.click();const plus=selectAction(abs.row,'add',1);abs.type(plus.querySelector('.as-justification-value'),'3');assert.equal(abs.add.disabled,false);
 abs.add.click();const divide=selectAction(abs.row,'div',2);abs.type(divide.querySelector('.as-justification-value'),'2');
 button(abs.row,'הצגת התוצאה הצפויה').click();button(abs.row.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();assert.equal(abs.row.querySelector('.as-editor').hidden,true);
 const empty=setup('|x|=-1',rich);selectAction(empty.row,'abs');assert.equal(empty.add.disabled,true,'no extra operation after the empty solution set');
 const variable=setup('1/x<2',rich);const mul=selectAction(variable.row,'mul');variable.type(mul.querySelector('.as-justification-value'),'x');assert.equal(variable.add.disabled,true,'an unjustified variable multiplication cannot be extended');
}
console.log('Action composition passed: empty/incomplete/invalid actions, standalone cases, terminal results, deletion and valid composed operations.');
