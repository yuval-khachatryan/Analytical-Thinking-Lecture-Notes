const assert=require('node:assert/strict'),fs=require('node:fs');
const I=require('../assets/math-input.js'),M=require('../assets/interactive.js');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env,node,input,button}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env,node,input,button};')(require);

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
console.log('Structured input: readiness, fraction/root/power/subscript keys, nested indices, incomplete slots and retained previews passed.');
