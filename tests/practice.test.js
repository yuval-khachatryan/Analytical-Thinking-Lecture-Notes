const assert = require('node:assert/strict');
const M = require('../assets/interactive.js');
const sameSet=(a,b)=>M.setEq(M.parseSet(a),M.parseSet(b));
const rel = {mode:'rel',vars:['x'],solve:'x',positive:[],verify:false};
const check = (lines,cfg=rel,start='5x-4<=2x+8',target='x<=4') => M.checkWorking(start,lines,cfg,target);
assert.equal(check(['-12<=-3x','x<=4']).done,true); // different route and sign reversal
assert.equal(check(['x<=4']).done,true); // combined steps
assert.equal(check(['3x<=12']).done,false); // correct but unfinished
assert.equal(check(['-3x>=-12','x>=4']).results[1].ok,false);
assert.equal(check(['3x<=13','x<=4']).results.length,1); // editing earlier line invalidates later work
assert.equal(check(['3x<=12','','x<=4']).done,false);
assert.equal(check(['x+(']).done,false);
assert.equal(check(['y<=4']).done,false);
assert.equal(check(['x=2 או x=-2'],rel,'x^2=4','x=2 או x=-2').done,true);
assert.equal(check(['x=2'],rel,'x^2=4','x=2 או x=-2').done,false); // lost solution
assert.equal(check(['x-4>-3 וגם x-4<3','x>1 וגם x<7'],rel,'|x-4|<3','1<x<7').done,true);
assert.equal(check(['x>1 או x<7'],rel,'|x-4|<3','1<x<7').done,false);
for(const [source,answer] of [
 ['x>1 וגם x<4','(1,4)'],['(x>1) and (x<=4)','(1,4]'],
 ['x<0 or x>2 and x<4','(-inf,0)U(2,4)'],['x<0 and x>-3 or x>=2 and x<4','(-3,0)U[2,4)'],
 ['x>=1 and x!=2','[1,2)U(2,inf)'],['1/x<2 and x>0','(1/2,inf)'],
 ['x>0 and 1<2x or x<0 and 1>2x','(-inf,0)U(1/2,inf)']
]) {
 assert.deepEqual(M.solveSet(M.parseRelation(source),'x',{}).map(p=>({...p,a:p.a||0,b:p.b||0})),M.parseSet(answer),source);
 assert.deepEqual(M.parseRelation(M.relationSource(M.parseRelation(source))),M.parseRelation(source));
}
for(const source of ['x>1 and','and x<3','x>1 and 4','x and x>1'])assert.throws(()=>M.parseRelation(source));
assert.equal(check(['x>0 and 1<2x or x<0 and 1>2x','x>1/2 or x<0'],rel,'1/x<2','x>1/2 or x<0').done,true);
assert.equal(check(['1<2x'],rel,'1/x<2','x>1/2 or x<0').done,false); // Lost the negative case.
const lim={mode:'lim',vars:['n'],seq:'n',positive:[],verify:false};
assert.equal(check(['0'],lim,'cos(n)/n^2','0').done,true);
assert.equal(check(['1'],lim,'cos(n)/n^2','0').done,false);
assert.equal(check(['cos(n)/n','0'],lim,'cos(n)/n^2','0').done,false);
assert.equal(check(['2^(3-x)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,true);
assert.equal(check(['2^(-x+3)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,true);
assert.equal(check(['2^(2x+3)/2^(3x)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,false);
// Operations apply to every side/branch, and reverse every inequality when negative.
const operated=M.operateRelation('3-2x<7','sub','3',rel);
assert.equal(check([operated],rel,'3-2x<7','x>-2').results[0].ok,true);
const simplified=M.replaceRelationParts(operated,[{path:'0.0',after:'-2x'},{path:'0.1',after:'4'}],rel);
assert.equal(sameSet('(-2,inf)',simplified),true);
const divided=M.operateRelation(simplified,'div','-2',rel);
assert.deepEqual(M.parseRelation(divided).disj[0].ops,['>']);
assert.equal(sameSet('(-2,inf)',divided),true);
const chain=M.operateRelation('-1<2x-5<=7','mul','-2',rel);
assert.deepEqual(M.parseRelation(chain).disj[0].ops,['>','>=']);
assert.equal(sameSet('(2,6]',chain),true);
assert.equal(sameSet('(2,6]',M.operateRelation('-1<2x-5<=7','swap','',rel)),true);
const branches=M.operateRelation('x<-2 or x>3','div','-2',rel);
assert.deepEqual(M.parseRelation(branches).disj.map(d=>d.ops),[['>'],['<']]);
assert.equal(sameSet('(-inf,-2)U(3,inf)',branches),true);
const conjunction=M.operateRelation('x>1 and x<4','div','-2',rel);
assert.deepEqual(M.parseRelation(conjunction).disj[0].ops,['<','and','>']);
assert.deepEqual(M.solveSet(M.parseRelation(conjunction),'x',{}),M.parseSet('(1,4)'));
assert.deepEqual(M.solveSet(M.parseRelation(M.operateRelation('x>1 and x<4','swap','',rel)),'x',{}),M.parseSet('(1,4)'));
for(const [op,value] of [['mul','0'],['div','0'],['div','1/x'],['mul','sqrt(x)'],['mul','1/0'],['add','y'],['sub','']])
 assert.throws(()=>M.operateRelation('3-2x<7',op,value,rel),op+' '+value);
// Parts identify occurrences rather than replacing every matching piece of text.
const repeated='(x+1)+(x+1)<7',parts=M.relationParts(repeated);
assert.equal(parts.filter(p=>p.tex==='x + 1').length,2);
const rewritten=M.replaceRelationParts(repeated,[{path:'0.0.a',after:'1+x'}],rel);
assert.match(M.relationParts(rewritten).find(p=>p.path==='0.0.a').tex,/1 \+ x/);
assert.equal(M.relationParts(rewritten).find(p=>p.path==='0.0.b').tex,'x + 1');
const userSplit=M.expandAbsolute('|2x-3|=5').source;
assert.equal(userSplit,'2x - 3 = 5 או 2x - 3 = -5');
assert.equal(M.expandAbsolute('|2x-3|=4').source,'2x - 3 = 4 או 2x - 3 = -4');
const userAdded=M.operateRelation(userSplit,'add','3',rel),groups=M.relationPartGroups(userAdded);
const threeEdits=[['2x - 3 + 3','2x'],['5 + 3','8'],['-5 + 3','-2']].flatMap(([source,after])=>{
 const group=groups.find(g=>g.source===source);assert.ok(group,source);
 return group.paths.map(path=>({path,after}));
});
assert.equal(groups.find(g=>g.source==='2x - 3 + 3').paths.length,2);
assert.equal(M.replaceRelationParts(userAdded,threeEdits,rel),'2x = 8 או 2x = -2');
// Readable output retains signs, grouping, denominators and exponents.
for(const source of ['1/(x+1)','x/(y/z)','(x/y)/z','(-x)^2','x^(-2)','(x^2)^3','x^(2^3)',
 'x-(y-z)','x+(y+z)','x+(-y)','x-(-y)','2*(3*x)','(x+y)*(x-y)','(x!)!','sin(x)^2',
 'log_(x+2)(y)','root(3,x)','abs(abs(x)-2)','|x|*|y|']) {
 const before=M.parseExpr(source),formatted=M.relationSource(M.parseRelation(source)),after=M.parseExpr(formatted);
 for(const x of [-3,-1,0,.5,2,4])for(const y of [-2,0,3]) {
  const env={x,y,z:2},a=M.ev(before,env),b=M.ev(after,env);
  assert.equal(Number.isFinite(a),Number.isFinite(b),source+' -> '+formatted);
  if(Number.isFinite(a))assert.ok(Math.abs(a-b)<1e-9,source+' -> '+formatted);
 }
}
assert.throws(()=>M.replaceRelationParts(repeated,[{path:'0.0',after:'2x+2'},{path:'0.0.a',after:'x+1'}],rel));
assert.throws(()=>M.replaceRelationParts(repeated,[{path:'0.0.a',after:'x+2'}],rel));
assert.throws(()=>M.replaceRelationParts(repeated,[{path:'0.0.a',after:'y+1'}],rel));
assert.throws(()=>M.replaceRelationParts('x/x<2',[{path:'0.0',after:'1'}],rel)); // Preserve the hole at zero.
assert.throws(()=>M.replaceRelationParts(repeated,[{path:'2.0',after:'1'}],rel));
assert.throws(()=>M.replaceRelationParts(repeated,[],rel));
assert.equal(sameSet('(-inf,3)',M.replaceRelationParts('2(x+1)<8',[{path:'0.0',after:'2x+2'}],rel)),true);
const inverse={...rel,vars:['x','y']};
assert.ok(M.operateRelation('y=5x-2','add','2',inverse));
for(const src of ['log_2(x)>3','root(3,x)>1','sin(x)=0','x!=2'])
 assert.deepEqual(M.parseRelation(M.relationSource(M.parseRelation(src))),M.parseRelation(src));
// Absolute-value splitting keeps both branches, boundary inclusions and domain holes.
for(const [src,answer] of [
 ['|2x-3|=5','{-1,4}'],['|x-4|<3','(1,7)'],['|x-4|<=3','[1,7]'],
 ['|2x+1|>=3','(-inf,-2]U[1,inf)'],['3<|2x+1|','(-inf,-2)U(1,inf)'],
 ['|x|=0','{0}'],['|x|<=0','{0}'],['|x|>0','R-{0}'],
 ['|x|!=0','R-{0}'],['|x|!=2','R-{-2,2}'],['|x|<=1/2','[-1/2,1/2]'],
 ['|1/x|<=1','(-inf,-1]U[1,inf)']
]) {
 const result=M.expandAbsolute(src);assert.ok(result.rule);
 assert.equal(sameSet(answer,result.source),true,src+' -> '+result.source);
 assert.equal(M.judgeStep(M.parseRelation(src),M.parseRelation(result.source),null,rel).ok,true,src);
}
for(const src of ['|x|<0','|x|=-1','|x|<=-1']) {
 const result=M.expandAbsolute(src);assert.equal(result.source,null);assert.match(result.note,/אין פתרונות/);
}
for(const src of ['|x|>=0','|x|>-1','|1/x|>=-1','|x|!=-1']) {
 const result=M.expandAbsolute(src);assert.equal(result.source,null);assert.match(result.note,/שעבורו הביטוי מוגדר/);
}
for(const src of ['x<2','|x|<1/0'])assert.throws(()=>M.expandAbsolute(src));
for(const src of ['2|x|<3','|x|+1=3','|x|<x','|x|<2 or x>3']){
 const result=M.expandAbsolute(src);assert.ok(result.cases);assert.equal(result.cases.length,2);
 assert.equal(M.checkJustifiedStep(src,result.source,[{op:'abs'}],rel).ok,true,src);
}
console.log('Independent solution, replacement, domain-preservation and sign-reversal checks passed.');

// Generated steps offer an actually simplified default and retain the literal step.
for(const [src,op,value,expected] of [
 ['3-2x<7','sub','3','-2x < 4'],['-2x<4','div','-2','x > -2'],
 ['2x-3=5 or 2x-3=-5','add','3','2x = 8 או 2x = -2'],
 ['2x=8 or 2x=-2','div','2','x = 4 או x = -1'],
 ['x/2+1<3','mul','2','x + 2 < 6'],['2x+4<8','div','2','x + 2 < 4'],
 ['x/3<1/2','mul','3','x < 3/2'],['0.1x<0.3','div','0.1','x < 3'],
 ['2(x-3)+6<10','simplify','','2x < 10'],['2x<5x+9','sub','2x','0 < 3x + 9']
]) {
 const raw=M.operateRelation(src,op,value,rel),candidates=M.relationCandidates(raw,rel);
 assert.equal(candidates[0].source,expected,src+' '+op+' '+value);
 assert.equal(candidates.at(-1).source,raw);
 assert.equal(check([candidates[0].source],rel,src,expected).results[0].ok,true);
}
const choices=M.algebraCandidates(M.parseExpr('2(x+1)+2(x+1)'),{}).map(c=>c.source);
assert.ok(choices.includes('4(x + 1)'));assert.ok(choices.includes('4x + 4'));
assert.deepEqual(M.algebraCandidates(M.parseExpr('1/3+1/6'),{}).map(c=>c.source),['1/2']);
assert.deepEqual(M.algebraCandidates(M.parseExpr('pi'),{}),[]); // No approximate decimal substitutions.

for(const [src,op,value,answer] of [
 ['1/x<2','mul','x','(-inf,0)U(1/2,inf)'],
 ['1/x<2','div','x','(-inf,0)U(1/2,inf)'],
 ['x>0 and 1/x<2','mul','x','(1/2,inf)'],
 ['x<0 and 1/x<2','mul','x','(-inf,0)'],
 ['x^2=x','div','x','{0,1}'],['x<2','mul','x','(-inf,2)'],
 ['x<2','div','x-1','(-inf,2)'],['1/(x-1)<2','mul','x-1','(-inf,1)U(3/2,inf)'],
 ['x<2','mul','x^2+1','(-inf,2)'],['x<2','div','x^2','(-inf,2)'],
 ['x<=2','mul','abs(x)','(-inf,2]']
]) {
 const raw=M.operateRelation(src,op,value,rel);
 for(const candidate of M.relationCandidates(raw,rel))
  assert.equal(sameSet(answer,candidate.source),true,src+' '+op+' '+value+' => '+candidate.source);
}
assert.equal(M.relationCandidates(M.operateRelation('1/x<2','mul','x',rel),rel)[0].source,'x > 0 וגם 1 < 2x או x < 0 וגם 1 > 2x');
assert.equal(M.parseRelation(M.operateRelation('x>0 and 1/x<2','mul','x',rel)).disj.length,1);
assert.equal(M.parseRelation(M.operateRelation('x<2','mul','x^2+1',rel)).disj.length,1);
assert.match(M.relationCandidates(M.operateRelation('x^2=x','div','x',rel),rel)[0].source,/x = 0 וגם/);
assert.throws(()=>M.operateRelation('x<2','div','x-x',rel));

// Simplification must retain holes and undefined square roots, even when terms
// cancel, a coefficient is zero, or a fraction is inverted. Check each proposed
// expression independently of the relation checker.
for(const src of ['x/x','0/x','x/(1/x)','(1/x)/(1/x)','(1/x)*0','sqrt(x)-sqrt(x)',
 '(1/x)-(1/x)','(x-1)/(x-1)','x/(x-1)-x/(x-1)','0*(x/(x-1))',
 '2x+3x-5x','2*x/3+4*x/3','(x^2+2)/3','2*(3*x)+x','-(x+2)+2',
 '2/3+1/6','0.1+0.2','2*pi+3*pi','(x^(1/2))/(x^(1/2))']) {
 const before=M.parseExpr(src);
 for(const c of M.algebraCandidates(before,{}))for(const x of [-3,-1,0,.01,.5,1,2,Math.PI]){
  const a=M.ev(before,{x}),b=M.ev(M.parseExpr(c.source),{x});
  assert.equal(Number.isFinite(a),Number.isFinite(b),src+' => '+c.source+' at '+x);
  if(Number.isFinite(a))assert.ok(Math.abs(a-b)<1e-8,src+' => '+c.source+' at '+x);
 }
}
const restricted=M.relationCandidates('x!=0 and (x^(1/2))/(x^(1/2))=1',rel);
for(const c of restricted)assert.equal(sameSet('(0,inf)',c.source),true,c.source);
console.log('Simplification candidates and variable-operation cases preserve solutions and domains.');

// AND intersects bounds; OR merges intervals. Endpoints retain exact notation,
// strictness and holes, without approximating an interval from sampled values.
for(const [src,expected] of [
 ['x<3 and x<7','x < 3'],['x>0 and x>1/2','x > 1/2'],
 ['x<0 and x<1/2','x < 0'],['x<=3 and x<3','x < 3'],
 ['x<=3 or x<3','x ≤ 3'],['x>=-2 and x<=-2','x = -2'],
 ['x>=1 and x<1','∅'],['x<0 or x>=0','ℝ'],['x<0 or x>0','x ≠ 0'],
 ['x<0 or x=0','x ≤ 0'],['x>1 and x<=3 or x>2 and x<5','1 < x < 5'],
 ['x<1 or x<1','x < 1'],['x>1 and x<4 and x!=2','1 < x < 2 או 2 < x < 4'],
 ['x>0 and x>1/2 or x<0 and x<1/2','x < 0 או x > 1/2'],
 ['x/2>0 and 1/2<x or x/2<0 and 1/2>x','x < 0 או x > 1/2'],
 ['-x/2<0 and x>1','x > 1'],['x<sqrt(2) and x<2','x < sqrt(2)'],
 ['x<pi and x<4','x < π'],['x<1 and x<1.0000000001','x < 1'],
 ['x>1 and x<1.0000000001','1 < x < 1.0000000001'],
 ['x<inf and x<3','x < 3'],['x>-inf and x>=2','x ≥ 2']
]) {
 const a=M.parseRelation(src),b=M.simplifyConditions(a,'x');
 assert.equal(M.relationSource(b),expected,src);
 assert.equal(M.relationSource(M.simplifyConditions(b,'x')),expected,'idempotent: '+src);
 assert.equal(M.relationSource(M.parseRelation(expected)),expected,'round trip: '+src);
}
assert.equal(M.relationSource(M.simplifyConditions(M.parseRelation('t<3 and t<8'),'t')),'t < 3');
// Do not guess the relative order of symbolic endpoints, or erase a nonlinear
// condition/domain just because a simple bound appears beside it.
for(const src of ['x<a and x<b','x<0 and 1/x<2','x!=0 and x/x=1','x>0 and 1<2x'])
 assert.equal(M.relationSource(M.simplifyConditions(M.parseRelation(src),'x')),M.relationSource(M.parseRelation(src)));
for(const src of ['x>0 and x>1/2 or x<0 and x<1/2','x<2 and x<3','x<1 or x<2','x<0 and x>=0'])
 assert.equal(M.isSolved(M.parseRelation(src),'x'),false,src+' still needs intersection/union');
for(const src of ['x<0 or x>1/2','1<x<4','x>1 and x<4','x!=0','∅','ℝ'])
 assert.equal(M.isSolved(M.parseRelation(src),'x'),true,src);
const cases='x>0 and 1<2x or x<0 and 1>2x';
const dividedCases=M.operateRelation(cases,'div','2',rel);
assert.equal(dividedCases,'x > 0 וגם 1/2 < 2x/2 או x < 0 וגם 1/2 > 2x/2');
const minimalCases=M.relationCandidates(dividedCases,rel)[0].source;
assert.equal(minimalCases,'x < 0 או x > 1/2');
assert.equal(check([cases,minimalCases],rel,'1/x<2','x<0 or x>1/2').done,true);
assert.equal(check(['x>0 and x>1/2 or x<0 and x<1/2'],rel,'1/x<2','x<0 or x>1/2').done,false);
console.log('Condition intersections, unions, case guards and minimal-answer checks passed.');

// Selected logical simplifications check the chosen subrelation, not just the
// full line (where another condition could mask an incorrect replacement).
const chosenCases='x>0 and x>1/2 or x<0 and x<1/2';
const selectedParts=M.conditionParts(chosenCases);
assert.equal(selectedParts.find(p=>p.path==='and.0.0.2').source,'x > 0 וגם x > 1/2');
assert.equal(M.replaceConditionParts(chosenCases,[{path:'and.0.0.2',after:'x>1/2'}],rel),'x > 1/2 או x < 0 וגם x < 1/2');
assert.equal(M.replaceConditionParts(chosenCases,[{path:'and.0.0.2',after:'x>1/2'},{path:'and.1.0.2',after:'x<0'}],rel),'x > 1/2 או x < 0');
assert.equal(M.replaceConditionParts('x>0 and x>1 and x<7',[{path:'and.0.0.2',after:'x>1'}],rel),'x > 1 וגם x < 7');
assert.equal(M.replaceConditionParts('x<1 or x<2 or x>5',[{path:'or.0.2',after:'x<2'}],rel),'x < 2 או x > 5');
assert.equal(M.replaceConditionParts('x>0 and x>0',[{path:'and.0.0.1',after:'0<x'}],rel),'0 < x וגם x > 0');
assert.equal(M.replaceConditionParts('x!=0 and x<2',[{path:'and.0.0.1',after:'x<0 or x>0'}],rel),'x < 0 וגם x < 2 או x > 0 וגם x < 2');
assert.equal(M.replaceConditionParts('x<0 and x>=0 or x>1 and x<2',[{path:'and.0.0.2',after:'∅'}],rel),'x > 1 וגם x < 2');
assert.equal(M.replaceConditionParts('x<0 or x>=0',[{path:'or.0.2',after:'ℝ'}],rel),'ℝ');
assert.equal(M.replaceConditionParts('2x-2>0 and x>0',[{path:'and.0.0.1',after:'x>1'}],rel),'x > 1 וגם x > 0');
assert.equal(M.replaceConditionParts('x<1/2 and x>0',[{path:'and.0.0.1',after:'x<0.5'}],rel),'x < 0.5 וגם x > 0');
for(const [src,path,after] of [
 ['x<1 and x<0','and.0.0.1','x<2'],['x<1 or x<3','and.0.0.1','x<2'],
 ['x<100 and x<200','and.0.0.1','x<150'],['x<1 and x<2','and.0.0.2','x<=1'],
 ['x>1 and x<1.0000000001','and.0.0.2','∅'],['1/x<2','and.0.0.1','1<2x'],
 [chosenCases,'and.0.0.2','y>1/2'],[chosenCases,'and.0.0.2','x'],[chosenCases,'missing','x<0'],
 [chosenCases,'and.0.0.2','']
])assert.throws(()=>M.replaceConditionParts(src,[{path,after}],rel),src+' => '+after);
assert.throws(()=>M.replaceConditionParts(chosenCases,[],rel));
assert.throws(()=>M.replaceConditionParts(chosenCases,[{path:'and.0.0.2',after:'x>1/2'},{path:'and.0.0.1',after:'x>0'}],rel));
assert.throws(()=>M.replaceConditionParts(chosenCases,[{path:'or.0.2',after:'x<0 or x>1/2'},{path:'and.1.0.2',after:'x<0'}],rel));
console.log('Selected condition replacements preserve unselected work and reject masked mistakes.');
