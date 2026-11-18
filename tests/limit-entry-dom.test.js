const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);

// A real limit atom carries its index, arrow, destination and editable body.
const limit=String.raw`\lim\limits_{n\to\infty}\left(3+\frac{1}{n}\right)`;
assert.deepEqual(M.parseExpr(I.latexToPlain(limit)),M.parseExpr('lim(3+1/n)'));
assert.equal(I.latexToPlain(String.raw`\lim\nolimits_{k\rightarrow\infty}(3)`),'lim(k,3)');
assert.throws(()=>I.latexToPlain(String.raw`\lim\limits_{n\to\infty}(\placeholder{})`),/מקום ריק/);
assert.throws(()=>I.latexToPlain(String.raw`\lim\limits_{n\to0}(3)`),/לאינסוף/);
assert.deepEqual(I.plainTemplate('',0,0,'lim()'),{value:'lim()',caret:4});
assert.deepEqual(I.plainTemplate('3+1/n',0,5,'lim()'),{value:'lim(3+1/n)',caret:10});
assert.equal(M.checkSequenceStep('lim(n)','inf',{op:'standard'},'n').ok,true);
assert.equal(M.checkSequenceStep('lim(n)','-inf',{op:'standard'},'n').ok,false);
assert.equal(M.checkSequenceStep('lim(-n)','-inf',{op:'arithmetic'},'n').ok,true);

for(const rich of [false,true])for(const start of ['3+1/n','lim(3+1/n)']){
 const E=env(),d=node(E.document,'div',{class:'derive',start,limit:'n'});
 const steps=[
  ['lim(3)+lim(1/n)','limitOut'],
  ['3+lim(1/n)','standard','lim(3)'],
  ['3+0','standard','lim(1/n)'],
  ['3','compute']
 ];
 steps.forEach(([line,action,before])=>node(d,'div',{class:'step',line,action,...(before?{before}:{})}));
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 function row(i){return d.querySelectorAll('.seq-step')[i];}
 function type(field,text){field.focus();input(field,rich?M.tex(M.parseExpr(text)):text);}
 function choose(r,op){
  const kind=r.querySelector('.seq-equality-kind');kind.value='target';kind.dispatchEvent({type:'change'});
  const category=r.querySelector('.seq-category');category.value=op==='compute'?'numbers':'limits';category.dispatchEvent({type:'change'});
  const action=r.querySelector('.seq-action');action.value=op;action.dispatchEvent({type:'change'});
 }
 assert.match(d.querySelector('.as-given').querySelector('.as-formula').innerHTML,/\\lim_\{n\\to\\infty\}/);
 assert.doesNotMatch(d.querySelector('.as-given').querySelector('.as-formula').innerHTML,/= /);
 const field=row(0).querySelector('.pw-input');field.focus();
 const key=row(0).querySelector('[aria-label="גבול כאשר n שואף לאינסוף"]');
 assert.ok(key);assert.match(key.innerHTML,/n → ∞/);
 if(rich){
  assert.equal(field.control.inlineShortcuts.lim,I.templates['lim()']);
  assert.equal(field.control.inlineShortcuts['->'],String.raw`\to`);
  let inserted,options;field.control.insert=(s,o)=>{inserted=s;options=o;};
  key.click();assert.equal(inserted,I.templates['lim()']);assert.equal(options.selectionMode,'placeholder');
  input(field,String.raw`\lim\limits_{n\to\infty}(\placeholder{})`);
 }else{key.click();assert.equal(field.value,'lim()');assert.equal(field.selectionStart,4);}
 choose(row(0),'limitOut');button(row(0),'בדיקת הצעד והמשך').click();
 assert.notEqual(d.getAttribute('data-solution-complete'),'true');
 assert.equal(row(0).querySelector('.as-editor').hidden,false,'empty body cannot pass a step');
 for(let i=0;i<steps.length;i++){
  const [next,op,before]=steps[i],r=row(i);choose(r,op);
  assert.equal(r.querySelector('.seq-equals'),null,'no equality inserted outside the input');
  if(before)type(r.querySelector('.seq-fragment'),before);
  const result=r.querySelector('.pw-input');result.focus();
  const previous=i?steps[i-1][0]:'lim(3+1/n)';
  const claim=M.sequenceEquality(previous,next,{op,before},'n').equality;
  input(result,rich?M.texChain(M.parseRelation(claim).disj[0]):claim);
  button(r,'בדיקת הצעד והמשך').click();
  assert.equal(r.querySelector('.as-editor').hidden,true,r.textContent);
  assert.match(r.querySelector('.as-compact').querySelector('.as-formula').innerHTML,/= /,'accepted step records both sides of the equality');
 }
 button(d,'סיום פתרון').click();assert.equal(d.getAttribute('data-solution-complete'),'true');
 button(d,'פתרון לדוגמה').click();
 const model=d.querySelector('.pw-solution');assert.equal(model.getAttribute('data-model-checked'),'true');
 const formulas=model.querySelectorAll('.as-formula');assert.equal(formulas.length,5);
 formulas.slice(1).forEach(f=>assert.match(f.innerHTML,/= /));
 model.querySelectorAll('.as-clean-formula').slice(1).forEach(f=>assert.match(f.innerHTML,/= /));
 button(d,'כתיבת פתרון').click();button(row(0),'עריכה').click();
 assert.notEqual(d.getAttribute('data-solution-complete'),'true','edits invalidate completion');
 button(d,'מההתחלה').click();assert.equal(row(0).querySelector('.pw-input').value,'');
 assert.equal(row(0).querySelector('.seq-equals'),null);
}

// The same visible formula can be typed back during algebraic limit steps.
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'(n+2)/(n+4)',limit:'n'});
 node(d,'div',{class:'step',line:'(1+2/n)/(1+4/n)',action:'divide',value:'n'});
 node(d,'div',{class:'step',line:'1',action:'arithmetic'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();const r=d.querySelector('.seq-step');
 const kind=r.querySelector('.seq-equality-kind');kind.value='target';kind.dispatchEvent({type:'change'});
  const category=r.querySelector('.seq-category');category.value='algebra';category.dispatchEvent({type:'change'});
 const action=r.querySelector('.seq-action');action.value='divide';action.dispatchEvent({type:'change'});
 const operand=r.querySelector('.seq-value');operand.focus();input(operand,'n');
 const field=r.querySelector('.pw-input');field.focus();
 const result='lim((n+2)/(n+4))=lim((1+2/n)/(1+4/n))';input(field,rich?M.texChain(M.parseRelation(result).disj[0]):result);
 button(r,'בדיקת הצעד והמשך').click();assert.equal(r.querySelector('.as-editor').hidden,true,r.textContent);
 assert.match(r.querySelector('.as-compact').querySelector('.as-formula').innerHTML,/= \\lim/);
}
// Replay every authored limit model through the actual UI normalization too.
// Pure checker tests alone cannot catch differences between displayed limits
// and the legacy shorthand kept in course source files.
{
 const E=env(),models=[];
 const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 for(const file of ['01-Introduction.qmd','02-Sequences.qmd']){
  const source=fs.readFileSync(file,'utf8');
  for(const m of source.matchAll(/^(:{3,}) \{\.derive ([^\n]+)\}\n([\s\S]*?)^\1\s*$/gm)){
   const data=attrs(m[2]);if(!data.limit)continue;
   const d=node(E.document,'div',{class:'derive',...data});
   for(const st of m[3].matchAll(/^::: \{\.step ([^\n]+)\}/gm))node(d,'div',{class:'step',...attrs(st[1])});
   models.push(d);
  }
 }
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 assert.ok(models.length>=30);
 for(const d of models){
  button(d,'פתרון לדוגמה').click();const solution=d.querySelector('.pw-solution');
  assert.equal(solution.getAttribute('data-model-checked'),'true',d.getAttribute('start')+': '+solution.textContent);
  solution.querySelectorAll('.as-formula').slice(1).forEach(f=>assert.match(f.innerHTML,/= /));
 }
 console.log('All '+models.length+' authored limit models render checked equality steps.');
}
console.log('Limit entry: visible equalities, explicit limits, typed limit templates, incomplete inputs, manual transitions, models, editing and reset passed in both input adapters.');
