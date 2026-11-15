const assert=require('node:assert/strict'),fs=require('node:fs'),game=require('../widgets/ch02/epsilon-game.js');
for(const L of [-3,-1,-.2,0,1,1.1,3])assert.equal(game.judge(L,'1/2').refuted,true);
for(const L of [-1,1])assert.equal(game.judge(L,'5/2').refuted,false);
assert.equal(game.judge(0,'3/2').refuted,false);assert.equal(game.judge(0,'1/1').refuted,true,'Strict boundaries remain outside');
assert.equal(game.judge(NaN,'1/2').valid,false);
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node};')(require);
const E=env();E.context.addEventListener=()=>{};const $=id=>E.document.getElementById(id);
for(const id of ['stages','stage-panel','candidate-label'])node(E.document,'div',{id});
node(E.document,'svg',{id:'plot'});for(const id of ['setup','read'])node(E.document,'p',{id});
node(E.document,'select',{id:'epsilon'});node(E.document,'input',{id:'candidate'});
for(const id of ['check','reveal','reset'])node(E.document,'button',{id});
for(const f of ['limit-activities.js','epsilon-game.js'])E.run(fs.readFileSync('widgets/ch02/'+f,'utf8'));
const tabs=$('stages').querySelectorAll('button');assert.equal(tabs.length,4);
for(let i=0;i<3;i++){
 tabs[i].click();assert.equal($('candidate-label').hidden,true);$('check').click();assert.match($('read').textContent,/אינה מוכיחה/);
 $('epsilon').value='1/2';$('epsilon').dispatchEvent({type:'change'});$('check').click();assert.match($('read').textContent,/✓/);
}
tabs[0].click();assert.equal($('epsilon').value,'1/2');assert.match($('read').textContent,/✓/);
tabs[3].click();assert.equal($('candidate-label').hidden,false);$('candidate').value='0.2';$('candidate').dispatchEvent({type:'input'});$('reveal').click();assert.equal($('epsilon').value,'1/2');assert.match($('read').textContent,/✓/);
$('reset').click();assert.equal($('candidate').value,'2');assert.equal($('epsilon').value,'5/2');
$('candidate').value='';$('candidate').dispatchEvent({type:'input'});assert.match($('read').textContent,/כתבו מועמד/);
tabs[3].dispatchEvent({type:'keydown',key:'Home'});assert.equal(tabs[0].getAttribute('aria-selected'),'true');
assert.equal($('index'),null,'The counterexample activity has no tail selector');
console.log('Epsilon counterexample game: candidates, strict boundaries, saved tabs, reveal/reset and no tail controls passed.');
