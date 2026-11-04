const assert=require('node:assert/strict');
const I=require('../widgets/shared/intervals.js');
const p=(a,b,ac=true,bc=true)=>({a,b,ac,bc});
assert.deepEqual(I.operation([p(0,1)],[p(1,2)],'intersection'),[p(1,1)]);
assert.deepEqual(I.operation([p(0,1,true,false)],[p(1,2)],'intersection'),[]);
assert.deepEqual(I.operation([p(0,1,true,false)],[p(1,2)],'union'),[p(0,2)]);
assert.equal(I.operation([p(0,1,true,false)],[p(1,2,false,true)],'union').length,2);
assert.deepEqual(I.operation([p(-Infinity,Infinity,false,false)],[p(0,0)],'difference'),[p(-Infinity,0,false,false),p(0,Infinity,false,false)]);
assert.deepEqual(I.operation([p(-2,2)],[p(-1,1,false,false)],'difference'),[p(-2,-1),p(1,2)]);
assert.equal(I.witness([p(0,1)],[p(0,1,true,false)]),1);
assert.equal(I.witness([p(0,2)],[p(0,1),p(1,2)]),null);
assert.equal(I.number('3/2'),1.5);assert.ok(Number.isNaN(I.number('1/0')));
// All boundary choices, including rays, singletons, overlaps and empty sets.
const pieces=[];
for(const a of [-Infinity,-2,0,1])for(const b of [-1,0,2,Infinity])if(a<=b)for(const ac of [false,true])for(const bc of [false,true])pieces.push(p(a,b,ac,bc));
for(const a of pieces)for(const b of pieces)for(const op of ['union','intersection','difference']) {
 const actual=I.operation([a],[b],op);
 for(const x of [-10,-2,-1.5,-1,-.5,0,.5,1,1.5,2,10]) {
  const A=I.contains([a],x),B=I.contains([b],x);
  assert.equal(I.contains(actual,x),op==='union'?A||B:op==='intersection'?A&&B:A&&!B);
 }
}
console.log('Interval operations and endpoint combinations passed.');
