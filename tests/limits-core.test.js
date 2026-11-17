const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
for(const n of ['11','20','100000'])assert.equal(M.checkAnswer('num','11',n,[],{minAnswer:'11',integerAnswer:true}).ok,true);
for(const n of ['0','10','11.5','inf'])assert.equal(M.checkAnswer('num','11',n,[],{minAnswer:'11',integerAnswer:true}).ok,false);
assert.equal(M.checkAnswer('num','3','4',[],{minAnswer:'3'}).ok,true);
assert.equal(M.checkAnswer('num','3','2',[],{minAnswer:'3'}).ok,false);

// Check all infinite tails analytically, including wide neighborhoods and boundaries.
const A=require('../widgets/ch02/limit-activities.js');
assert.equal(A.tail('reciprocal',0,[1,10],10).ok,false);
for(const N of [11,20,100000])assert.equal(A.tail('reciprocal',0,[1,10],N).ok,true);
assert.equal(A.tail('alternating-decay',0,[1,100],100).ok,false);
assert.equal(A.tail('alternating-decay',0,[1,100],101).ok,true);
for(const N of [1,2,20000,20001]){
 assert.equal(A.tail('alternating',1,[5,2],N).ok,true);
 assert.equal(A.tail('alternating',-1,[5,2],N).ok,true);
 assert.equal(A.tail('alternating',0,[3,2],N).ok,true);
 for(const L of [-1,0,1]){const r=A.tail('alternating',L,[1,2],N);assert.equal(r.ok,false);assert.equal(r.impossible,true);assert.ok(r.outside>=N);}
 assert.equal(A.tail('alternating',0,[1,1],N).ok,false,'strict boundary');
 assert.equal(A.tail('constant',3,[2,1],N).ok,true);
 assert.equal(A.tail('constant',3,[1,1],N).impossible,true);
}
for(const eps of A.choices)for(const N of [1,201,100000]){const v=A.viewport(eps,N);assert.ok(v.first<=N&&N<=v.last);assert.ok(v.count>=3&&v.count<=12);assert.equal(v.span,2.2*eps[0]/eps[1]);}
for(const N of [0,-1,1.5,Infinity,10000001])assert.equal(A.tail('reciprocal',0,[1,10],N).valid,false);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
// Execute the automatic-cutoff handler; this is not a layout test.
{
 const E=env();E.context.addEventListener=()=>{};
 const svg=node(E.document,'svg',{id:'plot'}),eps=node(E.document,'select',{id:'epsilon'});
 for(const id of ['formula','read','caption','cutoff-value'])node(E.document,'p',{id});
 E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
 E.run(fs.readFileSync('widgets/ch02/error-band.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
 assert.equal(E.document.getElementById('cutoff-value').textContent,'11');
 eps.value='1/1000';eps.dispatchEvent({type:'change'});
 assert.equal(E.document.getElementById('cutoff-value').textContent,'1001');
 assert.ok(E.document.getElementById('read').innerHTML.includes('n ≥ 1001'));
 assert.ok(svg.querySelectorAll('title').length<=12,'compact window keeps exact labels');
}
for(const rich of [false,true]){
  const E=env(),fill=node(E.document,'div',{class:'fill'});
  const general=node(node(fill,'p'),'span',{class:'blank',id:'student-formula',ans:'3n+1',vars:'n',integer:'n',positive:'n'});
  const calc=node(node(fill,'p'),'span',{class:'blank',ans:'61',form:'calculation','allow-expression':'true',calculation:'3*20+1','calculation-from':'student-formula',index:'20'});
  const threshold=node(node(fill,'p'),'span',{class:'blank',ans:'11','min-answer':'11','integer-answer':'true'});
  for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
  E.document.dispatchEvent({type:'DOMContentLoaded'});
  if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
  const g=general.querySelector('.blank-input'),c=calc.querySelector('.blank-input'),n=threshold.querySelector('.blank-input');
  if(rich){g.focus();c.focus();n.focus();}
  input(g,'4+3(n-1)');input(c,'4+3(20-1)');input(n,'50');button(fill,'בדיקה').click();
  assert.equal(calc.classList.contains('ok'),true,'Use the student’s equivalent formula');
  assert.equal(threshold.classList.contains('ok'),true,'Any sufficient N');
  input(c,'100-39');button(fill,'בדיקה').click();assert.equal(calc.classList.contains('warn'),true,'Unrelated calculation rejected');
  input(g,'3n+1');input(c,'3*20+1');button(fill,'בדיקה').click();assert.equal(calc.classList.contains('ok'),true,'Recheck current formula');
  input(n,'10');button(fill,'בדיקה').click();assert.equal(threshold.classList.contains('bad'),true);
}
console.log('Limits core: sufficient indices, analytic tail checks and student-formula substitutions passed in both input adapters.');

// An error measured from below is positive; ask why only after an attempt.
const quizScript=Array.from(fs.readFileSync('_styles.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m=>m[1]).find(s=>s.includes('document.querySelectorAll(".tf-quiz")'));
assert.ok(quizScript);
for(const rich of [false,true]){
  const E=env(),fill=node(E.document,'div',{class:'fill'});
  const blank=node(node(fill,'p'),'span',{class:'blank',ans:'0.04',miss:'-0.04 :: חישבתם את ההפרש. השגיאה היא המרחק.'});
  const after=node(fill,'div',{class:'after-attempt'}),quiz=node(after,'div',{class:'tf-quiz','data-correct':'distance'});
  const choice=node(quiz,'button',{class:'tf-opt','data-val':'distance'},'המרחק הוא ערך מוחלט');
  node(quiz,'div',{class:'tf-why'},'ההפרש שלילי, אבל המרחק אינו שלילי.');
  const feedback=node(quiz,'div',{class:'tf-feedback'});
  for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
  E.run(quizScript);E.document.dispatchEvent({type:'DOMContentLoaded'});
  if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
  const answer=blank.querySelector('.blank-input');if(rich)answer.focus();
  assert.equal(after.classList.contains('ix-hidden'),true);
  button(fill,'בדיקה').click();assert.equal(after.classList.contains('ix-hidden'),true,'An empty submission does not expose the follow-up');
  input(answer,'-0.04');assert.equal(after.classList.contains('ix-hidden'),true,'Typing does not reveal the answer prematurely');
  button(fill,'בדיקה').click();assert.equal(blank.classList.contains('bad'),true);assert.equal(after.classList.contains('ix-hidden'),false);
  assert.match(fill.querySelector('.ix-msg').textContent,/חישבתם את ההפרש/);
  choice.click();assert.equal(quiz.classList.contains('tf-answered'),true);assert.equal(choice.classList.contains('correct'),true);
  input(answer,'0.04');assert.equal(after.classList.contains('ix-hidden'),true);assert.equal(quiz.classList.contains('tf-answered'),false);assert.equal(feedback.textContent,'');
  answer.dispatchEvent({type:'keydown',key:'Enter',preventDefault(){}});
  assert.equal(blank.classList.contains('ok'),true);assert.equal(after.classList.contains('ix-hidden'),false);
  button(fill,'ניסיון חדש').click();assert.equal(after.classList.contains('ix-hidden'),true);
  button(fill,'הצגת התשובה').click();assert.equal(after.classList.contains('ix-hidden'),false);
  button(fill,'ניסיון חדש').click();assert.equal(after.classList.contains('ix-hidden'),true);assert.equal(choice.classList.contains('correct'),false);
}
console.log('Approximation follow-up: negative-error feedback, submitted attempt, explanation, edit, reveal and reset passed in both adapters.');

