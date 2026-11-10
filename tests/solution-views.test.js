const fs=require('node:fs'),assert=require('node:assert/strict');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button,selectAction}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+'\nreturn {env,node,input,button,selectAction};')(require);
for(const rich of [false,true]){
 const E=env(),fixtures=[];
 for(const [start,last,answer,question] of [['3-2x<7','x>-2','(-2,inf)',false],['x^2+2x+1','(x+1)^2','(x+1)^2',true]]){
  const box=node(E.document,'div',{class:question?'thmbox-question':'thmbox-example'}),d=node(box,'div',{class:'derive',start});
  node(d,'div',{class:'step','data-line':last},'model explanation');
  const fill=node(box,'div',{class:'fill'}),blank=node(node(fill,'p'),'span',{class:'blank','data-ans':answer,...(!question?{'data-plot':'-2,0,2'}:{})},answer);
  fixtures.push({box,d,fill,blank});
 }
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const {d,fill,blank}=fixtures[0],work=d.querySelector('.pw-workspace'),model=d.querySelector('.pw-solution'),views=d.querySelector('.pw-views');
 const workTab=button(d,'כתיבת פתרון'),modelTab=button(d,'פתרון לדוגמה');
 assert.equal(work.hidden,true);assert.equal(model.hidden,true);assert.equal(views.querySelector('.pw-view-panels').hidden,true);
 assert.equal(workTab.getAttribute('aria-selected'),'false');assert.equal(workTab.getAttribute('role'),'tab');
 assert.equal(work.getAttribute('aria-labelledby'),workTab.getAttribute('id'));
 assert.equal(modelTab.getAttribute('aria-controls'),model.getAttribute('id'));
 // Merely navigating between tabs must not reveal the answer.
 let focused=false;const focus=modelTab.focus.bind(modelTab);modelTab.focus=()=>{focused=true;focus();};
 workTab.dispatchEvent({type:'keydown',key:'ArrowLeft'});assert.equal(focused,true);assert.equal(model.hidden,true);
 assert.equal(modelTab.getAttribute('tabindex'),'0');
 workTab.click();assert.equal(work.hidden,false);assert.equal(model.hidden,true);
 const field=work.querySelector('.pw-input');field.focus();input(field,'-2x<4');
 const action=selectAction(d.querySelector('.as-step'),'sub');input(action.querySelector('.as-justification-value'),'3');
 input(blank.querySelector('.blank-input'),'(-2,inf)');
 const plot=fill.querySelector('.set-plot');button(plot,'נקודה').click();input(plot.querySelector('[data-coordinate="point"]'),'3');button(plot,'הנחה על הישר').click();
 const help=work.querySelector('.pw-help');help.open=true;work.scrollTop=70;
 modelTab.click();assert.equal(model.hidden,false);assert.equal(work.hidden,true);assert.equal(model.getAttribute('role'),'tabpanel');
 assert.equal(model.querySelectorAll('.sp-answer').length,1);assert.equal(model.querySelectorAll('.as-model-references').length,1);
 const formulaCount=model.querySelectorAll('.as-model-references').length;model.scrollTop=45;
 button(d,'השוואה').click();assert.equal(views.classList.contains('pw-comparing'),true);
 assert.equal(work.hidden,false);assert.equal(model.hidden,false);assert.equal(work.scrollTop,70);
 assert.equal(work.getAttribute('role'),'region');assert.equal(views.querySelector('.pw-tabs').hidden,true);
 button(d,'חזרה ללשוניות').click();assert.equal(work.hidden,true);assert.equal(model.hidden,false,'return to the model tab, not always the writing tab');
 assert.equal(model.scrollTop,45);assert.equal(model.querySelectorAll('.as-model-references').length,formulaCount,'model references are not duplicated');
 workTab.click();assert.equal(work.querySelector('.pw-input'),field,'switching must retain the actual editor');
 assert.equal(E.context.CourseMathInput.read(field),'-2x<4');assert.equal(help.open,true);
 assert.equal(E.context.CourseMathInput.read(blank.querySelector('.blank-input')),'(-2,inf)');assert.ok(plot.querySelector('[data-point="3"]'));
 button(d,'השוואה').click();button(d,'מההתחלה').click();
 assert.equal(views.classList.contains('pw-comparing'),true,'reset changes student work, not the chosen view');assert.equal(model.hidden,false);
 assert.equal(work.querySelector('.pw-input').value,'');assert.equal(work.querySelectorAll('.as-given').length,1);
 button(d,'חזרה ללשוניות').click();assert.equal(work.hidden,false);assert.equal(model.hidden,true);
 button(d,'סגירה').click();assert.equal(work.hidden,true);assert.equal(model.hidden,true);
 button(d,'השוואה').click();assert.equal(work.hidden,false);assert.equal(model.hidden,false,'comparison can be opened directly');
 const other=fixtures[1];button(other.d,'כתיבת פתרון').click();
 assert.equal(work.hidden,true);assert.equal(model.hidden,true,'opening another exercise closes both comparison panels');
 const otherField=other.d.querySelector('.pw-input');otherField.focus();input(otherField,'x*x+2*x+1');
 button(other.d,'פתרון לדוגמה').click();button(other.d,'השוואה').click();button(other.d,'חזרה ללשוניות').click();
 assert.equal(E.context.CourseMathInput.read(otherField),'x*x+2*x+1');
 assert.equal(other.d.querySelector('.pw-workspace').hidden,true);assert.equal(other.d.querySelector('.pw-solution').hidden,false);
 // A reference copy has a visible model answer and no dead tab controls.
 const ref=node(node(E.document,'p'),'a',{href:'#box-view-example'},'example');fixtures[0].box.setAttribute('id','box-view-example');
 E.document.dispatchEvent({type:'click',target:ref,button:0});const copy=E.document.querySelector('.xref-panel');
 assert.ok(copy);assert.equal(copy.querySelector('.pw-view-controls'),null);assert.equal(copy.querySelector('.pw-workspace'),null);
 assert.equal(copy.querySelector('.pw-solution').hidden,false);assert.equal(copy.querySelector('.pw-view-panels').hidden,false);
}
console.log('Solution views passed: tabs, comparison, keyboard navigation, drafts, plots, reset, independent questions and static reference copies.');
