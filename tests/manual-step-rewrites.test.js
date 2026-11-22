const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../assets/interactive.js');
const cfg={mode:'rel',vars:['n'],solve:'n',positive:['n'],requireJustification:true,explicitCases:true};
const edits=[['2/(n+1)*(50*n+50)','2/(n+1)*(50*(n+1))'],['2/(n+1)*(50*(n+1))','100'],['1/50*(50*n+50)','n+1']];
const actions=[{op:'mul',value:'50*n+50'},...edits.map(([before,after])=>({op:'rewrite',edits:[{before,after}]}))];
const check=(as=actions,text='100<n+1')=>M.checkProof({kind:'relations',start:'2/(n+1)<1/50',cfg},[{source:1,text,actions:as}]);
assert.equal(check().results[0].ok,true);
for(const bad of ['99','100+1/1000000000000','100*(n-8)/(n-8)']){
 const as=JSON.parse(JSON.stringify(actions));as[2].edits[0].after=bad;
 assert.equal(check(as).results[0].ok,false,bad);
}
assert.equal(check(actions,'99<n').results[0].ok,false,'cannot hide subtraction in final result');
assert.equal(check([...actions,{op:'sub',value:'1'}],'99<n').results[0].status,'step-too-large');
assert.equal(check([actions[0],actions[2]]).results[0].ok,false,'dependent rewrite requires its preceding rewrite');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),parent=node(E.document,'section',{id:'box-q-epsilon-solve'}),d=node(parent,'div',{class:'derive',vars:'n',solve:'n',positive:'n',start:'2/(n+1)<1/50'});
 node(d,'div',{class:'step',line:'100<n+1',action:'mul',value:'50*n+50'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.as-step');
 const type=(f,text)=>{f.focus();input(f,text);};
 assert.equal(row.querySelector('.as-simplify-after'),null,'no automatic simplification checkbox');
 assert.equal(row.querySelector('.as-add-manual-rewrite').hidden,true);
 const main=selectAction(row,'mul'),operand=main.querySelector('.as-justification-value');type(operand,'50*n+50');
 assert.equal(row.querySelector('.as-add-manual-rewrite').disabled,false);
 const fields=[];
 for(const [before,after] of edits){
  button(row,'פישוט ידני נוסף').click();
  const blocks=row.querySelectorAll('.as-manual-rewrite'),block=blocks[blocks.length-1],panel=block.querySelector('.as-replacements');
  assert.equal(block.querySelector('.as-action-category').parentNode.hidden,true,'manual rewrites do not add another operation menu');
  assert.equal(row.querySelector('.as-add-manual-rewrite').disabled,true,'incomplete rewrite cannot be followed');
  type(panel.querySelector('.as-fragment-input'),before);button(panel,'בחירת החלק').click();
  const field=panel.querySelector('.as-replacement-input');assert.ok(field,panel.textContent);fields.push(field);
  type(field,after);button(panel,'בדיקת ההחלפה').click();assert.match(panel.textContent,/ההחלפה נכונה/);
  assert.equal(row.querySelector('.as-add-manual-rewrite').disabled,false);
 }
 button(row,'הצגת התוצאה הצפויה').click();button(row.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 assert.equal(d.courseProof.steps.length,2,'one proof row retains all three manual simplifications');
 assert.equal(d.courseProof.steps[1].actions.length,4);
 assert.equal(d.courseProof.steps[1].actions[2].op,'rewrite');
 assert.match(row.querySelector('.as-compact').textContent,/פישוט ידני נוסף/);
 assert.equal(d.courseProof.complete,false);
 button(row,'עריכה').click();assert.equal(row.querySelectorAll('.as-manual-rewrite').length,3);
 const restored=row.querySelectorAll('.as-replacement-input');assert.equal(restored.length,3,'preview application restores editable rewrites');
 assert.equal(E.context.CourseMathInput.read(restored[1]),'100');
 type(restored[0],'2/(n+1)*(50*(n+1))+1');
 button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,false,'invalid previous rewrite cannot certify later work');
 button(d,'מההתחלה').click();assert.equal(d.querySelectorAll('.as-manual-rewrite').length,0);
}
console.log('Manual rewrites: exact dependent expressions, domain preservation, compact controls, same-row recording, preview/application, restored edits and reset passed in both adapters.');
