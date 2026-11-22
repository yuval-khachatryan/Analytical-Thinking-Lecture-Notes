const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 for(const [variable,epsilon,first] of [['n',false,1],['n',true,1],['k',true,3],['x',false,1]]){
  const E=env(),parent=node(E.document,'section',{'start-index':String(first)});
  const start=`2/(${variable}+1)<${epsilon?'ε':'1/50'}`;
  const result=epsilon?`2<ε*(${variable}+1)`:`100<${variable}+1`;
  const operand=epsilon?`${variable}+1`:`50*(${variable}+1)`;
  const d=node(parent,'div',{class:'derive',vars:variable+(epsilon?',ε':''),solve:variable,positive:variable+(epsilon?',ε':''),start});
  node(d,'div',{class:'step',line:result,action:'mul',value:operand});
  for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
  E.document.dispatchEvent({type:'DOMContentLoaded'});
  if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
  button(d,'כתיבת פתרון').click();
  function checkContext(text){
   if(variable==='x'){
    assert.doesNotMatch(text,/תחום האינדקס/);assert.match(text,/x&gt;0|x>0/);
   }else{
    assert.match(text,/נתון:/);assert.doesNotMatch(text,/תחום האינדקס|mathbb/);
    assert.ok(text.includes(variable+'\\ge '+first));assert.ok(!text.includes(variable+'>0'));assert.ok(!text.includes(variable+'&gt;0'));
   }
   if(epsilon)assert.match(text,/ε&gt;0|ε>0/);
  }
  checkContext(d.querySelector('.as-given').textContent);assert.equal(d.querySelector('.proof-goal'),null,'no duplicate target title');
  assert.match(d.querySelector('.as-given').textContent,/לפתור את אי־השוויון/);
  const row=d.querySelector('.as-step'),field=selectAction(row,'mul').querySelector('.as-justification-value');
  field.focus();input(field,operand);const answer=row.querySelector('.pw-input');answer.focus();input(answer,result);
  button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
  const document=JSON.parse(JSON.stringify(d.courseProof));
  assert.deepEqual(document.indexDomains,variable==='x'?{}:{[variable]:{set:'natural',minimum:first}});
  assert.deepEqual(document.assumptions,(variable==='x'?['x>0']:[]).concat(epsilon?['ε>0']:[]));
  button(d,'פתרון לדוגמה').click();const model=d.querySelector('.pw-solution');
  assert.equal(model.getAttribute('data-model-checked'),'true');checkContext(model.textContent);assert.equal(model.querySelector('.proof-goal'),null,'no duplicate model title');
  button(d,'כתיבת פתרון').click();button(d,'מההתחלה').click();checkContext(d.querySelector('.as-given').textContent);assert.equal(d.querySelector('.proof-goal'),null,'no duplicate target title');
 }
}
console.log('Index domain DOM: writing/model/reset, natural indices and tails, parameter assumptions and sign-dependent multiplication passed in both adapters.');
