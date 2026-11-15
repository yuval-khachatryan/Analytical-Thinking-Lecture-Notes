/* Decimal approximations, with independent error threshold and magnification. */
(function(root){
'use strict';
var PI='314159265358979323846264338327950288419716939937510',MAX_ZOOM=2;
var EPSILONS=[1/100,1/1000,1/10000],CENTER=550,BASE_SCALE=1800,RESOLUTION=2;
var BLUE='#2757b8',PURPLE='#7351ba',GREY='#64748b';
function decimal(n){return n===1?'3':'3.'+PI.slice(1,n);}
function error(n){return Number('0.'+PI.slice(n))*Math.pow(10,1-n);}
function mergedIndex(scale){var n=1;while(error(n)*scale>=RESOLUTION)n++;return n;}
var LAST_INDEX=mergedIndex(BASE_SCALE*Math.pow(10,MAX_ZOOM))+1;
function view(level,epsilon){
 var z=Math.max(0,Math.min(MAX_ZOOM,Math.round(Number(level)||0))),scale=BASE_SCALE*Math.pow(10,z),terms=[];
 var e=EPSILONS.indexOf(Number(epsilon))>=0?Number(epsilon):1/1000,merged=mergedIndex(scale);
 for(var n=1;n<=LAST_INDEX;n++){
  var distance=error(n),x=CENTER-distance*scale;
  terms.push({index:n,value:decimal(n),distance:distance,x:x,inside:distance<e,state:n>=merged?'merged':x<35?'outside':'distinct'});
 }
 return {zoom:z,scale:scale,terms:terms,merged:merged,firstInside:terms.find(function(t){return t.inside;}).index,epsilon:e,left:CENTER-e*scale,right:CENTER+e*scale};
}
if(typeof module==='object'&&module.exports)module.exports={view:view,decimal:decimal,error:error,maxZoom:MAX_ZOOM,lastIndex:LAST_INDEX,epsilons:EPSILONS};
if(!root.document)return;
var A=root.LimitActivities,doc=root.document,$=function(id){return doc.getElementById(id);},svg=$('plot'),epsilon=$('epsilon'),level=0;
function name(n){return 'a'+String(n).replace(/[0-9]/g,function(d){return '₀₁₂₃₄₅₆₇₈₉'[d];});}
function math(s){return '<bdi class="m">'+s+'</bdi>';}
function draw(){
 var v=view(level,epsilon.value),visible=v.terms.filter(function(t){return t.state!=='outside';}),y=94;
 svg.replaceChildren();svg.setAttribute('data-merged-from',String(v.merged));svg.setAttribute('data-epsilon',String(v.epsilon));svg.setAttribute('data-zoom',String(v.zoom));
 function add(tag,attrs,text){var n=A.node(tag,attrs,text);svg.appendChild(n);return n;}
 // Magnification changes displayed distances, never the chosen epsilon or values.
 var left=Math.max(35,v.left),right=Math.min(680,v.right);
 add('rect',{x:left,y:60,width:right-left,height:66,fill:'#ded4f7','data-neighborhood':'true'});
 [[v.left,'π − ε',-1],[v.right,'π + ε',1]].forEach(function(edge){
  if(edge[0]<35||edge[0]>680)return;
  var labelX=Math.max(83,Math.min(632,edge[0]+edge[2]*42));
  add('line',{x1:edge[0],x2:edge[0],y1:60,y2:126,stroke:PURPLE,'stroke-width':1,'stroke-dasharray':'3 3','data-boundary':edge[2]<0?'left':'right'});
  add('path',{d:'M '+edge[0]+' 128 L '+labelX+' 150',fill:'none',stroke:'#9b87c6'});
  add('text',{x:labelX,y:167,'text-anchor':'middle','font-size':14,fill:PURPLE,direction:'ltr'},edge[1]);
 });
 add('line',{x1:35,x2:680,y1:y,y2:y,stroke:GREY});
 visible.forEach(function(t){
  var point=add('circle',{cx:t.x,cy:y,r:3,fill:t.state==='merged'?PURPLE:BLUE,'data-index':String(t.index),'data-state':t.state});
  point.appendChild(A.node('title',{},name(t.index)+' = '+t.value));
 });
 add('circle',{cx:CENTER,cy:y,r:3.5,fill:PURPLE,'data-limit':'pi'});add('text',{x:CENTER,y:124,'text-anchor':'middle','font-size':17,fill:PURPLE},'π');
 // Label every separate visible term and the first one merging with pi.
 // Stagger the leader lines horizontally, leaving the points at true positions.
 var labels=visible.filter(function(t){return t.index<=v.merged;}),positions=labels.map(function(t){return t.x;});
 for(var i=positions.length-2;i>=0;i--)positions[i]=Math.min(positions[i],positions[i+1]-46);
 labels.forEach(function(t,i){
  var color=t.state==='merged'?PURPLE:BLUE;
  add('path',{d:'M '+t.x+' '+(y-5)+' L '+positions[i]+' 44',fill:'none',stroke:color,'data-label-line':String(t.index)});
  add('text',{x:positions[i],y:32,'text-anchor':'middle','font-size':17,fill:color,direction:'ltr','data-term-label':String(t.index)},name(t.index));
 });
 var list=$('terms');list.replaceChildren();
 v.terms.forEach(function(t,i){
  var span=doc.createElement('span');span.className='term-value '+t.state;span.setAttribute('data-term',String(t.index));
  span.title=name(t.index)+' = '+t.value+' — '+(t.state==='merged'?'לא ניתן להבחין בינו לבין פאי בהגדלה הזאת':t.state==='outside'?'משמאל לחלון ההגדלה':'ניתן להבחין בינו לבין פאי');
  span.textContent=t.value;list.appendChild(span);if(i<v.terms.length-1)list.appendChild(doc.createTextNode(', '));
 });
 var end=doc.createElement('span');end.className='merged';end.textContent=', … → π';list.appendChild(end);
 $('scale').textContent='× '+Math.pow(10,v.zoom);$('zoom-in').disabled=v.zoom===MAX_ZOOM;$('zoom-out').disabled=v.zoom===0;
 $('read').innerHTML='בסביבה המסומנת נמצאים '+math(name(v.firstInside))+' וכל האיברים שאחריו. בהגדלה הזאת אי אפשר להבחין בעין בין '+math(name(v.merged))+', '+math(name(v.merged+1))+' ובין '+math('π')+': הסימונים נראים כמו נקודה אחת, אף שהמספרים שונים.';
 $('outside').textContent=v.terms.some(function(t){return t.state==='outside';})?'האיברים האפורים נמצאים משמאל לחלון ההגדלה. הם לא התלכדו עם π; אפשר לראות אותם שוב כשמקטינים.':'';
}
$('zoom-in').addEventListener('click',function(){level=Math.min(MAX_ZOOM,level+1);draw();});
$('zoom-out').addEventListener('click',function(){level=Math.max(0,level-1);draw();});
epsilon.addEventListener('change',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
