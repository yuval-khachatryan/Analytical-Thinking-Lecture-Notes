const assert=require('node:assert/strict'),M=require('../assets/interactive.js');
const cfg={mode:'rel',vars:['n','ε'],solve:'n',positive:['n','ε'],requireJustification:true,explicitCases:true};
for(const [from,to,action] of [
 ['2/(n+1)<ε','2<(n+1)*ε',{op:'mul',value:'n+1'}],
 ['2<(n+1)*ε','2/ε<n+1',{op:'div',value:'ε'}],
 ['2/ε<n+1','2/ε-1<n',{op:'sub',value:'1'}],
 ['10^(-n)<ε','log_10(10^(-n))<log_10(ε)',{op:'log',value:'10'}],
 ['log_10(10^(-n))<log_10(ε)','-n<log_10(ε)',{op:'simplify'}],
 ['-n<log_10(ε)','n>-log_10(ε)',{op:'div',value:'-1'}]
])assert.equal(M.checkJustifiedStep(from,to,[action],cfg).ok,true,from);
for(const [from,to,action,c] of [
 ['2/(n+1)<ε','2>(n+1)*ε',{op:'mul',value:'n+1'},cfg],
 ['2/ε<n+1','2/ε+1<n',{op:'sub',value:'1'},cfg],
 ['10^(-n)<ε','-n<ε',{op:'log',value:'10'},cfg],
 ['log_10((-10)^n)<ε','n<ε',{op:'simplify'},cfg],
 ['log_1(1^n)<ε','n<ε',{op:'simplify'},cfg],
 ['10^(-n)<ε','log_10(10^(-n))<log_10(ε)',{op:'log',value:'10'},{...cfg,positive:['n']}],
 ['2/(n+1)<ε','2<(n+1)*ε',{op:'mul',value:'n+1'},{...cfg,positive:['ε']}]
])assert.equal(M.checkJustifiedStep(from,to,[action],c).ok,false,from+' -> '+to);
console.log('Parameter steps: positive shifted denominators, logarithm identities, domain conditions, inequality direction and wrong-action rejection passed.');
