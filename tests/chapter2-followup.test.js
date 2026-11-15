const fs=require('node:fs'),assert=require('node:assert/strict');
const M=require('../assets/interactive.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
const qmd=fs.readFileSync('02-Sequences.qmd','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function model(id){
 const section=qmd.slice(qmd.indexOf('{#'+id));
 const d=/:::: \{\.derive ([^\n]+)\}\n([\s\S]*?)\n::::\n/.exec(section);
 return {attrs:attrs(d[1]),steps:[...d[2].matchAll(/::: \{\.step ([^\n]+)\}/g)].map(m=>attrs(m[1]))};
}
const cfg={mode:'rel',vars:['n'],solve:'n',positive:['n'],requireJustification:true,explicitCases:true};
assert.equal(M.executeAction('-n<200<n',{op:'unchain'},cfg),'-n < 200 וגם 200 < n');
assert.equal(M.checkJustifiedStep('-n<200 and 200<n','n>200',[{op:'conditions'}],cfg).ok,true);
assert.equal(M.checkJustifiedStep('-n<200 and 200<n','n>200',[{op:'unchain'}],cfg).ok,false,'Unchaining must not remove a condition');
assert.equal(M.checkJustifiedStep('abs(1+2/n-1)<.01','n>200',[{op:'abs'}],cfg).ok,false,'Opening bars does not solve the inequality');
assert.equal(M.checkJustifiedStep('n<0 and n<200 or n>300','n<200 or n>300',[{op:'conditions'}],{...cfg,positive:[]}).ok,false,'Do not drop a condition using its own or a sibling assumption');

function sequence(src,next,a,ok=true){const r=M.checkSequenceStep(src,next,a,'n');assert.equal(r.ok,ok,JSON.stringify({src,next,a,r}));}
for(const op of ['+','-','*','/']){
 const body='(1+1/n)'+op+'(2+1/n)',separate='lim(1+1/n)'+op+'lim(2+1/n)';
 sequence(body,separate,{op:'limitOut'});
 sequence(separate,'lim('+body+')',{op:'limitIn'});
 sequence(body,'lim(1+1/n)+lim(1+1/n)',{op:'limitOut'},false);
}
sequence('1/(1/n)','lim(1)/lim(1/n)',{op:'limitOut'},false);
sequence('n-n','lim(n)-lim(n)',{op:'limitOut'},false);
sequence('(-1)^n+(-1)^(n+1)','lim((-1)^n)+lim((-1)^(n+1))',{op:'limitOut'},false);
sequence('lim(1)/lim(1/n)','lim(1/(1/n))',{op:'limitIn'},false);
sequence('lim(1/n)+lim(1/n)','0+lim(1/n)',{op:'standard',before:'lim(1/n)'},false);
sequence('lim(1/n)+lim(1/n)','0+lim(1/n)',{op:'standard',before:'lim(1/n)',path:'0.0.a'});
sequence('lim(1/n)+lim(1/n)','0+0',{op:'standard',before:'lim(1/n)',path:'0.0.a'},false);
sequence('lim(3)','3',{op:'compute'},false);
sequence('lim(3)','3',{op:'standard'});
sequence('lim(3)+lim(1/n)','3',{op:'limitIn'},false,'Keep the operation distinct from calculating the limit');

sequence('(4+1/n)^(1/2)','2',{op:'arithmetic'});
sequence('(1/n)^(1/3)','0',{op:'arithmetic'});
sequence('(1+1/n)^(-1/2)','1',{op:'arithmetic'});
sequence('(1/n)^(-1/2)','0',{op:'arithmetic'},false);
sequence('(-1/n)^(1/2)','0',{op:'arithmetic'},false);

function mount(data,rich){
 const E=env(),d=node(E.document,'div',{class:'derive',...data.attrs});
 for(const step of data.steps)node(d,'div',{class:'step',...Object.fromEntries(Object.entries(step).map(([k,v])=>['data-'+k,v]))});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();return {E,d};
}
for(const rich of [false,true]){
 // A chosen absolute-value action has no extra automatic algebra or conditions.
 const t=mount({attrs:{start:'abs(x-3)<5'},steps:[{line:'-2<x<8'}]},rich),r=t.d.querySelector('.as-step');
 selectAction(r,'abs');button(r,'הצגת התוצאה הצפויה').click();
 button(r.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();
 assert.equal(r.querySelectorAll('.as-justification-entry').length,1);
 assert.equal(r.querySelector('.as-justification-rule').value,'abs');
 assert.equal(M.relationSource(M.parseRelation(t.E.context.CourseMathInput.read(r.querySelector('.pw-input')))),'-5 < x - 3 < 5');
 // Every offered step of the actual epsilon example uses an available action.
 const data=model('box-q-error-place'),u=mount(data,rich);
 for(const step of data.steps){
  const row=u.d.querySelectorAll('.as-step').find(r=>!r.querySelector('.as-editor').hidden);
  assert.ok(row);button(row,'הצגת צעד אפשרי').click();
  button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
  assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
  assert.equal(row.querySelector('.as-justification-rule').value,step.action,'Do not infer or append a different action');
 }
 // Real limit notation round-trips through both input adapters, including the
 // model's selected subexpressions and their recorded justifications.
 const worked=model('box-exm-limit-arithmetic'),v=mount(worked,rich);
 for(const step of worked.steps){
  const row=v.d.querySelectorAll('.seq-step').find(r=>!r.querySelector('.as-editor').hidden);
  assert.ok(row,'A next sequence row exists');
  button(row,'הצגת צעד אפשרי').click();button(row,'יישום הצעד והמשך').click();
  assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
  assert.equal(row.querySelector('.seq-action').value,step.action);
 }
 const adapter=v.E.context.CourseMathInput;
 // Newly guided examples must offer executable actions, including loading the
 // checked inequality argument into the actual squeeze/bounded-factor editor.
 for(const id of ['box-exm-compact-limit-action','box-exm-squeeze','box-q-lim-bounded']){
   const authored=model(id),practice=mount(authored,rich);
   for(const step of authored.steps){
     const row=practice.d.querySelectorAll('.seq-step').find(r=>!r.querySelector('.as-editor').hidden);
     button(row,'הצגת צעד אפשרי').click();button(row,'יישום הצעד והמשך').click();
     assert.equal(row.querySelector('.as-editor').hidden,true,practice.d.textContent);
     assert.equal(row.querySelector('.seq-action').value,step.action);
     if(step['bound-proof'])assert.ok(row.querySelector('.seq-bound-transcript'),'Keep the checked bound work visible');
   }
   button(practice.d,'פתרון לדוגמה').click();
   assert.equal(practice.d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true');
 }
 for(const plain of ['lim(3)+lim(2/n)','lim(1/n)/lim(2+1/n)','lim(k,1/k)']){
  const latex=M.tex(M.parseExpr(plain));assert.deepEqual(M.parseExpr(adapter.latexToPlain(latex)),M.parseExpr(plain));
 }
 // The global math-spacing handler must never rewrite a select's option value.
 const E=env(),fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',kind:'text',ans:'לא',choices:'כן|לא'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const choice=blank.querySelector('select');choice.value='לא';choice.dispatchEvent({type:'change'});E.document.dispatchEvent({type:'input',target:choice});
 assert.equal(choice.value,'לא');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 button(fill,'ניסיון חדש').click();assert.equal(choice.value,'');
}
console.log('Chapter 2 follow-up: explicit logical/limit operations, scoped actions, authored model steps, both input adapters and dropdown selection passed.');
