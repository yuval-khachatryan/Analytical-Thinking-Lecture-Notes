(function(root){
'use strict';
function index(kind,k){return kind==='even'?2*k:kind==='odd'?2*k-1:3*k;}
function terms(kind,count){return Array.from({length:count},function(_,i){var k=i+1,n=index(kind,k);return {k:k,n:n,value:1/(n+1)};});}
if(typeof module==='object'&&module.exports){module.exports={index:index,terms:terms};return;}
var A=root.LimitActivities,$=function(id){return document.getElementById(id);};
function draw(){
 var kind=$('selection').value,only=$('mode').value==='only',eps=Number($('epsilon').value),picked=terms(kind,8),last=only?8:picked[7].n,svg=$('plot'),w=Math.max(320,Math.min(720,svg.getBoundingClientRect().width||720)),left=55,right=w-15,top=22,bottom=190;
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' 230');svg.setAttribute('data-axis',only?'k':'n');
 function add(t,a,s){var node=A.node(t,a,s);svg.appendChild(node);return node;}
 function X(n){return left+(n-.5)*(right-left)/last;}function Y(a){return top+(.55-a)*(bottom-top)/.85;}
 function label(s,x,y,color){add('text',{x:x,y:y,'text-anchor':'middle',direction:'ltr','font-size':12,fill:color||'#475569'},s);}
 add('rect',{x:left,y:Y(eps),width:right-left,height:2*eps*(bottom-top)/.85,fill:'#e7e1fb'});
 add('path',{d:'M '+left+' '+top+' V '+bottom+' H '+right,stroke:'#64748b',fill:'none'});
 add('line',{x1:left,x2:right,y1:Y(0),y2:Y(0),stroke:'#7351ba'});label('L = 0',25,Y(0)+4);label('ε',35,Y(eps)+4);label(only?'k':'n',right,225);
 for(var j=1;j<=last;j++){
  var t=only?picked[j-1]:{n:j,k:null,value:1/(j+1)},selected=only||picked.some(function(v){return v.n===j;});
  var dot=add('circle',{cx:X(j),cy:Y(t.value),r:selected?4.2:2.5,fill:selected?'#7949b8':'#3d77b7','data-original-index':String(t.n),'data-value':String(t.value)});
  dot.appendChild(A.node('title',{},(only?'b_'+j+' = a_':'a_')+t.n+' = 1/'+(t.n+1)));
  if(last<=12||j===1||j%2===0)label(j,X(j),bottom+18);
 }
 $('indices').textContent='nₖ = '+(kind==='even'?'2k':kind==='odd'?'2k−1':'3k')+';  '+picked.slice(0,3).map(function(t){return 'b'+t.k+' = a'+t.n;}).join(', ')+', …';
 $('read').textContent=only?'כאן האינדקס k סופר את הבחירות. הגובה של כל נקודה נשאר ערך האיבר המקורי שנבחר. גם כל האיברים המאוחרים יותר בתת־הסדרה נשארים ברצועה.':'כל נקודה סגולה היא נקודה של הסדרה המקורית. ברגע שכל האיברים המקוריים נשארים ברצועה, גם האיברים שנבחרים מתוכם נשארים בה.';
}
['selection','mode','epsilon'].forEach(function(id){$(id).addEventListener('change',draw);});root.addEventListener('resize',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
