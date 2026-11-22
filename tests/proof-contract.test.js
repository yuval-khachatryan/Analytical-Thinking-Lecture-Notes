const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../assets/interactive.js');
const E={};vm.runInNewContext(fs.readFileSync('assets/proof-curriculum.js','utf8'),E);
const positions=E.CourseProofCurriculum.positions;
const at=id=>({position:positions[id],positions});
for(const [id,rule] of Object.entries(M.proofRules)){
  if(rule.introducedAt)assert.ok(Number.isInteger(positions[rule.introducedAt]),id);
  for(const dependency of rule.prerequisites)assert.ok(M.proofRules[dependency],dependency);
}
assert.equal(M.proofRuleAvailable('bounded',at('box-exm-squeeze')),false);
assert.equal(M.proofRuleAvailable('bounded',at('box-q-squeeze-independent')),true);
assert.equal(M.proofRuleAvailable('conjugate',at('box-exm-limit-arithmetic')),false);
assert.equal(M.proofRuleAvailable('conjugate',at('box-exm-conjugate-algebra')),true);
assert.equal(M.proofRuleAvailable('standard',{position:0,positions:{}}),false);
assert.equal(M.proofRuleAvailable('not-a-rule',null),false);

const step=(source,next,op='simplify')=>M.checkSequenceStep(source,next,{op},'n');
assert.equal(step('n+1','n+1+1/100000000').ok,false);
assert.equal(step('lim(3)','3+1/100000000000','standard').ok,false,'known numeric limits require exact equality');
assert.equal(step('n','n*(n-8)/(n-8)').ok,false,'new zero denominator is not an identity');
assert.equal(step('lim(3+1/n)','lim((3+1/n)*sqrt(-n)/sqrt(-n))').ok,false,'domain checks also cover expressions inside limits');
assert.equal(step('lim(1/n)','0/sqrt(-n)','standard').ok,false,'undefined expressions cannot disguise a known numeric limit');
assert.equal(M.checkSequenceEquality('lim(3+1/n)','1/n=(1/n)*(n-8)/(n-8)',{op:'simplify',before:'1/n'},'n','expressions').ok,false,'selected replacements retain domain checks');
assert.equal(step('n/(n+1)','1-1/(n+1)').ok,true);
assert.equal(step('sqrt(n+1)-sqrt(n)','1/(sqrt(n+1)+sqrt(n))','conjugate').ok,true);
assert.equal(step('sqrt(2+a_n)-a_n','(2+a_n-a_n^2)/(sqrt(2+a_n)+a_n)','conjugate').ok,false,'missing nonzero premise');
assert.equal(M.exactIdentity(M.parseExpr('a_n+a_n'),M.parseExpr('2*a_n')).ok,true);
assert.equal(M.exactIdentity(M.parseExpr('1000000000*n'),M.parseExpr('1000000000*n+1')).ok,false);

const spec={kind:'sequence',start:'lim(3+1/n)',index:'n',context:at('box-exm-limit-arithmetic')};
const entries=[
 {id:'split',source:'start',equality:'lim(3+1/n)=lim(3)+lim(1/n)',equalityKind:'target',action:{op:'limitOut'}},
 {id:'zero',source:'split',equality:'lim(1/n)=0',equalityKind:'target',action:{op:'standard',before:'lim(1/n)'}},
 {id:'constant',source:'zero',equality:'lim(3)=3',equalityKind:'target',action:{op:'standard',before:'lim(3)'}},
 {id:'answer',source:'constant',equality:'3+0=3',equalityKind:'target',action:{op:'compute'}}
];
const checked=M.checkProof(spec,entries);
assert.equal(checked.done,true);assert.equal(checked.document.version,1);
assert.equal(checked.document.complete,false,'readiness never implies explicit completion');
assert.deepEqual(checked.document.givens,[],'calculation target is not an assumption');
assert.equal(checked.document.goals[0].established,true);
assert.deepEqual(checked.document.steps[2].sources,['split']);
assert.equal(checked.document.steps[2].statement,'lim(1/n) = 0');
const stale=M.checkProof(spec,entries.filter(e=>e.id!=='zero'));
assert.equal(stale.done,false);assert.equal(stale.document.goals[0].established,false);
const unavailable=M.checkProof({...spec,start:'lim(sin(n)/n)'},[{id:'answer',source:'start',text:'0',action:{op:'bounded',factor:'sin(n)',bound:'1',boundProof:{rule:'sin',entries:[]}}}]);
assert.equal(unavailable.results[0].status,'unavailable');

const relation={kind:'relations',start:'3+2*x=7',cfg:{mode:'rel',vars:['x'],solve:'x',positive:[],requireJustification:true,explicitCases:true}};
assert.equal(M.checkProof(relation,[{id:'a',source:1,text:'x=2',actions:[{op:'sub',value:'3'},{op:'div',value:'2'}]}]).results[0].status,'step-too-large');
const relationResult=M.checkProof(relation,[{id:'subtract',source:1,text:'2*x=4',actions:[{op:'sub',value:'3'}]},{id:'divide',source:2,text:'x=2',actions:[{op:'div',value:'2'}]}]);
assert.equal(relationResult.done,true);
assert.deepEqual(relationResult.document.steps[2].sources,['subtract']);
assert.deepEqual(relationResult.document.givens,['3+2*x=7']);
const goalResult=M.checkProof({...relation,goal:'2*x=4'},[{id:'subtract',source:1,text:'2*x=4',actions:[{op:'sub',value:'3'}]}]);
assert.equal(goalResult.document.goals[0].kind,'prove');
assert.equal(goalResult.document.goals[0].established,true);

// Audit existing authored limit paths against their actual source positions.
const chapter=fs.readFileSync('02-Sequences.qmd','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
let count=0;
for(const match of chapter.matchAll(/:::: \{\.derive ([^\n]*limit="[^"]+"[^\n]*)\}\n([\s\S]*?)\n::::/g)){
  const data=attrs(match[1]),steps=[...match[2].matchAll(/::: \{\.step ([^\n]+)\}/g)].map(m=>attrs(m[1]));
  const model=M.sequenceModel(data.start,steps,data.limit);
  const context={positions,position:200000+chapter.slice(0,match.index).split('\n').length};
  const result=M.checkSequenceProof(data.start,model.entries,data.limit,null,context);
  assert.equal(result.results.every(r=>r.ok),true,`${data.start}: ${JSON.stringify(result.results.filter(r=>!r.ok))}`);count++;
}
console.log(`Proof contract: exact identities, domains, typed goals, stable references, atomic actions and ${count} authored limit paths with course availability passed.`);
