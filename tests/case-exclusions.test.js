const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../assets/interactive.js');
const cfg={mode:'rel',vars:['x'],solve:'x',positive:[],requireJustification:true,explicitCases:true};
const action=edit=>({op:'conditionReplace',edits:[edit]});
const exclusion=(before,reason,value,extra={})=>({before,reason,value,after:'∅',...extra});
function good(src,edit,expected='∅',c=cfg){
 const a=action(edit),out=M.executeAction(src,a,c);assert.equal(out,M.relationSource(M.parseRelation(expected)));
 const check=M.checkJustifiedStep(src,out,[a],c);assert.equal(check.ok,true,JSON.stringify(check));return a;
}
function bad(src,edit,pattern=/לא הצלחתי|בחרו|אינו|אינה|אין לכתוב/,c=cfg){assert.throws(()=>M.executeAction(src,action(edit),c),e=>pattern.test(e.message),JSON.stringify(edit));}
for(const [src,expr] of [
 ['x<0 and sqrt(x)<2','sqrt(x)'],['x<1 and sqrt(x-1)<2','sqrt(x-1)'],
 ['x<=0 and ln(x)<2','ln(x)'],['x<=1 and log(x-1)<2','log(x-1)'],
 ['x=1 and log_x(2)>0','log_x(2)'],['x<0 and root(4,x)>2','root(4,x)'],
 ['x<0 and x^(1/2)<2','x^(1/2)'],['x=0 and 1/(x^2)<2','1/(x^2)'],
 ['x=0 and sqrt(1/x)<2','sqrt(1/x)']
])good(src,exclusion(src,'domain',expr));
for(const [src,expr] of [
 ['x<=0 and sqrt(x)<2','sqrt(x)'],['x<2 and sqrt(x)<2','sqrt(x)'],
 ['x>0 and ln(x)<2','ln(x)'],['x<0 and root(3,x)<2','root(3,x)'],
 ['x=0 and sqrt(x)<2 and 1/x<2','sqrt(x)']
])bad(src,exclusion(src,'domain',expr));
bad('x<0 and sqrt(x)<2',exclusion('x<0','domain','sqrt(x)'));
bad('x<0 and sqrt(x)<2 or x>1 and sqrt(x)<2',exclusion('x<0 and sqrt(x)<2 or x>1 and sqrt(x)<2','domain','sqrt(x)'));
good('sqrt(x)<2',exclusion('sqrt(x)<2','domain','sqrt(x)'),'∅',{...cfg,assumption:'x<0'});
good('x<0 and x>2',exclusion('x<0','contradiction','x>2'));
bad('x<0 or x>2',exclusion('x<0','contradiction','x>2'));
bad('x<0 and x<2',exclusion('x<0','contradiction','x<2'));
bad('x<0 and x>-1/1000000000000',exclusion('x<0','contradiction','x>0'));
good('x<0 and x>2',exclusion('x<0','contradiction','2<x'));
good('x<0',exclusion('x<0','contradiction','x>2'),'∅',{...cfg,assumption:'x>2'});

const covered=(before,coveredBy)=>({reason:'covered',before,coveredBy});
good('x>2 or x>0',covered('x>2',[1]),'x > 0');
good('x>0 or x>2',covered('x>2',[0]),'x > 0');
good('x>2 and 1/x<2 or x>0 and 1/x<2',covered('x>2 and 1/x<2',[1]),'x > 0 וגם 1/x < 2');
good('1<=x<=3 or x<=2 or x>=2',covered('1<=x<=3',[1,2]),'x <= 2 או x >= 2');
bad('x>=0 or x<=0',covered('x>=0',[1]));
bad('x>=0 or x>0',covered('x>=0',[1]));
bad('x>2 or x>0',covered('x>2',[0]));
bad('x>2 or x>0',{...covered('x>2',[1]),after:'∅'});
bad('x>2 and x<3 or x>0',covered('x>2',[1]));
assert.throws(()=>M.executeAction('x>0 or x>0',{op:'conditionReplace',edits:[{...covered('x>0',[1]),path:'and.0.0.1'},{...covered('x>0',[0]),path:'and.1.0.1'}]},cfg));

const partition=(conditions,excluded)=>({op:'partition',split:{conditions,excluded}});
let p=partition(['x<0','x>=0'],[{reason:'domain',value:'sqrt(x)'},null]);
assert.match(M.executeAction('sqrt(x)<2',p,cfg),/^x ≥ 0/);
assert.equal(M.checkJustifiedStep('sqrt(x)<2',M.executeAction('sqrt(x)<2',p,cfg),[p],cfg).ok,true);
p=partition(['x>2','x>0','x<=0'],[{reason:'covered',coveredBy:[1]},null,null]);
assert.doesNotMatch(M.executeAction('x<3',p,cfg),/x > 2/);
assert.match(M.actionReason([p],{source:'x<3',cfg}),/כבר מכוסה/);
assert.throws(()=>M.executeAction('x<3',partition(['x>=0','x<=0'],[{reason:'covered',coveredBy:[1]},null]),cfg));
assert.throws(()=>M.executeAction('x<3',partition(['x>=0','x>=0','x<0'],[{reason:'covered',coveredBy:[1]},{reason:'covered',coveredBy:[0]},null]),cfg));

const cited=action(exclusion('x<0','contradiction','x>2',{evidenceLine:1}));
let proof=M.checkLineProof('x<0 and x>2',[{source:1,text:'∅',actions:[cited]}],cfg);
assert.equal(proof.done,true,JSON.stringify(proof.results));
const forward=structuredClone(cited);forward.edits[0].evidenceLine=2;
proof=M.checkLineProof('x<0 and x>2',[{source:1,text:'∅',actions:[forward]}],cfg);assert.match(proof.results[0].msg,/שורה קודמת/);
const sibling=action(exclusion('x=2','contradiction','x=1',{evidenceLine:2}));
proof=M.checkLineProof('x=1 or x=2',[
 {kind:'open',source:1,choice:0,split:{}},{kind:'close',opening:2,conclusion:2},
 {kind:'open',source:1,choice:1,split:{}},{source:4,text:'∅',actions:[sibling]}
],cfg);assert.match(proof.results.at(-1).msg,/מקרה סגור|מקרה אחר/);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
function mount(start,rich){
 const E=env(),d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step',line:'x>0'});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.as-step');
 function type(field,value){field.focus();input(field,rich?M.tex(M.parseExpr(value)):value);}
 function commit(){button(row,'הצגת התוצאה הצפויה').click();const preview=row.querySelector('.as-action-preview');assert.ok(preview.querySelector('button'),preview.textContent);button(preview,'יישום הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);}
 return {E,d,row,type,commit};
}
for(const rich of [false,true]){
 for(const [start,reason,value] of [['x<0 and sqrt(x)<2','domain','sqrt(x)'],['x<0 and x>2','contradiction','x>2'],['x>2 or x>0','covered','']]){
  const t=mount(start,rich);selectAction(t.row,'conditionReplace');const panel=t.row.querySelector('.as-conditions');
  const pick=panel.querySelector('[data-condition="'+(reason==='covered'?'and.0.0.1':'and.0.0.2')+'"]');pick.checked=true;pick.dispatchEvent({type:'change'});
  const edit=panel.querySelector('.as-condition-replacement'),select=edit.querySelector('.as-condition-reason');select.value=reason;select.dispatchEvent({type:'change'});
  if(reason==='covered'){
   assert.equal(edit.querySelector('.as-condition-input').parentNode.hidden,true);
   const cover=edit.querySelector('[data-cover-case="1"]');cover.checked=true;cover.dispatchEvent({type:'change'});
  }else{
   const evidence=edit.querySelector('.as-condition-denominator');evidence.focus();input(evidence,rich?(reason==='domain'?M.tex(M.parseExpr(value)):'x>2'):value);
   if(reason==='domain')assert.match(edit.querySelector('.as-domain-requirements').textContent,/ge|>=/);
   if(reason==='contradiction'){const cited=edit.querySelector('.as-exclusion-source');cited.value='start';cited.dispatchEvent({type:'change'});}
   const result=edit.querySelector('.as-condition-input');result.focus();input(result,rich?'\\varnothing':'∅');
  }
  button(edit,'בדיקת הפישוט').click();assert.match(edit.textContent,/הפישוט נכון/);t.commit();
  assert.match(t.row.querySelector('.as-compact').textContent,reason==='covered'?/כבר מכוסה/:reason==='domain'?/תנאי התחום/:/סתירה.*משורה 1/);
 }
 const t=mount('sqrt(x)<2',rich),controls=selectAction(t.row,'splitCustom'),cases=controls.querySelectorAll('.as-case-definition');
 for(const [i,value] of ['x<0','x>=0'].entries()){const f=cases[i].querySelector('.as-case-condition');f.focus();input(f,value);}
 const mode=cases[0].querySelector('.as-case-mode');mode.value='exclude';mode.dispatchEvent({type:'change'});
 const reason=cases[0].querySelector('.as-case-exclusion-rule');reason.value='domain';reason.dispatchEvent({type:'change'});
 t.type(cases[0].querySelector('.as-case-evidence'),'sqrt(x)');t.commit();assert.match(t.row.querySelector('.as-compact').textContent,/תנאי התחום/);

 const u=mount('x<3',rich),custom=selectAction(u.row,'splitCustom');
 button(custom,'הוספת מקרה').click();button(custom,'הוספת מקרה').click();
 const rows=custom.querySelectorAll('.as-case-definition');
 for(const [i,value] of ['x>2','x>7','x>0','x<=0'].entries()){const f=rows[i].querySelector('.as-case-condition');f.focus();input(f,value);}
 const set=(selector,value)=>{const s=rows[0].querySelector(selector);s.value=value;s.dispatchEvent({type:'change'});};
 set('.as-case-mode','exclude');set('.as-case-exclusion-rule','covered');
 const cover=rows[0].querySelector('[data-cover-case="2"]');cover.checked=true;cover.dispatchEvent({type:'change'});
 button(rows[1],'מחיקת המקרה').click();
 assert.equal(rows[0].querySelector('[data-cover-case="1"]').checked,true,'covering case retains its identity after deletion');
 const coveringField=rows[2].querySelector('.as-case-condition');input(coveringField,'x>4');
 button(u.row,'הצגת התוצאה הצפויה').click();assert.equal(u.row.querySelector('.as-action-preview').querySelector('button'),null);
 input(coveringField,'x>0');u.commit();assert.match(u.row.querySelector('.as-compact').textContent,/כבר מכוסה במקרים 2/);
}

const numbered=fs.readFileSync('tests/numbered-cases-dom.test.js','utf8');
const exercise=new Function('require',numbered.slice(0,numbered.indexOf('for(const rich'))+';return exercise;')(require);
for(const rich of [false,true]){
 const t=exercise('x<0 and x>2',rich);
 t.action(2,'mul','2');t.commit(2);t.source(3,1);t.action(3,'mul','3');t.commit(3);
 t.source(4,1);const panel=t.action(4,'conditionReplace').querySelector('.as-conditions');
 const pick=panel.querySelector('[data-condition="and.0.0.2"]');pick.checked=true;pick.dispatchEvent({type:'change'});
 const edit=panel.querySelector('.as-condition-replacement'),reason=edit.querySelector('.as-condition-reason');reason.value='contradiction';reason.dispatchEvent({type:'change'});
 t.choose(edit.querySelector('.as-exclusion-source'),3);
 input(edit.querySelector('.as-condition-denominator'),'3x>6');input(edit.querySelector('.as-condition-input'),rich?'\\varnothing':'∅');t.commit(4);
 button(t.row(2),'עריכה').click();button(t.row(2),'מחיקת הצעד').click();
 button(t.row(2),'בדיקת הצעד והמשך').click();button(t.row(3),'בדיקת הצעד והמשך').click();
 assert.equal(t.row(3).querySelector('.as-editor').hidden,true,t.d.textContent);
 assert.match(t.row(3).querySelector('.as-compact').textContent,/סתירה.*משורה 2/,'certificate citation follows the cited row');
 button(t.row(2),'עריכה').click();button(t.row(2),'מחיקת הצעד').click();button(t.row(2),'בדיקת הצעד והמשך').click();
 assert.match(t.d.textContent,/שצוטטה נמחקה/,'deleted evidence cannot silently cite a different line');
}
console.log('Case exclusions: domains, contradictions, coverage without empty-set claims, exact boundaries, references/scopes, custom partitions and both input adapters passed.');
