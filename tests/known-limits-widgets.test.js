const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('widgets/ch02/known-limits.html','utf8');
const family=new Function(html.slice(html.indexOf('  function family'),html.indexOf('  function number'))+';return family;')();
for(const q of [-1.2,-1,-.5,0,.5,1,1.2]){
 const s=family('geometric',q,4,1);assert.equal(s.term(5),q**5);
 assert.equal(s.limit,Math.abs(q)<1?0:q===1?1:null);
}
assert.match(family('geometric',0).note,/כל האיברים שווים לאפס/);
for(const a of [.25,1,2,4,16]){
 const s=family('roots',2,a,1);assert.equal(s.limit,1);assert.equal(s.term(1),a);assert.ok(Math.abs(s.term(1000)-1)<.003);
}
for(const p of [1,2,3])for(const q of [1.2,2,4]){
 const s=family('ratio',q,4,p);assert.equal(s.limit,0);assert.equal(s.term(10),10**p/q**10);
}
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
for(const kind of ['geometric','roots','ratio']){
 const E=env(),canvas=node(E.document,'canvas',{id:'plot',width:'760',height:'270'});let points=[];
 canvas.getContext=()=>new Proxy({arc:(x,y)=>{assert.ok(Number.isFinite(x)&&Number.isFinite(y));points.push([x,y]);}},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 for(const id of ['q-control','a-control','p-control','q-value','formula','readout','root-prediction','root-feedback'])node(E.document,'div',{id});
 const side=node(E.document,'select',{id:'root-side'}),check=node(E.document,'button',{id:'root-check'}),reveal=node(E.document,'button',{id:'root-reveal'});
 const q=node(E.document,'input',{id:'q'}),a=node(E.document,'select',{id:'a',value:'4'}),p=node(E.document,'select',{id:'p',value:'1'}),count=node(E.document,'select',{id:'count',value:'24'});
 E.context.location.search='?case='+kind;E.run(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
 assert.equal(points.length,24);assert.equal(E.document.querySelector('#a-control').hidden,kind!=='roots');
 assert.equal(E.document.querySelector('#root-prediction').hidden,kind!=='roots');
 for(const N of [12,48,192]){
  points=[];count.value=String(N);count.dispatchEvent({type:'change'});assert.equal(points.length,N);
  assert.ok(points.every(([x,y])=>x>=64&&x<=742&&y>=18&&y<=235));
 }
 points=[];q.value=kind==='ratio'?'2':'0';a.value='.25';p.value='3';(kind==='roots'?a:kind==='ratio'?p:q).dispatchEvent({type:'input'});
 if(kind!=='ratio')assert.equal(points.length,192);
 if(kind==='roots'){
   const feedback=E.document.querySelector('#root-feedback');
   for(const [constant,expected] of [['.25','below'],['4','above'],['1','equal']]){
     a.value=constant;a.dispatchEvent({type:'change'});assert.equal(side.value,'');assert.equal(feedback.textContent,'');
     check.click();assert.match(feedback.textContent,/בחרו תשובה/);
     side.value=expected==='above'?'below':'above';check.click();assert.match(feedback.textContent,/עדיין לא/);
     side.value=expected;check.click();assert.match(feedback.textContent,/✓ נכון/);
     count.value='12';count.dispatchEvent({type:'change'});assert.match(feedback.textContent,/✓ נכון/,'Changing sample size does not erase the answer');
     side.value='';side.dispatchEvent({type:'change'});assert.equal(feedback.textContent,'');reveal.click();assert.ok(feedback.textContent.length>15);
   }
 }
}
console.log('Known-limit simulations: parameters, boundary cases, controls and finite canvas coordinates passed.');
