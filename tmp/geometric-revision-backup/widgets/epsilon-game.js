/* A fixed sequence/candidate in each freely accessible stage; drafts stay local. */
(function(root){
'use strict';
var A=typeof module!=='undefined'&&module.exports?require('./limit-activities.js'):root.LimitActivities;
var rounds=[
 {id:'constant-limit',kind:'constant',L:4,formula:'4',epsilon:'1/10',N:1,limit:true,reason:'zero'},
 {id:'reciprocal',kind:'reciprocal',L:0,formula:A.fraction(1,'n'),epsilon:'1/2',N:3,limit:true,reason:'all'},
 {id:'alternating-one',kind:'alternating',L:1,formula:'(−1)<sup>n</sup>',epsilon:'5/2',N:1,limit:false,reason:'outside'},
 {id:'alternating-minus-one',kind:'alternating',L:-1,formula:'(−1)<sup>n</sup>',epsilon:'5/2',N:1,limit:false,reason:'outside'},
 {id:'alternating-zero',kind:'alternating',L:0,formula:'(−1)<sup>n</sup>',epsilon:'3/2',N:1,limit:false,reason:'outside'},
 {id:'alternating-decay',kind:'alternating-decay',L:0,formula:A.fraction('(−1)<sup>n</sup>','n'),epsilon:'1/10',N:10,limit:true,reason:'all'},
 {id:'constant-other',kind:'constant',L:3,formula:'4',epsilon:'2/1',N:1,limit:false,reason:'outside'}
];
function initial(r){return {epsilon:r.epsilon,N:String(r.N),verdict:'',reason:'',checked:false,solved:false,revealed:false,feedback:'',feedbackClass:''};}
function eps(s){return s.epsilon.split('/').map(Number);}
function math(s){return '<span class="m">'+s+'</span>';}
function test(r,s){return A.tail(r.kind,r.L,eps(s),Number(s.N));}
function reasonText(r,s){
 if(s.reason==='one')return 'עבור סף השגיאה שבחרתי, כל האיברים מהאינדקס שבחרתי והלאה נמצאים ברצועה.';
 if(s.reason==='zero')return 'כל האיברים שווים למועמד '+math('L')+', ולכן השגיאה היא אפס וקטנה מכל '+math('ε > 0')+'.';
 if(s.reason==='all'){
  if(r.kind==='constant'&&r.L===4)return 'לכל '+math('ε > 0')+' בוחרים '+math('N = 1')+'. כל האיברים שווים 4, ולכן השגיאה היא אפס וקטנה מסף השגיאה.';
  return 'המרחק מן המועמד הוא '+math('|a<sub>n</sub> − L| = '+A.fraction(1,'n'))+'. לכל '+math('ε > 0')+' בוחרים אינדקס טבעי '+math('N > '+A.fraction(1,'ε'))+'. אז לכל '+math('n ≥ N')+' המרחק קטן מסף השגיאה.';
 }
 if(s.reason==='outside')return 'עבור סף השגיאה שבחרתי, אחרי כל אינדקס מופיע עוד איבר על שפת הרצועה או מחוץ לה. אין אינדקס שממנו כל האיברים בפנים.';
 if(s.reason==='single')return 'מצאתי איבר אחד על שפת הרצועה או מחוץ לה.';
 return '';
}
function explanation(r,s){
 if(r.reason==='zero')return 'כל איברי הסדרה הם 4, והמועמד הוא 4. השגיאה תמיד אפס, ולכן כל סף שגיאה חיובי מתאים, כבר מהאינדקס הראשון.';
 if(r.reason==='all')return reasonText(r,{reason:'all'})+' גם אם האינדקס הנוכחי קטן מדי, אפשר לבחור אינדקס מתאים.';
 var tail=test(r,s);
 if(r.kind==='constant')return 'כל איברי הסדרה שווים 4, ומרחקם מהמועמד 3 הוא 1. בסף השגיאה שנבחר הם בחוץ בכל אינדקס. לכן 3 אינו הגבול; הסדרה עצמה מתכנסת ל 4.';
 var outside=A.value(r.kind,tail.outside),distance=Math.abs(outside-r.L);
 return 'האיבר באינדקס '+math(String(tail.outside))+' שווה '+math(String(outside).replace('-','−'))+', ומרחקו מהמועמד הוא '+math(String(distance))+'. אותו ערך חוזר כל שני אינדקסים. לכן גם אחרי כל אינדקס אחר יהיו איברים בחוץ: '+math(String(r.L).replace('-','−'))+' אינו הגבול.';
}
function judge(r,s){
 var t=test(r,s);
 if(!s.checked||!t.valid)return {ok:false,message:'בדקו תחילה את הזנב עבור סף השגיאה והאינדקס שבחרתם.'};
 if(!s.verdict||!s.reason)return {ok:false,message:'בחרו תשובה וגם נימוק.'};
 if(s.reason==='one')return {ok:false,message:t.ok?'הבדיקה הצליחה עבור סף שגיאה אחד. ההגדרה דורשת הצלחה לכל סף שגיאה חיובי; בחרו נימוק שמספיק למסקנה.':'בנימוק כתבתם שכל הזנב בפנים, אבל הבדיקה הנוכחית מראה איבר בחוץ. גם הצלחה עבור סף אחד בלבד אינה מוכיחה התכנסות.'};
 if(s.reason==='single')return {ok:false,message:'איבר אחד בחוץ אינו שולל גבול: אפשר להתחיל אחריו. כדי לשלול את המועמד צריך להראות שיש איברים בחוץ אחרי כל אינדקס.'};
 if((s.verdict==='yes')!==r.limit)return {ok:false,message:r.limit?'בדקו אם אפשר לבחור אינדקס מתאים לכל סף שגיאה חיובי. כישלון של בחירת אינדקס אחת אינו שולל את הגבול.':'כל האיברים יכולים להתאים לסף רחב בלי להתקרב למועמד. נסו סף שגיאה קטן יותר ובדקו מה קורה בכל זנב.'};
 if(s.reason!==r.reason&&!(r.reason==='zero'&&s.reason==='all'))return {ok:false,message:'המסקנה נכונה, אבל הנימוק אינו מתאים לסדרה ולמועמד הנתונים. בדקו את נוסחת המרחק מן המועמד.'};
 if(!r.limit&&!t.impossible)return {ok:false,message:'המועמד אכן אינו הגבול, אבל עבור סף השגיאה שבחרתם כל הזנב בפנים. בחרו סף שגיאה קטן יותר שמדגים את הנימוק שלכם, ובדקו שוב.'};
 return {ok:true,message:'✓ נכון — גם התשובה וגם הנימוק מתאימים. '+explanation(r,s)};
}
var api={rounds:rounds,initial:initial,judge:judge};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
root.EpsilonGame=api;
var $=function(id){return document.getElementById(id);},current=0,states=rounds.map(initial),tabs=[];
function sync(){var s=states[current];s.epsilon=$('epsilon').value;s.N=$('index').value;s.verdict=$('verdict').value;s.reason=$('reason').value;}
function status(){
 tabs.forEach(function(tab,i){var active=i===current;tab.textContent=String(i+1)+(states[i].solved?' ✓':'');tab.classList.toggle('complete',states[i].solved);tab.setAttribute('aria-selected',String(active));tab.setAttribute('tabindex',active?'0':'-1');tab.setAttribute('aria-label','שלב '+(i+1)+(states[i].solved?', הושלם':''));});
 $('progress').textContent=states.filter(function(s){return s.solved;}).length+' מתוך '+rounds.length+' הושלמו';
 var s=states[current];$('next').hidden=current===rounds.length-1||!(s.solved||s.revealed);
}
function draw(){var r=rounds[current],s=states[current],t=test(r,s);A.plot($('plot'),r.kind,r.L,eps(s),t.valid?Number(s.N):1);}
function showTail(){
 var r=rounds[current],s=states[current],t=test(r,s),read=$('read');
 read.className='read';
 if(!s.checked)read.textContent='בדקו אם כל האיברים מהאינדקס שנבחר והלאה נמצאים בתוך הרצועה.';
 else if(!t.valid)read.textContent='כתבו אינדקס טבעי בין 1 ל 10,000,000.';
 else if(t.ok){read.className+=' good';read.textContent='✓ כל האיברים מהאינדקס הזה והלאה נמצאים ברצועה עבור סף השגיאה שנבחר.';}
 else{read.className+=' bad';read.innerHTML='האיבר באינדקס '+math(String(t.outside))+' נמצא על שפת הרצועה או מחוץ לה. '+(t.impossible?'אותו ערך מופיע שוב ושוב גם באינדקסים מאוחרים יותר.':'בדקו אם אינדקס מאוחר יותר יספיק.');}
 $('conclusion').hidden=!s.checked||!t.valid;
}
function showReason(){var s=states[current];$('reason-detail').hidden=!s.reason;$('reason-detail').innerHTML=reasonText(rounds[current],s);}
function feedback(){var s=states[current];$('feedback').hidden=!s.feedback;$('feedback').className='read '+s.feedbackClass;$('feedback').innerHTML=s.feedback;status();}
function go(i){
 current=i;var r=rounds[i],s=states[i];
 $('stage-panel').setAttribute('aria-labelledby','stage-'+i);
 $('setup').innerHTML='<span>הסדרה: '+math('a<sub>n</sub> = '+r.formula)+'</span><span>המועמד: '+math('L = '+String(r.L).replace('-','−'))+'</span>';
 $('epsilon').replaceChildren();A.choices.filter(function(e){return r.kind!=='alternating'||10*e[0]>=e[1];}).forEach(function(e){var o=document.createElement('option');o.value=e.join('/');o.textContent=A.plain(e[0],e[1]);$('epsilon').appendChild(o);});
 $('epsilon').value=s.epsilon;$('index').value=s.N;$('verdict').value=s.verdict;$('reason').value=s.reason;
 showTail();showReason();feedback();draw();
}
function invalidate(tail){sync();var s=states[current];if(tail)s.checked=false;s.solved=false;s.revealed=false;s.feedback='';s.feedbackClass='';showTail();showReason();feedback();draw();}
rounds.forEach(function(r,i){var tab=document.createElement('button');tab.id='stage-'+i;tab.setAttribute('id',tab.id);tab.setAttribute('role','tab');tab.setAttribute('aria-controls','stage-panel');tab.addEventListener('click',function(){sync();go(i);});tab.addEventListener('keydown',function(e){var target=e.key==='ArrowLeft'?(i+1)%rounds.length:e.key==='ArrowRight'?(i+rounds.length-1)%rounds.length:e.key==='Home'?0:e.key==='End'?rounds.length-1:null;if(target!==null){e.preventDefault();sync();go(target);tabs[target].focus();}});tabs.push(tab);$('stages').appendChild(tab);});
$('epsilon').addEventListener('change',function(){invalidate(true);});$('index').addEventListener('input',function(){invalidate(true);});
['verdict','reason'].forEach(function(id){$(id).addEventListener('change',function(){invalidate(false);});});
function check(){sync();states[current].checked=true;showTail();draw();}
$('check').addEventListener('click',check);
$('later').addEventListener('click',function(){sync();var s=states[current],t=test(rounds[current],s);if(!t.valid){check();return;}$('index').value=String(Math.min(10000000,Math.max(Number(s.N)+10,t.safe||0)));invalidate(true);check();});
$('answer-check').addEventListener('click',function(){sync();var s=states[current],result=judge(rounds[current],s);s.solved=result.ok;s.revealed=false;s.feedback=result.message;s.feedbackClass=result.ok?'good':'bad';feedback();});
$('hint').addEventListener('click',function(){var s=states[current],r=rounds[current];s.feedback=r.limit?'כתבו את המרחק של איבר כללי מן המועמד. איך מבטיחים שהוא קטן מכל סף שגיאה חיובי שנבחר?':'הקטינו את סף השגיאה. האם מעבר לאינדקסים מאוחרים יותר יכול להוציא מן הזנב את כל האיברים שבחוץ?';s.feedbackClass='';feedback();});
$('reveal').addEventListener('click',function(){sync();var s=states[current],r=rounds[current];s.verdict=r.limit?'yes':'no';s.reason=r.reason;if(!r.limit)s.epsilon='1/2';var t=test(r,s);if(!t.valid)s.N='1';if(r.reason==='all')s.N=String(Math.max(Number(s.N),Math.floor(eps(s)[1]/eps(s)[0])+1));s.checked=true;s.revealed=true;s.feedback=explanation(r,s);s.feedbackClass='';go(current);});
$('reset').addEventListener('click',function(){states[current]=initial(rounds[current]);go(current);});
$('next').addEventListener('click',function(){var s=states[current];if(current<rounds.length-1&&(s.solved||s.revealed)){sync();go(current+1);tabs[current].focus();}});
go(0);
})(typeof window!=='undefined'?window:globalThis);
