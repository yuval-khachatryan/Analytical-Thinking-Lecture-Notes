const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),parent=node(E.document,'section',{id:'box-exm-limit-arithmetic'}),d=node(parent,'div',{class:'derive',limit:'n',start:'3+1/n'});
 node(d,'div',{class:'step',line:'3',action:'arithmetic'});
 for(const f of ['assets/proof-curriculum.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 assert.ok(d.querySelector('.proof-goal'));assert.ok(d.querySelector('.proof-tools'));
 const row=d.querySelector('.seq-step');assert.ok(row.querySelector('.proof-context-controls'));assert.ok(row.querySelector('.proof-step-help'));
 const choose=(sel,value)=>{const e=row.querySelector(sel);e.value=value;e.dispatchEvent({type:'change'});};
 choose('.seq-category','limits');
 const options=Array.from(row.querySelector('.seq-action').children).map(x=>x.getAttribute('value'));
 assert.ok(options.includes('limitOut'));assert.ok(!options.includes('bounded'));assert.ok(!options.includes('reciprocal'));
 choose('.seq-action','bounded');
 const result=row.querySelector('.pw-input');result.focus();input(result,'lim(3+1/n)=0');
 button(row,'בדיקת הצעד והמשך').click();assert.notEqual(row.querySelector('.as-editor').hidden,true,'forged unavailable action cannot validate');
 choose('.seq-action','arithmetic');input(result,'lim(3+1/n)=3');button(row,'בדיקת הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 assert.equal(d.courseProof.version,1);assert.equal(d.courseProof.goals[0].established,true);assert.equal(d.courseProof.complete,false);
 button(d,'סיום פתרון').click();assert.equal(d.courseProof.complete,true);
 button(row,'עריכה').click();assert.equal(d.courseProof.complete,false);
}
// With no usable model continuation, legal cube roots are not suggested just
// because they can be applied to both sides of an ordinary quadratic.
{
 const E=env(),d=node(E.document,'div',{class:'derive',vars:'x',solve:'x',start:'x^2+x=1'});
 node(d,'div',{class:'step',line:'x^2+x=1'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.as-step');button(row,'הצגת צעד אפשרי').click();
 assert.doesNotMatch(row.querySelector('.pw-hints').textContent,/שורש שלישי|sqrt\[3\]/);
}
console.log('Proof contract DOM: course menus, forged-action rejection, goals, folded controls, explicit completion and non-arbitrary hints passed.');
