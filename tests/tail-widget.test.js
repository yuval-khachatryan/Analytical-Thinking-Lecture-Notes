const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env(),plot=node(E.document,'svg',{id:'plot'}),slider=node(E.document,'input',{id:'start',value:'5'}),change=node(E.document,'button',{id:'change-prefix'});
const restore=node(E.document,'button',{id:'restore'});
for(const id of ['index','tail-terms','explanation'])node(E.document,'div',{id});
const resize=[];E.context.addEventListener=(event,fn)=>{if(event==='resize')resize.push(fn);};
E.run(fs.readFileSync('widgets/ch02/tail.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
function points(){return plot.querySelectorAll('circle');}
function snapshot(){return points().map(p=>[p.getAttribute('cx'),p.getAttribute('cy'),p.getAttribute('data-value')]);}
for(let N=1;N<=9;N++){
 slider.value=String(N);slider.dispatchEvent({type:'input'});
 assert.equal(points().length,12);
 assert.equal(points().filter(p=>p.getAttribute('data-tail')==='true').length,13-N,'The tail includes a_N and every later displayed term');
 assert.equal(points().find(p=>p.getAttribute('data-index')===String(N)).getAttribute('data-tail'),'true');
 assert.equal(change.disabled,N===1);
 assert.match(E.document.querySelector('#tail-terms').innerHTML,new RegExp('<sub>'+N+'</sub>'));
 if(N===1){const original=snapshot();change.click();assert.deepEqual(snapshot(),original);continue;}
 const original=snapshot();change.click();const changed=snapshot();
 for(let i=0;i<12;i++){
  if(i+1>=N)assert.deepEqual(changed[i],original[i],'Tail values and screen positions stay unchanged');
  else assert.notEqual(changed[i][2],original[i][2],'The chosen prefix term changes');
 }
 assert.match(E.document.querySelector('#explanation').textContent,/כל איברי הזנב נשארו בדיוק כפי שהיו/);
 change.click();assert.deepEqual(snapshot(),original,'Restore the original prefix');
}
change.click();const modified=snapshot();slider.value='1';slider.dispatchEvent({type:'input'});assert.equal(change.disabled,true);
assert.deepEqual(snapshot(),modified,'Choosing a different tail must not alter any term');
assert.match(E.document.querySelector('#explanation').textContent,/הסדרה כולה/);
assert.equal(points().every(p=>p.getAttribute('data-tail')==='true'),true);
assert.match(E.document.querySelector('#tail-terms').innerHTML,/<span>3<\/span><span>4<\/span>/,'Show actual modified values if the new tail includes them');
assert.equal(restore.hidden,false);restore.click();assert.equal(restore.hidden,true);
assert.equal(points().every((p,i)=>+p.getAttribute('data-value')===1/(i+1)),true);
for(const width of [320,480,760]){
 plot.getBoundingClientRect=()=>({width});resize.forEach(fn=>fn());
 for(const p of points())assert.ok(+p.getAttribute('cx')>0&&+p.getAttribute('cx')<width&&+p.getAttribute('cy')>0&&+p.getAttribute('cy')<220);
}
console.log('Tail demo: inclusive cutoff, prefix changes, preserved terms when selecting a tail, reset and responsive coordinates passed.');
