const assert=require('node:assert/strict');
const M=require('../assets/interactive.js');
const sameSet=(a,b)=>M.setEq(M.parseSet(a),M.parseSet(b));
const cfg={mode:'rel',vars:['x'],solve:'x',positive:[],verify:false,requireJustification:true};
const check=(source,next,actions,c=cfg)=>M.checkJustifiedStep(source,next,actions,c);
for(const [assumption,replacement,next] of [['2x-3>0','2x-3','2x-3=5'],['2x-3>=0','2x-3','2x-3=5'],['2x-3<=0','3-2x','3-2x=5'],['2x-3<0','3-2x','3-2x=5'],['2x-3=0','0','∅']]){
 const action={op:'replace',edits:[{path:'0.0',after:replacement}]},context={...cfg,assumption};
 assert.equal(check('|2x-3|=5',next,[action],context).ok,true,assumption);
}
assert.equal(check('|2x-3|=5','2x-3=5',[{op:'replace',edits:[{path:'0.0',after:'2x-3'}]}]).ok,false,'absolute values need a known sign');
assert.equal(check('|2x-3|=5','3-2x=5',[{op:'replace',edits:[{path:'0.0',after:'3-2x'}]}],{...cfg,assumption:'2x-3>0'}).ok,false,'wrong sign cannot be justified by the branch');
assert.throws(()=>M.replaceRelationParts('|1/x|=5',[{path:'0.0',after:'x/x^2'}],{...cfg,assumption:'x<0'}));
assert.equal(M.replaceRelationParts('|1/x|=5',[{path:'0.0',after:'1/x'}],{...cfg,assumption:'x>0'}),'1/x = 5');
assert.throws(()=>M.replaceRelationParts('|x|/x=1',[{path:'0.0',after:'1'}],{...cfg,assumption:'x=0'}),'an undefined expression cannot be replaced by a constant');
for(const [source,next,actions] of [
 ['3-2x<7','-2x<4',[{op:'sub',value:'3'}]],
 ['3-2x<7','x>-2',[{op:'sub',value:'3'},{op:'div',value:'-2'}]],
 ['2x+1=7','x=3',[{op:'sub',value:'1'},{op:'div',value:'2'}]],
 ['2(x+1)<8','2x+2<8',[{op:'simplify'}]],
 ['|2x-3|=5','2x-3=-5 or 2x-3=5',[{op:'abs'}]],
 ['|x-4|<3','x>1 and x<7',[{op:'abs'},{op:'add',value:'4'}]],
 ['x<2 and x<3','x<2',[{op:'conditions'}]],
 ['x<0 and x>=0','∅',[{op:'conditions'}]],
 ['x<0 or x>=0','R',[{op:'conditions'}]],
 ['x^2=4','x=-2 or x=2',[{op:'sqrt'}]],
 ['2x^2+x-1=0','x=1/2 or x=-1',[{op:'formula'}]],
 ['(x-2)(x+3)=0','x-2=0 or x+3=0',[{op:'zero'}]],
 ['2^(2x)=8','2x=3',[{op:'log',value:'2'}]],
 ['log_3(x)=2','x=9',[{op:'exp',value:'3'}]],
 ['x^3=8','x=2',[{op:'cbrt'}]],
 ['1/x<2','x>0 and 1<2x or x<0 and 1>2x',[{op:'mul',value:'x'}]],
 ['x>0 and 1<2x or x<0 and 1>2x','x<0 or x>1/2',[{op:'div',value:'2'},{op:'conditions'}]]
]) assert.equal(check(source,next,actions).ok,true,source+' -> '+next+' '+JSON.stringify(check(source,next,actions)));
for(const [source,next,actions] of [
 ['3-2x<7','x>-2',[]],
 ['3-2x<7','x>-2',[{op:'sub',value:'3'}]],
 ['3-2x<7','-2x<4',[{op:'add',value:'3'}]],
 ['3-2x<7','-2x<4',[{op:'simplify'}]],
 ['-2x<4','x<-2',[{op:'div',value:'-2'}]],
 ['2x+1=7','x=3',[{op:'div',value:'2'},{op:'sub',value:'1'}]],
 ['x<2','x<1',[{op:'conditions'}]],
 ['2x-2>0','x>1',[{op:'conditionReplace',edits:[{path:'and.0.0.1',after:'x>1'}]}]],
 ['x^2=4','x=2',[{op:'sqrt'}]],
 ['x^3-x=0','x=0 or x=1 or x=-1',[{op:'formula'}]],
 ['x/x=1','R',[{op:'simplify'}]],
 ['1/x<2','1<2x',[{op:'mul',value:'x'}]],
 ['x<1','0<0',[{op:'mul',value:'0'}]],
 ['x^2=4','x=2',[{op:'log',value:'2'}]],
 ['x=2','x=3',[{op:'other',expected:'x=3'}]]
]) assert.equal(check(source,next,actions).ok,false,source+' -> '+next);
const mismatch=check('3-2x<7','x>-2',[{op:'sub',value:'3'}]);
assert.equal(mismatch.expected,'-2x < 4');assert.equal(mismatch.got,'x > -2');assert.match(mismatch.msg,/צפוי/);assert.match(mismatch.msg,/התקבל/);
assert.equal(M.checkWorking('2x=4',['x=2'],cfg,'x=2').done,false);
assert.equal(M.checkWorking('2x=4',['x=2'],cfg,'x=2',[[{op:'div',value:'2'}]]).done,true);
const cases=M.splitRelationCases('x>0 and 1<2x or x<0 and 1>2x',{},cfg);
assert.equal(cases.length,2);
const threeCases='2x=2 or 2x=4 or 2x=6';
assert.deepEqual(M.splitRelationCases(threeCases,{at:2},cfg).map(c=>c.source),['2x = 2 או 2x = 4','2x = 6']);
assert.deepEqual(M.splitRelationCases(threeCases,{at:1},cfg).map(c=>c.source),['2x = 2','2x = 4 או 2x = 6']);
for(const at of [0,3,-1,1.5,'1'])assert.throws(()=>M.splitRelationCases(threeCases,{at},cfg));
const selectedMerge={op:'merge',split:{at:2},branches:[
 {lines:['x=1 or x=2'],justifications:[[{op:'div',value:'2'}]]},
 {lines:['x=3'],justifications:[[{op:'div',value:'2'}]]}
]};
assert.equal(check(threeCases,'x=1 or x=2 or x=3',[selectedMerge]).ok,true);
const dropped=structuredClone(selectedMerge);dropped.branches[0].lines=['x=1'];
assert.equal(check(threeCases,'x=1 or x=3',[dropped]).ok,false,'splitting a selected OR cannot drop another alternative');
const nestedSelected={op:'merge',split:{at:1},branches:[
 {lines:['x=1'],justifications:[[{op:'div',value:'2'}]]},
 {lines:['x=2'],justifications:[[{op:'div',value:'2'}]]}
]};
const nestedOuter=structuredClone(selectedMerge);nestedOuter.branches[0]={lines:['x=1 or x=2'],justifications:[[nestedSelected]]};
assert.equal(check(threeCases,'x=1 or x=2 or x=3',[nestedOuter]).ok,true,'remaining OR groups can be split inside a branch');
const branches=[
 {lines:['x>1/2'],justifications:[[{op:'div',value:'2'},{op:'conditions'}]]},
 {lines:['x<0 and 1/2>x','x<0'],justifications:[[{op:'div',value:'2'}],[{op:'conditions'}]]}
];
const merge={op:'merge',split:{},branches};
assert.equal(check(cases.map(c=>'('+c.source+')').join(' or '),'x<0 or x>1/2',[merge]).ok,true);
assert.equal(check(cases.map(c=>'('+c.source+')').join(' or '),'x>1/2',[merge]).ok,false,'cannot omit a case');
assert.equal(check(cases.map(c=>'('+c.source+')').join(' or '),'x<0 or x>1/2',[{...merge,branches:branches.slice(0,1)}]).ok,false);
const tampered=structuredClone(merge);tampered.branches[0].justifications[0][0].value='3';
assert.equal(check(cases.map(c=>'('+c.source+')').join(' or '),'x<0 or x>1/2',[tampered]).ok,false,'replay every branch justification');
const overlapping='x<2 or x<3';
assert.equal(check(overlapping,'x<3',[{op:'merge',split:{},branches:[{lines:['x<1'],justifications:[[{op:'conditions'}]]},{lines:[],justifications:[]}]}]).ok,false,'another case must not hide a bad branch');
assert.equal(M.splitRelationCases('1/x<2',{value:'x'},cfg).length,2,'zero excluded by original domain');
assert.equal(M.splitRelationCases('x<2',{value:'x'},cfg).length,3,'zero kept when possible');
assert.throws(()=>M.splitRelationCases('x<2',{value:'1/x'},cfg));
assert.throws(()=>M.splitRelationCases('x<2',{value:'y'},cfg));
assert.throws(()=>M.splitRelationCases('x<2',{},cfg));
const signCases=M.splitRelationCases('x<2',{value:'x'},cfg);
const signMerge={op:'merge',split:{value:'x'},branches:signCases.map(()=>({lines:[],justifications:[]}))};
const unworkedMerge=M.executeAction('x<2',signMerge,cfg);
assert.match(unworkedMerge,/וגם/,'merging does not perform intersections');
assert.equal(M.executeAction(unworkedMerge,{op:'conditions'},cfg),'x < 2');
// Case assumptions stay attached even when students write only the working
// comparison. They must constrain checking, suggestions and the eventual union.
for(const [assumption,product,answer] of [['x>0','1<2x','x>1/2'],['x<0','1>2x','x<1/2']]) {
 const c={...cfg,assumption};
 assert.equal(check('1/x<2',product,[{op:'mul',value:'x'}],c).ok,true);
 assert.equal(check('1/x<2',product,[{op:'div',value:'x'}],c).ok,false,'justification still must match');
 const wrong=check('1/x<2',product.includes('<')?'1>2x':'1<2x',[{op:'mul',value:'x'}],c);
 assert.equal(wrong.ok,false);assert.match(wrong.msg,/צפוי/);assert.match(wrong.msg,/התקבל/);
 assert.equal(check('1/x<2',assumption+' and '+product,[{op:'mul',value:'x'}],c).ok,true,'explicit repetition is also accepted');
 assert.equal(M.checkWorking('1/x<2',[product,answer],c,answer,[[{op:'mul',value:'x'}],[{op:'div',value:'2'}]]).done,true);
 const next=M.executeAction('1/x<2',{op:'mul',value:'x'},c),suggested=M.relationCandidates(next,c)[0].source;
 assert.equal(check('1/x<2',suggested,[{op:'mul',value:'x'}],c).ok,true,'suggestions use the same branch assumption');
 assert.ok(!suggested.includes('וגם'),'working line need not repeat the assumption');
 assert.equal(check('x/x=1','R',[{op:'simplify'}],c).ok,true,'cancellation is valid within a nonzero case');
}
const implicitMerge={op:'merge',split:{value:'x'},branches:[
 {lines:['1<2x','x>1/2'],justifications:[[{op:'mul',value:'x'}],[{op:'div',value:'2'}]]},
 {lines:['1>2x','x<1/2'],justifications:[[{op:'mul',value:'x'}],[{op:'div',value:'2'}]]}
]};
const unsimplified='(x>0 and x>1/2) or (x<0 and x<1/2)';
assert.equal(check('1/x<2',unsimplified,[implicitMerge]).ok,true,'both intersections remain visible after merging');
assert.equal(check('1/x<2','x<0 or x>1/2',[implicitMerge]).ok,false,'merging alone does not justify simplifying the intersections');
assert.equal(check(unsimplified,'x<0 or x>1/2',[{op:'conditions'}]).ok,true);
assert.equal(M.checkWorking('1/x<2',[unsimplified],cfg,unsimplified,[[implicitMerge]]).done,false,'the merged line still needs simplification');
assert.equal(M.checkWorking('1/x<2',[unsimplified,'x<0 or x>1/2'],cfg,'x<0 or x>1/2',[[implicitMerge],[{op:'conditions'}]]).done,true);
assert.equal(check('1/x<2','x<1/2 or x>1/2',[implicitMerge]).ok,false,'cannot broaden a branch on merging');
const badImplicit=structuredClone(implicitMerge);badImplicit.branches[1].lines[0]='1<2x';
assert.equal(check('1/x<2','x<0 or x>1/2',[badImplicit]).ok,false,'other branches cannot mask the wrong inequality direction');
assert.equal(check('x<2','x/x<2/x',[{op:'div',value:'x'}],{...cfg,assumption:'x=0'}).ok,false,'zero branch cannot divide by zero');
assert.equal(check('x<2','0<2x',[{op:'mul',value:'x'}],{...cfg,assumption:'x=0'}).ok,false);
assert.equal(check('1/x<2','1<2x',[{op:'mul',value:'x'}],{...cfg,assumption:'x!=0'}).ok,false,'nonzero alone does not give the sign');
const absoluteMerge={op:'merge',split:{},branches:[
 {lines:['x=4'],justifications:[[{op:'add',value:'3'},{op:'div',value:'2'}]]},
 {lines:['x=-1'],justifications:[[{op:'add',value:'3'},{op:'div',value:'2'}]]}
]};
assert.equal(check('|2x-3|=5','x=4 or x=-1',[{op:'abs'},absoluteMerge]).ok,true,'absolute-value alternatives still work independently');
const replacements=[{op:'replace',edits:[{path:'0.0',after:'2x+2'}]}];
assert.equal(check('2(x+1)<8','2x+2<8',replacements).ok,true);
assert.equal(check('2(x+1)<8','2x+2<9',replacements).ok,false);
assert.equal(check('2(x+2)<8','2x+2<8',replacements).ok,false,'replacements rechecked against edited source');
const inner={op:'merge',split:{value:'x'},branches:[
 {lines:['∅'],justifications:[[{op:'add',value:'3'},{op:'div',value:'2'},{op:'conditions'}]]},
 {lines:['x=-1'],justifications:[[{op:'add',value:'3'},{op:'div',value:'2'},{op:'conditions'}]]}
]};
const outer={op:'merge',split:{},branches:[
 {lines:['x=4'],justifications:[[{op:'add',value:'3'},{op:'div',value:'2'}]]},
 {lines:['x=-1'],justifications:[[inner]]}
]};
assert.equal(check('2x-3=5 or 2x-3=-5','x=4 or x=-1',[outer]).ok,true,'nested cases revalidate through both merges');
inner.branches[1].justifications[0][0].value='4';
assert.equal(check('2x-3=5 or 2x-3=-5','x=4 or x=-1',[outer]).ok,false,'nested edit invalidates outer merge');
// Typed conditions retain their order and cover endpoints exactly, without a grid.
const custom={conditions:['2x-3>=0','2x-3<0']};
assert.deepEqual(M.splitRelationCases('|2x-3|=5',custom,cfg).map(c=>c.condition),['2x - 3 ≥ 0','2x - 3 < 0']);
for(const [src,conditions,context] of [
 ['x^2=0',['x>0','x<0']],
 ['x=1/1000000',['x<1/1000000','x>1/1000000']],
 ['x<2',['x<0','x>=1/1000000']],
 ['x<2',['x>=0','x>=0']],
 ['x<2',['x<0','']],
 ['x<2',['x']],
 ['x<2',['x<0 or x>1','x>=0']],
 ['x<2',['y>=0','y<0']],
 ['x<2',['x^2>1','x^2<1']]
])assert.throws(()=>M.splitRelationCases(src,{conditions},context||cfg),src+' '+conditions);
for(const [src,conditions,context] of [
 ['x<2',['x>=0','x<=0']], // overlap at zero is valid
 ['x<2',['x<0','0<=x and x<2']],
 ['1/x<2',['x>0','x<0']], // excluded by domain
 ['x^2<4',['x>=0 and x<1','x>=1'],{...cfg,assumption:'x>=0'}],
 ['x<2',['x<0','x=0','x>0']],
 ['|x^2-1|=3',['x^2-1>=0','x^2-1<0']]
])assert.equal(M.splitRelationCases(src,{conditions},context||cfg).length,conditions.length);
const customMerge={op:'merge',split:custom,branches:[
 {lines:['2x-3=5','x=4'],justifications:[[{op:'replace',edits:[{path:'0.0',after:'2x-3'}]}],[{op:'add',value:'3'},{op:'div',value:'2'}]]},
 {lines:['3-2x=5','x=-1'],justifications:[[{op:'replace',edits:[{path:'0.0',after:'3-2x'}]}],[{op:'sub',value:'3'},{op:'div',value:'-2'}]]}
]};
const customResult=M.executeAction('|2x-3|=5',customMerge,cfg);
assert.match(customResult,/וגם/,'merging retains the case conditions for a separate intersection step');
assert.equal(sameSet('{-1,4}',M.executeAction(customResult,{op:'conditions'},cfg)),true);
assert.equal(check('|2x-3|=5',customResult,[customMerge]).ok,true);
const incompleteCustom=structuredClone(customMerge);incompleteCustom.split.conditions=['x>5','x<-5'];
assert.throws(()=>M.executeAction('|2x-3|=5',incompleteCustom,cfg),'merge rechecks typed coverage');
const weak={...cfg,assumption:'x>=0'};
assert.equal(check('x^2=0','x=0',[{op:'div',value:'x'}],weak).ok,false,'weak positivity does not justify division by zero');
assert.match(M.executeAction('x^2=0',{op:'div',value:'x'},weak),/או/,'retain the zero case');
assert.throws(()=>M.replaceRelationParts('x=1',[{path:'0.0',after:'x^2/x'}],weak),'weak bounds do not erase domain holes');
assert.equal(M.executeAction('x>=0 and x>0 and x^2=2',{op:'div',value:'x'},cfg).includes('או'),false,'strict and weak facts combine to strict positivity');
console.log('Justifications, expected/entered feedback, domain guards, typed cases and merging passed.');

// The student-facing workflow accounts for excluded cases explicitly and never
// changes a weak sign into a strict sign as part of multiplication/division.
const explicit={...cfg,explicitCases:true};
for(const conditions of [['x>0','x<0'],['x>=1','x<0']])assert.throws(()=>M.splitRelationCases('1/x<2',{conditions},explicit),{message:/חסר מקרה/});
const divisionPartition={op:'partition',split:{conditions:['x>0','x<0','x=0'],excluded:[null,null,{reason:'denominator',value:'x'}]}};
const partitioned=M.executeAction('1/x<2',divisionPartition,explicit);
assert.equal(check('1/x<2',partitioned,[divisionPartition],explicit).ok,true);
assert.equal(M.parseRelation(partitioned).disj.length,2);
assert.match(M.actionReason([divisionPartition]),/לא רלוונטי/);
for(const exclusion of [{reason:'denominator',value:'2'}, {reason:'denominator',value:''}, {reason:'contradiction',value:'x>0'}]){
 const action=structuredClone(divisionPartition);action.split.excluded[2]=exclusion;
 assert.throws(()=>M.executeAction('1/x<2',action,explicit),'exclusion must match the actual source');
}
const invalidExclusion=structuredClone(divisionPartition);invalidExclusion.split.excluded=[{reason:'denominator',value:'x'},null,null];
assert.throws(()=>M.executeAction('1/x<2',invalidExclusion,explicit),'nonzero x cannot be excluded as a zero denominator');
assert.throws(()=>M.executeAction('1/x<2 or x=0',divisionPartition,explicit),'an undefined alternative cannot hide a valid OR alternative');
for(const op of ['mul','div'])for(const assumption of ['x>=0','x<=0'])
 assert.throws(()=>M.executeAction('1/x<2',{op,value:'x'},{...explicit,assumption}),{message:/אינו אפס/});
assert.equal(check('2x=4 or 2x=-2','x=2 or x=-1',[{op:'div',value:'2'}],explicit).ok,true,'shared operations need no separate branches');
assert.equal(check(partitioned,'x>0 and 1<2x or x<0 and 1>2x',[{op:'mul',value:'x'}],explicit).ok,true,'each OR alternative uses its own known sign');
assert.equal(check('|2x-3|=5','2x-3=5',[{op:'replace',edits:[{path:'0.0',after:'2x-3'}]}],{...explicit,assumption:'2x-3>=0'}).ok,true,'removing bars permits equality');
const closing={op:'merge',split:{},branches:[{lines:['x=2'],justifications:[[{op:'div',value:'2'}]],closed:true},{lines:['x=-1'],justifications:[[{op:'div',value:'2'}]]}]};
assert.throws(()=>M.executeAction('2x=4 or 2x=-2',closing,explicit),{message:/עדיין פתוח/});
closing.branches[1].closed=true;assert.equal(check('2x=4 or 2x=-2','x=2 or x=-1',[closing],explicit).ok,true);
closing.branches[1].justifications[0][0].value='3';assert.throws(()=>M.executeAction('2x=4 or 2x=-2',closing,explicit),'a closed branch still revalidates');
console.log('Explicit exclusions, shared OR operations, weak-sign rejection and branch closure passed.');
// Selecting an absolute-value occurrence must determine exactly what changes.
{
 const source='|x-3|+|x^2-6x+2|>14',parts=M.absoluteParts(source);
 assert.equal(parts.length,2);
 assert.throws(()=>M.executeAction(source,{op:'abs'},explicit),{message:/בחרו איזה/});
 const outputs=parts.map(part=>{
  const action={op:'abs',path:part.path,expression:part.source},next=M.executeAction(source,action,explicit);
  assert.equal(check(source,next,[action],explicit).ok,true);
  assert.equal(M.parseRelation(next).disj.length,2);
  assert.match(next,/≥ 0/);assert.match(next,/< 0/);
  const remaining=M.absoluteParts(next);
  assert.equal(remaining.length,2);
  assert.ok(remaining.every(p=>p.source===parts.find(p=>p!==part).source));
  assert.ok(M.actionReason([action],{source}).includes(part.source));
  return {action,next};
 });
 assert.equal(check(source,outputs[1].next,[outputs[0].action],explicit).ok,false,'equivalent solutions do not justify splitting a different absolute value');
 assert.throws(()=>M.executeAction('|x-4|+|x^2-6x+2|>14',outputs[0].action,explicit),{message:/נבחר השתנה/});
 assert.throws(()=>M.executeAction(source,{op:'abs',path:'0.1'},explicit));
 for(const source of ['abs(abs(x)-3)+abs(x+2)>1','|x|+|x|>1','|1/x|+|x-1|>2 or x=0']){
  for(const part of M.absoluteParts(source)){
   const action={op:'abs',path:part.path,expression:part.source},next=M.executeAction(source,action,explicit);
   assert.equal(check(source,next,[action],explicit).ok,true,source+' / '+part.path);
   if(source.includes('or'))assert.match(next,/או x = 0$/,'unselected OR alternative stays intact');
  }
 }
 const part=parts[0],action={op:'abs',path:part.path,expression:part.source};
 for(const assumption of ['x-3>=0','x-3<0']){
  const scoped={...explicit,assumption},next=M.executeAction(source,action,scoped);
  assert.equal(M.parseRelation(next).disj.length,1,'known sign needs no redundant split');
  assert.equal(check(source,next,[action],scoped).ok,true);
 }
}
console.log('Selected absolute values: polynomial, nested, repeated, scoped and domain cases passed.');
