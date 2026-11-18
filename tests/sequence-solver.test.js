const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
function fixtureBoundProof(src,a){
 const entry=(source,text,op,value)=>({source,text,actions:[{op,value}]});
 const p={rule:'sin',argument:'n',entries:[]};
 if(a.op==='bounded'){
   if(a.factor==='2*sin(n)')p.entries=[entry(1,'-2<=2*sin(n)<=2','mul','2')];
   if(a.bound==='10')p.entries.push(entry(p.entries.length+1,'-1<=sin(n)<=10','upperBound','10'));
   return p;
 }
 if(src==='2+sin(n)/n'){
   p.entries=[entry(1,'-1/n<=sin(n)/n<=1/n','div','n'),entry(2,'2-1/n<=2+sin(n)/n<=2+1/n','add','2')];
   if(a.lower==='2-2/n')p.entries.push(entry(3,'2-2/n<=2+sin(n)/n<=2+1/n','lowerBound','2-2/n'),entry(4,'2-2/n<=2+sin(n)/n<=2+2/n','upperBound','2+2/n'));
 }else if(src==='3-2*sin(n)/n'){
   p.entries=[entry(1,'2>=-2*sin(n)>=-2','mul','-2'),entry(2,'2/n>=-2*sin(n)/n>=-2/n','div','n'),entry(3,'3+2/n>=3-2*sin(n)/n>=3-2/n','add','3')];
 }else if(src==='(3+sin(n))/n^2'){
   p.entries=[entry(1,'2<=3+sin(n)<=4','add','3'),entry(2,'2/n^2<=(3+sin(n))/n^2<=4/n^2','div','n^2')];
   if(a.lower==='-4/n^2')p.entries.push(entry(3,'-4/n^2<=(3+sin(n))/n^2<=4/n^2','lowerBound','-4/n^2'));
 }
 return p;
}
function step(src,next,a,ok=true){if(a.op==='squeeze'||a.op==='bounded')a={...a,boundProof:fixtureBoundProof(src,a)};const r=M.checkSequenceStep(src,next,a,'n');assert.equal(r.ok,ok,JSON.stringify({src,next,a,r}));return r;}
// The displayed model must use operations that a student can select. Include
// actual bound transcripts where a limit depends on squeeze or a bounded factor.
{
 const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 const chapter=fs.readFileSync('02-Sequences.qmd','utf8');let checked=0;
 for(const m of chapter.matchAll(/:::: \{\.derive ([^\n]*limit="[^"]+"[^\n]*)\}\n([\s\S]*?)\n::::/g)){
  const data=attrs(m[1]);let source=data.start;
  for(const line of m[2].matchAll(/::: \{\.step ([^\n]+)\}/g)){
   const st=attrs(line[1]),next=M.prepLine(st.line).full;
   const candidates=Object.keys(M.SEQUENCE_ACTIONS).map(op=>({op}));
   for(const value of ['n','n^2','n^3','2^n','3^n','5^n'])for(const op of ['divide','factor'])candidates.push({op,value});
   if(st.action)candidates.unshift(...M.authoredAction(st));
   const enclosures={
    '2+sin(n)/n':{op:'squeeze',lower:'2-1/n',upper:'2+1/n'},
    '3-2*sin(n)/n':{op:'squeeze',lower:'3-2/n',upper:'3+2/n'},
    '(3+sin(n))/n^2':{op:'squeeze',lower:'2/n^2',upper:'4/n^2'}
   };
   if(enclosures[source]){const a=enclosures[source];candidates.push({...a,boundProof:fixtureBoundProof(source,a)});}
   if(source==='cos(n)/n')candidates.push({op:'bounded',factor:'cos(n)',bound:'1',boundProof:{rule:'cos',argument:'n',entries:[]}});
   assert.ok(candidates.some(a=>M.checkSequenceStep(source,next,a,data.limit).ok),`No available justified action for model step: ${source} -> ${next}`);
   source=next;checked++;
  }
 }
 console.log(`All ${checked} authored sequence-limit transitions have executable justifications.`);
}
const ratio='(3n^2+1)/(n^2+4n)',normal='(3+1/n^2)/(1+4/n)';
step(ratio,'3',{},false);
step(ratio,'3',{op:'arithmetic'},false);
step(ratio,normal,{op:'divide',value:'n^2'});
step(ratio,normal,{op:'divide',value:'n'},false);
step(ratio,normal,{op:'conjugate'},false);
step(normal,'3',{op:'arithmetic'});
step(normal,'0',{op:'arithmetic'},false);
step('sqrt(n^2+n)-n','n/(sqrt(n^2+n)+n)',{op:'conjugate'});
step('sqrt(n^2+n)-n','1/2',{op:'arithmetic'},false);
step('sqrt(n^2+n)-n','1/2',{op:'simplify'},false);
step('3+2/n','3+0',{op:'arithmetic',before:'2/n'});
step('3+2/n','4+0',{op:'arithmetic',before:'2/n'},false);
step('(1/n)*n','0*n',{op:'standard',before:'1/n'},false);
step('1/n+1/n','0+1/n',{op:'standard',before:'1/n'},false);
step('1/n+1/n','0+1/n',{op:'standard',before:'1/n',path:'0.0.a'});
step('sin(n)/n','0',{op:'arithmetic'},false);
step('sin(n)/n','0',{op:'bounded',factor:'sin(n)',bound:'1'});
step('sin(n)/n','0',{op:'bounded',factor:'sin(n)',bound:'10'});
step('sin(n)/n','0',{op:'bounded',factor:'sin(n)',bound:'.5'},false);
step('sin(n)/n','0',{op:'bounded',factor:'n',bound:'1'},false);
step('2+sin(n)/n','2',{op:'squeeze',lower:'2-1/n',upper:'2+1/n'});
step('2+sin(n)/n','2',{op:'squeeze',lower:'2-2/n',upper:'2+2/n'});
step('2+sin(n)/n','2',{op:'squeeze',lower:'2-1/(2n)',upper:'2+1/(2n)'},false);
step('2+sin(n)/n','2',{op:'squeeze',lower:'0',upper:'4'},false);
step('n^3/2^n','0',{op:'standard'});
step('n^3/2^n+1','0',{op:'standard'},false);
step('(-1)^n','0',{op:'standard'},false);
step('(1+1/n)^n','e',{op:'standard'});
step('2*(1+1/n)^n+1/n','2e',{op:'arithmetic'});
step('(n+1/n)/(2+3/n)','inf',{op:'arithmetic'});
step('1/((-1)^n/n)','inf',{op:'arithmetic'},false);
step('1/(1/n+1/n^2)','inf',{op:'reciprocal'});
step('1/(1/n+1/n^2)','inf',{op:'arithmetic'},false);
step('1/(-1/n)','-inf',{op:'reciprocal'});
step('1/((-1)^n/n)','inf',{op:'reciprocal'},false);
step('3-2*sin(n)/n','3',{op:'squeeze',lower:'3-2/n',upper:'3+2/n'});
step('(3+sin(n))/n^2','0',{op:'squeeze',lower:'2/n^2',upper:'4/n^2'});
step('(3+sin(n))/n^2','0',{op:'squeeze',lower:'-4/n^2',upper:'4/n^2'});
step('(3+sin(n))/n^2','0',{op:'squeeze',lower:'3/n^2',upper:'4/n^2'},false);
step('(2^n+3^n)/3^n','(2/3)^n+1',{op:'divide',value:'3^n'});
step('(n+2^n)/2^n','n/2^n+1',{op:'divide',value:'2^n'});
step('1/sqrt(n)','0',{op:'standard'});
for(const [boundSide,answer] of [['lower','2-2/n'],['upper','2+2/n']]){
 assert.equal(M.checkAnswer('expr','2-1/n',answer,['n'],{boundSequence:'2+sin(n)/n',boundSide}).ok,true);
}
assert.equal(M.checkAnswer('expr','2-1/n','2',['n'],{boundSequence:'2+sin(n)/n',boundSide:'lower'}).ok,false);
assert.equal(M.checkAnswer('expr','2+1/n','4',['n'],{boundSequence:'2+sin(n)/n',boundSide:'upper'}).ok,false,'Bounds need the same limit');
// Follow the authored root and exponential routes through the stricter checker.
step('sqrt(n^2+1)-n','1/(sqrt(n^2+1)+n)',{op:'conjugate'});
step('1/(sqrt(n^2+1)+n)','(1/n)/(sqrt(1+1/n^2)+1)',{op:'divide',value:'n'});
step('(1/n)/(sqrt(1+1/n^2)+1)','0/(sqrt(1+0)+1)',{op:'arithmetic'});
step('0/(sqrt(1+0)+1)','0',{op:'compute'});
step('(5^n+2^n)/(3*5^n-1)','(1+(2/5)^n)/(3-1/5^n)',{op:'divide',value:'5^n'});
step('(1+(2/5)^n)/(3-1/5^n)','1/3',{op:'arithmetic'});
const proof=[{id:'a',source:'start',text:normal,action:{op:'divide',value:'n^2'}},{id:'b',source:'a',text:'3',action:{op:'arithmetic'}}];
assert.equal(M.checkSequenceProof(ratio,proof,'n').done,true);
assert.equal(M.checkSequenceProof(ratio,[proof[1]],'n').done,false,'Deleted reference must fail');
assert.equal(M.checkSequenceProof(ratio,[{...proof[1],source:'start'}],'n').done,false,'No final-answer bypass');
assert.equal(M.checkSequenceProof('1+2/n',[{id:'a',source:'start',text:'1+0',action:{op:'arithmetic'}}],'n').done,false,'Finish only after numeric simplification');
const indexCfg={mode:'rel',vars:['n'],solve:'n',positive:['n'],requireJustification:true,explicitCases:true};
assert.equal(M.checkJustifiedStep('1/n<0.02','1<0.02n',[{op:'mul',value:'n'}],indexCfg).ok,true);
assert.equal(M.checkJustifiedStep('abs(-4/n)<0.05','4/n<0.05',[{op:'simplify'}],indexCfg).ok,true);
assert.equal(M.checkJustifiedStep('1/n<0.02','1<0.02n',[{op:'mul',value:'n'}],{...indexCfg,positive:[]}).ok,false,'No assumption may leak to other exercises');

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:ratio,limit:'n'});
 node(d,'div',{class:'step',line:'(3+[1/n^2])/(1+[4/n])'});node(d,'div',{class:'step',line:'[3]'});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();assert.equal(d.querySelector('.as-given').textContent.includes('לחישוב'),true);
 function row(i){return d.querySelectorAll('.seq-step')[i];}
 function choose(r,group,action){const cat=r.querySelector('.seq-category');cat.value=group;cat.dispatchEvent({type:'change'});const a=r.querySelector('.seq-action');a.value=action;a.dispatchEvent({type:'change'});}
 function type(r,selector,value){const f=r.querySelector(selector);if(rich)f.focus();input(f,value);}
 let r=row(0);type(r,'.pw-input','3');button(r,'בדיקת הצעד והמשך').click();assert.match(r.textContent,/בחרו סוג צעד/);
 choose(r,'algebra','divide');const kind=r.querySelector('.seq-equality-kind');kind.value='target';kind.dispatchEvent({type:'change'});type(r,'.seq-value','n^2');type(r,'.pw-input','lim('+ratio+')=lim('+normal+')');button(r,'בדיקת הצעד והמשך').click();
 assert.equal(r.querySelector('.as-editor').hidden,true);assert.match(r.textContent,/הצעד נכון/);
 r=row(1);choose(r,'limits','arithmetic');button(r,'הצגת התוצאה הצפויה').click();button(r.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 button(d,'סיום פתרון').click();assert.match(d.textContent,/✓ הפתרון נכון/);
 button(d,'פתרון לדוגמה').click();button(d,'כתיבת פתרון').click();assert.equal(row(0).querySelector('.as-editor').hidden,true,'Draft retained across tabs');
 button(row(0),'עריכה').click();button(row(0),'מחיקת הצעד').click();button(row(0),'בדיקת הצעד והמשך').click();
 assert.match(row(0).textContent,/שורת המקור חסרה|שורת המקור אינה זמינה/);assert.doesNotMatch(d.textContent,/✓ הפתרון נכון/);
}
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'(3-1/(n+1))-(3-1/n)',vars:'n',positive:'n',integer:'n'});
 node(d,'div',{class:'step',line:'[1]/(n*(n+1))'});
 const inequality=node(E.document,'div',{class:'derive',start:'1/n<0.02',vars:'n',solve:'n',positive:'n',integer:'n'});
 node(inequality,'div',{class:'step',line:'n>[50]'});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();
 const r=d.querySelector('.seq-step'),cat=r.querySelector('.seq-category');
 assert.equal(cat.querySelector('option[value="limits"]'),null,'Algebra-only exercises do not offer limit rules');
 cat.value='algebra';cat.dispatchEvent({type:'change'});
 const action=r.querySelector('.seq-action');action.value='simplify';action.dispatchEvent({type:'change'});
 const result=r.querySelector('.pw-input');if(rich)result.focus();input(result,'1/(n*(n+1))');
 button(r,'בדיקת הצעד והמשך').click();button(d,'סיום פתרון').click();assert.match(d.textContent,/✓ הפתרון נכון/);
 button(inequality,'כתיבת פתרון').click();const first=inequality.querySelector('.as-step');
 const operand=selectAction(first,'mul').querySelector('.as-justification-value');if(rich)operand.focus();input(operand,'n');
 const answer=first.querySelector('.pw-input');if(rich)answer.focus();input(answer,'1<0.02n');
 button(first,'בדיקת הצעד והמשך').click();
 assert.equal(first.querySelector('.as-editor').hidden,true,'The positive-index assumption reaches the actual inequality editor');
}
console.log('Sequence solver: justified operations, bounds, local substitutions, references, no answer bypass, hints and both input adapters passed.');
