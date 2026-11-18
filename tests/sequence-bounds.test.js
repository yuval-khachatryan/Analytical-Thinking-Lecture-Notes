const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../assets/interactive.js');
const entry=(source,text,op,value)=>({source,text,actions:[{op,value}]});
const proof={rule:'sin',argument:'n',entries:[entry(1,'2<=3+sin(n)<=4','add','3'),entry(2,'2/n^2<=(3+sin(n))/n^2<=4/n^2','div','n^2')]};
const action={op:'squeeze',lower:'2/n^2',upper:'4/n^2',boundProof:proof};
const check=a=>M.checkSequenceStep('(3+sin(n))/n^2','0',a,'n');
assert.equal(check(action).ok,true);
assert.equal(check({...action,boundProof:undefined}).ok,false,'Final bounds alone do not justify squeeze');
assert.equal(check({...action,boundProof:{...proof,entries:[{...proof.entries[0],actions:[{op:'sub',value:'3'}]},proof.entries[1]]}}).ok,false);
assert.equal(check({...action,boundProof:{...proof,entries:[{...proof.entries[1],source:1}]}}).ok,false,'Deleted reference invalidates argument');
const loose={...proof,entries:proof.entries.concat(entry(3,'-4/n^2<=(3+sin(n))/n^2<=4/n^2','lowerBound','-4/n^2'))};
assert.equal(check({...action,lower:'-4/n^2',boundProof:loose}).ok,true);
assert.equal(check({...action,lower:'-4/n^2'}).ok,false,'Widening must be explicit');
assert.equal(check({...action,lower:'3/n^2',boundProof:{...proof,entries:proof.entries.concat(entry(3,'3/n^2<=(3+sin(n))/n^2<=4/n^2','lowerBound','3/n^2'))}}).ok,false);
const bounded={op:'bounded',factor:'3+sin(n)',bound:'4',boundProof:{...proof,entries:proof.entries.slice(0,1)}};
assert.equal(check(bounded).ok,true);assert.equal(check({...bounded,boundProof:undefined}).ok,false);
assert.equal(check({...bounded,bound:'3'}).ok,false);
assert.equal(check({...bounded,bound:'10'}).ok,false,'A correct but wider absolute bound still needs its widening step');
assert.equal(check({...bounded,bound:'10',boundProof:{...bounded.boundProof,entries:bounded.boundProof.entries.concat(entry(2,'2<=3+sin(n)<=10','upperBound','10'))}}).ok,true);
assert.equal(M.checkSequenceStep('cos(n)/n','0',{op:'bounded',factor:'cos(n)',bound:'1',boundProof:{rule:'cos',argument:'n',entries:[]}},'n').ok,true);
const cfg=M.sequenceBoundConfig('n');
for(const [text,ok] of [['3>=-3*cos(n)>=-3',true],['-3<=-3*cos(n)<=3',true],['3<=-3*cos(n)<=-3',false]])assert.equal(M.checkJustifiedStep('-1<=cos(n)<=1',text,[{op:'mul',value:'-3'}],cfg).ok,ok);
assert.equal(M.checkJustifiedStep('-1<=cos(n)<=1','-2<=cos(n)<=1',[{op:'lowerBound',value:'-2'}],{...cfg,boundProof:false}).ok,false);
for(const [kind,expected,typed,ok] of [
 ['distance','abs(3-4/n-3)<0.05','abs((3-4/n)-3)<1/20',true],['distance','abs(3-4/n-3)<0.05','0.05>abs(3-(3-4/n))',true],
 ['distance','abs(3-4/n-3)<0.05','n>80',false],['distance','abs(3-4/n-3)<0.05','abs(3-4/n)<0.05',false],
 ['difference','n/(n+1)','(n+1)/(n+2)-n/(n+1)',true],['ratio','n/(n+1)','((n+1)/(n+2))/(n/(n+1))',true],['difference','n/(n+1)','1/((n+1)*(n+2))',false]
])assert.equal(M.checkSequenceSetup(kind,expected,typed).ok,ok,typed);
console.log('Bound arguments: checked operations, widening, citations, both limit rules and student setups passed.');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',limit:'n',start:'(3+sin(n))/n^2'});node(d,'div',{class:'step',line:'[0]'});
 const epsilon=node(E.document,'div',{class:'derive',vars:'n',positive:'n','student-setup':'distance',start:'abs(3-4/n-3)<0.05'});node(epsilon,'div',{class:'step',line:'n>[80]'});
 const mini=node(E.document,'div',{class:'derive',vars:'n',positive:'n','bound-rule':'sin',start:'-1<=sin(n)<=1'});node(mini,'div',{class:'step',line:'[-2]<=sin(n)<=1',action:'lowerBound',value:'-2'});
 const inv=node(E.document,'div',{class:'sequence-investigation','setup-required':'true',formula:'n/(n+1)',difference:'1/((n+1)*(n+2))',ratio:'(n+1)^2/(n*(n+2))'});node(inv,'div',{class:'model'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const change=(f,value)=>{f.value=value;f.dispatchEvent({type:'change'});};
 const type=(host,selector,value)=>{const f=host.querySelector(selector);assert.ok(f,selector);if(rich)f.focus();input(f,value);};
 button(d,'כתיבת פתרון').click();const outer=d.querySelector('.seq-step'),outerEditor=outer.querySelector('.as-editor');
 change(outer.querySelector('.seq-category'),'limits');change(outer.querySelector('.seq-action'),'squeeze');
 type(outer,'.seq-lower','2/n^2');type(outer,'.seq-upper','4/n^2');
 const resultField=Array.from(outerEditor.querySelectorAll('.pw-input')).find(f=>!f.closest('.seq-bound-proof'));
 const outerCheck=Array.from(outerEditor.querySelectorAll('button')).find(b=>b.textContent==='בדיקת הצעד והמשך'&&!b.closest('.seq-bound-proof'));
 if(rich)resultField.focus();change(outer.querySelector('.seq-equality-kind'),'target');input(resultField,'lim((3+sin(n))/n^2)=0');outerCheck.click();assert.equal(outerEditor.hidden,false);
 change(outer.querySelector('.seq-bound-rule'),'sin');button(outer,'התחלת הנימוק').click();const work=outer.querySelector('.seq-bound-working');
 function argumentStep(index,op,value,result){const r=work.querySelectorAll('.as-step')[index];assert.ok(r,'argument row');const f=selectAction(r,op).querySelector('.as-justification-value');if(rich)f.focus();input(f,value);type(r,'.pw-input',result);button(r,'בדיקת הצעד והמשך').click();assert.equal(r.querySelector('.as-editor').hidden,true,r.textContent);return r;}
 const first=argumentStep(0,'add','3','2<=3+sin(n)<=4');argumentStep(1,'div','n^2','2/n^2<=(3+sin(n))/n^2<=4/n^2');
 outerCheck.click();assert.equal(outerEditor.hidden,true,d.textContent);assert.ok(outer.querySelector('.seq-bound-transcript'));
 button(d,'פתרון לדוגמה').click();button(d,'כתיבת פתרון').click();assert.equal(first.querySelector('.as-editor').hidden,true);
 const outerSummary=Array.from(outer.children).find(x=>x.classList.contains('as-compact'));button(outerSummary,'עריכה').click();button(first,'עריכה').click();type(first,'.pw-input','0<=3+sin(n)<=4');outerCheck.click();assert.equal(outerEditor.hidden,false);
 button(epsilon,'כתיבת פתרון').click();assert.equal(epsilon.querySelector('.as-proof-work').hidden,true);type(epsilon,'.seq-start-input','n>80');button(epsilon,'בדיקת נקודת המוצא').click();assert.equal(epsilon.querySelector('.as-proof-work').hidden,true);
 type(epsilon,'.seq-start-input','abs((3-4/n)-3)<0.05');button(epsilon,'בדיקת נקודת המוצא').click();assert.equal(epsilon.querySelector('.as-proof-work').hidden,false);
 button(mini,'כתיבת פתרון').click();const row=mini.querySelector('.as-step');button(row,'הצגת צעד אפשרי').click();button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true);
 button(inv,'כתיבת פתרון').click();change(inv.querySelector('.si-method'),'difference');assert.equal(inv.querySelector('.si-calculation'),null);type(inv,'.si-setup','(n+1)/(n+2)-n/(n+1)');button(inv,'בדיקת ההצבה').click();assert.ok(inv.querySelector('.si-calculation'));
}
console.log('Bound DOM: inequality work, retained arguments, edits, hints and student setups passed in both adapters.');
