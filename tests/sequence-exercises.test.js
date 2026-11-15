const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
const calculation={allowExpression:true,form:'calculation'};
for(const [answer,expression] of [['3/2','(2+1)/2'],['13','2*6+1'],['96','3*2^(6-1)'],['-5','(-1)^5*5']]){
  assert.equal(M.checkAnswer('num',answer,expression,[],calculation).ok,true,expression);
  assert.equal(M.checkAnswer('num',answer,answer,[],calculation).partial,true,answer);
  assert.equal(M.checkAnswer('num',answer,answer,[],{}).ok,true,answer);
  assert.equal(M.checkAnswer('num',answer,expression,[],{}).partial,true,expression);
}
assert.equal(M.checkAnswer('num','-5','--(-5)',[],calculation).partial,true);
assert.equal(M.checkAnswer('num','3/2','(3+1)/2',[],calculation).ok,false);
const substitution={...calculation,calculation:'(2+1)/2'};
assert.equal(M.checkAnswer('num','3/2','(2+1)/2',[],substitution).ok,true);
assert.equal(M.checkAnswer('num','3/2','(1+2)/2',[],substitution).ok,true);
for(const unrelated of ['6/4','1+1/2','2-1/2'])assert.equal(M.checkAnswer('num','3/2',unrelated,[],substitution).partial,true,unrelated);
assert.equal(M.checkAnswer('num','96','3*2^5',[],{...calculation,calculation:'3*2^(6-1)'}).ok,true);
assert.equal(M.checkAnswer('num','96','100-4',[],{...calculation,calculation:'3*2^(6-1)'}).partial,true);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+
  '\nreturn {env,node,input,button};')(require);
const cases=[
  {kind:'arithmetic',terms:'5,2,-1,-4',formula:'8-3n',values:['5','-3','5-3*(n-1)']},
  {kind:'geometric',terms:'2,-6,18,-54',formula:'2*(-3)^(n-1)',values:['2','-3','-2/3*(-3)^n']},
  {kind:'neither',terms:'1,2,4,7,11',values:['1','2','2','7/4']}
];
for(const rich of [false,true])for(const data of cases){
  const E=env(),box=node(E.document,'div',{class:'sequence-classify',answer:data.kind,terms:data.terms,formula:data.formula||''});
  const model=node(box,'div',{class:'explain'},'model answer'),hint=node(box,'div',{class:'hint'},'hint');
  const fill=node(E.document,'div',{class:'fill'});
  const calculationBlank=node(node(fill,'p'),'span',{class:'blank',ans:'3/2',form:'calculation','allow-expression':'true'});
  for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
  E.document.dispatchEvent({type:'DOMContentLoaded'});
  if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
  assert.equal(model.hidden,true);assert.equal(hint.hidden,true);
  assert.equal(box.querySelectorAll('.blank-input').length,0,'No fields before classification');
  const select=box.querySelector('select');
  function choose(kind){select.value=kind;select.dispatchEvent({type:'change'});return box.querySelectorAll('.sequence-kind-panel').find(p=>p.getAttribute('data-kind')===kind);}
  function write(field,value){if(rich)field.focus();input(field,value);}
  button(box,'בדיקה').click();assert.match(box.querySelector('.ix-msg').textContent,/בחרו תחילה/);
  let p=choose('arithmetic'),draft=p.querySelector('.blank-input');write(draft,'9');
  const g=choose('geometric');assert.equal(p.hidden,true);assert.equal(g.hidden,false);
  assert.equal(g.querySelectorAll('.blank-input').length,3);
  const neither=choose('neither');assert.equal(neither.querySelectorAll('.blank-input').length,4);
  choose('arithmetic');assert.equal(draft.value,'9','Switching must retain drafts');
  choose(data.kind==='arithmetic'?'geometric':'arithmetic');button(box,'בדיקה').click();
  assert.match(box.querySelector('.ix-msg').textContent,/הבחירה אינה מתאימה/);
  p=choose(data.kind);button(box,'בדיקה').click();assert.equal(model.hidden,true);
  const fields=p.querySelectorAll('.blank-input');
  fields.forEach((f,i)=>write(f,data.values[i]));button(box,'בדיקה').click();
  assert.match(box.querySelector('.ix-msg').textContent,/✓ התשובה נכונה/);
  assert.equal(model.hidden,false);
  fields.forEach(f=>assert.equal(f.closest('.blank').classList.contains('ok'),true));
  // A correct type alone, or a correct number in unfinished form, is insufficient.
  write(fields[0],data.kind==='neither'?'2-1':data.kind==='arithmetic'?'10/2':'4/2');
  button(box,'בדיקה').click();assert.match(box.querySelector('.ix-msg').textContent,/החישוב עדיין לא הושלם/);
  assert.equal(model.hidden,true);
  button(box,'הצגת תשובה').click();assert.equal(model.hidden,false);
  assert.notEqual(fields[0].value,'','Reveal preserves student work');
  button(box,'ניסיון חדש').click();assert.equal(select.value,'');assert.equal(model.hidden,true);
  for(const panel of box.querySelectorAll('.sequence-kind-panel'))assert.equal(panel.hidden,true);
  for(const f of box.querySelectorAll('.blank-input'))assert.equal(f.value,'');
  button(box,'רמז').click();assert.equal(hint.hidden,false);
  button(box,'הצגת תשובה').click();assert.equal(model.hidden,false,'Reveal works before selecting');

  const calcInput=calculationBlank.querySelector('.blank-input');
  write(calcInput,rich?'\\frac{3}{2}':'3/2');button(fill,'בדיקה').click();
  assert.equal(calculationBlank.classList.contains('warn'),true);
  write(calcInput,rich?'\\frac{2+1}{2}':'(2+1)/2');button(fill,'בדיקה').click();
  assert.equal(calculationBlank.classList.contains('ok'),true);
}
console.log('Sequence exercises: calculation vs result, conditional fields, classification, formula checking, drafts, reveal and retry passed in both input adapters.');
