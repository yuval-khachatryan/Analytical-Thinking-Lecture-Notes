const fs=require('fs'),M=require('../assets/interactive.js');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));let count=0,bad=0;
for(const file of ['01-Introduction.qmd','02-Sequences.qmd']){
 const lines=fs.readFileSync(file,'utf8').split('\n');let box='';
 for(let i=0;i<lines.length;i++){
  const id=lines[i].match(/#(box-[\w-]+)/);if(id)box=id[1];
  const m=lines[i].match(/^(:{3,})\s*\{\.derive (.*)\}/);if(!m)continue;
  const a=attrs(m[2]),steps=[];
  for(let j=i+1;j<lines.length&&lines[j].trim()!==m[1];j++){const st=lines[j].match(/^::: \{\.step (.*)\}/);if(st)steps.push(attrs(st[1]));}
  const relation=M.parseRelation(a.start).disj.some(d=>d.ops.length),vars=a.vars?a.vars.split(','):['x'];
  const cfg={mode:'rel',vars,solve:a.solve||vars[0],positive:(a.positive||'').split(',').filter(Boolean),verify:false,requireJustification:true,explicitCases:true};
  if(a['sequence-name'])cfg.sequenceDefinitions={[a['sequence-name']]:{index:cfg.solve,formula:a['sequence-formula']}};
  if(a['bound-rule'])Object.assign(cfg,M.sequenceBoundConfig('n'));
  try{let r;if(relation)r=M.relationModel(a.start,steps,cfg);else if(a.limit||a.vars==='n')r=M.sequenceModel(a.start,steps,a.limit||'n',a.limit?null:M.prepLine(steps.at(-1).line).full);else continue;
  if(r.state.results.some(v=>!v.ok))throw Error('invalid');count++;}
  catch(e){bad++;console.log(file,box,i+1,e.message);}
 }
}
console.log({count,bad});if(bad)process.exitCode=1;
const assert=require('node:assert/strict');
for(const [formula,spec] of [['3-1/n',{difference:'1/(n*(n+1))',direction:'up',side:'upper',bound:'3-1/n<=3',gap:'1/n'}],['2+3/n',{difference:'-3/(n*(n+1))',direction:'down',side:'lower',bound:'2+3/n>=2',gap:'3/n'}],['n/(n+1)',{difference:'1/((n+1)*(n+2))',direction:'up',side:'upper',bound:'n/(n+1)<=1',gap:'1/(n+1)'}]]){
 assert.equal(M.investigationModel(formula,spec).conclusion.ok,true);
 assert.throws(()=>M.investigationModel(formula,{...spec,gap:'-1'}));
}
const cfg=M.sequenceBoundConfig('n');
assert.equal(M.checkJustifiedStep('sqrt(n)<=sqrt(n+1)+sqrt(n)','0<=1/(sqrt(n+1)+sqrt(n))<=1/sqrt(n)',[{op:'reciprocalBound'}],cfg).ok,true);
for(const src of ['0<=n','-n<=n','n<2n'])assert.equal(M.checkJustifiedStep(src,'0<=1/(2n)<=1/n',[{op:'reciprocalBound'}],cfg).ok,false);
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,button};')(require);
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'5x-4<=2x+8'});
 for(const [line,action,value] of [['3x-4<=8','sub','2x'],['3x<=12','add','4'],['x<=4','div','3']])node(d,'div',{class:'step',line,action,value},'author explanation');
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});button(d,'פתרון לדוגמה').click();
 const model=d.querySelector('.pw-solution');assert.equal(model.getAttribute('data-model-checked'),'true');assert.equal(model.querySelectorAll('.as-step-label').length,4);assert.equal(model.querySelectorAll('.as-given').length,1);assert.match(model.textContent,/חיסור/);assert.match(model.textContent,/חילוק/);assert.match(model.textContent,/לפי שורה 3/);assert.equal(model.querySelector('.as-clean-text').tagName,'DIV');assert.ok(model.querySelectorAll('.as-clean-formula').length===4);assert.match(model.querySelector('.as-clean-text').textContent,/author explanation/);assert.match(model.querySelector('.as-clean-formula').innerHTML,/math|\\\(/);
 assert.doesNotMatch(model.querySelector('.as-clean-text').textContent,/פעולות על האגפים|לפי שורה/,'clean copy omits menu navigation and line citations');
 button(d,'כתיבת פתרון').click();button(d,'פתרון לדוגמה').click();assert.equal(model.querySelectorAll('.as-step-label').length,4,'no duplicated model on reopen');
}
console.log('Model solutions: checked numbered cases, actual operations, investigations, rule references and optional clean text.');
// A proposed squeeze step carries a real inequality argument into the nested editor.
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'2+sin(n)/n',limit:'n'});
 const proof={rule:'sin',argument:'n',entries:[{source:1,text:'-1/n<=sin(n)/n<=1/n',actions:[{op:'div',value:'n'}]},{source:2,text:'2-1/n<=2+sin(n)/n<=2+1/n',actions:[{op:'add',value:'2'}]}]};
 node(d,'div',{class:'step',line:'2',action:'squeeze',lower:'2-1/n',upper:'2+1/n','bound-proof':JSON.stringify(proof)});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.seq-step');button(row,'הצגת צעד אפשרי').click();button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);button(d,'סיום פתרון').click();assert.match(d.textContent,/הפתרון נכון/);assert.equal(row.querySelector('.seq-action').value,'squeeze');
 button(d,'פתרון לדוגמה').click();assert.equal(d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true');assert.ok(d.querySelector('.seq-bound-transcript'));
}
