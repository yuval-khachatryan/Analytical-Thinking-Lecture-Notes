// DOM-level smoke checks without browser dependencies. This does not test layout.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.attrs={};this.children=[];this.listeners={};this.style={};this.value='';this._text='';this.dataset={};this.nodeType=1;this.classList={contains:c=>this.className.split(' ').includes(c),add:(...cs)=>this.className=[...new Set(this.className.split(' ').concat(cs))].filter(Boolean).join(' '),remove:(...cs)=>this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' '),toggle:(c,on)=>{if(on===undefined)on=!this.classList.contains(c);this.classList[on?'add':'remove'](c);}};}
 get className(){return this.attrs.class||'';} set className(s){this.attrs.class=s;}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(s){this.children=[];this._text=String(s);}
 get innerHTML(){return this._text;}set innerHTML(s){this.textContent=s;}
 get parentElement(){return this.parentNode;}get firstChild(){return this.children[0]||null;}
 get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]||null;}
 get previousSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)-1]||null;}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=String(v);if(k==='width'||k==='height')this[k]=+v;}
 getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 appendChild(n){n.remove();this.children.push(n);n.parentNode=this;return n;}
 insertBefore(n,b){if(!b)return this.appendChild(n);n.remove();this.children.splice(this.children.indexOf(b),0,n);n.parentNode=this;return n;}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}}
 replaceChildren(...cs){this.children.forEach(c=>c.parentNode=null);this.children=[];this._text='';cs.forEach(c=>this.appendChild(c));}
 matches(sel){return sel.split(',').some(s=>{s=s.trim();const a=/^([\w-]+)?\[([^=^\]]+)(?:(\^?=)["']?([^"'\]]+)["']?)?\]$/.exec(s);if(a)return (!a[1]||this.tagName===a[1].toUpperCase())&&this.attrs[a[2]]!==undefined&&(!a[3]||(a[3]==='^='?this.attrs[a[2]].startsWith(a[4]):this.attrs[a[2]]===a[4]));if(s.startsWith('#'))return this.attrs.id===s.slice(1);const parts=s.split('.');return (!parts[0]||this.tagName===parts[0].toUpperCase())&&parts.slice(1).every(c=>this.classList.contains(c));});}
 closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(t,f){(this.listeners[t]??=[]).push(f);}dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{};for(const f of this.listeners[e.type]||[])f.call(this,e);if(this['on'+e.type])this['on'+e.type](e);return true;}
 click(){this.dispatchEvent({type:'click'});}focus(){this.dispatchEvent({type:'focus'});}blur(){this.dispatchEvent({type:'blur'});}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:760,height:400};}
 getContext(){return new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
 cloneNode(deep){const n=new Element(this.tagName);n.attrs={...this.attrs};n._text=this._text;n.value=this.value;if(deep)this.children.forEach(c=>n.appendChild(c.cloneNode(true)));return n;}
}
function env(){
 const document=new Element('document');document.readyState='loading';document.createElement=t=>new Element(t);document.createElementNS=(_,t)=>new Element(t);document.createTextNode=s=>{const n=new Element('text');n.textContent=s;return n;};document.getElementById=id=>document.querySelector('#'+id);
 document.head=document.appendChild(new Element('head'));
 const context={document,console,URLSearchParams,structuredClone,location:{search:''},setTimeout:()=>{},clearTimeout:()=>{},Event:class{constructor(type){this.type=type;}}};context.window=context;context.MathJax={typeset:()=>{},typesetClear:()=>{}};
 return {document,context:vm.createContext(context),run:s=>vm.runInContext(s,context)};
}
function node(parent,tag,attrs={},text=''){const n=new Element(tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));n.textContent=text;parent.appendChild(n);return n;}
function button(root,label){const b=root.querySelectorAll('button').find(n=>n.textContent===label);assert.ok(b,'missing button '+label);return b;}
function input(n,value){n.value=value;n.dispatchEvent({type:'input'});}
const actionCategories={sides:['add','sub','mul','div','swap'],simplify:['simplify','replace','conditions','conditionReplace','combine'],cases:['splitCustom','splitSign','splitOr','endCase','abs','merge'],rules:['sqrt','cbrt','cube','zero','formula','log','exp']};
function selectAction(row,op,i=0){
 const entry=row.querySelectorAll('.as-justification-entry')[i],category=entry.querySelector('.as-action-category'),select=entry.querySelector('.as-justification-rule');
 const group=Object.keys(actionCategories).find(g=>actionCategories[g].includes(op));
 if(category.value!==group){category.value=group;category.dispatchEvent({type:'change'});}
 select.value=op;select.dispatchEvent({type:'change'});return entry;
}
function actionTool(row,op){selectAction(row,op);return row.querySelector({abs:'.as-absolute',replace:'.as-replacements',conditionReplace:'.as-conditions'}[op]);}
function previewAction(target){return button(target.closest('.as-step'),'הצגת התוצאה הצפויה');}
function partitionCases(row,conditions,excluded=[]){
 const tool=selectAction(row,'splitCustom');
 while(tool.querySelectorAll('.as-case-condition').length<conditions.length)button(tool,'הוספת מקרה').click();
 const fields=tool.querySelectorAll('.as-case-definition');
 conditions.forEach((condition,i)=>{
  input(fields[i].querySelector('.as-case-condition'),condition);
  if(excluded[i]){const mode=fields[i].querySelector('.as-case-mode');mode.value='exclude';mode.dispatchEvent({type:'change'});input(fields[i].querySelector('.as-case-evidence'),excluded[i]);}
 });
 button(row,'הצגת התוצאה הצפויה').click();button(row.querySelector('.as-action-preview'),'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 return row.parentNode.children[row.parentNode.children.indexOf(row)+1];
}
function justify(row,actions){
 const edit=row.querySelector('.as-justification-notice')?.querySelector('button');if(edit)edit.click();
 while(row.querySelectorAll('.as-justification-entry').length>1)row.querySelectorAll('.as-justification-entry').at(-1).querySelector('button').click();
 actions.forEach((action,i)=>{
  if(i)button(row,'צירוף פעולה').click();
  const entry=selectAction(row,action.op,i);
  if(action.value)input(entry.querySelector('.as-justification-value'),action.value);
 });
}
// A stalled/failed optional download must not expose answers or disable checking.
assert.doesNotMatch(fs.readFileSync('_styles.html','utf8'), /<script\b[^>]*src=["'][^"']*mathlive/i);
for (const failure of ['pending','network','config','construct','value','mount','late']) {
 const E=env(), fill=node(E.document,'div',{class:'fill'}), p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'3/4',form:'frac'});
 node(blank,'span',{class:'math'},String.raw`\(\frac34\)`);
 const solve=node(E.document,'div',{class:'solve'}),step=node(solve,'div',{class:'step'},'worked solution');
 const quiz=node(E.document,'div',{class:'tf-quiz','data-correct':'yes'});
 node(quiz,'button',{class:'tf-opt','data-val':'yes'},'yes');node(quiz,'div',{class:'tf-feedback'});
 E.context.addEventListener=()=>{};
 // Run the actual quiz/reveal handlers, in addition to the exercise script.
 for(const m of fs.readFileSync('_styles.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  if(m[1].includes('querySelectorAll(".tf-quiz")')||m[1].includes('querySelectorAll(".solve")'))E.run(m[1]);
 }
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 E.run(fs.readFileSync('assets/interactive.js','utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input'),answer=blank.querySelector('.blank-answer');
 const script=E.document.head.querySelector('script');
 assert.equal(script.async,true);assert.equal(answer.hidden,true);assert.equal(field.control.tagName,'INPUT');
 assert.equal(step.classList.contains('solve-hidden'),true);
 button(solve,'כל הפתרון').click();assert.equal(step.classList.contains('solve-hidden'),false);
 button(solve,'הסתרה').click();assert.equal(step.classList.contains('solve-hidden'),true);
 assert.equal(quiz.classList.contains('tf-js'),true);button(quiz,'yes').click();assert.match(quiz.textContent,/נכון/);
 if(failure==='network') {
  script.dispatchEvent({type:'error'});
  const backup=E.document.head.querySelector('script');
  assert.match(backup.src,/^https:\/\/unpkg\.com\/mathlive@0\.111\.4\//);
  assert.equal(backup.async,true);backup.dispatchEvent({type:'error'});
  assert.equal(E.document.head.querySelectorAll('script').length,0);
 }
 input(field,'3/4');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 if(!['pending','network'].includes(failure)) {
  E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
  if(failure==='config')Object.defineProperty(E.context.MathfieldElement,'fontsDirectory',{set(){throw Error('configuration failure');}});
  const create=E.document.createElement;
  E.document.createElement=t=>{
   if(t==='math-field'&&failure==='construct')throw Error('construction failure');
   const n=create(t);
   if(t==='math-field'&&failure==='value')Object.defineProperty(n,'value',{set(){throw Error('value failure');}});
   return n;
  };
  if(failure==='mount'){const append=field.appendChild;field.appendChild=function(n){if(n.tagName==='MATH-FIELD')throw Error('mount failure');return append.call(this,n);};}
  if(failure==='late') {
   input(field,'3/');field.focus();assert.equal(field.control.tagName,'INPUT');assert.equal(field.value,'3/');
   input(field,'3/4');field.setAttribute('aria-label','updated label');
  }
  field.focus();
  assert.equal(field.control.tagName,failure==='late'?'MATH-FIELD':'INPUT');
  if(failure==='late')assert.equal(field.control.getAttribute('aria-label'),'updated label');
  button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 }
 button(fill,'הצגת התשובה').click();assert.equal(answer.hidden,false);assert.equal(field.hidden,true);
 button(fill,'ניסיון חדש').click();assert.equal(answer.hidden,true);assert.equal(field.hidden,false);assert.equal(field.value,'');
 field.control.value='1/2';field.control.dispatchEvent({type:'input',stopPropagation(){}});
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),false);
 E.context.CourseMathInput.load();assert.ok(E.document.head.querySelectorAll('script').length<=1);
}
// A library arriving during editing upgrades a safe draft, without stealing focus or selection.
for(const draft of ['','3/4','3/','selected','elsewhere']) {
 const E=env();E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput;
 api.configure({toLatex:s=>{if(s==='3/')throw Error('incomplete');return s==='3/4'?String.raw`\frac34`:s;}});
 const field=api.create({class:'test-input'},'num');E.document.appendChild(field);
 field.value=['selected','elsewhere'].includes(draft)?'3/4':draft;
 field.setSelectionRange(draft==='selected'?0:field.value.length,field.value.length);
 field.focus();const native=field.control;
 E.document.activeElement=draft==='elsewhere'?E.document:native;
 api.load();const script=E.document.head.querySelector('script');
 // Some MathLive distributions expose their constructor only through the custom-element registry.
 function Mathfield(){} E.context.customElements={get:()=>Mathfield};
 script.dispatchEvent({type:'load'});
 const safe=draft===''||draft==='3/4';
 assert.equal(field.control.tagName,safe?'MATH-FIELD':'INPUT');
 assert.equal(field.value,safe&&draft?String.raw`\frac34`:native.value);
 if(safe)assert.match(Mathfield.fontsDirectory,/\/mathlive@0\.111\.4\/fonts$/);
 else assert.ok(field.control===native);
 if(draft==='selected') {
  api.insert(field,'^');assert.equal(field.control.tagName,'INPUT');
  assert.equal(field.value,'(3/4)^()');assert.equal(field.selectionStart,7);
 }
}
// Both keyboard and keypad fractions/powers work while the optional rich editor is unavailable.
{
 const E=env();E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput,field=api.create({class:'test-input'},'expr');E.document.appendChild(field);
 function key(key,extra={}){let prevented=false;field.control.dispatchEvent({type:'keydown',key,preventDefault(){prevented=true;},stopPropagation(){},...extra});return prevented;}
 field.setSelectionRange(0,0);assert.equal(key('/'),true);assert.equal(field.value,'()/()');assert.equal(field.selectionStart,1);
 assert.equal(key('Tab'),true);assert.equal(field.selectionStart,4);
 assert.equal(key('Tab',{shiftKey:true}),true);assert.equal(field.selectionStart,1);
 field.value='(x+1)/()';field.setSelectionRange(7,7);
 assert.equal(key('Tab'),false); // Normal focus navigation once there are no more slots.
 field.value='(x+1)/(2)';field.setSelectionRange(8,8);
 assert.equal(key(')'),true);assert.equal(field.selectionStart,9);assert.equal(field.value,'(x+1)/(2)');
 field.value='x';field.setSelectionRange(1,1);assert.equal(key('^'),true);assert.equal(field.value,'x^()');assert.equal(field.selectionStart,3);
 field.value='x+1';field.setSelectionRange(0,3);api.insert(field,'/');assert.equal(field.value,'(x+1)/()');assert.equal(field.selectionStart,7);
 field.value='';field.setSelectionRange(0,0);assert.equal(key('^',{ctrlKey:true}),false);assert.equal(field.value,'');
 assert.equal(key('/',{isComposing:true}),false);assert.equal(field.value,'');
}
// Every interval shortcut inserts both fences and leaves an editable interior.
for(const rich of [false,true]) for(const pair of ['()','[]','[)','(]']) {
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const answer=pair[0]+'1,3'+pair[1];
 const blank=node(p,'span',{class:'blank','data-ans':answer});
 node(blank,'span',{class:'math'},'\\('+answer+'\\)');
 E.run(fs.readFileSync('assets/math-input.js','utf8'));E.run(fs.readFileSync('assets/interactive.js','utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input');
 if(rich){
  E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();
  let inserted;
  field.control.insert=(value,options)=>{inserted={value,options};};
  button(fill,pair[0]+' '+pair[1]).click();
  assert.equal(inserted.options.selectionMode,'placeholder');
  input(field,inserted.value.replace('#0','1,3'));
 } else {
  field.focus();field.setSelectionRange(0,0);button(fill,pair[0]+' '+pair[1]).click();
  assert.equal(field.value,pair);assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,1);
  input(field,field.value.slice(0,field.selectionStart)+'1,3'+field.value.slice(field.selectionEnd));
 }
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true,answer);
}
// A single keypad belongs to the focused answer or coordinate, never below the sketch.
for (const rich of [false,true]) {
 const E=env(),fill=node(E.document,'div',{class:'fill'});
 const a=node(node(fill,'p'),'span',{class:'blank','data-ans':'[2,7]'});
 const b=node(node(fill,'p'),'span',{class:'blank','data-ans':'[2,7]','data-plot':'0,2,7,9'});
 for(const blank of [a,b])node(blank,'span',{class:'math'},String.raw`\([2,7]\)`);
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const first=a.querySelector('.blank-input'),second=b.querySelector('.blank-input'),plot=fill.querySelector('.set-plot');
 assert.equal(fill.querySelector('.ix-local-keys'),null);
 first.focus();let keys=fill.querySelector('.ix-local-keys');
 assert.ok(keys.parentNode===first.parentNode);assert.equal(fill.querySelector('.ix-panel').querySelector('.ix-keys'),null);
 for(const [label,value] of [['וגם',' וגם '],['ולא',' ולא '],['לא',' לא '],['∖',' ∖ '],['∩',' ∩ '],['≠','≠'],['x<sup>□</sup>','^']]) {
  first.value='';first.setSelectionRange(0,0);
  let inserted;if(rich)first.control.insert=v=>{inserted=v;};
  button(keys,label).click();
  if(rich)assert.equal(inserted,require('../assets/math-input.js').templates[value]);
  else assert.ok(first.value.includes(value),label+' must insert into the focused field');
 }
 input(first,'[2,7]');second.focus();keys=fill.querySelector('.ix-local-keys');
 assert.equal(fill.querySelectorAll('.ix-local-keys').length,1);assert.ok(keys.parentNode===second.parentNode);
 button(plot,'נקודה').click();const point=plot.querySelector('[data-coordinate="point"]');
 point.focus();keys=fill.querySelector('.ix-local-keys');
 assert.equal(fill.querySelectorAll('.ix-local-keys').length,1);assert.ok(keys.parentNode===point.parentNode);
 assert.equal(keys.querySelector('[aria-label="איחוד"]'),null); // Numeric keys for coordinates.
 let inserted;if(rich)point.control.insert=v=>{inserted=v;};
 point.setSelectionRange(0,0);button(keys,'π').click();
 assert.equal(rich?inserted:point.value,rich?String.raw`\pi`:'π');assert.equal(first.value,'[2,7]');
 point.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(fill.querySelector('.ix-local-keys'),null);
 point.focus();keys=fill.querySelector('.ix-local-keys');
 const pending=[];E.context.setTimeout=(fn,ms)=>{if(ms===150)pending.push(fn);};
 point.blur();E.document.activeElement=keys.querySelector('button');pending.splice(0).forEach(fn=>fn());
 assert.equal(fill.querySelectorAll('.ix-local-keys').length,1); // Tab into keypad keeps it open.
 E.document.activeElement=button(fill,'בדיקה');keys.dispatchEvent({type:'focusout'});pending.splice(0).forEach(fn=>fn());
 assert.equal(fill.querySelector('.ix-local-keys'),null);
 second.focus();button(fill,'הצגת התשובות').click();assert.equal(fill.querySelector('.ix-local-keys'),null);
 button(fill,'ניסיון חדש').click();first.focus();button(fill,'ניסיון חדש').click();assert.equal(fill.querySelector('.ix-local-keys'),null);
}
for (const rich of [false,true]) {
 const E=env(),q=node(E.document,'div',{class:'thmbox-question'}),d=node(q,'div',{class:'derive',start:'5x-4<=2x+8'});
 node(d,'div',{class:'step','data-line':'3x<=[12]'},'אספו איברים');node(d,'div',{class:'step','data-line':'x<=[4]'},'חלקו בשלוש');
 if(rich){
  E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
  E.run(fs.readFileSync('assets/math-input.js','utf8'));
 }
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 assert.equal(d.querySelectorAll('.pw-input').length,1);assert.equal(d.querySelector('.pw-solution').getAttribute('open'),null);
 const a=d.querySelector('.pw-input');input(a,'-12<=-3x');justify(d.querySelector('.as-step'),[{op:'sub',value:'5x'},{op:'sub',value:'8'}]);button(d,'הוספת שורה').click();input(d.querySelectorAll('.pw-input')[1],'x<=4');justify(d.querySelectorAll('.as-step')[1],[{op:'div',value:'-3'}]);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
 input(a,'-13<=-3x');assert.doesNotMatch(d.textContent,/הפתרון נכון/);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/נעצרה/);
 input(a,'3x<=12');input(d.querySelectorAll('.pw-input')[1],'');
 justify(d.querySelector('.as-step'),[{op:'sub',value:'2x'},{op:'add',value:'4'}]);justify(d.querySelectorAll('.as-step')[1],[{op:'div',value:'3'}]);
 const second=d.querySelectorAll('.as-step')[1];button(second,'רמז').click();assert.match(second.querySelector('.pw-hints').textContent,/חלקו/);
 input(d.querySelectorAll('.pw-input')[1],'x<=4');button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
 if(rich){
  assert.equal(a.control.tagName,'INPUT');a.focus();assert.equal(a.control.tagName,'MATH-FIELD');
  input(a,String.raw`x\le\frac{12}{3}`);input(d.querySelectorAll('.pw-input')[1],'');
  justify(d.querySelector('.as-step'),[{op:'sub',value:'2x'},{op:'add',value:'4'},{op:'div',value:'3'}]);
  button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
  input(a,String.raw`x\le\frac{12}{}`);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/מקום ריק/);assert.doesNotMatch(d.textContent,/הפתרון נכון/);
  input(a,String.raw`x\le4`);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
  let inserted;a.control.insert=(value,options)=>{inserted={value,options};};a.focus();button(d,'x<sup>□</sup>').click();
  assert.equal(inserted.value,'#@^{#?}');assert.equal(inserted.options.selectionMode,'placeholder');
  a.control.dispatchEvent({type:'paste',clipboardData:{getData:()=> 'x<=3/4'},stopImmediatePropagation(){}});
  assert.match(inserted.value,/\\frac\{3\}\{4\}/);assert.equal(inserted.options.selectionMode,'after');
 }
}
// The same independent editor works in examples and exercises, with optional replacements.
for(const rich of [false,true])for(const example of [false,true]) {
 const E=env(),engine=require('../assets/interactive.js');
 const box=node(E.document,'div',{class:example?'thmbox-example':'thmbox-question'});
 const d=node(box,'div',{class:'derive',start:'3-2x<7'});
 node(d,'div',{class:'step','data-line':'-2x<[4]'},'מחסירים 3 משני האגפים.');
 node(d,'div',{class:'step','data-line':'x [>] [-2]'},'מחלקים במספר שלילי והופכים את הכיוון.');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const rows=()=>d.querySelectorAll('.as-step'),open=n=>{n.open=true;n.dispatchEvent({type:'toggle'});};
 const setInput=(field,value)=>{field.focus();input(field,value);};
 assert.equal(d.querySelector('.dv'),null);assert.equal(rows().length,1);
 assert.equal(d.querySelector('.pw-solution').getAttribute('open'),null);
 let first=rows()[0],written=first.querySelector('.pw-input');
 button(first,'רמז').click();assert.match(first.querySelector('.pw-hints').textContent,/מחסירים/);
 assert.equal(first.querySelector('.pw-hints').querySelector('.as-formula'),null);assert.equal(written.value,'');
 button(first,'הצגת צעד אפשרי').click();assert.ok(first.querySelector('.pw-hints').querySelector('.as-formula'));
 assert.equal(written.value,''); // Showing a hint/result never overwrites student work.
 const op=selectAction(first,'sub');
 setInput(op.querySelector('.as-justification-value'),'3');previewAction(op).click();
 assert.equal(written.value,'');assert.ok(first.querySelector('.as-result').querySelector('.as-formula'));
 // Keep the unreduced alternative to exercise independent replacements below.
 first.querySelector('.as-alternatives').querySelectorAll('button').find(b=>b.textContent.startsWith('לפני פישוט')).click();
 button(first.querySelector('.as-result'),'יישום הצעד והמשך').click();
 assert.equal(engine.setEq(engine.parseSet('(-2,inf)'),engine.parseSet(E.context.CourseMathInput.read(written))),true);
 assert.equal(rows().length,2);
 assert.equal(first.querySelector('.as-editor').hidden,true);assert.equal(first.querySelector('.as-compact').hidden,false);
 let second=rows()[1],replace=actionTool(second,'replace');
 function selectPart(path,value){const cb=replace.querySelector('[data-part="'+path+'"]');cb.checked=true;cb.dispatchEvent({type:'change'});const entry=replace.querySelector('[data-path="'+path+'"]');setInput(entry.querySelector('.as-replacement-input'),value);return entry;}
 const left=selectPart('0.0','-2x');button(left,'בדיקת ההחלפה').click();assert.match(left.textContent,/ההחלפה נכונה/);
 assert.equal(replace.querySelector('[data-part="0.0.a"]').disabled,true);
 const right=selectPart('0.1','5');button(right,'בדיקת ההחלפה').click();assert.match(right.textContent,/אינה שומרת/);
 previewAction(replace).click();assert.equal(second.querySelector('.pw-input').value,'');
 assert.equal(second.querySelector('.as-result').querySelector('.as-formula'),null);
 setInput(right.querySelector('.as-replacement-input'),'4');previewAction(replace).click();
 button(second,'יישום הצעד והמשך').click();assert.equal(rows().length,3);
 const third=rows()[2],divide=selectAction(third,'div');
 setInput(divide.querySelector('.as-justification-value'),'0');previewAction(divide).click();assert.match(third.textContent,/שאינו אפס/);
 setInput(divide.querySelector('.as-justification-value'),'-2');previewAction(divide).click();assert.match(third.querySelector('.as-result').textContent,/היפוך/);
 button(third,'יישום הצעד והמשך').click();assert.equal(rows().length,3);
 assert.equal(engine.parseRelation(E.context.CourseMathInput.read(third.querySelector('.pw-input'))).disj[0].ops[0],'>');
 assert.equal(engine.relationSource(engine.parseRelation(E.context.CourseMathInput.read(third.querySelector('.pw-input')))),'x > -2');
 assert.match(d.textContent,/הפתרון נכון/);
 assert.equal(rows().length,3);assert.equal(rows().every(r=>r.querySelector('.as-editor').hidden),true);
 const saved=third.querySelector('.pw-input').value;button(first,'עריכה').click();setInput(written,'-2x<5');
 assert.equal(rows().every(r=>!r.querySelector('.as-editor').hidden),true);assert.equal(third.querySelector('.pw-input').value,saved);
 button(third,'הצגת צעד אפשרי').click();assert.match(third.querySelector('.pw-hints').textContent,/תקנו קודם/);
 button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/נעצרה/);
 button(d,'מההתחלה').click();assert.equal(rows().length,1);assert.equal(rows()[0].querySelector('.pw-input').value,'');
 assert.equal(d.querySelector('.pw-solution').open,false);
 button(rows()[0],'הצגת צעד אפשרי').click();button(rows()[0],'יישום הצעד והמשך').click();
 assert.equal(rows()[0].querySelector('.as-editor').hidden,true);button(rows()[1],'הצגת צעד אפשרי').click();
 button(rows()[1],'יישום הצעד והמשך').click();assert.match(d.textContent,/הפתרון נכון/);
}
// Absolute-value splitting has a named tool, a readable rule and an opt-in result.
for(const rich of [false,true]) {
 const engine=require('../assets/interactive.js');
 const E=env(),box=node(E.document,'div',{class:'thmbox-example'}),d=node(box,'div',{class:'derive',start:'|2x-3|=5'});
 const method=node(E.document,'div',{id:'box-key-abs-solving'});node(node(method,'p'),'strong',{},'שיטת פתרון 9.8.7 — ערך מוחלט');
 node(d,'div',{class:'step','data-line':'2x-3=[5] or 2x-3=[-5]'},'מפרקים ערך מוחלט');
 node(d,'div',{class:'step','data-line':'x=[4] or x=[-1]'},'פותרים');
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=actionTool(row,'abs'),field=row.querySelector('.pw-input');
 assert.equal(row.querySelector('.as-justification-rule').value,'abs');
 assert.equal(tool.querySelector('a').getAttribute('href'),'#box-key-abs-solving');
 assert.equal(tool.querySelector('a').textContent,'שיטת פתרון 9.8.7');
 const rule=tool.querySelector('.as-rule-equivalence');
 assert.match(rule.textContent,/\\iff/);assert.equal(field.value,'');
 assert.match(rule.textContent,/2 x - 3 = 5/);assert.match(rule.textContent,/2 x - 3 = -5/);
 assert.match(tool.querySelector('.as-abs-rule').querySelector('p').textContent,/המרחק של/);
 assert.doesNotMatch(tool.textContent,/\|E\||כאן c חיובי/);
 assert.equal(rule.querySelector('.ix-or').getAttribute('dir'),'rtl');
 assert.equal(rule.querySelectorAll('.math').length,4);
 rule.querySelectorAll('.math').forEach(part=>assert.doesNotMatch(part.textContent,/או|וגם/));
 previewAction(tool).click();assert.ok(row.querySelector('.as-result').querySelector('.as-formula'));assert.equal(field.value,'');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();}
 button(row,'יישום הצעד והמשך').click();
 assert.equal(engine.setEq(engine.parseSet('{-1,4}'),engine.parseSet(E.context.CourseMathInput.read(field))),true);
 assert.equal(row.querySelector('.as-editor').hidden,true);
 assert.match(row.querySelector('.as-compact').textContent,/פירוק ערך מוחלט/);
 const next=d.querySelectorAll('.as-step')[1],unavailable=actionTool(next,'abs');
 unavailable.open=true;unavailable.dispatchEvent({type:'toggle'});assert.match(unavailable.textContent,/אין בשורה ערך מוחלט/);
 previewAction(unavailable).click();assert.equal(next.querySelector('.as-result').querySelector('button'),null);
}
// Multiple absolute values require a visible, explicit occurrence selection.
for(const rich of [false,true]){
 const E=env(),d=node(E.document,'div',{class:'derive',start:'|x-3|+|x^2-6x+2|>14'});
 node(d,'div',{class:'step','data-line':'x>0'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=actionTool(row,'abs'),picks=tool.querySelectorAll('.as-abs-choice'),field=row.querySelector('.pw-input');
 assert.equal(picks.length,2);assert.ok(picks.every(p=>p.getAttribute('aria-pressed')==='false'));
 previewAction(tool).click();assert.match(row.textContent,/בחרו איזה ערך מוחלט/);
 assert.equal(row.querySelector('.as-result').querySelector('button'),null);
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();}
 picks[1].click();assert.equal(picks[1].getAttribute('aria-pressed'),'true');
 assert.equal(tool.querySelectorAll('.as-or-case').length,2);
 previewAction(tool).click();assert.ok(row.querySelector('.as-result').querySelector('button'));
 picks[0].click();assert.equal(row.querySelector('.as-result').querySelector('button'),null,'changing selection clears stale preview');
 previewAction(tool).click();button(row,'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true);
 const M=require('../assets/interactive.js'),written=E.context.CourseMathInput.read(field);
 assert.ok(M.absoluteParts(written).every(p=>p.source==='|x^2 - 6x + 2|'));
 assert.match(row.querySelector('.as-compact').textContent,/פירוק ערך מוחלט/);
 button(row,'עריכה').click();
 assert.equal(row.querySelector('[data-abs-path="0.0.a"]').getAttribute('aria-pressed'),'true','editing retains the chosen occurrence');
}
// Numeric blanks reject uncomputed arithmetic in both input adapters; opt-in is local.
for(const rich of [false,true]){
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const strict=node(p,'span',{class:'blank',ans:'10'}),allowed=node(p,'span',{class:'blank',ans:'10','allow-expression':'true'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const fields=[strict,allowed].map(n=>n.querySelector('.blank-input'));
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};fields.forEach(f=>f.focus());}
 fields.forEach(f=>input(f,rich?String.raw`\left|-7\right|+3`:'|-7|+3'));
 button(fill,'בדיקה').click();assert.ok(strict.classList.contains('warn'));assert.ok(allowed.classList.contains('ok'));
 assert.match(fill.textContent,/החישוב עדיין לא הושלם/);
 input(fields[0],'10');button(fill,'בדיקה').click();assert.ok(strict.classList.contains('ok'));
}
// Absolute-value rule variants keep inequalities as text for MathJax, not HTML tags.
for(const [start,alternatives] of [['|x|<2',1],['|x|<=2',1],['|x|>2',2],['|x|>=2',2],['|x|!=2',3],['|x|=0',1],['|x|<0',0]]) {
 const E=env(),d=node(E.document,'div',{class:'derive',start});
 node(d,'div',{class:'step','data-line':'x=0'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const tool=actionTool(d.querySelector('.as-step'),'abs'),rhs=tool.querySelector('.as-rule-cases');
 assert.equal(rhs?.querySelectorAll('.math').length||0,alternatives,start);
 if(rhs){
  assert.equal(rhs.querySelectorAll('.ix-or').length,alternatives-1,start);
  rhs.querySelectorAll('.math').forEach(part=>{
   assert.equal(part.getAttribute('dir'),'ltr');assert.doesNotMatch(part.textContent,/\\text|או|וגם/);
  });
 }
}
// Two linked choices expose only relevant controls and preserve the student's draft.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'|x|=2'});
 node(d,'div',{class:'step','data-line':'x=2 or x=-2'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),category=row.querySelector('.as-action-category'),action=row.querySelector('.as-justification-rule');
 assert.equal(action.parentElement.hidden,true);
 assert.equal(row.querySelector('.as-action-operand').hidden,true);
 input(row.querySelector('.pw-input'),'x=2');
 category.value='sides';category.dispatchEvent({type:'change'});
 assert.deepEqual(action.children.map(o=>o.value),['',...actionCategories.sides]);
 selectAction(row,'div');assert.equal(row.querySelector('.as-action-operand').hidden,false);
 const absolute=actionTool(row,'abs');
 assert.equal(row.querySelector('.as-action-operand').hidden,true);assert.equal(absolute.hidden,false);
 assert.ok(action.children.some(o=>o.value==='splitSign'));assert.ok(!action.children.some(o=>o.value==='splitOr'));
 assert.equal(row.querySelectorAll('.as-action-preview').length,1);
 assert.equal(row.querySelector('.as-tools'),null);assert.equal(row.querySelector('.as-branch-tool'),null);
 selectAction(row,'simplify');assert.equal(absolute.parentElement.hidden,true);
 assert.equal(row.querySelector('.pw-input').value,'x=2');
}
// Manual numbered cases are covered in numbered-cases-dom.test.js.
// Selected replacements use the output of preceding actions in the same step.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'3+2x=7'});
 node(d,'div',{class:'step','data-line':'x=2'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),first=selectAction(row,'sub');input(first.querySelector('.as-justification-value'),'3');
 button(row,'צירוף פעולה').click();const next=selectAction(row,'replace',1),tool=next.querySelector('.as-replacements');
 const choice=tool.querySelector('[data-part="0.0"]');choice.checked=true;choice.dispatchEvent({type:'change'});
 input(tool.querySelector('.as-replacement-input'),'2x');button(row,'הצגת התוצאה הצפויה').click();
 const result=row.querySelector('.as-action-preview');assert.ok(result.querySelector('.as-formula'),result.textContent);
 input(first.querySelector('.as-justification-value'),'2');
 assert.equal(result.children.length,0);assert.equal(tool.querySelectorAll('.as-replacement-input').length,0,'stale selections are cleared');
 input(first.querySelector('.as-justification-value'),'3');
 const again=tool.querySelector('[data-part="0.0"]');again.checked=true;again.dispatchEvent({type:'change'});
 input(tool.querySelector('.as-replacement-input'),'2x');button(row,'הצגת התוצאה הצפויה').click();
 button(result,'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 assert.equal(row.querySelector('.pw-input').value.replace(/\u200e/g,''),'2x = 7 - 3','unselected work stays unchanged');
}
// Reproduce the three replacements in both branches of the user's example.
for(const rich of [false,true]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const box=node(E.document,'div',{class:'thmbox-example'}),d=node(box,'div',{class:'derive',start:'|2x-3|=5'});
 node(d,'div',{class:'step','data-line':'2x-3=5 or 2x-3=-5'});
 node(d,'div',{class:'step','data-line':'2x=8 or 2x=-2'});
 node(d,'div',{class:'step','data-line':'x=4 or x=-1'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const rows=()=>d.querySelectorAll('.as-step'),open=tool=>{tool.open=true;tool.dispatchEvent({type:'toggle'});};
 const source=row=>M.relationSource(M.parseRelation(E.context.CourseMathInput.read(row.querySelector('.pw-input'))));
 const first=rows()[0],abs=actionTool(first,'abs');
 previewAction(abs).click();button(first,'יישום הצעד והמשך').click();
 assert.equal(source(first),'2x - 3 = 5 או 2x - 3 = -5');assert.equal(rows().length,2);
 if(!rich)assert.equal(first.querySelector('.pw-input').value.replace(/\u200e/g,''),'2x - 3 = 5 או 2x - 3 = -5');
 const second=rows()[1],op=selectAction(second,'add');
 input(op.querySelector('.as-justification-value'),'3');previewAction(op).click();
 second.querySelector('.as-alternatives').querySelectorAll('button').find(b=>b.textContent.startsWith('לפני פישוט')).click();
 button(second,'יישום הצעד והמשך').click();
 assert.equal(rows().length,3);assert.equal(source(second),'2x - 3 + 3 = 5 + 3 או 2x - 3 + 3 = -5 + 3');
 const third=rows()[2],replace=actionTool(third,'replace');
 assert.match(replace.querySelector('[data-part="0.0"]').getAttribute('aria-label'),/2 מופעים/);
 assert.equal(replace.querySelector('[data-part="1.0"]'),null); // One choice for the repeated expression.
 for(const [path,value] of [['0.0','2x'],['0.1','8'],['1.1','-2']]){
  const choice=replace.querySelector('[data-part="'+path+'"]');assert.equal(!!choice.disabled,false);
  choice.checked=true;choice.dispatchEvent({type:'change'});
  const replacement=replace.querySelector('[data-path="'+path+'"]');input(replacement.querySelector('.as-replacement-input'),value);
 }
 assert.equal(replace.querySelectorAll('.as-replacement').length,3);
 previewAction(replace).click();assert.equal(third.querySelector('.pw-input').value,'');
 button(third,'יישום הצעד והמשך').click();
 assert.equal(source(third),'2x = 8 או 2x = -2');assert.equal(rows().length,4);
 assert.equal(third.querySelector('.as-editor').hidden,true); // No extra check click.
 button(third,'עריכה').click();assert.equal(third.querySelector('.as-editor').hidden,false);
 assert.equal(source(third),'2x = 8 או 2x = -2');
}
// Generated operations default to reduced expressions in both input adapters.
// Known signs permit shared OR operations; revealing never writes or accepts a row.
for(const rich of [false,true])for(const [start,op,value,expected] of [
 ['3-2x<7','sub','3','-2x < 4'],['2x-3=5 or 2x-3=-5','add','3','2x = 8 או 2x = -2'],
 ['x/2+1<3','mul','2','x + 2 < 6'],['-2x<4','div','-2','x > -2'],
 ['x>0 and 1/x<2 or x<0 and 1/x<2','mul','x','x > 0 וגם 1 < 2x או x < 0 וגם 1 > 2x'],
 ['(2x+4)/2<3','simplify','','x + 2 < 3']
]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':expected});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=selectAction(row,op),field=row.querySelector('.pw-input');
 const operand=tool.querySelector('.as-justification-value');operand.focus();input(operand,value);
 previewAction(tool).click();assert.equal(field.value,'');assert.equal(!!row.querySelector('.as-editor').hidden,false);
 assert.ok(row.querySelector('.as-result').querySelector('.as-formula'),start);
 button(row.querySelector('.as-result'),'יישום הצעד והמשך').click();
 assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(field))),expected);
 assert.equal(row.querySelector('.as-editor').hidden,true); // Automatic internal validation.
}
// Discrete-Math-style replacement help offers useful, typeset alternatives.
for(const rich of [false,true]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start:'2(x+1)+2(x+1)<12'});node(d,'div',{class:'step','data-line':'x<2'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=actionTool(row,'replace');
 const cb=tool.querySelector('[data-part="0.0"]');cb.checked=true;cb.dispatchEvent({type:'change'});
 const replacement=tool.querySelector('.as-replacement'),field=replacement.querySelector('.as-replacement-input'),help=replacement.querySelector('.as-suggestions');
 assert.equal(field.value,'');help.open=true;help.dispatchEvent({type:'toggle'});assert.equal(field.value,'');
 assert.equal(help.querySelectorAll('button').length,2);
 help.querySelectorAll('button').find(b=>b.getAttribute('aria-label').endsWith('4x + 4')).click();
 assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(field))),'4x + 4');
 assert.equal(row.querySelector('.pw-input').value,'');
 previewAction(tool).click();button(row.querySelector('.as-result'),'יישום הצעד והמשך').click();
 assert.equal(row.querySelector('.as-editor').hidden,true);
 assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(row.querySelector('.pw-input')))),'4x + 4 < 12');
}
// Reproduce the reported complete flow, not just one operation in isolation.
for(const rich of [false,true])for(const route of ['operations','legacy_hint','conditions','model_hint']) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start:'1/x<2'});
 node(d,'div',{class:'step','data-line':'x>0 and 1<2x or x<0 and 1>2x'},'מפצלים לפי סימן x');
 node(d,'div',{class:'step','data-line':'x>0 and x>1/2 or x<0 and x<1/2'},'מחלקים ב-2');
 node(d,'div',{class:'step','data-line':'x>1/2 or x<0'},'חיתוך ואיחוד');
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 partitionCases(d.querySelector('.as-step'),['x>0','x<0','x=0'],[null,null,'x']);
 const rows=()=>d.querySelectorAll('.as-step').slice(1),source=r=>M.relationSource(M.parseRelation(E.context.CourseMathInput.read(r.querySelector('.pw-input'))));
 function operate(row,op,value){
  const tool=selectAction(row,op),operand=tool.querySelector('.as-justification-value');operand.focus();input(operand,value);
  previewAction(tool).click();button(row.querySelector('.as-result'),'יישום הצעד והמשך').click();
 }
 operate(rows()[0],'mul','x');assert.equal(source(rows()[0]),'x > 0 וגם 1 < 2x או x < 0 וגם 1 > 2x');
 if(route==='operations')operate(rows()[1],'div','2');
 else if(route==='model_hint'){
  button(rows()[1],'הצגת צעד אפשרי').click();button(rows()[1].querySelector('.pw-hints'),'יישום הצעד והמשך').click();
 }else{
  const written=route==='legacy_hint'?'x/2>0 and 1/2<x or x/2<0 and 1/2>x':'x>0 and x>1/2 or x<0 and x<1/2';
  // Native field before focus/upgrade, matching independently entered work.
  input(rows()[1].querySelector('.pw-input'),written);justify(rows()[1],[{op:'div',value:'2'}]);button(rows()[1],'בדיקת הצעד והמשך').click();
  if(route==='legacy_hint'){
   assert.match(rows()[1].textContent,/צפוי|התקבל/);
   input(rows()[1].querySelector('.pw-input'),'x>0 and x>1/2 or x<0 and x<1/2');button(rows()[1],'בדיקת הצעד והמשך').click();
  }
  assert.equal(rows().length,3);assert.doesNotMatch(d.querySelector('.algebra-work').textContent,/✓ הפתרון נכון/);
  if(route==='legacy_hint'){
   button(rows()[2],'הצגת צעד אפשרי').click();button(rows()[2].querySelector('.pw-hints'),'יישום הצעד והמשך').click();
  }else{
   const tool=actionTool(rows()[2],'conditionReplace');
   tool.open=true;tool.dispatchEvent({type:'toggle'});
   const selected=tool.querySelector('[data-condition="or.0.2"]');selected.checked=true;selected.dispatchEvent({type:'change'});
   const entry=tool.querySelector('.as-condition-replacement'),help=entry.querySelector('.as-suggestions');help.open=true;help.dispatchEvent({type:'toggle'});
   help.querySelector('button').click();previewAction(tool).click();
   assert.equal(rows()[2].querySelector('.pw-input').value,'');
   button(rows()[2].querySelector('.as-result'),'יישום הצעד והמשך').click();
  }
 }
 assert.equal(source(rows().at(-1)),'x < 0 או x > 1/2',route);
 assert.equal(rows().length,route==='operations'||route==='model_hint'?2:3);
 assert.equal(rows().every(r=>r.querySelector('.as-editor').hidden),true);
 assert.match(d.querySelector('.algebra-work').textContent,/✓ הפתרון נכון/);
 assert.equal(rows().filter(r=>source(r)==='x > 0 וגם 1 < 2x או x < 0 וגם 1 > 2x').length,1,'Never returns to the split');
}
// Empty/universal intersections have readable, editable set answers too.
for(const rich of [false,true])for(const [start,answer] of [['x<0 and x>=0','∅'],['x<0 or x>=0','ℝ']]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':answer});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=actionTool(row,'conditionReplace');
 tool.open=true;tool.dispatchEvent({type:'toggle'});
 const selected=tool.querySelector('input[data-condition]');selected.checked=true;selected.dispatchEvent({type:'change'});
 const entry=tool.querySelector('.as-condition-replacement');input(entry.querySelector('.as-condition-input'),rich?(answer==='ℝ'?'\\mathbb{R}':'\\varnothing'):answer);
 previewAction(tool).click();button(row.querySelector('.as-result'),'יישום הצעד והמשך').click();
 assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(row.querySelector('.pw-input')))),answer);
 assert.equal(row.querySelector('.as-editor').hidden,true);assert.match(d.textContent,/✓ הפתרון נכון/);
}
// Students choose the conditions, write their own simplification, and can work
// on one case at a time. Checking and revealing suggestions do not apply a step.
for(const rich of [false,true])for(const simultaneous of [false,true]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const start='x>0 and x>1/2 or x<0 and x<1/2',d=node(E.document,'div',{class:'derive',start});
 node(d,'div',{class:'step','data-line':'x>1/2 or x<0'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const rows=()=>d.querySelectorAll('.as-step'),open=n=>{n.open=true;n.dispatchEvent({type:'toggle'});};
 const first=rows()[0],tool=actionTool(first,'conditionReplace');
 previewAction(tool).click();assert.match(first.querySelector('.as-result').textContent,/בחרו תנאי/);
 function choose(t,path,value){
  const cb=t.querySelector('[data-condition="'+path+'"]');assert.equal(!!cb.disabled,false);cb.checked=true;cb.dispatchEvent({type:'change'});
  const entry=t.querySelector('[data-condition-path="'+path+'"]'),field=entry.querySelector('.as-condition-input');
  assert.equal(field.value,'');if(value!==undefined)input(field,value);return entry;
 }
 const left=choose(tool,'and.0.0.2');
 assert.equal(tool.querySelector('[data-condition="or.0.2"]').disabled,true);
 assert.equal(tool.querySelector('[data-condition="and.0.0.1"]').disabled,true);
 assert.equal(tool.querySelector('[data-condition="and.1.0.2"]').disabled,false);
 assert.ok(button(tool,'וגם'));assert.ok(button(tool,'או'));assert.ok(button(tool,'∅'));assert.ok(button(tool,'ℝ'));
 input(left.querySelector('.as-condition-input'),'x>0');button(left,'בדיקת הפישוט').click();assert.match(left.textContent,/צפוי/);assert.match(left.textContent,/התקבל/);
 previewAction(tool).click();assert.equal(first.querySelector('.as-result').querySelector('button'),null);
 const help=left.querySelector('.as-suggestions');open(help);
 assert.equal(E.context.CourseMathInput.read(left.querySelector('.as-condition-input')),'x>0'); // Reveal preserves draft.
 help.querySelector('button').click();assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(left.querySelector('.as-condition-input')))),'x > 1/2');
 input(left.querySelector('.as-condition-input'),rich?'x>\\frac{1}{2}':'x>1/2');button(left,'בדיקת הפישוט').click();
 assert.match(left.textContent,/הפישוט נכון/);assert.equal(first.querySelector('.pw-input').value,'');
 if(simultaneous){const right=choose(tool,'and.1.0.2','x<0');button(right,'בדיקת הפישוט').click();assert.match(right.textContent,/הפישוט נכון/);}
 previewAction(tool).click();assert.equal(first.querySelector('.pw-input').value,'');
 assert.equal(first.querySelector('.as-alternatives'),null); // No silent whole-line simplification.
 button(first.querySelector('.as-result'),'יישום הצעד והמשך').click();
 const result=M.relationSource(M.parseRelation(E.context.CourseMathInput.read(first.querySelector('.pw-input'))));
 assert.equal(result,simultaneous?'x > 1/2 או x < 0':'x > 1/2 או x < 0 וגם x < 1/2');
 assert.equal(rows().length,simultaneous?1:2);
 if(!simultaneous){
  const second=rows()[1],next=actionTool(second,'conditionReplace');
  choose(next,'and.1.0.2','x<0');previewAction(next).click();button(second.querySelector('.as-result'),'יישום הצעד והמשך').click();
  assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(second.querySelector('.pw-input')))),'x > 1/2 או x < 0');
 }
 assert.match(d.querySelector('.algebra-work').textContent,/✓ הפתרון נכון/);
}
// Arithmetic replacements also preserve the unselected side of a comparison.
for(const rich of [false,true]) {
 const E=env(),M=require('../assets/interactive.js');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start:'2x+1-1=8+2'});node(d,'div',{class:'step','data-line':'x=5'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),tool=actionTool(row,'replace');
 const cb=tool.querySelector('[data-part="0.0"]');cb.checked=true;cb.dispatchEvent({type:'change'});
 input(tool.querySelector('.as-replacement-input'),'2x');previewAction(tool).click();
 button(row.querySelector('.as-result'),'יישום הצעד והמשך').click();
 assert.equal(M.relationSource(M.parseRelation(E.context.CourseMathInput.read(row.querySelector('.pw-input')))),'2x = 8 + 2');
}
// AND is available and checkable in algebra rows; pi is contextual.
for(const rich of [false,true]) {
 const E=env();if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};}
 const d=node(E.document,'div',{class:'derive',start:'|x-4|<3'});
 node(d,'div',{class:'step','data-line':'-3<x-4<3'});node(d,'div',{class:'step','data-line':'1<x<7'});
 const pi=node(E.document,'div',{class:'derive',start:'2x<pi'});node(pi,'div',{class:'step','data-line':'x<pi/2'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=d.querySelector('.pw-input');field.focus();
 assert.ok(button(d,'וגם'));assert.equal(d.querySelector('[aria-label="פאי"]'),null);
 input(field,rich?'x>1'+E.context.CourseMathInput.templates[' וגם ']+'x<7':'x>1 וגם x<7');
 justify(d.querySelector('.as-step'),[{op:'abs'},{op:'add',value:'4'}]);
 button(d,'בדיקת הצעד והמשך').click();assert.match(d.textContent,/הפתרון נכון/);
 pi.querySelector('.pw-input').focus();assert.ok(button(pi,'π'));
}
// AND and OR must both render as isolated RTL text, including the reported case split.
for(const rich of [false,true]) {
 const E=env(),M=require('../assets/interactive.js');
 const d=node(E.document,'div',{class:'derive',start:'x>0 and 1/x<2 or x<0 and 1/x<2'});
 node(d,'div',{class:'step','data-line':'x>0 and 1<2x or x<0 and 1>2x'});
 node(d,'div',{class:'step','data-line':'x>1/2 or x<0'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step'),field=row.querySelector('.pw-input');
 const source='(1 < 2x וגם\u200e 0 <x) או\u200e (2x < 1 וגם\u200e x<0)';
 function rendered(html){
  assert.equal((html.match(/dir="rtl" data-logic="and">וגם<\/span>/g)||[]).length,2);
  assert.equal((html.match(/dir="rtl" data-logic="or">או<\/span>/g)||[]).length,1);
  assert.equal((html.match(/class="ix-case" dir="ltr"/g)||[]).length,2);
  assert.doesNotMatch(html,/\\text\{(?:וגם|או)\}/);
  assert.match(html,/\\\(\(1 < 2 x\\\)/);
  assert.match(html,/0 < x\)\\\)/);
 }
 input(field,source);rendered(row.querySelector('.pw-preview').innerHTML);
 if(rich){
  E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();
  assert.equal(field.control.tagName,'MATH-FIELD');assert.equal(row.querySelector('.pw-preview').innerHTML,'');
  assert.deepEqual(M.solveSet(M.parseRelation(E.context.CourseMathInput.read(field)),'x',{}).map(p=>({...p,a:p.a||0,b:p.b||0})),M.parseSet('(-inf,0)U(1/2,inf)'));
 }
 justify(row,[{op:'mul',value:'x'}]);button(row,'בדיקת הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true);
 rendered(row.querySelector('.as-compact').querySelector('.as-formula').innerHTML);
 button(row,'עריכה').click();rendered(row.querySelector('.pw-preview').innerHTML||row.querySelector('.as-compact').querySelector('.as-formula').innerHTML);
}
// Logical keypad entries have spacing and leave the next expression in math mode.
{
 const E=env();E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 const api=E.context.CourseMathInput,field=api.create({},'set');field.focus();
 for(const word of ['או','וגם','ולא','לא']) {
  let insertion;field.control.mode='text';field.control.insert=(latex,options)=>{insertion={latex,options};};
  api.insert(field,' '+word+' ');
  assert.equal(insertion.latex,String.raw`\text{`+'\u00a0'+word+'\u00a0}');
  assert.equal(insertion.options.selectionMode,'after');assert.equal(insertion.options.mode,'math');assert.equal(field.control.mode,'math');
  assert.equal(field.control.inlineShortcuts[word],insertion.latex);
 }
}
// Manual numbered cases are covered in numbered-cases-dom.test.js.
// Preview a composed action (including absolute-value expansion), without
// silently applying it or asking for another check after explicit application.
{
 const E=env(),d=node(E.document,'div',{class:'derive',start:'|2x-3|=5'});
 node(d,'div',{class:'step','data-line':'x=4 or x=-1'});
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const row=d.querySelector('.as-step');justify(row,[{op:'abs'},{op:'add',value:'3'},{op:'div',value:'2'}]);
 button(row,'הצגת התוצאה הצפויה').click();
 const preview=row.querySelector('.as-action-preview');assert.ok(preview.querySelector('.as-formula'),preview.textContent);
 assert.equal(row.querySelector('.pw-input').value,'');
 button(preview,'יישום הצעד והמשך').click();assert.equal(row.querySelector('.as-editor').hidden,true,row.textContent);
 assert.match(d.textContent,/הפתרון נכון/);
}
// Manual numbered cases are covered in numbered-cases-dom.test.js.
// Answer fields and sketches belong to the workspace; revealing a model preserves drafts.
{
 const E=env(),fixtures=[];
 for(const [start,last,answer] of [['3-2x<7','x>-2','(-2,inf)'],['1/x<2','x<0 or x>1/2','(-inf,0)U(1/2,inf)']]){
  const box=node(E.document,'div'),d=node(box,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':last});
  const fill=node(box,'div',{class:'fill'}),p=node(fill,'p',{},'קבוצת הפתרונות היא ');
  const blank=node(p,'span',{class:'blank','data-ans':answer,'data-plot':'-2,0,1/2,2'},answer);
  node(fill,'div',{class:'explain'},'בדיקת התשובה.');fixtures.push({box,d,fill,blank});
 }
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 for(const {box,d,fill,blank} of fixtures){
  const workspace=d.querySelector('.pw-workspace'),solution=d.querySelector('.pw-solution');
  assert.equal(fill.parentNode,workspace);assert.ok(!workspace.open);assert.equal(box.children.length,1,'no trailing answer or plotting widget');
  const plot=fill.querySelector('.set-plot');button(plot,'נקודה').click();input(plot.querySelector('[data-coordinate="point"]'),'3');button(plot,'הנחה על הישר').click();
  input(blank.querySelector('.blank-input'),'{3}');
  solution.open=true;solution.dispatchEvent({type:'toggle'});
  assert.match(solution.textContent,/קבוצת הפתרונות/);assert.equal(solution.querySelectorAll('.sp-answer').length,1);
  assert.ok(solution.querySelectorAll('input, button').every(n=>n.closest('.sp-range')),'only folded viewport controls, no solution editors');
  assert.equal(solution.querySelectorAll('.ix-hidden').length,0);assert.equal(solution.querySelector('.sp-practice'),null);
  assert.ok(solution.querySelector('svg'));assert.equal(solution.querySelector('svg').getAttribute('aria-label'),'סרטוט הקבוצה על הישר הממשי');
  assert.equal(blank.querySelector('.blank-input').value,'{3}');assert.ok(plot.querySelector('[data-point="3"]'),'student drawing retained');
 }
 assert.deepEqual(fixtures[0].d.querySelector('.sp-answer').querySelectorAll('circle').map(c=>c.getAttribute('fill')),['white']);
 assert.deepEqual(fixtures[1].d.querySelector('.sp-answer').querySelectorAll('circle').map(c=>c.getAttribute('fill')),['white','white']);
}
// Example-only plots do not introduce a drawing requirement; standalone tools fold.
{
 const E=env(),box=node(E.document,'div'),d=node(box,'div',{class:'derive',start:'3-2x<7'});
 node(d,'div',{class:'step','data-line':'x>-2'});
 const fill=node(box,'div',{class:'fill'}),p=node(fill,'p',{},'קבוצת הפתרונות היא ');
 const blank=node(p,'span',{class:'blank','data-ans':'(-2,inf)','data-solution-plot':'true'},'(-2,inf)');
 const standalone=node(E.document,'div',{class:'fill'}),q=node(standalone,'p');
 node(q,'span',{class:'blank','data-ans':'(1,3)','data-plot':'0,1,2,3,4'},'(1,3)');
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 assert.equal(fill.querySelector('.set-plot'),null);assert.ok(d.querySelector('.pw-solution').querySelector('.sp-answer'));
 input(blank.querySelector('.blank-input'),'(-2,inf)');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 const folded=standalone.querySelector('.sp-practice');assert.equal(folded.open,false);
 button(standalone,'הצגת התשובה').click();assert.equal(folded.open,true);
 button(standalone,'ניסיון חדש').click();assert.equal(folded.open,false);
}
// Rule previews stay beside the clicked solution justification, even in a long question.
{
 const E=env(),method=node(E.document,'div',{id:'box-key-abs-solving',class:'thmbox'});
 node(method,'p',{},'שיטת פתרון 1.3.11');node(method,'p',{},'מבודדים את הערך המוחלט.');
 const example=node(E.document,'div',{class:'thmbox'}),reason=node(example,'div',{class:'as-reason'}),line=node(reason,'span',{class:'as-reason-line'});
 const link=node(line,'a',{href:'#box-key-abs-solving'},'שיטת פתרון 1.3.11');
 node(example,'p',{},'סעיפים נוספים מתחת לנימוק');
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 let prevented=false;E.document.dispatchEvent({type:'click',button:0,target:link,preventDefault(){prevented=true;}});
 const panel=reason.querySelector('.xref-panel');assert.ok(panel);assert.equal(prevented,true);
 assert.equal(panel.previousSibling,line);assert.match(panel.textContent,/מבודדים/);assert.equal(panel.querySelector('[id]'),null);
 E.document.dispatchEvent({type:'click',button:0,target:link});assert.equal(reason.querySelector('.xref-panel'),null);
}
// Compact plots allow bounded viewport changes without changing the mathematical set.
{
 const E=env(),host=node(E.document,'div');
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js'])E.run(fs.readFileSync(f,'utf8'));
 let changed=0;const answer=[{a:1,b:3,ac:true,bc:false}];
 E.context.SetPlot.create(host,{readOnly:true,marks:[],answer,input:()=>node(E.document,'input'),onChange:()=>changed++});
 const svg=host.querySelector('svg'),controls=host.querySelector('.sp-range');
 assert.equal(svg.getAttribute('width'),'460');assert.ok(!controls.open);
 const a=host.querySelector('[data-view-bound="left"]'),b=host.querySelector('[data-view-bound="right"]');
 const original=svg.querySelector('circle').getAttribute('cx');input(a,'0');input(b,'4');button(host,'עדכון הטווח').click();
 const adjusted=svg.querySelector('circle').getAttribute('cx');assert.notEqual(adjusted,original);
 input(a,'2');button(host,'עדכון הטווח').click();assert.match(host.querySelector('.sp-range-message').textContent,/מכיל את הקצוות/);
 assert.equal(svg.querySelector('circle').getAttribute('cx'),adjusted);
 input(a,'-1000');input(b,'1000');button(host,'עדכון הטווח').click();assert.equal(svg.querySelector('circle').getAttribute('cx'),adjusted);
 button(host,'טווח אוטומטי').click();assert.equal(svg.querySelector('circle').getAttribute('cx'),original);
 host.querySelector('.sp-scroll').clientWidth=300;button(host,'טווח אוטומטי').click();assert.equal(svg.getAttribute('width'),'300');
 assert.equal(changed,0);assert.deepEqual(answer,[{a:1,b:3,ac:true,bc:false}]);
}
// Editors stay folded until chosen, and switching questions preserves both drafts.
{
 const E=env(),parts=[];
 for(const start of ['2x=4','3x=6']){
  const d=node(E.document,'div',{class:'derive',start});node(d,'div',{class:'step','data-line':'x=2'});parts.push(d);
 }
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const spaces=parts.map(d=>d.querySelector('.pw-workspace'));
 assert.ok(spaces.every(s=>!s.open));assert.ok(spaces.every(s=>s.querySelector('summary').textContent==='כתיבת פתרון'));
 spaces[0].open=true;spaces[0].dispatchEvent({type:'toggle'});input(parts[0].querySelector('.pw-input'),'x=2');
 spaces[1].open=true;spaces[1].dispatchEvent({type:'toggle'});
 assert.equal(spaces[0].open,false);assert.equal(parts[0].querySelector('.pw-input').value,'x=2');
 input(parts[1].querySelector('.pw-input'),'x=3');spaces[0].open=true;spaces[0].dispatchEvent({type:'toggle'});
 assert.equal(spaces[1].open,false);assert.equal(parts[1].querySelector('.pw-input').value,'x=3');
}
// Manual numbered cases are covered in numbered-cases-dom.test.js.
// Initialize and solve the actual authored relation widgets, not only synthetic fixtures.
{
 const M=require('../assets/interactive.js'),attrs=s=>{const a={};s.replace(/(\w+)="([^"]*)"/g,(_,k,v)=>a[k]=v);return a;};
 let count=0;
 for(const file of fs.readdirSync('.').filter(f=>/^\d\d-.*\.qmd$/.test(f))) {
  const lines=fs.readFileSync(file,'utf8').split('\n');
  for(let i=0;i<lines.length;i++) {
   const m=/^(:{3,})\s*\{\.derive ([^\n]*)\}\s*$/.exec(lines[i]);if(!m)continue;
   const a=attrs(m[2]);if(a.limit||!M.parseRelation(a.start).disj.some(d=>d.ops.length))continue;
   const path=[];for(let j=i+1;j<lines.length&&lines[j].trim()!==m[1];j++){const st=/^:::\s*\{\.step ([^\n]*)\}\s*$/.exec(lines[j]);if(st)path.push(attrs(st[1]).line);}
   const E=env(),box=node(E.document,'div',{class:'thmbox-example'}),d=node(box,'div',{class:'derive',...a});
   path.forEach((line,j)=>node(d,'div',{class:'step','data-line':line},'hint '+j));
   E.run(fs.readFileSync('assets/math-input.js','utf8'));E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
   assert.equal(d.querySelectorAll('.pw-input').length,1,a.start+' initializes');
   assert.equal(d.querySelectorAll('.pw-solution').length,1,a.start+' has a folded solution');
   for(let j=0;j<path.length*3+3;j++){
    const row=d.querySelectorAll('.as-step')[j];assert.ok(row,a.start+' row '+j);
    button(row,'הצגת צעד אפשרי').click();
    assert.ok(row.querySelector('.pw-hints').querySelector('.as-formula'),a.start+' can reveal the next step');
    button(row.querySelector('.pw-hints'),'יישום הצעד והמשך').click();
    assert.equal(row.querySelector('.as-editor').hidden,true,a.start+' accepts its justified hint: '+row.textContent);
    if(d.querySelectorAll('.as-step').length===j+1)break; // An isolated variable may already finish before arithmetic is simplified.
   }
   assert.match(d.textContent,/הפתרון נכון/,a.start);count++;
  }
 }
 assert.ok(count>20);console.log(count+' authored relation editors initialized, hinted and solved.');
}
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'3/4',form:'frac'});node(blank,'span',{class:'math'},String.raw`\(\frac34\)`);
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input');field.focus();assert.equal(field.control.tagName,'MATH-FIELD');
 input(field,String.raw`\frac68`);button(fill,'בדיקה').click();assert.match(fill.textContent,/לצמצם/);
 input(field,String.raw`\frac34`);button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 button(fill,'ניסיון חדש').click();assert.equal(field.value,'');assert.equal(field.hidden,false);
 input(field,String.raw`\frac3{}`);button(fill,'בדיקה').click();assert.match(fill.textContent,/מקום ריק/);
 button(fill,'הצגת התשובה').click();assert.equal(field.hidden,true);
 button(fill,'ניסיון חדש').click();assert.equal(field.hidden,false);assert.equal(field.value,'');
}
for(const rich of [false,true]) {
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'e<f<a<c<d<g','data-kind':'letter-order'});
 node(blank,'span',{class:'math'},String.raw`\(e<f<a<c<d<g\)`);
 E.run(fs.readFileSync('assets/math-input.js','utf8'));
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input');
 if(rich){E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();assert.equal(field.control.tagName,'MATH-FIELD');}
 input(field,'a<c<d<e<f<g');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('bad'),true);
 input(field,'e<f<a');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('warn'),true);
 input(field,'e < f < a < c < d < g');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 button(fill,'הצגת התשובה').click();assert.equal(blank.querySelector('.blank-answer').hidden,false);
 button(fill,'ניסיון חדש').click();assert.equal(field.value,'');assert.equal(blank.querySelector('.blank-answer').hidden,true);
}
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'[-1,1)','data-plot':'-2,-1,0,1,2','plot-a':'[-1,2]','plot-b':'(-2,1)'});
 node(blank,'span',{class:'math'},String.raw`\([-1,1)\)`);const explanation=node(fill,'div',{class:'explain'},'explanation');
 for(const file of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(file,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input'),plot=fill.querySelector('.set-plot');
 assert.ok(plot);assert.equal(explanation.classList.contains('ix-hidden'),true);
 input(field,'[-1,1)');button(fill,'בדיקה').click();assert.equal(blank.classList.contains('warn'),true);
 assert.equal(plot.querySelector('.sp-gap'),null);assert.equal(plot.querySelector('[data-point="0"]'),null);
 const end=(name,value)=>{const s=plot.querySelector('[data-end="'+name+'"]');s.value=value;s.dispatchEvent({type:'change'});};
 assert.equal(plot.querySelector('.sp-tick'),null);assert.equal(plot.querySelector('[data-label="0"]'),null);
 end('a','closed');input(plot.querySelector('[data-coordinate="a"]'),'-1');input(plot.querySelector('[data-coordinate="b"]'),'1');
 assert.equal(plot.querySelector('[data-coordinate="a"]').value,'-1');assert.equal(plot.querySelector('[data-coordinate="b"]').value,'1');
 button(plot,'הנחה על הישר').click();
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);assert.equal(explanation.classList.contains('ix-hidden'),false);
 plot.querySelector('[data-point="1"]').dispatchEvent({type:'keydown',key:'Enter'});
 assert.equal(blank.classList.contains('ok'),true); // Ordinary clicks/keys do not change a point.
 button(plot,'נקודה').click();const added=plot.querySelector('[data-coordinate="point"]');input(added,'1');button(plot,'הנחה על הישר').click();
 assert.equal(blank.classList.contains('ok'),false);assert.equal(explanation.classList.contains('ix-hidden'),true);
 button(plot,'בדיקת הסרטוט').click();assert.match(plot.querySelector('.sp-status').textContent,/אינו שייך/);
 button(plot,'ביטול').click();button(plot,'בדיקת הסרטוט').click();assert.match(plot.querySelector('.sp-status').textContent,/נכון/);
 button(plot,'הצגת הסרטוט').click();assert.equal(plot.querySelector('[data-point="-1"]'),null);
 button(plot,'חזרה לסרטוט שלי').click();assert.ok(plot.querySelector('[data-point="-1"]'));
 button(plot,'נקודה').click();input(added,'1/2');button(plot,'הנחה על הישר').click();assert.equal(plot.querySelector('[data-point="0.5"]'),null);
 assert.match(plot.querySelector('.sp-entry-status').textContent,/כבר שייכת/);
 button(plot,'בדיקת הסרטוט').click();assert.match(plot.querySelector('.sp-status').textContent,/נכון/);
 const notation=plot.querySelector('.sp-notation').parentNode;notation.open=true;notation.dispatchEvent({type:'toggle'});
 assert.match(plot.querySelector('.sp-notation').innerHTML,/\[-1, 1\)/);
 input(added,'1/0');button(plot,'הנחה על הישר').click();assert.match(plot.querySelector('.sp-entry-status').textContent,/ממשי/);
 button(fill,'הצגת התשובה').click();assert.equal(field.hidden,true);assert.equal(plot.querySelector('[data-point="-1"]'),null);
 button(fill,'ניסיון חדש').click();assert.equal(field.value,'');assert.equal(plot.querySelector('[data-point="-1"]'),null);
 assert.equal(plot.querySelector('[data-point="0.5"]'),null);
 button(plot,'קו').click();end('a','arrow');end('b','arrow');
 assert.equal(plot.querySelector('[data-coordinate="a"]').hidden,true);assert.equal(plot.querySelector('[data-coordinate="b"]').hidden,true);
 button(plot,'הנחה על הישר').click();assert.match(plot.querySelector('.sp-notation').innerHTML,/mathbb/);
 button(plot,'נקודה').click();const pointType=plot.querySelector('[aria-label="סוג הנקודה"]');pointType.value='open';input(added,'0');button(plot,'הנחה על הישר').click();
 assert.equal(plot.querySelector('[data-point="0"]').querySelector('circle').getAttribute('fill'),'white');
 button(plot,'קו').click();button(plot,'הנחה על הישר').click(); // Overlap cannot fill the hole.
 assert.equal(plot.querySelector('[data-point="0"]').querySelector('circle').getAttribute('fill'),'white');
 button(plot,'מחיקה').click();plot.querySelector('[data-delete-point="0"]').click();assert.equal(plot.querySelector('[data-point="0"]'),null);
 button(plot,'ביטול').click();assert.ok(plot.querySelector('[data-point="0"]'));
 button(plot,'נקודה').click();pointType.value='closed';button(plot,'הנחה על הישר').click();
 assert.equal(plot.querySelector('[data-point="0"]'),null);
}
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'R-{-1,2,4}'});
 node(blank,'span',{class:'math'},String.raw`\(\mathbb{R}\setminus\{-1,2,4\}\)`);
 let scheduled;
 E.context.setTimeout=(f,ms)=>{if(ms===350)scheduled=f;};
 for(const f of ['assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input'),preview=fill.querySelector('.ix-preview');
 input(field,String.raw`R \ {-1,2,4}`);scheduled();
 assert.match(preview.innerHTML,/\\mathbb\{R\}\\setminus/);assert.doesNotMatch(preview.innerHTML,/\\cup/);
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 input(field,'R-{1,');scheduled();assert.equal(preview.innerHTML,'');
 input(field,'R-{-1,2,4}');scheduled();
 // Optional typesetting arriving later must not rewrite the draft or leave a stale preview.
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};field.focus();
 assert.match(field.value,/\\mathbb\{R\}\\setminus/);assert.doesNotMatch(field.value,/\\cup/);
 assert.equal(preview.innerHTML,'');scheduled();assert.equal(preview.innerHTML,'');
 button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 let pasted;field.control.insert=value=>{pasted=value;};
 for(const source of ['R-{-1,2,4}',String.raw`R \ {-1,2,4}`]) {
  pasted='';field.control.dispatchEvent({type:'paste',clipboardData:{getData:()=>source},stopImmediatePropagation(){}});
  assert.match(pasted,/\\setminus/);assert.doesNotMatch(pasted,/\\cup/);
 }
}
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'[2,7]','data-plot':'0,1,2,3,4,5,6,7,8'});
 node(blank,'span',{class:'math'},String.raw`\([2,7]\)`);
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const plot=fill.querySelector('.set-plot');
 assert.equal(plot.querySelectorAll('[data-label]').length,0); // No preset labels or answer leakage.
 const end=(name,kind,value)=>{const s=plot.querySelector('[data-end="'+name+'"]');s.value=kind;s.dispatchEvent({type:'change'});input(plot.querySelector('[data-coordinate="'+name+'"]'),value);};
 end('a','closed','2');end('b','open','5');button(plot,'הנחה על הישר').click();
 end('a','open','3');end('b','closed','7');button(plot,'הנחה על הישר').click();
 button(plot,'בדיקת הסרטוט').click();assert.match(plot.querySelector('.sp-status').textContent,/נכון/);
 for(const v of [3,5])assert.equal(plot.querySelector('[data-point="'+v+'"]'),null);
 button(plot,'מחיקה').click();assert.equal(plot.querySelectorAll('[data-delete-line]').length,2);
 plot.querySelector('[data-delete-line]').dispatchEvent({type:'keydown',key:'Enter'});
 assert.ok(plot.querySelector('[data-point="3"]'));assert.equal(plot.querySelector('[data-point="2"]'),null);
 button(plot,'ביטול').click();assert.ok(plot.querySelector('[data-point="2"]'));
 plot.querySelector('.sp-delete-panel').querySelectorAll('button')[1].click();
 assert.ok(plot.querySelector('[data-point="5"]'));button(plot,'ביטול').click();
 button(plot,'נקודה').click();
 input(plot.querySelector('[data-coordinate="point"]'),'3.5');button(plot,'הנחה על הישר').click();
 assert.equal(plot.querySelector('[data-point="3.5"]'),null);
 button(plot,'ניקוי').click();
 for(const v of ['2','3','4','3.5']){input(plot.querySelector('[data-coordinate="point"]'),v);button(plot,'הנחה על הישר').click();}
 const cx=v=>+plot.querySelector('[data-point="'+v+'"]').querySelector('circle').getAttribute('cx');
 assert.ok(Math.abs(cx(3.5)-(cx(3)+cx(4))/2)<1e-8,'3.5 must lie halfway from 3 to 4');
 assert.ok(Math.abs(cx(4)-cx(3)-(cx(3)-cx(2)))<1e-8,'equal numerical distances must stay equal');
 assert.equal(plot.querySelector('[data-label="0"]'),null);
 assert.equal(plot.querySelector('[data-label="6"]'),null);
 assert.equal(plot.querySelector('.sp-tick'),null);
 assert.equal(plot.querySelector('[data-label="3.5"]').getAttribute('role'),null);
 button(plot,'ביטול').click();assert.equal(plot.querySelector('[data-point="3.5"]'),null);
 button(plot,'הצגת הסרטוט').click();assert.equal(plot.querySelector('[data-label="4"]'),null);
 button(plot,'חזרה לסרטוט שלי').click();assert.ok(plot.querySelector('[data-point="4"]'));
 // Close coordinates may stagger their labels, never their positions.
 input(plot.querySelector('[data-coordinate="point"]'),'3.01');button(plot,'הנחה על הישר').click();
 assert.ok(Math.abs((cx(3.01)-cx(3))/(cx(4)-cx(3))-.01)<1e-8);
 assert.ok(+plot.querySelector('[data-label="3.01"]').getAttribute('y')>+plot.querySelector('[data-label="3"]').getAttribute('y'));
 button(plot,'מחיקה').click();plot.querySelector('[data-delete-point="4"]').click();assert.equal(plot.querySelector('[data-point="4"]'),null);
 button(plot,'ביטול').click();assert.ok(plot.querySelector('[data-point="4"]'));
}
{
 // Exercise 1.2.24: load the actual six authored cases, each with two answers.
 const bridge=require('../assets/math-input.js'),engine=require('../assets/interactive.js');
 const source=fs.readFileSync('01-Introduction.qmd','utf8').split('{#box-exm-drawing-tool')[1].split('::: {.thmkey')[0];
 const E=env(),gallery=node(E.document,'div',{class:'set-cases',navigation:'steps'}),stages=[];
 let scheduled;
 E.context.setTimeout=(f,ms)=>{if(ms===350)scheduled=f;};
 for(const chunk of source.split(':::: {.case data-title="').slice(1)) {
  const title=chunk.split('"')[0],c=node(gallery,'div',{class:'case','data-title':title});
  const fill=node(c,'div',{class:'fill','plot-notation':'off'}),entries=[];
  for(const m of chunk.matchAll(/\[\$([^$]*)\$\]\{\.blank ((?:[^"}]|"[^"]*")*)\}/g)) {
   const attrs={};m[2].replace(/([\w-]+)="([^"]*)"/g,(_,k,v)=>attrs[k]=v);
   const blank=node(node(fill,'p'),'span',{class:'blank',...attrs});
   node(blank,'span',{class:'math'},'\\('+m[1]+'\\)');entries.push({blank,attrs,answer:bridge.latexToPlain(m[1])});
  }
  assert.equal(entries.length,2);stages.push({title,c,fill,entries});
 }
 assert.equal(stages.length,6);
 for(const f of ['widgets/shared/intervals.js','assets/set-plot.js','assets/math-input.js','assets/interactive.js'])E.run(fs.readFileSync(f,'utf8'));
 E.document.dispatchEvent({type:'DOMContentLoaded'});
 const nav=gallery.querySelector('.set-stage-nav');assert.equal(nav.querySelectorAll('button').length,6);
 assert.equal(gallery.querySelector('.set-case-nav'),null);
 for(const [i,stage] of stages.entries()) {
  button(nav,(i+1)+'. '+stage.title).click();assert.equal(stage.c.hidden,false);
  assert.equal(gallery.querySelector('.ix-local-keys'),null);
  assert.equal(nav.querySelectorAll('button')[i].getAttribute('aria-pressed'),'true');
  const {fill,entries}=stage,plot=fill.querySelector('.set-plot');
  assert.equal(fill.querySelectorAll('.set-plot').length,1);assert.equal(plot.querySelector('.sp-extra'),null);
  const a=entries[0].blank.querySelector('.blank-input'),b=entries[1].blank.querySelector('.blank-input');
  const end=(name,value,closed)=>{const s=plot.querySelector('[data-end="'+name+'"]');s.value=Number.isFinite(value)?(closed?'closed':'open'):'arrow';s.dispatchEvent({type:'change'});input(plot.querySelector('[data-coordinate="'+name+'"]'),String(value));};
  for(const p of engine.parseSet(entries[0].attrs.ans)) {
   if(p.a===p.b){button(plot,'נקודה').click();input(plot.querySelector('[data-coordinate="point"]'),String(p.a));}
   else {button(plot,'קו').click();end('a',p.a,p.ac);end('b',p.b,p.bc);}
   button(plot,'הנחה על הישר').click();
  }
  assert.equal(a.value,'');assert.equal(b.value,''); // Drawing never fills written answers.
  input(a,entries[0].answer);button(fill,'בדיקה').click();
  assert.equal(entries[0].blank.classList.contains('ok'),true);assert.equal(entries[1].blank.classList.contains('ok'),false);
  input(b,entries[0].answer);button(fill,'בדיקה').click();assert.equal(entries[1].blank.classList.contains('warn'),true);
  input(b,entries[1].answer);scheduled();button(fill,'בדיקה').click();
  assert.equal(entries[1].blank.classList.contains('ok'),true);
  const preview=entries[1].blank.querySelector('.ix-preview');
  assert.notEqual(preview.parentNode,a.parentNode); // Each answer owns its preview.
  assert.equal(preview.parentNode,b.parentNode);assert.equal(fill.querySelector('.ix-panel').querySelector('.ix-preview'),null);
  assert.match(preview.innerHTML,/\\left\\\{/);
  button(plot,'נקודה').click();const point=plot.querySelector('[data-coordinate="point"]');
  input(point,'3/2');const local=point.parentNode.querySelector('.sp-coordinate-preview');
  assert.match(local.innerHTML,/\\frac/);assert.doesNotMatch(plot.querySelector('.sp-status').textContent,/frac|3\/2/);
  point.focus();assert.ok(point.parentNode.contains(gallery.querySelector('.ix-local-keys')));
 }
 button(nav,'1. '+stages[0].title).click();
 const first=stages[0];assert.equal(first.c.hidden,false);assert.equal(stages[5].c.hidden,true);
 assert.equal(first.entries[1].blank.querySelector('.blank-input').value,first.entries[1].answer);
 assert.ok(first.fill.querySelector('[data-point="2"]'));
 button(first.fill,'הצגת התשובות').click();
 for(const entry of first.entries)assert.equal(entry.blank.querySelector('.ix-preview').innerHTML,'');
 button(first.fill,'ניסיון חדש').click();
 assert.equal(first.fill.querySelector('.sp-coordinate-preview').innerHTML,'');
}
{
 const E=env(),gallery=node(E.document,'div',{class:'set-cases'});
 const a=node(gallery,'div',{class:'case','data-title':'first'}),b=node(gallery,'div',{class:'case','data-title':'second'});
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 assert.equal(a.hidden,false);assert.equal(b.hidden,true);
 button(gallery,'הבא').click();assert.equal(a.hidden,true);assert.equal(b.hidden,false);
 button(gallery,'הקודם').click();assert.equal(a.hidden,false);
}
function widget(file){
 const E=env(),s=fs.readFileSync(file,'utf8');
 // Static controls only; scripts create the editable SVG and pieces themselves.
 for(const m of s.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const attrs={};for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];const n=node(E.document,m[1],attrs);n.checked=/\bchecked\b/.test(m[2]);}
 for(const m of s.matchAll(/<button\b[^>]*\b(data-mv|data-st)="([^"]+)"[^>]*>/g))node(E.document,'button',{[m[1]]:m[2]});
 return {...E,source:s,script:[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),$:(id)=>E.document.getElementById(id)};
}
{
 const W=widget('widgets/ch01/triangle-inequality.html');W.context.addEventListener=()=>{};W.run(W.script);
 for(const width of [300,760])for(const [a,b,message] of [
  [3,-2,/כיוונים מנוגדים/],[-3,2,/כיוונים מנוגדים/],[2,4,/אותו כיוון/],
  [-2,-4,/אותו כיוון/],[3,-3,/חזרנו להתחלה/],[0,4,/אחד הצעדים אפס/],
  [-4,0,/אחד הצעדים אפס/],[0,0,/שני הצעדים אפס/],[6,6,/אותו כיוון/],
  [-6,-6,/אותו כיוון/],[.5,-6,/כיוונים מנוגדים/],[6,-.5,/כיוונים מנוגדים/]
 ]) {
  W.$('plot').getBoundingClientRect=()=>({width});
  W.$('a').value=String(a);W.$('b').value=String(b);W.$('b').dispatchEvent({type:'input'});
  assert.equal(+W.$('distance').textContent,Math.abs(a+b));
  assert.equal(+W.$('length').textContent,Math.abs(a)+Math.abs(b));
  assert.equal(W.$('relation').textContent,Math.abs(a+b)===Math.abs(a)+Math.abs(b)?'=':'<');
  assert.match(W.$('message').textContent,message);
  const first=W.$('plot').querySelector('[data-step="a"]'),second=W.$('plot').querySelector('[data-step="b"]');
  const n=(element,attr)=>+element.getAttribute(attr);
  assert.equal(n(first,'x2'),n(second,'x1'),'second step must start where first ends');
  assert.equal(Math.sign(n(first,'x2')-n(first,'x1')),Math.sign(a));
  assert.equal(Math.sign(n(second,'x2')-n(second,'x1')),Math.sign(b));
  const distance=W.$('plot').querySelector('[data-distance]');
  assert.equal(n(distance,'x1'),n(first,'x1'));assert.equal(n(distance,'x2'),n(second,'x2'));
  const labels=W.$('plot').querySelectorAll('text').map(t=>t.textContent),fmt=v=>String(v).replace('-','−');
  assert.ok(labels.includes('AB = |a| = '+fmt(Math.abs(a))));
  assert.ok(labels.includes('BC = |b| = '+fmt(Math.abs(b))));
  assert.ok(labels.includes('AC = |a + b| = '+fmt(Math.abs(a+b))));
  for(const value of new Set([0,a,a+b])) {
   const names=[[0,'A'],[a,'B'],[a+b,'C']].filter(p=>p[0]===value).map(p=>p[1]);
   assert.ok(labels.includes(names.join(' = ')+' = '+fmt(value)),'coincident endpoints share one label');
  }
  for(const text of W.$('plot').querySelectorAll('text'))assert.ok(n(text,'x')>0&&n(text,'x')<width);
 }
}
// Reflect the whole icon, not just its centre; exercise the real drag handlers.
for(const width of [300,760]) {
 const W=widget('widgets/ch01/reflection.html');W.context.addEventListener=()=>{};
 const plot=W.$('plot');plot.getBoundingClientRect=()=>({left:0,top:0,width,height:300});W.run(W.script);
 const matrix=id=>W.$(id).getAttribute('transform').match(/\((.*)\)/)[1].split(/[ ,]+/).map(Number);
 const original=()=>matrix('original-queen'),reflected=()=>matrix('reflected-queen').slice(4);
 const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,message||`${a} != ${b}`);
 function geometryCheck(){
  const mirror=W.$('mirror-drag'),x=+mirror.getAttribute('x1'),y=+mirror.getAttribute('y1');
  let dx=+mirror.getAttribute('x2')-x,dy=+mirror.getAttribute('y2')-y;
  const length=Math.hypot(dx,dy);dx/=length;dy/=length;
  const p=original(),q=reflected(),m=matrix('reflected-queen');
  close(m[0]*m[3]-m[1]*m[2],-1,'the icon must be reflected, not merely rotated');
  for(const [u,v] of [[0,0],[13,7],[-8,15]]) {
   const a=[p[0]+u,p[1]+v],b=[q[0]+m[0]*u+m[2]*v,q[1]+m[1]*u+m[3]*v];
   close(((a[0]+b[0])/2-x)*dy-((a[1]+b[1])/2-y)*dx,0,'mirror bisects every point/image segment');
   close((a[0]-b[0])*dx+(a[1]-b[1])*dy,0,'point/image segment is perpendicular to mirror');
  }
  for(const p of [original(),reflected(),matrix('rotation-handle')])assert.ok(p[0]>=23&&p[0]<=width-23&&p[1]>=23&&p[1]<=277,'draggable objects remain in view');
 }
 function drag(id,from,to,end='pointerup'){
  W.$(id).dispatchEvent({type:'pointerdown',pointerId:7,button:0,clientX:from[0],clientY:from[1]});
  plot.dispatchEvent({type:'pointermove',pointerId:7,clientX:to[0],clientY:to[1]});
  plot.dispatchEvent({type:end,pointerId:7});geometryCheck();
 }
 assert.equal(W.$('original-value').textContent,'A = (3, 1)');
 assert.equal(W.$('reflected-value').textContent,'A′ = (3, −1)');geometryCheck();
 W.$('mirror-y').click();assert.equal(W.$('reflected-value').textContent,'A′ = (−3, 1)');geometryCheck();
 W.$('mirror-diagonal').click();assert.equal(W.$('reflected-value').textContent,'A′ = (1, 3)');geometryCheck();
 assert.equal(W.$('construction-control').hidden,false);assert.equal(W.$('construction').checked,true);
 const corners=W.$('construction-drawing').querySelector('polygon').getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
 const sides=corners.map((p,i)=>Math.hypot(p[0]-corners[(i+1)%4][0],p[1]-corners[(i+1)%4][1]));
 sides.forEach(s=>close(s,sides[0],'construction is a square'));
 assert.deepEqual(corners[0],original());
 reflected().forEach((n,i)=>close(n,corners[2][i]));
 W.$('construction').checked=false;W.$('construction').dispatchEvent({type:'change'});
 assert.equal(W.$('construction-drawing').children.length,0);
 W.$('reset').click();assert.equal(W.$('construction-control').hidden,true);
 let p=original();drag('original-queen',p,[p[0]+27.5,p[1]-27.5]);
 assert.equal(W.$('original-value').textContent,'A = (4, 2)');
 assert.equal(W.$('reflected-value').textContent,'A′ = (4, −2)');
 drag('mirror-drag',[width/2,150],[width/2,122.5]);
 assert.equal(W.$('reflected-value').textContent,'A′ = (4, 0)');
 drag('rotation-handle',matrix('rotation-handle'),[width/2,194]);
 assert.equal(W.$('reflected-value').textContent,'A′ = (−4, 2)');
 drag('rotation-handle',matrix('rotation-handle'),[width/2+52,153.5],'pointercancel');
 const stopped=W.$('reflected-value').textContent;
 plot.dispatchEvent({type:'pointermove',pointerId:7,clientX:0,clientY:0});assert.equal(W.$('reflected-value').textContent,stopped);
 for(const [id,key] of [['original-queen','ArrowUp'],['mirror-drag','ArrowRight'],['rotation-handle','ArrowLeft']]){
  W.$(id).dispatchEvent({type:'keydown',key});geometryCheck();
 }
 W.$('reset').click();p=original();drag('original-queen',p,[width/2,150]);
 assert.equal(W.$('original-value').textContent,'A = (0, 0)');
 assert.equal(W.$('reflected-value').textContent,'A′ = (0, 0)');assert.match(W.$('message').innerHTML,/נשארת במקומה/);
 W.$('mirror-diagonal').click();assert.equal(W.$('construction-drawing').children.length,0,'no square when the point is fixed');
 W.$('reset').click();geometryCheck();assert.equal(W.$('original-value').textContent,'A = (3, 1)');
}
{
 const W=widget('widgets/ch01/number-line.html');
 for(const [k,v] of Object.entries({preset:'touch',scale:'scaled',active:'R',tool:'interval',operation:'intersection'}))W.$(k).value=v;
 W.run(fs.readFileSync('widgets/shared/intervals.js','utf8'));W.run(W.script);
 const choose=n=>{W.$('number').value=String(n);W.$('place').click();};
 W.$('tool').value='point';choose(1);W.$('check').click();assert.match(W.$('msg').textContent,/נכונה/);
 W.$('active').value='A';W.$('active').dispatchEvent({type:'change'});
 const toggle=W.$('pieces').querySelectorAll('button').find(n=>n.textContent.startsWith('ימין'));toggle.click();W.$('check').click();assert.match(W.$('msg').textContent,/אינו שייך/);
 W.$('undo').click();W.$('check').click();assert.match(W.$('msg').textContent,/נכונה/);
 W.$('scale').value='order';W.$('scale').dispatchEvent({type:'change'});W.$('number').value='3/2';W.$('mark').click();assert.match(W.$('plot').textContent,/3\/2/);
 W.$('number').value='1/0';W.$('mark').click();assert.match(W.$('msg').textContent,/מכנה/);
 W.$('show').click();W.$('show').click();assert.equal(W.$('show').textContent,'הצגת התוצאה');
}
{
 const W=widget('widgets/ch01/move-graph.html');W.$('step').value='1';W.run(W.script);
 W.$('step').value='.5';W.document.querySelectorAll('[data-mv]').find(n=>n.getAttribute('data-mv')==='1,0').click();assert.match(W.$('point').textContent,/0.5/);
 W.$('undo').click();assert.equal(W.$('point').textContent,'(0, 0)');
 W.$('vk').value='3/2';W.$('vk').dispatchEvent({type:'change'});assert.equal(W.$('vk').value,'1.5');assert.match(W.$('now').innerHTML,/>3<.*>2</);
 W.$('vk').value='1/0';W.$('vk').dispatchEvent({type:'change'});assert.match(W.$('msg').textContent,/חיובי/);
 W.$('reset').click();W.$('check').click();assert.match(W.$('msg').textContent,/במקום/);
 W.$('cv').dispatchEvent({type:'keydown',key:'ArrowUp'});assert.equal(W.$('point').textContent,'(0, 0.5)');
}
console.log('Editor, number-line and graph interaction smoke checks passed (DOM mock; no layout assertions).');
