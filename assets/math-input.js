/* Editable typeset mathematics, with a small, explicit bridge to the course checker.
   MathLive handles the caret, selection, fractions, scripts, undo and touch input.
   We never evaluate or simplify a student's expression while reading it. */
(function (root) {
  "use strict";
  var EMPTY = "יש מקום ריק בביטוי. השלימו אותו לפני הבדיקה.";
  function latexToPlain(source) {
    var s = String(source || ""), at = 0;
    if (s.length > 12000) throw new Error("הביטוי ארוך מדי לבדיקה.");
    // Size commands affect only appearance. Preserve the delimiters themselves,
    // including mismatched interval brackets, and reject unfinished fences.
    s = s.replace(/\\(?:left|right|mleft|mright)\s*([.?])/g, function (_, c) {
      if (c === "?") throw new Error(EMPTY);
      return "";
    }).replace(/\\(?:left|right|mleft|mright|bigl|bigr|Bigl|Bigr|big|Big)\b/g, "");
    function space() { while (/\s/.test(s[at] || "") && at < s.length) at++; }
    function group(open, close) {
      space();
      if (s[at] !== open) throw new Error(EMPTY);
      at++; var v = sequence(close);
      if (s[at] !== close) throw new Error(EMPTY);
      at++; return v;
    }
    function argument() {
      space();
      if (s[at] === "{") { var v = group("{", "}"); if (!v.trim()) throw new Error(EMPTY); return v; }
      if (at >= s.length) throw new Error(EMPTY);
      return atom();
    }
    function command() {
      at++;
      if (at >= s.length) throw new Error(EMPTY);
      if (!/[a-z]/i.test(s[at])) {
        var c = s[at++];
        if ("{}|".indexOf(c) >= 0) return c;
        if (",;!: ".indexOf(c) >= 0) return " ";
        throw new Error("הסימן הזה אינו נתמך בבדיקה.");
      }
      var m = /^[a-z]+/i.exec(s.slice(at))[0]; at += m.length;
      var symbols = { infty:"inf", pi:"pi", epsilon:"ε", varepsilon:"ε", cdot:"*", times:"*", div:"/", le:"<=", leq:"<=", ge:">=", geq:">=", ne:"!=", neq:"!=",
        cup:" U ", cap:" cap ", setminus:"\\", backslash:"\\", emptyset:"{}", varnothing:"{}", in:" in ", lbrace:"{", rbrace:"}",
        lbrack:"[", rbrack:"]", lparen:"(", rparen:")", vert:"|", mid:"|", colon:":", lvert:"|", rvert:"|", lfloor:"floor(", rfloor:")", lor:" or ", vee:" or ", land:" and ", wedge:" and ", neg:" not ", lnot:" not " };
      if (Object.prototype.hasOwnProperty.call(symbols, m)) return symbols[m];
      if(m==="to"||m==="rightarrow")return "->";
      if(m==="lim"){
        space();var index="n";
        if(s[at]==="_"){at++;var bound=argument().replace(/\s/g,"");var match=/^([a-z])->inf$/.exec(bound);if(!match)throw new Error("כאן מחשבים גבול כשהאינדקס שואף לאינסוף.");index=match[1];}
        space();var body=s[at]==="("?group("(",")"):argument();
        return "lim("+(index!=="n"?index+",":"")+body+")";
      }
      if (/^(quad|qquad|enspace|thinspace|medspace|thickspace|displaystyle|textstyle|scriptstyle|scriptscriptstyle)$/.test(m)) return " ";
      if (/^(frac|dfrac|tfrac|cfrac)$/.test(m)) { var a = argument(), b = argument(); return "((" + a + ")/(" + b + "))"; }
      if (m === "sqrt") {
        space(); var degree = s[at] === "[" ? group("[", "]") : null, body = argument();
        if (degree !== null && !degree.trim()) throw new Error(EMPTY);
        return degree === null ? "sqrt(" + body + ")" : "root(" + degree + "," + body + ")";
      }
      if (m === "placeholder" || m === "prompt") throw new Error(EMPTY);
      if(m === "class"){
        // Only our presentation wrapper is accepted; it adds no mathematics.
        if(group("{","}").trim()!=="course-logic")throw new Error("סימון העיצוב הזה אינו נתמך בבדיקה.");
        return group("{","}");
      }
      if (/^(text|mathrm|mathit|operatorname|mathbb)$/.test(m)) {
        var word = group("{", "}").trim();
        if (word === "או" || word === "or") return " or ";
        if (word === "וגם" || word === "גם" || word === "and") return " and ";
        if (word === "ולא" || word === "and not") return " and not ";
        if (word === "לא" || word === "not") return " not ";
        if (word === "R" || word === "ℝ") return "R";
        if (/^(sin|cos|tan|arcsin|arccos|arctan|ln|log|abs|floor|sgn|sign|inf|infinity|e)$/.test(word)) return word;
        if (!word) return "";
        throw new Error("כתבו ביטוי מתמטי בשדה; טקסט חופשי אינו נתמך בבדיקה.");
      }
      if (/^(sin|cos|tan|arcsin|arccos|arctan|ln|log)$/.test(m)) return m;
      // Fail explicitly instead of silently dropping unsupported mathematics.
      throw new Error("הסימן \\" + m + " אינו נתמך בבדיקה הזו.");
    }
    function atom() {
      var c = s[at];
      if (c === "\\") return command();
      if (c === "{") { var v = group("{", "}"); if (!v.trim()) throw new Error(EMPTY); return "(" + v + ")"; }
      if (c === "^" || c === "_") { at++; return c + "(" + argument() + ")"; }
      if (c === "□" || c === "▢" || c === "?") throw new Error(EMPTY);
      at++; return c;
    }
    function sequence(end) { var out = ""; while (at < s.length && s[at] !== end) out += atom(); return out; }
    var result = sequence(null).trim();
    // Function powers are printed before the argument: sin²(x), not sin(x²).
    // Parenthesized arguments (the toolbar's form) are handled without guessing.
    result = functionPowers(result);
    return result;
  }
  function functionPowers(s) {
    function end(start) { var depth=0; for(var i=start;i<s.length;i++){if(s[i]==='(')depth++;if(s[i]===')'&&!--depth)return i;} return -1; }
    var re=/\b(sin|cos|tan|arcsin|arccos|arctan|ln|log)\s*\^\s*\(/g, m;
    while((m=re.exec(s))) {
      var a=re.lastIndex-1,b=end(a),c=b+1;while(/\s/.test(s[c]||'')&&c<s.length)c++;
      if(b<0||s[c]!=='(') throw new Error("כתבו את הארגומנט של הפונקציה בסוגריים.");
      var d=end(c);if(d<0)throw new Error(EMPTY);
      s=s.slice(0,m.index)+'('+m[1]+s.slice(c,d+1)+')^'+s.slice(a,b+1)+s.slice(d+1);re.lastIndex=0;
    }
    return s;
  }
  function logicalLatex(word){return "\\class{course-logic}{\\text{\u00a0"+word+"\u00a0}}";}
  function isolateLogicalLatex(source){
    return String(source||"").replace(/\\class\{course-logic\}\{\\text\{\s*(וגם|ולא|או|לא)\s*\}\}|\\text\{\s*(וגם|ולא|או|לא)\s*\}/g,function(_,wrapped,plain){return logicalLatex(wrapped||plain);});
  }
  var templates = {
    "lim()":"\\lim_{n\\to\\infty}\\left(#0\\right)",
    "_":"#@_{#?}",
    "_n":"#@_{n}",
    "{x|}":"\\left\\{x\\mid #0\\right\\}",
    "/":"\\frac{#@}{#?}", "^":"#@^{#?}", "√()":"\\sqrt{#0}", "sqrt()":"\\sqrt{#0}", "cbrt()":"\\sqrt[3]{#0}", "root()":"\\sqrt[#?]{#0}",
    "()":"\\left(#0\\right)", "[]":"\\left[#0\\right]", "[)":"\\left[#0\\right)", "(]":"\\left(#0\\right]",
    "||":"\\left|#0\\right|", "{}":"\\left\\{#0\\right\\}",
    "log_()":"\\log_{#?}\\left(#?\\right)", "sin()":"\\sin\\left(#0\\right)", "cos()":"\\cos\\left(#0\\right)", "tan()":"\\tan\\left(#0\\right)",
    "ln()":"\\ln\\left(#0\\right)", "floor()":"\\lfloor#0\\rfloor", "ε":"\\varepsilon", "∞":"\\infty", "-∞":"-\\infty", "π":"\\pi",
    "∅":"\\emptyset", "ℝ":"\\mathbb{R}", " ∪ ":"\\cup", " ∩ ":"\\cap", " ∖ ":"\\setminus", "≤":"\\le", "≥":"\\ge", "≠":"\\ne",
    " או ":logicalLatex("או"), " וגם ":logicalLatex("וגם"), " ולא ":logicalLatex("ולא"), " לא ":logicalLatex("לא")
  };
  var toLatex = function (s) { return s; }, configured = false, activeReady = null;
  var libraryBases = ["https://cdn.jsdelivr.net/npm/mathlive@0.111.4/", "https://unpkg.com/mathlive@0.111.4/"], libraryBase = libraryBases[0];
  function configure(opts) { if (opts.toLatex) toLatex = opts.toLatex; }
  function mathfieldClass() { return root.MathfieldElement || (root.MathLive && root.MathLive.MathfieldElement) || (root.customElements && root.customElements.get("math-field")); }
  function ready() { return !!(mathfieldClass() && root.customElements && root.customElements.get("math-field")); }
  var loading = false;
  function load() {
    if (loading || ready()) return;
    loading = true;
    // Called only after the local exercise UI has initialized. Unlike an external
    // defer script, this cannot hold up DOMContentLoaded or later local scripts.
    function attempt(index) {
      libraryBase=libraryBases[index];
      var script = document.createElement("script");script.async=true;
      script.src=libraryBase+"mathlive.min.js";
      script.addEventListener("load",function(){if(activeReady)activeReady();});
      script.addEventListener("error",function(){
        script.remove();
        // One bounded fallback; failed downloads never block exercise initialization.
        if(index+1<libraryBases.length)attempt(index+1);
      });
      document.head.appendChild(script);
    }
    attempt(0);
  }
  function createRich(props, kind) {
    if (!configured) {
      var Mathfield=mathfieldClass();
      Mathfield.fontsDirectory = libraryBase+"fonts";
      Mathfield.soundsDirectory = null;
      Mathfield.computeEngine = null;
      Mathfield.fractionNavigationOrder = "numerator-denominator";
      configured = true;
    }
    var input = document.createElement("math-field");
    Object.keys(props).forEach(function (k) { if (k !== "type" && k !== "size" && k !== "class") input.setAttribute(k, props[k]); });
    input.setAttribute("math-virtual-keyboard-policy", "manual");
    input.setAttribute("smart-fence", kind === "set" ? "false" : "true");
    input.setAttribute("smart-mode", "false");
    input.setAttribute("smart-superscript", "false");
    input.setAttribute("dir", "ltr");
    var logicStyle=document.createElement("style");
    logicStyle.textContent=".course-logic{direction:rtl;unicode-bidi:isolate;display:inline-block;white-space:nowrap}.course-logic *{direction:inherit}";
    input.appendChild(logicStyle);
    input.menuItems = [];
    input.inlineShortcuts = Object.assign({}, input.inlineShortcuts, {
      inf:"\\infty", infinity:"\\infty", sqrt:"\\sqrt{#0}", cbrt:"\\sqrt[3]{#0}", pi:"\\pi", eps:"\\varepsilon", epsilon:"\\varepsilon",
      "או":templates[" או "], "וגם":templates[" וגם "], "ולא":templates[" ולא "], "לא":templates[" לא "]
    });
    input.addEventListener("paste", function (e) {
      var text = e.clipboardData && e.clipboardData.getData("text/plain");
      // A plain set difference uses a backslash too; it is not a LaTeX command.
      if (!text) return;
      try {
        var latex = /\\[a-z]+/i.test(text)?isolateLogicalLatex(text):isolateLogicalLatex(toLatex(text, kind));
        e.preventDefault(); e.stopImmediatePropagation();
        input.insert(latex, { format:"latex", selectionMode:"after" });
      } catch (_) { /* Leave incomplete input to the editor; the checker handles it. */ }
    }, true);
    return input;
  }
  function create(props, kind) {
    var host = document.createElement("span"), active = document.createElement("input"), failed = false;
    host.setAttribute("class", (props.class || "") + " mi-control");
    host.setAttribute("dir", "ltr");
    Object.keys(props).forEach(function (k) { if (k !== "class") active.setAttribute(k, props[k]); });
    if (props.size) host.style.width = Math.min(12, Math.max(3, +props.size * .6)) + "em";
    // Callers keep this wrapper throughout check/reveal/reset and row editing.
    Object.defineProperties(host, {
      value: { get:function () { return active.value; }, set:function (v) { active.value = isMath(active)?isolateLogicalLatex(v):v; } },
      control: { get:function () { return active; } },
      selectionStart: { get:function () { return active.selectionStart; } },
      selectionEnd: { get:function () { return active.selectionEnd; } }
    });
    host.setSelectionRange = function (a, b) { if (active.setSelectionRange) active.setSelectionRange(a, b); };
    // Populated auxiliary fields can show math without stealing focus. The same
    // readiness, incomplete-draft and selection checks still apply.
    host.upgrade = upgrade;
    host.focus = function () { upgrade(); active.focus(); };
    // Row labels and validation are updated by the exercise after creation.
    var setAttribute = host.setAttribute;
    host.setAttribute = function (name, value) {
      setAttribute.call(host, name, value);
      if (/^aria-/.test(name)) active.setAttribute(name, value);
    };
    var removeAttribute = host.removeAttribute;
    host.removeAttribute = function (name) {
      removeAttribute.call(host, name);
      if (/^aria-/.test(name)) active.removeAttribute(name);
    };
    function events(control) {
      control.addEventListener("focus", function () {
        if (control !== active) return;
        activeReady=function(){
          if(active!==control||document.activeElement!==control||isMath(control))return;
          // Do not disrupt a selection or move a caret from the middle of a draft.
          if(control.value&&(control.selectionStart!==control.value.length||control.selectionEnd!==control.value.length))return;
          upgrade();
          if(active!==control){active.focus();if(active.executeCommand)active.executeCommand("moveToMathfieldEnd");}
        };
        upgrade();
        if (active !== control) { active.focus(); return; }
        host.dispatchEvent(new Event("focus"));
      });
      control.addEventListener("blur", function () {
        if (control === active) host.dispatchEvent(new Event("blur"));
      });
      control.addEventListener("input", function (e) {
        e.stopPropagation();
        host.dispatchEvent(new Event("input", { bubbles:true }));
      });
      control.addEventListener("keydown",function(e){
        if(control!==active||isMath(control)||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
        if(e.key==="/"||e.key==="^"){
          e.preventDefault();e.stopPropagation();insert(host,e.key);
        }else if(e.key==="Tab"){
          var at=control.selectionStart,slots=[],m,re=/\(\s*\)/g;
          while((m=re.exec(control.value)))slots.push(m.index+1);
          var next=e.shiftKey?slots.filter(function(p){return p<at;}).pop():slots.filter(function(p){return p>at;})[0];
          if(next!==undefined){e.preventDefault();control.setSelectionRange(next,next);}
        }else if(e.key===")"&&control.selectionStart===control.selectionEnd&&control.value[control.selectionStart]===")"){
          e.preventDefault();control.setSelectionRange(control.selectionStart+1,control.selectionStart+1);
        }
      });
      // Keydown bubbles naturally, including the exercise's Enter shortcuts.
    }
    function upgrade() {
      if (isMath(active) || failed || !ready()) return;
      // A toolbar click after a delayed download must still act on the selected
      // native text. We cannot reliably map that selection into the math editor.
      if (active.value && typeof active.selectionStart === "number" &&
          (active.selectionStart !== active.value.length || active.selectionEnd !== active.value.length)) return;
      var latex;
      try { latex = isolateLogicalLatex(toLatex(active.value, kind)); }
      catch (_) { return; } // Keep incomplete drafts intact until the next focus.
      var rich;
      try {
        rich = createRich(props, kind);
        ["aria-label", "aria-invalid", "aria-describedby"].forEach(function (name) {
          var value = active.getAttribute(name);
          if (value !== null) rich.setAttribute(name, value);
        });
        rich.value = latex;
        events(rich);
        host.appendChild(rich);
        // Native input stays in place until construction and mounting succeed.
        var previous = active;
        active = rich;
        previous.remove();
      } catch (_) {
        if (rich) rich.remove();
        failed = true;
      }
    }
    events(active);
    host.appendChild(active);
    return host;
  }
  function control(input) { return input && (input.control || input); }
  function isMath(input) { return control(input) && control(input).tagName === "MATH-FIELD"; }
  function read(input) { return isMath(input) ? latexToPlain(control(input).value) : input.value; }
  function plainTemplate(value,start,end,text) {
    if(start===null||start===undefined)start=end=value.length;
    var selection=value.slice(start,end),before=value.slice(0,start),after=value.slice(end),inserted=text,offset;
    if(text==="/"||text==="^") {
      var hasLeft=/[\da-zπεϵ∞)\]}!]\s*$/i.test(before);
      if(selection){inserted="("+selection+")"+text+"()";offset=inserted.length-1;}
      else if(hasLeft){inserted=text+"()";offset=2;}
      else {inserted="()"+text+"()";offset=1;}
    }else if(text==="_n"){
      inserted=selection+"_n";offset=inserted.length;
    }else if(text==="_"){
      inserted=selection+"_()";offset=inserted.length-1;
    }else if(text==="log_()"){
      inserted="log_()("+selection+")";offset=5;
    }else if(text==="root()"){
      inserted="root(,"+selection+")";offset=5;
    }else if(text.endsWith("()")){
      inserted=text.slice(0,-1)+selection+")";offset=selection?inserted.length:inserted.length-1;
    }else if(["[]","[)","(]","{}","||"].indexOf(text)>=0){
      inserted=text[0]+selection+text[1];offset=selection?inserted.length:1;
    }else if(text==="{x|}"){inserted="{x|"+selection+"}";offset=inserted.length-1;}
    if(offset===undefined)offset=inserted.length;
    return {value:before+inserted+after,caret:start+offset};
  }
  function insert(input, text) {
    // Focus can upgrade the native control after the optional library arrives.
    input.focus();
    if (!isMath(input)) {
      var result=plainTemplate(input.value,input.selectionStart,input.selectionEnd,text);
      input.value=result.value;input.setSelectionRange(result.caret,result.caret);
      input.dispatchEvent(new Event("input",{bubbles:true}));return true;
    }
    var logical=/^(או|וגם|ולא|לא)$/.test(text.trim());
    var insertion=Object.prototype.hasOwnProperty.call(templates,text)?templates[text]:text;
    var indexed=/^([a-z])_\(([a-z])\)$/.exec(text);
    if(indexed)insertion=indexed[1]+"_{"+indexed[2]+"}";
    control(input).insert(insertion, {format:"latex", mode:"math", selectionMode:logical?"after":"placeholder"});
    // The next expression belongs outside the Hebrew text atom.
    if(logical)control(input).mode="math";
    return true;
  }
  var api = { logicalLatex:logicalLatex, isolateLogicalLatex:isolateLogicalLatex, latexToPlain:latexToPlain, configure:configure, load:load, create:create, read:read, insert:insert, isMath:isMath, templates:templates, plainTemplate:plainTemplate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CourseMathInput = api;
})(typeof window !== "undefined" ? window : this);
