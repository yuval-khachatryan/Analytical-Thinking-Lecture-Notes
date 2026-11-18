/* Exact tail checks for the four justified introductory sequence families. */
(function(root){
'use strict';
var choices=[[5,2],[2,1],[3,2],[1,1],[1,2],[1,10],[1,50],[1,100],[1,1000],[1,100000]];
function fraction(p,q){return q===1?String(p):'<span class="fr"><span>'+p+'</span><span>'+q+'</span></span>';}
// Fraction labels stay typeset; the hidden select retains the existing value/events.
function fractionPicker(select,host){
 if(!host)return;
 var options=Array.from(select.querySelectorAll('option')),buttons=[],trigger=document.createElement('button'),list=document.createElement('div');
 host.className='fraction-picker';host.setAttribute('dir','ltr');
 trigger.type='button';trigger.className='fraction-select';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label','בחירת ε');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 list.id=host.id+'-list';list.setAttribute('id',list.id);list.className='fraction-options';list.setAttribute('role','listbox');list.setAttribute('aria-label','בחירת ε');list.hidden=true;trigger.setAttribute('aria-controls',list.id);
 function close(focus){list.hidden=true;host.style.paddingBottom='';trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
 function selected(){return Math.max(0,options.findIndex(function(o){return o.value===select.value;}));}
 function sync(){buttons.forEach(function(b,i){var chosen=options[i].value===select.value;b.setAttribute('aria-selected',String(chosen));b.setAttribute('tabindex',chosen?'0':'-1');});trigger.innerHTML=buttons[selected()].innerHTML+'<span aria-hidden="true">▾</span>';}
 function open(){list.hidden=false;trigger.setAttribute('aria-expanded','true');host.style.paddingBottom=(list.offsetHeight||buttons.length*44+8)+'px';buttons[selected()].focus();}
 options.forEach(function(o,i){
  var b=document.createElement('button'),parts=o.textContent.split('/').map(Number);
  b.type='button';b.setAttribute('role','option');b.setAttribute('data-value',o.value);
  b.innerHTML='<span class="m">'+fraction(parts[0],parts.length===2?parts[1]:1)+'</span>';
  b.setAttribute('aria-label',parts.length===2?parts[0]+' חלקי '+parts[1]:String(parts[0]));
  b.addEventListener('click',function(){select.value=o.value;select.dispatchEvent(new root.Event('change',{bubbles:true}));close(true);});
  b.addEventListener('keydown',function(e){var j=e.key==='ArrowDown'?(i+1)%options.length:e.key==='ArrowUp'?(i+options.length-1)%options.length:e.key==='Home'?0:e.key==='End'?options.length-1:null;if(j!==null){e.preventDefault();buttons[j].focus();}else if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab')close(false);});
  buttons.push(b);list.appendChild(b);
 });
 trigger.addEventListener('click',function(){if(list.hidden)open();else close(false);});
 trigger.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();}else if(e.key==='Escape')close(false);});
 host.addEventListener('focusout',function(e){if(e.relatedTarget&&!host.contains(e.relatedTarget))close(false);});
 document.addEventListener('click',function(e){if(!host.contains(e.target))close(false);});
 host.appendChild(trigger);host.appendChild(list);select.hidden=true;select.addEventListener('change',sync);sync();
}
function plain(p,q){var sign=p<0?'−':'';p=Math.abs(p);var a=p,b=q;while(b){var r=a%b;a=b;b=r;}return sign+(q===a?String(p/a):p/a+'/'+q/a);}
function value(kind,n){return kind==='constant'?4:kind==='alternating'?(n%2?-1:1):kind==='alternating-decay'?(n%2?-1:1)/n:1/n;}
function tail(kind,L,e,N){
 if(!Number.isSafeInteger(N)||N<1||N>10000000)return {valid:false};
 var p=e[0],q=e[1];
 if(kind==='constant'){var pass=Math.abs(4-L)*q<p;return {valid:true,ok:pass,outside:pass?null:N,impossible:!pass};}
 if(kind==='alternating'){
  for(var k=N;k<N+2;k++)if(Math.abs(value(kind,k)-L)*q>=p)return {valid:true,ok:false,outside:k,impossible:true};
  return {valid:true,ok:true,outside:null,impossible:false};
 }
 // These views only ask about the already proved limit zero.
 if(L!==0)return {valid:false};
 var safe=Math.floor(q/p)+1;
 return {valid:true,ok:N>=safe,outside:N>=safe?null:N,impossible:false,safe:safe};
}
function viewport(e,N,kind,L,width){
 var digits=String(N+12).length,count=Math.max(3,Math.min(12,Math.floor(((width||720)-105)/(digits*7+16)))),first=Math.max(1,N-(count>=5?2:1)),span=2.2*e[0]/e[1];
 if(kind)for(var n=first;n<first+count;n++)span=Math.max(span,1.15*Math.abs(value(kind,n)-L));
 return {first:first,last:first+count-1,count:count,span:span};
}
function node(tag,attrs,text){var n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs).forEach(function(k){n.setAttribute(k,attrs[k]);});if(text!==undefined)n.textContent=text;return n;}
function plot(svg,kind,L,e,N,options){
 options=options||{};
 var w=Math.max(320,Math.min(720,svg.getBoundingClientRect().width||720)),v=viewport(e,N,kind,L,w),h=255,left=78,right=25,top=22,bottom=213,span=v.span;
 if(Number.isFinite(options.fixedSpan)&&options.fixedSpan>0)span=v.span=options.fixedSpan;
 var fixed=Array.isArray(options.yRange),yMin=fixed?options.yRange[0]:L-span,yMax=fixed?options.yRange[1]:L+span;
 if(fixed){left=42;right=84;h=280;bottom=240;}
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');
 svg.setAttribute('data-y-min',String(yMin));svg.setAttribute('data-y-max',String(yMax));
 svg.setAttribute('aria-label','האיברים באינדקסים '+v.first+' עד '+v.last+'. כחול: מרחק קטן מאפסילון. אדום: על השפה או בחוץ.');
 function add(tag,attrs,text){var n=node(tag,attrs,text);svg.appendChild(n);return n;}
 function X(n){return left+(n-v.first+.5)*(w-left-right)/v.count;}
 function Y(a){return top+(yMax-a)/(yMax-yMin)*(bottom-top);}
 function text(t,x,y,color,anchor){return add('text',{x:x,y:y,fill:color||'#4c596d','font-size':12,'text-anchor':anchor||'middle',direction:'ltr'},t);}
 var epsilon=e[0]/e[1];
 add('rect',{x:left,y:Y(L+epsilon),width:w-left-right,height:Y(L-epsilon)-Y(L+epsilon),fill:'#e7e1fb'});
 (options.yTicks||[]).forEach(function(t){add('line',{x1:left-4,x2:w-right,y1:Y(t),y2:Y(t),stroke:'#b9c2cf','stroke-width':.7});text(String(t).replace('-','−'),left-9,Y(t)+4,null,'end').setAttribute('data-y-tick',String(t));});
 var labelEdges=(bottom-top)*epsilon/(2*span)>=18;
 [1,-1].forEach(function(s){
  var edgeY=Y(L+s*epsilon);add('line',{x1:left,x2:w-right,y1:edgeY,y2:edgeY,stroke:'#7a63bb','stroke-dasharray':'5 4','data-band-edge':String(s)});
  if(fixed){
   var labelY=s>0?Math.min(edgeY,Y(L)-12):Math.max(edgeY,Y(L)+12);
   add('line',{x1:w-right,x2:w-right+12,y1:edgeY,y2:labelY,stroke:'#7258b4'});
   text(s>0?'L + ε':'L − ε',w-right+17,labelY+4,'#7258b4','start').setAttribute('data-band-label',String(s));
  }else if(labelEdges)text(s>0?'L + ε':'L − ε',left-8,edgeY+4,'#7258b4','end');
 });
 if(!fixed&&!labelEdges)text('L − ε < aₙ < L + ε',w-right,14,'#7258b4','end');
 add('line',{x1:left,x2:w-right,y1:Y(L),y2:Y(L),stroke:'#635296'});if(!fixed)text('L = '+L,left-8,Y(L)+4,'#635296','end');
 if(fixed){text('aₙ',left-16,14);text('n',w-right+5,bottom+25);}
 add('path',{d:'M '+left+' '+top+' V '+bottom+' H '+(w-right),stroke:'#586579',fill:'none'});
 if(options.markIndex!==false){add('line',{x1:X(N),x2:X(N),y1:top,y2:bottom,stroke:'#64748b','stroke-dasharray':'3 4'});text('N = '+N,X(N),14);}
 for(var n=v.first;n<=v.last;n++){
  add('line',{x1:X(n),x2:X(n),y1:bottom,y2:bottom+4,stroke:'#586579'});
  // Reduce the number of displayed terms rather than squeezing long labels.
  text(String(n),X(n),bottom+18);
  var a=value(kind,n),pass=kind==='reciprocal'||kind==='alternating-decay'?e[1]<e[0]*n:Math.abs(a-L)*e[1]<e[0],color=pass?'#305bc2':'#c13c53',point;
  point=add('circle',{cx:X(n),cy:Y(a),r:3.8,fill:color,'data-index':String(n)});
  if(options.focusTail&&n<N)point.setAttribute('opacity','0.3');
  if(options.focusTail&&n===N){point.setAttribute('stroke',color);point.setAttribute('stroke-width','2');}
  var label=kind==='constant'?'4':kind==='alternating'?String(a):plain(kind==='alternating-decay'&&n%2?-1:1,n);
  point.appendChild(node('title',{},'a_'+n+' = '+label));
 }
 return v;
}
var api={choices:choices,fraction:fraction,fractionPicker:fractionPicker,plain:plain,value:value,tail:tail,viewport:viewport,plot:plot,node:node};
root.LimitActivities=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
