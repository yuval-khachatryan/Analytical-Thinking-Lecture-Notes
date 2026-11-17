const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,button};')(require);
const source=fs.readFileSync('assets/interactive.js','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&quot;/g,'"')]));
// Reproduce the actual case solution, including scope conditions and final merge.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'1/x<2'});
 const qmd=fs.readFileSync('01-Introduction.qmd','utf8').split('#box-exm-cases-ineq')[1].split('### ערך מוחלט')[0];
 for(const m of qmd.matchAll(/::: \{\.step ([^\n]+)\}\n([^]*?)\n:::/g))node(d,'div',{class:'step',...attrs(m[1])},m[2]);
 E.run(source);E.document.dispatchEvent({type:'DOMContentLoaded'});button(d,'פתרון לדוגמה').click();
 const model=d.querySelector('.pw-solution'),clean=model.querySelector('.as-clean-text');
 assert.equal(model.getAttribute('data-model-checked'),'true');assert.equal(clean.querySelectorAll('.as-clean-formula').length,12);
 assert.equal(clean.querySelectorAll('textarea').length,0);
 assert.match(clean.textContent,/המכנה/,'zero-denominator explanation retained');
 assert.match(clean.textContent,/החיתוכים עם תנאי המקרים/,'merge keeps its mathematical explanation');
 assert.doesNotMatch(clean.textContent,/סיום המקרה מצטט|לפי שורה|פעולות על האגפים|cases|partition/);
 for(const formula of clean.querySelectorAll('.as-clean-formula'))assert.match(formula.innerHTML,/math/, 'mathematical output uses the normal renderer');
}
// Generated case rows must not duplicate one authored explanation.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'x^3-9x=0'});
 for(const [line,note] of [['x(x^2-9)=0','factor note'],['x(x-3)(x+3)=0','squares note'],['x=0 או x=3 או x=-3','zero-product explanation']])node(d,'div',{class:'step',line},note);
 E.run(source);E.document.dispatchEvent({type:'DOMContentLoaded'});button(d,'פתרון לדוגמה').click();
 assert.equal(d.querySelector('.pw-solution').getAttribute('data-model-checked'),'true');
 assert.equal(d.querySelector('.as-clean-text').textContent.split('zero-product explanation').length-1,1);
}
// Authored clean alternatives preserve TeX while omitting teaching-menu directions.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'lim(3)',limit:'n'});
 node(d,'div',{class:'step',line:'3',action:'standard',clean:'גבול הסדרה הקבועה $3$ הוא $3$.'},'בחרו כללי גבולות ← גבול מוכר');
 E.run(source);E.document.dispatchEvent({type:'DOMContentLoaded'});button(d,'פתרון לדוגמה').click();
 const clean=d.querySelector('.as-clean-text');assert.match(clean.textContent,/\\\(3\\\)/);assert.doesNotMatch(clean.textContent,/בחרו|←|\$3\$/);
}
// Named results remain expandable references in the clean prose alternative.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'lim(3)',limit:'n'});
 node(d,'div',{class:'step',line:'3',action:'standard',clean:'לפי [גבולות מוכרים](#box-thm-standard), הגבול הוא $3$.'});
 E.run(source);E.document.dispatchEvent({type:'DOMContentLoaded'});button(d,'פתרון לדוגמה').click();
 const html=d.querySelector('.as-clean-text').querySelectorAll('.as-clean-reason').map(n=>n.innerHTML).join('');
 assert.match(html,/<a href="#box-thm-standard" target="_blank" rel="noopener">גבולות מוכרים<\/a>/);
 assert.doesNotMatch(html,/\[גבולות מוכרים\]/);
}
console.log('Clean solutions: rendered formulas, authored prose, case conditions, merge explanations and one explanation per expanded transition passed.');
