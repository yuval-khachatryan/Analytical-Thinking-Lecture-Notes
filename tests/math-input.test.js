const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const read=I.latexToPlain;
function same(latex,answer,kind='expr',vars=['x']) {
  const r=M.checkAnswer(kind,answer,read(latex),vars,{});
  assert.equal(r.ok,true,latex+' => '+read(latex)+' expected '+answer+'; '+r.msg);
}
same(String.raw`\frac{x+1}{\sqrt{x^{2}+1}}`,'(x+1)/sqrt(x^2+1)');
same(String.raw`2^{3-x}`,'2^(3-x)');
same(String.raw`\sqrt[3]{-8}`,'-2','num',[]);
same(String.raw`\sqrt[4]{16}`,'2','num',[]);
same(String.raw`\log_{2}\left(8\right)`,'3','num',[]);
same(String.raw`\ln\left(e\right)`,'1','num',[]);
same(String.raw`\sin^{2}\left(x\right)`,'sin(x)^2');
same(String.raw`\left(-\infty,\frac{3}{2}\right]\cup\left\{4\right\}`,'(-inf,3/2]U{4}','set',[]);
same(String.raw`\mathbb{R}\setminus\left\{2\right\}`,'R-{2}','set',[]);
same(String.raw`\emptyset`,'{}','set',[]);
same(String.raw`\left\{0\right\}`,'{0}','set',[]);
same(String.raw`\frac12,\sqrt4,\pi`,'1/2,2,pi','list',[]);
same(String.raw`\lfloor-\frac32\rfloor`,'-2','num',[]);
same(String.raw`\operatorname{sgn}(-2)`,'-1','num',[]);
assert.deepEqual(M.parseRelation(read(String.raw`x=2\quad\text{או}\quad x=-2`)),M.parseRelation('x=2 or x=-2'));
assert.equal(read(String.raw`x^{2+1}`),'x^(2+1)'); // No simplification while editing.
assert.equal(read(String.raw`\left[1,2\right)`),'[1,2)'); // Half-open intervals stay half-open.
assert.equal(M.checkAnswer('num','3/4',read(String.raw`\frac34`),[],{form:'frac'}).ok,true);
assert.equal(M.checkAnswer('num','3/4',read(String.raw`\frac68`),[],{form:'frac'}).partial,true);
assert.equal(M.checkAnswer('num','3/4','0.75',[],{form:'frac'}).partial,true);
for(const s of [String.raw`\frac{1}{}`,String.raw`x^{}`,String.raw`\placeholder{}`,String.raw`\sqrt{}`,String.raw`\left(x\right?`,String.raw`\unknown{x}`,String.raw`\text{arbitrary words}`])assert.throws(()=>read(s),s);
// The actual shown answers are valid input, not just a separate set of synthetic fixtures.
let count=0;
for(const file of fs.readdirSync('.').filter(f=>/^\d\d-.*\.qmd$/.test(f))) {
 const src=fs.readFileSync(file,'utf8');
 for(const m of src.matchAll(/\[\$([^$]*)\$\]\{\.blank ((?:[^"}]|"[^"]*")*)\}/g)){
  const a={};m[2].replace(/(\w+)="([^"]*)"/g,(_,k,v)=>a[k]=v);
  const kind=a.kind||M.guessKind(a.ans),vars=(a.vars||'').split(',').filter(Boolean);
  const r=M.checkAnswer(kind,a.ans,read(m[1]),vars,{form:a.form,positive:(a.positive||'').split(',').filter(Boolean)});
  assert.equal(r.ok,true,file+': '+m[1]+' -> '+read(m[1])+': '+r.msg);count++;
 }
}
console.log('Typeset input bridge: '+count+' course answers and nested-expression/error cases passed.');
