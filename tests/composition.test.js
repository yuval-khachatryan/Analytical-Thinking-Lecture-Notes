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
 const fPreview=f.parentNode.querySelector('.as-field-preview'),gPreview=g.parentNode.querySelector('.as-field-preview');
 assert.ok(fPreview,'f has a preview directly below its input');assert.ok(gPreview,'g has a preview directly below its input');
 const rendered=[];E.context.MathJax.typeset=nodes=>rendered.push(...nodes);
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};f.focus();g.focus();}
 input(f,rich?String.raw`\sqrt{x+4}`:'sqrt(x+4)');input(g,'x^2');
 if(rich){assert.equal(fPreview.innerHTML,'');assert.equal(gPreview.innerHTML,'');}
 else{
  assert.match(fPreview.innerHTML,/\\sqrt\{x \+ 4\}/);assert.match(gPreview.innerHTML,/x\^\{2\}/);
  assert.ok(rendered.includes(fPreview));assert.ok(rendered.includes(gPreview));
  input(f,'(x+1)/2');assert.match(fPreview.innerHTML,/\\frac\{x \+ 1\}\{2\}/);
  input(f,'');assert.equal(fPreview.innerHTML,'');input(f,'(');assert.equal(fPreview.innerHTML,'');
  input(f,'x+');assert.ok(fPreview.classList.contains('ix-preview-partial'));assert.match(fPreview.innerHTML,/x/);
  input(f,'sqrt(x+4)');assert.equal(fPreview.classList.contains('ix-preview-partial'),false);
 }
 button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/✓ נכון/);
 input(g,'x^2+1');button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/במקום/);
 const draft=E.context.CourseMathInput.read(g);button(box,'רמז').click();assert.match(box.textContent,/מחשבים קודם/);assert.equal(E.context.CourseMathInput.read(g),draft);
 button(box,'ניסיון חדש').click();assert.equal(E.context.CourseMathInput.read(f),'');assert.equal(E.context.CourseMathInput.read(g),'');
 assert.equal(fPreview.innerHTML,'');assert.equal(gPreview.innerHTML,'');
 button(box,'בדיקת ההרכבה').click();assert.match(box.textContent,/שתי הפונקציות/);
}
// A late rich-editor upgrade removes the fallback preview without losing the draft.
{
 const E=env(),box=node(E.document,'div',{class:'composition-practice',target:'sqrt(x^2+4)'});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});const f=box.querySelector('.composition-f');
 input(f,'sqrt(x+4)');const preview=f.parentNode.querySelector('.as-field-preview');assert.ok(preview.innerHTML);
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};f.focus();
 assert.equal(preview.innerHTML,'');assert.equal(M.tex(M.parseExpr(E.context.CourseMathInput.read(f))),M.tex(M.parseExpr('sqrt(x+4)')));
}
console.log('Composition choices: live previews, reset, rich-editor upgrade, alternative decompositions, incorrect answers and domains passed.');
