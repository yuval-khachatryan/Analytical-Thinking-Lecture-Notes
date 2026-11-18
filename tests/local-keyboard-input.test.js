// Routing regression for MathLive's same-window virtual-keyboard messages.
// This models the 0.111.4 origin guard; it does not emulate an iPad or MathLive's
// formula layout. Unlike the opener tests, commands must actually edit a field.
const assert=require('node:assert/strict'),fs=require('node:fs');
const smoke=fs.readFileSync('tests/interaction-smoke.test.js','utf8');
const {env}=new Function('require',smoke.slice(0,smoke.indexOf('// A stalled/failed'))+';return {env};')(require);
const source=fs.readFileSync('assets/math-input.js','utf8');
const type='mathlive#virtual-keyboard-message';
function setup(protocol='file:',framed=false){
 const E=env(),listeners=[],commands=[];
 E.context.location.protocol=protocol;
 E.context.origin=protocol==='file:'?'null':'https://notes.example';
 E.run('window.top=window');
 if(framed)E.context.top={};
 const win=E.run('window');
 E.context.addEventListener=(type,fn,capture)=>listeners.push({type,fn,capture});
 E.context.MathfieldElement=function(){};
 E.context.customElements={get:()=>E.context.MathfieldElement};
 E.context.mathVirtualKeyboard={visible:false,show(){this.visible=true;}};
 E.run(source);
 const api=E.context.CourseMathInput;
 function field(){
  const host=api.create({},'expr');E.document.appendChild(host);
  const control=host.control;control.position=0;
  control.focus=()=>{E.document.activeElement=control;};
  control.executeCommand=command=>{
   commands.push({control,command});
   // Real keycaps can wrap their editing command in performWithFeedback.
   const operation=Array.isArray(command)&&command[0]==='performWithFeedback'?command.slice(1):command;
   const [action,arg]=Array.isArray(operation)?operation:[operation];
   const at=control.position;
   if(action==='insert'){
    control.value=control.value.slice(0,at)+arg+control.value.slice(at);control.position+=arg.length;
   }else if(action==='deleteBackward'&&at){
    control.value=control.value.slice(0,at-1)+control.value.slice(at);control.position--;
   }else if(action==='moveToPreviousChar'){control.position=Math.max(0,at-1);return;}
   control.dispatchEvent({type:'input',stopPropagation(){}});
  };
  return host;
 }
 function send(command,overrides={}){
  let stopped=false;
  const event={type:'message',source:win,origin:E.context.origin,
   data:{type,action:'execute-command',command},stopImmediatePropagation(){stopped=true;},...overrides};
  for(const l of [...listeners].sort((a,b)=>Number(Boolean(b.capture))-Number(Boolean(a.capture)))){
   if(stopped)break;if(l.type==='message')l.fn(event);
  }
  return stopped;
 }
 return {E,api,listeners,commands,field,send};
}
{
 const T=setup(),a=T.field(),b=T.field();let changes=0;
 a.addEventListener('input',()=>changes++);
 // Existing library receiver: even a same-window command fails for null origin.
 let libraryCalls=0;
 T.listeners.push({type:'message',fn(e){
  if(e.origin==='null')return;
  libraryCalls++;T.E.document.activeElement.executeCommand(e.data.command);
 }});
 a.querySelector('.mi-keyboard-button').dispatchEvent({type:'click',stopPropagation(){}});
 assert.equal(T.E.document.activeElement,a.control);
 assert.equal(T.send(['insert','1']),true);
 T.send(['insert','2']);assert.equal(a.value,'12');assert.equal(changes,2);
 T.send('moveToPreviousChar');T.send(['insert','3']);assert.equal(a.value,'132');
 T.send('deleteBackward');assert.equal(a.value,'12');assert.equal(changes,4);
 // Use the same command path for structural templates, without flattening LaTeX.
 b.querySelector('.mi-keyboard-button').dispatchEvent({type:'click',stopPropagation(){}});
 const fraction=String.raw`\frac{a_{n_k}}{\sqrt{2}}`;
 const keycapCommand=['performWithFeedback','insert',fraction];
 T.send(keycapCommand);assert.equal(b.value,fraction);assert.equal(a.value,'12');
 assert.equal(T.commands.at(-1).command,keycapCommand,'forward the original keycap action and arguments intact');
 assert.equal(T.api.read(b),'((a_(n_(k)))/(sqrt(2)))');
 const count=T.commands.length;
 for(const overrides of [
  {source:{}},{source:null},{origin:'https://elsewhere.example'},
  {data:{type,action:'update-setting',layouts:[]}},
  {data:{type:'unrelated',action:'execute-command',command:['insert','9']}},
  {data:{type,action:'execute-command',command:null}}
 ]){
  // Check only the bridge here; external messages belong to the library guard.
  const existing=T.listeners.pop();T.send(['insert','9'],overrides);T.listeners.push(existing);
 }
 assert.equal(T.commands.length,count,'no foreign, settings or malformed messages routed');
 assert.equal(libraryCalls,0,'no duplicate command delivery');
 for(const attr of ['disabled','readonly','read-only']){
  b.control.setAttribute(attr,'');assert.equal(T.send(['insert','9']),false);b.control.removeAttribute(attr);
 }
 T.E.context.mathVirtualKeyboard.visible=false;assert.equal(T.send(['insert','9']),false);
 T.E.context.mathVirtualKeyboard.visible=true;
 b.remove();assert.equal(T.send(['insert','9']),false,'detached field must not receive commands');
 T.E.document.activeElement=T.E.document;assert.equal(T.send(['insert','9']),false);
 assert.equal(T.commands.length,count);
 // Consume even if an upstream receiver would now accept local-file input.
 T.listeners.push({type:'message',fn(){throw Error('duplicate insertion');}});
 a.control.focus();T.send(['insert','4']);assert.equal(a.value,'142');
}
for(const [protocol,framed] of [['https:',false],['http:',false],['file:',true],['data:',false]]){
 const T=setup(protocol,framed);
 assert.equal(T.listeners.length,0,'leave normal hosted/embedded routing untouched');
}
console.log('Local keyboard: insertion, caret, deletion, field switching, input events and narrowly scoped routing passed.');
