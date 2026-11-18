(function(root){
'use strict';
function value(kind,n){return kind==='negative'?-n:n;}
function state(kind,M,N){
 var terms=Array.from({length:N},function(_,i){var n=i+1,a=value(kind,n);return {n:n,a:a,outside:Math.abs(a)>M};});
 return {terms:terms,firstOutside:Math.floor(M)+1,extent:Math.max(2,M,N)+2};
}
if(typeof module==='object'&&module.exports){module.exports={value:value,state:state};return;}
var A=root.LimitActivities,$=function(id){return document.getElementById(id);};
function draw(){
 var kind=$('sequence').value,M=Number($('bound').value),N=Number($('count').value),s=state(kind,M,N);
 $('bound-value').textContent=String(M);$('count-value').textContent=String(N);
 var svg=$('plot'),w=Math.max(320,Math.min(720,svg.getBoundingClientRect().width||720)),left=67,right=w-20,top=25,bottom=245;
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' 280');
 svg.setAttribute('data-y-extent',String(s.extent));
 svg.setAttribute('aria-label','איברי הסדרה באינדקסים 1 עד '+N+'. כחול: ערך מוחלט לכל היותר '+M+'. אדום: ערך מוחלט גדול מ '+M+'.');
 function add(tag,attrs,text){var node=A.node(tag,attrs,text);svg.appendChild(node);return node;}
 function X(n){return left+(n-.5)*(right-left)/Math.max(N,4);}
 function Y(a){return top+(s.extent-a)*(bottom-top)/(2*s.extent);}
 function label(text,x,y,color,anchor){return add('text',{x:x,y:y,fill:color||'#475569','font-size':12,'text-anchor':anchor||'middle',direction:'ltr'},text);}
 add('rect',{x:left,y:Y(M),width:right-left,height:Y(-M)-Y(M),fill:'#e7eef8'});
 add('line',{x1:left,x2:left,y1:top,y2:bottom,stroke:'#64748b'});
 add('line',{x1:left,x2:right,y1:bottom,y2:bottom,stroke:'#64748b'});
 add('line',{x1:left,x2:right,y1:Y(0),y2:Y(0),stroke:'#b2bbc8'});
 // Keep both bound labels legible even when the vertical scale grows.
 if(M===0){
  add('line',{x1:left,x2:right,y1:Y(0),y2:Y(0),stroke:'#7657ae','stroke-dasharray':'5 4'});
  label('M = 0',left-9,Y(0)+4,'#7657ae','end');
 }else{
  [-1,1].forEach(function(sign){
   var y=Y(sign*M),ly=Y(0)+sign*-Math.max(14,Math.abs(y-Y(0)));
   add('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#7657ae','stroke-dasharray':'5 4'});
   add('line',{x1:left-6,x2:left,y1:ly,y2:y,stroke:'#7657ae'});
   label(sign===1?'M = '+M:'−M = −'+M,left-9,ly+4,'#7657ae','end');
  });
  label('0',left-9,Y(0)+4,null,'end');
 }
 label('aₙ',left-15,15);label('n',right,bottom+25);
 var stride=Math.max(1,Math.ceil(N/Math.max(4,Math.floor((right-left)/36))));
 s.terms.forEach(function(t){
  var color=t.outside?'#b72e46':'#2563a6';
  var radius=Math.max(1.8,Math.min(3.4,(right-left)/Math.max(N,4)*.38));
  var p=add('circle',{cx:X(t.n),cy:Y(t.a),r:t.n===s.firstOutside?5:radius,fill:color,'data-index':String(t.n),'data-value':String(t.a),'data-outside':String(t.outside)});
  p.appendChild(A.node('title',{},'a'+t.n+' = '+String(t.a).replace('-','−')));
  if(t.n===1||t.n===N||t.n%stride===0&&N-t.n>stride/2){label(String(t.n),X(t.n),bottom+17);}
 });
 // Highlight the first counterexample when it is among the displayed terms.
 if(N>=s.firstOutside){
  var first=s.terms[s.firstOutside-1];
  add('circle',{cx:X(first.n),cy:Y(first.a),r:8,fill:'none',stroke:'#b72e46','stroke-width':1.5,'data-first-outside':String(first.n)});
 }
 var shown=N>=s.firstOutside;
 $('read').className='read bound-read'+(shown?' bad':' pending');
 $('read').innerHTML=shown?
  '<p>באינדקס <span class="m">n = M + 1 = '+s.firstOutside+'</span> מתקיים <strong class="m">|a<sub>'+s.firstOutside+'</sub>| = '+s.firstOutside+' &gt; '+M+' = M</strong>.</p><p>הנקודה האדומה המוקפת היא הראשונה מחוץ לרצועה. הגדילו את <span class="m">M</span> ואז את <span class="m">N</span>: שוב יופיעו איברים מחוץ לה.</p>':
  '<p>כל האיברים המוצגים מקיימים <span class="m">|a<sub>n</sub>| ≤ '+M+'</span>. <strong>זה עדיין לא חסם לכל הסדרה.</strong></p><p>הגדילו את <span class="m">N</span> עד <span class="m">M + 1 = '+s.firstOutside+'</span> כדי לראות את האיבר הראשון שמחוץ לרצועה.</p>';
}
['bound','count'].forEach(function(id){$(id).addEventListener('input',draw);});
$('sequence').addEventListener('change',draw);root.addEventListener('resize',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
