/* A reusable number line: choose circle/arrow ends, place lines and points.
   No network dependencies. Written answers remain independent of the drawing. */
(function (root) {
  "use strict";
  const I = typeof module !== "undefined" && module.exports ? require("../widgets/shared/intervals.js") : root.Intervals;
  const part = (a,b,ac=false,bc=false) => ({a,b,ac,bc});
  function model(initial) {
    const base=[...new Set(initial)].sort((a,b)=>a-b);
    let lines=[], points=new Map(), history=[];
    if (!base.length || base.some(x=>!Number.isFinite(x))) throw Error("Invalid number-line marks");
    const save=()=>{history.push({lines:structuredClone(lines),points:[...points]});if(history.length>100)history.shift();};
    function value(){
      let set=I.normalize(lines);
      // Circle choices apply to the whole picture. An empty circle still cuts a
      // hole when another line is subsequently placed across the same number.
      points.forEach((on,v)=>{set=I.operation(set,[part(v,v,true,true)],on?'union':'difference');});
      return set;
    }
    const finite=v=>{if(!Number.isFinite(v))throw Error("צריך מספר ממשי מוגדר.");};
    return {
      get marks(){return [...new Set(base.concat([...points.keys()]))].sort((a,b)=>a-b);},
      get points(){return [...points.keys()];},get value(){return value();},get canUndo(){return !!history.length;},
      line(a,b,ac=false,bc=false){
        if(a!==-Infinity)finite(a);if(b!==Infinity)finite(b);
        if(!(a<b))throw Error("הקצה השמאלי צריך להיות קטן מהימני. לנקודה בודדת בחרו ״נקודה״.");
        save();lines=I.normalize(lines.concat([part(a,b)]));
        if(Number.isFinite(a))points.set(a,!!ac);if(Number.isFinite(b))points.set(b,!!bc);
      },
      point(v,on){finite(v);save();points.set(v,!!on);},
      togglePoint(v){this.point(v,!I.contains(value(),v));},
      clear(){save();lines=[];points=new Map();},
      reset(){lines=[];points=new Map();history=[];},
      undo(){const old=history.pop();if(old){lines=old.lines;points=new Map(old.points);}},
      check(expected){const w=I.witness(expected,value());return w===null?{ok:true}:{ok:false,witness:w,missing:I.contains(expected,w)};}
    };
  }
  function create(host, cfg) {
    const M=model(cfg.marks), ns="http://www.w3.org/2000/svg";
    let revealed=false, mode='line', activeEnd='a';
    function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
    function button(text,action,cls){const b=el('button',cls||'ix-btn ix-quiet',text);b.type='button';b.addEventListener('click',action);return b;}
    host.classList.add('set-plot');
    const help=el('p','sp-help','בחרו קצוות, כתבו את המספרים והניחו על הישר. אפשר לבחור מספר גם בלחיצה על סימון בציר.');
    const tools=el('div','sp-tools'), modes=el('div','sp-bar');
    const lineMode=button('קו',()=>setMode('line')),pointMode=button('נקודה',()=>setMode('point'));
    modes.appendChild(lineMode);modes.appendChild(pointMode);tools.appendChild(modes);
    const template=el('div','sp-template'), pointTemplate=el('div','sp-point-template');
    function end(name,label,arrow){
      const box=el('div','sp-end'),select=el('select');
      select.setAttribute('aria-label',label+' — סוג הקצה');select.setAttribute('data-end',name);
      [['open','○'],['closed','●'],['arrow',arrow]].forEach(([v,t])=>{const o=el('option','',t);o.value=v;select.appendChild(o);});select.value='open';
      const field=cfg.input();field.setAttribute('aria-label',label+' — מספר');field.setAttribute('data-coordinate',name);
      field.addEventListener('focus',()=>{activeEnd=name;});
      select.addEventListener('change',()=>{field.hidden=select.value==='arrow';activeEnd=select.value==='arrow'?(name==='a'?'b':'a'):name;});
      box.appendChild(el('span','sp-end-label',label));box.appendChild(select);box.appendChild(field);
      return {box,select,field};
    }
    const a=end('a','קצה שמאלי','←'),b=end('b','קצה ימני','→');
    template.appendChild(a.box);template.appendChild(el('span','sp-template-line'));template.appendChild(b.box);
    const pointKind=el('select');pointKind.setAttribute('aria-label','סוג הנקודה');
    [['closed','● הוספת נקודה'],['open','○ הוצאת נקודה']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;pointKind.appendChild(o);});pointKind.value='closed';
    const number=cfg.input();number.setAttribute('aria-label','מיקום הנקודה');number.setAttribute('data-coordinate','point');
    pointTemplate.appendChild(pointKind);pointTemplate.appendChild(number);
    const place=button('הנחה על הישר',placeShape,'ix-btn ix-main');
    tools.appendChild(template);tools.appendChild(pointTemplate);tools.appendChild(place);
    function setMode(next){mode=next;template.hidden=mode!=='line';pointTemplate.hidden=mode!=='point';lineMode.setAttribute('aria-pressed',mode==='line');pointMode.setAttribute('aria-pressed',mode==='point');}
    function placeShape(){
      if(revealed)return;
      try{
        if(mode==='point')M.point(cfg.number(number),pointKind.value==='closed');
        else M.line(a.select.value==='arrow'?-Infinity:cfg.number(a.field),b.select.value==='arrow'?Infinity:cfg.number(b.field),a.select.value==='closed',b.select.value==='closed');
        changed();
      }catch(e){say(e.message);}
    }
    [a.field,b.field,number].forEach(field=>field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();placeShape();}},true));
    function choose(v){
      if(revealed)return;
      if(mode==='point'){number.value=String(v);number.focus();return;}
      if(a.select.value==='arrow'&&b.select.value==='arrow')return;
      let target=activeEnd==='a'?a:b;
      if(target.select.value==='arrow')target=target===a?b:a;
      target.field.value=String(v);target.field.focus();activeEnd=target===a?'b':'a';
    }
    setMode('line');
    const scroller=el('div','sp-scroll'), svg=document.createElementNS(ns,'svg');
    svg.setAttribute('role','group');svg.setAttribute('aria-label','סרטוט הקבוצה על הישר הממשי');scroller.appendChild(svg);
    const status=el('div','sp-status');status.setAttribute('aria-live','polite');
    const note=el('div','sp-scale');
    const bar=el('div','sp-bar');
    const check=button('בדיקת הסרטוט',()=>checkPlot());
    const reveal=button('הצגת הסרטוט',()=>show(!revealed));
    const undo=button('ביטול',()=>{M.undo();changed();});
    const clear=button('ניקוי',()=>{M.clear();changed();});
    [check,reveal,undo,clear].forEach(b=>bar.appendChild(b));
    const notation=el('details','sp-extra');notation.appendChild(el('summary','','הסרטוט כסימון של קבוצה'));
    const formula=el('div','sp-notation');notation.appendChild(formula);
    function translate(){if(notation.open)cfg.notation(formula,revealed?cfg.answer:M.value);}
    notation.addEventListener('toggle',translate);
    [help,tools,scroller,note,bar,notation,status].forEach(n=>host.appendChild(n));
    function say(text,good=false){status.textContent=text;status.className='sp-status'+(good?' sp-good':'');}
    function changed(){revealed=false;say('');draw();if(cfg.onChange)cfg.onChange();}
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
      const given=[cfg.a,cfg.b].filter(Boolean), rows=given.length+1;
      const marks=[...new Set(M.marks.concat((revealed?cfg.answer:[]).concat(...given).flatMap(p=>[p.a,p.b]).filter(Number.isFinite)))].sort((a,b)=>a-b);
      const width=Math.max(420,scroller.clientWidth||640,marks.length*45+100), height=rows*70+30;
      svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const left=45,right=width-45, span=marks[marks.length-1]-marks[0]||1;
      let ordered=marks.some((v,i)=>i&&(v-marks[i-1])*(right-left-70)/span<38);
      const x=v=>v===-Infinity?left:v===Infinity?right:ordered?left+35+(right-left-70)*marks.indexOf(v)/Math.max(1,marks.length-1):left+35+(right-left-70)*(v-marks[0])/span;
      note.textContent=ordered?'המרווחים בציור אינם בקנה מידה; סדר המספרים נשמר.':'';
      function line(a,b,y,color,w=1){elem('line',{x1:a,x2:b,y1:y,y2:y,stroke:color,'stroke-width':w});}
      function arrow(px,y,dir,color){elem('path',{d:`M ${px-dir*7} ${y-5} L ${px} ${y} L ${px-dir*7} ${y+5}`,fill:'none',stroke:color,'stroke-width':2});}
      function base(y,label){line(left,right,y,'#94a3b8');arrow(right,y,1,'#94a3b8');arrow(left,y,-1,'#94a3b8');if(label)elem('text',{x:width-8,y:y-17,'text-anchor':'end',fill:'#475569'},label);}
      function plot(set,y,color){I.normalize(set).forEach(p=>{
        if(p.a!==p.b)line(x(p.a),x(p.b),y,color,5);
        if(p.a===-Infinity)arrow(left,y,-1,color);if(p.b===Infinity)arrow(right,y,1,color);
        [...new Set([p.a,p.b])].filter(Number.isFinite).forEach(v=>elem('circle',{cx:x(v),cy:y,r:5.5,fill:I.contains(set,v)?color:'white',stroke:color,'stroke-width':2}));
      });}
      given.forEach((set,i)=>{const y=25+i*70;base(y,i?'B':'A');plot(set,y,i?'#9333ea':'#2563eb');});
      const y=25+given.length*70,color=revealed?'#b45309':'#0f766e';base(y,revealed?'התשובה':'הסרטוט שלי');plot(S,y,color);
      marks.forEach(v=>{
        for(let row=0;row<rows;row++)elem('line',{x1:x(v),x2:x(v),y1:25+row*70-4,y2:25+row*70+4,stroke:'#94a3b8'});
        const label=elem('g',revealed?{}:{role:'button',tabindex:0,'aria-label':'בחירת המספר '+I.label(v),class:'sp-tick','data-mark':v});
        elem('rect',{x:x(v)-18,y:y+10,width:36,height:32,fill:'transparent'},undefined,label);
        elem('text',{x:x(v),y:y+31,'text-anchor':'middle',fill:'#334155'},I.label(v),label);
        if(!revealed){label.addEventListener('click',()=>choose(v));label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(v);}});}
      });
      // Only the student's line is editable. Given sets are aligned references.
      if(!revealed){
        M.points.forEach(v=>{
          const selected=I.contains(S,v),g=elem('g',{role:'button',tabindex:0,'aria-label':I.label(v)+(selected?' שייך; לחצו להוציא':' אינו שייך; לחצו להוסיף'),'aria-pressed':selected,class:'sp-point','data-point':v});
          elem('circle',{cx:x(v),cy:y,r:16,fill:'transparent'},undefined,g);
          elem('circle',{cx:x(v),cy:y,r:5.5,fill:selected?color:'white',stroke:color,'stroke-width':2},undefined,g);
          const toggle=()=>{M.togglePoint(v);changed();};
          g.addEventListener('click',toggle);
          g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();const next=svg.querySelector('[data-point="'+v+'"]');if(next)next.focus();}});
        });
      }
      tools.hidden=revealed;help.hidden=revealed;
      reveal.textContent=revealed?'חזרה לסרטוט שלי':'הצגת הסרטוט';
      undo.disabled=!M.canUndo;clear.disabled=revealed;check.disabled=revealed;
      translate();
    }
    if(root.ResizeObserver)new root.ResizeObserver(()=>draw()).observe(scroller);
    draw();
    return {check:checkPlot,reveal:()=>show(true),reset:()=>{M.reset();[a.field,b.field,number].forEach(f=>{f.value='';});changed();},model:M};
  }
  const api={model,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SetPlot=api;
})(typeof window==='undefined'?this:window);
