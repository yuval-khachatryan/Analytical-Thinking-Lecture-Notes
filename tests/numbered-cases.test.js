const assert=require('node:assert/strict'),M=require('../assets/interactive.js');
const sameSet=(a,b)=>M.setEq(M.parseSet(a),M.parseSet(b));
const cfg={mode:'rel',vars:['x'],solve:'x',positive:[],verify:false,requireJustification:true,explicitCases:true};
const step=(source,text,...actions)=>({source,text,actions});
const open=(source,choice,at=1)=>({kind:'open',source,split:{at},choice});
const close=(opening,conclusion)=>({kind:'close',opening,conclusion});
const merge=(source,...closures)=>({kind:'merge',source,closures});
function good(start,entries,done){const r=M.checkLineProof(start,entries,cfg);assert.ok(r.results.every(v=>v.ok),JSON.stringify(r.results));if(done!==undefined)assert.equal(r.done,done);return r;}
function bad(start,entries,pattern){const r=M.checkLineProof(start,entries,cfg);assert.equal(r.done,false);assert.equal(r.results.at(-1).ok,false);if(pattern)assert.match(r.results.at(-1).msg,pattern);}
// The student chooses the negative case first and cites both endpoints on closure.
const abs=[step(1,'2x-3=5 or 2x-3=-5',{op:'abs'}),open(2,1),step(3,'x=-1',{op:'add',value:'3'},{op:'div',value:'2'}),close(3,4),open(2,0),step(6,'x=4',{op:'add',value:'3'},{op:'div',value:'2'}),close(6,7),merge(2,5,8)];
const solved=good('|2x-3|=5',abs,true);assert.equal(sameSet('{-1,4}',solved.records.at(-1).text),true);
for(let n=2;n<abs.length;n++)good('|2x-3|=5',abs.slice(0,n),false);
bad('|2x-3|=5',abs.slice(0,4).concat(merge(2,5)),/חסר מקרה/);
bad('|2x-3|=5',abs.slice(0,4).concat(step(4,'x=-1',{op:'simplify'})),/מקרה סגור/);
bad('|2x-3|=5',abs.slice(0,5).concat(step(4,'x=-1',{op:'simplify'})),/מקרה סגור|מקרה אחר/);
bad('|2x-3|=5',abs.slice(0,3).concat(close(3,2)),/בתוך המקרה/);
bad('|2x-3|=5',abs.slice(0,4).concat(open(2,1)),/כבר נפתח/);
bad('|2x-3|=5',abs.slice(0,7).concat(merge(2,5,5)),/חסר מקרה/);
const wrong=structuredClone(abs);wrong[2].actions[1].value='3';bad('|2x-3|=5',wrong,/צפוי|אינו מתאים/);
// References can reuse an earlier line; forward/self references are rejected.
good('3-2x<7',[step(1,'-2x<4',{op:'sub',value:'3'}),step(1,'x>-2',{op:'sub',value:'3'},{op:'div',value:'-2'})],true);
bad('3-2x<7',[step(2,'x>-2',{op:'simplify'})],/שורה קודמת/);
good('x>2',[step(1,'2<x',{op:'swap'}),{kind:'combine',sources:[1,2],text:'x>2 and 2<x'},step(3,'x>2',{op:'conditions'})],true);
// Zero is explicitly excluded; the merge does not perform the intersections.
const partition={op:'partition',split:{conditions:['x>0','x<0','x=0'],excluded:[null,null,{reason:'denominator',value:'x'}]}};
const reciprocal=[{source:1,actions:[partition]},open(2,0),step(3,'1<2x',{op:'mul',value:'x'}),step(4,'1/2<x',{op:'div',value:'2'}),close(3,5),open(2,1),step(7,'1>2x',{op:'mul',value:'x'}),step(8,'1/2>x',{op:'div',value:'2'}),close(7,9),merge(2,6,10)];
const merged=good('1/x<2',reciprocal,false);assert.match(merged.records.at(-1).text,/וגם/);
good('1/x<2',reciprocal.concat(step(11,'x<0 or x>1/2',{op:'conditions'})),true);
const weak=[{source:1,actions:[{op:'partition',split:{conditions:['x>=0','x<0']}}]},open(2,0),step(3,'x^2>x',{op:'mul',value:'x'})];
bad('x>1',weak,/אינו אפס/);
// Nested OR choices close inside-out and cannot disappear during an outer close.
const nested=[open(1,1),open(2,0),close(3,3),open(2,1),close(5,5),merge(2,4,6),close(2,7),open(1,0),close(9,9),merge(1,8,10)];
good('x=1 or x=2 or x=3',nested,true);
bad('x=1 or x=2 or x=3',[open(1,1),open(2,0),close(2,3)],/הפנימי/);
bad('x=1 or x=2 or x=3',nested.slice(0,3).concat(close(2,2)),/אחדו קודם/);
good('x=1 or x=2 or x=3',[open(1,0,2),close(2,2),open(1,1,2),close(4,4),merge(1,3,5)],true);
console.log('Numbered proof checks passed: manual cases, references, scopes, nested closure, explicit merging and edits.');
