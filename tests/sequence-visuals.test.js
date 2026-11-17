const assert=require('node:assert/strict'),fs=require('node:fs');
const A=require('../widgets/ch02/limit-activities.js'),microscope=require('../widgets/ch02/microscope.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
// Epsilon alone controls the cutoff; both sequence views update every displayed result.
for(const kind of ['reciprocal','alternating-decay']){
 const E=env();E.context.location.search='?case='+kind;
 const resize=[];E.context.addEventListener=(event,fn)=>{if(event==='resize')resize.push(fn);};
 const $=id=>E.document.getElementById(id);
 node(E.document,'svg',{id:'plot'});node(E.document,'select',{id:'epsilon'});
 node(E.document,'div',{id:'epsilon-options'});
 for(const id of ['formula','cutoff-value','read','caption'])node(E.document,'p',{id});
 E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
 E.run(fs.readFileSync('widgets/ch02/error-band.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
 assert.equal($('cutoff-value').textContent,'11');
 const fractions=$('epsilon-options').querySelectorAll('[role="option"]');
 const menu=$('epsilon-options').querySelector('[role="listbox"]'),trigger=$('epsilon-options').querySelector('[role="combobox"]');
 assert.equal(menu.hidden,true);trigger.click();assert.equal(menu.hidden,false);
 assert.equal(fractions.length,A.choices.slice(3).length);
 assert.equal($('epsilon').hidden,true);
 assert.equal(fractions.filter(b=>b.innerHTML.includes('class="fr"')).length,fractions.length-1);
 for(const width of [320,480,720]){
  $('plot').getBoundingClientRect=()=>({width});
  for(const e of A.choices.slice(3)){
   fractions.find(b=>b.getAttribute('data-value')===e.join('/')).click();
   const expected=Math.floor(e[1]/e[0])+1;
   assert.equal($('cutoff-value').textContent,String(expected));
   assert.equal(fractions.find(b=>b.getAttribute('aria-selected')==='true').getAttribute('data-value'),e.join('/'));
   assert.equal(A.tail(kind,0,e,expected).ok,true,'automatic cutoff works for the entire tail');
   assert.equal(A.tail(kind,0,e,expected-1).ok,false,'strict boundary requires the next natural index');
   assert.ok($('read').innerHTML.includes('n ≥ '+expected));
   const points=$('plot').querySelectorAll('circle');
   assert.equal(points.find(p=>p.getAttribute('data-index')===String(expected-1)).getAttribute('opacity'),'0.3');
   assert.equal(points.find(p=>p.getAttribute('data-index')===String(expected)).getAttribute('stroke-width'),'2');
   for(const point of points){
    assert.ok(+point.getAttribute('cx')>0&&+point.getAttribute('cx')<width);
    assert.ok(+point.getAttribute('cy')>22&&+point.getAttribute('cy')<213);
    if(+point.getAttribute('data-index')>=expected)assert.equal(point.getAttribute('fill'),'#305bc2');
   }
  }
 }
 trigger.dispatchEvent({type:'keydown',key:'ArrowDown'});
 fractions[0].dispatchEvent({type:'keydown',key:'End'});fractions.at(-1).click();
 assert.equal(menu.hidden,true);assert.equal(trigger.getAttribute('aria-expanded'),'false');
 assert.equal($('epsilon').value,'1/100000');assert.equal($('cutoff-value').textContent,'100001');
 resize.forEach(fn=>fn());assert.equal($('cutoff-value').textContent,'100001');
}
// Every selected term stays on screen; shrinking epsilon changes neither N nor values.
for(const [kind,L] of [['reciprocal',0],['alternating-decay',0],['alternating',0],['alternating',1],['constant',3]]){
 for(const N of [1,10,11,1001])for(const eps of [[1,10],[1,100000],[5,2]]){
  const E=env();E.context.addEventListener=()=>{};const svg=node(E.document,'svg');E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
  const view=E.context.LimitActivities.plot(svg,kind,L,eps,N);
  assert.ok(view.first<=N&&view.last>=N);
  assert.equal(svg.querySelectorAll('circle').length,view.count);
  assert.equal(svg.querySelectorAll('path').length,1,'only the axes, no offscreen triangle markers');
  for(const point of svg.querySelectorAll('circle')){
   const y=Number(point.getAttribute('cy'));assert.ok(y>22&&y<213,'actual point inside plot');
  }
 }
}
{
 const E=env();E.context.addEventListener=()=>{};const svg=node(E.document,'svg');E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
 const plot=E.context.LimitActivities.plot;
 plot(svg,'reciprocal',0,[1,10],10);const oldBand=Number(svg.querySelector('rect').getAttribute('height'));
 plot(svg,'reciprocal',0,[1,1000],10);const newBand=Number(svg.querySelector('rect').getAttribute('height'));
 assert.ok(newBand<oldBand/10);assert.equal(svg.querySelectorAll('circle')[2].getAttribute('data-index'),'10');
 assert.match(svg.querySelectorAll('circle')[2].querySelector('title').textContent,/1\/10/);
 assert.equal(A.tail('reciprocal',0,[1,1000],10).ok,false);
}
// Decimal values stay fixed: epsilon changes membership, zoom changes visibility.
for(let z=0;z<=microscope.maxZoom;z++)for(const epsilon of microscope.epsilons){
 const v=microscope.view(z,epsilon),firstMerged=v.terms.find(t=>t.index===v.merged);
 assert.ok(550-firstMerged.x<2);
 assert.ok(550-v.terms.find(t=>t.index===v.merged-1).x>=2);
 assert.equal(v.epsilon,epsilon);
 assert.ok(Math.abs((v.right-v.left)/(2*v.epsilon*v.scale)-1)<1e-12);
 assert.equal(v.terms.length,microscope.view(microscope.maxZoom).merged+1);
 for(const t of v.terms){assert.ok(t.distance>0);assert.equal(t.inside,t.distance<epsilon);}
 if(z){const previous=microscope.view(z-1,epsilon);assert.ok(Math.abs((550-v.terms[0].x)-10*(550-previous.terms[0].x))<1e-4);}
 assert.deepEqual(v.terms.map(t=>t.value),microscope.view(0).terms.map(t=>t.value));
}
assert.equal(microscope.maxZoom,2);
for(let n=1;n<=9;n++)assert.ok(Math.abs(microscope.error(n)-(Math.PI-Number(microscope.decimal(n))))<1e-15);
{
 const E=env();E.context.addEventListener=()=>{};const svg=node(E.document,'svg',{id:'plot'}),epsilon=node(E.document,'select',{id:'epsilon',value:'0.001'});
 node(E.document,'div',{id:'epsilon-options'});
 for(const [value,label] of [['0.01','1/100'],['0.001','1/1000'],['0.0001','1/10000']])node(epsilon,'option',{value},label);
 const up=node(E.document,'button',{id:'zoom-in'}),down=node(E.document,'button',{id:'zoom-out'});
 for(const id of ['terms','scale','read','outside'])node(E.document,'p',{id});
 E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));E.run(fs.readFileSync('widgets/ch02/microscope.js','utf8'));
 function labels(){const v=microscope.view(svg.getAttribute('data-zoom'),epsilon.value);
  assert.ok(svg.querySelector('[data-label-line="'+v.merged+'"]'),'first merging term has a leader line');
  assert.ok(svg.querySelector('[data-term-label="'+v.merged+'"]'));
  assert.equal(E.document.getElementById('terms').querySelectorAll('[data-term]').length,microscope.lastIndex);
  for(const t of v.terms){const token=E.document.getElementById('terms').querySelector('[data-term="'+t.index+'"]');assert.ok(token.classList.contains(t.state));assert.equal(token.textContent,t.value);}
 }
 assert.equal(svg.getAttribute('data-merged-from'),'4');labels();assert.equal(down.disabled,true);
 assert.equal(svg.querySelectorAll('[data-boundary]').length,2);
 assert.ok(svg.querySelector('[data-index="5"]'));
 assert.match(E.document.getElementById('read').textContent,/a₄.*a₅.*π/);
 const oldXs=microscope.view(0).terms.map(t=>t.x);
 E.document.getElementById('epsilon-options').querySelectorAll('button').find(b=>b.getAttribute('data-value')==='0.0001').click();labels();
 assert.equal(epsilon.hidden,true);assert.equal(epsilon.value,'0.0001');
 assert.equal(svg.getAttribute('data-zoom'),'0');assert.deepEqual(microscope.view(0,.0001).terms.map(t=>t.x),oldXs);
 assert.ok(microscope.view(0,.0001).terms.filter(t=>t.inside).every(t=>t.state==='merged'));
 assert.match(E.document.getElementById('read').innerHTML,/a₅ = 3\.1415/,'membership explanation identifies the first enclosed value');
 assert.match(E.document.getElementById('read').innerHTML,/a₄ = 3\.141<\/bdi> נמצא מחוץ לקטע הסגול/,'visual merging does not imply interval membership');
 for(let z=1;z<=microscope.maxZoom;z++){
  up.click();labels();assert.equal(svg.getAttribute('data-epsilon'),'0.0001');assert.equal(svg.getAttribute('data-zoom'),String(z));
 }
 assert.equal(up.disabled,true);assert.equal(svg.getAttribute('data-merged-from'),'6');
 assert.ok(microscope.view(2,.0001).terms.some(t=>t.inside&&t.state==='distinct'),'microscope separates points without changing epsilon');
 assert.match(E.document.getElementById('read').innerHTML,/a₅ = 3\.1415<\/bdi> נמצא בתוך הקטע הסגול/);
 assert.match(E.document.getElementById('read').innerHTML,/a₆ = 3\.14159/);
 assert.match(E.document.getElementById('read').innerHTML,/a₇ = 3\.141592/);
 assert.match(E.document.getElementById('read').innerHTML,/עדיין רואים את הנקודה שלו בנפרד/,'the two cutoffs are explained through a visible counterexample');
 assert.match(E.document.getElementById('outside').textContent,/משמאל/);
 epsilon.value='0.01';epsilon.dispatchEvent({type:'change'});labels();
 assert.equal(svg.getAttribute('data-zoom'),'2');
 assert.equal(svg.querySelectorAll('[data-boundary]').length,0,'offscreen boundaries are not falsely shown at window edges');
 assert.equal(Number(svg.querySelector('[data-neighborhood="true"]').getAttribute('width')),645);
 up.click();assert.equal(svg.getAttribute('data-zoom'),'2');
 down.click();down.click();labels();assert.equal(svg.getAttribute('data-merged-from'),'4');assert.equal(down.disabled,true);
}
// Large indices fit the available width by reducing the point count.
for(const width of [320,480,720]){
 const v=A.viewport([1,100000],10000000,'reciprocal',0,width);
 assert.ok((width-103)/v.count>=String(v.last).length*6.5);
}
const subsequences=require('../widgets/ch02/subsequences.js');
for(const kind of ['even','odd','third']){
 const terms=subsequences.terms(kind,8);assert.ok(terms.every((t,i)=>t.value===1/t.n&&(!i||t.n>terms[i-1].n)));
 const E=env();E.context.addEventListener=()=>{};const svg=node(E.document,'svg',{id:'plot'});
 for(const [id,value] of [['selection',kind],['mode','both'],['epsilon','.1']])node(E.document,'select',{id,value});
 for(const id of ['indices','read'])node(E.document,'p',{id});
 E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));E.run(fs.readFileSync('widgets/ch02/subsequences.js','utf8'));
 assert.equal(svg.getAttribute('data-axis'),'n');
 function checkPoints(){for(const p of svg.querySelectorAll('circle')){
  const n=Number(p.getAttribute('data-original-index'));
  assert.equal(Number(p.getAttribute('data-value')),1/n);
  const selected=svg.getAttribute('data-axis')==='k'||terms.some(t=>t.n===n);
  assert.equal(p.getAttribute('fill'),selected?'#7949b8':'#3d77b7','purple marks selected terms; blue marks only unselected terms');
  assert.ok(Number(p.getAttribute('cy'))>22&&Number(p.getAttribute('cy'))<190,'all terms, including a_1=1, stay in view');
  assert.ok(p.querySelector('title').textContent.endsWith(' = 1/'+n));
 }}
 checkPoints();
 const mode=E.document.getElementById('mode');mode.value='only';mode.dispatchEvent({type:'change'});assert.equal(svg.getAttribute('data-axis'),'k');
 checkPoints();
 assert.equal(svg.querySelectorAll('circle').length,8);
 svg.querySelectorAll('circle').forEach((p,i)=>assert.equal(Number(p.getAttribute('data-original-index')),terms[i].n));
}
// Separation uses fractions of the distance, not a fixed pair of numbers.
const neighborhoods=require('../widgets/ch02/neighborhoods.js');
{
 const E=env();E.context.addEventListener=()=>{};const svg=node(E.document,'svg',{id:'plot'}),radius=node(E.document,'select',{id:'radius',value:'3/4'});
 for(const id of ['read','gap'])node(E.document,'p',{id});
 E.run(fs.readFileSync('widgets/ch02/limit-activities.js','utf8'));
 E.run(fs.readFileSync('widgets/ch02/neighborhoods.js','utf8'));
 for(const [fraction,status] of [['3/4','overlap'],['1/2','touch'],['1/4','separate'],['1/8','separate']]){
  radius.value=fraction;radius.dispatchEvent({type:'change'});
  const v=neighborhoods.view(fraction);assert.equal(svg.getAttribute('data-status'),status);
  assert.equal(svg.querySelectorAll('circle').length,6);
  for(const p of svg.querySelectorAll('circle'))assert.ok(Number(p.getAttribute('cx'))>=60&&Number(p.getAttribute('cx'))<=660);
  assert.equal(v.intervals[1][0]-v.intervals[0][1],v.gap);
 }
 assert.equal(neighborhoods.view('1/4').gap,1/2);
 assert.equal(neighborhoods.view('1/2').gap,0);
}
console.log('Sequence visuals: ordinary on-screen points, epsilon-strip scaling, decimal zoom, compact index labels and reindexed subsequences passed. Browser layout is not verified.');
