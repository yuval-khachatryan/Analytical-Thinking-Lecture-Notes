const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const read=I.latexToPlain;
const order='e<f<a<c<d<g';
assert.equal(M.checkAnswer('letter-order',order,read('e < f < a < c < d < g'),[],{}).ok,true);
assert.equal(M.checkAnswer('letter-order',order,'e<f<a',[],{}).partial,true);
for(const s of ['','a<c<d<e<f<g','g>d>c>a>f>e','e<f<a<c<d<d', 'e<f<a<c<d<h', 'e<f<a<c<d<g<g', 'e<=f<a<c<d<g','e<f<a<c<d<g+0']) {
  assert.equal(M.checkAnswer('letter-order',order,s,[],{}).ok,false,s);
}
function same(latex,answer,kind='expr',vars=['x']) {
  // Round-trip equivalence is separate from a student's required answer format.
  if(kind==='set')return assert.equal(M.setEq(M.parseSet(answer),M.parseSet(read(latex))),true,latex);
  const r=M.checkAnswer(kind,answer,read(latex),vars,{allowExpression:true});
  assert.equal(r.ok,true,latex+' => '+read(latex)+' expected '+answer+'; '+r.msg);
}
// A leading minus belongs outside a fraction. Preserve grouping when that
// fraction is a power's base or the subtracted operand, and round-trip it.
for(const [source,expected] of [
 ['-1/(2)',String.raw`-\frac{1}{2}`],
 ['1/(-2)',String.raw`-\frac{1}{2}`],
 ['(-1)/(-2)',String.raw`\frac{1}{2}`],
 ['(-1/2)^2',String.raw`\left(-\frac{1}{2}\right)^{2}`],
 ['x-(-1/2)',String.raw`x - \left(-\frac{1}{2}\right)`],
 ['(-2*x)/3',String.raw`-\frac{2 x}{3}`],
 ['(1-x)/2',String.raw`\frac{1 - x}{2}`]
]) {
 const ast=M.parseExpr(source),before=JSON.stringify(ast),latex=M.tex(ast);
 assert.equal(latex,expected,source);assert.equal(JSON.stringify(ast),before,'formatting does not change the expression');
 same(latex,source);
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
same(String.raw`\left\{x\mid -2\le x<3\right\}`,'[-2,3)','set',[]);
same(String.raw`\{x\in\mathbb{R}\mid x\le-1\text{או}2<x<4\}`,'(-inf,-1]U(2,4)','set',[]);
same(String.raw`\{t\mid |t|<2\}`,'(-2,2)','set',[]);
// Logical words and set operations must work through both text and typeset input.
for (const [source,answer] of [
 ['{x | 2<=x<=7 וגם x!=5}','[2,5)U(5,7]'],
 ['{x | 2<=x<=7 ולא x=5}','[2,5)U(5,7]'],
 ['{t | t>=2 וגם t<7}','[2,7)'],
 ['לא (x<=2 או x>=7)','(2,7)'],
 ['לא לא x>2','(2,inf)'],
 ['x<0 או x>=2 וגם x<4','(-inf,0)U[2,4)'],
 ['(x<0 או x>=2) וגם x<4','(-inf,0)U[2,4)'],
 ['{x | x^2≠4}','R-{-2,2}'],
 ['{1,2,3}∖{2,4}','{1,3}'],
 ['(-1,3]∖[0,2)','(-1,0)U[2,3]'],
 ['R∖(-1,2]','(-inf,-1]U(2,inf)'],
 ['([0,2]∪[4,6])∩[1,5]','[1,2]U[4,5]'],
 ['[0,2)∩[2,4]','{}'],
 ['[0,2]∩[2,4]','{2}'],
 ['R∖([1,3]∪{5})','(-inf,1)U(3,5)U(5,inf)']
]) {
 assert.equal(M.setEq(M.parseSet(answer),M.parseSet(source)),true,source);
 same(M.setInputTex(source),answer,'set',[]);
}
same(String.raw`\{x\mid x\ge 2\land x<7\land\neg x=5\}`,'[2,5)U(5,7)','set',[]);
same(String.raw`\{x\mid x^2\neq 4\}`,'R-{-2,2}','set',[]);
for(const s of ['{x | x>2 וגם y<7}','x>2 וגם','לא','x>2 ולא','[0,2]∖'])
 assert.equal(M.checkAnswer('set','(2,7)',s,[],{}).ok,false,s);
assert.match(M.setInputTex('{x | 2<=x<=7 ולא x=5}'),/\\text\{ולא\}/);
assert.match(M.setInputTex('{1,2,3}∖{2,4}'),/\\setminus/);
assert.match(M.setInputTex('{x | x^2≠4}'),/\\ne/);
assert.equal(I.templates['^'],'#@^{#?}');assert.equal(I.templates['≠'],String.raw`\ne`);
assert.equal(I.templates['/'],String.raw`\frac{#@}{#?}`);
for(const word of ['או','וגם','ולא','לא']) {
 assert.equal(I.templates[' '+word+' '],String.raw`\text{`+'\u00a0'+word+'\u00a0}');
}
same('x<-2'+I.templates[' או ']+'x>3','(-inf,-2)U(3,inf)','set',[]);
same('x>1'+I.templates[' וגם ']+'x<3','(1,3)','set',[]);
same('x>1'+I.templates[' ולא ']+'x=2','(1,2)U(2,inf)','set',[]);
same(I.templates[' לא ']+'(x<=1)','(1,inf)','set',[]);
for(const [source,expected] of [
 ['x=-2אוx=3','x=-2 או\u200e x=3'],
 ['(x>1)וגם(x<3)','(x>1) וגם\u200e (x<3)'],
 ['x>1  ולא x=2','x>1 ולא\u200e x=2'],
 ['לא(x<=1)','לא\u200e (x<=1)'],
 ['x=1 או לא x=2','x=1 או\u200e לא\u200e x=2']
]) {
 const result=M.spaceLogicalWords(source,source.length,source.length);
 assert.equal(result.value,expected);assert.equal(result.start,expected.length);assert.equal(result.end,expected.length);
 assert.deepEqual(M.spaceLogicalWords(result.value,result.start,result.end),result);
 assert.equal(M.setEq(M.parseSet(source),M.parseSet(expected)),true);
}
assert.deepEqual(M.spaceLogicalWords('x=-2אוx=3',0,4),{value:'x=-2 או\u200e x=3',start:0,end:4});
assert.deepEqual(M.spaceLogicalWords('x=-2או',6,6),{value:'x=-2 או\u200e ',start:9,end:9});
// The text fallback inserts editable slots, preserving selected expressions and surroundings.
for(const [value,start,end,key,expected,caret] of [
 ['',0,0,'/','()/()',1], ['',0,0,'^','()^()',1],
 ['x',1,1,'^','x^()',3], ['2',1,1,'/','2/()',3],
 ['x+1',0,3,'/','(x+1)/()',7], ['x+1',0,3,'^','(x+1)^()',7],
 ['2*(x+1)+4',3,6,'/','2*((x+1)/())+4',10],
 ['x+',2,2,'/','x+()/()',3], ['x+',2,2,'^','x+()^()',3],
 ['3',0,1,'sqrt()','sqrt(3)',7], ['',0,0,'√()','√()',2],
 ['',0,0,'()','()',1], ['1,3',0,3,'[)','[1,3)',5],
 ['',0,0,'log_()','log_()()',5], ['8',0,1,'log_()','log_()(8)',5],
 ['',0,0,'root()','root(,)',5], ['8',0,1,'root()','root(,8)',5],
 ['',0,0,'{x|}','{x|}',3], ['x>2',0,3,'{x|}','{x|x>2}',6],
 ['x',null,null,'≠','x≠',2]
]) assert.deepEqual(I.plainTemplate(value,start,end,key),{value:expected,caret},key+' in '+value);
assert.equal(M.checkAnswer('set','(1,3)','{x | 1<x<3}',[],{form:'builder'}).ok,true);
assert.equal(M.checkAnswer('set','(1,3)','(1,3)',[],{form:'builder'}).partial,true);
same(String.raw`\{x\in\mathbb{R}\}`,'R','set',[]);
assert.equal(M.checkAnswer('set','R','{x in R}',[],{form:'builder'}).ok,true);
assert.equal(M.checkAnswer('set','R','R',[],{form:'builder'}).partial,true);
assert.equal(M.checkAnswer('set','R','R',[],{form:'interval'}).partial,true);
assert.equal(M.checkAnswer('set','R','(-inf,inf)',[],{form:'interval'}).ok,true);
assert.equal(M.checkAnswer('set','{1,3}','{x | x=1 or x=3}',[],{form:'finite'}).partial,true);
assert.equal(M.checkAnswer('set','{1,3}','{1,3}',[],{form:'finite'}).ok,true);
for(const [answer,values] of [['{-1,4}','-1,4'],['{4}','4'],['{1/2}','1/2']]){
 const result=M.checkAnswer('set',answer,values,[],{});
 assert.equal(result.ok,false);assert.equal(result.partial,true);assert.match(result.msg,/הערכים נכונים.*סוגריים מסולסלים/);
}
assert.equal(M.checkAnswer('set','{-1,4}','-1,3',[],{}).partial,undefined);
assert.equal(M.checkAnswer('set','{-1,4}','{-1,4}',[],{}).ok,true);
assert.equal(M.checkAnswer('list','-1,4','-1,4',[],{}).ok,true,'actual list questions still accept lists');
assert.equal(M.checkAnswer('set','(1,3)','{x | 1<x<3}',[],{form:'interval'}).partial,true);
assert.equal(M.checkAnswer('set','(1,3)','{x | 1<y<3}',[],{}).ok,false);
assert.equal(M.checkAnswer('set','(1,3)','{x | x}',[],{}).ok,false);
same(String.raw`\left\{0\right\}`,'{0}','set',[]);
same(String.raw`\frac12,\sqrt4,\pi`,'1/2,2,pi','list',[]);
same(String.raw`\lfloor-\frac32\rfloor`,'-2','num',[]);
same(String.raw`\operatorname{sgn}(-2)`,'-1','num',[]);
assert.deepEqual(M.parseRelation(read(String.raw`x=2\quad\text{או}\quad x=-2`)),M.parseRelation('x=2 or x=-2'));
assert.equal(read(String.raw`x^{2+1}`),'x^(2+1)'); // No simplification while editing.
assert.equal(read(String.raw`\left[1,2\right)`),'[1,2)'); // Half-open intervals stay half-open.
// Formatting must preserve the student's representation, not evaluate it.
for(const source of ['R-{-1,2,4}',String.raw`R \ {-1,2,4}`,'[2,5)U(3,7]',
 '{4,-1,4,2}','{3.5,7/2}','(sqrt(2),pi]','{x in R | x!=2}',
 'x in [1,3)','x>2 or x=0','-2,3','{}','∅']) {
 const latex=M.setInputTex(source);
 if(source==='-2,3'){
  assert.equal(read(latex).replace(/\s+/g,''),source,'the editor must not silently add braces');
  assert.equal(M.checkAnswer('set','{-2,3}',read(latex),[],{}).partial,true);
 }else same(latex,source,'set',[]);
}
assert.equal(M.setInputTex('R-{-1,2,4}'),String.raw`\mathbb{R}\setminus \left\{-1, 2, 4\right\}`);
assert.equal(M.setInputTex('{4,-1,4,2}'),String.raw`\left\{4, -1, 4, 2\right\}`);
assert.match(M.setInputTex('[2,5)U(3,7]'),/5.*\\cup.*3/);
assert.match(M.setInputTex('{3.5,7/2}'),/3\.5.*\\frac/);
assert.match(M.setInputTex('(sqrt(2),pi]'),/\\sqrt\{2\}.*\\pi/);
assert.throws(()=>M.setInputTex('R-{1,')); // No guessed completion in the preview.
for(const pair of ['()','[]','[)','(]']) {
 const latex=I.templates[pair].replace('#0','1,3'),answer=pair[0]+'1,3'+pair[1];
 same(latex,answer,'set',[]);
 for(const wrong of ['(1,3)','[1,3]','[1,3)','(1,3]'].filter(s=>s!==answer))
  assert.equal(M.checkAnswer('set',wrong,read(latex),[],{}).ok,false,answer+' must retain its endpoints');
}
assert.equal(M.checkAnswer('num','3/4',read(String.raw`\frac34`),[],{form:'frac'}).ok,true);
assert.equal(M.checkAnswer('num','3/4',read(String.raw`\frac68`),[],{form:'frac'}).partial,true);
assert.equal(M.checkAnswer('num','3/4','0.75',[],{form:'frac'}).partial,true);
for(const s of [String.raw`\frac{1}{}`,String.raw`x^{}`,String.raw`\placeholder{}`,String.raw`\sqrt{}`,String.raw`\left(x\right?`,String.raw`\unknown{x}`,String.raw`\text{arbitrary words}`])assert.throws(()=>read(s),s);
// The actual shown answers are valid input, not just a separate set of synthetic fixtures.
let count=0;
for(const file of fs.readdirSync('.').filter(f=>/^\d\d-.*\.qmd$/.test(f))) {
 const src=fs.readFileSync(file,'utf8');
 for(const m of src.matchAll(/\[\$([^$]*)\$\]\{\.blank ((?:[^"}]|"[^"]*")*)\}/g)){
  const a={};m[2].replace(/([\w-]+)="([^"]*)"/g,(_,k,v)=>a[k]=v);
  const kind=a.kind||M.guessKind(a.ans),vars=(a.vars||'').split(',').filter(Boolean);
  const r=M.checkAnswer(kind,a.ans,read(m[1]),vars,{form:a.form,allowExpression:a['allow-expression']==='true',positive:(a.positive||'').split(',').filter(Boolean)});
  assert.equal(r.ok,true,file+': '+m[1]+' -> '+read(m[1])+': '+r.msg);count++;
 }
}
console.log('Typeset input bridge: '+count+' course answers and nested-expression/error cases passed.');
