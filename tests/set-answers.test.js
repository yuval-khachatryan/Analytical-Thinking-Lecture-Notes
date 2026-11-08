const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../assets/interactive.js');
const check=(answer,input,opts={})=>M.checkAnswer('set',answer,input,[],opts);
// Infinity by itself is a limit answer, not a set-answer field.
for(const answer of ['inf','-inf']){
 assert.equal(M.guessKind(answer),'num');
 assert.equal(M.checkAnswer(M.guessKind(answer),answer,answer).ok,true);
}
assert.equal(M.guessKind('(-2,inf)'),'set');
for(const [answer,condition] of [
 ['(-2,inf)','x>-2'],['(-2,inf)','(x>-2)'],['(-2,inf)','-2<x'],
 ['(-inf,0)U(1/2,inf)','x<0 או x>1/2'],['[-6,2]','-6<=x<=2'],
 ['{-1,4}','x=-1 or x=4'],['R-{2}','x!=2'],['R','x in R'],
 ['(1,3)','x in (1,3)'],['{}','x<0 and x>1']
]) {
 const result=check(answer,condition);
 assert.equal(result.ok,false,condition);assert.equal(result.partial,true,condition);
 assert.match(result.msg,/הקבוצה הנכונה.*סימון של קבוצה/);
 assert.match(result.msg,/שיטת השומר/);assert.match(result.msg,/קטעים וקרניים/);
}
for(const [answer,input] of [
 ['(-2,inf)','(-2,∞)'],['(-2,inf)','{x | x>-2}'],
 ['(-2,inf)','{t in R : t>-2}'],['{-1,4}','{-1,4}'],
 ['{-1,4}','{x | x=-1 or x=4}'],['{}','∅'],['R','ℝ'],
 ['R','{x in R}'],['R-{2}','R∖{2}'],
 ['(-2,inf)','(-2,0]∪(0,∞)'],['[1,2]U[4,5]','([0,2]∪[4,6])∩[1,5]']
])assert.equal(check(answer,input).ok,true,input);
for(const input of ['x<-2','x>=-2','{x|x<-2}','(-2,inf}','R∩(x>-2)']) {
 const r=check('(-2,inf)',input);assert.equal(r.ok,false,input);assert.notEqual(r.partial,true,input);
}
for(const [answer,input] of [['{-1,4}','-1,4'],['{4}','4'],['{4}','(4)'],['[0,1]U{3}','[0,1]U3']]) {
 const r=check(answer,input);assert.equal(r.ok,false,input);assert.equal(r.partial,true,input);
}
assert.equal(check('(2,8)','|x-5|<3',{form:'abs'}).ok,true);
assert.equal(check('[-1,7]','|x-3|<=4',{form:'abs'}).ok,true);
assert.equal(check('(2,8)','|x-5|<3').partial,true);
assert.equal(check('(2,8)','|x-5|<4',{form:'abs'}).ok,false);
assert.equal(check('(2,8)','(2,8)',{form:'abs'}).partial,true);
// A condition is still the right representation for a justified working line.
const cfg={mode:'rel',vars:['x'],solve:'x',positive:[],requireJustification:true};
assert.equal(M.checkJustifiedStep('-2x<4','x>-2',[{op:'div',value:'-2'}],cfg).ok,true);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button};')(require);
// Use the actual answer attributes from example 1.3.8, including solution-plot.
const source=fs.readFileSync('01-Introduction.qmd','utf8').split('{#box-exm-linear-ineq')[1].split('{#box-exm-cases-ineq')[0];
const attrs={class:'blank'};
source.match(/\{\.blank ([^}]+)\}/)[1].replace(/([\w-]+)="([^"]*)"/g,(_,k,v)=>{attrs[k]=v;});
assert.equal(attrs.ans,'(-2,inf)');
for(const rich of [false,true]){
 const E=env(),box=node(E.document,'div',{class:'thmbox-example'}),fill=node(box,'div',{class:'fill'});
 const blank=node(node(fill,'p'),'span',attrs);
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();}
 for(const text of ['x>-2','(x>-2)']){
  input(field,text);button(fill,'בדיקה').click();
  assert.equal(blank.classList.contains('ok'),false);assert.equal(blank.classList.contains('warn'),true);
  assert.match(fill.textContent,/סימון של קבוצה/);
 }
 for(const text of rich?[String.raw`\left(-2,\infty\right)`,String.raw`\left\{x\mid x>-2\right\}`]:['(-2,inf)','{x|x>-2}']){
  input(field,text);button(fill,'בדיקה').click();
  assert.equal(blank.classList.contains('ok'),true,text);assert.equal(blank.classList.contains('warn'),false);
 }
 input(field,'x<-2');button(fill,'בדיקה').click();
 assert.equal(blank.classList.contains('bad'),true);assert.equal(blank.classList.contains('warn'),false);
}
console.log('Set answers: required notation, useful feedback, explicit condition questions, working steps and both input adapters passed.');
