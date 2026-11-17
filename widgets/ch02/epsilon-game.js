(function(root){
'use strict';
var A=typeof module==='object'&&module.exports?require('./limit-activities.js'):root.LimitActivities;
var rounds=[{L:1,epsilon:'5/2'},{L:-1,epsilon:'5/2'},{L:0,epsilon:'3/2'}];
function judge(L,epsilon){
 if(!Number.isFinite(L)||Math.abs(L)>1000000)return {valid:false};
 var e=epsilon.split('/').map(Number),r=A.tail('alternating',L,e,1);
 return {valid:true,refuted:!r.ok,outside:r.outside===null?null:A.value('alternating',r.outside)};
}
if(typeof module==='object'&&module.exports){module.exports={rounds:rounds,judge:judge};return;}
var $=function(id){return document.getElementById(id);},current=0,states=rounds.map(function(r){return {L:r.L,epsilon:r.epsilon,checked:false};}),tabs=[];
A.choices.slice(0,6).forEach(function(e){var o=document.createElement('option');o.value=e.join('/');o.textContent=A.plain(e[0],e[1]);$('epsilon').appendChild(o);});
function math(s){return '<span class="m">'+s+'</span>';}
function number(n){return String(Number(n.toPrecision(12))).replace(/-/g,'−');}
function distance(value,L){return '|'+number(value)+' − ('+number(L)+')|';}
function draw(){
 var s=states[current],r=judge(s.L,s.epsilon);
 $('setup').innerHTML='<span class="m">a<sub>n</sub> = (−1)<sup>n</sup>, &nbsp; L = '+s.L+'</span>';
 var e=s.epsilon.split('/').map(Number),epsilon=A.fraction(e[0],e[1]);
 $('epsilon-range').value=String(Math.round(10*e[0]/e[1]));$('epsilon-range').setAttribute('aria-valuetext',e[1]===1?String(e[0]):e[0]+' חלקי '+e[1]);$('epsilon-value').innerHTML=math('ε = '+epsilon);
 $('requirement').innerHTML='הדרישה לסף שבחרתם: '+math('|a<sub>n</sub> − ('+number(s.L)+')| &lt; '+epsilon)+'.';
 // Keep absolute coordinates fixed across all candidates and epsilon choices.
 A.plot($('plot'),'alternating',s.L,e,1,{markIndex:false,yRange:[-4,4],yTicks:[-1,0,1]});
 $('read').className='read'+(s.checked&&r.refuted?' good':'');
 if(!s.checked){$('read').textContent='לחצו על בדיקת הרצועה כדי לראות מה אפשר להסיק מהסף שבחרתם.';return;}
 if(r.refuted){
  var d=Math.abs(r.outside-s.L),equal=d*e[1]===e[0];
  $('read').innerHTML='<strong>✓ המועמד אינו הגבול.</strong> עבור כל איבר השווה '+math(number(r.outside))+' מתקיים:'+
   '<div class="calculation">'+math('|a<sub>n</sub> − ('+number(s.L)+')| = '+distance(r.outside,s.L)+' = '+number(d)+(equal?' = ':' &gt; ')+epsilon)+'</div>'+
   (equal?'שוויון לסף אינו מספיק. ':'')+'הערך הזה חוזר כל שני אינדקסים. לכן לכל '+math('N')+' קיים '+math('n ≥ N')+' שעבורו האיבר על שפת הרצועה או בחוץ: לא קיים אינדקס שממנו כולם בפנים.';
 }else{
  $('read').innerHTML='<strong>כל האיברים בתוך הרצועה הזאת.</strong> שני המרחקים האפשריים הם:'+
   '<div class="calculation">'+math(distance(1,s.L)+' = '+number(Math.abs(1-s.L))+' &lt; '+epsilon)+'</div>'+
   '<div class="calculation">'+math(distance(-1,s.L)+' = '+number(Math.abs(-1-s.L))+' &lt; '+epsilon)+'</div>'+
   'לכן '+math('N = 1')+' מתאים לסף הזה. <strong>הצלחה עבור סף אחד אינה מוכיחה גבול.</strong> השאירו את אותו מועמד ונסו סף קטן יותר.';
 }
}
function activate(i){current=i;$('epsilon').value=states[i].epsilon;$('epsilon').dispatchEvent(new root.Event('change'));tabs.forEach(function(t,j){t.setAttribute('aria-selected',String(j===i));t.setAttribute('tabindex',j===i?'0':'-1');});$('stage-panel').setAttribute('aria-labelledby','candidate-tab-'+i);draw();}
rounds.forEach(function(r,i){var t=document.createElement('button');t.type='button';t.id='candidate-tab-'+i;t.setAttribute('role','tab');t.setAttribute('aria-controls','stage-panel');t.textContent='L = '+r.L;t.dir='ltr';t.addEventListener('click',function(){activate(i);});t.addEventListener('keydown',function(e){var j=e.key==='ArrowLeft'?(i+1)%rounds.length:e.key==='ArrowRight'?(i+rounds.length-1)%rounds.length:e.key==='Home'?0:e.key==='End'?rounds.length-1:null;if(j!==null){e.preventDefault();activate(j);tabs[j].focus();}});tabs.push(t);$('stages').appendChild(t);});
$('epsilon').addEventListener('change',function(){var changed=states[current].epsilon!==this.value;states[current].epsilon=this.value;if(changed)states[current].checked=false;draw();});
$('epsilon-range').addEventListener('input',function(){
 var value=A.plain(Number(this.value),10);if(value.indexOf('/')<0)value+='/1';
 if(!Array.from($('epsilon').querySelectorAll('option')).some(function(o){return o.value===value;})){var option=document.createElement('option');option.value=value;option.textContent=value;$('epsilon').appendChild(option);}
 $('epsilon').value=value;$('epsilon').dispatchEvent(new root.Event('change'));
});
$('check').addEventListener('click',function(){states[current].checked=true;draw();});
$('reveal').addEventListener('click',function(){states[current].epsilon='1/2';states[current].checked=true;$('epsilon').value='1/2';$('epsilon').dispatchEvent(new root.Event('change'));draw();});
$('reset').addEventListener('click',function(){states[current]={L:rounds[current].L,epsilon:rounds[current].epsilon,checked:false};activate(current);});
root.addEventListener('resize',draw);activate(0);
})(typeof window!=='undefined'?window:globalThis);
