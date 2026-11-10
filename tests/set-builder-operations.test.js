const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const cases=[
 ['{x|x != 1} ∪ {x|x >= 4}','R-{1}'],
 ['{x|x != -1} ∩ {x|x <= 4}','(-inf,-1)U(-1,4]'],
 ['{x|x<0} ∪ {x|x>=0}','R'],
 ['{x|x<0} ∩ {x|x>=0}','{}'],
 ['{x|x<0} ∪ {0} ∪ (0,2]','(-inf,2]'],
 ['[-2,5] ∩ {x|x!=1}','[-2,1)U(1,5]'],
 ['R ∖ {x|x>=2}','(-inf,2)'],
 ['{x|x>=0} ∖ {x|x>2}','[0,2]'],
 ['({x|x<0} ∪ [2,5]) ∩ {t|t<=3}','(-inf,0)U[2,3]'],
 ['{x|x<0} ∪ {t|t>=2} ∩ {z|z<=3}','(-inf,0)U[2,3]'],
 ['{x|x<0} ∩ ({t|t>=2} ∪ {z|z<=-1})','(-inf,-1]'],
 ['{x|x>=0} ∖ ({t|t<1} ∪ {z|z>3})','[1,3]'],
 ['{x|x>=0} ∖ {t|t>=1} ∖ {z|z=0}','(0,1)'],
 ['{x ∈ R : x!=1} ∩ {t in R | t<=4}','(-inf,1)U(1,4]'],
 ['{t in R} ∖ {x|x=0}','R-{0}'],
 ['{x| |x-1|<=2} ∩ {t|t!=0}','[-1,0)U(0,3]'],
 ['{x|x<0 או x>2} ∩ {x|x<=4 וגם x!=-1}','(-inf,-1)U(-1,0)U(2,4]'],
 ['{x|לא (x<0 או x>2)} ∩ {t|t!=1}','[0,1)U(1,2]'],
 ['{x|x>1/2} ∩ {y|y<=sqrt(2)}','(1/2,sqrt(2)]']
];
for(const [source,answer] of cases){
 assert.equal(M.checkAnswer('set',answer,source).ok,true,source);
 const latex=M.setInputTex(source);
 assert.equal(M.setEq(M.parseSet(I.latexToPlain(latex)),M.parseSet(answer)),true,'preview round trip: '+source);
}
const union='{x|x != 1} ∪ {x|x >= 4}',intersection='{x|x != -1} ∩ {x|x <= 4}';
assert.equal(M.setInputTex(union),String.raw`\left\{x\mid x \ne 1\right\}\cup \left\{x\mid x \ge 4\right\}`);
assert.equal(M.setInputTex(intersection),String.raw`\left\{x\mid x \ne -1\right\}\cap \left\{x\mid x \le 4\right\}`);
const wrong=M.checkAnswer('set','(-inf,-1)U(-1,4]',union);
assert.equal(wrong.ok,false);assert.match(wrong.msg,/המספר/);assert.doesNotMatch(wrong.msg,/לא הצלחתי לקרוא/);
for(const source of ['{x|x<0} ∪','{x|x<0 ∪ {x|x>2}','{x|x<0}} ∩ {x|x>2}',
 '{x|x<0} ∪ {t|x>2}','{x|y<0} ∪ {y|y>2}','{x|x<0} ∩ {t:}',
 '{x|x<0} ∪ {x in R |}','{x|x<0} ∩ {x|x>2} trailing']){
 assert.throws(()=>M.parseSet(source),undefined,source);
 assert.throws(()=>M.setInputTex(source),undefined,source);
}
// A compound set expression is valid notation, but is not a single builder or a list of points.
assert.equal(M.checkAnswer('set','[0,1]','{x|0<=x<=1}',[],{form:'builder'}).ok,true);
assert.equal(M.checkAnswer('set','[0,1]','{x|x>=0} ∩ {x|x<=1}',[],{form:'builder'}).partial,true);
assert.equal(M.checkAnswer('set','{1,2}','{x|x=1} ∪ {2}',[],{form:'finite'}).partial,true);
assert.equal(M.checkAnswer('set','(-inf,0)U{2}','{x|x<0} ∪ 2').partial,true);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button};')(require);
const section=fs.readFileSync('01-Introduction.qmd','utf8').split('{#box-q-domain ')[1].split('{#box-q-domain-order ')[0];
const answer=section.match(/\*\*\(ד\)\*\*[^\n]*ans="([^"]+)"/)[1];
for(const rich of [false,true]){
 const E=env(),fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',ans:answer});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input'),pending=[];
 E.context.setTimeout=(fn,ms)=>{if(ms===350)pending.push(fn);};
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();}
 for(const [source,ok] of [[union,false],[intersection,true]]){
  const value=rich?M.setInputTex(source):source;
  input(field,value);pending.splice(0).forEach(fn=>fn());
  if(!rich)assert.ok(blank.querySelector('.ix-field-preview').innerHTML.includes(M.setInputTex(source)));
  button(fill,'בדיקה').click();
  assert.equal(blank.classList.contains('ok'),ok,source);assert.equal(field.value,value,'checking preserves the entered notation');
  assert.doesNotMatch(fill.textContent,/לא הצלחתי לקרוא/);
 }
}
console.log('Set-builder operations passed: scoped conditions, unions/intersections/differences, notation-preserving previews, invalid syntax and both input adapters.');
