const fs=require('node:fs'),assert=require('node:assert/strict');
const M=require('../assets/interactive.js'),I=require('../assets/math-input.js');
const source=tree=>M.relationSource({t:'rel',disj:[{parts:[tree],ops:[]}]});
const cfg={mode:'rel',vars:['n'],solve:'n',positive:['n'],requireJustification:true,explicitCases:true,
 sequenceDefinitions:{a:{index:'n',formula:'1+2/n'}}};
function check(src,next,actions,ok=true,c=cfg){
 const result=M.checkJustifiedStep(src,next,actions,c);
 assert.equal(result.ok,ok,JSON.stringify({src,next,actions,result}));return result;
}
for(const [plain,latex] of [
 ['a_n','a_{n}'],['a_{n+1}','a_{n + 1}'],['a_(2n)','a_{2 n}'],
 ['a_3','a_{3}'],['a_n^2','a_{n}^{2}'],['a_(n^2)','a_{n^{2}}'],
 ['a_m','a_{m}'],['a_(n_k)','a_{n_{k}}'],['a_(n_(k+1))','a_{n_{k + 1}}']
]){
 const tree=M.parseExpr(plain);assert.equal(M.tex(tree),latex);
 assert.deepEqual(M.parseExpr(I.latexToPlain(latex)),tree);
 assert.deepEqual(M.parseExpr(source(tree)),tree);
}
// Notation and symbolic algebra do not require a numerical sequence formula.
for(const term of ['a_m','a_(n_k)','a_(n_(k+1))']){
 assert.equal(M.checkAnswer('expr',term,I.latexToPlain(M.tex(M.parseExpr(term))),['m','k'],{}).ok,true);
 assert.equal(M.checkAnswer('expr',term+'+'+term,'2*'+term,['m','k'],{}).ok,true);
 check(term+'-1<2',term+'<3',[{op:'add',value:'1'}],true,{...cfg,vars:['m','k'],solve:'k',positive:['m','k'],sequenceDefinitions:{}});
 check(term+'-1<2',term+'<4',[{op:'add',value:'1'}],false,{...cfg,vars:['m','k'],solve:'k',positive:['m','k'],sequenceDefinitions:{}});
}
for(const [a,b] of [['a_m','a_n'],['a_(n_k)','a_(n_(k+1))'],['a_(n_k)','a_n*k'],['a_(n_k)','b_(n_k)']])
 assert.equal(M.checkAnswer('expr',a,b,['m','n','k'],{}).ok,false,'Distinct sequence terms are not interchangeable');
const nested={...cfg,vars:['k'],solve:'k',positive:['k'],indexSequences:['n']};
check('a_(n_k)>1','1+2/n_k>1',[{op:'sequence',value:'a_(n_k)'}],true,nested);
check('a_(n_k+1)>1','1+2/(n_k+1)>1',[{op:'sequence',value:'a_(n_k+1)'}],true,nested);
check('a_m>1','1+2/m>1',[{op:'sequence',value:'a_m'}],true,{...cfg,vars:['m'],solve:'m',positive:['m']});
for(const c of [{...nested,indexSequences:[]},{...nested,positive:[]}]){
 const result=check('a_(n_k)>1','1+2/n_k>1',[{op:'sequence',value:'a_(n_k)'}],false,c);
 assert.match(result.msg,/הסימון תקין/);
}
check('a_(n_k-1)>1','1+2/(n_k-1)>1',[{op:'sequence',value:'a_(n_k-1)'}],false,nested);
check('a_m>1','a_m/a_m>1/a_m',[{op:'div',value:'a_m'}],false,{...cfg,vars:['m'],solve:'m',positive:['m'],sequenceDefinitions:{}});
assert.equal(I.templates['_'],'#@_{#?}');
assert.equal(I.templates['_n'],'#@_{n}');
assert.deepEqual(I.plainTemplate('b',1,1,'_n'),{value:'b_n',caret:3});
assert.deepEqual(I.plainTemplate('b+2',0,1,'_n'),{value:'b_n+2',caret:3});
assert.deepEqual(I.plainTemplate('a',1,1,'_'),{value:'a_()',caret:3});
check('abs(a_n-1)<.01','abs(1+2/n-1)<.01',[{op:'sequence',value:'a_n'}]);
check('a_(n+1)>1','1+2/(n+1)>1',[{op:'sequence',value:'a_(n+1)'}]);
check('a_3>1','1+2/3>1',[{op:'sequence',value:'a_3'}]);
check('a_n+a_(n+1)>a_n','(1+2/n)+a_(n+1)>1+2/n',[{op:'sequence',value:'a_n'}]);
check('a_n+a_(n+1)>a_n','(1+2/n)+(1+2/(n+1))>1+2/n',[{op:'sequence',value:'a_n'}],false);
check('abs(a_n-1)<.01','abs(1+2/n-1)<.01',[{op:'simplify'}],false);
check('abs(a_n-1)<.01','abs(1+3/n-1)<.01',[{op:'sequence',value:'a_n'}],false);
check('abs(a_n-1)<.01','abs(1+2/n-1)<.01',[{op:'sequence',value:'a_(n+1)'}],false);
check('b_n>1','1+2/n>1',[{op:'sequence',value:'b_n'}],false);
for(const term of ['a_0','a_(-1)','a_(n/2)','a_(n-1)']){
 const result=check(term+'>1','1+2/n>1',[{op:'sequence',value:term}],false);
 assert.match(result.msg,/האינדקס/);
}
check('abs(a_n-1)<.01','-.01<a_n-1<.01',[{op:'abs'}]);
check('a_n-1<.01','a_n<1.01',[{op:'add',value:'1'}]);
check('a_n-1<.01','a_n<1.01',[{op:'simplify'}],false);
check('a_n>1','a_n>2',[{op:'simplify'}],false);
// The ordinary selected-expression tool must also use the given definition.
const replace=(before,after,path)=>({op:'replace',edits:[{before,after,...(path===undefined?{}:{path})}]});
check('abs(a_n-1)<.01','abs(1+2/n-1)<.01',[replace('a_n','1+2/n')]);
check('abs(a_n-1)<.01','abs(1+3/n-1)<.01',[replace('a_n','1+3/n')],false);
check('abs(a_n-1)<.01','abs(1+2/n)<.01',[replace('a_n','1+2/n')],false);
check('a_(n+1)>1','1+2/(n+1)>1',[replace('a_(n+1)','1+2/(n+1)')]);
check('a_(n+1)>1','1+2/n>1',[replace('a_(n+1)','1+2/n')],false);
check('a_n+a_(n+1)>1','1+2/n+a_(n+1)>1',[replace('a_n','1+2/n')]);
check('a_n+a_n>1','1+2/n+a_n>1',[replace('a_n','1+2/n')],false);
check('a_n+a_n>1','1+2/n+a_n>1',[replace('a_n','1+2/n','0.0.a')]);
check('a_n>1','1+2/n>1',[replace('a_n','1+2/n')],false,{...cfg,sequenceDefinitions:{}});

const start='abs(a_n-1)<.01',entries=[
 {source:1,text:'abs(1+2/n-1)<.01',actions:[{op:'sequence',value:'a_n'}]},
 {source:2,text:'-.01<1+2/n-1<.01',actions:[{op:'abs'}]},
 {source:3,text:'-.01<2/n<.01',actions:[{op:'simplify'}]},
 {source:4,text:'-n<200<n',actions:[{op:'mul',value:'100n'}]},
 {source:5,text:'-n<200 and 200<n',actions:[{op:'unchain'}]},
 {source:6,text:'n>200',actions:[{op:'conditions'}]}
];
const memo=new Map(),proof=M.checkLineProof(start,entries,cfg,memo);
assert.equal(proof.done,true,JSON.stringify(proof.results));
assert.equal(proof.results.every(r=>r.ok),true);
const changed={...cfg,sequenceDefinitions:{a:{index:'n',formula:'1+3/n'}}};
assert.equal(M.checkLineProof(start,entries,changed,memo).results[0].ok,false,'Definitions are part of the memo key');
assert.equal(M.checkLineProof(start,[{...entries[0],source:2}],cfg,memo).results[0].ok,false,'Reference validation still runs');
const below={...cfg,sequenceDefinitions:{a:{index:'n',formula:'3-4/n'}}};
for(const entered of ['abs(a_n-3)<.05','abs(3-4/n-3)<.05','abs(3-a_n)<.05'])
 assert.equal(M.checkSequenceSetup('distance','abs(a_n-3)<.05',entered,below).ok,true,entered);
for(const entered of ['abs(a_n-2)<.05','abs(a_(n+1)-3)<.05','a_n<.05','abs(a_n-3)<.01'])
 assert.equal(M.checkSequenceSetup('distance','abs(a_n-3)<.05',entered,below).ok,false,entered);

// Exercise controls through both adapters, including the student-entered start.
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button,selectAction};')(require);
const qmd=fs.readFileSync('02-Sequences.qmd','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function mount(id,rich){
 const src=qmd.slice(qmd.indexOf('{#'+id)),match=/:::: \{\.derive ([^\n]+)\}\n([\s\S]*?)\n::::\n/.exec(src);
 const E=env(),d=node(E.document,'div',{class:'derive',...attrs(match[1])});
 for(const step of match[2].matchAll(/::: \{\.step ([^\n]+)\}/g))node(d,'div',{class:'step',...attrs(step[1])});
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();return {E,d};
}
for(const rich of [false,true]){
 for(const typed of [false,true]){
  const u=mount('box-q-error-place',rich),row=u.d.querySelector('.as-step');
  selectAction(row,'replace');const tool=row.querySelector('.as-replacements');
  if(typed){
   const fragment=tool.querySelector('.as-fragment-input');fragment.focus();input(fragment,rich?'a_{n}':'a_n');
   button(tool,'בחירת החלק').click();
  }else{
   const choice=tool.querySelector('[data-part="0.0.a.a"]');assert.ok(choice);choice.checked=true;choice.dispatchEvent({type:'change'});
  }
  const replacement=tool.querySelector('.as-replacement-input');replacement.focus();
  input(replacement,rich?'1+\\frac{3}{n}':'1+3/n');button(tool,'בדיקת ההחלפה').click();
  assert.match(tool.textContent,/אינה שומרת/);
  input(replacement,rich?'1+\\frac{2}{n}':'1+2/n');button(tool,'בדיקת ההחלפה').click();
  assert.match(tool.textContent,/✓ ההחלפה נכונה/);
  const help=tool.querySelector('.as-suggestions');help.open=true;help.dispatchEvent({type:'toggle'});
  assert.ok(help.querySelector('button[aria-label^="לפי הגדרת הסדרה"]'),'The definition appears in replacement suggestions');
  button(row,'הצגת התוצאה הצפויה').click();button(row.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();
  assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
  assert.equal(source(M.parseExpr(u.E.context.CourseMathInput.read(replacement))),'1 + 2/n');
  const entered=M.relationSource(M.parseRelation(u.E.context.CourseMathInput.read(row.querySelector('.pw-input'))));
  assert.equal(entered,'|1 + 2/n - 1| < 1/100');
 }
 const {E,d}=mount('box-q-error-place',rich),row=d.querySelector('.as-step');
 assert.match(d.querySelector('.as-given').textContent,/נתון/);
 const action=selectAction(row,'sequence');
 const operand=action.querySelector('.as-justification-value');operand.focus();
 const indexKey=action.querySelector('[aria-label="הוספת אינדקס n"]');assert.ok(indexKey);
 operand.value='b';
 if(rich){let inserted;operand.control.insert=latex=>{inserted=latex;};indexKey.click();assert.equal(inserted,'#@_{n}');}
 else {operand.setSelectionRange(1,1);indexKey.click();assert.equal(operand.value,'b_n');}
 operand.value='';operand.setSelectionRange(0,0);
 if(rich){let inserted;operand.control.insert=(latex)=>{inserted=latex;operand.value=latex;};
  button(action,'aₙ').click();assert.equal(inserted,'a_{n}');
 }else{button(action,'aₙ').click();assert.equal(operand.value,'a_(n)');}
 const term=action.querySelector('.as-sequence-choice');assert.ok(term,'A present indexed term can be selected');term.click();
 assert.equal(source(M.parseExpr(E.context.CourseMathInput.read(action.querySelector('.as-justification-value')))),'a_(n)');
 button(row,'הצגת התוצאה הצפויה').click();
 button(row.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 assert.match(row.textContent,/הצבה/);
 const next=d.querySelectorAll('.as-step').at(-1),typed=selectAction(next,'sequence');
 input(typed.querySelector('.as-justification-value'),rich?'a_{n}':'a_n');
 button(next,'הצגת התוצאה הצפויה').click();
 assert.match(next.querySelector('.as-action-preview').textContent,/אינו מופיע/,'Stale selections cannot substitute an absent term');
 const u=mount('box-q-error-below',rich);
 u.d.querySelector('.seq-start-input').focus();
 input(u.d.querySelector('.seq-start-input'),rich?'\\left|a_{n}-3\\right|<0.05':'abs(a_n-3)<.05');
 button(u.d,'בדיקת נקודת המוצא').click();
 assert.equal(u.d.querySelector('.as-proof-work').hidden,false,u.d.textContent);
 const first=u.d.querySelector('.as-step');assert.ok(first);
 button(first,'הצגת צעד אפשרי').click();button(first.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 assert.equal(first.querySelector('.as-editor').hidden,true,first.textContent);
 assert.equal(first.querySelector('.as-justification-rule').value,'sequence');
 for(let i=0;i<4;i++){
  const row=u.d.querySelectorAll('.as-step').at(-1);
  button(row,'הצגת צעד אפשרי').click();button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
  assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 }
 button(u.d,'סיום פתרון').click();assert.match(u.d.textContent,/הפתרון נכון/);
 const expanded=mount('box-q-error-below',rich);
 expanded.d.querySelector('.seq-start-input').focus();
 input(expanded.d.querySelector('.seq-start-input'),rich?'\\left|3-\\frac{4}{n}-3\\right|<0.05':'abs(3-4/n-3)<.05');
 button(expanded.d,'בדיקת נקודת המוצא').click();
 assert.equal(expanded.d.querySelector('.as-proof-work').hidden,false,expanded.d.textContent);
 const expandedRow=expanded.d.querySelector('.as-step');
 button(expandedRow,'הצגת צעד אפשרי').click();button(expandedRow.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 assert.equal(expandedRow.querySelector('.as-editor').hidden,true,expandedRow.textContent);
 assert.notEqual(expandedRow.querySelector('.as-justification-rule').value,'sequence','Already expanded starts do not substitute a missing term');
}
console.log('Indexed sequences: parsing, explicit substitution, protected unselected indices, checked definitions, numbered proof, distance setup and both input adapters passed.');
