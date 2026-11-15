const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
function step(src,next,op='limitOut',before,valid=true){const r=M.checkSequenceStep(src,next,{op,before},'n');assert.equal(r.ok,valid,JSON.stringify({src,next,op,before,r}));return r;}
// Moving an operation is separate from evaluating the remaining limit.
for(const [inside,outside] of [
 ['2/n','2*lim(1/n)'],['2*(1/n)','2*lim(1/n)'],['(1/n)*(-3)','lim(1/n)*(-3)'],
 ['(1+1/n)/2','lim(1+1/n)/2'],['-(1+1/n)','-lim(1+1/n)'],
 ['sqrt(9+4/n)','sqrt(lim(9+4/n))'],['(1+1/n)^2','lim(1+1/n)^2'],
 ['(1+1/n)^(-1/2)','lim(1+1/n)^(-1/2)'],
 ['root(3,-8+1/n)','root(3,lim(-8+1/n))'],['cbrt(-8+1/n)','cbrt(lim(-8+1/n))'],
 ['root(4,16+1/n)','root(4,lim(16+1/n))']
]){step('lim('+inside+')',outside);step(outside,'lim('+inside+')','limitIn');}
const scalar=M.parseExpr(step('lim(2/n)','2*lim(1/n)').expected);assert.equal(scalar.t,'mul');assert.equal(scalar.a.v,2);assert.equal(scalar.b.f,'lim');
assert.doesNotMatch(step('lim(2/n)','2*lim(1/n)').certificate,/left\(2/,'do not display a gratuitous limit of the constant');
// An expanded product remains mathematically valid, but is not the suggestion.
step('lim(2*(1/n))','lim(2)*lim(1/n)');
step('lim(2*(1/n))','0','limitOut',undefined,false);
step('lim(1/n)','1/lim(n)','limitOut',undefined,false);
step('lim((1+1/n)^n)','lim(1+1/n)^n','limitOut',undefined,false);
step('lim(sqrt(-1/n))','sqrt(lim(-1/n))','limitOut',undefined,false);
step('lim(root(2,-1/n))','root(2,lim(-1/n))','limitOut',undefined,false);
step('lim(root(n,2))','root(n,lim(2))','limitOut',undefined,false);
step('lim((1/n)^(-1))','lim(1/n)^(-1)','limitOut',undefined,false);
step('lim(1)/lim(1/n)','lim(1/(1/n))','limitIn',undefined,false);
step('sqrt(lim(9+4/n))+1','sqrt(lim(9)+lim(4/n))+2','limitOut','lim(9+4/n)',false);
step('sqrt(lim(9+4/n))+1','sqrt(lim(9)+lim(4/n))+1','limitOut','lim(9+4/n)');
// Replay the actual new example through suggestions and recorded actions in both adapters.
const source=fs.readFileSync('02-Sequences.qmd','utf8').split('{#box-exm-root-limit-equalities')[1];
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const body=/:::: \{\.derive ([^\n]+)\}\n([\s\S]*?)\n::::\n/.exec(source);
const data=attrs(body[1]),steps=[...body[2].matchAll(/::: \{\.step ([^\n]+)\}/g)].map(m=>attrs(m[1]));
assert.equal(M.sequenceModel(data.start,steps,'n').state.done,true);
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,button};')(require);
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',...data});
 for(const st of steps)node(d,'div',{class:'step',...st});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 for(const st of steps){const row=d.querySelectorAll('.seq-step').find(r=>!r.querySelector('.as-editor').hidden);assert.ok(row);button(row,'הצגת צעד אפשרי').click();button(row,'יישום הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);assert.equal(row.querySelector('.seq-action').value,st.action);}
 button(d,'פתרון לדוגמה').click();assert.equal(d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true');
}
console.log('Limit rules: scalar factors, powers, roots, both directions, conditions, preserved selections and the complete root example passed in both input adapters.');
