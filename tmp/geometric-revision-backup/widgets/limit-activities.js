/* Exact tail checks for the four justified introductory sequence families. */
(function(root){
'use strict';
var choices=[[5,2],[2,1],[3,2],[1,1],[1,2],[1,10],[1,50],[1,100],[1,1000],[1,100000]];
function fraction(p,q){return q===1?String(p):'<span class="fr"><span>'+p+'</span><span>'+q+'</span></span>';}
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
function viewport(e,N,kind,L){
 var count=24,first=Math.max(1,N),span=2.2*e[0]/e[1];
 if(kind)for(var n=first;n<first+count;n++)span=Math.max(span,1.15*Math.abs(value(kind,n)-L));
 return {first:first,last:first+count-1,count:count,span:span};
}
function node(tag,attrs,text){var n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs).forEach(function(k){n.setAttribute(k,attrs[k]);});if(text!==undefined)n.textContent=text;return n;}
function plot(svg,kind,L,e,N){
 var v=viewport(e,N,kind,L),w=720,h=255,left=78,right=25,top=22,bottom=213,span=v.span;
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');
 svg.setAttribute('aria-label','האיברים באינדקסים '+v.first+' עד '+v.last+'. כחול: מרחק קטן מאפסילון. אדום: על השפה או בחוץ.');
 function add(tag,attrs,text){var n=node(tag,attrs,text);svg.appendChild(n);return n;}
 function X(n){return left+(n-v.first+.5)*(w-left-right)/v.count;}
 function Y(a){return top+(L+span-a)/(2*span)*(bottom-top);}
 function text(t,x,y,color,anchor){add('text',{x:x,y:y,fill:color||'#4c596d','font-size':12,'text-anchor':anchor||'middle',direction:'ltr'},t);}
 var epsilon=e[0]/e[1];
 add('rect',{x:left,y:Y(L+epsilon),width:w-left-right,height:Y(L-epsilon)-Y(L+epsilon),fill:'#e7e1fb'});
 var labelEdges=(bottom-top)*epsilon/(2*span)>=18;
 [1,-1].forEach(function(s){add('line',{x1:left,x2:w-right,y1:Y(L+s*epsilon),y2:Y(L+s*epsilon),stroke:'#7a63bb','stroke-dasharray':'5 4'});if(labelEdges)text(plain(L*e[1]+s*e[0],e[1]),left-8,Y(L+s*epsilon)+4,'#7258b4','end');});
 if(!labelEdges)text(plain(L*e[1]-e[0],e[1])+' < aₙ < '+plain(L*e[1]+e[0],e[1]),w-right,14,'#7258b4','end');
 add('line',{x1:left,x2:w-right,y1:Y(L),y2:Y(L),stroke:'#635296'});text('L = '+L,left-8,Y(L)+4,'#635296','end');
 add('path',{d:'M '+left+' '+top+' V '+bottom+' H '+(w-right),stroke:'#586579',fill:'none'});
 add('line',{x1:X(N),x2:X(N),y1:top,y2:bottom,stroke:'#64748b','stroke-dasharray':'3 4'});text('N = '+N,X(N),14);
 for(var n=v.first;n<=v.last;n++){
  add('line',{x1:X(n),x2:X(n),y1:bottom,y2:bottom+4,stroke:'#586579'});
  // Every index is shown for this small window; stagger long labels.
  text(String(n),X(n),bottom+14+(n%2&&n>=1000?13:0));
  var a=value(kind,n),pass=kind==='reciprocal'||kind==='alternating-decay'?e[1]<e[0]*n:Math.abs(a-L)*e[1]<e[0],color=pass?'#305bc2':'#c13c53',point;
  point=add('circle',{cx:X(n),cy:Y(a),r:3.8,fill:color,'data-index':String(n)});
  var label=kind==='constant'?'4':kind==='alternating'?String(a):plain(kind==='alternating-decay'&&n%2?-1:1,n);
  point.appendChild(node('title',{},'a_'+n+' = '+label));
 }
 return v;
}
var api={choices:choices,fraction:fraction,plain:plain,value:value,tail:tail,viewport:viewport,plot:plot,node:node};
root.LimitActivities=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
