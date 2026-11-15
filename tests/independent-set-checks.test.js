const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',ans:'{1}',plot:'0,1,2'});
 for(const file of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 function enter(field,value){input(field,rich?value.replace(/\{/g,'\\{').replace(/\}/g,'\\}'):value);}
 const answer=blank.querySelector('.blank-input'),plot=fill.querySelector('.set-plot'),fold=fill.querySelector('.sp-practice'),status=plot.querySelector('.sp-status');
 const panel=fill.querySelector('.ix-panel');
 assert.ok(fill.children.indexOf(blank.parentNode)<fill.children.indexOf(panel),'written input before its check');
 assert.ok(fill.children.indexOf(panel)<fill.children.indexOf(fold),'written check before drawing');
 assert.equal(button(plot,'בדיקת הסרטוט').classList.contains('ix-main'),true);
 assert.equal(button(plot,'הנחה על הישר').classList.contains('ix-main'),false);
 if(rich)answer.focus();enter(answer,'{1}');button(fill,'בדיקת הקבוצה הכתובה').click();
 assert.equal(blank.classList.contains('ok'),true,'empty sketch must not reject a correct set');assert.equal(!!fold.open,false);assert.equal(status.textContent,'');
 button(plot,'בדיקת הסרטוט').click();assert.equal(blank.classList.contains('ok'),true);assert.ok(status.textContent);
 button(plot,'נקודה').click();input(plot.querySelector('[data-coordinate="point"]'),'1');button(plot,'הנחה על הישר').click();
 assert.equal(blank.classList.contains('ok'),true,'drawing edit must retain written success');button(plot,'בדיקת הסרטוט').click();assert.equal(status.classList.contains('sp-good'),true);
 enter(answer,'{2}');assert.equal(status.classList.contains('sp-good'),true,'writing edit must retain drawing success');button(fill,'בדיקת הקבוצה הכתובה').click();assert.equal(blank.classList.contains('ok'),false);assert.equal(status.classList.contains('sp-good'),true);
 enter(answer,'{1}');button(fill,'בדיקת הקבוצה הכתובה').click();input(plot.querySelector('[data-coordinate="point"]'),'2');button(plot,'הנחה על הישר').click();
 assert.equal(blank.classList.contains('ok'),true);assert.equal(status.classList.contains('sp-good'),false);button(plot,'בדיקת הסרטוט').click();assert.equal(status.classList.contains('sp-good'),false);
}
console.log('Written sets and sketches: independent checking, feedback and edit invalidation in both adapters.');
