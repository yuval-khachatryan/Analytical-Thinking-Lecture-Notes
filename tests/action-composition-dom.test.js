// New student work is atomic; legacy model chains are expanded by relationModel.
const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'3+2*x=7',vars:'x',solve:'x'});
 node(d,'div',{class:'step',line:'x=2',actions:JSON.stringify([{op:'sub',value:'3'},{op:'div',value:'2'}])});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 function enter(index,op,operand,result){
  const row=d.querySelectorAll('.as-step')[index],add=button(row,'צירוף פעולה');
  assert.equal(add.hidden,true);assert.equal(add.disabled,true);add.click();
  assert.equal(row.querySelectorAll('.as-justification-entry').length,1);
  const f=selectAction(row,op).querySelector('.as-justification-value');f.focus();input(f,operand);
  assert.equal(add.disabled,true);add.click();assert.equal(row.querySelectorAll('.as-justification-entry').length,1);
  const answer=row.querySelector('.pw-input');answer.focus();input(answer,result);
  button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 }
 enter(0,'sub','3','2*x=4');enter(1,'div','2','x=2');
 assert.equal(d.getAttribute('data-solution-complete'),null);
 assert.equal(d.courseProof.complete,false);
 button(d,'סיום פתרון').click();assert.equal(d.getAttribute('data-solution-complete'),'true');assert.equal(d.courseProof.complete,true);
 assert.equal(d.courseProof.steps.length,3);
 assert.deepEqual(Array.from(d.courseProof.steps[2].sources),[d.courseProof.steps[1].id]);
 button(d,'פתרון לדוגמה').click();assert.equal(d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true','legacy compound model expands to atomic rows');
 assert.equal(d.querySelector('.pw-solution').querySelectorAll('.as-model-step').length,2);
 button(d,'כתיבת פתרון').click();assert.equal(d.querySelectorAll('.as-step')[0].querySelector('.as-editor').hidden,true);
 button(d,'מההתחלה').click();assert.ok(d.querySelector('.as-given'),'target row survives reset');assert.equal(d.querySelector('.proof-goal'),null,'no duplicate goal title');assert.equal(d.getAttribute('data-solution-complete'),null);
}
console.log('Atomic steps DOM: separate operations, legacy model expansion, stable references, draft retention, explicit finish and reset passed in both adapters.');
