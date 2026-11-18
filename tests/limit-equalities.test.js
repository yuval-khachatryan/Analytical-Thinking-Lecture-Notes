const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../assets/interactive.js');
const check=(src,claim,action,kind='target')=>M.checkSequenceEquality(src,claim,action,'n',kind);
const start='lim(sqrt(16+1/n))',arithmetic={op:'arithmetic'};
assert.equal(check(start,start+'=4',arithmetic).ok,true);
for(const claim of ['4','=4',start+'<4',start+'=5','lim(sqrt(9+1/n))=4',start+'=4=4'])
 assert.equal(check(start,claim,arithmetic).ok,false,claim);
assert.equal(check(start,start+'=4',arithmetic,'expressions').ok,false);
assert.equal(check(start,start+'=4',arithmetic,'').ok,false);
assert.equal(check(start,start+'=4',{op:'compute'}).ok,false,'A true equality still needs the right operation');

const fraction='(n+2)/(n+4)',rewritten='(1+2/n)/(1+4/n)';
const local=check('lim('+fraction+')',fraction+'='+rewritten,{op:'divide',value:'n',before:fraction},'expressions');
assert.equal(local.ok,true);assert.deepEqual(M.parseExpr(local.text),M.parseExpr('lim('+rewritten+')'));
const partial=check('sqrt(lim(16)+lim(1/n))','lim(1/n)=0',{op:'standard',before:'lim(1/n)'});
assert.equal(partial.ok,true);assert.deepEqual(M.parseExpr(partial.text),M.parseExpr('sqrt(lim(16)+0)'));
assert.equal(check('1/lim(1/n)','lim(1/n)=0',{op:'standard',before:'lim(1/n)'}).ok,false,'Local replacement cannot introduce division by zero');
assert.equal(check('lim(1/n)+lim(1/n)','lim(1/n)=0',{op:'standard',before:'lim(1/n)'}).ok,false,'Duplicate occurrences require selection');
assert.equal(check('lim(1/n)+lim(1/n)','lim(1/n)=0',{op:'standard',before:'lim(1/n)',path:'0.0.a'}).ok,true);
const entries=[{id:'a',source:'start',equality:fraction+'='+rewritten,equalityKind:'expressions',action:{op:'divide',value:'n',before:fraction}},
 {id:'b',source:'a',equality:'lim('+rewritten+')=1',equalityKind:'target',action:arithmetic}];
assert.equal(M.checkSequenceProof('lim('+fraction+')',entries,'n').done,true);
assert.equal(M.checkSequenceProof('lim('+fraction+')',[entries[1]],'n').done,false);

const trace=M.sequenceLimitExplanation(M.parseExpr('sqrt(16+1/n)'),'n');
assert.equal(trace.length,4);
assert.match(trace[1].formula,/frac\{1\}\{n\}.*=0/);
assert.match(trace[2].formula,/=16 \+ 0=16/);
assert.match(trace[3].formula,/=\\sqrt\{16\}=4/);
assert.equal(trace[3].condition,'16\\ge0');
const nth=M.sequenceLimitExplanation(M.parseExpr('root(n,16)'),'n');
assert.equal(nth.length,1);assert.match(nth[0].formula,/=1$/);assert.equal(nth[0].condition,'16>0');

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),box=node(E.document,'div',{class:'derive',start:'sqrt(16+1/n)',limit:'n',given:'n>=1'});
 node(box,'div',{class:'step',line:'4',action:'arithmetic'});
 const absent=node(E.document,'div',{class:'derive',start:'1/n',limit:'n'});node(absent,'div',{class:'step',line:'0',action:'standard'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(box,'כתיבת פתרון').click();const row=box.querySelector('.seq-step');
 assert.match(box.querySelector('.seq-problem-givens').textContent,/נתונים/);
 assert.match(box.querySelector('.as-given').textContent,/לחישוב/);
 assert.equal(absent.querySelector('.seq-problem-givens'),null);
 assert.equal(row.querySelector('.seq-equals'),null);
 const choose=(selector,value)=>{const f=row.querySelector(selector);f.value=value;f.dispatchEvent({type:'change'});};
 choose('.seq-equality-kind','target');choose('.seq-category','limits');choose('.seq-action','arithmetic');
 const field=row.querySelector('.pw-input');field.focus();input(field,'4');button(row,'בדיקת הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,false,'Bare number is not an equality step');
 const claim=start+'=4';input(field,rich?M.texChain(M.parseRelation(claim).disj[0]):claim);
 button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true);
 assert.notEqual(box.getAttribute('data-solution-complete'),'true');
 const detail=row.querySelector('.seq-action-explanation');assert.ok(detail);assert.equal(detail.getAttribute('open'),null);
 assert.equal(detail.querySelector('.seq-limit-transitions').querySelectorAll('li').length,4);
 assert.match(detail.textContent,/מציבים את גבולות שני המחוברים/);
 assert.match(detail.querySelector('.seq-action-argument').innerHTML,/16/);
 button(box,'סיום פתרון').click();assert.equal(box.getAttribute('data-solution-complete'),'true');
 button(box,'פתרון לדוגמה').click();const model=box.querySelector('.pw-solution');
 assert.equal(model.getAttribute('data-model-checked'),'true');
 assert.ok(model.querySelector('.seq-problem-givens'));
 assert.equal(model.querySelector('.seq-action-explanation').getAttribute('open'),null);
 assert.equal(model.querySelector('.seq-limit-transitions').querySelectorAll('li').length,4);
 button(box,'כתיבת פתרון').click();button(row,'עריכה').click();choose('.seq-equality-kind','expressions');
 button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,false);
 assert.notEqual(box.getAttribute('data-solution-complete'),'true');
}
console.log('Explicit equalities: both sides, step types, local replacements, preserved context, source references, givens, finish/edit and folded concrete rule explanations passed in both adapters.');
