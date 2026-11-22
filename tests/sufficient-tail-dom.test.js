const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),parent=node(E.document,'section',{id:'box-q-epsilon-solve'});
 const d=node(parent,'div',{class:'derive',vars:'n',solve:'n',positive:'n',start:'2/(n+1)<1/50'});
 node(d,'div',{class:'step',line:'100<n+1',action:'mul',value:'50*(n+1)'});
 node(d,'div',{class:'step',line:'99<n',action:'sub',value:'1'});
 const ordinary=node(E.document,'div',{class:'derive',vars:'n',solve:'n',positive:'n',start:'n>99'});
 node(ordinary,'div',{class:'step',line:'99<n',action:'swap'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 const rows=()=>d.querySelectorAll('.as-step');
 function choose(row,op,operand){
  let entry;
  if(op==='sufficientTail'){
   entry=row.querySelector('.as-justification-entry');const category=entry.querySelector('.as-action-category');
   category.value='tail';category.dispatchEvent({type:'change'});
   const action=entry.querySelector('.as-justification-rule');action.value=op;action.dispatchEvent({type:'change'});
  }else entry=selectAction(row,op);
  if(operand!==undefined){const f=entry.querySelector('.as-justification-value');f.focus();input(f,operand);}
 }
 function answer(row,text){const f=row.querySelector('.pw-input');f.focus();input(f,text);button(row,'בדיקת הצעד והמשך').click();}
 function simplify(row){
  button(row,'פישוט ידני נוסף').click();const panel=row.querySelector('.as-replacements');
  const before=panel.querySelector('.as-fragment-input');before.focus();input(before,'2/(n+1)*(50*(n+1))');button(panel,'בחירת החלק').click();
  const after=panel.querySelector('.as-replacement-input');after.focus();input(after,'100');
 }
 const first=rows()[0];assert.equal(first.querySelector('.as-add-manual-rewrite').hidden,true);
 choose(first,'mul','50*(n+1)');assert.equal(first.querySelector('.as-add-manual-rewrite').hidden,false);simplify(first,true);
 answer(first,'99<n');assert.equal(first.querySelector('.as-editor').hidden,false,'subtracting one is not expression simplification');
 answer(first,'100<n+1');assert.equal(first.querySelector('.as-editor').hidden,true,first.textContent);
 assert.equal(d.courseProof.steps[1].actions.length,2);assert.match(first.querySelector('.as-compact').textContent,/פישוט/);
 choose(rows()[1],'sub','1');answer(rows()[1],'99<n');assert.equal(rows()[1].querySelector('.as-editor').hidden,true);
 assert.equal(d.courseProof.complete,false);
 // Readiness is not submission: a stricter justified cutoff can still be added.
 button(d,'הוספת שורה').click();const last=rows()[2];choose(last,'sufficientTail','98');
 assert.equal(last.querySelector('.as-add-manual-rewrite').hidden,true);
 answer(last,'n>98');assert.equal(last.querySelector('.as-editor').hidden,false);
 choose(last,'sufficientTail','1000');button(last,'הצגת התוצאה הצפויה').click();
 assert.match(last.querySelector('.as-action-preview').textContent,/1000/);
 button(last,'יישום הצעד והמשך').click();assert.equal(last.querySelector('.as-editor').hidden,true,last.textContent);
 assert.equal(d.courseProof.goals[0].kind,'sufficient-tail');assert.equal(d.courseProof.complete,false);
 button(d,'סיום פתרון').click();assert.equal(d.courseProof.complete,true);
 button(first,'עריכה').click();assert.equal(d.courseProof.complete,false,'editing invalidates completion');
 assert.equal(first.querySelectorAll('.as-manual-rewrite').length,1,'editing preserves the manual simplification');
 // Removing a multiplier hides/resets the optional simplification.
 choose(first,'mul','');assert.equal(first.querySelector('.as-add-manual-rewrite').hidden,true);assert.equal(first.querySelector('.as-add-manual-rewrite').disabled,true,'invalid source cannot extend the manual work');
 button(d,'מההתחלה').click();const fresh=rows()[0];choose(fresh,'mul','50*(n+1)');
 button(fresh,'הצגת התוצאה הצפויה').click();assert.match(fresh.querySelector('.as-action-preview').textContent,/100/,'cancellation is available in the preview');
 // A separate simplification row remains available if an unsimplified result was entered.
 answer(fresh,'2/(n+1)*(50*(n+1))<1/50*(50*(n+1))');assert.equal(fresh.querySelector('.as-editor').hidden,true);
 const second=rows()[1];choose(second,'simplify');answer(second,'100<n+1');assert.equal(second.querySelector('.as-editor').hidden,true,second.textContent);
 button(d,'פתרון לדוגמה').click();assert.equal(d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true');
 button(ordinary,'כתיבת פתרון').click();const category=ordinary.querySelector('.as-action-category');
 assert.equal(Array.from(category.children).some(x=>x.getAttribute('value')==='tail'),false,'ordinary solving has no sufficient-tail action');
}
console.log('Sufficient-tail DOM: compact optional simplification, invalid-step rejection, preview/application, separate rows, larger cutoffs, completion/edit/reset and ordinary-task isolation passed in both adapters.');
