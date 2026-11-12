/* A few terms suffice: every later term is ten times closer to zero. */
(function(root){
'use strict';
function view(level){
  var z=Math.max(0,Math.min(8,Math.round(Number(level)||0)));
  var first=z+1,tail=z+4,terms=[];
  for(var n=first;n<=tail+4;n++)terms.push({index:n,x:84+520*Math.pow(10,first-n)});
  return {zoom:z,first:first,tail:tail,earlier:tail-1,outside:z,terms:terms};
}
if(typeof module==='object'&&module.exports)module.exports={view:view};
if(!root.document)return;
var A=root.LimitActivities,doc=root.document,$=function(id){return doc.getElementById(id);},svg=$('plot'),zoom=$('zoom');
function sub(n){return String(n).replace(/[0-9]/g,function(d){return '₀₁₂₃₄₅₆₇₈₉'[Number(d)];});}
function power(n){return n===1?'10':'10<sup>'+n+'</sup>';}
function value(n){return A.fraction('1',power(n));}
function draw(){
  var v=view(zoom.value),y=94;svg.replaceChildren();svg.setAttribute('data-tail-start',String(v.tail));
  svg.setAttribute('aria-label','הגדלה סביב אפס. האיברים באינדקסים '+v.first+', '+(v.first+1)+', '+(v.first+2)+' נראים בנפרד; הזנב מאינדקס '+v.tail+' מצטופף ליד אפס.');
  function add(tag,attrs,text){var node=A.node(tag,attrs,text);svg.appendChild(node);return node;}
  add('line',{x1:48,x2:674,y1:y,y2:y,stroke:'#64748b','stroke-width':1.3});
  // The early terms outside the magnified window still exist.
  if(v.outside)add('path',{d:'M 664 89 L 674 94 L 664 99',fill:'none',stroke:'#64748b','stroke-width':1.3});
  add('line',{x1:84,x2:84,y1:y-5,y2:y+5,stroke:'#7351ba'});
  v.terms.forEach(function(term){
    var dot=add('circle',{cx:term.x,cy:y,r:2,fill:'#2757b8','data-index':String(term.index)});
    dot.appendChild(A.node('title',{},'a'+sub(term.index)+' = 1/10^'+term.index));
  });
  // All omitted terms lie even closer to zero than the last drawn term.
  var limit=add('circle',{cx:84,cy:y,r:3.5,fill:'#7351ba'});
  limit.appendChild(A.node('title',{},'L = 0; כל הזנב מאינדקס '+v.tail+' נראה כאן באותו מקום.'));
  add('text',{x:84,y:131,fill:'#7351ba','text-anchor':'middle',direction:'ltr','font-size':15},'L = 0');
  v.terms.slice(0,3).forEach(function(term,i){
    var labelY=i===2?27:61;
    add('line',{x1:term.x,x2:term.x,y1:y-5,y2:labelY+8,stroke:'#9aabd0','stroke-width':1});
    add('text',{x:term.x,y:labelY,fill:'#2757b8','text-anchor':'middle',direction:'ltr','font-size':15},'a'+sub(term.index));
  });
  $('terms').innerHTML=v.terms.slice(0,3).map(function(term){return '<span class="term-value m">a<sub>'+term.index+'</sub> = '+value(term.index)+'</span>';}).join(' ');
  $('scale').innerHTML=v.zoom?'× 10<sup>'+v.zoom+'</sup>':'× 1';
  zoom.setAttribute('aria-valuetext',v.zoom?'הגדלה פי 10 בחזקת '+v.zoom:'ללא הגדלה');
  $('read').innerHTML='בהגדלה הזאת, הזנב <span class="m">a<sub>'+v.tail+'</sub>, a<sub>'+(v.tail+1)+'</sub>, …</span> נראה כאותה נקודה כמו <span class="m">L = 0</span>. לפני הזנב יש רק '+v.earlier+' איברים. '+(v.zoom<8?'הגדילו כדי לראות בנפרד חלק מהאיברים שנבלעים עכשיו ליד אפס.':'גם בהגדלה הזאת זנב מאוחר יותר עדיין נראה באותו מקום כמו אפס.');
  $('outside').textContent=v.outside===1?'איבר מוקדם אחד נמצא מימין לחלון ההגדלה. הוא לא נמחק מהסדרה.':v.outside?v.outside+' איברים מוקדמים נמצאים מימין לחלון ההגדלה. הם לא נמחקו מהסדרה.':'שלושת האיברים הראשונים נראים בנפרד. כל הזנב שמאינדקס 4 והלאה מצטופף ליד אפס.';
}
zoom.addEventListener('input',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
