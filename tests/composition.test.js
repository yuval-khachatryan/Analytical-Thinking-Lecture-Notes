const fs=require('node:fs'),assert=require('node:assert/strict'),M=require('../assets/interactive.js');
for(const [target,f,g] of [['sqrt(x^2+4)','sqrt(x)','x^2+4'],['sqrt(x^2+4)','sqrt(x+4)','x^2'],['(3x-1)^7','x^7','3x-1'],['(3x-1)^7','(x-1)^7','3x']])assert.equal(M.checkComposition(target,f,g).ok,true);
assert.equal(M.checkComposition('sqrt(x^2+4)','x^2+4','sqrt(x)').ok,false);
assert.equal(M.checkComposition('(3x-1)^7','x^7','3x+1').ok,false);
assert.equal(M.checkComposition('1','1','1/(x-1)').ok,false,'the inner function must be defined even when f is constant');
assert.equal(M.checkComposition('x','sqrt(x)','x^2').ok,false,'sqrt(x^2) is not x on the negative half-line');
assert.equal(M.checkComposition('x','','x').empty,true);
assert.throws(()=>M.checkComposition('x','y','x'));
assert.throws(()=>M.checkComposition('x','sqrt(','x'));
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),box=node(E.document,'div',{class:'composition-practice',target:'sqrt(x^2+4)'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});const f=box.querySelector('.composition-f'),g=box.querySelector('.composition-g');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};f.focus();g.focus();}
 input(f,rich?String.raw`\sqrt{x+4}`:'sqrt(x+4)');input(g,'x^2');button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/✓ נכון/);
 input(g,'x^2+1');button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/במקום/);
 const draft=E.context.CourseMathInput.read(g);button(box,'רמז').click();assert.match(box.textContent,/מחשבים קודם/);assert.equal(E.context.CourseMathInput.read(g),draft);
 button(box,'ניסיון חדש').click();assert.equal(E.context.CourseMathInput.read(f),'');assert.equal(E.context.CourseMathInput.read(g),'');
 button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/שתי הפונקציות/);
}
console.log('Composition choices: alternative decompositions, incorrect answers, domains and both input adapters passed.');
