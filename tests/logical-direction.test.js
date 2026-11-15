const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
for(const word of ['או','וגם','ולא','לא']){
 const old='\\text{'+word+'}',fixed=I.isolateLogicalLatex(old);
 assert.match(fixed,/^\\class\{course-logic\}\{\\text\{/);
 assert.equal(I.isolateLogicalLatex(fixed),fixed,'normalizing twice must not nest wrappers');
 assert.equal(I.latexToPlain(fixed),I.latexToPlain(old),'presentation does not change the connective');
 assert.equal(I.templates[' '+word+' '],fixed);
}
for(const [source,answer] of [
 ['{x|x>=3 וגם x!=4}','[3,4)U(4,inf)'],
 ['{x|x<-2 או x>3}','(-inf,-2)U(3,inf)'],
 ['{x|x>=0 ולא x=1}','[0,1)U(1,inf)'],
 ['{x|לא (x<-2 או x>3)}','[-2,3]'],
 ['{x|(x<0 וגם x>=-2) או (x>1 וגם x<3)}','[-2,0)U(1,3)']
]){
 const latex=M.setInputTex(source);
 assert.ok(latex.includes('\\class{course-logic}'));
 assert.equal(M.setEq(M.parseSet(I.latexToPlain(latex)),M.parseSet(answer)),true);
 assert.equal(M.setEq(M.parseSet(I.latexToPlain(I.isolateLogicalLatex(latex))),M.parseSet(answer)),true);
}
assert.throws(()=>I.latexToPlain(String.raw`\class{unrecognized}{x}`));
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,button,input}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,button,input};')(require);
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',ans:'[3,4)U(4,inf)'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});const field=blank.querySelector('.blank-input');
 input(field,'{x|x>=3 וגם x!=4}');E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();
 assert.equal(field.control.tagName,'MATH-FIELD');assert.match(field.value,/\\class\{course-logic\}/);
 assert.match(field.control.querySelector('style').textContent,/direction:rtl/);
 button(fill,'בדיקה').click();assert.ok(blank.classList.contains('ok'));
 field.value=String.raw`\{x\mid x\ge3\text{וגם}x\ne4\}`;
 assert.match(field.value,/\\class\{course-logic\}/,'restored/programmatic LaTeX uses the same wrapper');
 let pasted;field.control.insert=(latex)=>{pasted=latex;};
 field.control.dispatchEvent({type:'paste',clipboardData:{getData:()=>String.raw`\{x\mid x\ge3\text{וגם}x\ne4\}`},stopImmediatePropagation(){}});
 assert.match(pasted,/\\class\{course-logic\}/,'pasted LaTeX uses the same wrapper');
 assert.equal(M.setEq(M.parseSet(I.latexToPlain(pasted)),M.parseSet('[3,4)U(4,inf)')),true);
}
console.log('Logical direction: shared word wrappers, round-trip grouping, repeated normalization, rich input/restore/paste and grading passed; browser layout not verified.');
