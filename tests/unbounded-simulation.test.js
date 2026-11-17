const assert=require('node:assert/strict'),fs=require('node:fs');
const U=require('../widgets/ch02/unbounded.js');
// Equality is allowed; the next natural index supplies a counterexample.
for(const kind of ['positive','negative'])for(const M of [0,1,5,20,2.5]){
 const first=Math.floor(M)+1,s=U.state(kind,M,first+2);
 assert.equal(s.firstOutside,first);
 assert.ok(s.terms.slice(0,first-1).every(t=>!t.outside));
 assert.ok(s.terms.slice(first-1).every(t=>t.outside));
 assert.equal(Math.abs(s.terms[first-1].a),first);
 if(Number.isInteger(M)&&M>0)assert.equal(s.terms[M-1].outside,false);
}
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env(),$=id=>E.document.getElementById(id),resize=[];
E.context.addEventListener=(event,fn)=>{if(event==='resize')resize.push(fn);};
node(E.document,'select',{id:'sequence',value:'positive'});
node(E.document,'input',{id:'bound',value:'5'});node(E.document,'input',{id:'count',value:'5'});
for(const id of ['bound-value','count-value'])node(E.document,'output',{id});
node(E.document,'svg',{id:'plot'});node(E.document,'div',{id:'read'});
E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
E.run(fs.readFileSync('widgets/ch02/unbounded.js','utf8'));
assert.ok($('read').innerHTML.includes('זה עדיין לא חסם לכל הסדרה'));
function set(id,value){$(id).value=String(value);$(id).dispatchEvent({type:id==='sequence'?'change':'input'});}
for(const width of [320,480,720]){
 $('plot').getBoundingClientRect=()=>({width});
 for(const kind of ['positive','negative']){
  set('sequence',kind);
  for(let M=0;M<=20;M++)for(const N of [...new Set([1,Math.max(1,M),M+1,M+2,60])]){
   set('bound',M);set('count',N);
   assert.equal($('bound-value').textContent,String(M));
   assert.equal($('count-value').textContent,String(N));
   const points=$('plot').querySelectorAll('[data-index]');
   assert.equal(points.length,N);
   const marked=$('plot').querySelector('[data-first-outside]');
   assert.equal(Boolean(marked),N>M);
   if(marked)assert.equal(marked.getAttribute('data-first-outside'),String(M+1));
   for(const p of points){
    const n=+p.getAttribute('data-index');
    assert.equal(p.getAttribute('data-outside'),String(n>M));
    assert.equal(p.getAttribute('data-value'),String(kind==='negative'?-n:n));
    assert.equal(p.getAttribute('fill'),n>M?'#b72e46':'#2563a6');
    assert.ok(+p.getAttribute('cx')>60&&+p.getAttribute('cx')<width-20);
    assert.ok(+p.getAttribute('cy')>25&&+p.getAttribute('cy')<245);
   }
  }
 }
}
set('bound',2);set('count',3);const extent=+$('plot').getAttribute('data-y-extent');
set('count',60);assert.ok(+$('plot').getAttribute('data-y-extent')>extent);
resize.forEach(fn=>fn());assert.equal($('count-value').textContent,'60');
console.log('Unbounded simulation: weak boundary, counterexamples, controls and rescaling passed.');
