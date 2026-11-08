/* A reusable number line: choose circle/arrow ends, place lines and points.
   No network dependencies. Written answers remain independent of the drawing. */
(function (root) {
  "use strict";
  const I = typeof module !== "undefined" && module.exports ? require("../widgets/shared/intervals.js") : root.Intervals;
  const part = (a,b,ac=false,bc=false) => ({a,b,ac,bc});
  function model(initial=[]) {
    let lines=[], points=new Map(), history=[], nextId=1;
    if (initial.some(x=>!Number.isFinite(x))) throw Error("Invalid number-line marks");
    const save=()=>{history.push({lines:structuredClone(lines),points:[...points]});if(history.length>100)history.shift();};
    function value(lineParts=lines, pointEdits=points){
      let set=I.normalize(lineParts);
      // Only deliberately placed/toggled points override the union of lines.
      // An open endpoint belongs to its own interval, not to this override map.
      pointEdits.forEach((on,v)=>{set=I.operation(set,[part(v,v,true,true)],on?'union':'difference');});
      return set;
    }
    const finite=v=>{if(!Number.isFinite(v))throw Error("צריך מספר ממשי מוגדר.");};
    return {
      get marks(){return [...new Set(value().flatMap(p=>[p.a,p.b]).filter(Number.isFinite))].sort((a,b)=>a-b);},
      get points(){return this.marks;},get value(){return value();},get canUndo(){return !!history.length;},
      get lines(){return lines.map(p=>({...p}));},get pointEdits(){return [...points].map(([v,on])=>({v,on}));},
      line(a,b,ac=false,bc=false){
        if(a!==-Infinity)finite(a);if(b!==Infinity)finite(b);
        if(!(a<b))throw Error("הקצה השמאלי צריך להיות קטן מהימני. לנקודה בודדת בחרו ״נקודה״.");
        const added={...part(a,b,ac,bc),id:nextId};
        if(I.witness(value(),value(lines.concat([added])))===null)return false;
        save();lines.push(added);nextId++;return true;
      },
      point(v,on){
        finite(v);on=!!on;
        if(I.contains(value(),v)===on)return false;
        save();
        if(I.contains(lines,v)===on)points.delete(v);else points.set(v,on);
        return true;
      },
      togglePoint(v){this.point(v,!I.contains(value(),v));},
      removeLine(id){
        if(!lines.some(p=>p.id===id))return false;
        save();lines=lines.filter(p=>p.id!==id);
        points.forEach((on,v)=>{if(!on&&!I.contains(lines,v))points.delete(v);});return true;
      },
      removePoint(v){if(!points.has(v))return false;save();points.delete(v);return true;},
      clear(){save();lines=[];points=new Map();},
      reset(){lines=[];points=new Map();history=[];},
      undo(){const old=history.pop();if(old){lines=old.lines;points=new Map(old.points);}},
      check(expected){const w=I.witness(expected,value());return w===null?{ok:true}:{ok:false,witness:w,missing:I.contains(expected,w)};}
    };
  }
  function create(host, cfg) {
    const M=model(cfg.marks), ns="http://www.w3.org/2000/svg";
    let revealed=!!cfg.readOnly, mode='line', viewport=null, autoRange=null;
    function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
    function button(text,action,cls){const b=el('button',cls||'ix-btn ix-quiet',text);b.type='button';b.addEventListener('click',action);return b;}
    host.classList.add('set-plot');
    if(cfg.readOnly)host.classList.add('sp-answer');
    const help=el('p','sp-help','בחרו קצוות, כתבו את המספרים והניחו על הישר. קווים שמוסיפים מצטרפים באיחוד.');
    const tools=el('div','sp-tools'), modes=el('div','sp-bar');
    const lineMode=button('קו',()=>setMode('line')),pointMode=button('נקודה',()=>setMode('point')),deleteMode=button('מחיקה',()=>setMode('delete'));
    modes.appendChild(lineMode);modes.appendChild(pointMode);modes.appendChild(deleteMode);tools.appendChild(modes);
    const template=el('div','sp-template'), pointTemplate=el('div','sp-point-template');
    function coordinate(label,name){
      const box=el('div','sp-coordinate'),field=cfg.input(),preview=el('span','ix-preview sp-coordinate-preview');
      field.setAttribute('aria-label',label);field.setAttribute('data-coordinate',name);preview.setAttribute('dir','ltr');
      const update=()=>{if(cfg.preview)cfg.preview(preview,field);};
      field.addEventListener('input',update);field.addEventListener('focus',update);
      box.appendChild(field);box.appendChild(preview);return {box,field,preview};
    }
    function end(name,label,arrow){
      const box=el('div','sp-end'),select=el('select');
      select.setAttribute('aria-label',label+' — סוג הקצה');select.setAttribute('data-end',name);
      [['open','○'],['closed','●'],['arrow',arrow]].forEach(([v,t])=>{const o=el('option','',t);o.value=v;select.appendChild(o);});select.value='open';
      const entry=coordinate(label+' — מספר',name),field=entry.field;
      select.addEventListener('change',()=>{entry.box.hidden=field.hidden=select.value==='arrow';});
      box.appendChild(el('span','sp-end-label',label));box.appendChild(select);box.appendChild(entry.box);
      return {box,select,field,preview:entry.preview};
    }
    const a=end('a','קצה שמאלי','←'),b=end('b','קצה ימני','→');
    template.appendChild(a.box);template.appendChild(el('span','sp-template-line'));template.appendChild(b.box);
    const pointKind=el('select');pointKind.setAttribute('aria-label','סוג הנקודה');
    [['closed','● הוספת נקודה'],['open','○ הוצאת נקודה']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;pointKind.appendChild(o);});pointKind.value='closed';
    const pointEntry=coordinate('מיקום הנקודה','point'),number=pointEntry.field;
    pointTemplate.appendChild(pointKind);pointTemplate.appendChild(pointEntry.box);
    const place=button('הנחה על הישר',placeShape,'ix-btn ix-main');
    const deletePanel=el('div','sp-delete-panel'),entryStatus=el('div','sp-entry-status');entryStatus.setAttribute('aria-live','polite');
    tools.appendChild(template);tools.appendChild(pointTemplate);tools.appendChild(place);tools.appendChild(deletePanel);tools.appendChild(entryStatus);
    function setMode(next){
      mode=next;template.hidden=mode!=='line';pointTemplate.hidden=mode!=='point';place.hidden=mode==='delete';deletePanel.hidden=mode!=='delete';entryStatus.textContent='';
      lineMode.setAttribute('aria-pressed',mode==='line');pointMode.setAttribute('aria-pressed',mode==='point');deleteMode.setAttribute('aria-pressed',mode==='delete');
      help.textContent=mode==='delete'?'לחצו על קו או נקודה למחיקה. אפשר לבחור גם ברשימה, למשל כשקווים חופפים. מחיקת חור מחזירה את הנקודה לקו.':'בחרו קצוות, כתבו את המספרים והניחו על הישר. קווים שמוסיפים מצטרפים באיחוד.';
      draw();
    }
    function placeShape(){
      if(revealed)return;
      try{
        let added;
        if(mode==='point')added=M.point(cfg.number(number),pointKind.value==='closed');
        else added=M.line(a.select.value==='arrow'?-Infinity:cfg.number(a.field),b.select.value==='arrow'?Infinity:cfg.number(b.field),a.select.value==='closed',b.select.value==='closed');
        if(!added){entryStatus.textContent=mode==='point'?(pointKind.value==='closed'?'הנקודה כבר שייכת לקבוצה; אין מה להוסיף.':'הנקודה כבר אינה שייכת לקבוצה; אין מה להוציא.'):'הקו כבר כלול בסרטוט; אין שינוי.';return;}
        changed();
      }catch(e){entryStatus.textContent=e.message;}
    }
    [a.field,b.field,number].forEach(field=>field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();placeShape();}},true));
    const scroller=el('div','sp-scroll'), svg=document.createElementNS(ns,'svg');
    svg.setAttribute('role','group');svg.setAttribute('aria-label','סרטוט הקבוצה על הישר הממשי');scroller.appendChild(svg);
    const status=el('div','sp-status');status.setAttribute('aria-live','polite');
    const bar=el('div','sp-bar');
    const check=button('בדיקת הסרטוט',()=>checkPlot());
    const reveal=button('הצגת הסרטוט',()=>show(!revealed));
    const undo=button('ביטול',()=>{M.undo();changed();});
    const clear=button('ניקוי',()=>{M.clear();changed();});
    [check,reveal,undo,clear].forEach(b=>bar.appendChild(b));
    const notation=el('details','sp-extra');notation.appendChild(el('summary','','הסרטוט כסימון של קבוצה'));
    const formula=el('div','sp-notation');notation.appendChild(formula);
    const rangeControls=el('details','sp-range');rangeControls.appendChild(el('summary','','טווח התצוגה'));
    const rangeFields=el('div','sp-range-fields'),rangeMessage=el('div','sp-range-message');rangeMessage.setAttribute('aria-live','polite');
    function rangeField(label,name){
      const wrapper=el('label','',label),field=el('input');field.type='number';field.step='any';field.setAttribute('aria-label',label);field.setAttribute('data-view-bound',name);wrapper.appendChild(field);rangeFields.appendChild(wrapper);return field;
    }
    const viewLeft=rangeField('גבול שמאלי','left'),viewRight=rangeField('גבול ימני','right');
    function validView(lo,hi){
      if(!autoRange||!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo)return false;
      const [a,b]=autoRange,span=b-a;
      return hi-lo>=span*.5&&hi-lo<=span*6&&lo<=a+span*.1&&hi>=b-span*.1;
    }
    rangeFields.appendChild(button('עדכון הטווח',()=>{
      const lo=viewLeft.value.trim()?Number(viewLeft.value):NaN,hi=viewRight.value.trim()?Number(viewRight.value):NaN;
      if(!validView(lo,hi)){rangeMessage.textContent='בחרו טווח שמכיל את הקצוות, ברוחב שבין חצי לפי שישה מהטווח האוטומטי.';return;}
      viewport=[lo,hi];rangeMessage.textContent='';draw();
    }));
    rangeFields.appendChild(button('טווח אוטומטי',()=>{viewport=null;rangeMessage.textContent='';draw();}));
    rangeControls.appendChild(rangeFields);rangeControls.appendChild(rangeMessage);
    function translate(){if(notation.open)cfg.notation(formula,revealed?cfg.answer:M.value);}
    notation.addEventListener('toggle',translate);
    (cfg.readOnly?[scroller,rangeControls]:[help,tools,scroller,rangeControls,bar,...(cfg.showNotation===false?[]:[notation]),status]).forEach(n=>host.appendChild(n));
    function say(text,good=false){status.textContent=text;status.className='sp-status'+(good?' sp-good':'');}
    function changed(){revealed=false;say('');entryStatus.textContent='';draw();if(cfg.onChange)cfg.onChange();}
    function checkPlot(){
      const r=M.check(cfg.answer);
      r.msg=r.ok?'✓ הסרטוט נכון.':'בסרטוט, בדקו את '+I.label(r.witness)+': '+(r.missing?'המספר שייך לקבוצה, אבל לא סימנתם אותו.':'סימנתם את המספר, אבל הוא אינו שייך לקבוצה.');
      say(r.msg,r.ok);return r;
    }
    function show(on){revealed=on;say(on?'הסרטוט המוצג הוא התשובה. הסרטוט שלכם נשמר.':'');draw();}
    function elem(tag,attrs,text,parent=svg){const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;}
    function draw(){
      svg.replaceChildren();
      const S=revealed?cfg.answer:M.value;
      const given=[cfg.a,cfg.b].filter(Boolean), rowGap=44, firstRow=24;
      const marks=[...new Set((revealed?[]:M.marks).concat((revealed?cfg.answer:[]).concat(...given).flatMap(p=>[p.a,p.b]).filter(Number.isFinite)))].sort((a,b)=>a-b);
      const width=Math.min(460,Math.max(280,scroller.clientWidth||460));
      const left=24,right=width-24;
      // Always retain numeric distances. Labels may move down to avoid collisions,
      // but the points themselves never move to an equally spaced ordinal grid.
      const range=marks.length?marks:(cfg.marks&&cfg.marks.length?cfg.marks:[-1,1]);
      const low=Math.min(...range),high=Math.max(...range),span=high-low||2;
      const origin=high===low?low-1:low;
      autoRange=[origin-span*.14,origin+span*1.14];
      if(viewport&&!validView(...viewport))viewport=null;
      const [viewMin,viewMax]=viewport||autoRange;
      if(!viewport){viewLeft.value=String(Number(viewMin.toPrecision(8)));viewRight.value=String(Number(viewMax.toPrecision(8)));}
      const x=v=>v===-Infinity?left:v===Infinity?right:left+(right-left)*(v-viewMin)/(viewMax-viewMin);
      const labelEnds=[], labels=marks.map(v=>{
        const text=I.label(v),half=Math.max(16,text.length*4.5),px=x(v);
        let lane=0;while(labelEnds[lane]!==undefined&&labelEnds[lane]+8>px-half)lane++;
        labelEnds[lane]=px+half;return {v,text,px,lane};
      });
      const y=firstRow+given.length*rowGap;
      const height=y+(labels.length?40+Math.max(0,labelEnds.length-1)*22:16);
      svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      function line(a,b,y,color,w=1){elem('line',{x1:a,x2:b,y1:y,y2:y,stroke:color,'stroke-width':w});}
      function arrow(px,y,dir,color){elem('path',{d:`M ${px-dir*7} ${y-5} L ${px} ${y} L ${px-dir*7} ${y+5}`,fill:'none',stroke:color,'stroke-width':2});}
      function base(y,label){line(left,right,y,'#94a3b8');if(label)elem('text',{x:width-8,y:y-10,'text-anchor':'end',fill:'#475569'},label);}
      function plot(set,y,color){I.normalize(set).forEach(p=>{
        if(p.a!==p.b)line(x(p.a),x(p.b),y,color,5);
        if(p.a===-Infinity)arrow(left,y,-1,color);if(p.b===Infinity)arrow(right,y,1,color);
        [...new Set([p.a,p.b])].filter(Number.isFinite).forEach(v=>elem('circle',{cx:x(v),cy:y,r:5.5,fill:I.contains(set,v)?color:'white',stroke:color,'stroke-width':2}));
      });}
      given.forEach((set,i)=>{const rowY=firstRow+i*rowGap;base(rowY,i?'B':'A');plot(set,rowY,i?'#9333ea':'#2563eb');});
      const color=cfg.readOnly?'#0f766e':revealed?'#b45309':'#0f766e';base(y,cfg.readOnly?'':revealed?'התשובה':'הסרטוט שלי');plot(S,y,color);
      labels.forEach(({v,text,px,lane})=>{
        if(lane)elem('line',{x1:px,x2:px,y1:y+10,y2:y+16+lane*22,stroke:'#cbd5e1'});
        elem('text',{x:px,y:y+26+lane*22,'text-anchor':'middle',fill:'#334155','data-label':v},text);
      });
      // The normal view has only meaningful circles and no click-to-toggle.
      if(!revealed){
        M.points.forEach(v=>{
          const selected=I.contains(S,v),g=elem('g',{'aria-label':I.label(v)+(selected?' שייך':' אינו שייך'),class:'sp-point','data-point':v});
          elem('circle',{cx:x(v),cy:y,r:5.5,fill:selected?color:'white',stroke:color,'stroke-width':2},undefined,g);
        });
      }
      deletePanel.replaceChildren();
      if(mode==='delete'&&!revealed){
        function deletable(tag,attrs,label,action){
          const target=elem(tag,{...attrs,role:'button',tabindex:0,'aria-label':label,class:'sp-delete-target'});
          target.addEventListener('click',action);target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
          deletePanel.appendChild(button(label,action));return target;
        }
        M.lines.forEach(p=>deletable('line',{x1:x(p.a),x2:x(p.b),y1:y,y2:y,'stroke-width':16,stroke:'transparent','data-delete-line':p.id},'מחיקת הקו '+I.notation([p]),()=>{M.removeLine(p.id);changed();}));
        M.pointEdits.forEach(({v,on})=>deletable('circle',{cx:x(v),cy:y,r:11,fill:'transparent','data-delete-point':v},'מחיקת '+(on?'הנקודה ':'החור ')+I.label(v),()=>{M.removePoint(v);changed();}));
        if(!M.lines.length&&!M.pointEdits.length)deletePanel.textContent='אין מה למחוק.';
      }
      tools.hidden=revealed;help.hidden=revealed;
      reveal.textContent=revealed?'חזרה לסרטוט שלי':'הצגת הסרטוט';
      undo.disabled=!M.canUndo;clear.disabled=revealed;check.disabled=revealed;
      translate();
    }
    if(root.ResizeObserver)new root.ResizeObserver(()=>draw()).observe(scroller);
    setMode('line');
    return {check:checkPlot,reveal:()=>show(true),reset:()=>{M.reset();[a.field,b.field,number].forEach(f=>{f.value='';});[a.preview,b.preview,pointEntry.preview].forEach(p=>{p.innerHTML='';});changed();},model:M};
  }
  const api={model,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SetPlot=api;
})(typeof window==='undefined'?this:window);
