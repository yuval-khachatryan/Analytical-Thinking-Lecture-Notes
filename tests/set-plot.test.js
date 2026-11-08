const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../assets/set-plot.js'),I=require('../widgets/shared/intervals.js'),E=require('../assets/interactive.js');
const equal=(actual,expected)=>assert.equal(I.witness(actual,E.parseSet(expected)),null,expected);
const m=P.model([-2,-1,0,1,2]);
equal(m.value,'{}');m.line(-1,1,true,true);equal(m.value,'[-1,1]');
m.point(0,false);equal(m.value,'[-1,0)U(0,1]');
m.line(-1,2,true,false);equal(m.value,'[-1,0)U(0,2)'); // A later overlapping line does not fill an explicit hole.
assert.equal(m.check(E.parseSet('[-1,2)')).missing,true);
assert.equal(m.check(E.parseSet('[-1,2)')).witness,0);
assert.equal(m.point(1/2,true),false);equal(m.value,'[-1,0)U(0,2)');assert.ok(!m.marks.includes(1/2));
m.point(3,true);m.undo();assert.ok(!m.marks.includes(3));equal(m.value,'[-1,0)U(0,2)');
m.clear();equal(m.value,'{}');m.undo();equal(m.value,'[-1,0)U(0,2)');
m.reset();assert.equal(m.canUndo,false);equal(m.value,'{}');
m.point(0,true);equal(m.value,'{0}');
m.line(-Infinity,-2,false,false);equal(m.value,'(-inf,-2)U{0}');m.togglePoint(-2);equal(m.value,'(-inf,-2]U{0}');
m.line(2,Infinity,false,false);equal(m.value,'(-inf,-2]U{0}U(2,inf)');
m.reset();m.line(-Infinity,Infinity);equal(m.value,'R');m.point(0,false);equal(m.value,'R-{0}');m.point(0,true);equal(m.value,'R');
assert.throws(()=>m.point(Infinity,true));equal(P.model().value,'{}');
assert.throws(()=>m.line(2,-1));assert.throws(()=>m.line(1,1));equal(m.value,'R');
m.reset();m.line(-1/3,Math.sqrt(2),false,true);equal(m.value,'(-1/3,sqrt(2)]');
assert.ok(m.marks.includes(-1/3));m.undo();equal(m.value,'{}');assert.ok(!m.marks.includes(-1/3));
// All four finite endpoint choices and all four ray choices.
for(const ac of [false,true])for(const bc of [false,true]){m.reset();m.line(-1,2,ac,bc);equal(m.value,(ac?'[':'(')+'-1,2'+(bc?']':')'));}
for(const closed of [false,true]){m.reset();m.line(-Infinity,1,false,closed);equal(m.value,'(-inf,1'+(closed?']':')'));m.reset();m.line(1,Infinity,closed,false);equal(m.value,(closed?'[':'(')+'1,inf)');}
// Open endpoints of one interval cannot punch holes in another interval.
for(const reverse of [false,true]) {
 const shapes=[[2,5,true,false],[3,7,false,true]];
 if(reverse)shapes.reverse();
 m.reset();shapes.forEach(args=>m.line(...args));equal(m.value,'[2,7]');
 assert.ok(I.contains(m.value,3));assert.ok(I.contains(m.value,5));
 m.undo();equal(m.value,reverse?'(3,7]':'[2,5)');
}
// Union is independent of placement order, including all touching-end choices.
for(const ac of [false,true])for(const bc of [false,true])
for(const cc of [false,true])for(const dc of [false,true])for(const left of [1,3,4]) {
 const a={a:0,b:3,ac,bc},b={a:left,b:5,ac:cc,bc:dc};
 const expected=I.operation([a],[b],'union');
 for(const pieces of [[a,b],[b,a]]) {
  m.reset();pieces.forEach(p=>m.line(p.a,p.b,p.ac,p.bc));
  assert.equal(I.witness(m.value,expected),null);
 }
}
assert.deepEqual(P.model([-3,-2,-1,0,1,2,3]).marks,[]); // Presets never add points/ticks.
// Ineffective points neither add marks/hidden edits nor consume an undo step.
m.reset();m.line(0,4,true,true);assert.equal(m.point(2,true),false);assert.equal(m.point(9,false),false);
assert.deepEqual(m.marks,[0,4]);assert.deepEqual(m.pointEdits,[]);m.undo();equal(m.value,'{}');
m.line(8,10,true,true);equal(m.value,'[8,10]'); // No latent hole at 9.
m.reset();m.point(3,false);assert.equal(m.canUndo,false);assert.deepEqual(m.marks,[]);
m.line(2,5,true,false);m.line(3,7,false,true);assert.deepEqual(m.marks,[2,7]);
const first=m.lines[0].id,second=m.lines[1].id;
m.removeLine(first);equal(m.value,'(3,7]');m.undo();equal(m.value,'[2,7]');
m.removeLine(second);equal(m.value,'[2,5)');m.undo();equal(m.value,'[2,7]');
m.point(4,false);equal(m.value,'[2,4)U(4,7]');m.removePoint(4);equal(m.value,'[2,7]');
m.undo();equal(m.value,'[2,4)U(4,7]');m.point(4,true);assert.deepEqual(m.marks,[2,7]);
m.point(9,true);m.removePoint(9);equal(m.value,'[2,7]');m.undo();equal(m.value,'[2,7]U{9}');
m.reset();m.line(0,4,true,true);m.point(2,false);m.removeLine(m.lines[0].id);
equal(m.value,'{}');assert.deepEqual(m.pointEdits,[]);m.line(0,4,true,true);equal(m.value,'[0,4]');
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
