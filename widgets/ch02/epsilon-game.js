(function(root){
'use strict';
var A=typeof module==='object'&&module.exports?require('./limit-activities.js'):root.LimitActivities;
var rounds=[{L:1,epsilon:'5/2'},{L:-1,epsilon:'5/2'},{L:0,epsilon:'3/2'},{L:2,epsilon:'5/2',custom:true}];
function judge(L,epsilon){
 if(!Number.isFinite(L)||Math.abs(L)>1000000)return {valid:false};
 var e=epsilon.split('/').map(Number),r=A.tail('alternating',L,e,1);
 return {valid:true,refuted:!r.ok,outside:r.outside===null?null:A.value('alternating',r.outside)};
}
if(typeof module==='object'&&module.exports){module.exports={rounds:rounds,judge:judge};return;}
var $=function(id){return document.getElementById(id);},current=0,states=rounds.map(function(r){return {L:r.L,epsilon:r.epsilon,checked:false};}),tabs=[];
A.choices.slice(0,6).forEach(function(e){var o=document.createElement('option');o.value=e.join('/');o.textContent=A.plain(e[0],e[1]);$('epsilon').appendChild(o);});
function draw(){
 var s=states[current],r=judge(s.L,s.epsilon);$('candidate-label').hidden=!rounds[current].custom;
 $('setup').innerHTML='<span class="m">a<sub>n</sub> = (−1)<sup>n</sup>, &nbsp; L = '+(r.valid?s.L:'?')+'</span>';
 if(!r.valid){$('read').textContent='כתבו מועמד מספרי סופי שערכו המוחלט אינו גדול ממיליון.';return;}
 A.plot($('plot'),'alternating',s.L,s.epsilon.split('/').map(Number),1,{markIndex:false});
 $('read').className='read'+(s.checked&&r.refuted?' good':'');
 $('read').textContent=!s.checked?'צמצמו את הרצועה כדי למצוא ערך שחוזר מחוץ לה.':r.refuted?'✓ המועמד אינו הגבול. הערך '+r.outside+' נמצא על השפה או בחוץ, והוא חוזר כל שני אינדקסים. לכן תמיד יהיו עוד איברים בחוץ.':'כל האיברים ברצועה הזאת. הצלחה עבור סף שגיאה אחד אינה מוכיחה גבול: נסו רצועה צרה יותר.';
}
function activate(i){current=i;$('epsilon').value=states[i].epsilon;$('candidate').value=String(states[i].L);tabs.forEach(function(t,j){t.setAttribute('aria-selected',String(j===i));t.setAttribute('tabindex',j===i?'0':'-1');});$('stage-panel').setAttribute('aria-labelledby','candidate-tab-'+i);draw();}
rounds.forEach(function(r,i){var t=document.createElement('button');t.type='button';t.id='candidate-tab-'+i;t.setAttribute('role','tab');t.textContent=r.custom?'מועמד אחר':'L = '+r.L;t.dir='ltr';t.addEventListener('click',function(){activate(i);});t.addEventListener('keydown',function(e){var j=e.key==='ArrowLeft'?(i+1)%4:e.key==='ArrowRight'?(i+3)%4:e.key==='Home'?0:e.key==='End'?3:null;if(j!==null){e.preventDefault();activate(j);tabs[j].focus();}});tabs.push(t);$('stages').appendChild(t);});
$('epsilon').addEventListener('change',function(){states[current].epsilon=this.value;states[current].checked=false;draw();});
$('candidate').addEventListener('input',function(){states[current].L=this.value.trim()===''?NaN:Number(this.value);states[current].checked=false;draw();});
$('check').addEventListener('click',function(){states[current].checked=true;draw();});
$('reveal').addEventListener('click',function(){states[current].epsilon='1/2';states[current].checked=true;$('epsilon').value='1/2';draw();});
$('reset').addEventListener('click',function(){states[current]={L:rounds[current].L,epsilon:rounds[current].epsilon,checked:false};activate(current);});
root.addEventListener('resize',draw);activate(0);
})(typeof window!=='undefined'?window:globalThis);
