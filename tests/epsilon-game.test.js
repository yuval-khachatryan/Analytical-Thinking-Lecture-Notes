const assert=require('node:assert/strict'),fs=require('node:fs'),game=require('../widgets/ch02/epsilon-game.js');
for(const L of [-3,-1,-.2,0,1,1.1,3])assert.equal(game.judge(L,'1/2').refuted,true);
for(const L of [-1,1])assert.equal(game.judge(L,'5/2').refuted,false);
assert.equal(game.judge(0,'3/2').refuted,false);assert.equal(game.judge(0,'1/1').refuted,true);
assert.equal(game.judge(NaN,'1/2').valid,false);
assert.deepEqual(game.rounds.map(r=>r.L),[1,-1,0]);
assert.doesNotMatch(fs.readFileSync('widgets/ch02/epsilon-game.html','utf8'),/id="candidate"|מועמד אחר/);
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env();E.context.addEventListener=()=>{};const $=id=>E.document.getElementById(id);
for(const id of ['stages','stage-panel'])node(E.document,'div',{id});
node(E.document,'svg',{id:'plot'});for(const id of ['setup','read','requirement','epsilon-value'])node(E.document,'p',{id});
node(E.document,'select',{id:'epsilon'});node(E.document,'input',{id:'epsilon-range',value:'25'});
for(const id of ['check','reveal','reset'])node(E.document,'button',{id});
for(const f of ['limit-activities.js','epsilon-game.js'])E.run(fs.readFileSync('widgets/ch02/'+f,'utf8'));
const tabs=$('stages').querySelectorAll('button');assert.equal(tabs.length,3);
function slide(n){$('epsilon-range').value=String(n);$('epsilon-range').dispatchEvent({type:'input'});}
for(let i=0;i<3;i++){
 tabs[i].click();$('check').click();assert.match($('read').textContent,/אינה מוכיחה/);
 slide(5);assert.equal($('epsilon').value,'1/2');$('check').click();assert.match($('read').textContent,/✓/);
 assert.match($('read').textContent,/כל שני אינדקסים/);
}
tabs[0].click();assert.equal($('epsilon-range').value,'5');assert.match($('read').textContent,/✓/);
slide(13);assert.equal($('epsilon').value,'13/10');assert.match($('epsilon-value').innerHTML,/<span>13<\/span><span>10<\/span>/);
assert.doesNotMatch($('read').textContent,/✓/,'changing epsilon invalidates the earlier verdict');
$('reveal').click();assert.equal($('epsilon-range').value,'5');assert.match($('read').textContent,/✓/);
$('reset').click();assert.equal($('epsilon-range').value,'25');assert.equal($('epsilon').value,'5/2');
tabs[2].click();slide(10);$('check').click();assert.match($('read').textContent,/שוויון לסף אינו מספיק/);
tabs[2].dispatchEvent({type:'keydown',key:'ArrowLeft'});assert.equal(tabs[0].getAttribute('aria-selected'),'true');
tabs[0].dispatchEvent({type:'keydown',key:'End'});assert.equal(tabs[2].getAttribute('aria-selected'),'true');
assert.equal($('index'),null);
// Every candidate and slider position uses the same axes, with all requested labels.
for(const width of [320,480,720]){
 $('plot').getBoundingClientRect=()=>({width});let fixedPoints,fixedTicks;
 for(const tab of tabs){tab.click();for(let n=1;n<=25;n++){
  slide(n);
  const svg=$('plot'),points=svg.querySelectorAll('circle').map(p=>[p.getAttribute('cx'),p.getAttribute('cy')]);
  const ticks=svg.querySelectorAll('[data-y-tick]').map(t=>[t.getAttribute('data-y-tick'),t.getAttribute('y')]);
  fixedPoints??=points;fixedTicks??=ticks;assert.deepEqual(points,fixedPoints);assert.deepEqual(ticks,fixedTicks);
  assert.deepEqual(ticks.map(t=>t[0]),['-1','0','1']);
  assert.equal(svg.getAttribute('data-y-min'),'-4');assert.equal(svg.getAttribute('data-y-max'),'4');
  const labels=svg.querySelectorAll('[data-band-label]');assert.equal(labels.length,2);
  assert.deepEqual(labels.map(l=>l.textContent),['L + ε','L − ε']);
  assert.ok(Number(labels[1].getAttribute('y'))-Number(labels[0].getAttribute('y'))>=24);
  for(const label of labels){assert.ok(Number(label.getAttribute('x'))+45<width);assert.ok(Number(label.getAttribute('y'))>0&&Number(label.getAttribute('y'))<280);}
  for(const edge of svg.querySelectorAll('[data-band-edge]'))assert.ok(Number(edge.getAttribute('y1'))>=22&&Number(edge.getAttribute('y1'))<=240);
 }}
}
console.log('Epsilon simulation: three candidates, fraction slider, saved choices, reset, fixed axes and separated boundary labels passed at three widths.');
