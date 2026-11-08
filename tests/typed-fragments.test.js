const assert=require('node:assert/strict'),M=require('../assets/interactive.js');
function throws(fn,pattern,msg){assert.throws(fn,pattern instanceof RegExp?e=>pattern.test(e.message):pattern,msg);}
const cfg={mode:'rel',vars:['x'],solve:'x',positive:[],requireJustification:true,explicitCases:true};
const source='(x>0 and x>1/2) or (x<0 and x<1/2)';
const action=edit=>({op:'conditionReplace',edits:[edit]});
const edit={before:'(x > 0 וגם x > (1/2))',after:'x>1/2',reason:'conditions'};
assert.equal(M.executeAction(source,action(edit),cfg),'x > 1/2 או x < 0 וגם x < 1/2');
assert.equal(M.checkJustifiedStep(source,'x>1/2 or (x<0 and x<1/2)',[action(edit)],cfg).ok,true);
assert.equal(M.checkJustifiedStep(source,'x>1/2 or x<0',[action(edit)],cfg).ok,false,'unselected case is not silently simplified');
throws(()=>M.executeAction(source,action({...edit,before:'x>1/2 and x>1'}),cfg),/אינו נמצא/);
throws(()=>M.executeAction(source,action({...edit,path:'and.1.0.2'}),cfg),/אינו נמצא/);
throws(()=>M.executeAction(source,action({...edit,after:'x>0'}),cfg),/צפוי.*התקבל/);
const repeated='(x>0 and x>1) or (x>0 and x<-1)';
assert.equal(M.fragmentMatches(repeated,'x>0','rel').length,2);
throws(()=>M.executeAction(repeated,action({before:'x>0',after:'x>0'}),cfg),/יותר מפעם/);
assert.equal(M.executeAction(repeated,action({before:'x>0',path:'and.1.0.1',after:'x>0'}),cfg),M.relationSource(M.parseRelation(repeated)));
const calc='2*x-3+3=5+3 or 2*x-3+3=-5+3',matches=M.fragmentMatches(calc,'2x-3+3','expr');
assert.equal(matches.length,2);
throws(()=>M.executeAction(calc,{op:'replace',edits:[{before:'2x-3+3',after:'2x'}]},cfg),/יותר מפעם/);
assert.equal(M.executeAction(calc,{op:'replace',edits:[{before:'2x-3+3',path:matches[1].path,after:'2x'}]},cfg),'2x - 3 + 3 = 5 + 3 או 2x = -5 + 3');
throws(()=>M.replaceRelationParts(calc,[{before:'2x-3',path:matches[1].path,after:'2x'}],cfg),/אינו נמצא/);
assert.equal(M.executeAction('2x-3+3=8',{op:'replace',edits:[{before:'2x-3+3',after:'2x'}]},cfg),'2x = 8');

const split=M.executeAction('1/x<2',{op:'partition',split:{conditions:['x>0','x<0','x=0']}},cfg);
const zero={before:'x=0 and 1/x<2',after:'∅',reason:'denominator',value:'x'};
const result=M.executeAction(split,action(zero),cfg);
assert.equal(result,'x > 0 וגם 1/x < 2 או x < 0 וגם 1/x < 2');
assert.equal(M.checkJustifiedStep(split,result,[action(zero)],cfg).ok,true);
assert.match(M.actionReason([action(zero)],{source:split}),/המכנה x מתאפס/);
for(const invalid of [{value:'2'},{value:'x-1'},{value:''},{reason:'unverified'},{before:'x>0 and 1/x<2'},{before:'x<0 and 1/x<2'}])
 throws(()=>M.executeAction(split,action({...zero,...invalid}),cfg));
throws(()=>M.executeAction(split,action({...zero,after:'ℝ'}),cfg),/צפוי.*התקבל/);
throws(()=>M.executeAction(split,action({...zero,before:'x=0'}),cfg),/אינו מכנה/,'the selected fragment must contain the cited denominator');
throws(()=>M.executeAction('x>=0 and 1/x<2',action({...zero,before:'x>=0 and 1/x<2'}),cfg),/יתאפס בכל/);
throws(()=>M.executeAction('x=0 or 1/x<2',action({...zero,before:'x=0 or 1/x<2'}),cfg),/אינו מכנה/,'one OR sibling cannot justify excluding another');
assert.equal(M.executeAction('x=1 and 1/(x-1)<2',action({before:'x=1 and 1/(x-1)<2',after:'∅',reason:'denominator',value:'x-1'}),cfg),'∅');
throws(()=>M.executeAction('x=0 and 1/(1/x)<2',action({before:'x=0 and 1/(1/x)<2',after:'∅',reason:'denominator',value:'1/x'}),cfg),/יתאפס בכל/,'an undefined denominator is not a zero denominator');
assert.equal(M.executeAction('1/x<2',action({before:'1/x<2',after:'∅',reason:'denominator',value:'x'}),{...cfg,assumption:'x=0'}),'∅');
const proof=M.checkLineProof('1/x<2',[
 {source:1,actions:[{op:'partition',split:{conditions:['x>0','x<0','x=0']}}]},
 {source:2,actions:[action(zero)]}
],cfg);
assert.ok(proof.results.every(r=>r.ok),JSON.stringify(proof.results));assert.equal(proof.done,false);
console.log('Typed fragments: matching, occurrences, scope, justified exclusion and preservation of unselected work passed.');
