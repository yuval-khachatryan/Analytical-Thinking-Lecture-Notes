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
      var symbols = { infty:"inf", pi:"pi", cdot:"*", times:"*", div:"/", le:"<=", leq:"<=", ge:">=", geq:">=", ne:"!=", neq:"!=",
        cup:" U ", setminus:"\\", backslash:"\\", emptyset:"{}", varnothing:"{}", in:" in ", lbrace:"{", rbrace:"}",
        lbrack:"[", rbrack:"]", lparen:"(", rparen:")", vert:"|", lvert:"|", rvert:"|", lfloor:"floor(", rfloor:")", lor:" or ", vee:" or " };
      if (Object.prototype.hasOwnProperty.call(symbols, m)) return symbols[m];
      if (/^(quad|qquad|enspace|thinspace|medspace|thickspace|displaystyle|textstyle|scriptstyle|scriptscriptstyle)$/.test(m)) return " ";
      if (/^(frac|dfrac|tfrac|cfrac)$/.test(m)) { var a = argument(), b = argument(); return "((" + a + ")/(" + b + "))"; }
      if (m === "sqrt") {
        space(); var degree = s[at] === "[" ? group("[", "]") : null, body = argument();
        if (degree !== null && !degree.trim()) throw new Error(EMPTY);
        return degree === null ? "sqrt(" + body + ")" : "root(" + degree + "," + body + ")";
      }
      if (m === "placeholder" || m === "prompt") throw new Error(EMPTY);
      if (/^(text|mathrm|mathit|operatorname|mathbb)$/.test(m)) {
        var word = group("{", "}").trim();
        if (word === "או" || word === "or") return " or ";
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
  var templates = {
    "/":"\\frac{#@}{#?}", "^":"#@^{#?}", "√()":"\\sqrt{#0}", "sqrt()":"\\sqrt{#0}", "cbrt()":"\\sqrt[3]{#0}", "root()":"\\sqrt[#?]{#0}",
    "()":"\\left(#0\\right)", "||":"\\left|#0\\right|", "{}":"\\left\\{#0\\right\\}",
    "log_()":"\\log_{#?}\\left(#?\\right)", "sin()":"\\sin\\left(#0\\right)", "cos()":"\\cos\\left(#0\\right)", "tan()":"\\tan\\left(#0\\right)",
    "ln()":"\\ln\\left(#0\\right)", "floor()":"\\lfloor#0\\rfloor", "∞":"\\infty", "-∞":"-\\infty", "π":"\\pi",
    "∅":"\\emptyset", "ℝ":"\\mathbb{R}", " ∪ ":"\\cup", "≤":"\\le", "≥":"\\ge", " או ":"\\quad\\text{או}\\quad"
  };
  var toLatex = function (s) { return s; }, configured = false;
  function configure(opts) { if (opts.toLatex) toLatex = opts.toLatex; }
  function ready() { return !!(root.MathfieldElement && root.customElements && root.customElements.get("math-field")); }
  function create(props, kind) {
    var rich = ready();
    if (rich && !configured) {
      root.MathfieldElement.fontsDirectory = "https://cdn.jsdelivr.net/npm/mathlive@0.111.4/fonts";
      root.MathfieldElement.soundsDirectory = null;
      root.MathfieldElement.computeEngine = null;
      root.MathfieldElement.fractionNavigationOrder = "numerator-denominator";
      configured = true;
    }
    var input = document.createElement(rich ? "math-field" : "input");
    Object.keys(props).forEach(function (k) { if (k !== "type" && k !== "size" || !rich) input.setAttribute(k, props[k]); });
    if (!rich) return input;
    input.setAttribute("math-virtual-keyboard-policy", "manual");
    input.setAttribute("smart-fence", kind === "set" ? "false" : "true");
    input.setAttribute("smart-mode", "false");
    input.setAttribute("smart-superscript", "false");
    input.setAttribute("dir", "ltr");
    input.menuItems = [];
    input.inlineShortcuts = Object.assign({}, input.inlineShortcuts, {
      inf:"\\infty", infinity:"\\infty", sqrt:"\\sqrt{#0}", cbrt:"\\sqrt[3]{#0}", pi:"\\pi"
    });
    if (props.size) input.style.minWidth = Math.min(12, Math.max(3, +props.size * .45)) + "em";
    input.addEventListener("paste", function (e) {
      var text = e.clipboardData && e.clipboardData.getData("text/plain");
      if (!text || /\\/.test(text)) return; // MathLive accepts pasted LaTeX itself.
      try {
        var latex = toLatex(text, kind);
        e.preventDefault(); e.stopImmediatePropagation();
        input.insert(latex, { format:"latex", selectionMode:"after" });
      } catch (_) { /* Leave incomplete input to the editor; the checker handles it. */ }
    }, true);
    return input;
  }
  function isMath(input) { return input && input.tagName === "MATH-FIELD"; }
  function read(input) { return isMath(input) ? latexToPlain(input.value) : input.value; }
  function insert(input, text) {
    if (!isMath(input)) return false;
    input.focus();
    input.insert(Object.prototype.hasOwnProperty.call(templates, text) ? templates[text] : text, {format:"latex", selectionMode:"placeholder"});
    return true;
  }
  var api = { latexToPlain:latexToPlain, configure:configure, create:create, read:read, insert:insert, isMath:isMath, templates:templates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CourseMathInput = api;
})(typeof window !== "undefined" ? window : this);
