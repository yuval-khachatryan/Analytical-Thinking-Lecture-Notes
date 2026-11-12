/* Decimal truncations of pi, at a fixed pixel resolution and adjustable zoom. */
(function(root){
'use strict';
var PI='314159265358979323846264338327950288419716939937510',EPSILON=1/1000;
function decimal(n){return n===1?'3':'3.'+PI.slice(1,n);}
function error(n){return Number('0.'+PI.slice(n))*Math.pow(10,1-n);}
function view(level){
 var z=Math.max(0,Math.min(8,Math.round(Number(level)||0))),scale=1800*Math.pow(10,z),terms=[];
 for(var n=1;n<=16;n++)terms.push({index:n,value:decimal(n),distance:error(n),x:550-error(n)*scale});
 return {zoom:z,scale:scale,terms:terms,merged:terms.find(function(t){return 550-t.x<2;}).index,epsilon:EPSILON,left:550-EPSILON*scale,right:550+EPSILON*scale};
}
if(typeof module==='object'&&module.exports)module.exports={view:view,decimal:decimal,error:error};
if(!root.document)return;
var A=root.LimitActivities,doc=root.document,$=function(id){return doc.getElementById(id);},svg=$('plot'),zoom=$('zoom');
function draw(){
 var v=view(zoom.value),visible=v.terms.filter(function(t){return t.x>=45&&t.index<=v.merged+1;}),y=90;svg.replaceChildren();svg.setAttribute('data-merged-from',String(v.merged));
 function add(tag,attrs,text){var n=A.node(tag,attrs,text);svg.appendChild(n);return n;}
 // Keep the same mathematical neighborhood at every magnification. Clip its
 // drawing to the viewport; never move an offscreen endpoint onto the axis.
 var left=Math.max(35,v.left),right=Math.min(680,v.right);
 add('rect',{x:left,y:58,width:right-left,height:63,fill:'#ded4f7','data-neighborhood':'true'});
 svg.setAttribute('data-epsilon',String(v.epsilon));
 [[v.left,'π − ε',-1],[v.right,'π + ε',1]].forEach(function(edge){
  if(edge[0]<35||edge[0]>680)return;
  var labelX=Math.max(83,Math.min(632,edge[0]+edge[2]*42));
  add('line',{x1:edge[0],x2:edge[0],y1:58,y2:121,stroke:'#7351ba','stroke-width':1,'stroke-dasharray':'3 3','data-boundary':edge[2]<0?'left':'right'});
  add('path',{d:'M '+edge[0]+' 123 L '+labelX+' 151',fill:'none',stroke:'#9b87c6'});
  add('text',{x:labelX,y:168,'text-anchor':'middle','font-size':14,fill:'#7351ba',direction:'ltr'},edge[1]);
 });
 add('line',{x1:35,x2:680,y1:y,y2:y,stroke:'#64748b'});
 visible.forEach(function(t){var point=add('circle',{cx:t.x,cy:y,r:3,fill:'#2757b8','data-index':String(t.index)});point.appendChild(A.node('title',{},'a_'+t.index+' = '+t.value));});
 add('circle',{cx:550,cy:y,r:3.5,fill:'#7351ba','data-limit':'pi'});add('text',{x:550,y:125,'text-anchor':'middle','font-size':17,fill:'#7351ba'},'π');
 visible.filter(function(t){return 550-t.x>=18;}).slice(-2).forEach(function(t){
  add('line',{x1:t.x,x2:t.x,y1:y-5,y2:50,stroke:'#9aabd0'});add('text',{x:t.x,y:40,'text-anchor':'middle','font-size':14,direction:'ltr'},'a'+t.index);
 });
 function name(n){return 'a'+String(n).replace(/[0-9]/g,function(d){return '₀₁₂₃₄₅₆₇₈₉'[d];});}
 $('terms').textContent=v.terms.filter(function(t){return t.index>=v.merged-1&&t.index<=v.merged+1;}).map(function(t){return name(t.index)+' = '+t.value;}).join(' ; ');
 $('scale').textContent='× '+Math.pow(10,v.zoom);
 $('read').innerHTML='בהגדלה הזאת אי אפשר להבחין בעין בין <bdi class="m">'+name(v.merged)+'</bdi>, <bdi class="m">'+name(v.merged+1)+'</bdi> ובין <bdi class="m">π</bdi>: הסימונים שלהם נראים כמו נקודה אחת. גם כל הקירובים הבאים נראים באותו מקום. המספרים עדיין שונים; הגדלה נוספת מאפשרת לראות חלק מההבדלים.';
 $('outside').textContent=visible[0].index>1?'הקירובים המוקדמים יותר נמצאים משמאל לחלון ההגדלה. הם עדיין חלק מהסדרה.':'הגדילו סביב π כדי לראות הבדלים קטנים יותר.';
}
zoom.addEventListener('input',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
