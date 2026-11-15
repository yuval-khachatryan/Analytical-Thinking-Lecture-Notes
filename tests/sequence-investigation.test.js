const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
const monotone=(f,method,result,op,direction,N=1)=>M.checkSequenceMonotonicity(f,method,result,op,direction,N);
assert.equal(monotone('3-1/n','difference','1/(n*(n+1))','>','up').ok,true);
assert.equal(monotone('3-1/n','ratio','n*(3n+2)/((n+1)*(3n-1))','>','up').ok,true);
assert.equal(monotone('3-1/n','ratio','n*(3n+2)/((n+1)*(3n-1))','<','down').ok,false);
assert.equal(monotone('3-1/n','difference','1/n','>','up').ok,false);
assert.equal(monotone('2+3/n','difference','-3/(n*(n+1))','<','down').ok,true);
assert.equal(monotone('n/(n+1)','ratio','(n+1)^2/(n*(n+2))','>','up').ok,true);
assert.equal(monotone('-n','ratio','(n+1)/n','>','up').ok,false,'Positive index does not establish positive terms');
assert.equal(monotone('(n-10)^2','difference','2n-19','>','up',1).ok,false);
assert.equal(monotone('(n-10)^2','difference','2n-19','>','up',10).ok,true);
assert.throws(()=>M.sequenceTailSign('(n-5)/(n-5)',1),e=>/מכנים/.test(e.message),'Cancelled denominator cannot hide a domain hole');
assert.deepEqual(M.sequenceTailSign('(n-5)/(n-5)',6),[1]);
assert.equal(monotone('n','difference','1','>','up',1.5).ok,false);
const mono=monotone('3-1/n','difference','1/(n*(n+1))','>','up');
const upper=M.checkSequenceBound('3-1/n','3>3-1/n','1/n','upper',1);
assert.equal(upper.ok,true);
assert.equal(M.checkSequenceBound('3-1/n','3-1/n<4','1+1/n','upper',1).ok,true);
assert.equal(M.checkSequenceBound('3-1/n','3-1/n<2','1/n-1','upper',1).ok,false);
assert.equal(M.checkSequenceBound('3-1/n','3>3-1/n','2/n','upper',1).ok,false);
assert.equal(M.checkSequenceBound('3-1/n','3>3-1/n','1/n','lower',1).ok,false);
assert.equal(M.checkSequenceBound('3-1/n','2<=3-1/n','1-1/n','lower',1).ok,true);
assert.equal(M.checkSequenceBound('3-1/n','2<3-1/n','1-1/n','lower',1).ok,false);
assert.equal(M.checkSequenceBound('3-1/n','2<3-1/n','1-1/n','lower',2).ok,true);
assert.equal(M.checkSequenceBound('3-1/n','(n-2)/(n-2)*(3-1/n)<3','1/n','upper',1).ok,false,'A typed bound cannot hide a zero denominator by cancellation');
assert.equal(M.checkSequenceBound('3-1/n','(n-2)/(n-2)*(3-1/n)<3','1/n','upper',3).ok,true,'The same bound is valid on a tail after the undefined index');
assert.equal(M.checkSequenceConvergence(mono,upper,'monotone-bounded','yes').ok,true);
assert.equal(M.checkSequenceConvergence(mono,null,'monotone-bounded','yes').ok,false);
assert.equal(M.checkSequenceConvergence(mono,upper,'bounded','yes').ok,false);
assert.equal(M.checkSequenceConvergence(mono,M.checkSequenceBound('3-1/n','2<=3-1/n','1-1/n','lower',1),'monotone-bounded','yes').ok,false);
console.log('Sequence investigation: difference/ratio, positive-term condition, whole-tail certificates, bounds and theorem dependencies passed.');

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),box=node(E.document,'div',{class:'sequence-investigation',formula:'3-1/n',difference:'1/(n*(n+1))',ratio:'n*(3n+2)/((n+1)*(3n-1))'});
 node(box,'div',{class:'model'},'פתרון לדוגמה');
 const fill=node(E.document,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank',kind:'text',ans:'כן',choices:'כן|לא'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(box,'כתיבת פתרון').click();
 function choose(selector,value){const f=box.querySelector(selector);assert.ok(f,selector);f.value=value;f.dispatchEvent({type:'change'});}
 function type(selector,value,host=box){const f=host.querySelector(selector);assert.ok(f,selector);if(rich)f.focus();input(f,value);}
 function algebra(method,value){
   choose('.si-method',method);const host=box.querySelector('[data-method="'+method+'"]'),row=host.querySelector('.seq-step');
   const cat=row.querySelector('.seq-category');cat.value='algebra';cat.dispatchEvent({type:'change'});
   const op=row.querySelector('.seq-action');op.value='simplify';op.dispatchEvent({type:'change'});
   type('.pw-input',value,row);button(row,'בדיקת הצעד והמשך').click();
   assert.equal(row.querySelector('.as-editor').hidden,true,'Algebra step accepted');return row;
 }
 const difference=algebra('difference','1/(n*(n+1))');
 choose('.si-comparison','>');choose('.si-direction','up');button(box,'בדיקת המונוטוניות').click();
 assert.match(box.textContent,/טיעון המונוטוניות נכון/);
 choose('.si-rule','monotone-bounded');choose('.si-answer','yes');button(box,'סיום פתרון').click();
 assert.equal(box.classList.contains('si-complete'),false,'Monotonicity alone does not finish');
 choose('.si-side','upper');type('.si-claim','3>3-1/n');type('.si-gap','1/n');
 assert.ok(box.querySelector('.si-claim').parentElement.querySelector('.as-field-preview').textContent||rich,'Native relation preview renders');
 button(box,'בדיקת החסם והנימוק').click();button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),true);
 button(box,'פתרון לדוגמה').click();button(box,'כתיבת פתרון').click();assert.equal(difference.querySelector('.as-editor').hidden,true,'Draft retained across tabs');
 algebra('ratio','n*(3n+2)/((n+1)*(3n-1))');choose('.si-comparison','>');choose('.si-direction','up');button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),true);
 choose('.si-method','difference');assert.equal(difference.querySelector('.as-editor').hidden,true,'Alternative method draft retained');
 choose('.si-comparison','>');choose('.si-direction','up');button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),true);
 button(difference,'עריכה').click();type('.pw-input','-1',difference);button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),false,'Editing evidence invalidates convergence');
 button(box,'ניסיון חדש').click();assert.equal(box.querySelector('.si-method').value,'');assert.equal(box.querySelector('.si-claim').value,'');
 const choice=blank.querySelector('select');assert.ok(choice,'Fixed-language answers use a select');choice.value='כן';choice.dispatchEvent({type:'change'});button(fill,'בדיקה').click();assert.ok(blank.classList.contains('ok'));
}
console.log('Sequence investigation DOM: both methods, justified bound, completion dependencies, invalidation, drafts, math previews and choice fields passed in both input adapters.');

// A tail formula is not a definition of the exceptional prefix. The editor,
// completion check, model and reset must all respect its first valid index.
for(const rich of [false,true]){
 const E=env(),box=node(E.document,'div',{class:'sequence-investigation',formula:'1-1/n','start-index':'3',difference:'1/(n*(n+1))',ratio:'n^2/((n+1)*(n-1))','model-direction':'up','model-side':'upper','model-bound':'1-1/n<=1','model-gap':'1/n'});
 node(box,'div',{class:'model'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(box,'כתיבת פתרון').click();
 const choose=(sel,value)=>{const f=box.querySelector(sel);f.value=value;f.dispatchEvent({type:'change'});};
 const type=(host,sel,value)=>{const f=host.querySelector(sel);if(rich)f.focus();input(f,value);};
 assert.equal(box.querySelector('.si-index').value,'3');
 choose('.si-method','ratio');
 const row=box.querySelector('.seq-step');
 const cat=row.querySelector('.seq-category');cat.value='algebra';cat.dispatchEvent({type:'change'});
 const op=row.querySelector('.seq-action');op.value='simplify';op.dispatchEvent({type:'change'});
 type(row,'.pw-input','n^2/((n+1)*(n-1))');button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true);
 choose('.si-comparison','>');choose('.si-direction','up');choose('.si-side','upper');
 type(box,'.si-claim','1-1/n<=1');type(box,'.si-gap','1/n');choose('.si-rule','monotone-bounded');choose('.si-answer','yes');
 button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),true);
 for(const N of ['2','0','3.5','']){
   input(box.querySelector('.si-index'),N);button(box,'סיום פתרון').click();
   assert.equal(box.classList.contains('si-complete'),false);assert.match(box.textContent,/תקפה החל מאינדקס 3/);
 }
 for(const N of ['3','4']){input(box.querySelector('.si-index'),N);button(box,'סיום פתרון').click();assert.equal(box.classList.contains('si-complete'),true);}
 button(box,'פתרון לדוגמה').click();assert.match(box.querySelector('.pw-solution').textContent,/החל מאינדקס 3/);
 button(box,'כתיבת פתרון').click();button(box,'ניסיון חדש').click();assert.equal(box.querySelector('.si-index').value,'3');
 assert.equal(box.querySelector('.si-tail').checked,true);
}
assert.equal(M.investigationModel('1-1/n',{startIndex:3,difference:'1/(n*(n+1))',direction:'up',side:'upper',bound:'1-1/n<=1',gap:'1/n'}).conclusion.ok,true);
console.log('Tail investigation: valid formula domain, ratio, completion, invalid indices, model and reset passed in both adapters.');
