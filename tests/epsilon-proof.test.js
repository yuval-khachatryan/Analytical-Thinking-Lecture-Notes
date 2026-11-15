const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const cfg={mode:'rel',vars:['n','ε'],solve:'n',positive:['n','ε'],integers:['n'],requireJustification:true,explicitCases:true,sequenceDefinitions:{a:{index:'n',formula:'1+2/n'}}};
for(const s of ['ε','ϵ','epsilon','eps','\\varepsilon','\\epsilon'])assert.deepEqual(M.parseExpr(s),M.parseExpr('ε'));
assert.equal(M.tex(M.parseExpr('2/ε')),'\\frac{2}{\\varepsilon}');
assert.deepEqual(M.parseExpr(I.latexToPlain('\\frac{2}{\\epsilon}')),M.parseExpr('2/ε'));
assert.equal(M.ev(M.parseExpr('e'),{}),Math.E,'Epsilon never replaces Euler’s constant');
const qmd=fs.readFileSync('02-Sequences.qmd','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const match=/:::: \{\.derive (vars="n,ε"[^\n]+)\}\n([\s\S]*?)\n::::\n/.exec(qmd);
assert.ok(match,'The authored general-epsilon exercise exists');
const A=attrs(match[1]),steps=[...match[2].matchAll(/::: \{\.step ([^\n]+)\}/g)].map(m=>attrs(m[1]));
const model=M.relationModel(A.start,steps,cfg);
assert.equal(model.state.done,true);
function check(from,to,op,value,c=cfg){return M.checkJustifiedStep(from,to,[{op,value}],c);}
assert.equal(check('2/n<ε','2<n*ε','mul','n').ok,true);
assert.equal(check('2<n*ε','2/ε<n','div','ε').ok,true);
for(const [from,to,op,value] of [
 ['2/n<ε','2>n*ε','mul','n'],
 ['2/n<ε','n>2/ε','mul','n'],
 ['2<n*ε','2/ε<=n','div','ε'],
 ['2<n*ε','1/ε<n','div','ε'],
 ['2<n*ε','2/ε<n','div','ε-1']
])assert.equal(check(from,to,op,value).ok,false,JSON.stringify({from,to,op,value}));
const wrong=check('2/n<ε','2>n*ε','mul','n');
assert.ok(wrong.expected&&wrong.got);assert.match(wrong.msg,/צפוי/);
assert.equal(check('2<n*ε','2/ε<n','div','ε',{...cfg,positive:['n']}).ok,false,'No division without a known sign');
assert.equal(check('2<n*ε','2/ε<n','div','ε',{...cfg,positive:['n'],assumption:'ε>=0'}).ok,false,'Weak sign does not exclude zero');
const broken=model.entries.map(e=>({...e}));broken[2]={...broken[2],source:99};
assert.equal(M.checkLineProof(A.start,broken,cfg).done,false,'Source references are still validated');
for(const ε of [1/100,2/21,1,3,20]){
 const N=M.ev(M.parseExpr('floor(1/ε)+1'),{'ε':ε});assert.ok(Number.isInteger(N)&&N>1/ε&&1/N<ε);
}
assert.equal(M.checkAnswer('expr','floor(2/ε)+1','floor(2/ε)+1',['ε'],{positive:['ε']}).ok,true);
assert.equal(M.checkAnswer('expr','floor(2/ε)+1','floor(2/ε)',['ε'],{positive:['ε']}).ok,false);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',...A});
 steps.forEach(step=>node(d,'div',{class:'step',...step}));
 const fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',ans:'floor(2/ε)+1',vars:'ε',positive:'ε',kind:'expr'});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 for(const step of steps){
  const row=d.querySelectorAll('.as-step').at(-1);
  button(row,'הצגת צעד אפשרי').click();
  button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
  assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 }
 button(d,'סיום פתרון').click();assert.match(d.textContent,/הפתרון נכון/);
 const field=blank.querySelector('.blank-input');field.focus();
 assert.ok(blank.querySelector('[aria-label="אפסילון"]'));
 assert.ok(blank.querySelector('[aria-label="החלק השלם"]'));
 input(field,rich?'\\left\\lfloor\\frac{2}{\\varepsilon}\\right\\rfloor+1':'floor(2/ε)+1');
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true,fill.textContent);
}
console.log('Epsilon: checked authored proof, sign/domain restrictions, expected-result feedback, references, integer selection and both input adapters passed.');
