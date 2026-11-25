(function(root){
'use strict';
function state(q,M){
 let N=null;
 if(q>1){N=1;while(q**N<=M)N++;}
 // Also show both parities after the magnitude crosses M for q < -1.
 let crossing=1;
 if(Math.abs(q)>1)while(Math.abs(q)**crossing<=M)crossing++;
 const count=5,first=Math.max(1,crossing-2);
 const terms=Array.from({length:count},(_,i)=>({n:first+i,value:q**(first+i)}));
 const extent=Math.max(M*1.2,...terms.map(t=>Math.abs(t.value)))*1.1;
 return {q,M,N,first,terms,extent};
}
if(typeof module==='object'&&module.exports){module.exports={state};return;}
const A=root.LimitActivities,$=id=>document.getElementById(id);
function fraction(x){return x<0?'−'+A.fraction(Math.abs(Math.round(x*2)),2):A.fraction(Math.round(x*2),2);}
function formatQ(q){return Number.isInteger(q)?String(q).replace('-','−'):fraction(q);}
function draw(){
 const q=Number($('q').value)/2,M=Number($('threshold').value),s=state(q,M);
 const qHTML=formatQ(q);
 $('q-value').innerHTML=qHTML;$('threshold-value').textContent=M;
 $('formula').innerHTML='a<sub>n</sub> = ('+qHTML+')<sup>n</sup>, &nbsp; n ≥ 1';
 const svg=$('plot'),width=Math.max(320,Math.min(720,svg.getBoundingClientRect().width||720));
 const left=54,right=width-16,top=26,bottom=252;
 const minY=q<0?-s.extent:0;
 const X=n=>left+(n-s.first+.5)*(right-left)/s.terms.length;
 const Y=y=>bottom-(y-minY)*(bottom-top)/(s.extent-minY);
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+width+' 285');
 svg.setAttribute('aria-label','הבסיס '+q+', הסף '+M+'. מוצגים האינדקסים '+s.first+' עד '+(s.first+s.terms.length-1));
 function add(t,a,text){const el=A.node(t,a,text);svg.appendChild(el);return el;}
 function label(text,x,y,anchor='middle',color='#475569'){return add('text',{x,y,'text-anchor':anchor,'font-size':12,direction:'ltr',fill:color},text);}
 add('line',{x1:left,x2:left,y1:top,y2:bottom,stroke:'#64748b'});
 add('line',{x1:left,x2:right,y1:Y(0),y2:Y(0),stroke:'#94a3b8'});
 add('line',{x1:left,x2:right,y1:Y(M),y2:Y(M),stroke:'#7657ae','stroke-dasharray':'5 4'});
 label('M = '+M,left-7,Y(M)+4,'end','#7657ae');label('aₙ',left-22,15);label('n',right,bottom+22);
 // Keep the origin label away from M when the exponential scale is large.
 if(Math.abs(Y(0)-Y(M))>22)label('0',left-7,Y(0)+4,'end');
 if(s.N!==null){add('line',{x1:X(s.N),x2:X(s.N),y1:top,y2:bottom,stroke:'#64748b','stroke-dasharray':'3 4'});label('N = '+s.N,Math.max(left+25,X(s.N)),15);}
 for(const t of s.terms){
  const dot=add('circle',{cx:X(t.n),cy:Y(t.value),r:4,fill:t.value>M?'#2563a6':'#b72e46','data-index':t.n,'data-above':t.value>M});
  dot.appendChild(A.node('title',{},'n = '+t.n));
  label(String(t.n),X(t.n),bottom+19);
 }
 let text;
 if(q>1){text='<p>האיבר באינדקס <span class="m">N = '+s.N+'</span> גדול מהסף:</p><p class="m">('+qHTML+')<sup>'+s.N+'</sup> &gt; '+M+'</p><p>מכאן כל צעד כופל בגורם גדול מאחת, ולכן כל האיברים הבאים נשארים מעל הסף.</p>';}
 else if(q<-1){text='<p>האיברים הזוגיים חיוביים והאי־זוגיים שליליים:</p><p class="m">a<sub>2k</sub> = ('+formatQ(Math.abs(q))+')<sup>2k</sup> &gt; 0, &nbsp; a<sub>2k−1</sub> = −('+formatQ(Math.abs(q))+')<sup>2k−1</sup> &lt; 0</p><p>הערכים המוחלטים גדלים, אבל אחרי כל אינדקס חוזרים גם מתחת לאפס. אין גבול אינסופי באף כיוון.</p>';}
 else if(q===1){text='<p class="m">a<sub>n</sub> = 1</p><p>האיברים קבועים. הם אינם עוברים סף גדול מאחת, ולכן הסדרה אינה שואפת לאינסוף.</p>';}
 else if(q===-1){text='<p class="m">a<sub>2k</sub> = 1, &nbsp; a<sub>2k−1</sub> = −1</p><p>האיברים ממשיכים להתחלף בין שני ערכים. אין גבול סופי ואין גבול אינסופי.</p>';}
 else {text='<p class="m">|q| &lt; 1</p><p>הערכים המוחלטים שואפים לאפס. '+(q<0?'הסימן מתחלף, אבל התנודות קטנות.':q===0?'כל האיברים שווים לאפס.':'האיברים מתקרבים לאפס.')+'</p>';}
 $('read').innerHTML=text;
}
$('q').addEventListener('input',draw);$('threshold').addEventListener('input',draw);root.addEventListener('resize',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
