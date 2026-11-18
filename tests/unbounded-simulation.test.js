const assert=require('node:assert/strict'),fs=require('node:fs');
const U=require('../widgets/ch02/unbounded.js');
// Equality is allowed; the next natural index supplies a counterexample.
for(const kind of ['positive','negative'])for(const M of [0,1,5,20,2.5]){
 const first=Math.floor(M)+1,s=U.state(kind,M);
 assert.equal(s.N,first);assert.equal(s.terms.length,first);
 assert.equal(s.firstOutside,first);
 assert.ok(s.terms.slice(0,first-1).every(t=>!t.outside));
 assert.ok(s.terms.slice(first-1).every(t=>t.outside));
 assert.equal(Math.abs(s.terms[first-1].a),first);
 if(Number.isInteger(M)&&M>0)assert.equal(s.terms[M-1].outside,false);
}
for(const M of [0,.5,1,5,20]){
 const s=U.state('alternating',M);
 assert.equal(s.N,12);assert.equal(s.firstOutside,M<1?1:null);
 assert.ok(s.terms.every(t=>Math.abs(t.a)===1&&t.outside===(M<1)));
}
const html=fs.readFileSync('widgets/ch02/unbounded.html','utf8');
assert.equal((html.match(/type="range"/g)||[]).length,1);
assert.ok(!html.includes('id="count'));assert.ok(html.includes('value="alternating"'));
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env(),$=id=>E.document.getElementById(id),resize=[];
E.context.addEventListener=(event,fn)=>{if(event==='resize')resize.push(fn);};
node(E.document,'select',{id:'sequence',value:'positive'});
node(E.document,'input',{id:'bound',value:'5'});
for(const id of ['bound-value'])node(E.document,'output',{id});
node(E.document,'svg',{id:'plot'});node(E.document,'div',{id:'read'});
E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
E.run(fs.readFileSync('widgets/ch02/unbounded.js','utf8'));
assert.ok($('read').innerHTML.includes('N = M + 1 = 6'));
function set(id,value){$(id).value=String(value);$(id).dispatchEvent({type:id==='sequence'?'change':'input'});}
for(const width of [320,480,720]){
 $('plot').getBoundingClientRect=()=>({width});
 for(const kind of ['positive','negative','alternating']){
  set('sequence',kind);
  for(let M=0;M<=20;M++){
   const N=kind==='alternating'?12:M+1;
   set('bound',M);
   assert.equal($('bound-value').textContent,String(M));
   const points=$('plot').querySelectorAll('[data-index]');
   assert.equal(points.length,N);
   const marked=$('plot').querySelector('[data-first-outside]');
   const first=kind==='alternating'?(M<1?1:null):M+1;
   assert.equal(Boolean(marked),first!==null);
   if(marked)assert.equal(marked.getAttribute('data-first-outside'),String(first));
   if(kind==='alternating'){
    assert.equal($('read').className.includes('good'),M>=1);
    assert.ok(!$('read').innerHTML.includes('N = M + 1'));
   }
   for(const p of points){
    const n=+p.getAttribute('data-index'),value=U.value(kind,n),outside=Math.abs(value)>M;
    assert.equal(p.getAttribute('data-outside'),String(outside));
    assert.equal(p.getAttribute('data-value'),String(value));
    assert.equal(p.getAttribute('fill'),outside?'#b72e46':'#2563a6');
    assert.ok(+p.getAttribute('cx')>60&&+p.getAttribute('cx')<width-20);
    assert.ok(+p.getAttribute('cy')>25&&+p.getAttribute('cy')<245);
   }
  }
 }
}
set('sequence','positive');set('bound',2);const extent=+$('plot').getAttribute('data-y-extent');
set('bound',20);assert.ok(+$('plot').getAttribute('data-y-extent')>extent);
set('bound',0);resize.forEach(fn=>fn());assert.equal($('plot').querySelectorAll('[data-index]').length,1);
console.log('Bound simulation: automatic indices, all three sequences, weak boundary, feedback and rescaling passed.');
