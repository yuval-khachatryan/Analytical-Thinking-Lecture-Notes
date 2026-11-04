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
        lbrack:"[", rbrack:"]", lparen:"(", rparen:")", vert:"|", mid:"|", colon:":", lvert:"|", rvert:"|", lfloor:"floor(", rfloor:")", lor:" or ", vee:" or " };
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
    "{x|}":"\\left\\{x\\mid #0\\right\\}",
    "/":"\\frac{#@}{#?}", "^":"#@^{#?}", "√()":"\\sqrt{#0}", "sqrt()":"\\sqrt{#0}", "cbrt()":"\\sqrt[3]{#0}", "root()":"\\sqrt[#?]{#0}",
    "()":"\\left(#0\\right)", "||":"\\left|#0\\right|", "{}":"\\left\\{#0\\right\\}",
    "log_()":"\\log_{#?}\\left(#?\\right)", "sin()":"\\sin\\left(#0\\right)", "cos()":"\\cos\\left(#0\\right)", "tan()":"\\tan\\left(#0\\right)",
    "ln()":"\\ln\\left(#0\\right)", "floor()":"\\lfloor#0\\rfloor", "∞":"\\infty", "-∞":"-\\infty", "π":"\\pi",
    "∅":"\\emptyset", "ℝ":"\\mathbb{R}", " ∪ ":"\\cup", "≤":"\\le", "≥":"\\ge", " או ":"\\quad\\text{או}\\quad"
  };
  var toLatex = function (s) { return s; }, configured = false;
  function configure(opts) { if (opts.toLatex) toLatex = opts.toLatex; }
  function ready() { return !!(root.MathfieldElement && root.customElements && root.customElements.get("math-field")); }
  var loading = false;
  function load() {
    if (loading || ready()) return;
    loading = true;
    // Called only after the local exercise UI has initialized. Unlike an external
    // defer script, this cannot hold up DOMContentLoaded or later local scripts.
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathlive@0.111.4/mathlive.min.js";
    script.addEventListener("error", function () {
      // Native controls remain usable; do not retry on every student interaction.
      script.remove();
    });
    document.head.appendChild(script);
  }
  function createRich(props, kind) {
    if (!configured) {
      root.MathfieldElement.fontsDirectory = "https://cdn.jsdelivr.net/npm/mathlive@0.111.4/fonts";
      root.MathfieldElement.soundsDirectory = null;
      root.MathfieldElement.computeEngine = null;
      root.MathfieldElement.fractionNavigationOrder = "numerator-denominator";
      configured = true;
    }
    var input = document.createElement("math-field");
    Object.keys(props).forEach(function (k) { if (k !== "type" && k !== "size" && k !== "class") input.setAttribute(k, props[k]); });
    input.setAttribute("math-virtual-keyboard-policy", "manual");
    input.setAttribute("smart-fence", kind === "set" ? "false" : "true");
    input.setAttribute("smart-mode", "false");
    input.setAttribute("smart-superscript", "false");
    input.setAttribute("dir", "ltr");
    input.menuItems = [];
    input.inlineShortcuts = Object.assign({}, input.inlineShortcuts, {
      inf:"\\infty", infinity:"\\infty", sqrt:"\\sqrt{#0}", cbrt:"\\sqrt[3]{#0}", pi:"\\pi"
    });
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
  function create(props, kind) {
    var host = document.createElement("span"), active = document.createElement("input"), failed = false;
    host.setAttribute("class", (props.class || "") + " mi-control");
    host.setAttribute("dir", "ltr");
    Object.keys(props).forEach(function (k) { if (k !== "class") active.setAttribute(k, props[k]); });
    if (props.size) host.style.width = Math.min(12, Math.max(3, +props.size * .6)) + "em";
    // Callers keep this wrapper throughout check/reveal/reset and row editing.
    Object.defineProperties(host, {
      value: { get:function () { return active.value; }, set:function (v) { active.value = v; } },
      control: { get:function () { return active; } },
      selectionStart: { get:function () { return active.selectionStart; } },
      selectionEnd: { get:function () { return active.selectionEnd; } }
    });
    host.setSelectionRange = function (a, b) { if (active.setSelectionRange) active.setSelectionRange(a, b); };
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
      // Keydown bubbles naturally, including the exercise's Enter shortcuts.
    }
    function upgrade() {
      if (isMath(active) || failed || !ready()) return;
      var latex;
      try { latex = toLatex(active.value, kind); }
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
  function insert(input, text) {
    // Focus can upgrade the native control after the optional library arrives.
    input.focus();
    if (!isMath(input)) return false;
    control(input).insert(Object.prototype.hasOwnProperty.call(templates, text) ? templates[text] : text, {format:"latex", selectionMode:"placeholder"});
    return true;
  }
  var api = { latexToPlain:latexToPlain, configure:configure, load:load, create:create, read:read, insert:insert, isMath:isMath, templates:templates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CourseMathInput = api;
})(typeof window !== "undefined" ? window : this);
