const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('tests/numbered-cases-dom.test.js','utf8');
const {exercise,env,node,input,button,selectAction}=new Function('require',source.slice(0,source.indexOf('for(const rich of [false,true])'))+';return {exercise,env,node,input,button,selectAction};')(require);
function unfinished(d){assert.notEqual(d.getAttribute('data-solution-complete'),'true');assert.doesNotMatch(d.querySelector('.pw-workspace').textContent,/✓ הפתרון נכון/);}
function finished(d){assert.equal(d.getAttribute('data-solution-complete'),'true');assert.match(d.textContent,/סיימתם את הפתרון/);}
for(const rich of [false,true]){
 const t=exercise('3-2x<7',rich);
 button(t.d,'סיום פתרון').click();unfinished(t.d);
 t.action(2,'sub','3');t.commit(2);button(t.d,'סיום פתרון').click();unfinished(t.d);
 assert.match(t.d.textContent,/עוד לא התקבלה תוצאה סופית/);
 t.action(3,'div','-2');t.commit(3);unfinished(t.d);assert.match(t.d.textContent,/אפשר לבחור סיום פתרון/);
 // A selected action with a missing result is not an ignorable empty row.
 button(t.d,'הוספת שורה').click();t.action(4,'add','1');button(t.d,'סיום פתרון').click();unfinished(t.d);
 assert.match(t.d.textContent,/השלימו את תוצאת הפעולה האחרונה/);
 button(t.row(4),'מחיקת הצעד').click();button(t.d,'סיום פתרון').click();finished(t.d);
 button(t.row(3),'עריכה').click();unfinished(t.d);
 // Enter verifies the final line; it does not submit the whole solution.
 t.row(3).querySelector('.pw-input').dispatchEvent({type:'keydown',key:'Enter'});unfinished(t.d);
 button(t.d,'סיום פתרון').click();finished(t.d);
 button(t.d,'מההתחלה').click();unfinished(t.d);
}
for(const rich of [false,true]){
 const t=exercise('1/x<2',rich);
 button(t.row(2),'הצגת צעד אפשרי').click();button(t.row(2).querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 t.open(3,2,0);t.action(4,'mul','x');t.commit(4);t.action(5,'div','2');t.commit(5);
 button(t.d,'סיום פתרון').click();unfinished(t.d);assert.match(t.d.textContent,/עדיין פתוח/);
 t.close(6,3,5);button(t.d,'סיום פתרון').click();unfinished(t.d);assert.match(t.d.textContent,/נותר לסיים ולאחד/);
 t.open(7,2,1);t.action(8,'mul','x');t.commit(8);t.action(9,'div','2');t.commit(9);t.close(10,7,9);
 button(t.d,'סיום פתרון').click();unfinished(t.d);
 t.merge(11,2,[6,10]);button(t.d,'סיום פתרון').click();unfinished(t.d);assert.match(t.d.textContent,/עוד לא התקבלה תוצאה סופית/);
 t.action(12,'conditions');t.commit(12);unfinished(t.d);button(t.d,'סיום פתרון').click();finished(t.d);
 // Editing the proof invalidates completion and replays references/scopes.
 button(t.row(4),'עריכה').click();input(t.row(4).querySelector('.pw-input'),'1<3x');unfinished(t.d);
 button(t.d,'סיום פתרון').click();unfinished(t.d);
}
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'1/n+2',limit:'n'});
 node(d,'div',{class:'step',line:'0+2',action:'arithmetic'});node(d,'div',{class:'step',line:'2',action:'compute'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const rows=()=>d.querySelectorAll('.seq-step');
 function choose(r,group,action,result){const c=r.querySelector('.seq-category');c.value=group;c.dispatchEvent({type:'change'});const a=r.querySelector('.seq-action');a.value=action;a.dispatchEvent({type:'change'});const f=r.querySelector('.pw-input');if(rich)f.focus();input(f,result);}
 choose(rows()[0],'limits','arithmetic','0+2');button(d,'סיום פתרון').click();unfinished(d);assert.match(d.textContent,/עוד לא התקבלה תוצאה סופית/);
 button(d,'הוספת שורה').click();choose(rows()[1],'numbers','compute','2');
 rows()[1].querySelector('.pw-input').dispatchEvent({type:'keydown',key:'Enter'});unfinished(d);
 button(d,'סיום פתרון').click();finished(d);
 button(d,'הוספת שורה').click();unfinished(d);choose(rows()[2],'numbers','compute','');button(d,'סיום פתרון').click();unfinished(d);
 assert.match(d.textContent,/השלימו את תוצאת הפעולה האחרונה/);
 button(rows()[2],'מחיקת הצעד').click();button(d,'סיום פתרון').click();finished(d);
 button(rows()[0],'עריכה').click();input(rows()[0].querySelector('.pw-input'),'1');unfinished(d);button(d,'סיום פתרון').click();unfinished(d);
 button(d,'מההתחלה').click();unfinished(d);
 // A suggested solution is still only a checked step until explicitly finished.
 button(rows()[0],'הצגת צעד אפשרי').click();button(rows()[0].querySelector('.pw-hints'),'יישום הצעד והמשך').click();unfinished(d);
 if(rows().length>1){button(rows()[1],'הצגת צעד אפשרי').click();button(rows()[1].querySelector('.pw-hints'),'יישום הצעד והמשך').click();unfinished(d);}
 button(d,'סיום פתרון').click();finished(d);
}
{
 const E=env(),q=node(E.document,'div',{class:'thmbox-question'}),d=node(q,'div',{class:'derive',start:'2*(x+1)'});
 node(d,'div',{class:'step',line:'2x+2'});E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 input(d.querySelector('.pw-input'),'2x+2');button(d,'בדיקת הצעדים').click();unfinished(d);button(d,'סיום פתרון').click();finished(d);
 input(d.querySelector('.pw-input'),'2x+3');unfinished(d);button(d,'סיום פתרון').click();unfinished(d);
}
console.log('Explicit finish: step checks, suggestions and Enter remain drafts; final validation, open/unmerged cases, unfinished actions, edits and resets passed in both input adapters.');
