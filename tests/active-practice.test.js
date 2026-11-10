const fs=require('node:fs'),assert=require('node:assert/strict'),M=require('../assets/interactive.js');
for(const [answer,input] of [['כן',' כן '],['לא','לא.'],['אי-זוגית','אי זוגית'],['אי-זוגית','אי־זוגית'],['לא ניתן לקבוע','לא  ניתן לקבוע']])
 assert.equal(M.checkAnswer('text',answer,input).ok,true,input);
for(const [answer,input] of [['כן','לא'],['לא','לא יודע'],['זוגית','אי-זוגית'],['אי-זוגית','לא זוגית'],['לא ניתן לקבוע','אף אחת מהן']])
 assert.equal(M.checkAnswer('text',answer,input).ok,false,input);
assert.equal(M.checkAnswer('text','כן','').empty,true);
const source=fs.readFileSync('01-Introduction.qmd','utf8');
function block(id){const m=new RegExp('^(:{3,}) \\{#'+id+' .*$', 'm').exec(source);assert.ok(m,id);const rest=source.slice(m.index+m[0].length),end=new RegExp('^'+m[1]+'[ \\t]*$', 'm').exec(rest);assert.ok(end);return m[0]+rest.slice(0,end.index+end[0].length);}
for(const [start,end] of [['## פונקציות וגרפים','## בניית פונקציות'],['## בניית פונקציות','## פונקציות זוגיות'],['## פונקציות זוגיות','## הזזה ומתיחה']]){
 const section=source.slice(source.indexOf(start),source.indexOf(end)),exercises=section.slice(section.indexOf('### תרגילים'));
 assert.doesNotMatch(exercises,/\{\.quiz |:{3,} order/);
}
const parity=block('box-q-parity-operations');
const answers=[...parity.matchAll(/kind="text" ans="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(answers,['זוגית','זוגית','זוגית','לא ניתן לקבוע','אי-זוגית','זוגית','לא ניתן לקבוע','אי-זוגית','זוגית','אי-זוגית','זוגית','אי-זוגית']);
assert.match(block('box-q-domain-order'),/ans="\(0,3\]" plot=/);assert.doesNotMatch(block('box-q-domain-order'),/order\n/);
const decompositions=[...block('box-q-decompose').matchAll(/composition-practice target="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(decompositions,['(x^2+1)^5','sqrt(3x-2)','|x^3-1|']);
for(const [i,f,g] of [[0,'x^5','x^2+1'],[1,'sqrt(x)','3x-2'],[2,'|x|','x^3-1'],[2,'|x-1|','x^3']])
 assert.equal(M.checkComposition(decompositions[i],f,g).ok,true);
assert.equal((block('box-q-write-formula').match(/\n\n\$y =\$/g)||[]).length,4);
assert.match(block('box-q-order-transform'),/move-graph\.html\?f=sq&a=-2&c=-1&d=3/);

const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button};')(require);
for(const rich of [false,true]){
 const E=env(),fill=node(E.document,'div',{class:'fill'}),table=node(fill,'table'),blanks=[];
 answers.forEach((answer,i)=>{const row=i%3===0?node(table,'tr'):table.children.at(-1);blanks.push(node(node(row,'td'),'span',{class:'blank',kind:'text',ans:answer,w:'14'},answer));});
 const explain=node(fill,'div',{class:'explain'},'explanation');
 for(const file of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const fields=blanks.map(b=>b.querySelector('.blank-input'));
 fields.forEach((field,i)=>{
  assert.equal(field.tagName,'INPUT');assert.equal(field.getAttribute('dir'),'rtl');
  assert.equal(blanks[i].querySelector('.blank-answer').hidden,true);field.focus();input(field,answers[i]);
  E.document.dispatchEvent({type:'input',target:field});assert.equal(field.value,answers[i],'Hebrew text is not altered as logical operators');
 });
 assert.equal(fill.querySelector('.ix-local-keys'),null);assert.equal(button(fill,'ניסיון חדש').hidden,false);
 input(fields[0],'אי-זוגית');button(fill,'בדיקה').click();assert.equal(blanks[0].classList.contains('bad'),true);assert.equal(explain.classList.contains('ix-hidden'),true);
 input(fields[0],'זוגית');button(fill,'בדיקה').click();assert.ok(blanks.every(b=>b.classList.contains('ok')));assert.equal(explain.classList.contains('ix-hidden'),false);
 input(fields[0],'אי-זוגית');assert.equal(explain.classList.contains('ix-hidden'),true);assert.doesNotMatch(fill.querySelector('.ix-msg').textContent,/כל התשובות נכונות/);
 button(fill,'ניסיון חדש').click();assert.ok(fields.every(f=>f.value===''));assert.ok(blanks.every(b=>!b.classList.contains('ok')));
 button(fill,'הצגת התשובות').click();assert.ok(fields.every(f=>f.hidden));assert.ok(blanks.every(b=>b.querySelector('.blank-answer').hidden===false));
 button(fill,'ניסיון חדש').click();assert.ok(fields.every(f=>f.hidden===false&&f.value===''));assert.ok(blanks.every(b=>b.querySelector('.blank-answer').hidden));
 input(fields[0],'זוגית');fields[0].dispatchEvent({type:'keydown',key:'Enter'});assert.equal(blanks[0].classList.contains('ok'),true);
}
console.log('Active practice: written exercises, parity table, text feedback, keyboard checking, reset/reveal, composition choices and graph target passed.');
