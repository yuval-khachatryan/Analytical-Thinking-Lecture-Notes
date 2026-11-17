const assert=require('node:assert/strict'),fs=require('node:fs');
const I=require('../assets/math-input.js'),M=require('../assets/interactive.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);

// The external keyboard control targets its own mounted field without changing
// the formula or selection, even when another field previously had focus.
{
 const E=env(),opened=[];
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>E.context.MathfieldElement};
 E.context.mathVirtualKeyboard={show(){opened.push(E.document.activeElement);}};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput;
 const fields=[api.create({},'expr'),api.create({},'expr')];
 for(const field of fields){
  assert.equal(field.querySelector('.mi-keyboard-button'),null,'no button before mounting');
  E.document.appendChild(field);
  field.control.focus=()=>{E.document.activeElement=field.control;};
  field.value=String.raw`\frac{a_{n_k}}{2}`;
  field.control.selection={ranges:[[2,4]],direction:'forward'};
 }
 for(const field of fields){
  const toggle=field.querySelector('.mi-keyboard-button');
  assert.equal(toggle.parentNode,field,'button is a sibling of the input');
  assert.equal(toggle.getAttribute('type'),'button','must not submit an exercise');
  assert.equal(toggle.getAttribute('aria-label'),'פתיחת מקלדת מתמטית');
  assert.equal(field.control.getAttribute('math-virtual-keyboard-policy'),'manual');
  let prevented=false;
  toggle.dispatchEvent({type:'pointerdown',preventDefault(){prevented=true;}});
  assert.equal(prevented,true,'tapping the control preserves the mathfield selection');
  E.document.activeElement=fields.find(f=>f!==field).control;
  toggle.dispatchEvent({type:'click',stopPropagation(){}});
  assert.equal(opened.at(-1),field.control);
  assert.equal(field.value,String.raw`\frac{a_{n_k}}{2}`);
  assert.deepEqual(field.control.selection,{ranges:[[2,4]],direction:'forward'});
  field.remove();E.document.appendChild(field);
  assert.equal(field.querySelectorAll('.mi-keyboard-button').length,1,'no duplicate on remount');
 }
 const disabled=api.create({disabled:''},'expr');E.document.appendChild(disabled);
 assert.equal(disabled.querySelector('.mi-keyboard-button'),null);
}

// Real MathLive requires a connected editor for menu/shortcut access and emits
// mount asynchronously. Exercise panels and rows are often assembled detached.
for(const change of ['value','incomplete','selection','focus-elsewhere','configuration-error']){
 const E=env(),warnings=[];
 E.document.deferMathMounts=true;
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>E.context.MathfieldElement};
 E.context.console={...console,warn:(...args)=>warnings.push(args)};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput;api.configure({toLatex:s=>s?M.tex(M.parseExpr(s)):''});
 const field=api.create({'aria-label':'initial'},'expr'),native=field.control;
 const rich=field.querySelector('math-field');
 assert.equal(native.tagName,'INPUT','detached fields keep usable native input');
 assert.throws(()=>rich.menuItems,/Mathfield not mounted/);
 assert.throws(()=>rich.inlineShortcuts,/Mathfield not mounted/);
 assert.equal(rich.hidden,true);
 field.value='1/2';field.setSelectionRange(3,3);
 E.document.appendChild(field);
 field.upgrade();field.upgrade();assert.equal(field.querySelectorAll('math-field').length,1);
 assert.equal(field.control,native,'wait for mount event before replacing native control');
 field.value=change==='incomplete'?'3/':'3/4';
 field.setSelectionRange(change==='selection'?0:field.value.length,field.value.length);
 field.setAttribute('aria-label','updated');
 E.document.activeElement=change==='focus-elsewhere'?E.document:native;
 let focusCount=0,caret;
 rich.focus=()=>{focusCount++;E.document.activeElement=rich;};
 rich.executeCommand=c=>{caret=c;};
 if(change==='configuration-error')Object.defineProperty(rich,'menuItems',{set(){throw Error('forced option failure');}});
 E.document.flushMathMounts();
 if(['incomplete','selection','configuration-error'].includes(change)){
  assert.equal(field.control,native);assert.equal(field.value,change==='incomplete'?'3/':'3/4');
  assert.equal(field.querySelector('math-field'),null,'discard failed/pending editor without discarding draft');
  assert.equal(warnings.length,change==='configuration-error'?1:0);
  if(change!=='configuration-error'){
   field.value='3/4';field.setSelectionRange(3,3);field.focus();E.document.flushMathMounts();
   assert.equal(field.control.tagName,'MATH-FIELD','temporary draft/selection protection is retryable');
  }
 }else{
  assert.equal(field.control,rich);assert.equal(native.parentNode,null);assert.equal(rich.hidden,false);
  assert.equal(rich.value,String.raw`\frac{3}{4}`,'use newest draft, not the value at construction');
  assert.equal(rich.getAttribute('aria-label'),'updated');
  assert.equal(rich.inlineShortcuts.sqrt,I.templates['sqrt()']);
  assert.equal(focusCount,change==='focus-elsewhere'?0:1);
  if(focusCount)assert.equal(caret,'moveToMathfieldEnd');
  field.value=String.raw`a_{n_k}`;field.remove();E.document.appendChild(field);E.document.flushMathMounts();
  assert.equal(field.value,String.raw`a_{n_k}`,'view switching/remounting does not replace the draft');
  assert.equal(warnings.length,0);
 }
}

// Registration can finish after the library's load event. Activate the focused
// field then, preserving its value; a selected/incomplete draft stays untouched.
for(const draft of ['', 'a_m', 'a_(n_k)', '1/']){
 const E=env();E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput;api.configure({toLatex:s=>s?M.tex(M.parseExpr(s)):''});
 const field=api.create({class:'input'},'expr');E.document.appendChild(field);
 field.value=draft;field.setSelectionRange(draft.length,draft.length);field.focus();E.document.activeElement=field.control;
 let registered=false,onDefined;
 E.context.customElements={get:()=>registered?function(){}:undefined,whenDefined:()=>({then:fn=>{onDefined=fn;}})};
 api.load();E.document.head.querySelector('script').dispatchEvent({type:'load'});
 assert.equal(field.control.tagName,'INPUT');registered=true;onDefined();
 assert.equal(field.control.tagName,draft==='1/'?'INPUT':'MATH-FIELD');
 if(draft!=='1/')assert.equal(api.read(field),I.latexToPlain(draft?M.tex(M.parseExpr(draft)):''));
}

// Physical keys and toolbar buttons use the same structural insertion, including
// an implicit numerator/selected expression and editable denominator/subscript.
{
 const E=env();E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput,field=api.create({},'expr');E.document.appendChild(field);
 assert.equal(field.control.tagName,'MATH-FIELD','available rich editor is used at creation');
 const calls=[];field.control.insert=(latex,opts)=>calls.push({latex,opts});
 for(const [key,template] of [['/','/'],['^','^'],['_','_'],['√','sqrt()']]){
  let prevented=false;
  field.control.dispatchEvent({type:'keydown',key,preventDefault(){prevented=true;},stopPropagation(){},stopImmediatePropagation(){}});
  assert.equal(prevented,true);assert.equal(calls.at(-1).latex,I.templates[template]);
  assert.equal(calls.at(-1).opts.selectionMode,'placeholder');
 }
 const before=calls.length;
 for(const extra of [{ctrlKey:true},{metaKey:true},{isComposing:true}])
  field.control.dispatchEvent({type:'keydown',key:'/',...extra});
 assert.equal(calls.length,before,'composition and modified shortcuts remain intact');
 assert.equal(field.control.inlineShortcuts.sqrt,I.templates['sqrt()']);
 for(const latex of [String.raw`\frac{1}{\placeholder{}}`,String.raw`\sqrt{\placeholder{}}`,String.raw`a_{n_{\placeholder{}}}`]){
  field.value=latex;assert.throws(()=>api.read(field),/מקום ריק/);
 }
 field.value=String.raw`\frac{a_{n_k}}{\sqrt{a_m^2+1}}`;
 assert.equal(M.tex(M.parseExpr(api.read(field))),String.raw`\frac{a_{n_{k}}}{\sqrt{a_{m}^{2} + 1}}`);
}

// The preview remains visible with rich input; an unfinished nested structure
// clears it and cannot be recorded as a completed proof step.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'a_(n_k)-1<2',vars:'k',positive:'k'});
 node(d,'div',{class:'step',line:'a_(n_k)<3',action:'add',value:'1'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
 button(d,'כתיבת פתרון').click();const row=d.querySelector('.as-step'),field=row.querySelector('.pw-input');
 field.focus();input(field,String.raw`a_{n_k}<3`);
 assert.ok(row.querySelector('.pw-preview').innerHTML.includes('a_{n_{k}}'));
 input(field,String.raw`a_{n_{\placeholder{}}}<3`);
 assert.equal(row.querySelector('.pw-preview').innerHTML,'');
 assert.equal(row.querySelector('.as-editor').hidden,false);
}
console.log('Structured input: guarded mounting, delayed readiness, preserved drafts/selection/focus, fallback, fraction/root/power/subscript keys, nested indices, incomplete slots and retained previews passed.');
