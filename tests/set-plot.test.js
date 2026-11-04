const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../assets/set-plot.js'),I=require('../widgets/shared/intervals.js'),E=require('../assets/interactive.js');
const equal=(actual,expected)=>assert.equal(I.witness(actual,E.parseSet(expected)),null,expected);
const m=P.model([-2,-1,0,1,2]);
equal(m.value,'{}');m.line(-1,1,true,true);equal(m.value,'[-1,1]');
m.point(0,false);equal(m.value,'[-1,0)U(0,1]');
m.line(-1,2,true,false);equal(m.value,'[-1,0)U(0,2)'); // A later overlapping line does not fill an explicit hole.
assert.equal(m.check(E.parseSet('[-1,2)')).missing,true);
assert.equal(m.check(E.parseSet('[-1,2)')).witness,0);
m.point(1/2,true);equal(m.value,'[-1,0)U(0,2)');
m.undo();assert.ok(!m.marks.includes(1/2));equal(m.value,'[-1,0)U(0,2)');
m.clear();equal(m.value,'{}');m.undo();equal(m.value,'[-1,0)U(0,2)');
m.reset();assert.equal(m.canUndo,false);equal(m.value,'{}');
m.point(0,true);equal(m.value,'{0}');
m.line(-Infinity,-2,false,false);equal(m.value,'(-inf,-2)U{0}');m.togglePoint(-2);equal(m.value,'(-inf,-2]U{0}');
m.line(2,Infinity,false,false);equal(m.value,'(-inf,-2]U{0}U(2,inf)');
m.reset();m.line(-Infinity,Infinity);equal(m.value,'R');m.point(0,false);equal(m.value,'R-{0}');m.point(0,true);equal(m.value,'R');
assert.throws(()=>m.point(Infinity,true));assert.throws(()=>P.model([]));
assert.throws(()=>m.line(2,-1));assert.throws(()=>m.line(1,1));equal(m.value,'R');
m.reset();m.line(-1/3,Math.sqrt(2),false,true);equal(m.value,'(-1/3,sqrt(2)]');
assert.ok(m.marks.includes(-1/3));m.undo();equal(m.value,'{}');assert.ok(!m.marks.includes(-1/3));
// All four finite endpoint choices and all four ray choices.
for(const ac of [false,true])for(const bc of [false,true]){m.reset();m.line(-1,2,ac,bc);equal(m.value,(ac?'[':'(')+'-1,2'+(bc?']':')'));}
for(const closed of [false,true]){m.reset();m.line(-Infinity,1,false,closed);equal(m.value,'(-inf,1'+(closed?']':')'));m.reset();m.line(1,Infinity,closed,false);equal(m.value,(closed?'[':'(')+'1,inf)');}
// Every exercise's target can be placed directly from its lines and points,
// including endpoints absent from the initial axis labels.
let count=0;
const chapter=fs.readFileSync('01-Introduction.qmd','utf8');
for(const match of chapter.matchAll(/\[\$([^$]*)\$\]\{\.blank ((?:[^"}]|"[^"]*")*)\}/g)){
 const a={};match[2].replace(/([\w-]+)="([^"]*)"/g,(_,k,v)=>a[k]=v);
 if(!a.plot)continue;
 const target=E.parseSet(a.ans),marks=a.plot.split(',').map(v=>E.ev(E.parseExpr(v),{})),model=P.model(marks);
 for(const p of target){if(p.a===p.b)model.point(p.a,true);else model.line(p.a,p.b,p.ac,p.bc);}
 assert.equal(model.check(target).ok,true,a.ans);
 const translated=I.notation(model.value);
 assert.equal(E.checkAnswer('set',a.ans,translated).ok,true,translated);
 if(a['plot-a'])E.parseSet(a['plot-a']);if(a['plot-b'])E.parseSet(a['plot-b']);
 count++;
}
assert.ok(count>=30);
console.log(count+' exercise plots: exact membership, construction and notation round trips passed.');
