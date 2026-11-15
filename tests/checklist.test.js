const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,button};')(require);
const E=env(),box=node(E.document,'div',{class:'checklist'});
for(const [text,correct] of [['(1,2)',true],['(2,0)',false],['(0,3)',true],['(3,1)',false]])node(box,'span',{class:'check-option','data-correct':String(correct)},text);
E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
const fields=box.querySelectorAll('input'),status=box.querySelector('.ix-msg');
assert.equal(fields.length,4);assert.equal(status.textContent,'');
for(const selection of [[],[0],[0,2],[0,1,2],[0,1,2,3]]){
 fields.forEach((field,i)=>{field.checked=selection.includes(i);field.dispatchEvent({type:'change'});});
 assert.equal(status.textContent,'','editing invalidates old feedback');button(box,'בדיקת הבחירה').click();
 assert.equal(status.classList.contains('ix-good'),selection.join(',')==='0,2');
}
button(box,'ניסיון חדש').click();assert.ok(fields.every(f=>!f.checked));assert.equal(status.textContent,'');
console.log('Point checkboxes: exact selection, missing and extra points, feedback reset and retry passed.');
