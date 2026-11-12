/* Normalize the distance b-a to one; no numerical values are assigned to a or b. */
(function(root){
'use strict';
function view(choice){
  var allowed=['3/4','1/2','1/4','1/8'];
  var selected=allowed.indexOf(choice)>=0?choice:'3/4';
  var parts=selected.split('/').map(Number),r=parts[0]/parts[1],gap=1-2*r;
  return {radius:r,gap:gap,status:gap<0?'overlap':gap===0?'touch':'separate',
    intervals:[[-r,r],[1-r,1+r]],fraction:selected};
}
if(typeof module==='object'&&module.exports)module.exports={view:view};
if(!root.document)return;
var A=root.LimitActivities,doc=root.document,$=function(id){return doc.getElementById(id);},svg=$('plot'),radius=$('radius');
function draw(){
  var v=view(radius.value),X=function(x){return 240+240*x;};
  svg.replaceChildren();svg.setAttribute('data-status',v.status);
  svg.setAttribute('aria-label','סביבות סביב a ו b. '+(v.status==='overlap'?'יש חפיפה.':v.status==='touch'?'הקצוות נפגשים, אך אינם שייכים לסביבות הפתוחות.':'יש רווח בין הסביבות.'));
  function add(tag,attrs,text){var el=A.node(tag,attrs,text);svg.appendChild(el);return el;}
  function label(text,x,y,color){add('text',{x:x,y:y,'text-anchor':'middle',direction:'ltr','unicode-bidi':'isolate','font-size':17,fill:color||'#334155'},text);}
  // The same scale is used for both rows; the strip marks their common values.
  if(v.status==='overlap')add('rect',{x:X(1-v.radius),y:57,width:240*(-v.gap),height:119,fill:'#cabce9',opacity:.4,'data-region':'overlap'});
  add('line',{x1:X(0),x2:X(1),y1:22,y2:22,stroke:'#64748b'});
  [0,1].forEach(function(c){
    add('line',{x1:X(c),x2:X(c),y1:17,y2:27,stroke:'#64748b'});
    add('line',{x1:X(c),x2:X(c),y1:38,y2:183,stroke:'#cbd5e1','stroke-dasharray':'3 5'});
  });
  label('b − a',360,15);
  v.intervals.forEach(function(interval,i){
    var y=75+90*i,color=i?'#bc6846':'#7255b4',name=i?'b':'a';
    add('line',{x1:35,x2:685,y1:y,y2:y,stroke:'#cbd5e1'});
    add('line',{x1:X(interval[0]),x2:X(interval[1]),y1:y,y2:y,stroke:color,'stroke-width':6,'data-interval':name});
    interval.forEach(function(endpoint,j){
      add('circle',{cx:X(endpoint),cy:y,r:5,fill:'#faf9ff',stroke:color,'stroke-width':2});
      label(name+(j?' + ε':' − ε'),X(endpoint),y+27,color);
    });
    add('circle',{cx:X(i),cy:y,r:4,fill:color});label(name,X(i),y-17,color);
  });
  if(v.status==='separate'){
    add('line',{x1:X(v.radius),x2:X(1-v.radius),y1:124,y2:124,stroke:'#35815b','stroke-width':2,'data-region':'gap'});
    [v.radius,1-v.radius].forEach(function(x){add('line',{x1:X(x),x2:X(x),y1:120,y2:128,stroke:'#35815b'});});
  }
  $('read').textContent=v.status==='overlap'?'הסביבות חופפות: המספרים באזור המוצל שייכים לשתיהן. הקטינו את הרדיוס.':v.status==='touch'?'הקצוות נפגשים באמצע המרחק, אבל נקודת המפגש אינה שייכת לאף אחד מהקטעים הפתוחים. לכן אין חפיפה.':'נשאר רווח בין הסביבות: שום מספר אינו שייך לשתיהן.';
  $('gap').innerHTML=v.fraction==='1/4'?'רדיוס של רבע מהמרחק משאיר רווח באורך <span class="m">'+A.fraction('b − a','2')+'</span>. זה נכון לכל שני מספרים שונים.':v.fraction==='1/8'?'הרדיוס קטן עוד יותר, והרווח גדל. המרכזים והמרחק ביניהם לא השתנו.':'';
}
radius.addEventListener('change',draw);draw();
})(typeof window!=='undefined'?window:globalThis);
