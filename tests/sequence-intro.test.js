const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../assets/interactive.js');

const finite = {checkAt:'1,2,3,4'};
const alternative = '5n+2+(n-1)(n-2)(n-3)(n-4)';
assert.equal(M.checkAnswer('expr','5n+2',alternative,['n'],finite).ok,true);
assert.equal(M.checkAnswer('expr','5n+2',alternative,['n'],{}).ok,false);
assert.equal(M.checkAnswer('expr','n^2','n*n',['n'],finite).ok,true);
assert.equal(M.checkAnswer('expr','5n+2','5n+3',['n'],finite).ok,false);
assert.match(M.checkAnswer('expr','5n+2','5n+2+0/(n-3)',['n'],finite).msg,/אינו מוגדר/);
assert.equal(M.checkAnswer('expr','5n+2','5x+2',['n'],finite).ok,false);

const sequence = {positive:['n'],integers:['n']};
for (const formula of ['2*(-3)^(n-1)','2*(-1)^(n-1)*3^(n-1)','-2/3*(-3)^n']) {
  assert.equal(M.checkAnswer('expr','2*(-3)^(n-1)',formula,['n'],sequence).ok,true,formula);
}
assert.equal(M.checkAnswer('expr','2*(-3)^(n-1)','2*3^(n-1)',['n'],sequence).ok,false);
assert.equal(M.checkAnswer('num','-5','(-1)^5*5',[],{allowExpression:true}).ok,true);
assert.equal(M.checkAnswer('num','-5','(-1)^5*5',[],{}).partial,true);
assert.equal(M.checkAnswer('num','-5','-5',[],{}).ok,true);

// Exercise the authored attributes through both native and typeset fields.
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+
  '\nreturn {env,node,input,button};')(require);
for(const rich of [false,true]){
  const E=env(),fill=node(E.document,'div',{class:'fill'});
  const prefix=node(node(fill,'p'),'span',{class:'blank',ans:'5n+2',vars:'n','check-at':'1,2,3,4'});
  const geometric=node(node(fill,'p'),'span',{class:'blank',ans:'2*(-3)^(n-1)',vars:'n',integer:'n',positive:'n'});
  for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
  E.document.dispatchEvent({type:'DOMContentLoaded'});
  if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
  const a=prefix.querySelector('.blank-input'),b=geometric.querySelector('.blank-input');
  if(rich){a.focus();b.focus();}
  input(a,rich?'5n+2+(n-1)(n-2)(n-3)(n-4)':alternative);
  input(b,rich?'2(-3)^{n-1}':'2*(-3)^(n-1)');
  button(fill,'בדיקה').click();
  assert.equal(prefix.classList.contains('ok'),true,'finite terms, rich='+rich);
  assert.equal(geometric.classList.contains('ok'),true,'integer index, rich='+rich);
}
console.log('Sequence introduction: alternative formulas, integer indices, numeric stages and both input adapters passed.');
