// DOM-level smoke checks without browser dependencies. This does not test layout.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.attrs={};this.children=[];this.listeners={};this.style={};this.value='';this._text='';this.dataset={};this.nodeType=1;this.classList={contains:c=>this.className.split(' ').includes(c),add:(...cs)=>this.className=[...new Set(this.className.split(' ').concat(cs))].filter(Boolean).join(' '),remove:(...cs)=>this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' '),toggle:(c,on)=>{if(on===undefined)on=!this.classList.contains(c);this.classList[on?'add':'remove'](c);}};}
 get className(){return this.attrs.class||'';} set className(s){this.attrs.class=s;}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(s){this.children=[];this._text=String(s);}
 get innerHTML(){return this._text;}set innerHTML(s){this.textContent=s;}
 get parentElement(){return this.parentNode;}get firstChild(){return this.children[0]||null;}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=String(v);if(k==='width'||k==='height')this[k]=+v;}
 getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 appendChild(n){n.remove();this.children.push(n);n.parentNode=this;return n;}
 insertBefore(n,b){if(!b)return this.appendChild(n);n.remove();this.children.splice(this.children.indexOf(b),0,n);n.parentNode=this;return n;}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}}
 replaceChildren(...cs){this.children.forEach(c=>c.parentNode=null);this.children=[];this._text='';cs.forEach(c=>this.appendChild(c));}
 matches(sel){return sel.split(',').some(s=>{s=s.trim();const a=/^\[([^=\]]+)(?:="?([^"\]]+)"?)?\]$/.exec(s);if(a)return this.attrs[a[1]]!==undefined&&(a[2]===undefined||this.attrs[a[1]]===a[2]);if(s.startsWith('#'))return this.attrs.id===s.slice(1);const parts=s.split('.');return (!parts[0]||this.tagName===parts[0].toUpperCase())&&parts.slice(1).every(c=>this.classList.contains(c));});}
 closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
 addEventListener(t,f){(this.listeners[t]??=[]).push(f);}dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{};for(const f of this.listeners[e.type]||[])f.call(this,e);if(this['on'+e.type])this['on'+e.type](e);return true;}
 click(){this.dispatchEvent({type:'click'});}focus(){this.dispatchEvent({type:'focus'});}blur(){this.dispatchEvent({type:'change'});}
 setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:760,height:400};}
 getContext(){return new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
 cloneNode(deep){const n=new Element(this.tagName);n.attrs={...this.attrs};n._text=this._text;n.value=this.value;if(deep)this.children.forEach(c=>n.appendChild(c.cloneNode(true)));return n;}
}
function env(){
 const document=new Element('document');document.readyState='loading';document.createElement=t=>new Element(t);document.createElementNS=(_,t)=>new Element(t);document.createTextNode=s=>{const n=new Element('text');n.textContent=s;return n;};document.getElementById=id=>document.querySelector('#'+id);
 const context={document,console,URLSearchParams,structuredClone,location:{search:''},setTimeout:()=>{},Event:class{constructor(type){this.type=type;}}};context.window=context;context.MathJax={typeset:()=>{},typesetClear:()=>{}};
 return {document,context:vm.createContext(context),run:s=>vm.runInContext(s,context)};
}
function node(parent,tag,attrs={},text=''){const n=new Element(tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));n.textContent=text;parent.appendChild(n);return n;}
function button(root,label){const b=root.querySelectorAll('button').find(n=>n.textContent===label);assert.ok(b,'missing button '+label);return b;}
function input(n,value){n.value=value;n.dispatchEvent({type:'input'});}
for (const rich of [false,true]) {
 const E=env(),q=node(E.document,'div',{class:'thmbox-question'}),d=node(q,'div',{class:'derive',start:'5x-4<=2x+8'});
 node(d,'div',{class:'step','data-line':'3x<=[12]'},'אספו איברים');node(d,'div',{class:'step','data-line':'x<=[4]'},'חלקו בשלוש');
 if(rich){
  E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
  E.run(fs.readFileSync('assets/math-input.js','utf8'));
 }
 E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 assert.equal(d.querySelectorAll('.pw-input').length,1);assert.equal(d.querySelector('.pw-solution').getAttribute('open'),null);
 const a=d.querySelector('.pw-input');input(a,'-12<=-3x');button(d,'הוספת שורה').click();input(d.querySelectorAll('.pw-input')[1],'x<=4');button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
 input(a,'-13<=-3x');assert.doesNotMatch(d.textContent,/הפתרון נכון/);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/נעצרה/);
 input(a,'3x<=12');input(d.querySelectorAll('.pw-input')[1],'');button(d,'רמז').click();assert.match(d.querySelector('.pw-hints').textContent,/חלקו/);
 input(d.querySelectorAll('.pw-input')[1],'x<=4');button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
 if(rich){
  assert.equal(a.tagName,'MATH-FIELD');
  input(a,String.raw`x\le\frac{12}{3}`);input(d.querySelectorAll('.pw-input')[1],'');
  button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
  input(a,String.raw`x\le\frac{12}{}`);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/מקום ריק/);assert.doesNotMatch(d.textContent,/הפתרון נכון/);
  input(a,String.raw`x\le4`);button(d,'בדיקת הפתרון').click();assert.match(d.textContent,/הפתרון נכון/);
  let inserted;a.insert=(value,options)=>{inserted={value,options};};a.focus();button(d,'x<sup>□</sup>').click();
  assert.equal(inserted.value,'#@^{#?}');assert.equal(inserted.options.selectionMode,'placeholder');
  a.dispatchEvent({type:'paste',clipboardData:{getData:()=> 'x<=3/4'},stopImmediatePropagation(){}});
  assert.match(inserted.value,/\\frac\{3\}\{4\}/);assert.equal(inserted.options.selectionMode,'after');
 }
}
{
 const E=env(),fill=node(E.document,'div',{class:'fill'}),p=node(fill,'p');
 const blank=node(p,'span',{class:'blank','data-ans':'3/4',form:'frac'});node(blank,'span',{class:'math'},String.raw`\(\frac34\)`);
 E.context.MathfieldElement=function(){};E.context.customElements={get:()=>true};
 E.run(fs.readFileSync('assets/math-input.js','utf8'));E.run(fs.readFileSync('assets/interactive.js','utf8'));E.document.dispatchEvent({type:'DOMContentLoaded'});
 const field=blank.querySelector('.blank-input');assert.equal(field.tagName,'MATH-FIELD');
 input(field,String.raw`\frac68`);button(fill,'בדיקה').click();assert.match(fill.textContent,/לצמצם/);
 input(field,String.raw`\frac34`);button(fill,'בדיקה').click();assert.equal(blank.classList.contains('ok'),true);
 button(fill,'ניסיון חדש').click();assert.equal(field.value,'');assert.equal(field.hidden,false);
 input(field,String.raw`\frac3{}`);button(fill,'בדיקה').click();assert.match(fill.textContent,/מקום ריק/);
 button(fill,'הצגת התשובה').click();assert.equal(field.hidden,true);
 button(fill,'ניסיון חדש').click();assert.equal(field.hidden,false);assert.equal(field.value,'');
}
function widget(file){
 const E=env(),s=fs.readFileSync(file,'utf8');
 // Static controls only; scripts create the editable SVG and pieces themselves.
 for(const m of s.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const attrs={};for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];const n=node(E.document,m[1],attrs);n.checked=/\bchecked\b/.test(m[2]);}
 for(const m of s.matchAll(/<button\b[^>]*\b(data-mv|data-st)="([^"]+)"[^>]*>/g))node(E.document,'button',{[m[1]]:m[2]});
 return {...E,source:s,script:[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),$:(id)=>E.document.getElementById(id)};
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
