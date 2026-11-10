/* interactive.js — the reader fills in answers and builds solutions.
   ---------------------------------------------------------------------------
   Loaded on every page (see _styles.html). Three widgets, all written as plain
   Quarto markdown and turned interactive here. Without JavaScript everything
   stays readable: the blanks show their answers and the steps their solution.

   1. Fill-in blanks:  [$\frac{1}{2}$]{.blank ans="1/2"}
        The span's content is the answer as it should LOOK (shown on request and
        in the PDF); ans= is what the reader's input is checked against:
          * a number      ans="1/2" (finished result; 0.5 = 1/2)
            allow-expression="true" explicitly permits equivalent expressions,
            including exact symbolic answers such as sqrt(3)/2 or pi/6.
          * an expression ans="(x+2)/5"        (checked at many values of x)
          * a set of reals ans="[-1,2)U(2,inf)" or "{3,-2}" or "R" or "{}"
            (intervals, unions, finite sets; equivalent conditions such as
             -1<=x<2 are also accepted; bare values need set-notation feedback)
        kind="num|expr|set" overrides the guess; miss="v :: message || ..." adds
        a tailored message for a known wrong answer; w= sets the input width.
        Short written classifications use [זוגית]{.blank kind="text" ans="זוגית"}.
        Blanks are grouped by the nearest ::: fill (or box, or paragraph); a
        group gets one bar: בדיקה / רמז / הצגת התשובות. Inside ::: fill, the
        child divs ::: hint and ::: explain are the hints and the explanation
        shown once every blank is right.

   2. Step builder (the analogue of the proof editor in the logic notes):
        ::: {.steps start="3-2x<7" rules="add|mulpos|mulneg|simplify"}
        ::: hint / ::: solution children
        :::
      The reader writes the solution one line at a time and names the rule of
      each step. Every line is checked against the previous one: for a relation
      (=, <, ≤, ... and "או"), the two lines must have the same solution set;
      for an expression, the same value at every point. The rule is checked
      too (adding the same amount to both sides, multiplying by a positive or a
      negative number and flipping the sign, applying log, ...). The chain is
      done when x stands alone (relations) or when the line is at most as long
      as goal= (expressions). Other attributes: vars="x,y", solve="x",
      positive="x,y" (sample only positive values), goal=.
      rules= lists rule keys (see RULES); any other text is a free label.

   3. Ordering:  ::: order  with ::: step children written in the RIGHT order.
      The reader gets them shuffled and clicks them into place. Steps that may
      swap places get the same rank= attribute.

   The math engine (parser, evaluator, solution sets) is exported for the tests
   in tmp/ when run under node.
   --------------------------------------------------------------------------- */
(function (root) {
"use strict";

/* ======================================================================== */
/* 1. Parsing                                                               */
/* ======================================================================== */

function ParseError(msg) { this.message = msg; }

var FUNCS = ["arcsin", "arccos", "arctan", "asin", "acos", "atan", "sqrt", "cbrt", "root",
  "sin", "cos", "tan", "log", "ln", "abs", "floor", "sgn", "sign"];
var NAMES = FUNCS.concat(["infinity", "inf", "pi", "or", "and", "not", "cap", "in"])
  .sort(function (a, b) { return b.length - a.length; });
var CANON = { asin: "arcsin", acos: "arccos", atan: "arctan", sign: "sgn" };

function normalize(s) {
  s = String(s == null ? "" : s);
  return s
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u00a0]/g, " ")
    .replace(/[−–—‒]/g, "-")
    .replace(/\*\*/g, "^")
    .replace(/[·⋅×∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/≤|=</g, "<=").replace(/≥|=>/g, ">=")
    .replace(/≠|<>/g, "!=")
    .replace(/∞/g, "inf")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt").replace(/∛/g, "cbrt")
    .replace(/ℝ/g, "R")
    .replace(/∪/g, " U ")
    .replace(/∩/g, " cap ")
    .replace(/∧/g, " and ").replace(/∨/g, " or ").replace(/¬/g, " not ")
    .replace(/∅/g, "{}")
    .replace(/∖/g, "\\")
    .replace(/∣/g, "|")
    .replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/⌊/g, "floor(").replace(/⌋/g, ")")
    .replace(/∈/g, " in ")
    .replace(/וגם|גם/g, " and ").replace(/ולא/g, " and not ").replace(/לא/g, " not ")
    .replace(/או/g, " or ");
}

function splitWord(w, out) {
  var i = 0;
  while (i < w.length) {
    var rest = w.slice(i).toLowerCase(), hit = null;
    for (var j = 0; j < NAMES.length; j++) if (rest.indexOf(NAMES[j]) === 0) { hit = NAMES[j]; break; }
    if (hit) {
      if (FUNCS.indexOf(hit) >= 0) out.push({ k: "fn", v: CANON[hit] || hit });
      else if (hit === "pi") out.push({ k: "pi" });
      else if (hit === "inf" || hit === "infinity") out.push({ k: "inf" });
      else out.push({ k: hit });                       // "or", "in"
      i += hit.length;
      continue;
    }
    var ch = w[i];
    if (ch === "e") out.push({ k: "e" });              // Euler's number, not a variable
    else if (ch === "U") out.push({ k: "U" });
    else if (ch === "R") out.push({ k: "R" });
    else out.push({ k: "var", v: ch.toLowerCase() });
    i++;
  }
}

function tokenize(src) {
  var s = normalize(src), t = [], i = 0, n = s.length;
  while (i < n) {
    var c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) throw new ParseError("יש כאן נקודה שאינה חלק ממספר.");
      t.push({ k: "num", v: parseFloat(m[1]), s: m[1] });
      i += m[1].length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      var w = /^[A-Za-z]+/.exec(s.slice(i))[0];
      splitWord(w, t);
      i += w.length;
      continue;
    }
    var two = s.substr(i, 2);
    if (two === "<=" || two === ">=" || two === "!=" || two === "==") {
      t.push({ k: "rel", v: two === "==" ? "=" : two }); i += 2; continue;
    }
    if (c === "<" || c === ">" || c === "=") { t.push({ k: "rel", v: c }); i++; continue; }
    if ("+-*/^".indexOf(c) >= 0) { t.push({ k: "op", v: c }); i++; continue; }
    if ("()[]{},|_\\;:".indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
    if (c === "!") { t.push({ k: "!" }); i++; continue; }   // n! ("!=" was read above)
    if (c === "§") {                                         // a box of a guided derivation
      var pm = /^§(R?)(\d+)/.exec(s.slice(i));
      if (!pm) throw new ParseError("סימן לא מוכר.");
      t.push(pm[1] ? { k: "rel", v: "§" + pm[2] } : { k: "ph", v: +pm[2] });
      i += pm[0].length; continue;
    }
    throw new ParseError("הסימן ״" + c + "״ אינו מוכר כאן.");
  }
  return t;
}

function Parser(tokens) { this.t = tokens; this.i = 0; this.abs = 0; }
Parser.prototype.peek = function (o) { return this.t[this.i + (o || 0)]; };
Parser.prototype.next = function () { return this.t[this.i++]; };
Parser.prototype.is = function (k, v) {
  var p = this.peek();
  return !!p && p.k === k && (v === undefined || p.v === v);
};
Parser.prototype.expect = function (k) {
  var p = this.next();
  if (!p || p.k !== k) {
    var what = { ")": "סוגר סוגר ״)״", "|": "קו סוגר של ערך מוחלט ״|״", "}": "סוגר מסולסל ״}״",
      ",": "פסיק", "(": "סוגר פותח ״(״" }[k] || k;
    throw new ParseError("חסר " + what + ".");
  }
  return p;
};
Parser.prototype.atEnd = function () { return this.i >= this.t.length; };

Parser.prototype.startsPrimary = function (p) {
  if (!p) return false;
  if (p.k === "num" || p.k === "var" || p.k === "pi" || p.k === "e" || p.k === "fn" || p.k === "(" || p.k === "ph") return true;
  if (p.k === "|") return this.abs === 0;
  return false;
};

Parser.prototype.expr = function () {
  var node = this.term();
  while (this.is("op", "+") || this.is("op", "-")) {
    var op = this.next().v;
    node = { t: op === "+" ? "add" : "sub", a: node, b: this.term() };
  }
  return node;
};
// A leading minus belongs to the whole term: -2x is -(2x), -x^2 is -(x^2).
Parser.prototype.term = function () {
  if (this.is("op", "-")) { this.next(); return { t: "neg", a: this.term() }; }
  if (this.is("op", "+")) { this.next(); return this.term(); }
  var node = this.unary();
  for (;;) {
    if (this.is("op", "*") || this.is("op", "/")) {
      var op = this.next().v;
      node = { t: op === "*" ? "mul" : "div", a: node, b: this.unary() };
    } else if (this.startsPrimary(this.peek())) {
      node = { t: "mul", a: node, b: this.power(), imp: true };
    } else break;
  }
  return node;
};
Parser.prototype.unary = function () {
  if (this.is("op", "-")) { this.next(); return { t: "neg", a: this.unary() }; }
  if (this.is("op", "+")) { this.next(); return this.unary(); }
  return this.power();
};
Parser.prototype.power = function () {
  var base = this.primary();
  while (this.is("!")) { this.next(); base = { t: "fact", a: base }; }
  if (this.is("op", "^")) { this.next(); return { t: "pow", a: base, b: this.unary() }; }
  return base;
};
Parser.prototype.primary = function () {
  var p = this.next();
  if (!p) throw new ParseError("הביטוי נגמר באמצע. אולי חסר מספר אחרי סימן הפעולה?");
  if (p.k === "num") return { t: "num", v: p.v, s: p.s };
  if (p.k === "var") return { t: "var", n: p.v };
  if (p.k === "pi") return { t: "pi" };
  if (p.k === "e") return { t: "e" };
  if (p.k === "ph") return { t: "ph", i: p.v };
  if (p.k === "inf") return { t: "inf" };
  if (p.k === "(") { var e = this.expr(); this.expect(")"); return e; }
  if (p.k === "|") {
    this.abs++;
    var a = this.expr();
    this.expect("|");
    this.abs--;
    return { t: "fn", f: "abs", a: a };
  }
  if (p.k === "fn") return this.fn(p.v);
  if (p.k === "rel") throw new ParseError("סימן ההשוואה ״" + p.v + "״ אינו במקומו.");
  if (p.k === "op") throw new ParseError("שני סימני פעולה ברצף (״" + p.v + "״).");
  if (p.k === ")") throw new ParseError("יש סוגר ״)״ בלי סוגר פותח.");
  throw new ParseError("לא הצלחתי לקרוא את הביטוי.");
};
Parser.prototype.fn = function (name) {
  var base = null;
  if (name === "root") {
    this.expect("(");
    var nIdx = this.expr();
    this.expect(",");
    var rad = this.expr();
    this.expect(")");
    return { t: "fn", f: "root", n: nIdx, a: rad };
  }
  if (name === "log") {
    if (this.is("_")) {
      this.next();
      if (this.is("(") || this.is("{")) {
        var close = this.next().k === "(" ? ")" : "}";
        base = this.expr();
        this.expect(close);
      } else base = this.primary();
    } else if (this.is("num") && this.startsArgAfterBase()) {
      base = this.primary();
    }
  }
  if (name === "ln") { name = "log"; base = { t: "e" }; }
  var arg;
  if (this.is("(")) { this.next(); arg = this.expr(); this.expect(")"); }
  else arg = this.implicitArg();
  return { t: "fn", f: name, a: arg, base: base };
};
// "log2(8)", "log2 8", "log2x": a number right after log is the base when an
// argument follows it; "log 100" is log of 100.
Parser.prototype.startsArgAfterBase = function () {
  var q = this.peek(1);
  return !!q && (q.k === "(" || q.k === "num" || q.k === "var" || q.k === "pi" || q.k === "|" || q.k === "fn");
};
Parser.prototype.implicitArg = function () {
  if (this.is("op", "-")) { this.next(); return { t: "neg", a: this.implicitArg() }; }
  if (!this.startsPrimary(this.peek())) throw new ParseError("חסר ארגומנט לפונקציה (כתבו אותו בסוגריים).");
  var node = this.power();
  while (this.startsPrimary(this.peek()) && !this.is("fn")) node = { t: "mul", a: node, b: this.power(), imp: true };
  return node;
};

// A relation: OR separates alternatives, AND joins comparisons inside one
// alternative. "and" in ops is a separator, never a comparison of its neighbors.
Parser.prototype.relationChain = function () {
  var start=this.i,error;
  try {
    var parts=[this.expr()],ops=[];
    while(this.is("rel")){ops.push(this.next().v);parts.push(this.expr());}
    return {parts:parts,ops:ops};
  }catch(e){error=e;this.i=start;}
  if(this.is("(")){
    this.next();var group=this.relation();this.expect(")");
    if(group.disj.length===1)return group.disj[0];
    throw new ParseError("כתבו כל אפשרות שמחוברת ב־או בנפרד, ובתוכה את התנאים שמחוברים ב־וגם.");
  }
  throw error;
};
Parser.prototype.relation = function () {
  var disj = [];
  do {
    var chain=this.relationChain();
    while(this.is("and")){
      this.next();var next=this.relationChain();
      if(!chain.ops.length||!next.ops.length)throw new ParseError("משני צדי וגם צריך להיות שוויון או אי-שוויון.");
      chain.parts=chain.parts.concat(next.parts);chain.ops=chain.ops.concat(["and"],next.ops);
    }
    disj.push(chain);
  } while ((this.is("or") || this.is("U")) && this.next());
  return { t: "rel", disj: disj };
};

function parseExpr(src) {
  var p = new Parser(tokenize(src));
  if (p.atEnd()) throw new ParseError("השדה ריק.");
  var e = p.expr();
  if (!p.atEnd()) {
    var q = p.peek();
    if (q.k === "rel") throw new ParseError("כאן צריך ביטוי, בלי סימן ״" + q.v + "״.");
    if (q.k === ")") throw new ParseError("יש סוגר ״)״ בלי סוגר פותח.");
    throw new ParseError("לא הצלחתי לקרוא את סוף הביטוי.");
  }
  return e;
}
function parseRelation(src) {
  if(/^(?:ℝ|R|∅|\{\s*\})$/.test(String(src).trim()))return truthRelation(/^(?:ℝ|R)$/.test(String(src).trim()));
  var p = new Parser(tokenize(src));
  if (p.atEnd()) throw new ParseError("השדה ריק.");
  var r = p.relation();
  if (!p.atEnd()) {
    var q = p.peek();
    if (q.k === ")") throw new ParseError("יש סוגר ״)״ בלי סוגר פותח.");
    throw new ParseError("לא הצלחתי לקרוא את סוף השורה.");
  }
  return r;
}
// A derivation line with boxes: [..] holds a value to fill, [<] a relation sign.
var SIGNS = { "<": "<", ">": ">", "<=": "<=", ">=": ">=", "=": "=", "≤": "<=", "≥": ">=" };
function prepLine(src) {
  var boxes = [];
  var text = String(src).replace(/\[([^\]]*)\]/g, function (_, inner) {
    var k = boxes.length, sign = SIGNS[inner.trim()];
    boxes.push(sign ? { sign: sign } : { ans: inner.trim() });
    return " " + (sign ? "§R" : "§") + k + " ";
  });
  // the line with the answers in the boxes; a value goes in brackets, so that 2^[2x] is 2^(2x)
  var full = String(src).replace(/\[([^\]]*)\]/g, function (_, inner) { return SIGNS[inner.trim()] ? inner : "(" + inner + ")"; });
  return { text: text, boxes: boxes, full: full };
}
function isRelation(r) { return r.disj.some(function (d) { return d.ops.length > 0; }); }

/* ======================================================================== */
/* 2. Evaluation, LaTeX                                                     */
/* ======================================================================== */

var TOL = 1e-9;
function close(a, b, tol) {
  if (a === b) return true;
  if (!isFinite(a) || !isFinite(b)) return false;
  return Math.abs(a - b) <= (tol || TOL) * Math.max(1, Math.abs(a), Math.abs(b));
}

function powr(a, b) {
  if (a < 0 && Math.round(b) !== b) {
    for (var q = 3; q <= 15; q += 2) {
      var p = Math.round(b * q);
      if (Math.abs(b * q - p) < 1e-9) {
        var r = Math.pow(-a, b);
        return (p % 2 === 0) ? r : -r;
      }
    }
    return NaN;
  }
  if (a === 0 && b < 0) return NaN;
  return Math.pow(a, b);
}

function ev(n, env) {
  var a, b;
  switch (n.t) {
    case "num": return n.v;
    case "ph": return NaN;
    case "var": return env && env[n.n] !== undefined ? env[n.n] : NaN;
    case "pi": return Math.PI;
    case "e": return Math.E;
    case "inf": return Infinity;
    case "neg": return -ev(n.a, env);
    case "add": return ev(n.a, env) + ev(n.b, env);
    case "sub": return ev(n.a, env) - ev(n.b, env);
    case "mul": a = ev(n.a, env); b = ev(n.b, env); return a * b;
    case "div":
      a = ev(n.a, env); b = ev(n.b, env);
      // Transcendental zeroes need tolerance (sin(pi) is about 1e-16).
      // Polynomial denominators can genuinely be small: treating x² as zero
      // near x=0 creates a false hole after a valid division by x².
      if(b===0)return NaN;
      if(!(env&&env.$exact)&&Math.abs(b)<1e-13){
        var exactDenominator=exactFraction(n.b);
        if(exactDenominator&&exactDenominator[0]===0||!algebraPolynomial(n.b))return NaN;
      }
      return a/b;
    case "pow": return powr(ev(n.a, env), ev(n.b, env));
    case "fact":
      a = ev(n.a, env);
      if (!(a >= 0) || Math.abs(a - Math.round(a)) > 1e-9) return NaN;
      for (var f = 1, i = 2; i <= Math.round(a); i++) { f *= i; if (!isFinite(f)) return Infinity; }
      return f;
    case "fn":
      a = ev(n.a, env);
      if (!isFinite(a)) return NaN;
      switch (n.f) {
        case "sqrt": return a < -1e-13 ? NaN : Math.sqrt(Math.max(0, a));
        case "cbrt": return Math.cbrt(a);
        case "root":
          var k = Math.round(ev(n.n, env));
          if (k < 1) return NaN;
          if (k % 2 === 0) return a < -1e-13 ? NaN : Math.pow(Math.max(0, a), 1 / k);
          return a < 0 ? -Math.pow(-a, 1 / k) : Math.pow(a, 1 / k);
        case "sin": return Math.sin(a);
        case "cos": return Math.cos(a);
        case "tan": return Math.abs(Math.cos(a)) < 1e-12 ? NaN : Math.tan(a);
        case "arcsin": return a < -1 - 1e-12 || a > 1 + 1e-12 ? NaN : Math.asin(Math.max(-1, Math.min(1, a)));
        case "arccos": return a < -1 - 1e-12 || a > 1 + 1e-12 ? NaN : Math.acos(Math.max(-1, Math.min(1, a)));
        case "arctan": return Math.atan(a);
        case "abs": return Math.abs(a);
        case "floor": return Math.floor(a + 1e-10);
        case "sgn": return Math.abs(a) < 1e-12 ? 0 : (a > 0 ? 1 : -1);
        case "log":
          b = n.base ? ev(n.base, env) : 10;
          if (!(a > 0) || !(b > 0) || b === 1) return NaN;
          return Math.log(a) / Math.log(b);
      }
  }
  return NaN;
}
function evalNum(n) { var v = ev(n, {}); return v; }

function hasVar(n, name) {
  if (!n || typeof n !== "object") return false;
  if (n.t === "var") return name === undefined || n.n === name;
  return hasVar(n.a, name) || hasVar(n.b, name) || hasVar(n.n, name) || hasVar(n.base, name);
}
function varsOf(n, acc) {
  acc = acc || {};
  if (!n || typeof n !== "object") return acc;
  if (n.t === "var") acc[n.n] = true;
  if (n.t === "rel") n.disj.forEach(function (d) { d.parts.forEach(function (p) { varsOf(p, acc); }); });
  ["a", "b", "n", "base"].forEach(function (k) { if (n[k]) varsOf(n[k], acc); });
  return acc;
}
function nodes(n) {
  if (!n || typeof n !== "object") return 0;
  return 1 + nodes(n.a) + nodes(n.b) + nodes(n.n) + (n.base ? nodes(n.base) : 0);
}
function hasAbs(n) {
  if (!n || typeof n !== "object") return false;
  if (n.t === "fn" && n.f === "abs") return true;
  return hasAbs(n.a) || hasAbs(n.b) || hasAbs(n.n) || hasAbs(n.base);
}

// ---- LaTeX ----
var PREC = { add: 1, sub: 1, neg: 1.5, mul: 2, pow: 4 };
function prec(n) { return PREC[n.t] || 9; }
function wrap(s, need) { return need ? "\\left(" + s + "\\right)" : s; }
var PHTEX = null;   // while a derivation line is drawn: i -> TeX for box i (and "§i" for a sign box)
function fractionSign(n) {
  if(n.t==="neg"){var inner=fractionSign(n.a);return {node:inner.node,negative:!inner.negative};}
  if(n.t==="num"&&n.v<0){var positive=Object.assign({},n,{v:-n.v});if(n.s!==undefined)positive.s=n.s.replace(/^[-−]/,"");return {node:positive,negative:true};}
  if(n.t==="mul"||n.t==="div"){
    var a=fractionSign(n.a),b=fractionSign(n.b);
    return {node:a.node===n.a&&b.node===n.b?n:Object.assign({},n,{a:a.node,b:b.node}),negative:a.negative!==b.negative};
  }
  return {node:n,negative:false};
}
function tex(n, parent) {
  parent = parent || 0;
  var s,priority=prec(n);
  switch (n.t) {
    case "ph": s = PHTEX ? PHTEX(n.i) : "\\boxed{?}"; break;
    case "num": s = n.s !== undefined ? n.s : fmtNum(n.v); break;
    case "var": s = n.n; break;
    case "pi": s = "\\pi"; break;
    case "e": s = "e"; break;
    case "inf": s = "\\infty"; break;
    case "neg": s = "-" + tex(n.a, 2); break;
    case "add": s = tex(n.a, 1) + " + " + tex(n.b, 1.6); break;
    case "sub": s = tex(n.a, 1) + " - " + tex(n.b, 1.6); break;
    case "mul":
      var l = tex(n.a, 2), r = tex(n.b, 2.01);
      var juxt = /^[a-z\\(]/i.test(r.replace(/^\\left/, "(")) && !/^\\infty/.test(r) && n.a.t !== "neg" &&
        !(n.a.t === "num" && n.b.t === "num");
      s = juxt ? l + " " + r : l + " \\cdot " + r;
      break;
    case "div":
      var numerator=fractionSign(n.a),denominator=fractionSign(n.b),negative=numerator.negative!==denominator.negative;
      s=(negative?"-":"")+"\\frac{"+tex(numerator.node,0)+"}{"+tex(denominator.node,0)+"}";
      if(negative)priority=PREC.neg;
      break;
    case "fact": s = tex(n.a, 4.01) + "!"; break;
    case "pow":
      var bs = tex(n.a, 4.01);
      if (n.a.t === "fn" && n.a.f !== "abs" && n.a.f !== "sqrt" && n.a.f !== "floor") bs = "\\left(" + bs + "\\right)";
      s = bs + "^{" + tex(n.b, 0) + "}";
      break;
    case "fn":
      var a = tex(n.a, 0);
      switch (n.f) {
        case "sqrt": s = "\\sqrt{" + a + "}"; break;
        case "cbrt": s = "\\sqrt[3]{" + a + "}"; break;
        case "root": s = "\\sqrt[" + tex(n.n, 0) + "]{" + a + "}"; break;
        case "abs": s = "\\left|" + a + "\\right|"; break;
        case "floor": s = "\\lfloor " + a + " \\rfloor"; break;
        case "sgn": s = "\\operatorname{sgn}\\left(" + a + "\\right)"; break;
        case "log":
          var b = n.base ? (n.base.t === "e" ? null : tex(n.base, 0)) : "10";
          s = (b === null ? "\\ln" : "\\log_{" + b + "}") + "\\left(" + a + "\\right)";
          break;
        default: s = "\\" + n.f + "\\left(" + a + "\\right)";
      }
      break;
    default: s = "?";
  }
  return wrap(s, priority < parent);
}
var OPTEX = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge", "=": "=", "!=": "\\ne", and:"\\quad\\text{וגם}\\quad" };
function texChain(d) {
  var s = tex(d.parts[0]);
  for (var i = 0; i < d.ops.length; i++) {
    var op = d.ops[i];
    s += " " + (op.charAt(0) === "§" ? (PHTEX ? PHTEX(op) : "\\boxed{?}") : OPTEX[op]) + " " + tex(d.parts[i + 1]);
  }
  return s;
}
// Keep Hebrew connectives outside MathJax: both AND and OR need ordinary RTL
// text, while each comparison and its surrounding case stay in mathematical order.
function htmlRel(r) {
  var terminal=relationTruth(r);if(terminal!==null)return '\\('+(terminal?'\\mathbb{R}':'\\varnothing')+'\\)';
  function word(kind){return ' <span class="ix-or" dir="rtl" data-logic="'+kind+'">'+(kind==="and"?"וגם":"או")+'</span> ';}
  return r.disj.map(function(d){
    var parts=[],start=0;
    d.ops.forEach(function(op,i){if(op==="and"){parts.push({parts:d.parts.slice(start,i+1),ops:d.ops.slice(start,i)});start=i+1;}});
    parts.push({parts:d.parts.slice(start),ops:d.ops.slice(start)});
    var grouped=r.disj.length>1&&parts.length>1;
    var body=parts.map(function(p,i){return "\\("+(grouped&&i===0?"(":"")+texChain(p)+(grouped&&i===parts.length-1?")":"")+"\\)";}).join(word("and"));
    return '<span class="ix-case" dir="ltr">'+body+'</span>';
  }).join(word("or"));
}

// Keep Hebrew logical words visibly separate without moving a selection elsewhere
// in the expression. The LTR mark prevents a following minus sign from crossing them.
function spaceLogicalWords(value,start,end) {
  var edits=[],re=/(וגם|ולא|או|לא)\u200e?/g,m;
  while((m=re.exec(value))){
    var left=m.index,right=re.lastIndex;
    if(/[\u05d0-\u05ea]/.test(value[left-1]||"")||/[\u05d0-\u05ea]/.test(value[right]||""))continue;
    var previous=edits.length?edits[edits.length-1].end:0;
    while(left>previous&&/[ \t]/.test(value[left-1]))left--;
    while(right<value.length&&/[ \t]/.test(value[right]))right++;
    edits.push({start:left,end:right,wordEnd:m.index+m[1].length,text:(left&&(!edits.length||left>previous)?" ":"")+m[1]+"\u200e "});
    re.lastIndex=right;
  }
  var out="",last=0;
  edits.forEach(function(e){out+=value.slice(last,e.start)+e.text;last=e.end;});out+=value.slice(last);
  function position(p){
    if(p===null||p===undefined)return p;
    var shift=0;
    for(var i=0;i<edits.length;i++){
      var e=edits[i];if(p<e.start)break;
      if(p<=e.end)return e.start+shift+(p>=e.wordEnd?e.text.length:Math.min(p-e.start,e.text.length));
      shift+=e.text.length-(e.end-e.start);
    }
    return p+shift;
  }
  return {value:out,start:position(start),end:position(end)};
}

function fmtNum(v) {
  if (v === Infinity) return "\\infty";
  if (v === -Infinity) return "-\\infty";
  if (!isFinite(v)) return "?";
  var sg = v < 0 ? "-" : "", a = Math.abs(v), q, p;
  if (Math.abs(a - Math.round(a)) < 1e-9) return sg + String(Math.round(a));
  for (q = 2; q <= 12; q++) {
    p = Math.round(a * q);
    if (Math.abs(a * q - p) < 1e-9) return sg + "\\frac{" + p + "}{" + q + "}";
  }
  for (q = 1; q <= 12; q++) {
    p = Math.round(a / Math.PI * q);
    if (p > 0 && Math.abs(a / Math.PI * q - p) < 1e-9) {
      var num = (p === 1 ? "" : p) + "\\pi";
      return sg + (q === 1 ? num : "\\frac{" + num + "}{" + q + "}");
    }
  }
  for (var m = 2; m <= 50; m++) {
    var r = Math.sqrt(m);
    if (Math.abs(r - Math.round(r)) < 1e-12) continue;
    for (q = 1; q <= 6; q++) {
      p = Math.round(a * q / r);
      if (p > 0 && Math.abs(a * q / r - p) < 1e-9) {
        var nn = (p === 1 ? "" : p) + "\\sqrt{" + m + "}";
        return sg + (q === 1 ? nn : "\\frac{" + nn + "}{" + q + "}");
      }
    }
  }
  var s = a.toPrecision(4).replace(/\.?0+$/, "");
  return sg + s;
}

/* ======================================================================== */
/* 3. Sets of real numbers                                                  */
/* ======================================================================== */
/* A set is a sorted list of disjoint pieces {a, b, ac, bc}: from a to b, with
   ac/bc telling whether the endpoint belongs. A point is {a: v, b: v, ac: 1, bc: 1}. */

function piece(a, b, ac, bc) { return { a: a, b: b, ac: !!ac && isFinite(a), bc: !!bc && isFinite(b) }; }
function normSet(ps) {
  ps = ps.filter(function (p) { return p.a < p.b || (close(p.a, p.b, 1e-9) && p.ac && p.bc); })
    .map(function (p) { return close(p.a, p.b, 1e-9) ? piece(p.a, p.a, 1, 1) : p; })
    .sort(function (x, y) { return x.a - y.a || (y.ac - x.ac); });
  var out = [];
  ps.forEach(function (p) {
    var last = out[out.length - 1];
    if (last && (p.a < last.b - 1e-9 || (close(p.a, last.b, 1e-7) && (last.bc || p.ac)))) {
      if (p.b > last.b + 1e-9) { last.b = p.b; last.bc = p.bc; }
      else if (close(p.b, last.b, 1e-7)) last.bc = last.bc || p.bc;
      if (close(p.a, last.a, 1e-7)) last.ac = last.ac || p.ac;
    } else out.push({ a: p.a, b: p.b, ac: p.ac, bc: p.bc });
  });
  return out;
}
function setHas(S, x) {
  for (var i = 0; i < S.length; i++) {
    var p = S[i];
    if ((x > p.a || (p.ac && close(x, p.a, 1e-9))) && (x < p.b || (p.bc && close(x, p.b, 1e-9)))) return true;
  }
  return false;
}
function setEq(A, B) {
  if (A.length !== B.length) return false;
  for (var i = 0; i < A.length; i++) {
    var p = A[i], q = B[i];
    if (!(p.a === q.a || close(p.a, q.a, 1e-6)) || !(p.b === q.b || close(p.b, q.b, 1e-6))) return false;
    if (p.ac !== q.ac || p.bc !== q.bc) return false;
  }
  return true;
}
function sameEnds(A, B) {
  if (A.length !== B.length) return false;
  for (var i = 0; i < A.length; i++) {
    if (!(A[i].a === B[i].a || close(A[i].a, B[i].a, 1e-6)) || !(A[i].b === B[i].b || close(A[i].b, B[i].b, 1e-6))) return false;
  }
  return true;
}
function complement(S) {
  var out = [], x = -Infinity, xc = false;
  S.forEach(function (p) { out.push(piece(x, p.a, xc, !p.ac)); x = p.b; xc = !p.bc; });
  out.push(piece(x, Infinity, xc, false));
  return normSet(out);
}
function setTex(S) {
  if (!S.length) return "\\emptyset";
  if (S.length === 1 && S[0].a === -Infinity && S[0].b === Infinity) return "\\mathbb{R}";
  var parts = [], pts = [];
  function flush() { if (pts.length) { parts.push("\\{" + pts.join(", ") + "\\}"); pts = []; } }
  S.forEach(function (p) {
    if (p.a === p.b) { pts.push(fmtNum(p.a)); return; }
    flush();
    parts.push((p.ac ? "[" : "(") + fmtNum(p.a) + ", " + fmtNum(p.b) + (p.bc ? "]" : ")"));
  });
  flush();
  return parts.join(" \\cup ");
}
// Every endpoint of A and B, plus points between them: where two sets differ,
// one of these points (or a nice number) shows it.
function witnessIn(A, B, pred) {
  var cands = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 0.5, -0.5, 1.5, -1.5, 7, -7, 8, -8, 10, -10, 20, -20, 100, -100];
  var ends = [];
  A.concat(B).forEach(function (p) { if (isFinite(p.a)) ends.push(p.a); if (isFinite(p.b)) ends.push(p.b); });
  ends.sort(function (x, y) { return x - y; });
  ends.forEach(function (e, i) {
    cands.push(e);
    if (i + 1 < ends.length) cands.push((e + ends[i + 1]) / 2);
  });
  if (ends.length) { cands.push(ends[0] - 1); cands.push(ends[ends.length - 1] + 1); }
  for (var i = 0; i < cands.length; i++) if (pred(cands[i])) return cands[i];
  return null;
}

/* ---- solution set of a relation in one variable (numerically) ---- */
var GRID_N = 4800, GRID_LO = -60, GRID_STEP = 120 / GRID_N;
function gx(i) { return (i - GRID_N / 2) / (GRID_N / 120); }

function holds(op, l, r) {
  if (!isFinite(l) || !isFinite(r)) return false;
  var eq = Math.abs(l - r) <= 1e-9 * Math.max(1, Math.abs(l), Math.abs(r));
  switch (op) {
    case "<": return l < r && !eq;
    case "<=": return l < r || eq;
    case ">": return l > r && !eq;
    case ">=": return l > r || eq;
    case "=": return eq;
    case "!=": return !eq;
  }
  return false;
}
function chainHolds(d, env, skipNe) {
  var vals = d.parts.map(function (p) { return ev(p, env); });
  if (vals.some(function (v) { return !isFinite(v); })) return false;
  for (var i = 0; i < d.ops.length; i++) {
    if(d.ops[i]==="and")continue;
    if (skipNe && d.ops[i] === "!=") continue;
    if (!holds(d.ops[i], vals[i], vals[i + 1])) return false;
  }
  return true;
}
function snap(b) {
  var q, p;
  for (q = 1; q <= 12; q++) { p = Math.round(b * q); if (Math.abs(b - p / q) < 1e-7) return p / q; }
  for (q = 1; q <= 12; q++) { p = Math.round(b / Math.PI * q); if (Math.abs(b - p * Math.PI / q) < 1e-7) return p * Math.PI / q; }
  for (var m = 2; m <= 50; m++) {
    var r = Math.sqrt(m);
    for (q = 1; q <= 6; q++) { p = Math.round(b * q / r); if (p !== 0 && Math.abs(b - p * r / q) < 1e-7) return p * r / q; }
  }
  return b;
}
function bisect(f, lo, hi, flo) {
  for (var k = 0; k < 64; k++) {
    var mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (f(mid) === flo) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
// Roots of h on the grid window: sign changes, plus touching zeros (double roots).
function rootsOf(h) {
  var vals = [], roots = [], i;
  for (i = 0; i <= GRID_N; i++) vals.push(h(gx(i)));
  function add(r) {
    r = snap(r);
    var v = h(r);
    if (!isFinite(v) || Math.abs(v) > 1e-7 * Math.max(1, Math.abs(r))) return;
    for (var j = 0; j < roots.length; j++) if (Math.abs(roots[j] - r) < 1e-7) return;
    roots.push(r);
  }
  for (i = 0; i <= GRID_N; i++) {
    var v = vals[i], x = gx(i);
    if (!isFinite(v)) continue;
    if (v === 0 || Math.abs(v) < 1e-12) { add(x); continue; }
    if (i < GRID_N && isFinite(vals[i + 1]) && (v > 0) !== (vals[i + 1] > 0) && vals[i + 1] !== 0) {
      var sg = v > 0;
      add(bisect(function (t) { var w = h(t); return isFinite(w) ? w > 0 : sg; }, x, gx(i + 1), sg));
    }
    // local minimum of |h| that may touch zero
    if (i > 0 && i < GRID_N && isFinite(vals[i - 1]) && isFinite(vals[i + 1]) &&
        Math.abs(v) <= Math.abs(vals[i - 1]) && Math.abs(v) <= Math.abs(vals[i + 1]) && Math.abs(v) < 0.05) {
      var lo = gx(i - 1), hi = gx(i + 1);
      for (var k = 0; k < 100; k++) {
        var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (Math.abs(h(m1)) < Math.abs(h(m2))) hi = m2; else lo = m1;
      }
      add((lo + hi) / 2);
    }
  }
  return roots.sort(function (a, b) { return a - b; });
}

// Runs of grid points where f holds, as pieces with exact (bisected, snapped) ends.
function gridRuns(f, minLen) {
  var out = [], t = [], i, runStart = -1;
  for (i = 0; i <= GRID_N; i++) t.push(f(gx(i)));
  function edge(i0, i1) {
    var b = snap(bisect(f, gx(i0), gx(i1), t[i0]));
    return { x: b, in: f(b) };
  }
  for (i = 0; i <= GRID_N + 1; i++) {
    var on = i <= GRID_N && t[i];
    if (on && runStart < 0) runStart = i;
    if (!on && runStart >= 0) {
      var e = i - 1;
      if (e - runStart + 1 >= minLen) {
        var left = runStart === 0 ? { x: -Infinity, in: false } : edge(runStart - 1, runStart);
        var right = e === GRID_N ? { x: Infinity, in: false } : edge(e + 1, e);
        out.push(piece(left.x, right.x, left.in, right.in));
      }
      runStart = -1;
    }
  }
  return out;
}

function solveChain(d, v, env) {
  var base = {};
  for (var k in env) base[k] = env[k];
  function at(x) { base[v] = x; return base; }
  var eqIdx = d.ops.indexOf("=");
  if (eqIdx >= 0) {
    // isolated roots, plus whole stretches where the equation holds (e.g. floor(x) = 3)
    var L = d.parts[eqIdx], R = d.parts[eqIdx + 1];
    var full = function (x) { return chainHolds(d, at(x)); };
    var rs = rootsOf(function (x) { return ev(L, at(x)) - ev(R, at(x)); });
    return normSet(gridRuns(full, 3).concat(rs.filter(full).map(function (x) { return piece(x, x, 1, 1); })));
  }
  var S = normSet(gridRuns(function (x) { return chainHolds(d, at(x), true); }, 1));
  // remove the isolated points excluded by "!="
  d.ops.forEach(function (op, j) {
    if (op !== "!=") return;
    var L2 = d.parts[j], R2 = d.parts[j + 1];
    rootsOf(function (x) { return ev(L2, at(x)) - ev(R2, at(x)); }).forEach(function (r) {
      S = subtractPoint(S, r);
    });
  });
  return S;
}
function subtractPoint(S, r) {
  var out = [];
  S.forEach(function (p) {
    if (setHas([p], r)) {
      if (p.a === p.b) return;
      out.push(piece(p.a, r, p.ac, false));
      out.push(piece(r, p.b, false, p.bc));
    } else out.push(p);
  });
  return normSet(out);
}
function solveSet(rel, v, env) {
  var all = [];
  rel.disj.forEach(function (d) {
    if (!d.ops.length) return;
    all = all.concat(solveChain(d, v, env || {}));
  });
  return normSet(all);
}

function intersectSets(A,B) {
  var out=[];
  A.forEach(function(p){B.forEach(function(q){
    var a=Math.max(p.a,q.a),b=Math.min(p.b,q.b);
    if(a<=b)out.push(piece(a,b,setHas([p],a)&&setHas([q],a),setHas([p],b)&&setHas([q],b)));
  });});return normSet(out);
}
// Conditions in set-builder answers: not binds before and, and before or.
// Keep this syntax tree separate from algebraic working-step chains.
Parser.prototype.conditionAtom = function () {
  if(this.is("not")){this.next();return {t:"not",a:this.conditionAtom()};}
  var start=this.i;
  try {
    var chain={parts:[this.expr()],ops:[]};
    while(this.is("rel")){chain.ops.push(this.next().v);chain.parts.push(this.expr());}
    if(chain.ops.length)return {t:"chain",chain:chain};
  } catch (_) { /* Parentheses may surround a condition rather than a number. */ }
  this.i=start;
  if(this.is("(")){this.next();var a=this.conditionOr();this.expect(")");return {t:"group",a:a};}
  throw new ParseError("כתבו תנאי, למשל \\(x>2\\).");
};
Parser.prototype.conditionAnd = function () {
  var n=this.conditionAtom();
  while(this.is("and")){this.next();n={t:"and",a:n,b:this.conditionAtom()};}
  return n;
};
Parser.prototype.conditionOr = function () {
  var n=this.conditionAnd();
  while(this.is("or")){this.next();n={t:"or",a:n,b:this.conditionAnd()};}
  return n;
};
function conditionVars(n,acc) {
  acc=acc||{};
  if(n.t==="chain")varsOf({t:"rel",disj:[n.chain]},acc);
  else {conditionVars(n.a,acc);if(n.b)conditionVars(n.b,acc);}
  return Object.keys(acc);
}
function conditionSet(n,v) {
  if(n.t==="chain")return solveChain(n.chain,v,{});
  var a=conditionSet(n.a,v);
  if(n.t==="group")return a;
  if(n.t==="not")return complement(a);
  var b=conditionSet(n.b,v);
  return n.t==="and"?intersectSets(a,b):normSet(a.concat(b));
}
function conditionTex(n,parent) {
  var rank={or:1,and:2,not:3,group:4,chain:4}[n.t],s;
  if(n.t==="chain")s=texChain(n.chain);
  else if(n.t==="group")s="\\left("+conditionTex(n.a)+"\\right)";
  else if(n.t==="not")s="\\text{לא}\\quad "+conditionTex(n.a,rank);
  else if(n.t==="and"&&n.b.t==="not")s=conditionTex(n.a,rank)+"\\quad\\text{ולא}\\quad "+conditionTex(n.b.a,3);
  else s=conditionTex(n.a,rank)+"\\quad\\text{"+(n.t==="and"?"וגם":"או")+"}\\quad "+conditionTex(n.b,rank);
  return rank<(parent||0)?"\\left("+s+"\\right)":s;
}
/* ---- parsing a set written by the reader ---- */
Parser.prototype.startsSetBuilder = function () {
  var variable=this.peek(1),separator=this.peek(2);
  return this.is("{")&&variable&&variable.k==="var"&&separator&&["|",":","in"].indexOf(separator.k)>=0;
};
// A builder is one set term: its closing brace ends the condition, leaving
// any following union/intersection/difference for the surrounding expression.
Parser.prototype.readSetBuilder = function () {
  this.expect("{");var variable=this.expect("var").v,domain=false,condition=null;
  if(this.is("in")){this.next();this.expect("R");domain=true;}
  if(!domain||!this.is("}")){
    if(this.is(":"))this.next();else this.expect("|");
    condition=this.conditionOr();
    if(conditionVars(condition).some(function(v){return v!==variable;}))
      throw new ParseError("בתנאי צריך להשתמש באותו משתנה שמופיע לפני השומר.");
  }
  this.expect("}");return {variable:variable,domain:domain,condition:condition};
};
Parser.prototype.isBareSetCondition = function () {
  // Relations inside a builder do not turn the whole set expression into
  // a bare condition. Explicit set notation takes the set-parser route.
  var tokens=this.t.slice(this.i);
  return tokens.some(function(t){return t.k==="rel";})&&
    !tokens.some(function(t){return ["{","[","R","U","cap","\\"].indexOf(t.k)>=0;});
};
Parser.prototype.looksLikeInterval = function () {
  var depth = 0;
  for (var j = this.i; j < this.t.length; j++) {
    var k = this.t[j].k;
    if (k === "(" || k === "[" || k === "{") depth++;
    else if (k === ")" || k === "]" || k === "}") { depth--; if (depth === 0) return false; }
    else if (k === "," && depth === 1) return true;
  }
  return false;
};
Parser.prototype.endpoint = function () {
  var e = this.expr();
  if (hasVar(e)) throw new ParseError("בקצה של קטע צריך מספר, בלי משתנה.");
  var v = ev(e, {});
  if (isNaN(v)) throw new ParseError("אחד הקצוות אינו מספר מוגדר.");
  return v;
};
Parser.prototype.setTerm = function () {
  var p = this.peek();
  if (!p) throw new ParseError("הקבוצה נגמרה באמצע.");
  if ((p.k === "(" || p.k === "[") && this.looksLikeInterval()) {
    var open = this.next().k;
    var a = this.endpoint();
    this.expect(",");
    var b = this.endpoint();
    var c = this.next();
    if (!c || (c.k !== ")" && c.k !== "]")) throw new ParseError("חסר סוגר בסוף הקטע.");
    if (a === Infinity || b === -Infinity) throw new ParseError("בקטע, הקצה השמאלי קטן מהימני.");
    if ((open === "[" && a === -Infinity) || (c.k === "]" && b === Infinity))
      throw new ParseError("ליד ∞ הסוגר תמיד עגול.");
    if (a > b) throw new ParseError("בקטע, הקצה השמאלי צריך להיות קטן מהימני.");
    return [piece(a, b, open === "[", c.k === "]")];
  }
  if (p.k === "{") {
    if(this.startsSetBuilder()){
      var builder=this.readSetBuilder();
      return builder.condition?conditionSet(builder.condition,builder.variable):[piece(-Infinity,Infinity,false,false)];
    }
    this.next();
    var pts = [];
    if (!this.is("}")) {
      do {
        var v = this.endpoint();
        pts.push(piece(v, v, 1, 1));
      } while (this.is(",") && this.next());
    }
    this.expect("}");
    return normSet(pts);
  }
  if(p.k==="("&&this.peek(1)&&["R","{","[","("].indexOf(this.peek(1).k)>=0){
    this.next();var grouped=this.setExpression();this.expect(")");return grouped;
  }
  if (p.k === "R") {
    this.next();
    return [piece(-Infinity, Infinity, 0, 0)];
  }
  if (this.setNotationOnly) throw new ParseError("חסר סימון של קבוצה.");
  // an inequality written in x, e.g.  -1 <= x < 3
  var d = { parts: [this.expr()], ops: [] };
  while (this.is("rel")) { d.ops.push(this.next().v); d.parts.push(this.expr()); }
  if (!d.ops.length) {
    if (hasVar(d.parts[0])) throw new ParseError("כתבו קבוצה: קטע כמו <code>(1,3]</code>, רשימה כמו <code>{1,2}</code> או אי-שוויון כמו <code>x>2</code>.");
    var val = ev(d.parts[0], {});
    if (isNaN(val)) throw new ParseError("זה אינו מספר מוגדר.");
    return [piece(val, val, 1, 1)];
  }
  var vs = Object.keys(varsOf({ t: "rel", disj: [d] }));
  if (vs.length > 1) throw new ParseError("באי-השוויון מופיעים כמה משתנים.");
  return solveChain(d, vs[0] || "x", {});
};
Parser.prototype.setIntersection = function () {
  var out=this.setTerm();
  while(this.is("cap")||this.is("\\")||this.is("op","-")){
    var op=this.next(),right=this.setTerm();
    out=intersectSets(out,op.k==="cap"?right:complement(right));
  }
  return out;
};
Parser.prototype.setExpression = function () {
  var out=this.setIntersection();
  while(this.is("U")||this.is("or")){this.next();out=normSet(out.concat(this.setIntersection()));}
  return out;
};
function setBuilder(src) {
  try{
    var p=new Parser(tokenize(src));
    if(!p.startsSetBuilder())return null;
    var builder=p.readSetBuilder();return p.atEnd()?builder:null;
  }catch(_){return null;}
}
// Answer fields require set notation; algebraic work and plotting can still
// interpret conditions. Check every term, including inside set operations.
function hasSetNotation(src) {
  try {
    var p = new Parser(tokenize(src));
    p.setNotationOnly = true;
    p.setExpression();
    return p.atEnd();
  } catch (_) { return false; }
}
function parseSet(src) {
  var p = new Parser(tokenize(src));
  if (p.atEnd()) throw new ParseError("השדה ריק.");
  if (p.is("var") && p.peek(1) && p.peek(1).k === "in") { p.next(); p.next(); }
  if(p.isBareSetCondition()){
    var condition=p.conditionOr(),variables=conditionVars(condition);
    if(!p.atEnd())throw new ParseError("לא הצלחתי לקרוא את סוף התנאי.");
    if(variables.length>1)throw new ParseError("בתנאי מופיעים כמה משתנים.");
    return conditionSet(condition,variables[0]||"x");
  }
  // a bare list "3, -2"
  var bare = true, depth = 0, comma = false;
  p.t.forEach(function (tk) {
    if (tk.k === "(" || tk.k === "[" || tk.k === "{" || tk.k === "|") depth++;
    if (tk.k === ")" || tk.k === "]" || tk.k === "}") depth--;
    if (tk.k === "," && depth === 0) comma = true;
    if (tk.k === "rel" || tk.k === "U" || tk.k === "or" || tk.k === "R") bare = false;
  });
  var S;
  if (comma && bare && !p.is("(") && !p.is("[") && !p.is("{")) {
    S = [];
    do { var v = p.endpoint(); S.push(piece(v, v, 1, 1)); } while (p.is(",") && p.next());
  } else {
    S = p.setExpression();
  }
  if (!p.atEnd()) throw new ParseError("לא הצלחתי לקרוא את סוף הקבוצה.");
  return normSet(S);
}

// Typeset the entered set expression, not its evaluated interval decomposition.
// Keep the student's order, operations, endpoints and numeric expressions.
function setInputTex(src) {
  parseSet(src); // Validate without using the evaluated result for display.
  if (src.trim() === "∅") return "\\emptyset";
  var p = new Parser(tokenize(src)), prefix = "";
  if (p.is("var") && p.peek(1) && p.peek(1).k === "in") { prefix = p.next().v + "\\in "; p.next(); }
  if(p.isBareSetCondition())return prefix+conditionTex(p.conditionOr());
  function term() {
    if ((p.is("(") || p.is("[")) && p.looksLikeInterval()) {
      var open = p.next().k, a = tex(p.expr()); p.expect(",");
      var b = tex(p.expr()), close = p.next().k;
      return "\\left" + open + a + ", " + b + "\\right" + close;
    }
    if (p.is("{")) {
      if(p.startsSetBuilder()){
        var builder=p.readSetBuilder();
        return "\\left\\{"+builder.variable+(builder.domain?"\\in\\mathbb{R}":"")+
          (builder.condition?"\\mid "+conditionTex(builder.condition):"")+"\\right\\}";
      }
      p.next(); var entries = [];
      if (!p.is("}")) do { entries.push(tex(p.expr())); } while (p.is(",") && p.next());
      p.expect("}");
      return "\\left\\{" + entries.join(", ") + "\\right\\}";
    }
    if (p.is("R")) {
      p.next();return "\\mathbb{R}";
    }
    if(p.is("(")&&p.peek(1)&&["R","{","[","("].indexOf(p.peek(1).k)>=0){p.next();var group=union();p.expect(")");return "\\left("+group+"\\right)";}
    var d = {parts:[p.expr()], ops:[]};
    while (p.is("rel")) { d.ops.push(p.next().v); d.parts.push(p.expr()); }
    return texChain(d);
  }
  function intersection(){
    var out=term();
    while(p.is("cap")||p.is("\\")||p.is("op","-")){var op=p.next();out+=(op.k==="cap"?"\\cap ":"\\setminus ")+term();}
    return out;
  }
  function union(){
    var out=intersection();
    while(p.is("U")||p.is("or")||p.is(",")){var op=p.next().k;out+=(op==="U"?"\\cup ":op==="or"?"\\quad\\text{או}\\quad ":", ")+intersection();}
    return out;
  }
  return prefix + union();
}

/* ======================================================================== */
/* 4. Comparing answers                                                     */
/* ======================================================================== */

function rng(seed) { var s = seed || 12345; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function sampleEnvs(vars, positive, count) {
  var r = rng(97), out = [], fixed = [2.31, -1.37, 0.73, 3.62, -2.84, 1.19, -0.46, 4.53, 0.27, -3.91, 5.66, -4.48,
    1.83, -0.88, 2.97, 0.41, -5.27, 6.38, -6.71, 7.93];
  count = count || 40;
  for (var i = 0; i < count; i++) {
    var env = {};
    vars.forEach(function (v, j) {
      var x = i < fixed.length ? fixed[(i + 7 * j) % fixed.length] : (r() * 20 - 10);
      if (positive && positive.indexOf(v) >= 0) x = Math.abs(x) + 0.05;
      env[v] = x;
    });
    out.push(env);
  }
  return out;
}
function niceEnvs(vars, positive) {
  var vals = [2, 1, 3, -1, 0, -2, 4, 5, -3, 10, 0.5];
  if (vars.length !== 1) return [];
  return vals.filter(function (x) { return !(positive && positive.indexOf(vars[0]) >= 0 && x <= 0); })
    .map(function (x) { var e = {}; e[vars[0]] = x; return e; });
}
function envText(env) {
  return Object.keys(env).map(function (k) { return "\\(" + k + " = " + fmtNum(env[k]) + "\\)"; }).join(", ");
}

// ref: the reference expression (the answer, or the previous line).
function compareExpr(ref, got, vars, positive, integers) {
  var envs = sampleEnvs(vars, positive), both = 0, bad = null, gotMissing = null;
  if (integers && integers.length) envs.forEach(function (env) {
    integers.forEach(function (v) {
      if (!(v in env)) return;
      env[v] = Math.round(env[v]);
      if (positive && positive.indexOf(v) >= 0) env[v] = Math.max(1, env[v]);
    });
  });
  for (var i = 0; i < envs.length; i++) {
    var a = ev(ref, envs[i]), b = ev(got, envs[i]);
    if (isFinite(a) && isFinite(b)) {
      both++;
      if (!close(a, b, 1e-7)) { bad = envs[i]; break; }
    } else if (isFinite(a) && !isFinite(b) && !gotMissing) gotMissing = envs[i];
  }
  if (!bad) {
    if (gotMissing && both < 4) return { ok: false, why: "domain", env: gotMissing };
    if (both === 0) return { ok: false, why: "undefined" };
    return { ok: true, gotMissing: gotMissing };
  }
  var nice = niceEnvs(vars, positive).filter(function (env) {
    return !(integers && integers.some(function (v) { return v in env && !Number.isInteger(env[v]); }));
  });
  for (var j = 0; j < nice.length; j++) {
    var a2 = ev(ref, nice[j]), b2 = ev(got, nice[j]);
    if (isFinite(a2) && isFinite(b2) && !close(a2, b2, 1e-7)) { bad = nice[j]; break; }
  }
  return { ok: false, why: "value", env: bad, refVal: ev(ref, bad), gotVal: ev(got, bad) };
}

function guessKind(ans) {
  var s = normalize(ans);
  if (/[{}]|\bU\b|\bR\b|[<>]|!=|\bor\b/.test(s)) return "set";
  if (/^\s*[(\[]/.test(s) && /,/.test(s)) return "set";
  var vs;
  try { vs = Object.keys(varsOf(parseExpr(s))); } catch (e) { return "num"; }
  return vs.length ? "expr" : "num";
}
function checkComposition(target,outer,inner){
  if(!outer.trim()||!inner.trim())return {ok:false,empty:true,msg:"כתבו את שתי הפונקציות, f ו־g."};
  var f=parseExpr(outer),g=parseExpr(inner),ref=parseExpr(target);
  if(Object.keys(varsOf(f)).concat(Object.keys(varsOf(g))).some(function(v){return v!=="x";}))throw new ParseError("כתבו את f ואת g כביטויים במשתנה x.");
  function substitute(n){
    if(n.t==="var"&&n.n==="x")return g;
    var next=Object.assign({},n);["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")next[k]=substitute(n[k]);});return next;
  }
  var composed=substitute(f),checked=0,samples=niceEnvs(["x"],[]).concat(sampleEnvs(["x"],[]));
  for(var i=0;i<samples.length;i++){
    var x=samples[i].x,a=ev(ref,{x:x}),gx=ev(g,{x:x}),b=isFinite(gx)?ev(f,{x:gx}):NaN;
    if(isFinite(a)!==isFinite(b))return {ok:false,node:composed,msg:"תחומי ההגדרה אינם מתאימים. בדקו את ההרכבה עבור \\(x="+fmtNum(x)+"\\)."};
    if(!isFinite(a))continue;checked++;
    if(!close(a,b,1e-7))return {ok:false,node:composed,msg:"ההרכבה עדיין אינה הפונקציה המבוקשת. עבור \\(x="+fmtNum(x)+"\\) מתקבל \\(f(g(x))="+fmtNum(b)+"\\), במקום \\("+fmtNum(a)+"\\)."};
  }
  return checked?{ok:true,node:composed,msg:"✓ נכון! ההרכבה של הפונקציות שבחרתם נותנת את הפונקציה המבוקשת."}:{ok:false,node:composed,msg:"לא ניתן לבדוק את ההרכבה בתחום הזה. בדקו את הביטויים ואת תחומי ההגדרה."};
}

// Returns {ok, msg, near, partial} for one blank. opts: {form, positive}.
function checkAnswer(kind, ans, input, vars, opts) {
  var r = checkValue(kind, ans, input, vars, opts || {});
  if(r.ok&&kind==="set"){
    var bareValues=false;
    try{bareValues=splitList(input).every(function(s){var n=parseExpr(s);return !hasVar(n)&&isFinite(ev(n,{}));});}catch(_){}
    if(bareValues)return {ok:false,partial:true,msg:"הערכים נכונים. כדי לכתוב קבוצה, הקיפו את איבריה בסוגריים מסולסלים \\(\\{\\ \\}\\). אפשר להשתמש גם בסימון קטעים או קרניים, כשזה מתאים לקבוצה."};
    // form="abs" explicitly asks for an absolute-value condition, not a set.
    if (!(opts && opts.form === "abs") && !hasSetNotation(input))
      return {ok:false,partial:true,msg:"התשובה מתארת את הקבוצה הנכונה, אבל חסר סימון של קבוצה. כתבו בשיטת השומר, למשל \\(\\{x\\mid x>2\\}\\), או בסימון קטעים וקרניים, למשל \\((2,\\infty)\\)."};
  }
  if (r.ok && opts && opts.form) {
    var f = checkForm(opts.form, ans, input);
    if (f) return { ok: false, partial: true, msg: f };
  }
  if(r.ok&&kind==="num"&&!(opts&&opts.allowExpression===true)&&!finishedNumber(parseExpr(input)))
    return {ok:false,partial:true,msg:"הערך נכון, אבל החישוב עדיין לא הושלם. כתבו את התוצאה כמספר או כשבר מצומצם."};
  return r;
}
// A numeric answer is a result, not another calculation. Exact symbolic
// answers are enabled explicitly by the author with allow-expression="true".
function finishedNumber(n) {
  function literal(p){return p.t==="num"||p.t==="inf";}
  function signed(p){return literal(p)||p.t==="neg"&&literal(p.a);}
  if(signed(n))return true;
  if(n.t==="neg")n=n.a;
  if(n.t!=="div"||!signed(n.a)||!signed(n.b))return false;
  var a=ev(n.a,{}),b=ev(n.b,{});
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||Math.abs(b)<=1)return false;
  a=Math.abs(a);b=Math.abs(b);
  while(b){var rest=a%b;a=b;b=rest;}
  return a===1;
}
var FORM_MSG = {
  frac: "הערך נכון, אבל כתבו אותו כשבר, למשל \\(\\frac{3}{4}\\).",
  product: "הערך נכון, אבל כתבו אותו כמכפלה של גורמים.",
  simple: "הערך נכון, אבל אפשר לפשט עוד.",
  abs: "הקבוצה נכונה, אבל כתבו אותה בעזרת ערך מוחלט.",
  interval: "הקבוצה נכונה, אבל כתבו אותה בסימון של קטעים, למשל \\((1,3]\\).",
  builder: "הקבוצה נכונה, אבל כתבו אותה בשיטת השומר, למשל \\(\\{x\\mid x>2\\}\\).",
  finite: "הקבוצה נכונה, אבל רשמו את איבריה בתוך סוגריים מסולסלים, למשל \\(\\{1,3\\}\\)."
};
function checkForm(form, ans, input) {
  var s = normalize(input).replace(/\s+/g, "");
  if (form === "frac") {
    // Read the mathematical structure, including grouping inserted by the editor.
    // Parentheses around a numerator do not stop it being a fraction.
    var fraction;
    try { fraction = parseExpr(input); } catch (e) { return FORM_MSG.frac; }
    while (fraction.t === "neg") fraction = fraction.a;
    function integerLiteral(n) {
      while (n.t === "neg") n = n.a;
      return n.t === "num" && /^\d+$/.test(n.s) ? n.v : null;
    }
    if (integerLiteral(fraction) !== null) return null;
    if (fraction.t !== "div") return FORM_MSG.frac;
    var numerator = integerLiteral(fraction.a), denominator = integerLiteral(fraction.b);
    if (numerator === null || denominator === null || !denominator) return FORM_MSG.frac;
    var gcd = function (a, b) { return b ? gcd(b, a % b) : a; };
    return gcd(numerator, denominator) > 1 ? "הערך נכון, אבל אפשר לצמצם את השבר." : null;
  }
  if (form === "abs") return /\||abs/.test(s) ? null : FORM_MSG.abs;
  if (form === "builder") return setBuilder(input) ? null : FORM_MSG.builder;
  if (form === "finite") return /^\{[^{}]*\}$/.test(s) && !setBuilder(input) ? null : FORM_MSG.finite;
  if (form === "interval") {
    if (s === "{}") return null;
    var p = new Parser(tokenize(input));
    try {
      do {
        if (!(p.is("(") || p.is("[")) || !p.looksLikeInterval()) return FORM_MSG.interval;
        p.setTerm();
      } while (p.is("U") && p.next());
      return p.atEnd() ? null : FORM_MSG.interval;
    } catch (_) { return FORM_MSG.interval; }
  }
  var n;
  try { n = parseExpr(input); } catch (e) { return null; }
  if (form === "calculation") {
    while (n.t === "neg") n = n.a;
    return finishedNumber(n) ? "התוצאה נכונה. בשדה הזה כתבו את החישוב שהוביל אליה, בלי לפשט אותו; את התוצאה כתבו בשדה הבא." : null;
  }
  if (form === "product") { while (n.t === "neg") n = n.a; return n.t === "mul" ? null : FORM_MSG.product; }
  if (form === "simple") return nodes(n) <= nodes(parseExpr(ans)) ? null : FORM_MSG.simple;
  return null;
}
// The terms of a list, written with commas: "1, 1, 2, 3" (kind="list", for the first terms
// of a sequence). The order matters; each term is any number expression.
function splitList(src) {
  return String(src).split(",").map(function (t) { return t.trim(); }).filter(function (t, i, all) { return t || i < all.length - 1; });
}
function checkValue(kind, ans, input, vars, opts) {
  input = String(input || "").trim();
  if (!input) return { ok: false, empty: true, msg: "עוד לא כתבתם תשובה." };
  if(kind==="text"){
    function plain(s){return String(s).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,"").replace(/[־–—-]/g," ").replace(/\s+/g," ").trim().replace(/[.!?]+$/,"").trim();}
    return plain(input)===plain(ans)?{ok:true}:{ok:false,msg:"לא נכון. נסו שוב."};
  }
  if (kind === "letter-order") {
    // These are point labels, not variables to evaluate (in particular, e).
    var order = normalize(input).replace(/\s+/g, "");
    var expected = ans.replace(/\s+/g, "").split("<");
    if (!/^[a-z](?:<[a-z])*$/.test(order))
      return { ok:false, msg:"כתבו את האותיות מהקטן לגדול, עם הסימן \\(<\\) ביניהן." };
    var letters = order.split("<");
    if (letters.some(function (c) { return expected.indexOf(c) < 0; }))
      return { ok:false, msg:"השתמשו רק באותיות שמופיעות בציור." };
    if (new Set(letters).size !== letters.length)
      return { ok:false, msg:"כל אות צריכה להופיע פעם אחת." };
    for (var oi = 0; oi < letters.length; oi++) {
      if (letters[oi] !== expected[oi])
        return { ok:false, msg:"בדקו את הסדר לפי מיקום הנקודות: המספר הקטן יותר נמצא משמאל." };
    }
    if (letters.length < expected.length)
      return { ok:false, partial:true, msg:"עד כאן נכון. המשיכו עד שכל האותיות יופיעו." };
    return { ok:true };
  }
  if (kind === "list") {
    var want = splitList(ans).map(function (t) { return ev(parseExpr(t), {}); }), gotL = [];
    var parts = splitList(input);
    for (var li = 0; li < parts.length; li++) {
      var gvL;
      try { gvL = ev(parseExpr(parts[li]), {}); } catch (e) {
        return { ok: false, msg: (parts[li] ? "את האיבר ה-" + (li + 1) + " לא הצלחתי לקרוא. " : "יש כאן פסיק בלי איבר. ") +
          "כותבים את האיברים מופרדים בפסיקים, למשל <code>1, 2, 3</code>." };
      }
      if (isNaN(gvL)) return { ok: false, msg: "האיבר ה-" + (li + 1) + " אינו מספר." };
      gotL.push(gvL);
    }
    for (var lj = 0; lj < Math.min(want.length, gotL.length); lj++) {
      if (!close(want[lj], gotL[lj], 1e-9)) {
        return { ok: false, msg: "האיבר ה-" + (lj + 1) + " אינו נכון." + (lj ? " כל האיברים שלפניו נכונים." : "") };
      }
    }
    if (gotL.length < want.length) return { ok: false, partial: true, msg: "עד כאן נכון, אבל צריך " + want.length + " איברים, וכתבתם " + gotL.length + "." };
    if (gotL.length > want.length) return { ok: false, msg: "כתבתם " + gotL.length + " איברים, וצריך רק " + want.length + "." };
    return { ok: true };
  }
  if (kind === "set") {
    var A = parseSet(ans), G;
    try { G = parseSet(input); } catch (e) { return { ok: false, msg: errMsg(e) + " כתבו למשל <code>(-2,3]</code> או <code>[1,inf)</code> או <code>{1,2}</code>." }; }
    if (setEq(A, G)) return { ok: true };
    var finite = A.every(function (p) { return p.a === p.b; }) && G.every(function (p) { return p.a === p.b; });
    if (finite) {
      var miss = A.filter(function (p) { return !setHas(G, p.a); }), extra = G.filter(function (p) { return !setHas(A, p.a); });
      if (miss.length && !extra.length) return { ok: false, msg: miss.length === 1 ? "חסר איבר אחד." : "חסרים " + miss.length + " איברים." };
      if (extra.length && !miss.length) return { ok: false, msg: "יש כאן איבר שאינו שייך: \\(" + fmtNum(extra[0].a) + "\\)." };
      return { ok: false, msg: "לא בדיוק: \\(" + fmtNum((extra[0] || miss[0]).a) + "\\) " + (extra.length ? "אינו שייך לקבוצה." : "חסר.") };
    }
    if (sameEnds(A, G)) return { ok: false, msg: "נקודות הקצה נכונות. בדקו בכל קצה אם הוא שייך (סוגר מרובע) או לא (סוגר עגול)." };
    if (setEq(complement(A), G)) return { ok: false, msg: "כתבתם בדיוק את המספרים שאינם בקבוצה. בדקו את כיוון אי-השוויון." };
    var w = witnessIn(A, G, function (x) { return setHas(A, x) !== setHas(G, x); });
    if (w !== null) {
      var inA = setHas(A, w);
      return { ok: false, msg: "לא בדיוק: המספר \\(" + fmtNum(w) + "\\) " + (inA ? "צריך להיות בקבוצה, ואצלכם הוא חסר." : "אינו שייך לקבוצה, ואצלכם הוא מופיע.") };
    }
    return { ok: false, msg: "הקבוצה שלכם שונה מהתשובה." };
  }
  var ref = parseExpr(ans), got;
  try { got = parseExpr(input); } catch (e) {
    try { parseRelation(input); return { ok: false, msg: "כאן צריך ביטוי או מספר, בלי סימן שוויון או אי-שוויון." }; } catch (e2) { /* fall through */ }
    return { ok: false, msg: errMsg(e) };
  }
  if (kind === "num") {
    var gv = Object.keys(varsOf(got));
    if (gv.length) return { ok: false, msg: "כאן צריך מספר, בלי המשתנה \\(" + gv[0] + "\\)." };
    var a = ev(ref, {}), b = ev(got, {});
    if (isNaN(b)) return { ok: false, msg: "הביטוי שכתבתם אינו מוגדר (למשל חילוק באפס, או שורש של מספר שלילי)." };
    if (close(a, b, 1e-9)) return { ok: true };
    if (close(a, -b, 1e-9) && a !== 0) return { ok: false, msg: "כמעט! בדקו את הסימן." };
    if (Math.abs(a - b) <= 0.006 * Math.max(1, Math.abs(a))) return { ok: false, near: true, msg: "קרוב מאוד, אבל זה קירוב. כתבו ערך מדויק (שבר, שורש, \\(\\pi\\) או \\(e\\))." };
    if (a !== 0 && close(a * b, 1, 1e-9)) return { ok: false, msg: "קיבלתם את ההופכי של התשובה." };
    return { ok: false, msg: "לא נכון. נסו שוב." };
  }
  // expression
  var refVars = Object.keys(varsOf(ref)), gotVars = Object.keys(varsOf(got));
  var allowed = (vars && vars.length ? vars : refVars);
  var stray = gotVars.filter(function (v) { return allowed.indexOf(v) < 0; });
  if (stray.length) return { ok: false, msg: "המשתנה \\(" + stray[0] + "\\) לא אמור להופיע כאן. השתמשו ב-\\(" + allowed.join(", ") + "\\)." };
  // An explicit finite-data task asks for a formula fitting the given terms,
  // not an identity with the author's chosen continuation.
  if (opts.checkAt && allowed.length === 1) {
    var samples = opts.checkAt.split(",").map(Number), variable = allowed[0];
    for (var si = 0; si < samples.length; si++) {
      var env = {}; env[variable] = samples[si];
      var expected = ev(ref, env), actual = ev(got, env);
      if (!isFinite(actual)) return {ok:false,msg:"הביטוי אינו מוגדר עבור " + envText(env) + "."};
      if (!close(expected, actual, 1e-9))
        return {ok:false,msg:"עבור " + envText(env) + " מתקבל \\(" + fmtNum(actual) +
          "\\), אבל האיבר הנתון הוא \\(" + fmtNum(expected) + "\\)."};
    }
    return {ok:true};
  }
  var r = compareExpr(ref, got, allowed.length ? allowed : ["x"], opts.positive, opts.integers);
  if (r.ok) return { ok: true };
  if (r.why === "value" && r.env) return { ok: false, msg: "לא בדיוק. עבור " + envText(r.env) + " הביטוי שלכם שווה \\(" + fmtNum(r.gotVal) + "\\), אבל צריך לקבל \\(" + fmtNum(r.refVal) + "\\)." };
  return { ok: false, msg: "הביטוי שלכם אינו שווה לתשובה." };
}
function errMsg(e) { return e instanceof ParseError ? e.message : "לא הצלחתי לקרוא את מה שכתבתם."; }

/* ======================================================================== */
/* 5. Steps: is the new line equivalent, and which rule was used?           */
/* ======================================================================== */

var RULES = {
  simplify: "פישוט (פתיחת סוגריים, כינוס איברים, חישוב)",
  add:      "חיבור או חיסור של אותו ביטוי בשני האגפים",
  mulpos:   "כפל או חילוק של האגפים במספר חיובי",
  mulneg:   "כפל או חילוק של האגפים במספר שלילי",
  mul:      "כפל או חילוק של שני האגפים באותו מספר",
  swap:     "החלפת האגפים",
  abs:      "פירוק ערך מוחלט",
  log:      "הפעלת log על שני האגפים",
  exp:      "העלאת הבסיס בחזקת שני האגפים",
  root:     "הוצאת שורש משני האגפים",
  power:    "העלאת שני האגפים בחזקה שלישית",
  factor:   "פירוק לגורמים (גורם משותף, כפל מקוצר)",
  zero:     "מכפלה שווה לאפס: אחד הגורמים שווה לאפס",
  formula:  "נוסחת השורשים"
};
var COMPAT = {
  simplify: ["simplify", "swap"], swap: ["swap", "simplify"], add: ["add"], mulpos: ["mulpos"],
  mulneg: ["mulneg"], mul: ["mulpos", "mulneg"], abs: ["abs"], log: ["log"], exp: ["exp"], root: ["root"], power: ["power"],
  factor: ["simplify", "swap"], zero: ["zero"], formula: ["formula"]
};
var MIRROR = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=", "!=": "!=", and:"and" };

function reverseChain(d) {
  return { parts: d.parts.slice().reverse(), ops: d.ops.slice().reverse().map(function (o) { return MIRROR[o]; }) };
}
function opsEqual(a, b) { return a.length === b.length && a.every(function (o, i) { return o === b[i]; }); }
function opsFlipped(a, b) { return a.length === b.length && a.every(function (o, i) { return b[i] === MIRROR[o]; }); }
function isIneq(ops) { return ops.some(function (o) { return ["<","<=",">",">="].indexOf(o)>=0; }); }

// Compare the parts of two chains of the same length at the sample points.
function classifyChain(A, B, vars, positive) {
  var envs = sampleEnvs(vars, positive, 30);
  var best = null;
  [B, reverseChain(B)].forEach(function (Bo, orient) {
    if (best && best.kind !== "other") return;
    var k = A.parts.length, D = [], Q = [], LG = [], EX = [], RT2 = [], RT3 = [], CU = [];
    envs.forEach(function (env) {
      var av = A.parts.map(function (p) { return ev(p, env); }), bv = Bo.parts.map(function (p) { return ev(p, env); });
      if (av.concat(bv).some(function (v) { return !isFinite(v); })) return;
      D.push(bv.map(function (b, i) { return b - av[i]; }));
      Q.push(av.some(function (a) { return Math.abs(a) < 1e-9; }) ? null : bv.map(function (b, i) { return b / av[i]; }));
      LG.push(av.map(function (a, i) { return a > 0 && Math.abs(bv[i]) > 1e-9 ? Math.exp(Math.log(a) / bv[i]) : null; }));
      EX.push(bv.map(function (b, i) { return b > 0 && Math.abs(av[i]) > 1e-9 ? Math.exp(Math.log(b) / av[i]) : null; }));
      RT3.push(bv.map(function (b, i) { return close(b * b * b, av[i], 1e-7); }));
      RT2.push(bv.map(function (b, i) { return b >= 0 && close(b * b, av[i], 1e-7); }));
      CU.push(av.map(function (a, i) { return close(a * a * a, bv[i], 1e-7); }));
    });
    if (D.length < 3) return;
    function allClose(rows, eqAcross, constant) {
      var first = null;
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (!row) continue;
        for (var i = 0; i < k; i++) {
          if (row[i] === null) return false;
          if (eqAcross && !close(row[i], row[0], 1e-7)) return false;
        }
        if (constant) {
          if (first === null) first = row[0];
          else if (!close(row[0], first, 1e-7)) return false;
        }
      }
      return true;
    }
    var res = { orient: orient, opsSame: opsEqual(A.ops, Bo.ops), opsFlip: opsFlipped(A.ops, Bo.ops) };
    var zero = D.every(function (row) { return row.every(function (d) { return Math.abs(d) < 1e-7 * 10; }); });
    if (zero) res.kind = orient ? "swap" : "simplify";
    else if (allClose(D, true, false)) { res.kind = "add"; res.c = D[0][0]; res.constant = allClose(D, true, true); }
    else if (Q.filter(Boolean).length >= 3 && allClose(Q, true, true)) {
      var c = Q.filter(Boolean)[0][0];
      res.kind = c > 0 ? "mulpos" : "mulneg"; res.c = c;
    } else if (Q.filter(Boolean).length >= 3 && allClose(Q, true, false)) res.kind = "mulexpr";
    else if (allClose(LG.map(function (r) { return r.some(function (x) { return x === null; }) ? null : r; }), true, true) &&
      LG.filter(function (r) { return r.every(function (x) { return x !== null; }); }).length >= 3) res.kind = "log";
    else if (allClose(EX.map(function (r) { return r.some(function (x) { return x === null; }) ? null : r; }), true, true) &&
      EX.filter(function (r) { return r.every(function (x) { return x !== null; }); }).length >= 3) res.kind = "exp";
    else if (RT3.every(function (r) { return r.every(Boolean); }) || RT2.every(function (r) { return r.every(Boolean); })) res.kind = "root";
    else if (CU.every(function (r) { return r.every(Boolean); })) res.kind = "power";   // cubing: an odd power keeps the order
    else {
      res.kind = "other";
      // a near-miss worth naming: different constants added to the two sides
      if (D.length && D.every(function (row) { return row.every(function (d, i) { return close(d, D[0][i], 1e-7); }); })) {
        res.unequalAdd = D[0];
      } else {
        var Qs = Q.filter(Boolean);
        if (Qs.length >= 3 && Qs.every(function (row) { return row.every(function (q, i) { return close(q, Qs[0][i], 1e-7); }); }))
          res.unequalMul = Qs[0];
      }
    }
    if (!best || (best.kind === "other" && res.kind !== "other")) best = res;
  });
  return best || { kind: "other" };
}

function exprSame(a, b, vars, positive) { return compareExpr(a, b, vars, positive).ok; }
function chainSame(A, B, vars, positive) {
  function same(X, Y) {
    return X.parts.length === Y.parts.length && opsEqual(X.ops, Y.ops) &&
      X.parts.every(function (p, i) { return exprSame(p, Y.parts[i], vars, positive); });
  }
  return same(A, B) || same(A, reverseChain(B));
}
function isZeroConst(n) {
  return !Object.keys(varsOf(n)).length && Math.abs(ev(n, {})) < 1e-12;
}
// Taking off |E|, or the square in E^2, splits the line in the standard way:
//   |E| < c  ->  -c < E < c          |E| > c  ->  E > c  or  E < -c
//   |E| = c  ->  E = c  or  E = -c   (just E = 0 when c = 0)
// For E^2 op c the same holds with sqrt(c) in place of c. Returns "abs", "root" or null.
function splitStep(A, B, vars, positive, solveVar) {
  if (A.disj.length !== 1) return null;
  var d = A.disj[0];
  if (d.parts.length !== 2) return null;
  function inner(n) {
    if (n.t === "fn" && n.f === "abs") return { E: n.a, kind: "abs" };
    if (n.t === "pow" && n.b.t === "num" && n.b.v === 2) return { E: n.a, kind: "root" };
    return null;
  }
  if (!inner(d.parts[0])) d = reverseChain(d);
  var ins = inner(d.parts[0]), c = d.parts[1], op = d.ops[0];
  if (!ins || hasVar(c, solveVar)) return null;
  var E = ins.E, zero = isZeroConst(c);
  if (ins.kind === "root") c = { t: "fn", f: "sqrt", a: c };
  var negc = { t: "neg", a: c }, ok;
  if (op === "<" || op === "<=") {
    ok = B.disj.length === 1 && chainSame({ parts: [negc, E, c], ops: [op, op] }, B.disj[0], vars, positive);
  } else if (op === "=" && zero) {
    ok = B.disj.length === 1 && chainSame({ parts: [E, c], ops: ["="] }, B.disj[0], vars, positive);
  } else {
    if (B.disj.length !== 2) return null;
    var p1 = { parts: [E, c], ops: [op] }, p2 = { parts: [E, negc], ops: [MIRROR[op]] };
    var b0 = B.disj[0], b1 = B.disj[1];
    ok = (chainSame(p1, b0, vars, positive) && chainSame(p2, b1, vars, positive)) ||
      (chainSame(p1, b1, vars, positive) && chainSame(p2, b0, vars, positive));
  }
  return ok ? ins.kind : null;
}
// The factors of a product; a power x^k counts as the factor x.
function factorsOf(n, out) {
  if (n.t === "mul") { factorsOf(n.a, out); factorsOf(n.b, out); }
  else if (n.t === "neg") factorsOf(n.a, out);
  else if (n.t === "pow" && n.b.t === "num" && n.b.v >= 1 && n.b.v === Math.round(n.b.v)) factorsOf(n.a, out);
  else out.push(n);
  return out;
}
// P = 0 with P a product  ->  one equation "factor = 0" per factor, joined by "or".
function zeroStep(A, B, vars, positive, solveVar) {
  if (A.disj.length !== 1) return false;
  var d = A.disj[0];
  if (d.parts.length !== 2 || d.ops[0] !== "=") return false;
  var P = isZeroConst(d.parts[1]) ? d.parts[0] : isZeroConst(d.parts[0]) ? d.parts[1] : null;
  if (!P || !(P.t === "mul" || P.t === "pow" || P.t === "neg")) return false;
  var fs = factorsOf(P, []).filter(function (f) { return hasVar(f, solveVar); });
  if (!fs.length) return false;
  function zeroSide(e) {
    if (e.parts.length !== 2 || e.ops[0] !== "=") return null;
    return isZeroConst(e.parts[1]) ? e.parts[0] : isZeroConst(e.parts[0]) ? e.parts[1] : null;
  }
  function match(g, f) { return exprSame(g, f, vars, positive) || exprSame({ t: "neg", a: g }, f, vars, positive); }
  var gs = B.disj.map(zeroSide);
  if (gs.some(function (g) { return !g; })) return false;
  return gs.every(function (g) { return fs.some(function (f) { return match(g, f); }); }) &&
    fs.every(function (f) { return gs.some(function (g) { return match(g, f); }); });
}
function classifyStep(A, B, vars, positive, solveVar) {
  // (x+3)^2 = 0 -> x+3 = 0 is both a square root and a zero product.
  var split = splitStep(A, B, vars, positive, solveVar), zero = zeroStep(A, B, vars, positive, solveVar);
  if (split || zero) return { kind: split || "zero", alt: split && zero ? ["zero"] : [] };
  if (A.disj.length !== B.disj.length) return { kind: "other" };
  var kinds = A.disj.map(function (d, i) {
    var e = B.disj[i];
    if (d.parts.length !== e.parts.length) return { kind: "other" };
    return classifyChain(d, e, vars, positive);
  });
  var k0 = kinds[0];
  var same = kinds.every(function (k) { return k.kind === k0.kind; });
  if (!same) {
    // e.g. one disjunct simplified and the other had something added
    var ks = kinds.map(function (k) { return k.kind; });
    if (ks.every(function (k) { return k === "simplify" || k === "swap" || k === "add"; })) return { kind: "add", mixed: true, parts: kinds };
    if (ks.every(function (k) { return k === "simplify" || k === "swap" || k === "mulpos" || k === "mulneg"; })) return { kind: "mul", mixed: true, parts: kinds };
    return { kind: "other", parts: kinds };
  }
  var out = {};
  for (var key in k0) out[key] = k0[key];
  out.parts = kinds;
  return out;
}
function opsOk(cls, A, B) {
  // the direction must be kept, or flipped exactly when multiplying by a negative number
  var ok = true;
  (cls.parts || []).forEach(function (k, i) {
    var a = A.disj[i], b = B.disj[i];
    if (!a || !b) return;
    var bo = k.orient ? reverseChain(b) : b;
    if (k.kind === "mulneg" && isIneq(a.ops)) { if (!opsFlipped(a.ops, bo.ops)) ok = false; }
    else if (k.kind !== "other" && k.kind !== "mulexpr") { if (!opsEqual(a.ops, bo.ops)) ok = false; }
  });
  return ok;
}

function relSets(A, B, solveVar, params, positive) {
  var envs = [{}];
  if (params.length) envs = sampleEnvs(params, positive, 4);
  for (var i = 0; i < envs.length; i++) {
    var SA = solveSet(A, solveVar, envs[i]), SB = solveSet(B, solveVar, envs[i]);
    if (!setEq(SA, SB)) return { ok: false, env: envs[i], A: SA, B: SB };
  }
  return { ok: true };
}

function isolatedComparison(d,v) {
  if (d.parts.length === 2) {
    return (d.parts[0].t === "var" && d.parts[0].n === v && !hasVar(d.parts[1], v)) ||
      (d.parts[1].t === "var" && d.parts[1].n === v && !hasVar(d.parts[0], v));
  }
  if (d.parts.length === 3) {
    return d.parts[1].t === "var" && d.parts[1].n === v && !hasVar(d.parts[0], v) && !hasVar(d.parts[2], v);
  }
  return false;
}
function branchGuard(c,v){
  return isolatedComparison(c,v)||c.parts.length===2&&c.parts.some(function(p){var q=exactFraction(p);return q&&q[0]===0;});
}
function isSolved(R, v) {
  if(relationTruth(R)!==null)return true;
  if(!R.disj.every(function(d){return comparisonChunks(d).every(function(c){return isolatedComparison(c,v);});}))return false;
  // Isolating x is not the end if its case conditions are still redundant.
  return comparisonCount(simplifyConditions(R,v))>=comparisonCount(R);
}

/* The verdict on one step.  cfg: {vars, solve, positive, verify(bool), mode} */
function judgeStep(prev, line, ruleKey, cfg) {
  if (cfg.mode === "lim") return judgeLimStep(prev, line, ruleKey, cfg);
  var out = { ok: false };
  if (cfg.mode === "expr") {
    var r = compareExpr(prev, line, cfg.vars, cfg.positive);
    if (!r.ok) {
      if (r.why === "value" && r.env) out.msg = "השורה אינה שווה לקודמת. עבור " + envText(r.env) + " השורה הקודמת שווה \\(" + fmtNum(r.refVal) + "\\), והשורה שלכם שווה \\(" + fmtNum(r.gotVal) + "\\).";
      else if (r.why === "domain") out.msg = "השורה שלכם אינה מוגדרת בנקודות שבהן הקודמת מוגדרת, למשל עבור " + envText(r.env) + ".";
      else out.msg = "השורה אינה שווה לקודמת.";
      return out;
    }
    if (tex(prev) === tex(line)) { out.msg = "זו אותה שורה כמו הקודמת. כתבו את השורה הבאה בחישוב."; return out; }
    out.ok = true;
    return out;
  }
  // relations
  if (!isRelation(line)) { out.msg = "כאן צריך שורה עם סימן שוויון או אי-שוויון, כמו בשורה הקודמת."; return out; }
  var params = cfg.vars.filter(function (v) { return v !== cfg.solve; });
  var same = relSets(inCase(prev,cfg), inCase(line,cfg), cfg.solve, params, cfg.positive);
  var cls = classifyStep(prev, line, cfg.vars, cfg.positive, cfg.solve);
  if (!same.ok) {
    out.msg = diagnose(prev, line, cls, same, cfg);
    return out;
  }
  if (prev.disj.map(texChain).join("|") === line.disj.map(texChain).join("|")) {
    out.msg = "זו אותה שורה כמו הקודמת. כתבו את השורה הבאה בפתרון."; return out;
  }
  out.kind = cls.kind;
  if (cfg.verify && ruleKey) {
    // The quadratic formula gives the solutions at once: any correct "x = .. or x = .." line.
    if (ruleKey === "formula") {
      var one = prev.disj.length === 1 && prev.disj[0].ops.length === 1 && prev.disj[0].ops[0] === "=";
      if (one && isSolved(line, cfg.solve)) { out.ok = true; return out; }
      out.msg = "השורה נכונה, אבל נוסחת השורשים נותנת מיד את הפתרונות עצמם. כתבו אותם עם ״או״ ביניהם, למשל " +
        "\\(" + cfg.solve + " = 2\\) או \\(" + cfg.solve + " = -3\\).";
      out.partial = true;
      return out;
    }
    var allowed = COMPAT[ruleKey] || [ruleKey];
    if (cls.kind === "other" || cls.kind === "mulexpr") {
      out.msg = "השורה נכונה, אבל המעבר משלב כמה פעולות. כתבו אותו בכמה צעדים, ובכל צעד פעולה אחת.";
      out.partial = true;
      return out;
    }
    // In "A or B" each side may get its own multiplier; every operation used must fit the rule.
    var used = cls.mixed ? (cls.parts || []).map(function (k) { return k.kind; })
      .filter(function (k) { return k !== "simplify" && k !== "swap"; }) : [cls.kind];
    var wrong = used.filter(function (k) { return allowed.indexOf(k) < 0; })[0];
    if (wrong && !(cls.alt || []).some(function (k) { return allowed.indexOf(k) >= 0; })) {
      out.msg = "השורה נכונה, אבל זה לא הכלל שבחרתם. המעבר הוא: " + ruleName(wrong) + ".";
      out.partial = true;
      out.suggest = wrong;
      return out;
    }
  }
  out.ok = true;
  return out;
}
function ruleName(k) {
  if (k === "mulpos" || k === "mulneg") return RULES[k];
  return RULES[k] || "צעד אחר";
}
function diagnose(prev, line, cls, same, cfg) {
  var k = cls.kind, ineq = prev.disj.some(function (d) { return isIneq(d.ops); });
  if (k === "mulneg" && ineq && !opsOk(cls, prev, line))
    return "כפלתם או חילקתם במספר <b>שלילי</b> (\\(" + fmtNum(cls.c) + "\\)), ולכן צריך להפוך את כיוון אי-השוויון.";
  if (k === "mulpos" && ineq && !opsOk(cls, prev, line))
    return "כפלתם או חילקתם במספר <b>חיובי</b>, ולכן כיוון אי-השוויון לא משתנה.";
  if ((k === "add" || k === "simplify" || k === "swap") && !opsOk(cls, prev, line))
    return "האגפים נכונים, אבל סימן ההשוואה השתנה. בפעולה הזו הוא נשאר כמו שהוא.";
  if (k === "mulexpr" && ineq)
    return "כפלתם בביטוי שמכיל את \\(" + cfg.solve + "\\). הסימן שלו לא ידוע, ולכן אי אפשר לדעת אם הכיוון מתהפך. צריך לפצל למקרים.";
  // two parts that got different amounts: name them
  function differing(u) {
    for (var a = 0; a < u.length; a++) for (var b = a + 1; b < u.length; b++) if (!close(u[a], u[b], 1e-7)) return [u[a], u[b]];
    return null;
  }
  var two = prev.disj[0] && prev.disj[0].parts.length === 2;
  var parts = cls.parts || [cls];
  for (var i = 0; i < parts.length; i++) {
    var du = parts[i].unequalAdd && differing(parts[i].unequalAdd);
    if (du) return (two ? "לאגפים נוספו כמויות שונות: לאגף אחד \\(" + fmtNum(du[0]) + "\\) ולשני \\(" + fmtNum(du[1]) + "\\)."
      : "לחלקים נוספו כמויות שונות, למשל לחלק אחד \\(" + fmtNum(du[0]) + "\\) ולחלק אחר \\(" + fmtNum(du[1]) + "\\).") +
      " צריך להוסיף (או לחסר) את אותו דבר " + (two ? "בשני האגפים." : "בכל החלקים.");
    var dq = parts[i].unequalMul && differing(parts[i].unequalMul);
    if (dq) return (two ? "האגפים הוכפלו במספרים שונים: " : "החלקים הוכפלו במספרים שונים, למשל ") + "אחד במספר \\(" + fmtNum(dq[0]) + "\\) ואחר במספר \\(" + fmtNum(dq[1]) +
      "\\). צריך לכפול (או לחלק) " + (two ? "את שני האגפים" : "את כל החלקים") + " באותו מספר.";
  }
  var absHint = prev.disj.some(function (d) { return d.parts.some(hasAbs); }) && !line.disj.some(function (d) { return d.parts.some(hasAbs); })
    ? " בפירוק ערך מוחלט בדקו אם שני הגבולות צריכים להתקיים יחד (וגם), או שמספיק שתתקיים אחת האפשרויות (או). בכל תנאי עובדים עם כל הביטוי שבתוך הקווים." : "";
  var v = cfg.solve, A = same.A, B = same.B;
  var w = witnessIn(A, B, function (x) { return setHas(A, x) !== setHas(B, x); });
  var pre = Object.keys(same.env).length ? "כאשר " + envText(same.env) + ", " : "";
  if (w !== null) {
    return "השורה החדשה אינה שקולה לקודמת. " + pre + "עבור \\(" + v + " = " + fmtNum(w) + "\\) השורה הקודמת " +
      (setHas(A, w) ? "נכונה" : "לא נכונה") + ", והשורה שלכם " + (setHas(B, w) ? "נכונה" : "לא נכונה") + "." + absHint;
  }
  return "השורה החדשה אינה שקולה לקודמת." + absHint;
}

/* ======================================================================== */
/* 5b. Limits of sequences: the arithmetic of limits                        */
/* ======================================================================== */
/* limOf(node, v): the limit as v -> infinity that the ARITHMETIC OF LIMITS gives,
   using only the standard sequences (c, 1/v^p, q^v, v^p, a^(1/v), v^(1/v), v!,
   (1 + a)^b -> e^(lim a*b)) and the rules for + - * / powers and roots, with
   infinity. It never guesses: an undetermined form (inf - inf, inf/inf, 0*inf,
   0/0, 1^inf, inf^0) is reported as such. That is what lets the step builder
   refuse a "limit step" taken through an undetermined form.
   Result: {k:"num", v} | {k:"inf", s:+1|-1} | {k:"undet", f} | {k:"osc"} | {k:"none"} | {k:"unk"} */
var LNUM = function (v) { return { k: "num", v: v }; };
var LINF = function (s) { return { k: "inf", s: s }; };
var LUND = function (f) { return { k: "undet", f: f }; };
var LBN = function () { return { k: "num", v: 0, b: true }; };   // bounded x (-> 0): the squeeze corollary
function isBounded(L) { return L.k === "osc" || (L.k === "none" && L.bounded); }
function flag(R, A, B) {
  if (R && (R.k === "num" || R.k === "inf")) {
    if ((A && A.b) || (B && B.b)) R.b = true;
    if ((A && A.g) || (B && B.g)) R.g = true;
  }
  return R;
}
function limSignAtInfinity(node, v) {
  // the sign of a sequence for large indices (sampled); 0 if it changes sign
  var s = 0;
  for (var i = 0, ns = [1e3, 3e3, 1e4, 1e5, 1e6]; i < ns.length; i++) {
    var env = { $exact: true }; env[v] = ns[i];
    var x = ev(node, env);
    if (!isFinite(x) || x === 0) return 0;
    var sx = x > 0 ? 1 : -1;
    if (s && sx !== s) return 0;
    s = sx;
  }
  return s;
}
// The trend of a sequence for very large indices, read off its values: a number, +-inf, or null.
// Used only where the arithmetic of limits needs a product it cannot simplify (the e rule),
// and to see that a polynomial-like part grows without bound.
function numericTrend(node, v) {
  var xs = [1e4, 1e6, 1e8].map(function (k) { var env = { $exact: true }; env[v] = k; return ev(node, env); });
  if (!xs.every(isFinite)) return null;
  if (Math.abs(xs[2]) > 1e6 && Math.abs(xs[2]) > 10 * Math.abs(xs[1]) && xs[1] * xs[2] > 0) return LINF(xs[2] > 0 ? 1 : -1);
  if (Math.abs(xs[2] - xs[1]) <= 1e-4 * Math.max(1, Math.abs(xs[2]))) return LNUM(Math.round(xs[2] * 1e6) / 1e6);
  return null;
}
// For inf/inf between DIFFERENT growth orders (n^5 vs 2^n, 3^n vs n!): read off moderate
// indices, where n! and q^n are still finite. Returns 0, +-inf, or null.
function growthTrend(node, v) {
  var xs = [40, 90, 160].map(function (k) { var env = { $exact: true }; env[v] = k; return ev(node, env); });
  if (!xs.every(isFinite)) return null;
  var a = xs.map(Math.abs);
  if (a[2] < 1e-6 && a[2] < a[1] && a[1] < a[0]) return LNUM(0);
  if (a[2] > 1e6 && a[2] > a[1] && a[1] > a[0] && xs[1] * xs[2] > 0) return LINF(xs[2] > 0 ? 1 : -1);
  return null;
}
function isOneOver(node, v) {   // 1/v, written as 1/v or v^(-1)
  return (node.t === "div" && node.a.t === "num" && node.a.v === 1 && node.b.t === "var" && node.b.n === v) ||
    (node.t === "pow" && node.a.t === "var" && node.a.n === v && node.b.t === "neg" && node.b.a.t === "num" && node.b.a.v === 1);
}
function limOf(node, v) {
  if (!hasVar(node, v)) {
    var c = ev(node, {});
    if (isFinite(c)) return LNUM(c);
    if (c === Infinity) return LINF(1);
    if (c === -Infinity) return LINF(-1);
    return { k: "unk" };
  }
  var A, B, s;
  switch (node.t) {
    case "var": return node.n === v ? LINF(1) : { k: "unk" };
    case "neg":
      A = limOf(node.a, v);
      return A.k === "num" ? flag(LNUM(-A.v), A) : A.k === "inf" ? LINF(-A.s) : A;
    case "add": case "sub":
      A = limOf(node.a, v); B = limOf(node.b, v);
      if (node.t === "sub") B = B.k === "num" ? LNUM(-B.v) : B.k === "inf" ? LINF(-B.s) : B;
      if (A.k === "undet") return A;
      if (B.k === "undet") return B;
      if (A.k === "num" && B.k === "num") return flag(LNUM(A.v + B.v), A, B);
      if (A.k === "inf" && B.k === "num") return flag(LINF(A.s), A, B);
      if (A.k === "num" && B.k === "inf") return flag(LINF(B.s), A, B);
      if (A.k === "inf" && B.k === "inf") return A.s === B.s ? A : LUND("\\infty - \\infty");
      return A.k === "osc" || B.k === "osc" ? { k: "osc" } : { k: "unk" };
    case "mul":
      A = limOf(node.a, v); B = limOf(node.b, v);
      if (A.k === "undet") return A;
      if (B.k === "undet") return B;
      if (isBounded(A) && B.k === "num" && Math.abs(B.v) < 1e-12) return LBN();
      if (isBounded(B) && A.k === "num" && Math.abs(A.v) < 1e-12) return LBN();
      if (A.k === "num" && B.k === "num") return flag(LNUM(A.v * B.v), A, B);
      if (A.k === "inf" && B.k === "inf") return LINF(A.s * B.s);
      if (A.k === "inf" || B.k === "inf") {
        var I = A.k === "inf" ? A : B, N = A.k === "inf" ? B : A;
        if (N.k !== "num") return { k: "unk" };
        if (Math.abs(N.v) < 1e-12) return LUND("0 \\cdot \\infty");
        return LINF(I.s * (N.v > 0 ? 1 : -1));
      }
      return A.k === "osc" || B.k === "osc" ? { k: "osc" } : { k: "unk" };
    case "div":
      A = limOf(node.a, v); B = limOf(node.b, v);
      // a polynomial-like part (n^2 - 4n) is "inf - inf" by itself; inside a fraction the
      // useful message is the fraction's own form, inf/inf
      if (A.k === "undet" && A.f === "\\infty - \\infty") A = numericTrend(node.a, v) || A;
      if (B.k === "undet" && B.f === "\\infty - \\infty") B = numericTrend(node.b, v) || B;
      if (A.k === "undet") return A;
      if (B.k === "undet") return B;
      if (isBounded(A) && B.k === "inf") return LBN();
      if (A.k === "inf" && B.k === "inf") {
        var G = growthTrend(node, v);              // different growth orders decide it
        if (G) { G.g = true; return G; }
        return LUND("\\frac{\\infty}{\\infty}");
      }
      if (B.k === "inf") return A.k === "num" ? LNUM(0) : { k: "unk" };
      if (B.k !== "num") return B.k === "osc" || A.k === "osc" ? { k: "osc" } : { k: "unk" };
      if (Math.abs(B.v) > 1e-12) {
        if (A.k === "num") return flag(LNUM(A.v / B.v), A, B);
        if (A.k === "inf") return LINF(A.s * (B.v > 0 ? 1 : -1));
        return A.k === "osc" ? { k: "osc" } : { k: "unk" };
      }
      // the denominator tends to 0
      if (A.k === "num" && Math.abs(A.v) < 1e-12) return LUND("\\frac{0}{0}");
      if (A.k !== "num" && A.k !== "inf") return { k: "unk" };
      s = limSignAtInfinity(node.b, v);
      if (!s) return { k: "unk" };
      return LINF((A.k === "inf" ? A.s : (A.v > 0 ? 1 : -1)) * s);
    case "fact":
      A = limOf(node.a, v);
      return A.k === "inf" && A.s > 0 ? LINF(1) : { k: "unk" };
    case "pow":
      // the standard sequence v^(1/v) -> 1
      if (node.a.t === "var" && node.a.n === v && isOneOver(node.b, v)) return LNUM(1);
      A = limOf(node.a, v); B = limOf(node.b, v);
      if (A.k === "undet") return A;
      if (B.k === "undet") return B;
      if (B.k === "num") {                         // a power with a limit exponent
        var c2 = B.v;
        if (A.k === "num") {
          if (Math.abs(A.v - 1) < 1e-12 && !hasVar(node.b, v)) return LNUM(1);
          var pw = powr(A.v, c2);
          if (Math.abs(A.v) < 1e-12 && c2 < 0) {
            s = limSignAtInfinity(node.a, v);
            return s ? LINF(Math.abs(Math.round(c2)) % 2 === 1 ? s : 1) : { k: "unk" };
          }
          if (Math.abs(A.v) < 1e-12 && Math.abs(c2) < 1e-12) return LUND("0^0");
          return isFinite(pw) ? LNUM(pw) : { k: "unk" };
        }
        if (A.k === "inf") {
          if (Math.abs(c2) < 1e-12) return hasVar(node.b, v) ? LUND("\\infty^0") : LNUM(1);
          if (c2 < 0) return LNUM(0);
          if (A.s > 0) return LINF(1);
          var k2 = Math.round(c2);
          return Math.abs(c2 - k2) < 1e-12 ? LINF(k2 % 2 === 0 ? 1 : -1) : { k: "unk" };
        }
        return A.k === "osc" ? { k: "osc" } : { k: "unk" };
      }
      if (B.k === "inf") {                         // the exponent grows without bound
        if (A.k === "num") {
          var q = A.v;
          if (Math.abs(q - 1) < 1e-12) {
            if (!hasVar(node.a, v)) return LNUM(1);
            // (1 + a)^b with a -> 0, b -> inf: tends to e^(lim a*b)
            var prod = { t: "mul", a: node.b, b: { t: "sub", a: node.a, b: { t: "num", v: 1 } } };
            var P = limOf(prod, v);
            if (P.k !== "num" && P.k !== "inf") P = numericTrend(prod, v) || P;
            if (P.k === "num") return LNUM(Math.exp(P.v));
            if (P.k === "inf") return P.s > 0 ? LINF(1) : LNUM(0);
            return LUND("1^{\\infty}");
          }
          if (B.s > 0) {
            if (Math.abs(q) < 1) return LNUM(0);
            if (q > 1) return LINF(1);
            return { k: "none", bounded: Math.abs(q + 1) < 1e-12 };   // q <= -1: (-1)^n bounded, (-2)^n not
          }
          if (q > 1) return LNUM(0);
          if (q > 0 && q < 1) return LINF(1);
          return { k: "unk" };
        }
        if (A.k === "inf" && A.s > 0) return B.s > 0 ? LINF(1) : LNUM(0);
        return { k: "unk" };
      }
      return { k: "unk" };
    case "fn":
      if (node.f === "root" && node.n && hasVar(node.n, v)) {   // root(n, a) = a^(1/n)
        if (node.n.t === "var" && node.n.n === v && node.a.t === "var" && node.a.n === v) return LNUM(1);
        A = limOf(node.a, v);
        return A.k === "num" && A.v > 0 && !hasVar(node.a, v) ? LNUM(1) : { k: "unk" };
      }
      A = limOf(node.a, v);
      if (A.k === "undet") return A;
      if (node.f === "sin" || node.f === "cos") return A.k === "num" ? LNUM(node.f === "sin" ? Math.sin(A.v) : Math.cos(A.v)) : { k: "osc" };
      if (node.f === "abs") return A.k === "num" ? LNUM(Math.abs(A.v)) : A.k === "inf" ? LINF(1) : A;
      if (node.f === "arctan") return A.k === "num" ? LNUM(Math.atan(A.v)) : A.k === "inf" ? LNUM(A.s * Math.PI / 2) : A;
      if (node.f === "sqrt" || node.f === "cbrt" || node.f === "root") {
        if (A.k === "num") { var r = ev({ t: "fn", f: node.f, n: node.n, a: { t: "num", v: A.v } }, {}); return isFinite(r) ? LNUM(r) : { k: "unk" }; }
        if (A.k === "inf") return A.s > 0 ? LINF(1) : (node.f === "cbrt" ? LINF(-1) : { k: "unk" });
        return A;
      }
      if (node.f === "log") {
        var bse = node.base ? ev(node.base, {}) : 10;
        if (A.k === "num" && A.v > 0) return LNUM(Math.log(A.v) / Math.log(bse));
        if (A.k === "num" && Math.abs(A.v) < 1e-12) return LINF(bse > 1 ? -1 : 1);
        if (A.k === "inf" && A.s > 0) return LINF(bse > 1 ? 1 : -1);
        return { k: "unk" };
      }
      return { k: "unk" };
  }
  return { k: "unk" };
}

var LIMRULES = {
  divide:    { kind: "alg", label: "חילוק המונה והמכנה באותה חזקה של n" },
  simplify:  { kind: "alg", label: "פישוט (סוגריים, חזקות, שברים)" },
  factor:    { kind: "alg", label: "הוצאת גורם משותף" },
  conjugate: { kind: "alg", label: "כפל וחילוק בצמוד" },
  limit:     { kind: "lim", label: "מעבר לגבול: סדרות סטנדרטיות וחשבון גבולות" },
  bounded:   { kind: "lim", label: "מעבר לגבול: חסומה כפול שואפת לאפס" },
  growth:    { kind: "lim", label: "מעבר לגבול: סדרי גודל" },
  compute:   { kind: "num", label: "חישוב" }
};
var LIM_FORM_ADVICE = {
  "\\frac{\\infty}{\\infty}": "קודם חלקו את המונה ואת המכנה בחזקה הגבוהה ביותר של \\(n\\) במכנה.",
  "\\infty - \\infty": "קודם הוציאו גורם משותף (החזקה הגבוהה ביותר), או כפלו וחלקו בצמוד.",
  "0 \\cdot \\infty": "קודם כתבו את המכפלה כשבר אחד.",
  "\\frac{0}{0}": "קודם פשטו את הביטוי.",
  "1^{\\infty}": "כאן מתאים המספר \\(e\\): כתבו את הביטוי בעזרת \\(\\left(1 + \\frac{1}{n}\\right)^n\\).",
  "\\infty^0": "כאן לא מתאים חשבון הגבולות.",
  "0^0": "כאן לא מתאים חשבון הגבולות."
};
function limTex(L) {
  if (L.k === "num") return fmtNum(L.v);
  if (L.k === "inf") return L.s > 0 ? "\\infty" : "-\\infty";
  return "?";
}
// the value of a line without n: a number, or +-infinity written as inf / -inf
function constLim(node) {
  var c = ev(node, {});
  if (isFinite(c)) return LNUM(c);
  if (c === Infinity) return LINF(1);
  if (c === -Infinity) return LINF(-1);
  return null;
}
function sameLim(A, B) {
  if (!A || !B) return false;
  if (A.k === "num" && B.k === "num") return close(A.v, B.v, 1e-9);
  return A.k === "inf" && B.k === "inf" && A.s === B.s;
}
// two lines with n agree for every index n >= 1 (sampled), where both are defined
function seqSame(A, B, v) {
  var NS = [1, 2, 3, 4, 5, 6, 7, 9, 12, 17, 25, 40, 64, 100, 333, 1000], good = 0;
  for (var i = 0; i < NS.length; i++) {
    var env = { $exact: true }; env[v] = NS[i];
    var a = ev(A, env), b = ev(B, env);
    if (isFinite(a) && isFinite(b)) {
      if (!close(a, b, 1e-7)) return { ok: false, n: NS[i], a: a, b: b };
      good++;
    } else if (NS[i] >= 12 && NS[i] <= 64 && (isFinite(a) !== isFinite(b))) return { ok: false, n: NS[i], a: a, b: b };
    // (beyond that, a non-finite value is floating-point overflow such as 3^1000, not a real difference)
  }
  return { ok: good >= 5 };
}
/* One step of a limit chain.  cfg: {seq: "n", verify} */
function judgeLimStep(prev, line, ruleKey, cfg) {
  var v = cfg.seq || "n", out = { ok: false };
  var pv = hasVar(prev, v), lv = hasVar(line, v);
  var rk = ruleKey && LIMRULES[ruleKey] ? LIMRULES[ruleKey].kind : null;
  if (!pv && lv) { out.msg = "כבר עברנו לגבול: מכאן והלאה השורות הן מספרים, בלי \\(" + v + "\\)."; return out; }
  if (pv && lv) {                                   // an algebra step: the same sequence, rewritten
    var r = seqSame(prev, line, v);
    if (!r.ok) {
      out.msg = r.n ? "השורה החדשה אינה שווה לקודמת. עבור \\(" + v + " = " + r.n + "\\) השורה הקודמת שווה \\(" +
        fmtNum(r.a) + "\\), והחדשה \\(" + fmtNum(r.b) + "\\)." : "השורה החדשה אינה שווה לקודמת.";
      return out;
    }
    if (tex(prev) === tex(line)) { out.msg = "זו אותה שורה כמו הקודמת. כתבו את השלב הבא."; return out; }
    if (cfg.verify && rk && rk !== "alg") {
      out.msg = "השורה נכונה, אבל עוד יש בה \\(" + v + "\\): זה שינוי אלגברי של הסדרה, ועדיין לא מעבר לגבול.";
      out.partial = true; return out;
    }
    out.ok = true; return out;
  }
  if (pv && !lv) {                                  // taking the limit
    var L = limOf(prev, v), V = constLim(line);
    if (L.k === "undet") {
      out.msg = "הצבת הגבולות נותנת כאן \\(" + L.f + "\\): זו צורה לא מוגדרת, וחשבון הגבולות לא קובע מה הגבול. " +
        (LIM_FORM_ADVICE[L.f] || "");
      return out;
    }
    if (L.k === "osc" || (L.k === "none" && L.bounded)) { out.msg = "בשורה יש סדרה כמו \\(\\sin " + v + "\\), שאין לה גבול בעצמה. כאן חשבון הגבולות לא עוזר; נסו את כלל הסנדוויץ'."; return out; }
    if (L.k === "none") { out.msg = "בשורה יש סדרה שאין לה גבול (כמו \\((-1)^{" + v + "}\\)), ולכן אי אפשר להציב גבול."; return out; }
    if (L.k === "unk") { out.msg = "את הגבול של השורה הזו אי אפשר לקבל ישירות מהסדרות הסטנדרטיות ומחשבון הגבולות. נסו קודם לשנות אותה."; return out; }
    if (!V || !sameLim(L, V)) {
      out.msg = "זה אינו הגבול של השורה הקודמת. החליפו כל סדרה סטנדרטית בגבול שלה (למשל \\(\\frac{1}{" + v + "} \\to 0\\)) וחשבו שוב.";
      return out;
    }
    if (cfg.verify && rk && rk !== "lim") {
      out.msg = "השורה נכונה, אבל כאן עברנו לגבול: בחרו \"" + LIMRULES[L.g ? "growth" : L.b ? "bounded" : "limit"].label + "\".";
      out.partial = true; return out;
    }
    if (cfg.verify && L.g && ruleKey !== "growth") {
      out.msg = "השורה נכונה. כאן המונה והמכנה שואפים לאינסוף בסדרי גודל שונים: בחרו \"" + LIMRULES.growth.label + "\".";
      out.partial = true; return out;
    }
    if (cfg.verify && L.b && ruleKey !== "bounded") {
      out.msg = "השורה נכונה. כאן יש סדרה חסומה (כמו \\(\\sin " + v + "\\)) כפול סדרה ששואפת לאפס: בחרו \"" + LIMRULES.bounded.label + "\".";
      out.partial = true; return out;
    }
    out.ok = true; return out;
  }
  // both are numbers: a computation
  var a2 = constLim(prev), b2 = constLim(line);
  if (!b2 || !sameLim(a2, b2)) { out.msg = "השורה אינה שווה לקודמת: בדקו את החישוב."; return out; }
  if (tex(prev) === tex(line)) { out.msg = "זו אותה שורה כמו הקודמת."; return out; }
  out.ok = true; return out;
}
function limDone(line, v) { return !hasVar(line, v) && nodes(line) <= 4; }

/* ======================================================================== */
/* 6. The page: widgets                                                     */
/* ======================================================================== */

// What has been typed so far, read as far as it goes: the whole input; else the input
// with its open brackets closed; else the longest beginning that parses. A cut never
// splits a word, and never leaves a half-typed function name ("sqr" is not s·q·r).
// The closing brackets an unfinished input still needs, innermost first: "(x-1)(x^2" -> ")",
// "[1,3" -> "]", "{1,2" -> "}", "|x-4" -> "|". (An interval may close "[" with ")"; any closer pops.)
function closeBrackets(str) {
  var stack = [], CLOSE = { "(": ")", "[": "]", "{": "}", "|": "|" };
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (ch === ")" || ch === "]" || ch === "}") stack.pop();
    else if (ch === "|") { if (stack[stack.length - 1] === "|") stack.pop(); else stack.push("|"); }
  }
  return stack.reverse().map(function (c) { return CLOSE[c]; }).join("");
}
function parsedSoFar(v, parse) {
  function attempt(str) { try { return parse(str); } catch (e) { return null; } }
  function halfName(str) {
    var w = /[A-Za-z]{2,}$/.exec(str);
    return !!w && NAMES.some(function (f) { return f !== w[0].toLowerCase() && f.indexOf(w[0].toLowerCase()) === 0; });
  }
  for (var n = v.length; n > 0; n--) {
    if (n < v.length && /[A-Za-z]/.test(v[n - 1]) && /[A-Za-z]/.test(v[n])) continue;
    var str = v.slice(0, n).replace(/\s+$/, "");
    if (!str || halfName(str)) continue;
    var node = attempt(str);
    if (node) return { node: node, whole: n === v.length };
    var closers = closeBrackets(str);
    if (closers) {
      node = attempt(str + closers);
      if (node) return { node: node, whole: false };
    }
  }
  return null;
}
// Independent working: recheck the whole edited chain, without prescribing steps.
function checkWorking(startSrc, lines, cfg, targetSrc, justifications) {
  var parse = cfg.mode === "rel" ? parseRelation : parseExpr;
  var prev = parse(startSrc), target = parse(targetSrc), results = [], done = false;
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) {
      results.push({ ok: false, msg: "השורה ריקה. אפשר לכתוב בה או למחוק אותה." });
      return { results: results, done: false };
    }
    var next, r;
    try {
      next = parse(lines[i]);
      if(Object.keys(varsOf(next)).some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("בשורה הופיע משתנה שאינו חלק מהתרגיל.");
      // A direct final limit is allowed even when the symbolic limit engine needs
      // the author's intermediate rewrite. Prior sequence steps were checked above.
      if (cfg.mode === "lim" && !hasVar(next, cfg.seq) && constLim(next) && sameLim(constLim(next), constLim(target))) r = { ok: true };
      else r = cfg.mode==="rel"&&cfg.requireJustification ? checkJustifiedStep(relationSource(prev),lines[i],justifications&&justifications[i],cfg) : judgeStep(prev, next, null, cfg);
    } catch (e) { r = { ok: false, msg: "לא הצלחתי לקרוא את השורה. " + errMsg(e) }; }
    results.push(r);
    if (!r.ok) return { results: results, done: false };
    prev = next;
  }
  if (lines.length) done = cfg.mode === "rel" ? isSolved(prev, cfg.solve)
    : cfg.mode === "lim" ? limDone(prev, cfg.seq)
    : tex(prev) === tex(target) || (target.t === "pow" && prev.t === "pow"
      && tex(prev.a) === tex(target.a) && compareExpr(target, prev, cfg.vars, cfg.positive).ok);
  return { results: results, done: done };
}

// A numbered proof is replayed from the beginning. References are checked in
// their actual scope; neither a closed case nor a sibling supplies assumptions.
function checkLineProof(start,entries,cfg,memo){
  var records=[{number:1,type:"start",text:start,work:start,scope:[],cfg:cfg}],results=[],stack=[],groups=[];
  function math(key,compute){
    if(!memo)return compute();key=JSON.stringify(key);if(memo.has(key))return memo.get(key);
    var value=compute();if(memo.size>1200)memo.clear();memo.set(key,value);return value;
  }
  function scope(){return stack.map(function(s){return s.number;});}
  function sameScope(a,b){return a.length===b.length&&a.every(function(n,i){return n===b[i];});}
  function visible(r){var s=scope();return r&&r.type!=="close"&&r.scope.length<=s.length&&r.scope.every(function(n,i){return n===s[i];});}
  function ref(n){if(!Number.isInteger(n)||n<1||n>records.length)throw new ParseError("בחרו מספר של שורה קודמת שנבדקה.");return records[n-1];}
  function source(n){var r=ref(n);if(!visible(r))throw new ParseError("שורה "+n+" שייכת למקרה סגור או למקרה אחר. אפשר להשתמש בה רק באיחוד המקרים המתאים.");return r;}
  function currentCfg(){return stack.length?stack[stack.length-1].cfg:cfg;}
  function currentStart(){return stack.length?stack[stack.length-1].work:start;}
  function equivalent(a,b,c){return math(["equivalent",a,b,c],function(){return relSets(inCase(parseRelation(a),c),inCase(parseRelation(b),c),c.solve,c.vars.filter(function(v){return v!==c.solve;}),c.positive||[]).ok;});}
  function requireCurrent(r,c){if(!equivalent(r.work,currentStart(),c))throw new ParseError("השורה שנבחרה אינה מתארת את אותו מקרה. בחרו שורה מתוך המקרה הנוכחי.");}
  function expect(want,got,c){
    if(got!==undefined&&got!==null&&!math(["shape",want,got,c],function(){return justifiedShape(parseRelation(want),parseRelation(got),c);}))
      throw new ParseError("הנימוק אינו מתאים לשורה. צפוי: "+htmlRel(parseRelation(want))+". התקבל: "+htmlRel(parseRelation(got))+".");
    return got===undefined||got===null?want:got;
  }
  for(var i=0;i<entries.length;i++){
    var e=entries[i],number=i+2,c=currentCfg(),s=scope(),record={number:number,type:e.kind||"step",scope:s,cfg:c};
    try{
      var from,want,group,opening,conclusion;
      if(record.type==="open"){
        from=source(e.source);requireCurrent(from,c);
        var cases=splitRelationCases(from.work,e.split,c);
        if(!Number.isInteger(e.choice)||e.choice<0||e.choice>=cases.length)throw new ParseError("בחרו איזה מקרה לפתוח.");
        var split={at:e.split&&e.split.at};
        group=groups.filter(function(g){return g.source===e.source&&g.split.at===split.at&&sameScope(g.scope,s);})[0];
        if(group&&(group.merged||group.openings[e.choice]))throw new ParseError("המקרה הזה כבר נפתח. ערכו את שורת הפתיחה הקיימת במקום לפתוח אותו שוב.");
        var chosen=cases[e.choice],branchCfg=caseConfig(chosen,c);
        record.text=expect(chosen.source,e.text,c);record.work=chosen.work||chosen.source;
        if(!group){group={source:e.source,split:split,scope:s,count:cases.length,openings:[],closures:[],merged:false};groups.push(group);}
        record.group=group;record.choice=e.choice;record.cfg=branchCfg;record.scope=s.concat([number]);record.source=e.source;
        group.openings[e.choice]=number;stack.push(record);
      }else if(record.type==="close"){
        if(!stack.length)throw new ParseError("אין מקרה פתוח לסיום.");
        opening=ref(e.opening);conclusion=ref(e.conclusion);
        if(opening!==stack[stack.length-1])throw new ParseError("יש לסיים קודם את המקרה הפנימי, שנפתח בשורה "+stack[stack.length-1].number+".");
        if(!visible(conclusion)||!sameScope(conclusion.scope,s))throw new ParseError("שורת המסקנה צריכה להיות שורה שנבדקה בתוך המקרה שנבחר.");
        if(groups.some(function(g){return !g.merged&&sameScope(g.scope,s);}))throw new ParseError("אחדו קודם את המקרים שנפתחו בתוך המקרה הזה.");
        var scoped=inCase(parseRelation(conclusion.work),c);
        if((conclusion.actions||[]).some(function(a){return a.op==="conditions";})&&justifiedShape(simplifyConditions(scoped,c.solve),parseRelation(conclusion.work),c))scoped=parseRelation(conclusion.work);
        record.text=expect(relationSource(scoped),e.text,c);record.work=record.text;
        record.opening=e.opening;record.conclusion=e.conclusion;record.group=opening.group;record.choice=opening.choice;
        stack.pop();record.scope=scope();record.group.closures[record.choice]=number;
      }else if(record.type==="merge"){
        from=source(e.source);requireCurrent(from,c);
        if(!Array.isArray(e.closures)||!e.closures.length)throw new ParseError("בחרו את שורות סיום המקרים שרוצים לאחד.");
        var closed=e.closures.map(ref);group=closed[0].group;
        if(!group||group.merged||group.source!==e.source||!sameScope(group.scope,s)||closed.some(function(r){return r.type!=="close"||r.group!==group;}))throw new ParseError("בחרו סיומי מקרים של אותו או באותה שורת מקור.");
        if(new Set(e.closures).size!==group.count||closed.length!==group.count||Array.from({length:group.count},function(_,k){return group.closures[k];}).some(function(n){return !n||e.closures.indexOf(n)<0;}))throw new ParseError("חסר מקרה: צריך לפתוח, לסיים ולצטט כל אחד מהמקרים לפני האיחוד.");
        var disj=[];closed.sort(function(a,b){return a.choice-b.choice;}).forEach(function(r){if(relationTruth(parseRelation(r.work))!==false)disj=disj.concat(parseRelation(r.work).disj);});
        want=relationSource(disj.length?{t:"rel",disj:disj}:truthRelation(false));
        record.text=expect(want,e.text,c);record.work=record.text;record.source=e.source;record.closures=e.closures.slice();group.merged=true;
      }else if(record.type==="combine"){
        if(!Array.isArray(e.sources)||new Set(e.sources).size<2)throw new ParseError("בחרו לפחות שתי שורות שונות לשילוב.");
        var selected=e.sources.map(source);selected.forEach(function(r){requireCurrent(r,c);});
        var combined=parseRelation(selected[0].work);selected.slice(1).forEach(function(r){
          var ds=[];combined.disj.forEach(function(a){parseRelation(r.work).disj.forEach(function(b){ds.push(joinComparisons(comparisonChunks(a).concat(comparisonChunks(b))));});});
          if(ds.length>24)throw new ParseError("השילוב יוצר הרבה מקרים. שלבו פחות שורות בכל פעם.");combined={t:"rel",disj:ds};
        });
        want=relationSource(combined);record.text=expect(want,e.text,c);record.work=record.text;record.sources=e.sources.slice();
      }else{
        from=source(e.source);requireCurrent(from,c);
        if(!e.actions||!e.actions.length)throw new ParseError("בחרו נימוק לצעד.");
        want=math(["actions",from.work,e.actions,c],function(){var next=from.work;e.actions.forEach(function(a){next=executeAction(next,a,c);});return next;});
        record.text=e.text===undefined||e.text===null?want:e.text;
        var checked=math(["justified",from.work,record.text,e.actions,c],function(){return checkJustifiedStep(from.work,record.text,e.actions,c);});if(!checked.ok)throw new ParseError(checked.msg);
        record.work=record.text;record.source=e.source;record.actions=e.actions;
      }
      if(!record.text||!record.text.trim())throw new ParseError("כתבו את השורה המתקבלת.");
      if(Object.keys(varsOf(parseRelation(record.text))).some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("בשורה הופיע משתנה שאינו חלק מהתרגיל.");
      records.push(record);results.push({ok:true,expected:record.text});
    }catch(error){results.push({ok:false,msg:errMsg(error)});break;}
  }
  var last=records[records.length-1],pending=groups.filter(function(g){return !g.merged;});
  return {records:records,results:results,stack:stack,pending:pending,available:records.filter(visible),
    done:results.length===entries.length&&results.every(function(r){return r.ok;})&&!stack.length&&!pending.length&&records.length>1&&last.type!=="close"&&math(["done",last.work,cfg.solve],function(){return isSolved(parseRelation(last.work),cfg.solve);})};
}

// Algebra steps keep the student's chosen expressions, including repeated occurrences.
function expressionSource(n,parent) {
  var rank={add:1,sub:1,neg:1.5,mul:2,div:2,pow:4,fact:5}[n.t]||9,s;
  switch(n.t){
    case "num":s=n.s===undefined?String(n.v):n.s;break;
    case "var":s=n.n;break;
    case "pi":s="π";break;
    case "e":s="e";break;
    case "inf":s="∞";break;
    case "neg":s="-"+expressionSource(n.a,2);break;
    case "fact":s=expressionSource(n.a,5.01)+"!";break;
    case "add":case "sub":
      var negative=n.b.t==="neg",right=negative?n.b.a:n.b;
      s=expressionSource(n.a,1)+((n.t==="sub")!==negative?" - ":" + ")+expressionSource(right,1.01);break;
    case "mul":
      var a=expressionSource(n.a,2),b=expressionSource(n.b,2.01);
      // A coefficient can touch a variable or a parenthesis. Keep a visible dot
      // elsewhere, so adjacent numbers/letters cannot turn into a different token.
      var adjacent=n.a.t==="num"&&/^[a-zπ(]/i.test(b)||n.a.t!=="div"&&/\)$/.test(a)&&/^\(/.test(b);
      s=a+(adjacent?"":" · ")+b;break;
    case "div":s=expressionSource(n.a,2)+"/"+expressionSource(n.b,2.01);break;
    case "pow":s=expressionSource(n.a,4.01)+"^"+expressionSource(n.b,4);break;
    case "fn":
      if(n.f==="abs"&&!hasAbs(n.a))s="|"+expressionSource(n.a)+"|";
      else if(n.f==="root")s="root("+expressionSource(n.n)+", "+expressionSource(n.a)+")";
      else s=n.f+(n.base?"_"+expressionSource(n.base,9):"")+"("+expressionSource(n.a)+")";
      break;
    default:throw new ParseError("לא ניתן לערוך את הביטוי הזה.");
  }
  return rank<(parent||0)?"("+s+")":s;
}
function relationSource(n) {
  var terminal=relationTruth(n);if(terminal!==null)return terminal?"ℝ":"∅";
  var signs={"<=":"≤",">=":"≥","!=":"≠",and:"וגם"};
  return n.disj.map(function(d){return d.parts.map(function(p,i){return (i?" "+(signs[d.ops[i-1]]||d.ops[i-1])+" ":"")+expressionSource(p);}).join("");}).join(" או ");
}
function relationParts(src) {
  var r=parseRelation(src),out=[];
  function visit(n,path) {
    out.push({path:path,source:expressionSource(n),tex:tex(n),node:n});
    ["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")visit(n[k],path+"."+k);});
  }
  r.disj.forEach(function(d,i){d.parts.forEach(function(n,j){visit(n,i+"."+j);});});
  return out;
}
function relationPartGroups(src) {
  var groups=[];
  relationParts(src).forEach(function(part){
    // Formatting may differ (2*x versus 2x), but never group merely by equal value.
    var group=groups.filter(function(g){return g.source===part.source;})[0];
    if(group)group.paths.push(part.path);
    else groups.push({path:part.path,paths:[part.path],source:part.source,tex:part.tex,node:part.node});
  });
  return groups;
}
// Logical selections are occurrences, not textual search/replace. Each covers
// comparisons in a single AND group, or complete cases in an OR group.
function conditionParts(src) {
  var r=parseRelation(src),chunks=r.disj.map(comparisonChunks),out=[];
  function cells(a,b){var ids=[];for(var d=a;d<b;d++)chunks[d].forEach(function(_,i){ids.push(d+":"+i);});return ids;}
  function ranges(n,visit){
    visit(0,n);
    for(var length=Math.min(n-1,8);length>=1;length--)for(var i=0;i+length<=n;i++)visit(i,i+length);
  }
  if(r.disj.length>1)ranges(r.disj.length,function(a,b){
    if(b-a<2)return;
    var node={t:"rel",disj:r.disj.slice(a,b)};
    out.push({path:"or."+a+"."+b,kind:"or",from:a,to:b,cells:cells(a,b),node:node,source:relationSource(node)});
  });
  chunks.forEach(function(cs,d){ranges(cs.length,function(a,b){
    var node={t:"rel",disj:[joinComparisons(cs.slice(a,b))]};
    out.push({path:"and."+d+"."+a+"."+b,kind:"and",branch:d,from:a,to:b,cells:cs.slice(a,b).map(function(_,i){return d+":"+(a+i);}),node:node,source:relationSource(node)});
  });});
  return out;
}
function conditionOverlap(a,b) {return a.cells.some(function(cell){return b.cells.indexOf(cell)>=0;});}
function fragmentKey(src,kind) {
  if(kind==="expr")return expressionSource(parseExpr(src));
  return JSON.stringify(parseRelation(src).disj.map(function(d){
    return comparisonChunks(d).map(function(c){return {ops:c.ops,parts:c.parts.map(function(p){return expressionSource(p);})};});
  }));
}
function fragmentMatches(src,before,kind) {
  if(!String(before||"").trim())throw new ParseError("כתבו את החלק שרוצים לפשט כפי שהוא מופיע בשורת המקור.");
  var key=fragmentKey(before,kind),parts=kind==="expr"?relationParts(src):conditionParts(src);
  return parts.filter(function(p){return fragmentKey(p.source,kind)===key;});
}
function resolveFragment(src,edit,kind) {
  var parts=edit.before!==undefined?fragmentMatches(src,edit.before,kind):kind==="expr"?relationParts(src):conditionParts(src);
  if(edit.path!==undefined)parts=parts.filter(function(p){return p.path===edit.path;});
  if(!parts.length)throw new ParseError("החלק שכתבתם אינו נמצא במקום שנבחר בשורת המקור. כתבו אותו כפי שהוא מופיע בשורה, או בחרו אותו מחדש.");
  if(parts.length>1)throw new ParseError("החלק שכתבתם מופיע יותר מפעם אחת. בחרו איזה מופע לפשט.");
  return parts[0];
}
function conditionSignature(r,v) {
  var reduced=simplifyConditions({t:"rel",disj:r.disj.map(function(d){return {ops:d.ops,parts:d.parts.map(function(p){return simplifyAlgebra(p,{},false);})};})},v);
  var truth=relationTruth(reduced);if(truth!==null)return truth?"all":"empty";
  if(!reduced.disj.every(function(d){return comparisonChunks(d).every(function(c){return isolatedComparison(c,v);});}))return null;
  var valid=true,signature=reduced.disj.map(function(d){return {ops:d.ops,parts:d.parts.map(function(p){
    if(p.t==="var"&&p.n===v)return "variable";
    if(hasVar(p)||!isFinite(ev(p,{}))){valid=false;return null;}
    return ev(p,{});
  })};});
  return valid?JSON.stringify(signature):null;
}
function replaceConditionParts(src,edits,cfg) {
  if(!edits.length)throw new ParseError("בחרו תנאי או קבוצת תנאים וכתבו את הפישוט שלהם.");
  var original=parseRelation(src),selected=[];
  edits.forEach(function(edit){
    var part=resolveFragment(src,edit,"rel");
    if(selected.some(function(s){return conditionOverlap(s.part,part);}))throw new ParseError("בחרו חלקים שאינם חופפים.");
    var after=parseRelation(edit.after);
    if(!isRelation(after))throw new ParseError("כתבו תנאי עם סימן השוואה, או קבוצה של תנאים עם וגם / או.");
    if(Object.keys(varsOf(after)).some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("בהחלפה הופיע משתנה חדש.");
    var beforeScoped=inCase(part.node,cfg),afterScoped=inCase(after,cfg);
    var a=conditionSignature(beforeScoped,cfg.solve),b=conditionSignature(afterScoped,cfg.solve);
    var same=a!==null&&b!==null?a===b:relSets(beforeScoped,afterScoped,cfg.solve,cfg.vars.filter(function(v){return v!==cfg.solve;}),cfg.positive||[]).ok;
    if(!same)throw new ParseError("לתנאי שכתבתם אין אותה קבוצת פתרונות כמו לחלק שנבחר. בדקו גם את נקודות הקצה.");
    selected.push({part:part,after:after});
  });
  function alternatives(r){var truth=relationTruth(r);return truth===false?[]:truth===true?[[]]:r.disj.map(comparisonChunks);}
  var out=[];
  for(var d=0;d<original.disj.length;d++){
    var whole=selected.filter(function(s){return s.part.kind==="or"&&s.part.from===d;})[0];
    if(whole){out=out.concat(alternatives(whole.after));d=whole.part.to-1;continue;}
    var cs=comparisonChunks(original.disj[d]),branches=[[]];
    for(var i=0;i<cs.length;i++){
      var chosen=selected.filter(function(s){return s.part.kind==="and"&&s.part.branch===d&&s.part.from===i;})[0];
      var next=chosen?alternatives(chosen.after):[[cs[i]]],combined=[];
      branches.forEach(function(prefix){next.forEach(function(tail){combined.push(prefix.concat(tail));});});branches=combined;
      if(chosen)i=chosen.part.to-1;
      if(branches.length>32)throw new ParseError("ההחלפה יוצרת הרבה מקרים. כדאי להחליף פחות חלקים בכל צעד.");
    }
    out=out.concat(branches);
  }
  // Distributing OR inside AND is necessary to preserve grouping. Otherwise,
  // leave every unselected comparison exactly as the student wrote it.
  if(out.some(function(cs){return !cs.length;}))return relationSource(truthRelation(true));
  return relationSource(out.length?{t:"rel",disj:out.map(joinComparisons)}:truthRelation(false));
}
function overlappingParts(a,b) {return a===b||a.indexOf(b+".")===0||b.indexOf(a+".")===0;}
// Small, exact algebra rewrites. They do not solve the exercise, approximate
// irrational constants, or cancel a factor without retaining its domain.
function algebraNumber(v) {return v<0?{t:"neg",a:{t:"num",v:-v}}:{t:"num",v:v};}
function algebraBinary(t,a,b) {return {t:t,a:a,b:b};}
function algebraPolynomial(n) {
  if(n.t==="num"||n.t==="var")return true;
  if(n.t==="neg")return algebraPolynomial(n.a);
  if(["add","sub","mul"].indexOf(n.t)>=0)return algebraPolynomial(n.a)&&algebraPolynomial(n.b);
  if(n.t==="pow")return n.b.t==="num"&&Number.isInteger(n.b.v)&&n.b.v>=0&&algebraPolynomial(n.a);
  if(n.t==="div"){var q=exactFraction(n.b);return q&&q[0]!==0&&algebraPolynomial(n.a);}
  return false;
}
function fraction(p,q) {
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(q)||!q)return null;
  if(q<0){p=-p;q=-q;}
  var a=Math.abs(p),b=q;while(b){var r=a%b;a=b;b=r;}
  return [p/a,q/a];
}
function fractionOp(a,b,op) {
  if(!a||!b)return null;
  return op==="add"?fraction(a[0]*b[1]+b[0]*a[1],a[1]*b[1]):op==="mul"?fraction(a[0]*b[0],a[1]*b[1]):fraction(a[0]*b[1],a[1]*b[0]);
}
function exactFraction(n) {
  if(n.t==="num"){
    var s=String(n.v),places=(s.split(".")[1]||"").length;
    return /e/i.test(s)?(Number.isSafeInteger(n.v)?[n.v,1]:null):fraction(n.v*Math.pow(10,places),Math.pow(10,places));
  }
  var a=n.a&&exactFraction(n.a),b=n.b&&exactFraction(n.b);
  if(n.t==="neg")return a&&[-a[0],a[1]];
  if(n.t==="sub")return fractionOp(a,b&&[-b[0],b[1]],"add");
  if(["add","mul","div"].indexOf(n.t)>=0)return fractionOp(a,b,n.t);
  if(n.t==="pow"&&a&&b&&b[1]===1&&Math.abs(b[0])<=12){
    if(b[0]<0)a=[a[1],a[0]];
    return fraction(Math.pow(a[0],Math.abs(b[0])),Math.pow(a[1],Math.abs(b[0])));
  }
  return null;
}
function fractionNode(q) {return q[1]===1?algebraNumber(q[0]):algebraBinary("div",algebraNumber(q[0]),algebraNumber(q[1]));}
function comparisonChunks(d) {
  var chunks=[],start=0;
  d.ops.forEach(function(op,i){if(op==="and"){chunks.push({parts:d.parts.slice(start,i+1),ops:d.ops.slice(start,i)});start=i+1;}});
  chunks.push({parts:d.parts.slice(start),ops:d.ops.slice(start)});return chunks;
}
function joinComparisons(chunks) {
  var d={parts:[],ops:[]};chunks.forEach(function(c,i){if(i)d.ops.push("and");d.parts=d.parts.concat(c.parts);d.ops=d.ops.concat(c.ops);});return d;
}
function truthRelation(value) {return {t:"rel",disj:[{parts:[algebraNumber(0),algebraNumber(value?0:1)],ops:["="]}]};}
function relationTruth(r) {
  if(r.disj.length!==1)return null;
  var d=r.disj[0];
  return d.ops.length===1&&d.ops[0]==="="&&d.parts.every(function(n){return n.t==="num";})?d.parts[0].v===d.parts[1].v:null;
}
function comparisonCount(r) {return relationTruth(r)!==null?0:r.disj.reduce(function(s,d){return s+d.ops.filter(function(op){return op!=="and";}).length;},0);}
function relationSize(r) {return r.disj.reduce(function(s,d){return s+d.parts.reduce(function(s,p){return s+nodes(p);},0);},0);}
// Intersect/union explicit bounds, preserving their original exact expressions.
// This does not use the sampled solution-set solver or solve nonlinear equations.
function simplifyConditions(r,v) {
  var bounds=Object.create(null),full=[piece(-Infinity,Infinity,false,false)],zero=algebraNumber(0),variable={t:"var",n:v};
  function coefficient(n){
    if(n.t==="var"&&n.n===v)return [1,1];
    var a=n.a&&coefficient(n.a),b=n.b&&exactFraction(n.b);
    if(n.t==="neg")return a&&[-a[0],a[1]];
    if(n.t==="div"&&b&&b[0])return fractionOp(a,b,"div");
    if(n.t==="mul")return fractionOp(a,b,"mul")||fractionOp(exactFraction(n.a),coefficient(n.b),"mul");
    return null;
  }
  function simple(a,op,b){
    if(!hasVar(a)&&!hasVar(b)){
      var x=ev(a,{}),y=ev(b,{});if(!isFinite(x)||!isFinite(y))return null;
      return ({"<":x<y,"<=":x<=y,">":x>y,">=":x>=y,"=":x===y,"!=":x!==y})[op]?full:[];
    }
    if(hasVar(b)&&!hasVar(a)){var tmp=a;a=b;b=tmp;op=MIRROR[op];}
    if(hasVar(b))return null;
    if(!(a.t==="var"&&a.n===v)){
      var c=coefficient(a),q=exactFraction(b);
      if(!c||!c[0]||!q||q[0]!==0)return null;
      if(c[0]<0)op=MIRROR[op];b=zero;
    }
    var end=ev(b,{});
    if(!isFinite(end)){
      if(!(b.t==="inf"||b.t==="neg"&&b.a.t==="inf"))return null;
      return op==="!="||end===Infinity&&(op==="<"||op==="<=")||end===-Infinity&&(op===">"||op===">=")?full:[];
    }
    bounds[String(end)]=b;
    if(op==="=")return [piece(end,end,true,true)];
    if(op==="!=")return [piece(-Infinity,end,false,false),piece(end,Infinity,false,false)];
    return op==="<"||op==="<="?[piece(-Infinity,end,false,op==="<=")]:[piece(end,Infinity,op===">=",false)];
  }
  // No endpoint tolerances: a small interval or a single missing point matters.
  function union(ps){
    var out=[];ps.slice().sort(function(a,b){return a.a-b.a||b.ac-a.ac;}).forEach(function(p){
      if(!(p.a<p.b||p.a===p.b&&p.ac&&p.bc))return;
      var last=out[out.length-1];
      if(last&&(p.a<last.b||p.a===last.b&&(p.ac||last.bc))){
        if(p.b>last.b){last.b=p.b;last.bc=p.bc;}else if(p.b===last.b)last.bc=last.bc||p.bc;
        if(p.a===last.a)last.ac=last.ac||p.ac;
      }else out.push(piece(p.a,p.b,p.ac,p.bc));
    });return out;
  }
  function intersection(A,B){
    var out=[];A.forEach(function(p){B.forEach(function(q){
      var a=Math.max(p.a,q.a),b=Math.min(p.b,q.b),ac=(a!==p.a||p.ac)&&(a!==q.a||q.ac),bc=(b!==p.b||p.bc)&&(b!==q.b||q.bc);
      if(a<b||a===b&&ac&&bc)out.push(piece(a,b,ac,bc));
    });});return union(out);
  }
  function chains(S){
    if(S.length===2&&S[0].a===-Infinity&&S[1].b===Infinity&&S[0].b===S[1].a&&!S[0].bc&&!S[1].ac)
      return [{parts:[variable,bounds[String(S[0].b)]],ops:["!="]}];
    return S.map(function(p){
      var a=bounds[String(p.a)],b=bounds[String(p.b)];
      if(p.a===p.b)return {parts:[variable,a],ops:["="]};
      if(p.a===-Infinity&&p.b===Infinity)return truthRelation(true).disj[0];
      if(p.a===-Infinity)return {parts:[variable,b],ops:[p.bc?"<=":"<"]};
      if(p.b===Infinity)return {parts:[variable,a],ops:[p.ac?">=":">"]};
      return {parts:[a,variable,b],ops:[p.ac?"<=":"<",p.bc?"<=":"<"]};
    });
  }
  var mixed=[],complete=[];
  r.disj.forEach(function(d){
    var S=full,unknown=[],known=false;
    comparisonChunks(d).forEach(function(c){
      var local=full,ok=c.ops.length>0;
      c.ops.forEach(function(op,i){var s=simple(c.parts[i],op,c.parts[i+1]);if(s===null)ok=false;else local=intersection(local,s);});
      if(ok){known=true;S=intersection(S,local);}else unknown.push(c);
    });
    // A solved point can be checked against a guard such as 2x-3 >= 0.
    // Keep unsolved comparisons intact: this action intersects solutions,
    // rather than silently doing their algebra.
    if(S.length===1&&S[0].a===S[0].b&&unknown.length){
      var value=bounds[String(S[0].a)];
      function substitute(n){
        if(n.t==="var"&&n.n===v)return value;
        var out=Object.assign({},n);["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")out[k]=substitute(n[k]);});return out;
      }
      unknown=unknown.filter(function(c){
      if(c.ops.some(function(op,i){return !linearParts(algebraBinary("sub",c.parts[i],c.parts[i+1]),v);}))return true;
      var local=full,ok=c.ops.length>0;
      c.ops.forEach(function(op,i){var s=simple(substitute(c.parts[i]),op,substitute(c.parts[i+1]));if(s===null)ok=false;else local=intersection(local,s);});
      if(ok)S=intersection(S,local);return !ok;
    });}
    if(!S.length)return;
    if(!unknown.length)complete=complete.concat(S);
    else if(!known)mixed.push(d);
    else chains(S).forEach(function(c){mixed.push(joinComparisons((relationTruth({disj:[c]})===true?[]:[c]).concat(unknown)));});
  });
  complete=union(complete);
  if(complete.length===1&&complete[0].a===-Infinity&&complete[0].b===Infinity)return truthRelation(true);
  var out=mixed.concat(chains(complete));
  if(out.length>12)return r;
  return out.length?{t:"rel",disj:out}:truthRelation(false);
}
var SIGN_VALUES={">": [1],"<": [-1],"=": [0],"!=": [-1,1],">=": [0,1],"<=": [-1,0]};
function algebraFacts(d,cfg) {
  var facts=Object.create(null);
  (cfg.positive||[]).forEach(function(v){facts[v]=">";});
  if(cfg.assumption)d=joinComparisons(comparisonChunks(parseRelation(cfg.assumption).disj[0]).concat(comparisonChunks(d)));
  d.ops.forEach(function(op,i){
    if(op==="and")return;
    var a=d.parts[i],b=d.parts[i+1];
    if(exactFraction(a)&&ev(a,{})===0){var tmp=a;a=b;b=tmp;op=MIRROR[op];}
    var q=exactFraction(b);
    if(q&&q[0]===0&&SIGN_VALUES[op]){
      var key=expressionSource(a),old=facts[key];
      if(!old)facts[key]=op;
      else {
        var signs=SIGN_VALUES[old].filter(function(s){return SIGN_VALUES[op].indexOf(s)>=0;});
        var combined=Object.keys(SIGN_VALUES).filter(function(k){return SIGN_VALUES[k].join()===signs.join();})[0];
        if(combined)facts[key]=combined;
      }
    }
  });return facts;
}
function algebraNonzero(n,facts) {
  if(facts[expressionSource(n)])return SIGN_VALUES[facts[expressionSource(n)]].indexOf(0)<0;
  var q=exactFraction(n);if(q)return q[0]!==0;
  if(n.t==="pi"||n.t==="e")return true;
  if(n.t==="neg"||n.t==="fn"&&n.f==="abs")return algebraNonzero(n.a,facts);
  if(n.t==="mul"||n.t==="div")return algebraNonzero(n.a,facts)&&algebraNonzero(n.b,facts);
  if(n.t==="pow"){var power=exactFraction(n.b);return power&&power[1]===1&&algebraDefined(n.a,facts)&&algebraNonzero(n.a,facts);}
  return false;
}
function algebraDefined(n,facts) {
  if(facts[expressionSource(n)])return true;
  if(["num","var","pi","e"].indexOf(n.t)>=0)return true;
  if(n.t==="neg")return algebraDefined(n.a,facts);
  if(["add","sub","mul"].indexOf(n.t)>=0)return algebraDefined(n.a,facts)&&algebraDefined(n.b,facts);
  if(n.t==="div")return algebraDefined(n.a,facts)&&algebraDefined(n.b,facts)&&algebraNonzero(n.b,facts);
  if(n.t==="pow") {var q=exactFraction(n.b);return q&&q[1]===1&&q[0]>=0&&algebraDefined(n.a,facts);}
  if(n.t==="fn"&&["abs","sin","cos","cbrt","arctan"].indexOf(n.f)>=0)return algebraDefined(n.a,facts);
  return false;
}
function simplifyAlgebra(n,facts,expand) {
  function simp(n){
    var out=Object.assign({},n);
    ["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")out[k]=simp(n[k]);});
    var q=exactFraction(out);if(q)return fractionNode(q);
    if(out.t==="neg"&&out.a.t==="neg")return out.a.a;
    if(expand&&(out.t==="mul"||out.t==="div")){
      var scalar=exactFraction(out.b),sum=out.a;
      if(out.t==="mul"&&exactFraction(out.a)){scalar=exactFraction(out.a);sum=out.b;}
      if(scalar&&scalar[0]!==0&&(sum.t==="add"||sum.t==="sub"))
        return simp(algebraBinary(sum.t,algebraBinary(out.t,sum.a,fractionNode(scalar)),algebraBinary(out.t,sum.b,fractionNode(scalar))));
    }
    if(out.t==="mul"||out.t==="div"||out.t==="neg")return product(out);
    if(out.t==="add"||out.t==="sub")return sumTerms(out);
    if(out.t==="pow"&&exactFraction(out.b)&&ev(out.b,{})===1)return out.a;
    return out;
  }
  function product(n) {
    var coefficient=[1,1],factors=[],failed=false;
    function factor(n,den){
      var q=exactFraction(n);
      if(q&&(!den||q[0]!==0)){coefficient=fractionOp(coefficient,q,den?"div":"mul");if(!coefficient)failed=true;return;}
      if(n.t==="neg"){coefficient=fractionOp(coefficient,[-1,1],"mul");factor(n.a,den);return;}
      if(n.t==="mul"){factor(n.a,den);factor(n.b,den);return;}
      // Inverting a fraction must not erase the inner denominator's holes.
      if(n.t==="div"&&(!den||algebraNonzero(n.b,facts))){factor(n.a,den);factor(n.b,!den);return;}
      var power=n.t==="pow"&&exactFraction(n.b),count=power&&power[1]===1&&power[0]>0&&power[0]<=12?power[0]:1;
      if(count!==1)n=n.a;
      var key=expressionSource(n),f=factors.filter(function(f){return f.key===key;})[0];
      if(!f){f={key:key,node:n,top:0,bottom:0};factors.push(f);}f[den?"bottom":"top"]+=count;
    }
    factor(n,false);if(failed)return n;
    var top=[],bottom=[];
    factors.forEach(function(f){
      if(algebraDefined(f.node,facts)&&algebraNonzero(f.node,facts)){var common=Math.min(f.top,f.bottom);f.top-=common;f.bottom-=common;}
      function power(k){return k===1?f.node:algebraBinary("pow",f.node,algebraNumber(k));}
      if(f.top)top.push(power(f.top));if(f.bottom)bottom.push(power(f.bottom));
    });
    if(coefficient[0]===0&&top.concat(bottom).every(function(p){return algebraDefined(p,facts);})&&bottom.every(function(p){return algebraNonzero(p,facts);}))return algebraNumber(0);
    function times(list){return list.reduce(function(a,b){return a?algebraBinary("mul",a,b):b;},null)||algebraNumber(1);}
    if(Math.abs(coefficient[0])!==1||!top.length)top.unshift(algebraNumber(Math.abs(coefficient[0])));
    if(coefficient[1]!==1)bottom.unshift(algebraNumber(coefficient[1]));
    var out=times(top);if(bottom.length)out=algebraBinary("div",out,times(bottom));
    return coefficient[0]<0?{t:"neg",a:out}:out;
  }
  function sumTerms(n) {
    var terms=[],failed=false;
    function term(n,sign){
      if(n.t==="add"||n.t==="sub"){term(n.a,sign);term(n.b,n.t==="sub"?-sign:sign);return;}
      if(n.t==="neg"){term(n.a,-sign);return;}
      var q=exactFraction(n),base=null;
      if(!q){
        q=[1,1];base=n;
        if(n.t==="mul"&&exactFraction(n.a)){q=exactFraction(n.a);base=n.b;}
        else if(n.t==="div"&&exactFraction(n.b)&&ev(n.b,{})!==0){
          var num=n.a;
          q=fractionOp([1,1],exactFraction(n.b),"div");
          if(num.t==="mul"&&exactFraction(num.a)){q=fractionOp(q,exactFraction(num.a),"mul");num=num.b;}
          base=num;
        }
      }
      if(!q){failed=true;return;}q=[sign*q[0],q[1]];
      var key=base?expressionSource(base):"",t=terms.filter(function(t){return t.key===key;})[0];
      if(t){t.q=fractionOp(t.q,q,"add");if(!t.q)failed=true;}else terms.push({key:key,base:base,q:q});
    }
    term(n,1);if(failed)return n;
    terms.sort(function(a,b){return (a.base?0:1)-(b.base?0:1);});
    var out=null;
    terms.forEach(function(t){
      if(t.q[0]===0&&(!t.base||algebraDefined(t.base,facts)))return;
      var negative=t.q[0]<0,q=[Math.abs(t.q[0]),t.q[1]];
      var part=t.base?(q[0]===q[1]?t.base:product(algebraBinary("mul",fractionNode(q),t.base))):fractionNode(q);
      out=out?algebraBinary(negative?"sub":"add",out,part):negative?{t:"neg",a:part}:part;
    });return out||algebraNumber(0);
  }
  return simp(n);
}
// Apply only identities justified by fixed sign assumptions. In particular,
// an absolute value keeps its argument's domain when its bars are removed.
function absoluteInContext(n,facts) {
  if(facts[expressionSource(n)]==="=")return algebraNumber(0);
  var out=Object.assign({},n);
  ["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")out[k]=absoluteInContext(n[k],facts);});
  if(n.t==="fn"&&n.f==="abs"){
    var signs=algebraSigns(n.a,facts);
    if(signs.every(function(s){return s>=0;}))return out.a;
    if(signs.every(function(s){return s<=0;}))return {t:"neg",a:out.a};
  }
  return out;
}
function algebraCandidates(n,facts) {
  var original=expressionSource(n),seen=Object.create(null),out=[];
  [false,true].forEach(function(expand){
    var next=simplifyAlgebra(absoluteInContext(n,facts),facts,expand),source=expressionSource(next);
    if(source!==original&&!seen[source]){seen[source]=true;out.push({source:source,node:next,label:expand?"פתיחת סוגריים וכינוס איברים":"פישוט"});}
  });
  return out.sort(function(a,b){return nodes(a.node)-nodes(b.node)||a.source.length-b.source.length;});
}
function relationCandidates(src,cfg) {
  var original=parseRelation(src),raw=relationSource(original),seen=Object.create(null),out=[];
  function offer(next,label,logical){
    var source=relationSource(next);
    if(source!==raw&&!seen[source]&&judgeStep(original,next,null,cfg).ok){seen[source]=true;out.push({source:source,label:label,logical:!!logical,size:relationSize(next)});}
  }
  [false,true].forEach(function(expand){
    var next={t:"rel",disj:original.disj.map(function(d){var facts=algebraFacts(d,cfg);return {ops:d.ops.slice(),parts:d.parts.map(function(p){return simplifyAlgebra(p,facts,expand);})};})};
    var logical=simplifyConditions(next,cfg.solve);
    if(comparisonCount(logical)<comparisonCount(next)||relationSize(logical)<relationSize(next))offer(logical,"פישוט תנאים (חיתוך ואיחוד)",true);
    offer(next,expand?"פתיחת סוגריים וכינוס איברים":"לאחר פישוט",false);
  });
  out.sort(function(a,b){return a.size-b.size||a.source.length-b.source.length;});
  out.push({source:raw,label:out.length?"לפני פישוט":"הצעד"});return out;
}
function replaceRelationParts(src,edits,cfg) {
  if(!edits.length)throw new ParseError("בחרו ביטוי וכתבו במה להחליף אותו.");
  var result=parseRelation(src),paths=[];
  edits.forEach(function(edit){
    var part=resolveFragment(src,edit,"expr");
    if(paths.some(function(p){return overlappingParts(p,part.path);}))throw new ParseError("בחרו חלקים נפרדים שאינם מכילים זה את זה.");
    paths.push(part.path);
    var after=parseExpr(edit.after),vs=Object.keys(varsOf(after));
    if(vs.some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("בהחלפה הופיע משתנה חדש.");
    // Use the branch's fixed assumptions, never the equation being solved,
    // to justify removing bars. Then check the rewritten expressions normally.
    var facts=algebraFacts({parts:[],ops:[]},cfg),before=absoluteInContext(part.node,facts),checkedAfter=absoluteInContext(after,facts),vars=cfg.vars,positive=cfg.positive||[];
    var valid=compareExpr(before,checkedAfter,vars,positive).ok&&compareExpr(checkedAfter,before,vars,positive).ok;
    niceEnvs(vars,positive).forEach(function(env){
      var a=ev(before,env),b=ev(checkedAfter,env);
      if(isFinite(a)!==isFinite(b)||(isFinite(a)&&!close(a,b,1e-7)))valid=false;
    });
    if(!valid)throw new ParseError("ההחלפה של \\("+part.tex+"\\) אינה שומרת על אותו ערך ותחום הגדרה.");
    var path=part.path.split("."),d=+path.shift(),p=+path.shift(),node=result.disj[d].parts[p];
    if(!path.length)result.disj[d].parts[p]=after;
    else {for(var i=0;i<path.length-1;i++)node=node[path[i]];node[path[path.length-1]]=after;}
  });
  return relationSource(result);
}
function operateRelation(src,operation,value,cfg) {
  var result=parseRelation(src),operand,negative=false,flip=MIRROR;
  if(operation==="simplify")return relationSource(result);
  if(operation!=="swap") {
    operand=parseExpr(value);
    if(Object.keys(varsOf(operand)).some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("בפעולה הופיע משתנה חדש.");
    if(operation==="mul"||operation==="div") {
      if(hasVar(operand))return operateVariable(result,operation,operand,cfg);
      var v=ev(operand,{});
      if(!isFinite(v)||v===0)throw new ParseError("בחרו מספר מוגדר שאינו אפס.");
      negative=v<0;
    }
    if(["add","sub","mul","div"].indexOf(operation)<0)throw new ParseError("בחרו פעולה.");
  }
  result.disj=result.disj.map(function(d){
    if(operation==="swap"){d.parts.reverse();d.ops=d.ops.reverse().map(function(o){return flip[o];});}
    else {
      var chunks=comparisonChunks(d),hasUnsolved=chunks.some(function(c){return !branchGuard(c,cfg.solve);});
      d=joinComparisons(chunks.map(function(c){
        // Keep an already isolated case/domain condition while operating on the
        // equation or inequality being solved within that case.
        if(isCaseCondition(c,cfg)||chunks.length>1&&hasUnsolved&&branchGuard(c,cfg.solve))return c;
        return {parts:c.parts.map(function(p){return {t:operation,a:p,b:operand};}),ops:c.ops.map(function(op){return negative?flip[op]:op;})};
      }));
    }
    return d;
  });
  var verdict=judgeStep(parseRelation(src),result,null,cfg);
  if(!verdict.ok)throw new ParseError(verdict.msg);
  return relationSource(result);
}

function algebraSigns(n,facts) {
  var fact=facts[expressionSource(n)],q=exactFraction(n);
  if(fact)return SIGN_VALUES[fact].slice();
  if(q)return [Math.sign(q[0])];
  if(n.t==="pi"||n.t==="e")return [1];
  var a=n.a?algebraSigns(n.a,facts):[-1,0,1],b=n.b?algebraSigns(n.b,facts):[-1,0,1],out=[];
  function add(s){if(out.indexOf(s)<0)out.push(s);}
  if(n.t==="neg")return a.map(function(s){return -s;});
  if(n.t==="fn"&&n.f==="abs")return a.indexOf(0)<0?[1]:[0,1];
  if(n.t==="pow"&&(q=exactFraction(n.b))&&q[1]===1&&q[0]>0)return q[0]%2?a:a.indexOf(0)<0?[1]:[0,1];
  if(["mul","div","add","sub"].indexOf(n.t)>=0){
    a.forEach(function(x){b.forEach(function(y){
      if(n.t==="mul"||n.t==="div"){if(n.t!=="div"||y)add(x*y);}
      else {if(n.t==="sub")y=-y;if(!x||!y||x===y)add(Math.sign(x+y));else [-1,0,1].forEach(add);}
    });});return out;
  }
  return [-1,0,1];
}
function operateVariable(original,operation,operand,cfg) {
  operand=simplifyAlgebra(operand,algebraFacts({parts:[],ops:[]},cfg),true);
  if(!hasVar(operand))return operateRelation(relationSource(original),operation,expressionSource(operand),cfg);
  var key=expressionSource(operand),out=[];
  // A newly introduced undefined factor cannot be covered by positive/negative/zero
  // cases. Accept it only when the existing conditions guarantee its domain.
  function containsFactor(n){
    return expressionSource(n)===key||n.t==="neg"&&containsFactor(n.a)||n.t==="mul"&&(containsFactor(n.a)||containsFactor(n.b))||n.t==="pow"&&exactFraction(n.b)&&ev(n.b,{})>0&&containsFactor(n.a);
  }
  function needsNonzero(n){
    return n.t==="div"&&containsFactor(n.b)||["a","b","n","base"].some(function(k){return n[k]&&typeof n[k]==="object"&&needsNonzero(n[k]);});
  }
  original.disj.forEach(function(d){
    var facts=algebraFacts(d,cfg),signs=algebraSigns(operand,facts),chunks=comparisonChunks(d);
    if(cfg.explicitCases&&(signs.indexOf(0)>=0||isIneq(d.ops)&&signs.length!==1))throw new ParseError("כדי "+(operation==="div"?"לחלק":"לכפול")+" ב־\\("+tex(operand)+"\\), צריך לדעת שהוא אינו אפס, ובאי־שוויון גם לדעת את סימנו. תנאי עם ≥ או ≤ אינו מספיק: טפלו במקרה האפס או נמקו מדוע הוא אינו רלוונטי.");
    if(signs.length===1&&signs[0]===0)throw new ParseError(operation==="div"?"במקרה הזה הביטוי שווה לאפס; אי אפשר לחלק בו.":"במקרה הזה הביטוי שווה לאפס; כפל באפס אינו צעד שקול.");
    if(!algebraDefined(operand,facts))throw new ParseError("לביטוי הזה יש תחום הגדרה משלו. כתבו קודם את תנאי התחום, או בחרו ביטוי שמוגדר לכל מספר ממשי.");
    var zeroImpossible=d.parts.some(needsNonzero);
    if(operand.t==="var"&&cfg.vars.length===1){var env={};env[operand.n]=0;if(!chainHolds(d,env))zeroImpossible=true;}
    function guard(sign){
      var n=operand,op=sign>0?">":sign<0?"<":"=",power=n.t==="pow"&&exactFraction(n.b);
      // Express the boundary itself, not an even power of its distance from zero;
      // otherwise the numerical checker's tolerance can create a spurious gap.
      if(n.t==="fn"&&n.f==="abs"||power&&power[1]===1&&power[0]>0&&power[0]%2===0){n=n.a;op=sign?"!=":"=";}
      else if(power&&power[1]===1&&power[0]>0)n=n.a;
      return {parts:[n,algebraNumber(0)],ops:[op]};
    }
    function isGuard(c){
      if(c.parts.length!==2)return false;
      return expressionSource(c.parts[0])===key&&exactFraction(c.parts[1])&&ev(c.parts[1],{})===0||expressionSource(c.parts[1])===key&&exactFraction(c.parts[0])&&ev(c.parts[0],{})===0;
    }
    if(cfg.explicitCases&&!isIneq(d.ops)&&signs.indexOf(0)<0){
      out.push(joinComparisons(chunks.map(function(c){return isCaseCondition(c,cfg)||isGuard(c)?c:{parts:c.parts.map(function(p){return algebraBinary(operation,p,operand);}),ops:c.ops.slice()};})));return;
    }
    [1,-1,0].forEach(function(sign){
      if(signs.indexOf(sign)<0||sign===0&&zeroImpossible)return;
      if(sign===0){out.push(joinComparisons([guard(0)].concat(chunks)));return;}
      var transformed=chunks.map(function(c){
        if(isCaseCondition(c,cfg)||isGuard(c))return c;
        return {parts:c.parts.map(function(p){return algebraBinary(operation,p,operand);}),ops:c.ops.map(function(op){return sign<0?MIRROR[op]:op;})};
      });
      if(signs.length>1)transformed.unshift(guard(sign));
      out.push(joinComparisons(transformed));
    });
  });
  if(out.length>12)throw new ParseError("הפעולה יוצרת הרבה מקרים. כדאי לפשט או לטפל בכל מקרה בנפרד.");
  var next={t:"rel",disj:out},verdict=judgeStep(original,next,null,cfg);
  if(!verdict.ok)throw new ParseError(verdict.msg);
  return relationSource(next);
}

function absoluteParts(src){return relationParts(src).filter(function(p){return p.node.t==="fn"&&p.node.f==="abs";});}
function selectedAbsolute(src,selection){
  var parts=absoluteParts(src),part;
  if(selection&&selection.path!==undefined){
    part=parts.filter(function(p){return p.path===selection.path;})[0];
    if(!part||selection.expression&&part.source!==selection.expression)throw new ParseError("הערך המוחלט שנבחר השתנה. בחרו מחדש איזה ערך מוחלט לפרק.");
  }else if(parts.length===1)part=parts[0];
  else if(parts.length>1)throw new ParseError("בחרו איזה ערך מוחלט לפרק.");
  if(!part)throw new ParseError("אין בשורה ערך מוחלט לפירוק.");
  return part;
}
function expandAbsolute(src,selection,cfg) {
  var part=selectedAbsolute(src,selection),r=parseRelation(src),path=part.path.split("."),di=+path.shift(),pi=+path.shift();
  var d=r.disj[di],E=part.node.a;
  // Preserve the familiar distance rule for an isolated absolute value.
  if(r.disj.length===1&&d.parts.length===2&&!path.length&&!hasVar(d.parts[1-pi])&&!hasAbs(d.parts[1-pi]))return expandIsolatedAbsolute(src);
  var facts=algebraFacts(d,cfg||{positive:[]}),signs=algebraSigns(E,facts),zero=algebraNumber(0),cases=[];
  if(signs.every(function(s){return s>=0;}))cases=[{op:">=",replacement:E}];
  else if(signs.every(function(s){return s<=0;}))cases=[{op:"<=",replacement:{t:"neg",a:E}}];
  else cases=[{op:">=",replacement:E},{op:"<",replacement:{t:"neg",a:E}}];
  var out=[];
  r.disj.forEach(function(original,i){
    if(i!==di){out.push(original);return;}
    cases.forEach(function(c){
      var branch=JSON.parse(JSON.stringify(original)),node=branch.parts[pi];
      if(!path.length)branch.parts[pi]=c.replacement;
      else{for(var j=0;j<path.length-1;j++)node=node[path[j]];node[path[path.length-1]]=c.replacement;}
      if(cases.length>1)branch=joinComparisons([{parts:[E,zero],ops:[c.op]}].concat(comparisonChunks(branch)));
      out.push(branch);
    });
  });
  if(out.length>12)throw new ParseError("הפעולה יוצרת הרבה מקרים. כדאי לעבוד על מקרה אחד בנפרד.");
  return {source:relationSource({t:"rel",disj:out}),
    note:cases.length>1?"מפצלים לפי סימן הביטוי שבתוך הערך המוחלט שנבחר. כשהוא לא שלילי, מורידים את הסימנים; כשהוא שלילי, מחליפים בביטוי הנגדי. שאר הערכים המוחלטים נשארים כפי שהם.":"התנאי במקרה הזה קובע את הסימן, ולכן אפשר להסיר את סימני הערך המוחלט שנבחר.",
    cases:cases.map(function(c){return {condition:relationSource({disj:[{parts:[E,zero],ops:[c.op]}]}),replacement:tex(part.node)+" = "+tex(c.replacement)};})};
}
function expandIsolatedAbsolute(src) {
  var relation=parseRelation(src),d=relation.disj[0];
  function absolute(n){return n.t==="fn"&&n.f==="abs";}
  if(relation.disj.length!==1||d.parts.length!==2)throw new ParseError("קודם בודדו ערך מוחלט באחד האגפים, מול מספר קבוע.");
  if(!absolute(d.parts[0]))d=reverseChain(d);
  var n=d.parts[0],c=d.parts[1],op=d.ops[0];
  if(!absolute(n)||hasVar(c))throw new ParseError("קודם בודדו ערך מוחלט באחד האגפים, מול מספר קבוע.");
  var value=ev(c,{}),E=n.a;
  if(!isFinite(value))throw new ParseError("המספר שמול הערך המוחלט צריך להיות מוגדר.");
  if(value<0||value===0&&(op==="<"||op===">=")){
    var all=op===">"||op===">="||op==="!=";
    return {source:null,note:all?"כל ערך שעבורו הביטוי מוגדר הוא פתרון: ערך מוחלט אינו שלילי.":"אין פתרונות: ערך מוחלט אינו שלילי."};
  }
  var negc=value===0?{t:"num",v:0}:{t:"neg",a:c},out,note;
  function math(node){return "\\("+tex(node)+"\\)";}
  var inside=math(E),bound=math(c),lower=math(negc);
  function chain(parts,ops){return {parts:parts,ops:ops};}
  if(value===0&&(op==="="||op==="<=")){
    out=[chain([E,c],["="])];
    note="ערך מוחלט אינו שלילי, והוא שווה לאפס רק כשהביטוי שבתוכו שווה לאפס. לכן כאן משווים את "+inside+" לאפס.";
  }else if(op==="<"||op==="<="){
    out=[chain([negc,E,c],[op,op])];
    note="המרחק של "+inside+" מאפס צריך להיות "+(op==="<"?"קטן מ־":"לכל היותר ")+bound+". לכן הביטוי צריך להיות בין "+lower+" ל־"+bound+(op==="<="?", כולל הקצוות":" בלי הקצוות")+". שני הגבולות צריכים להתקיים יחד (וגם).";
  }else if(op==="!="){
    out=value===0?[chain([E,c],["!="])]:[chain([E,negc],["<"]),chain([negc,E,c],["<","<"]),chain([E,c],[">"])];
    note=value===0?"ערך מוחלט שונה מאפס בדיוק כשהביטוי שבתוכו שונה מאפס. כאן דורשים ש־"+inside+" יהיה שונה מאפס.":"הביטוי "+inside+" יכול לקבל כל ערך חוץ מ־"+lower+" ומ־"+bound+": אפשר להיות משמאל לשניהם, ביניהם או מימין לשניהם.";
  }else {
    out=[chain([E,c],[op]),chain([E,negc],[MIRROR[op]])];
    if(op==="=")note="המרחק של "+inside+" מאפס צריך להיות "+bound+". לכן הביטוי יכול להיות "+bound+" או "+lower+". פותרים כל אפשרות בנפרד; מספיק שאחת מהן תתקיים.";
    else if(value===0)note="ערך מוחלט גדול מאפס כשהביטוי שבתוכו אינו אפס. לכן "+inside+" יכול להיות חיובי או שלילי.";
    else note="המרחק של "+inside+" מאפס צריך להיות "+(op===">"?"גדול מ־":"לפחות ")+bound+". לכן הביטוי צריך להיות "+(op===">"?"קטן מ־"+lower+" או גדול מ־"+bound:"קטן או שווה ל־"+lower+" או גדול או שווה ל־"+bound)+". מספיק שתתקיים אחת האפשרויות (או).";
  }
  return {source:relationSource({disj:out}),rule:texChain(d)+" \\iff "+out.map(texChain).join(" \\quad\\text{או}\\quad "),note:note};
}

// A justification is an executable list of operations, never a trusted label
// or a stored expected answer. Rebuild its result from the current source.
var ACTION_NAMES={sub:"חיסור",add:"חיבור",mul:"כפל",div:"חילוק",simplify:"פישוט האגפים",swap:"החלפת אגפים",abs:"פירוק ערך מוחלט",conditions:"חיתוך ואיחוד תנאים",replace:"החלפת ביטויים שווים",conditionReplace:"פישוט התנאים שנבחרו",sqrt:"הוצאת שורש ריבועי (שני הסימנים)",cbrt:"הוצאת שורש שלישי",cube:"העלאה בחזקה שלישית",zero:"מכפלה שווה לאפס",formula:"נוסחת השורשים",log:"לוגריתם בבסיס",exp:"העלאת הבסיס בחזקת האגפים",partition:"חלוקה למקרים",cases:"עבודה בכל מקרה בנפרד",merge:"איחוד המקרים"};
function actionOperand(value){var n=parseExpr(value),q=exactFraction(n);return q?fractionNode(q):n;}
function actionReason(actions,options){
  options=options||{};var source=options.source&&parseRelation(options.source);
  return (actions||[]).map(function(a){
    if(a.op==="cases")return a.branches.map(function(p,i){return "מקרה "+(i+1)+": "+(actionReason(p,Object.assign({},options,{source:source&&source.disj[i]?relationSource({t:"rel",disj:[source.disj[i]]}):null}))||"ללא שינוי");}).join("; ");
    var sides=source&&source.disj.some(function(d){return comparisonChunks(d).some(function(c){return c.parts.length>2;});})?"כל האגפים":"שני האגפים";
    var n=a.value?actionOperand(a.value):null,value=n?(options.math?"\\("+tex(n)+"\\)":expressionSource(n)):"",reason;
    if(a.op==="sub")reason="חיסור "+value+" מ"+sides;
    else if(a.op==="add")reason="חיבור "+value+" ל"+sides;
    else if(a.op==="mul"||a.op==="div"){
      reason=(a.op==="mul"?"כפל ":"חילוק ")+sides+" ב־"+value;
      if(source&&source.disj.some(function(d){return d.ops.some(function(op){return ["<",">","<=",">="].indexOf(op)>=0;});})){
        var signs=source.disj.map(function(d){return algebraSigns(n,algebraFacts(d,options.cfg||{positive:[]}));});
        if(signs.every(function(s){return s.length===1&&s[0]===-1;}))reason+=", והיפוך כיוון האי־שוויון";
        else if(signs.some(function(s){return s.length!==1||s[0]!==1;}))reason+=", לפי סימן הביטוי";
      }
    }else if(a.op==="log")reason="הפעלת לוגריתם בבסיס "+value+" על "+sides;
    else if(a.op==="exp")reason="העלאת "+value+" בחזקת כל אחד מהאגפים";
    else reason=ACTION_NAMES[a.op]||"";
    if(a.op==="abs"&&source)try{var selected=selectedAbsolute(relationSource(source),a);reason+=" "+(options.math?"\\("+selected.tex+"\\)":selected.source);}catch(_){}
    if(a.op==="conditionReplace")reason+=". "+(a.edits||[]).map(function(edit){
      var before=edit.before;
      if(!before&&source)try{before=resolveFragment(relationSource(source),edit,"rel").source;}catch(_){}
      var label=before?(options.math?htmlRel(parseRelation(before)):before)+": ":"";
      return label+(edit.reason==="denominator"?"אין פתרונות במקרה הזה — המכנה "+(options.math?"\\("+tex(parseExpr(edit.value))+"\\)":edit.value)+" מתאפס":"חיתוך ואיחוד התנאים");
    }).join("; ");
    if(a.op==="partition")reason+=". "+(a.split.conditions||[]).map(function(condition,i){
      var excluded=(a.split.excluded||[])[i];
      return htmlRel(parseRelation(condition))+(excluded?" — לא רלוונטי: "+(excluded.reason==="denominator"?"המכנה \\("+tex(parseExpr(excluded.value))+"\\) מתאפס":"סותר את התנאי "+htmlRel(parseRelation(excluded.value))):"");
    }).join("; ");
    if(options.decorate)reason=options.decorate(a,reason,source);
    // An absolute-value inequality can introduce a three-sided comparison.
    if(a.op==="abs"&&source)try{var expanded=expandAbsolute(relationSource(source),a,options.cfg);if(expanded.source)source=parseRelation(expanded.source);}catch(_){}
    return reason;
  }).join(options.separator===undefined?"; ":options.separator);
}
function simplifiedRelation(r,cfg){return {t:"rel",disj:r.disj.map(function(d){var facts=algebraFacts(d,cfg);return {ops:d.ops.slice(),parts:d.parts.map(function(p){return simplifyAlgebra(p,facts,true);})};})};}
// Case assumptions are fixed context, not another equation to transform or a
// condition students must copy onto every line. Reattach them for validation
// and merging; remove only duplicate comparisons, never solve a condition here.
function inCase(r,cfg){
  if(!cfg.assumption||relationTruth(r)===false)return r;
  var assumption=parseRelation(cfg.assumption),guards=comparisonChunks(assumption.disj[0]);
  if(relationTruth(r)===true)return assumption;
  return {t:"rel",disj:r.disj.map(function(d){
    var chunks=guards.slice();comparisonChunks(d).forEach(function(c){
      if(!chunks.some(function(g){return chainSame(g,c,cfg.vars,cfg.positive||[]);}))chunks.push(c);
    });return joinComparisons(chunks);
  })};
}
function isCaseCondition(c,cfg){
  return !!cfg.assumption&&comparisonChunks(parseRelation(cfg.assumption).disj[0]).some(function(g){return chainSame(g,c,cfg.vars,cfg.positive||[]);});
}
function caseConfig(c,cfg){
  return c.condition?Object.assign({},cfg,{assumption:relationSource(inCase(parseRelation(c.condition),cfg))}):cfg;
}
function justifiedShape(expected,actual,cfg){
  // Compare corresponding expressions, not solution sets. AND/OR order and
  // a<b<c versus a<b AND b<c are merely notation; changing a side is not.
  function edges(d){var facts=algebraFacts(d,cfg),out=[];d.ops.forEach(function(op,i){if(op!=="and")out.push({parts:[simplifyAlgebra(d.parts[i],facts,true),simplifyAlgebra(d.parts[i+1],facts,true)],ops:[op]});});return out;}
  function matching(as,bs,equal){var used=[];return as.length===bs.length&&as.every(function(a){for(var i=0;i<bs.length;i++)if(!used[i]&&equal(a,bs[i])){used[i]=true;return true;}return false;});}
  return matching(expected.disj,actual.disj,function(a,b){return matching(edges(a),edges(b),function(x,y){return chainSame(x,y,cfg.vars,cfg.positive||[]);});});
}
function linearParts(n,v){
  var zero=algebraNumber(0),one=algebraNumber(1),bin=algebraBinary;
  if(!hasVar(n,v))return {a:zero,b:n};
  if(n.t==="var"&&n.n===v)return {a:one,b:zero};
  var a=n.a&&linearParts(n.a,v),b=n.b&&linearParts(n.b,v);
  if(n.t==="neg"&&a)return {a:{t:"neg",a:a.a},b:{t:"neg",a:a.b}};
  if((n.t==="add"||n.t==="sub")&&a&&b)return {a:bin(n.t,a.a,b.a),b:bin(n.t,a.b,b.b)};
  if(n.t==="mul"&&a&&b){if(isZeroConst(a.a))return {a:bin("mul",a.b,b.a),b:bin("mul",a.b,b.b)};if(isZeroConst(b.a))return {a:bin("mul",a.a,b.b),b:bin("mul",a.b,b.b)};}
  if(n.t==="div"&&a&&!hasVar(n.b,v))return {a:bin("div",a.a,n.b),b:bin("div",a.b,n.b)};
  return null;
}
function linearPlan(src,cfg){
  var r=parseRelation(src),chunks=comparisonChunks(r.disj[0]),c=chunks.filter(function(c){return !isolatedComparison(c,cfg.solve);})[0]||chunks[0];
  if(c.parts.length!==2)return [];
  if(!hasVar(c.parts[0],cfg.solve)&&hasVar(c.parts[1],cfg.solve))c=reverseChain(c);
  var l=linearParts(c.parts[0],cfg.solve),right=linearParts(c.parts[1],cfg.solve);if(!l||!right)return [];
  var facts=algebraFacts(r.disj[0],cfg),simp=function(n){return simplifyAlgebra(n,facts,true);},plan=[];
  var a=simp(algebraBinary("sub",l.a,right.a)),b=simp(l.b),rightA=simp(right.a);
  if(isZeroConst(a))return [];
  if(!isZeroConst(rightA))plan.push({op:"sub",value:expressionSource(simp(algebraBinary("mul",rightA,{t:"var",n:cfg.solve})))});
  if(!isZeroConst(b))plan.push({op:"sub",value:expressionSource(b)});
  if(!exprSame(a,algebraNumber(1),cfg.vars,cfg.positive||[]))plan.push({op:"div",value:expressionSource(a)});
  return plan;
}
function executeAction(src,a,cfg){
  if(!a||!ACTION_NAMES[a.op])throw new ParseError("בחרו נימוק שמסביר את המעבר.");
  if(["add","sub","mul","div","swap"].indexOf(a.op)>=0)return operateRelation(src,a.op,a.value||"",cfg);
  var r=parseRelation(src),out;
  if(a.op==="partition"){
    var partition=splitRelationCases(src,a.split||{},cfg).filter(function(c){return !c.excluded;});
    return relationSource(partition.length?{t:"rel",disj:partition.reduce(function(all,c){return all.concat(parseRelation(c.source).disj);},[])}:truthRelation(false));
  }
  if(a.op==="simplify")return relationSource(simplifiedRelation(r,cfg));
  if(a.op==="conditions")return relationSource(simplifyConditions(inCase(simplifiedRelation(r,cfg),cfg),cfg.solve));
  if(a.op==="replace")return replaceRelationParts(src,a.edits||[],cfg);
  if(a.op==="conditionReplace"){
    (a.edits||[]).forEach(function(edit){
      var part=resolveFragment(src,edit,"rel"),expected;
      if(edit.reason==="denominator"){
        // Use only the selected fragment and fixed case assumptions. An OR
        // sibling must never supply the reason for discarding another case.
        part.node.disj.forEach(function(d){
          var branch={t:"rel",disj:[d]};
          checkExcludedCase(branch,inCase(branch,cfg),{reason:"denominator",value:edit.value},cfg);
        });
        expected="∅";
      }else {
        if(edit.reason&&edit.reason!=="conditions")throw new ParseError("בחרו נימוק מתאים לפישוט.");
        expected=executeAction(part.source,{op:"conditions"},cfg);
      }
      if(!justifiedShape(parseRelation(expected),parseRelation(edit.after),cfg))throw new ParseError("הנימוק אינו מתאים לפישוט שנכתב. צפוי: "+htmlRel(parseRelation(expected))+"; התקבל: "+htmlRel(parseRelation(edit.after))+".");
    });
    return replaceConditionParts(src,a.edits||[],cfg);
  }
  if(a.op==="cases"){
    if(!a.branches||a.branches.length!==r.disj.length)throw new ParseError("יש להצדיק את העבודה בכל המקרים.");
    out=[];r.disj.forEach(function(d,i){var s=relationSource({t:"rel",disj:[d]});(a.branches[i]||[]).forEach(function(step){var next=executeAction(s,step,cfg);if(!relSets(inCase(parseRelation(s),cfg),inCase(parseRelation(next),cfg),cfg.solve,cfg.vars.filter(function(v){return v!==cfg.solve;}),cfg.positive||[]).ok)throw new ParseError("הפעולה אינה תקפה במקרה "+(i+1)+".");s=next;});out=out.concat(parseRelation(s).disj);});
    return relationSource({t:"rel",disj:out});
  }
  if(a.op==="merge"){
    var cases=splitRelationCases(src,a.split||{},cfg);
    if(!a.branches||a.branches.length!==cases.length)throw new ParseError("אי אפשר לאחד לפני שכל המקרים נבדקו.");
    out=[];cases.forEach(function(c,i){var branch=a.branches[i],branchCfg=Object.assign({},caseConfig(c,cfg),{requireJustification:true}),start=c.work||c.source;
      if(c.excluded)return;
      if(cfg.explicitCases&&branch.closed!==true)throw new ParseError("מקרה "+(i+1)+" עדיין פתוח. לחצו על סיום המקרה לאחר בדיקת הצעדים.");
      var checked=checkWorking(start,branch.lines||[],branchCfg,start,branch.justifications||[]);
      var failure=checked.results.filter(function(v){return !v.ok;})[0];
      if(failure)throw new ParseError("תקנו קודם את הצעדים במקרה "+(i+1)+". "+failure.msg);
      var last=parseRelation(branch.lines.length?branch.lines[branch.lines.length-1]:start),scoped=inCase(last,branchCfg);
      var finalActions=(branch.justifications||[])[branch.lines.length-1]||[];
      // Merging takes the union; it does not also perform the student's
      // intersections. Do not reintroduce a redundant guard if the last
      // justified step already simplified the full case explicitly.
      if(finalActions.some(function(a){return a.op==="conditions";})&&justifiedShape(simplifyConditions(scoped,cfg.solve),last,branchCfg))scoped=last;
      if(relationTruth(scoped)!==false)out=out.concat(scoped.disj);
    });return relationSource(out.length?{t:"rel",disj:out}:truthRelation(false));
  }
  if(a.op==="abs"){
    var abs=expandAbsolute(src,a,cfg);if(abs.source!==null)return abs.source;
    if(abs.note.indexOf("אין פתרונות")===0)return "∅";
    throw new ParseError(abs.note+" יש לשמור גם את תחום ההגדרה.");
  }
  if(a.op==="zero"){
    if(r.disj.length!==1||r.disj[0].parts.length!==2||r.disj[0].ops[0]!=="=")throw new ParseError("הכלל חל על מכפלה השווה לאפס.");
    var d=r.disj[0],p=isZeroConst(d.parts[1])?d.parts[0]:isZeroConst(d.parts[0])?d.parts[1]:null;
    if(!p||["mul","pow","neg"].indexOf(p.t)<0)throw new ParseError("כתבו קודם מכפלה השווה לאפס.");
    var factors=factorsOf(p,[]).filter(function(f){return hasVar(f,cfg.solve);});
    if(!factors.length)throw new ParseError("לא נמצאו גורמים עם הנעלם.");
    return relationSource({t:"rel",disj:factors.map(function(f){return {parts:[f,algebraNumber(0)],ops:["="]};})});
  }
  if(a.op==="formula"){
    if(r.disj.length!==1||r.disj[0].parts.length!==2||r.disj[0].ops[0]!=="=")throw new ParseError("נוסחת השורשים חלה על משוואה ריבועית.");
    var d=r.disj[0],p=algebraBinary("sub",d.parts[0],d.parts[1]),env={},values=[0,1,-1].map(function(x){env[cfg.solve]=x;return ev(p,env);});
    var c=values[0],b=(values[1]-values[2])/2,coef=(values[1]+values[2])/2-c;
    var polynomial=parseExpr("("+coef+")*"+cfg.solve+"^2+("+b+")*"+cfg.solve+"+("+c+")");
    if(!coef||!isFinite(coef)||!algebraPolynomial(p)||!exprSame(p,polynomial,cfg.vars,cfg.positive||[]))throw new ParseError("נוסחת השורשים חלה רק על משוואה ריבועית עם מקדמים מספריים.");
    var discriminant=b*b-4*coef*c;if(discriminant<0)return "∅";
    return cfg.solve+" = (-("+b+")+sqrt("+discriminant+"))/(2*("+coef+"))"+(discriminant?" או "+cfg.solve+" = (-("+b+")-sqrt("+discriminant+"))/(2*("+coef+"))":"");
  }
  if(a.op==="sqrt"){
    if(r.disj.length!==1||r.disj[0].parts.length!==2)throw new ParseError("בודדו תחילה ריבוע מול מספר קבוע.");
    var d=r.disj[0];if(d.parts[0].t!=="pow")d=reverseChain(d);
    var p=d.parts[0],c=d.parts[1];
    if(p.t!=="pow"||!exactFraction(p.b)||ev(p.b,{})!==2||hasVar(c)||!isFinite(ev(c,{})))throw new ParseError("בודדו תחילה ריבוע מול מספר קבוע.");
    if(ev(c,{})<0){if(["=","<","<="].indexOf(d.ops[0])>=0)return "∅";throw new ParseError("הריבוע אינו שלילי; בדקו את תחום ההגדרה.");}
    return expandAbsolute("abs("+expressionSource(p.a)+") "+d.ops[0]+" sqrt("+expressionSource(c)+")").source;
  }
  var base;
  if(a.op==="log"||a.op==="exp"){
    base=parseExpr(a.value||"");var value=ev(base,{});
    if(hasVar(base)||!isFinite(value)||value<=0||value===1)throw new ParseError("הבסיס צריך להיות חיובי ושונה מאחת.");
  }
  out={t:"rel",disj:r.disj.map(function(d){return {ops:d.ops.map(function(op){return base&&ev(base,{})<1&&op!=="and"?MIRROR[op]:op;}),parts:d.parts.map(function(p){
    if(a.op==="cbrt")return {t:"fn",f:"cbrt",a:p};
    if(a.op==="cube")return {t:"pow",a:p,b:algebraNumber(3)};
    if(a.op==="log")return {t:"fn",f:"log",base:base,a:p};
    if(a.op==="exp")return {t:"pow",a:base,b:p};
    throw new ParseError("בחרו נימוק מתאים.");
  })};})};
  return relationSource(out);
}
function checkJustifiedStep(src,next,actions,cfg){
  if(!actions||!actions.length)return {ok:false,msg:"בחרו נימוק לצעד. אפשר לצרף כמה פעולות לפי הסדר."};
  var expected=src;
  try{
    actions.forEach(function(a){var before=expected;expected=executeAction(expected,a,cfg);
      var verdict=relSets(inCase(parseRelation(before),cfg),inCase(parseRelation(expected),cfg),cfg.solve,cfg.vars.filter(function(v){return v!==cfg.solve;}),cfg.positive||[]);
      if(!verdict.ok)throw new ParseError("הפעולה אינה שומרת על הפתרונות או על תחום ההגדרה. בדקו את התנאים להפעלתה.");
    });
    var got=parseRelation(next),want=parseRelation(expected);
    if(!isRelation(got)||Object.keys(varsOf(got)).some(function(v){return cfg.vars.indexOf(v)<0;}))throw new ParseError("כתבו תנאי עם המשתנים של התרגיל.");
    if(!justifiedShape(inCase(want,cfg),inCase(got,cfg),cfg))return {ok:false,expected:relationSource(simplifiedRelation(want,cfg)),got:relationSource(got),msg:"הנימוק אינו מתאים לשורה שכתבתם. לפי הפעולות שנבחרו צפוי: "+htmlRel(simplifiedRelation(want,cfg))+". התקבל: "+htmlRel(got)+"."};
    var v=judgeStep(parseRelation(src),got,null,cfg);if(!v.ok)return v;
    v.reason=actionReason(actions,{source:src,cfg:cfg});return v;
  }catch(e){return {ok:false,msg:errMsg(e),expected:expected,got:next};}
}
function inferJustification(src,next,cfg,depth){
  depth=depth===undefined?3:depth;var r=parseRelation(src),target=parseRelation(next);
  function valid(plan){return checkJustifiedStep(src,next,plan,cfg).ok?plan:null;}
  var simple=valid([{op:"simplify"}]);if(simple)return simple;
  var actions=[{op:"conditions"},{op:"abs"},{op:"zero"},{op:"sqrt"},{op:"cbrt"},{op:"cube"},{op:"formula"}],linear=linearPlan(src,cfg);
  var classification=classifyStep(r,target,cfg.vars,cfg.positive||[],cfg.solve);
  if(classification.kind==="mulpos"||classification.kind==="mulneg"){
    var coefficient=classification.c,literal=String(coefficient);
    for(var denominator=1;denominator<=100;denominator++)if(Math.abs(coefficient*denominator-Math.round(coefficient*denominator))<1e-10){literal=expressionSource(fractionNode(fraction(Math.round(coefficient*denominator),denominator)));break;}
    var factor=exactFraction(parseExpr(literal));
    actions.unshift(factor&&Math.abs(factor[0])===1&&factor[1]>1?{op:"div",value:String(factor[1]/factor[0])}:{op:"mul",value:literal});
  }
  relationParts(src).forEach(function(p){if(p.node.t==="div"&&hasVar(p.node.b))actions.push({op:"mul",value:expressionSource(p.node.b)});});
  r.disj.forEach(function(d){d.parts.forEach(function(p){if(p.t==="pow"&&!hasVar(p.a))actions.push({op:"log",value:expressionSource(p.a)});if(p.t==="fn"&&p.f==="log")actions.push({op:"exp",value:expressionSource(p.base||algebraNumber(10))});});});
  if(r.disj.length===target.disj.length){
    var cs=comparisonChunks(r.disj[0]),ds=comparisonChunks(target.disj[0]);
    cs.forEach(function(c,i){var d=ds[i];if(!d||c.parts.length!==d.parts.length)return;
      [d,reverseChain(d)].forEach(function(b){c.parts.forEach(function(p,j){
        var diff=simplifyAlgebra(algebraBinary("sub",b.parts[j],p),algebraFacts(r.disj[0],cfg),true);
        if(!isZeroConst(diff)){
          var amount=exactFraction(diff),subtract=amount&&amount[0]<0||diff.t==="neg";
          actions.push({op:subtract?"sub":"add",value:expressionSource(subtract?(amount?fractionNode(fraction(-amount[0],amount[1])):diff.a):diff)});
        }
        var ratio=simplifyAlgebra(algebraBinary("div",b.parts[j],p),algebraFacts(r.disj[0],cfg),true);
        if(exactFraction(ratio)&&!isZeroConst(ratio))actions.push({op:"mul",value:expressionSource(ratio)});
      });});
    });
  }
  actions=actions.concat(linear.slice(0,1));
  for(var i=0;i<actions.length;i++){var direct=valid([actions[i]])||valid([actions[i],{op:"conditions"}]);if(direct)return direct;}
  for(var count=1;count<=linear.length;count++){var lp=valid(linear.slice(0,count))||valid(linear.slice(0,count).concat([{op:"conditions"}]));if(lp)return lp;}
  if(!depth)return null;
  if(r.disj.length>1&&r.disj.length===target.disj.length){
    var used=[],plans=[],ok=r.disj.every(function(d){
      var s=relationSource({t:"rel",disj:[d]});
      for(var j=0;j<target.disj.length;j++)if(!used[j]){
        var t=relationSource({t:"rel",disj:[target.disj[j]]}),p=relationSource(parseRelation(s))===relationSource(parseRelation(t))?[]:inferJustification(s,t,cfg,depth-1);
        if(p){used[j]=true;plans.push(p);return true;}
      }return false;
    });if(ok){var cp=valid([{op:"cases",branches:plans}]);if(cp)return cp;}
  }
  // Only meaningful generated intermediates; never infer a justification from
  // equivalence alone, nor use an authored target as an operation.
  for(var k=0;k<actions.length;k++){
    if(["abs","zero","sqrt","log","exp"].indexOf(actions[k].op)<0)continue;
    try{var mid=relationSource(simplifiedRelation(parseRelation(executeAction(src,actions[k],cfg)),cfg));if(mid===relationSource(r))continue;
      var tail=inferJustification(mid,next,cfg,depth-1);if(tail){var plan=valid([actions[k],{op:"simplify"}].concat(tail));if(plan)return plan;}
    }catch(_){}
  }
  return null;
}
// Prove coverage of typed cases from their boundaries, including the boundaries
// themselves. Never infer coverage from a finite sampling grid. Unknown source
// comparisons are ignored (a conservative superset), not assumed false.
function checkCaseCoverage(source,conditions,cfg){
  var ends=[],v=cfg.solve;
  // Complementary comparisons of the same defined expression also work for
  // nonlinear expressions, e.g. x^2-1 >= 0 versus x^2-1 < 0.
  var common=null,covered=[],sameExpression=conditions.every(function(c){
    var d=c.disj[0];if(d.ops.length!==1)return false;
    var expression=simplifyAlgebra(algebraBinary("sub",d.parts[0],d.parts[1]),{},true),key=expressionSource(expression);
    if(common&&common.key!==key)return false;
    common={key:key,expression:expression};covered=covered.concat(SIGN_VALUES[d.ops[0]]||[]);return true;
  });
  if(sameExpression&&common&&source.disj.every(function(d){
    var facts=algebraFacts(cfg.explicitCases?{parts:[],ops:[]}:d,cfg);
    return algebraDefined(common.expression,facts)&&algebraSigns(common.expression,facts).every(function(sign){return covered.indexOf(sign)>=0;});
  }))return;
  function comparison(a,op,b,loose){
    var parts=linearParts(algebraBinary("sub",a,b),v),s=parts&&exactFraction(parts.a),t=parts&&exactFraction(parts.b);
    if(!s||!t){if(loose)return function(){return true;};throw new ParseError("לבדיקת הכיסוי, כתבו תנאים לינאריים במשתנה של התרגיל, או פצלו לפי סימן ביטוי.");}
    var bound=s[0]?fractionOp([-t[0],t[1]],s,"div"):null;
    if(s[0]&&!bound)throw new ParseError("לא ניתן לבדוק את הגבול הזה בדיוק. נסו לכתוב אותו בצורה פשוטה יותר.");
    var end=bound?bound[0]/bound[1]:0;if(bound)ends.push(end);
    if(s[0]<0)op=MIRROR[op];
    return function(x){var left=s[0]?x:t[0],right=s[0]?end:0;return ({"<":left<right,"<=":left<=right,">":left>right,">=":left>=right,"=":left===right,"!=":left!==right})[op];};
  }
  function predicate(rel,loose){
    var groups=rel.disj.map(function(d){
      var tests=[];
      d.ops.forEach(function(op,i){if(op!=="and")tests.push(comparison(d.parts[i],op,d.parts[i+1],loose));});
      // Preserve domain holes even when the comparison itself is nonlinear.
      function domain(n){
        if(n.t==="div")tests.push(comparison(n.b,"!=",algebraNumber(0),true));
        if(n.a)domain(n.a);if(n.b)domain(n.b);if(n.n)domain(n.n);if(n.base)domain(n.base);
      }
      if(loose)d.parts.forEach(domain);
      return function(x){return tests.every(function(test){return test(x);});};
    });return function(x){return groups.some(function(test){return test(x);});};
  }
  var cases=conditions.map(function(c){return predicate(c,false);}),possible=predicate(inCase(cfg.explicitCases?truthRelation(true):source,cfg),true);
  (cfg.positive||[]).forEach(function(name){if(name===v)ends.push(0);});
  ends=ends.filter(function(x,i,a){return a.indexOf(x)===i;}).sort(function(a,b){return a-b;});
  var probes=ends.slice();
  if(!ends.length)probes.push(0);
  else {
    probes.push(ends[0]-Math.max(1,Math.abs(ends[0])),ends[ends.length-1]+Math.max(1,Math.abs(ends[ends.length-1])));
    for(var i=1;i<ends.length;i++)probes.push(ends[i-1]/2+ends[i]/2);
  }
  var missing=probes.filter(function(x){return possible(x)&&(!(cfg.positive||[]).includes(v)||x>0)&&!cases.some(function(test){return test(x);});});
  if(missing.length)throw new ParseError("חסר מקרה: למשל, \\("+v+"="+fmtNum(missing[0])+"\\) אינו נכלל באף מקרה. הוסיפו אותו או שנו את גבולות המקרים. אם הוא אינו רלוונטי, ציינו זאת ונמקו; בדקו גם את נקודות השוויון.");
}
function checkExcludedCase(source,condition,exclusion,cfg){
  if(!exclusion||!exclusion.reason||!exclusion.value||!exclusion.value.trim())throw new ParseError("כדי לסמן מקרה כלא רלוונטי, בחרו נימוק ומלאו את הביטוי או התנאי המתאים.");
  if(exclusion.reason==="denominator"){
    var operand=parseExpr(exclusion.value),key=expressionSource(simplifyAlgebra(operand,{},true)),found=false;
    function visit(n){
      if(n.t==="div"&&expressionSource(simplifyAlgebra(n.b,{},true))===key)found=true;
      ["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")visit(n[k]);});
    }
    if(!source.disj.every(function(d){found=false;d.parts.forEach(visit);return found;}))throw new ParseError("הביטוי שכתבתם אינו מכנה בכל האפשרויות שבשורה שמפצלים. ציינו מכנה שמתאפס בכל המקרה שאותו מוציאים.");
    var facts=algebraFacts(condition.disj[0],{}),signs=algebraSigns(operand,facts),zero=signs.length>0&&signs.every(function(s){return s===0;});
    if(!zero){
      comparisonChunks(condition.disj[0]).forEach(function(d){
      if(d.ops.length===1&&d.ops[0]==="="){
        var linear=linearParts(algebraBinary("sub",d.parts[0],d.parts[1]),cfg.solve),a=linear&&exactFraction(linear.a),b=linear&&exactFraction(linear.b);
        if(a&&a[0]&&b){var q=fractionOp([-b[0],b[1]],a,"div"),env={};if(q){env[cfg.solve]=q[0]/q[1];if(ev(operand,env)===0)zero=true;}}
      }
      });
    }
    if(!zero)throw new ParseError("הנימוק אינו מתאים: צריך שהמכנה \\("+tex(operand)+"\\) יתאפס בכל המקרה שסימנתם.");
    return;
  }
  if(exclusion.reason==="contradiction"){
    var cited=parseRelation(exclusion.value),fixed=cfg.assumption?comparisonChunks(parseRelation(cfg.assumption).disj[0]):[];
    if(cited.disj.length!==1||comparisonChunks(cited.disj[0]).length!==1)throw new ParseError("ציינו תנאי אחד מהשורה או מהנחת המקרה.");
    var c=cited.disj[0];
    if(!fixed.some(function(p){return chainSame(p,c,cfg.vars,[]);})&&!source.disj.every(function(d){return comparisonChunks(d).some(function(p){return chainSame(p,c,cfg.vars,[]);});}))throw new ParseError("התנאי שציינתם אינו תנאי קיים בשורה או בהנחת המקרה.");
    if(relationTruth(simplifyConditions(inCase(cited,{assumption:relationSource(condition),vars:cfg.vars}),cfg.solve))!==false)throw new ParseError("התנאי שציינתם אינו סותר את המקרה הזה. בחרו נימוק מתאים.");
    return;
  }
  throw new ParseError("בחרו נימוק למקרה שאינו רלוונטי.");
}
function splitRelationCases(src,split,cfg){
  var r=parseRelation(src);
  if(split&&split.conditions){
    if(!Array.isArray(split.conditions)||split.conditions.length<2)throw new ParseError("כתבו לפחות שני מקרים.");
    var conditions=split.conditions.map(function(text,i){
      if(typeof text!=="string"||!text.trim())throw new ParseError("כתבו תנאי למקרה "+(i+1)+".");
      var condition=parseRelation(text);
      if(condition.disj.length!==1||!condition.disj[0].ops.length)throw new ParseError("כתבו תנאי לכל מקרה בשדה נפרד. אפשר לחבר תנאים באותו מקרה בעזרת וגם.");
      if(Object.keys(varsOf(condition)).some(function(name){return name!==cfg.solve;}))throw new ParseError("בתנאי המקרים השתמשו במשתנה \\("+cfg.solve+"\\).");
      return condition;
    });
    checkCaseCoverage(r,conditions,cfg);
    return conditions.map(function(condition,i){
      var text=relationSource(condition);
      var excluded=(split.excluded||[])[i];if(excluded)checkExcludedCase(r,condition,excluded,cfg);
      return {source:relationSource(inCase(r,{assumption:text,vars:cfg.vars,positive:cfg.positive})),assumption:text,condition:text,work:src,excluded:excluded||null};
    });
  }
  if(!split||!split.value){
    if(r.disj.length<2)throw new ParseError("אין כאן עדיין מקרים המחוברים ב־או. אפשר לפצל לפי סימן ביטוי.");
    var groups=r.disj.map(function(d){return [d];});
    if(split&&split.at!==undefined){
      if(!Number.isInteger(split.at)||split.at<1||split.at>=r.disj.length)throw new ParseError("בחרו את ה־או שבו רוצים לפצל את השורה.");
      groups=[r.disj.slice(0,split.at),r.disj.slice(split.at)];
    }
    return groups.map(function(group){
    if(group.length>1){var grouped=relationSource({t:"rel",disj:group});return {source:grouped,assumption:grouped};}
    var d=group[0];
    function guard(c){return branchGuard(c,cfg.solve);}
    var s=relationSource({t:"rel",disj:[d]}),chunks=comparisonChunks(d),guards=chunks.filter(guard),work=chunks.filter(function(c){return !guard(c);});
    if(!guards.length||!work.length)return {source:s,assumption:s};
    return {source:s,assumption:s,condition:relationSource({t:"rel",disj:[joinComparisons(guards)]}),work:relationSource({t:"rel",disj:[joinComparisons(work)]})};
  });}
  var operand=parseExpr(split.value),name=expressionSource(operand);
  if(Object.keys(varsOf(operand)).some(function(v){return cfg.vars.indexOf(v)<0;})||!hasVar(operand))throw new ParseError("בחרו ביטוי עם משתנה מהתרגיל.");
  if(!r.disj.every(function(d){return algebraDefined(operand,algebraFacts(d,cfg));}))throw new ParseError("כדי לפצל לפי הסימן, הביטוי צריך להיות מוגדר בכל התחום הנוכחי.");
  return [">","<","="].filter(function(op){
    if(cfg.explicitCases||op!=="="||operand.t!=="var"||cfg.vars.length!==1)return true;
    var env={};env[operand.n]=0;return r.disj.some(function(d){return chainHolds(d,env);});
  }).map(function(op){var guard={parts:[operand,algebraNumber(0)],ops:[op]},next={t:"rel",disj:r.disj.map(function(d){return joinComparisons([guard].concat(comparisonChunks(d)));})};return {source:relationSource(next),assumption:name+" "+op+" 0",condition:name+" "+op+" 0",work:src};});
}

if (typeof document === "undefined") {
  if (typeof module !== "undefined") module.exports = {
    parseExpr: parseExpr, parseRelation: parseRelation, parseSet: parseSet, ev: ev, tex: tex, texChain: texChain,
    setTex: setTex, setInputTex: setInputTex, setEq: setEq, solveSet: solveSet, checkAnswer: checkAnswer, guessKind: guessKind, judgeStep: judgeStep,
    classifyStep: classifyStep, isSolved: isSolved, fmtNum: fmtNum, nodes: nodes, ParseError: ParseError,
    parsedSoFar: parsedSoFar, prepLine: prepLine, limOf: limOf, judgeLimStep: judgeLimStep, limDone: limDone, LIMRULES: LIMRULES,
    checkWorking: checkWorking, checkLineProof:checkLineProof, checkComposition:checkComposition, relationParts:relationParts, relationPartGroups:relationPartGroups, replaceRelationParts:replaceRelationParts,
    operateRelation:operateRelation, relationSource:relationSource, expandAbsolute:expandAbsolute, absoluteParts:absoluteParts, spaceLogicalWords:spaceLogicalWords,
    relationCandidates:relationCandidates, algebraCandidates:algebraCandidates, simplifyConditions:simplifyConditions,
    conditionParts:conditionParts, replaceConditionParts:replaceConditionParts, fragmentMatches:fragmentMatches,
    checkJustifiedStep:checkJustifiedStep, executeAction:executeAction, inferJustification:inferJustification,
    splitRelationCases:splitRelationCases, actionReason:actionReason
  };
  return;
}

function attr(el, name) {
  var v = el.getAttribute("data-" + name);
  return v === null ? el.getAttribute(name) : v;
}
function mathInput(props, kind) {
  if(kind==="text"){var input=el("input",props);input.classList.add("ix-text-input");return input;}
  return root.CourseMathInput ? root.CourseMathInput.create(props, kind) : el("input", props);
}
function readInput(input) {
  try { return root.CourseMathInput ? root.CourseMathInput.read(input) : input.value; }
  catch (e) { throw new ParseError(e.message); }
}
function isMathInput(input) { return root.CourseMathInput && root.CourseMathInput.isMath(input); }
function inputLatex(src, kind) {
  if (!src.trim()) return "";
  if (kind === "list") return splitList(src).map(function (s) { return tex(parseExpr(s)); }).join(", ");
  if (kind === "set") return setInputTex(src);
  var rel = parseRelation(src);
  var terminal=relationTruth(rel);if(terminal!==null)return terminal?"\\mathbb{R}":"\\varnothing";
  return isRelation(rel) ? rel.disj.map(texChain).join("\\quad\\text{או}\\quad ") : tex(parseExpr(src));
}
function el(tag, props, kids) {
  var n = document.createElement(tag);
  for (var k in (props || {})) {
    var v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "text") n.textContent = v;
    else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return n;
}
// Synchronous MathJax.typeset, as Quarto itself does: in MathJax 4 the promise
// versions may never settle on these pages. Retry while MathJax is still loading.
function typeset(node, tries) {
  var MJ = root.MathJax;
  if (!node) return;
  tries = tries || 0;
  if (!MJ || typeof MJ.typeset !== "function") {
    if (tries < 60) setTimeout(function () { typeset(node, tries + 1); }, 250);
    return;
  }
  try {
    if (MJ.typesetClear) MJ.typesetClear([node]);
    MJ.typeset([node]);
  } catch (e) {
    // an extension is being downloaded: wait for it (e.retry), not for a fixed time,
    // or the second attempt finds its macros half-registered
    if (tries >= 60) return;
    var again = function () { typeset(node, tries + 1); };
    if (e && e.retry && typeof e.retry.then === "function") e.retry.then(again, function () { setTimeout(again, 250); });
    else setTimeout(again, 250);
  }
}
// Inline math we insert gets the same wrapper Pandoc gives the page's own math, so the
// LTR isolation in _styles.html (span.math) applies to it too.
function mx(html) {
  return String(html || "").replace(/\\\(([\s\S]*?)\\\)/g, '<span class="math inline">\\($1\\)</span>');
}
function say(box, html, kind) {
  box.className = "ix-msg" + (kind ? " ix-" + kind : "");
  box.innerHTML = mx(html);
  if (html) typeset(box);
}
function childDivs(box, cls) {
  return Array.prototype.filter.call(box.children, function (c) { return c.classList && c.classList.contains(cls); });
}
function insertAtCaret(input, text) {
  if (root.CourseMathInput && root.CourseMathInput.insert(input, text)) return;
  var a = input.selectionStart, b = input.selectionEnd;
  if (a === null || a === undefined) { a = b = input.value.length; }
  var pos = a + text.length;
  // Paired fences, including half-open intervals, put the caret inside.
  if (/[([][)\]]$|\{\}$|\{x\|\}$|\|\|$/.test(text)) pos = a + text.length - 1;
  input.value = input.value.slice(0, a) + text + input.value.slice(b);
  input.focus();
  input.setSelectionRange(pos, pos);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
// "x=4 או x=-1" in a left-to-right input: the bidi algorithm pulls the number that follows
// the Hebrew word over to its other side ("x=4 1- או x="). An invisible left-to-right mark
// after each Hebrew operator keeps the typed order; normalize() reads it as a space.
function markOr(input) {
  if (isMathInput(input)||input.classList.contains("ix-text-input")) return;
  var v = input.value;
  if (!/או|וגם|ולא|לא/.test(v)) return;
  var spaced=spaceLogicalWords(v,input.selectionStart,input.selectionEnd);
  if(spaced.value===v)return;
  input.value=spaced.value;
  if(spaced.start!==null&&spaced.start!==undefined)input.setSelectionRange(spaced.start,spaced.end);
}
var KEYSETS = {
  "letter-order": [["<", "<"]],
  lim: [["n", "n"], ["שבר", "/"], ["חזקה", "^"], ["√", "√()"], ["( )", "()"], ["∞", "∞"], ["e", "e"], ["!", "!"], ["π", "π"], ["sin", "sin()"], ["cos", "cos()"]],
  num: [["שבר", "/"], ["חזקה", "^"], ["√", "√()"], ["∛", "cbrt()"], ["π", "π"], ["log", "log_()"]],
  set: [["∞", "∞"], ["−∞", "-∞"], ["∪", " ∪ "], ["∩", " ∩ "], ["∖", " ∖ "], ["( )", "()"], ["[ ]", "[]"], ["[ )", "[)"], ["( ]", "(]"], ["{ }", "{}"], ["{x ∣ …}", "{x|}"], ["<", "<"], ["≤", "≤"], [">", ">"], ["≥", "≥"], ["=", "="], ["≠", "≠"], ["או", " או "], ["וגם", " וגם "], ["ולא", " ולא "], ["לא", " לא "], ["∅", "∅"], ["ℝ", "ℝ"], ["שבר", "/"], ["חזקה", "^"], ["√", "√()"], ["π", "π"]],
  expr: [["x", "x"], ["שבר", "/"], ["חזקה", "^"], ["√", "√()"], ["∛", "cbrt()"], ["שורש", "root()"], ["( )", "()"], ["| |", "||"], ["π", "π"], ["log", "log_()"]],
  rel: [["<", "<"], [">", ">"], ["≤", "≤"], ["≥", "≥"], ["=", "="], ["≠", "≠"], ["או", " או "], ["וגם", " וגם "], ["שבר", "/"], ["חזקה", "^"], ["√", "√()"], ["∛", "cbrt()"], ["| |", "||"], ["log", "log_()"]]
};
function keyRow(keys, target) {
  return el("div", { class: "ix-keys", role: "group", "aria-label": "סימנים" }, keys.map(function (k) {
    var labels = { "/": '<span class="ix-frac"><span>a</span><span>b</span></span>', "^": 'x<sup>□</sup>', "root()": '<sup>n</sup>√', "log_()": 'log<sub>□</sub>' };
    var names = { "/":"שבר", "^":"חזקה", "||":"ערך מוחלט", "≠":"לא שווה", "√()":"שורש ריבועי", "cbrt()":"שורש שלישי", "root()":"שורש מסדר כללי", "log_()":"לוגריתם עם בסיס", "∞":"אינסוף", "-∞":"מינוס אינסוף", "π":"פאי", " ∪ ":"איחוד", " ∩ ":"חיתוך", " ∖ ":"הפרש קבוצות" };
    var props = { type: "button", class: "ix-key", "aria-label": names[k[1]] || k[0], title: names[k[1]] || k[0],
      onpointerdown: function (e) { if (e.button === 0) e.preventDefault(); },
      onclick: function () { var t = target(); if (t) insertAtCaret(t, k[1]); } };
    if (labels[k[1]]) props.html = labels[k[1]]; else props.text = k[0];
    return el("button", props);
  }));
}
var activeKeypad = null;
function closeInputKeys(input) {
  if (activeKeypad && (!input || activeKeypad.input === input)) { activeKeypad.row.remove();activeKeypad=null; }
}
function closeUnfocusedKeys(input) {
  setTimeout(function () {
    if (activeKeypad && activeKeypad.input === input &&
        !input.contains(document.activeElement) && !activeKeypad.row.contains(document.activeElement)) closeInputKeys(input);
  }, 150);
}
function inputKeys(input, kind, enabled) {
  if (activeKeypad && activeKeypad.input === input) return;
  closeInputKeys();
  if (!enabled) return;
  var keys = Array.isArray(kind) ? kind : kind === "list" ? KEYSETS.num.concat([[",",","]]) : KEYSETS[kind] || [];
  if (!keys.length) return;
  var row = keyRow(keys,function () { return input; });row.classList.add("ix-local-keys");
  input.parentElement.appendChild(row);
  var rect=input.parentElement.getBoundingClientRect(),viewport=root.innerWidth||720,width=Math.min(480,keys.length*48+16,viewport-24);
  row.style.width=width+"px";row.style.left=Math.max(12-rect.left,Math.min(0,viewport-12-rect.left-width))+"px";
  activeKeypad={input:input,row:row};
  row.addEventListener("focusout",function(){closeUnfocusedKeys(input);});
  row.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();input.focus();closeInputKeys(input);}});
}
function bindInputKeys(input, kind, enabled) {
  input.addEventListener("focus",function(){inputKeys(input,kind,enabled);});
  input.addEventListener("blur",function(){closeUnfocusedKeys(input);});
  input.addEventListener("keydown",function(e){if(e.key==="Escape")closeInputKeys(input);});
}
// The preview under an input is just the formula; dimmed while it is still incomplete.
function showParsed(pv, html, whole) {
  pv.innerHTML = mx(html);
  pv.classList.toggle("ix-preview-partial", !whole);
  typeset(pv);
}
function debounce(f, ms) { var h; return function () { var a = arguments, me = this; clearTimeout(h); h = setTimeout(function () { f.apply(me, a); }, ms); }; }

/* ---------------- 6a. Fill-in blanks ---------------- */
/* A .fill with several parts (paragraphs that open with a bold "(א)", "(ב)", ...) is split
   into one group per part, so each part is checked and revealed on its own. Paragraphs of
   the ::: explain that open with a part label go with that part; an explain without labels
   is shown once every part is done. The hints keep one shared button. */
var PART_RE = /^\(([\u05D0-\u05EA])\)$/;
function partLabel(node) {
  if (!node || node.tagName !== "P") return null;
  var f = node.firstChild;
  while (f && f.nodeType === 3 && !f.textContent.trim()) f = f.nextSibling;
  if (!f || f.nodeType !== 1 || f.tagName !== "STRONG") return null;
  var m = PART_RE.exec(f.textContent.trim());
  return m ? m[1] : null;
}
function splitParts(fill) {
  var kids = Array.prototype.slice.call(fill.children);
  var marks = kids.filter(function (k) { return partLabel(k); });
  if (marks.length < 2) return;
  var hints = childDivs(fill, "hint"), explain = childDivs(fill, "explain");
  var parts = [], cur = null;
  kids.forEach(function (k) {
    if (k.classList.contains("hint") || k.classList.contains("explain")) return;
    var lab = partLabel(k);
    if (lab) {
      cur = el("div", { class: "fill fill-part" });
      if (attr(fill, "keys")) cur.setAttribute("data-keys", attr(fill, "keys"));
      cur.dataset.part = lab;
      fill.insertBefore(cur, k);
      parts.push(cur);
    }
    if (cur) cur.appendChild(k);
  });
  // explain paragraphs that name a part go to that part
  var shared = [];
  function partExplain(p) { return p.querySelector(":scope > .explain") || p.appendChild(el("div", { class: "explain" })); }
  explain.forEach(function (ex) {
    var exKids = Array.prototype.slice.call(ex.children), owner = null, lead = [];
    exKids.forEach(function (k) {
      var lab = partLabel(k);
      if (lab) owner = parts.filter(function (p) { return p.dataset.part === lab; })[0] || owner;
      if (owner) partExplain(owner).appendChild(k); else lead.push(k);
    });
    if (lead.length === exKids.length) { shared.push(ex); return; }
    // lines before the first label open the explanation of the first part
    var first = partExplain(parts[0]);
    lead.reverse().forEach(function (k) { first.insertBefore(k, first.firstChild); });
    ex.remove();
  });
  // a part counts as done when it is right or revealed; a shared explain waits for all of them
  var doneParts = {};
  shared.forEach(function (x) { x.classList.add("ix-hidden"); });
  fill.addEventListener("fill-part", function (e) {
    doneParts[e.detail.part] = e.detail.done;
    var all = parts.every(function (p) { return doneParts[p.dataset.part]; });
    shared.forEach(function (x) { x.classList.toggle("ix-hidden", !all); if (all) typeset(x); });
  });
  if (hints.length) {
    var h = 0;
    hints.forEach(function (x) { x.classList.add("ix-hidden"); });
    var bHint = el("button", { type: "button", class: "ix-btn", onclick: function () {
      if (h < hints.length) { hints[h].classList.remove("ix-hidden"); typeset(hints[h]); h++; }
      bHint.textContent = "רמז (" + h + "/" + hints.length + ")"; bHint.disabled = h >= hints.length;
    } }, ["רמז (0/" + hints.length + ")"]);
    fill.insertBefore(el("div", { class: "ix-bar fill-hints" }, [bHint]), hints[0]);
  }
  fill.classList.add("fill-split");
}

function initBlanks() {
  document.querySelectorAll(".fill").forEach(splitParts);
  var blanks = Array.prototype.slice.call(document.querySelectorAll("span.blank"));
  var groups = [];
  blanks.forEach(function (sp) {
    var g = sp.closest(".fill") || (sp.closest("li, td, th") && sp.closest("table, ul, ol")) ||
      sp.closest("p") || sp.closest(".thmbox") || sp.parentNode;
    var G = groups.filter(function (x) { return x.node === g; })[0];
    if (!G) { G = { node: g, items: [] }; groups.push(G); }
    G.items.push(sp);
  });
  groups.forEach(initGroup);
}

function initGroup(G) {
  var box = G.node, items = [], panel = el("div", { class: "ix-panel" });
  G.items.forEach(function (sp) {
    var ans = attr(sp, "ans");
    if (ans === null) return;
    var kind = attr(sp, "kind") || guessKind(ans);
    var w = +attr(sp, "w") || Math.min(26, Math.max(4, normalize(ans).replace(/\s+/g, "").length + 2));
    if (sp.closest("td, th") && !sp.closest(".sequence-table")) w = Math.min(w, kind==="text"?14:7); // classifications need room for words
    var shown = el("span", { class: "blank-answer" });
    while (sp.firstChild) shown.appendChild(sp.firstChild);
    shown.hidden = true;
    var input = mathInput({ type: "text", class: "blank-input", dir: kind==="text"?"rtl":"ltr", size: String(w), autocomplete: "off",
      spellcheck: "false", "aria-label": "התשובה שלכם" }, kind);
    var mark = el("span", { class: "blank-mark", "aria-hidden": "true" });
    var entry = el("span", { class:"blank-entry" }), pv = el("span", { class:"ix-preview ix-field-preview", dir:"ltr", "aria-live":"off" });
    entry.appendChild(input);entry.appendChild(pv);
    sp.appendChild(entry);
    bindInputKeys(input,kind,attr(box,"keys")!=="none");
    sp.appendChild(mark);
    sp.appendChild(shown);
    sp.classList.add("blank-ready");
    var it = { sp: sp, ans: ans, kind: kind, input: input, preview: pv, mark: mark, shown: shown,
      vars: (attr(sp, "vars") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
      miss: parseMiss(attr(sp, "miss")),
      opts: { form: attr(sp, "form"), checkAt: attr(sp, "check-at"), integers: (attr(sp,"integer") || "").split(",").filter(Boolean), allowExpression: attr(sp,"allow-expression")==="true", positive: (attr(sp, "positive") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean) } };
    input.addEventListener("focus", function () { if (isMathInput(input) && pv) pv.innerHTML = ""; });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); checkOne(it, true); allDone(); }
    }, true);
    input.addEventListener("input", function () {
      sp.classList.remove("ok", "bad", "warn");
      mark.textContent = "";
      if(bReset)bReset.hidden=false;
      if(msg)say(msg,"");
      if(explain)explain.forEach(function(x){x.classList.add("ix-hidden");});
      tellPart(false);
      preview(it);
    });
    items.push(it);
    if (attr(sp, "plot") !== null && root.SetPlot) {
      var plotHost = el("div");
      var paragraph = sp.closest("p") || sp;
      it.plotFold=el("details",{class:"sp-practice"},[el("summary",{text:"סרטוט הקבוצה"}),plotHost]);
      it.plotFold.open=!!sp.closest(".set-cases");
      paragraph.parentNode.insertBefore(it.plotFold, paragraph.nextSibling);
      it.plot = root.SetPlot.create(plotHost, {
        marks: attr(sp, "plot").split(",").map(function (v) { return ev(parseExpr(v), {}); }),
        answer: parseSet(ans),
        showNotation: attr(box, "plot-notation") !== "off",
        notation: function (node, set) { node.innerHTML=mx("\\("+setTex(set)+"\\)");typeset(node); },
        a: attr(sp,"plot-a") ? parseSet(attr(sp,"plot-a")) : null,
        b: attr(sp,"plot-b") ? parseSet(attr(sp,"plot-b")) : null,
        input: function () { var field=mathInput({ type:"text", class:"blank-input", dir:"ltr", size:"7" }, "num");bindInputKeys(field,"num",true);return field; },
        preview: function (node, field) {
          node.innerHTML = "";
          if (isMathInput(field) || !field.value.trim() || /^-?\d+(\.\d+)?$/.test(field.value.trim())) return;
          var got = parsedSoFar(field.value, parseExpr);
          if (got) showParsed(node, "\\(" + tex(got.node) + "\\)", got.whole);
        },
        number: function (field) {
          var n = parseExpr(readInput(field));
          if (hasVar(n)) throw new ParseError("כתבו מספר, בלי משתנה.");
          var value = ev(n, {});
          if (!isFinite(value)) throw new ParseError("צריך מספר ממשי מוגדר.");
          return value;
        },
        onChange: function () {
          sp.classList.remove("ok", "bad", "warn");mark.textContent="";
          if (msg) say(msg, "");
          if (explain) explain.forEach(function (x) { x.classList.add("ix-hidden"); });
          tellPart(false);
        }
      });
    }
  });
  if (!items.length) return;
  var hints = childDivs(box, "hint"), explain = childDivs(box, "explain");
  hints.concat(explain).forEach(function (h) { h.classList.add("ix-hidden"); });
  var h = 0;
  var msg = el("div", { class: "ix-msg", "aria-live": "polite" });
  var bHint = hints.length ? el("button", { type: "button", class: "ix-btn", onclick: function () {
    if (h < hints.length) { hints[h].classList.remove("ix-hidden"); typeset(hints[h]); h++; }
    bHint.textContent = "רמז (" + h + "/" + hints.length + ")"; bHint.disabled = h >= hints.length;
  } }, ["רמז (0/" + hints.length + ")"]) : null;
  var bShow = el("button", { type: "button", class: "ix-btn ix-quiet", onclick: showAll }, [items.length > 1 ? "הצגת התשובות" : "הצגת התשובה"]);
  var bReset = el("button", { type: "button", class: "ix-btn ix-quiet", hidden: true, onclick: reset }, ["ניסיון חדש"]);
  var bar = el("div", { class: "ix-bar" }, [
    el("button", { type: "button", class: "ix-btn ix-main", onclick: function () { checkAll(); } }, ["בדיקה"]),
    bHint, bShow, bReset]);
  [bar, msg].forEach(function (c) { if (c) panel.appendChild(c); });
  var anchor = box.classList.contains("fill") ? (hints[0] || explain[0] || null) : null;
  if (box.classList.contains("fill")) box.insertBefore(panel, anchor);
  else if (box.tagName === "TABLE" || box.tagName === "UL" || box.tagName === "OL" || box.tagName === "P") box.parentNode.insertBefore(panel, box.nextSibling);
  else box.appendChild(panel);
  box.classList.add("fill-ready");

  function preview(it) {
    var pv = it.preview;
    if(it.kind==="text"){pv.innerHTML="";return;}
    if (isMathInput(it.input)) { pv.innerHTML = ""; return; }
    var v = it.input.value.trim();
    if (!v || it.kind === "num" && /^-?\d+(\.\d+)?$/.test(v)) { pv.innerHTML = ""; return; }
    if (!it.schedulePreview) it.schedulePreview = debounce(function (value) { renderPreview(it, value); }, 350);
    it.schedulePreview(v);
  }
  function renderPreview(it, v) {
    var pv = it.preview;
    if (it.input.hidden || isMathInput(it.input) || v !== it.input.value.trim()) return;
    if (it.kind === "set") {
      try { showParsed(pv, "\\(" + setInputTex(v) + "\\)", true); }
      catch (_) { pv.innerHTML = ""; }
      return;
    }
    if (it.kind === "letter-order") {
      if (!/^[a-z\s<>]+$/.test(v)) { pv.innerHTML = ""; return; }
      showParsed(pv, "\\(" + v + "\\)", !/[<>]\s*$/.test(v));
      return;
    }
    if (it.kind === "list") {
      var terms = [], all = true;
      splitList(v).forEach(function (t) { var g = t ? parsedSoFar(t, parseExpr) : null; if (g) { terms.push(tex(g.node)); if (!g.whole) all = false; } else all = false; });
      if (!terms.length) { pv.innerHTML = ""; return; }
      showParsed(pv, "\\(" + terms.join(", \\ ") + "\\)", all);
      return;
    }
    var got = parsedSoFar(v, parseExpr);
    if (!got) { pv.innerHTML = ""; return; }
    showParsed(pv, "\\(" + tex(got.node) + "\\)", got.whole);
  }

  function checkOne(it, talk) {
    var r;
    try { r = checkAnswer(it.kind, it.ans, readInput(it.input), it.vars, it.opts); }
    catch (e) { r = { ok: false, msg: errMsg(e) }; }
    if (!r.ok && !r.empty && it.miss.length) {
      for (var i = 0; i < it.miss.length; i++) {
        var m;
        try { m = checkValue(it.kind, it.miss[i][0], readInput(it.input), it.vars, it.opts); } catch (e) { m = { ok: false }; }
        if (m.ok) { r.msg = it.miss[i][1]; break; }
      }
    }
    if (it.plot) {
      var plotted = it.plot.check();
      if (r.ok && !plotted.ok) { it.plotFold.open=true; r = { ok:false, partial:true, msg:"הכתיבה נכונה. " + plotted.msg }; }
    }
    it.sp.classList.toggle("ok", r.ok);
    it.sp.classList.toggle("bad", !r.ok && !r.empty && !r.partial);
    it.sp.classList.toggle("warn", !!r.partial);
    it.mark.textContent = r.ok ? "✓" : (r.empty ? "" : (r.partial ? "!" : "✗"));
    if (talk) say(msg, r.ok ? "נכון!" : r.msg, r.ok ? "good" : (r.empty ? "info" : (r.partial ? "warn" : "bad")));
    return r;
  }
  function checkAll() {
    var firstBad = null, nOk = 0, nEmpty = 0, res = [];
    items.forEach(function (it) {
      var r = checkOne(it, false);
      res.push(r);
      if (r.ok) nOk++; else if (r.empty) nEmpty++;
      if (!r.ok && !r.empty && !firstBad) firstBad = { it: it, r: r };
    });
    if (!firstBad) items.forEach(function (it, i) { if (!res[i].ok && !firstBad) firstBad = { it: it, r: res[i] }; });
    if (!firstBad) { done(); return; }
    var head = items.length > 1 ? "נכונות: " + nOk + " מתוך " + items.length + ". " : "";
    say(msg, head + (firstBad.r.empty ? (nEmpty === items.length ? "כתבו תשובה בכל משבצת, ואז לחצו ״בדיקה״." : "יש משבצת ריקה.") :
      (items.length > 1 ? "בתשובה המסומנת: " : "") + firstBad.r.msg), firstBad.r.empty ? "info" : (firstBad.r.partial ? "warn" : "bad"));
    firstBad.it.input.focus();
  }
  function allDone() {
    if (items.every(function (it) { return it.sp.classList.contains("ok"); })) done();
  }
  function done() {
    say(msg, items.length > 1 ? "✓ כל התשובות נכונות!" : "✓ נכון!", "good");
    explain.forEach(function (x) { x.classList.remove("ix-hidden"); typeset(x); });
    tellPart(true);
  }
  function tellPart(isDone) {
    if (box.dataset && box.dataset.part)
      box.parentNode.dispatchEvent(new CustomEvent("fill-part", { detail: { part: box.dataset.part, done: isDone } }));
  }
  function showAll() {
    closeInputKeys();
    items.forEach(function (it) {
      it.input.hidden = true; it.mark.textContent = ""; it.shown.hidden = false; it.sp.classList.add("revealed");
      it.preview.innerHTML = "";
      if (it.plot) { it.plotFold.open=true; it.plot.reveal(); }
    });
    explain.forEach(function (x) { x.classList.remove("ix-hidden"); typeset(x); });
    say(msg, "");
    bShow.hidden = true; bReset.hidden = false;
    tellPart(true);
  }
  function reset() {
    closeInputKeys();
    items.forEach(function (it) {
      it.input.hidden = false; it.input.value = ""; it.shown.hidden = true; it.mark.textContent = "";
      it.preview.innerHTML = "";
      it.sp.classList.remove("revealed", "ok", "bad", "warn");
      if (it.plot) { it.plot.reset(); it.plotFold.open=!!it.sp.closest(".set-cases, .pw-workspace"); }
    });
    explain.forEach(function (x) { x.classList.add("ix-hidden"); });
    say(msg, "");
    bShow.hidden = false; bReset.hidden = true;
    tellPart(false);
  }
}
// Classify first, then write the parameters and formula (or numerical evidence).
function initSequenceClassify(box) {
  var expected=attr(box,"answer"), terms=attr(box,"terms").split(","), formula=attr(box,"formula");
  var model=box.querySelector(".explain"), hint=box.querySelector(".hint"), cache={};
  if(model)model.hidden=true;if(hint)hint.hidden=true;
  var select=el("select",{class:"sequence-kind-select","aria-label":"סוג הסדרה"},[
    el("option",{value:"",text:"בחרו סוג סדרה"}),
    el("option",{value:"arithmetic",text:"חשבונית"}),
    el("option",{value:"geometric",text:"הנדסית"}),
    el("option",{value:"neither",text:"אף אחת מהן"})
  ]);
  var panels=el("div",{class:"sequence-kind-panels"}),msg=el("div",{class:"ix-msg","aria-live":"polite"});
  var ui=el("div",{class:"sequence-kind-ui"},[
    el("label",{class:"sequence-kind-label"},["סוג הסדרה: ",select]),panels
  ]);
  ui.appendChild(el("div",{class:"ix-bar"},[
    el("button",{type:"button",class:"ix-btn ix-main",text:"בדיקה",onclick:check}),
    hint&&el("button",{type:"button",class:"ix-btn",text:"רמז",onclick:function(){hint.hidden=false;typeset(hint);}}),
    el("button",{type:"button",class:"ix-btn ix-quiet",text:"הצגת תשובה",onclick:function(){if(model){model.hidden=false;typeset(model);}closeInputKeys();}}),
    el("button",{type:"button",class:"ix-btn ix-quiet",text:"ניסיון חדש",onclick:reset})
  ]));
  ui.appendChild(msg);box.insertBefore(ui,box.firstChild);
  select.addEventListener("change",function(){
    closeInputKeys();say(msg,"");if(model)model.hidden=true;if(hint)hint.hidden=true;
    Object.keys(cache).forEach(function(k){cache[k].node.hidden=true;});
    if(select.value){var p=cache[select.value]||build(select.value);p.node.hidden=false;typeset(p.node);}
  });
  function field(panel,host,name,label,ans,kind,width,accessible) {
    var input=mathInput({class:"blank-input",size:String(width),dir:"ltr","aria-label":accessible,autocomplete:"off"},kind);
    var preview=el("span",{class:"ix-preview ix-field-preview",dir:"ltr"}),mark=el("span",{class:"blank-mark","aria-hidden":"true"});
    var entry=el("span",{class:"blank-entry"},[input,preview]),blank=el("span",{class:"blank blank-ready"},[entry,mark]);
    host.appendChild(el("p",{class:"sequence-classify-field",dir:"ltr"},[el("span",{html:mx("\\("+label+"=\\)")}),blank]));
    var item={input:input,preview:preview,mark:mark,blank:blank,ans:ans,kind:kind};
    input.setAttribute("data-field",name);panel.items.push(item);
    bindInputKeys(input,kind==="expr"?[["n","n"],["שבר","/"],["חזקה","^"],["( )","()"]]:kind,true);
    input.addEventListener("input",function(){
      blank.classList.remove("ok","bad","warn");input.removeAttribute("aria-invalid");mark.textContent="";say(msg,"");if(model)model.hidden=true;
      preview.innerHTML="";
      if(!isMathInput(input)&&readInput(input).trim()){
        var parsed=parsedSoFar(readInput(input),parseExpr);
        if(parsed)showParsed(preview,"\\("+tex(parsed.node)+"\\)",parsed.whole);
      }
    });
    input.addEventListener("focus",function(){if(isMathInput(input))preview.innerHTML="";});
    input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();check();}});
  }
  function build(kind) {
    var panel={node:el("div",{class:"sequence-kind-panel","data-kind":kind}),items:[]};cache[kind]=panel;panels.appendChild(panel.node);
    if(kind==="neither") {
      panel.node.appendChild(el("p",{text:"השוו את ההפרשים ואת המנות הבאים:"}));
      var differences=el("div",{class:"sequence-inputs"}),ratios=el("div",{class:"sequence-inputs"});
      panel.node.appendChild(differences);panel.node.appendChild(ratios);
      field(panel,differences,"difference1","a_2-a_1","("+terms[1]+")-("+terms[0]+")","num",5,"ההפרש בין האיבר השני לראשון");
      field(panel,differences,"difference2","a_3-a_2","("+terms[2]+")-("+terms[1]+")","num",5,"ההפרש בין האיבר השלישי לשני");
      field(panel,ratios,"ratio1","\\frac{a_2}{a_1}","("+terms[1]+")/("+terms[0]+")","num",5,"מנת האיבר השני בראשון");
      field(panel,ratios,"ratio2","\\frac{a_4}{a_3}","("+terms[3]+")/("+terms[2]+")","num",5,"מנת האיבר הרביעי בשלישי");
    } else {
      var params=el("div",{class:"sequence-inputs"}),general=el("div",{class:"sequence-formula"});
      panel.node.appendChild(params);panel.node.appendChild(general);
      field(panel,params,"first","a_1",terms[0],"num",5,"האיבר הראשון");
      field(panel,params,"step",kind==="arithmetic"?"d":"q","("+terms[1]+")"+(kind==="arithmetic"?"-":"/")+"("+terms[0]+")","num",5,kind==="arithmetic"?"ההפרש הקבוע":"המנה הקבועה");
      field(panel,general,"formula","a_n",formula||"0","expr",14,"נוסחה לאיבר הכללי");
    }
    return panel;
  }
  function check() {
    var kind=select.value;
    if(!kind){say(msg,"בחרו תחילה את סוג הסדרה.","info");select.focus();return;}
    if(kind!==expected){
      var why=kind==="arithmetic"?"לא כל ההפרשים בין איברים עוקבים שווים.":kind==="geometric"?"לא כל המנות בין איברים עוקבים שוות.":"בדקו שוב: אפשר להמשיך את האיברים הנתונים לסדרה חשבונית או הנדסית.";
      say(msg,"הבחירה אינה מתאימה. "+why,"bad");return;
    }
    var firstBad=null;
    cache[kind].items.forEach(function(item){
      var result;
      try {result=checkAnswer(item.kind,item.ans,readInput(item.input),item.kind==="expr"?["n"]:[],{positive:["n"],integers:["n"]});}
      catch(e){result={ok:false,msg:errMsg(e)};}
      item.blank.classList.toggle("ok",result.ok);item.blank.classList.toggle("bad",!result.ok&&!result.empty&&!result.partial);item.blank.classList.toggle("warn",!!result.partial);
      item.input.setAttribute("aria-invalid",String(!result.ok&&!result.empty));
      item.mark.textContent=result.ok?"✓":result.empty?"":result.partial?"!":"✗";
      if(!result.ok&&!firstBad)firstBad={item:item,result:result};
    });
    if(firstBad){say(msg,"הבחירה נכונה. "+(firstBad.result.empty?"השלימו את החישובים.":firstBad.result.msg),firstBad.result.empty?"info":firstBad.result.partial?"warn":"bad");firstBad.item.input.focus();return;}
    say(msg,"✓ התשובה נכונה!","good");if(model){model.hidden=false;typeset(model);}
  }
  function reset() {
    closeInputKeys();select.value="";
    Object.keys(cache).forEach(function(k){var p=cache[k];p.node.hidden=true;p.items.forEach(function(it){it.input.value="";it.input.removeAttribute("aria-invalid");it.preview.innerHTML="";it.mark.textContent="";it.blank.classList.remove("ok","bad","warn");});});
    if(model)model.hidden=true;if(hint)hint.hidden=true;say(msg,"");select.focus();
  }
}
function parseMiss(s) {
  if (!s) return [];
  return s.split("||").map(function (p) {
    var i = p.indexOf("::");
    return i < 0 ? null : [p.slice(0, i).trim(), p.slice(i + 2).trim().replace(/\$([^$]+)\$/g, "\\($1\\)")];
  }).filter(Boolean);
}

/* ---------------- 6b. Guided derivations (.derive) ----------------
   A worked solution, revealed one line at a time, the way it is written on the board:

     ::::: {.derive start="3-2x<7"}             (limit="n": a limit computation;
     ::: {.step line="-2x < [4]"}                a start without a relation: a computation)
     חיסרנו $3$ משני האגפים.                    <- the note beside the line
     :::
     ::: {.step line="x [>] [-2]"}
     ...
     :::::

   [..] in a line is a box the reader fills (a number or an expression, checked by value);
   [<] is a relation sign, picked with a click. A line without boxes is just shown.
   "הצעד הבא" reveals the next line; a line filled correctly opens the next one by itself.
   "השלמת הצעד" and "כל הפתרון" fill the answers in (for the lecture). ::: hint children are
   revealed by "רמז". tests/derive.test.js checks that every line follows from the previous. */
var SUB = "₀₁₂₃₄₅₆₇₈₉";
var SIGN_TEX = { "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge", "=": "=" };
var SIGN_TXT = { "<": "<", ">": ">", "<=": "≤", ">=": "≥", "=": "=" };
function practiceHelp(relation){
  function bold(text){return el("strong",{text:text});}
  var items=relation?[
    el("li",{},[bold("כתיבת צעד: "),"בחרו שורת מקור, סוג פעולה ואת הפעולה. ברירת המחדל היא השורה הזמינה האחרונה; אפשר לחזור לשורה קודמת. כתבו את התוצאה ולחצו על ",bold("בדיקת הצעד והמשך"),". אפשר לצרף כמה פעולות לפי הסדר."]),
    el("li",{},[bold("חלוקה למקרים: "),"בקטגוריה ",bold("עבודה במקרים")," בחרו ",bold("פיצול לפי תנאים שכותבים"),". כתבו גם את מקרי השוויון, או כללו אותם באחד התנאים. למקרה שאינו רלוונטי ציינו נימוק. לאחר יישום החלוקה מתקבלת שורת או; אפשר לבצע עליה פעולה שתקפה בכל האפשרויות."]),
    el("li",{},[bold("עבודה במקרים: "),"בחרו את שורת האו, את הפעולה ",bold("פתיחת מקרה (או)")," ואת המקרה הרצוי. בסיום בחרו ",bold("סיום מקרה")," וציינו את שורת הפתיחה ואת שורת המסקנה. פתחו וסיימו את המקרה האחר באותה דרך. לבסוף בחרו ",bold("איחוד המקרים")," וציינו את שורות הסיום. חיתוך תנאים שנותרו מפשטים בצעד נפרד."]),
    el("li",{},[bold("פישוט חלק מהשורה: "),"בקטגוריה ",bold("פישוט והחלפה")," בחרו ",bold("פישוט תנאים שנבחרו"),". אפשר להקליד את החלק וללחוץ על בחירת החלק, או לבחור אותו בלחיצה. כתבו את התוצאה ואת הנימוק. כדי להוציא מקרה שבו יש חילוק באפס, בחרו ",bold("אין פתרונות במקרה הזה — המכנה מתאפס"),", ציינו את המכנה וכתבו ∅ בתוצאה."]),
    el("li",{},[bold("עזרה: "),"אפשר לבקש ",bold("רמז")," או ",bold("הצגת צעד אפשרי")," בלי לשנות את מה שכתבתם. כדי להשתמש בצעד המוצע לחצו על ",bold("יישום הצעד והמשך"),"; הנימוק מצורף אליו. אפשר לעבור ללשונית ",bold("פתרון לדוגמה")," או ללחוץ על ",bold("השוואה")," כדי לראות את שני הפתרונות יחד."])
  ]:[
    el("li",{},[bold("כתיבת הפתרון: "),"כתבו כל שורת חישוב בנפרד. להמשך לחצו על ",bold("הוספת שורה"),"."]),
    el("li",{},[bold("בדיקה: "),"לחצו על ",bold("בדיקת הפתרון"),". אפשר לערוך שורה ולבדוק שוב."]),
    el("li",{},[bold("עזרה: "),"אפשר לבקש ",bold("רמז"),", לעבור ללשונית ",bold("פתרון לדוגמה")," או ללחוץ על ",bold("השוואה"),", בלי לשנות את מה שכתבתם."])
  ];
  return el("details",{class:"pw-help",dir:"rtl"},[el("summary",{text:"איך משתמשים בעוזר הפתרון?"}),el("ol",{},items)]);
}
function practiceWorkspace(ui){
  return el("section",{class:"pw-workspace",dir:"rtl"},[ui]);
}
var practiceViewSerial=0,activePracticeView=null;
function mountPracticeViews(box,workspace,solution){
  var id="practice-view-"+(++practiceViewSerial),active="work",opened=false,comparing=false;
  var tabs=el("div",{class:"pw-tabs",role:"tablist","aria-label":"תצוגת הפתרון"}),panels=el("div",{class:"pw-view-panels",id:id+"-panels"});
  var compareTitle=el("span",{class:"pw-compare-title",text:"השוואת פתרונות"});
  var compare=el("button",{type:"button",class:"pw-compare-button","aria-label":"השוואה","aria-controls":id+"-panels",text:"השוואה",onclick:function(){show(active,!comparing);}});
  var close=el("button",{type:"button",class:"pw-view-close",text:"סגירה","aria-label":"סגירת אזור הפתרון",onclick:function(){collapse();entries.filter(function(e){return e.key===active;})[0].tab.focus();}});
  var controls=el("div",{class:"pw-view-controls"},[tabs,compareTitle,compare,close]);
  var host=el("div",{class:"pw-views",dir:"rtl"},[controls,panels]),entries=[];
  [{key:"work",label:"כתיבת פתרון",panel:workspace},{key:"model",label:"פתרון לדוגמה",panel:solution}].forEach(function(e){
    if(!e.panel)return;
    e.title=el("h4",{class:"pw-panel-title",id:id+"-"+e.key+"-title",text:e.label});e.panel.insertBefore(e.title,e.panel.firstChild);
    e.panel.classList.add("pw-view-panel");e.panel.setAttribute("id",id+"-"+e.key+"-panel");e.panel.setAttribute("tabindex","0");e.panel.hidden=true;
    e.tab=el("button",{type:"button",class:"pw-tab pw-tab-"+e.key,id:id+"-"+e.key+"-tab",role:"tab","aria-label":e.label,"aria-controls":e.panel.getAttribute("id"),text:e.label,onclick:function(){show(e.key,false);}});
    e.tab.addEventListener("keydown",function(event){
      var index=entries.indexOf(e),next;
      if(event.key==="ArrowLeft")next=(index+1)%entries.length;
      else if(event.key==="ArrowRight")next=(index+entries.length-1)%entries.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=entries.length-1;
      else return;
      // Arrow keys move focus; Enter/Space selects, so navigation alone does
      // not reveal the answer. The visual order is right-to-left.
      event.preventDefault();entries.forEach(function(item,i){item.tab.setAttribute("tabindex",i===next?"0":"-1");});entries[next].tab.focus();
    });
    tabs.appendChild(e.tab);panels.appendChild(e.panel);entries.push(e);
  });
  function render(){
    host.classList.toggle("pw-comparing",opened&&comparing);host.classList.toggle("pw-view-open",opened);
    tabs.hidden=opened&&comparing;compareTitle.hidden=!opened||!comparing;close.hidden=!opened;panels.hidden=!opened;
    compare.hidden=!solution;compare.textContent=opened&&comparing?"חזרה ללשוניות":"השוואה";
    compare.setAttribute("aria-label",compare.textContent);compare.setAttribute("aria-pressed",opened&&comparing?"true":"false");
    entries.forEach(function(e){
      var visible=opened&&(comparing||e.key===active),wasVisible=!e.panel.hidden;
      e.tab.setAttribute("aria-selected",opened&&!comparing&&e.key===active?"true":"false");
      e.tab.setAttribute("tabindex",e.key===active?"0":"-1");
      e.title.hidden=!comparing;e.panel.setAttribute("role",comparing?"region":"tabpanel");
      e.panel.setAttribute("aria-labelledby",id+"-"+e.key+(comparing?"-title":"-tab"));
      if(wasVisible&&!visible){e.scrollTop=e.panel.scrollTop;e.scrollLeft=e.panel.scrollLeft;}
      e.panel.hidden=!visible;
      if(visible&&!wasVisible){
        e.panel.dispatchEvent(new Event("practice-show"));typeset(e.panel);
        if(e.scrollTop!==undefined)e.panel.scrollTop=e.scrollTop;if(e.scrollLeft!==undefined)e.panel.scrollLeft=e.scrollLeft;
      }
    });
  }
  function collapse(){closeInputKeys();opened=false;comparing=false;if(activePracticeView===controller)activePracticeView=null;render();}
  function show(key,both){
    closeInputKeys();if(activePracticeView&&activePracticeView!==controller)activePracticeView.collapse();
    active=key;opened=true;comparing=!!both&&!!solution;activePracticeView=controller;render();
  }
  var controller={collapse:collapse};render();box.appendChild(host);return controller;
}
function attachSolutionAnswer(box,workspace,solution){
  var siblings=Array.prototype.slice.call(box.parentNode.children),answer=siblings[siblings.indexOf(box)+1];
  if(!answer||!answer.classList.contains("fill"))return;
  // The existing fields and their listeners move intact; the model answer is a
  // separate static copy, so revealing it cannot overwrite a student's sketch.
  var model=staticCopy(answer);model.classList.add("pw-model-answer");
  childDivs(model,"hint").forEach(function(h){h.remove();});
  model.querySelectorAll(".sp-practice").forEach(function(p){p.remove();});
  model.querySelectorAll("span.blank").forEach(function(sp){
    if(attr(sp,"plot")===null&&attr(sp,"solution-plot")===null||!root.SetPlot)return;
    var plot=el("div"),paragraph=sp.closest("p")||sp;
    paragraph.parentNode.insertBefore(plot,paragraph.nextSibling);
    root.SetPlot.create(plot,{readOnly:true,answer:parseSet(attr(sp,"ans")),marks:[],showNotation:false,input:function(){return el("input");}});
  });
  function answerWording(node){
    if(node.nodeType===3)node.textContent=node.textContent.replace(/כתבו וסרטטו את /g,"");
    else Array.prototype.forEach.call(node.childNodes||node.children,answerWording);
  }
  answerWording(model);
  answer.querySelectorAll(".sp-practice").forEach(function(p){p.open=true;});
  workspace.appendChild(answer);solution.appendChild(model);
}
function initRelationPractice(box,options) {
  options=options||{};
  var start=options.start||attr(box,"start"),steps=childDivs(box,"step"),hints=childDivs(box,"hint"),rows=[];
  if(!steps.length&&!options.start)return;
  var path=steps.map(function(s){return prepLine(attr(s,"line")).full;});
  var vars=(attr(box,"vars")||"").split(",").map(function(v){return v.trim();}).filter(Boolean),target=path[path.length-1]||start;
  if(!vars.length)vars=Object.keys(varsOf(parseRelation(start))).sort();
  var cfg=Object.assign({mode:"rel",vars:vars,solve:attr(box,"solve")||(vars.indexOf("x")>=0?"x":vars[0]),positive:(attr(box,"positive")||"").split(",").filter(Boolean),verify:false},options.cfg||{},{requireJustification:true,explicitCases:true});vars=cfg.vars;
  var paper=el("div",{class:"pw-paper"}),status=el("div",{class:"ix-msg","aria-live":"polite"});
  var revision=0,nextRowId=1,proofMath=new Map();
  var usesPi=tokenize(start).some(function(t){return t.k==="pi";});
  var keys=vars.map(function(v){return [v,v];}).concat(KEYSETS.rel,usesPi?[["π","π"]]:[]);
  function formula(src){return mx(htmlRel(parseRelation(src)));}
  function absoluteMethodLabel(){
    var target=document.getElementById("box-key-abs-solving"),heading=target&&target.querySelector("strong");
    var label=heading&&heading.textContent.match(/^שיטת פתרון \d+\.\d+\.\d+/);
    return label?label[0]:"שיטת פתרון לערך מוחלט";
  }
  function ruleReferences(action,source,context){
    var refs=[],op=action.op;
    function ref(id,label){refs.push({id:id,label:label});}
    var inequality=source&&source.disj.some(function(d){return d.ops.some(function(o){return ["<",">","<=",">="].indexOf(o)>=0;});});
    if(inequality&&(op==="add"||op==="sub"))ref("box-thm-inequalities","כלל (א): חיבור וחיסור");
    if(inequality&&(op==="mul"||op==="div")){
      var operand=parseExpr(action.value),signs=source.disj.map(function(d){return algebraSigns(operand,algebraFacts(d,context||cfg));});
      var positive=signs.every(function(s){return s.length===1&&s[0]===1;}),negative=signs.every(function(s){return s.length===1&&s[0]===-1;});
      ref("box-thm-inequalities",positive?"כלל (ב): כפל וחילוק בחיובי":negative?"כלל (ג): כפל וחילוק בשלילי":"כללים (ב)–(ג): כפל וחילוק לפי הסימן");
    }
    if(op==="abs")ref("box-key-abs-solving",absoluteMethodLabel());
    if(op==="conditions"||op==="conditionReplace"){ref("box-def-intersection","הגדרת חיתוך");ref("box-def-union","הגדרת איחוד");}
    if(op==="conditionReplace"&&(action.edits||[]).some(function(edit){return edit.reason==="denominator";}))ref("box-warn-zero-division","אסור לחלק באפס");
    if(op==="merge")ref("box-def-union","הגדרת איחוד");
    if(op==="formula")ref("box-thm-roots","נוסחת השורשים — סעיף (ג)");
    if(op==="sqrt")ref("box-warn-root-equation","שורש ומשוואה: שני הסימנים");
    if(op==="cbrt"||op==="cube")ref("box-def-root","הגדרת שורש");
    if(op==="log"||op==="exp")ref("box-key-exp-solving","פתרון משוואות מעריכיות ולוגריתמיות");
    return refs;
  }
  function referenceMarkup(refs){
    return refs.length?' <span class="as-rule-links">('+refs.map(function(ref){
      var href=(document.getElementById(ref.id)?"":"01-Introduction.html")+"#"+ref.id;
      return '<a href="'+href+'">'+ref.label+'</a>';
    }).join("; ")+')</span>':"";
  }
  function reasonMarkup(actions,source,context){return mx(actionReason(actions,{source:source||start,cfg:context||cfg,math:true,separator:"",decorate:function(a,text,current){
    return '<span class="as-reason-line">'+text+referenceMarkup(ruleReferences(a,current,context))+'</span>';
  }}));}
  function button(text,fn,cls){return el("button",{type:"button",class:"ix-btn "+(cls||"ix-quiet"),text:text,onclick:fn});}
  function field(kind,label,cls,extraKeys){
    var input=mathInput({type:"text",class:"blank-input "+(cls||""),dir:"ltr",autocomplete:"off",spellcheck:"false","aria-label":label},kind);
    var host=el("span",{class:"as-field"+(kind==="expr"?" as-expr-field":"")},[input]),operandPreview;
    function render(){
      if(!operandPreview)return;
      operandPreview.innerHTML="";
      if(!isMathInput(input)&&input.value.trim())try{operandPreview.innerHTML=mx("\\("+tex(parseExpr(readInput(input)))+"\\)");typeset(operandPreview);}catch(_){}
    }
    if(kind==="expr"){
      operandPreview=el("span",{class:"as-field-preview",dir:"ltr"});host.appendChild(operandPreview);
      input.addEventListener("input",render);input.addEventListener("focus",render);
    }
    var fieldKeys=kind==="rel"?keys:vars.map(function(v){return [v,v];}).concat(KEYSETS.expr.filter(function(k){return vars.indexOf(k[0])<0&&(usesPi||k[1]!=="π");}));
    bindInputKeys(input,fieldKeys.concat(extraKeys||[]),true);
    return {input:input,host:host,render:render};
  }
  function invalidate(from){
    revision++;
    say(status,"");
    if(options.onChange)options.onChange();
    rows.slice(from).forEach(function(r,i){
      r.valid=false;r.editor.hidden=false;r.summary.hidden=true;r.row.classList.remove("as-accepted");
      r.input.removeAttribute("aria-invalid");say(r.msg,"");r.hint.replaceChildren();r.result.replaceChildren();r.reasonResult.replaceChildren();
      if(i){r.editor.querySelectorAll("details").forEach(function(d){d.open=false;});}
    });
  }
  function sourceFor(r){
    var state=proofBefore(r),number=sourceNumber(r,state),record=state.available.filter(function(p){return p.number===number;})[0];
    if(!record)throw new ParseError("שורת המקור אינה זמינה במקרה הנוכחי. בחרו שורה קודמת שנבדקה.");
    return record.work;
  }
  function lineId(number){return number===1?"start":rows[number-2]&&rows[number-2].id;}
  function lineNumber(id){
    if(id==="start")return 1;
    var index=rows.findIndex(function(r){return r.id===id;});
    if(index<0)throw new ParseError("השורה שצוטטה נמחקה. בחרו מחדש שורת מקור.");return index+2;
  }
  function proofBefore(r){
    var index=rows.indexOf(r);if(index<0)index=rows.length;
    if(r.prefix&&r.prefix.revision===revision&&r.prefix.index===index)return r.prefix.state;
    var entries=rows.slice(0,index).map(function(row){return proofEntry(row);}),state=checkLineProof(start,entries,cfg,proofMath);
    if(state.results.some(function(v){return !v.ok;}))throw new ParseError("תקנו קודם את השורות שלפני הצעד הזה.");
    r.prefix={revision:revision,index:index,state:state};return state;
  }
  function cfgFor(r){var s=proofBefore(r);return s.stack.length?s.stack[s.stack.length-1].cfg:cfg;}
  function sourceNumber(r,state){return r.sourceId&&r.sourceId!=="auto"?lineNumber(r.sourceId):state.available[state.available.length-1].number;}
  function specialKind(r){
    var op=r.reasonFields[0]&&r.reasonFields[0].select.value;
    return {splitOr:"open",endCase:"close",merge:"merge",combine:"combine"}[op]||null;
  }
  function proofEntry(r,text,actions){
    var state=proofBefore(r),kind=specialKind(r),entry={source:sourceNumber(r,state),text:arguments.length>1?text:readInput(r.input)};
    if(kind){
      if(r.reasonFields.length!==1)throw new ParseError("פתיחה, סיום ואיחוד מקרים נכתבים בשורה נפרדת.");
      var spec=r.reasonFields[0].tools.read(r.reasonFields[0].select.value);entry.kind=kind;
      if(kind==="open"){entry.split={at:spec.at};entry.choice=spec.choice;}
      else if(kind==="close"){entry.opening=lineNumber(spec.opening);entry.conclusion=lineNumber(spec.conclusion);}
      else if(kind==="merge")entry.closures=spec.lines.map(lineNumber);
      else entry.sources=[entry.source].concat(spec.lines.map(lineNumber));
    }else entry.actions=actions||justification(r);
    return entry;
  }
  function replayRow(r,entry){return checkLineProof(start,rows.slice(0,rows.indexOf(r)).map(function(row){return proofEntry(row);}).concat([entry]),cfg,proofMath);}
  function updateSource(r){
    if(!r.sourceSelect)return;
    try{
      var state=proofBefore(r),value=r.sourceId||"auto",selected=sourceNumber(r,state);
      r.sourceSelect.replaceChildren(el("option",{value:"auto",text:"השורה הזמינה האחרונה ("+state.available[state.available.length-1].number+")"}));
      state.available.forEach(function(p){r.sourceSelect.appendChild(el("option",{value:lineId(p.number),text:"שורה "+p.number}));});
      if(value!=="auto"&&!state.available.some(function(p){return lineId(p.number)===value;}))r.sourceSelect.appendChild(el("option",{value:value,text:"השורה שצוטטה אינה זמינה"}));
      r.sourceSelect.value=value;
      var record=state.available.filter(function(p){return p.number===selected;})[0];
      r.sourcePreview.innerHTML=record?formula(record.work):"";
      r.row.style.setProperty?r.row.style.setProperty("--case-depth",String(state.stack.length)):r.row.style.marginInlineStart=(state.stack.length*12)+"px";
      r.scopeNote.innerHTML=state.stack.length?"במקרה שנפתח בשורה "+state.stack[state.stack.length-1].number+": "+formula(state.stack[state.stack.length-1].text):"";
      typeset(r.sourcePreview);typeset(r.scopeNote);
    }catch(e){r.sourcePreview.textContent=errMsg(e);}
  }
  function proofReason(entry,record){
    if(entry.kind==="open")return "פתיחת מקרה מתוך שורה "+entry.source;
    if(entry.kind==="close")return "סיום המקרה משורה "+entry.opening+", לפי המסקנה בשורה "+entry.conclusion;
    if(entry.kind==="merge")return "איחוד המקרים משורה "+entry.source+", לפי שורות הסיום "+entry.closures.join(", ");
    if(entry.kind==="combine")return "שילוב התנאים בשורות "+entry.sources.join(", ");
    return "לפי שורה "+entry.source+": "+reasonMarkup(entry.actions,sourceFor(record),cfgFor(record));
  }
  function write(r,src,reason,actions){
    invalidate(rows.indexOf(r));r.reason=reason||"";
    setJustification(r,actions);
    src=relationSource(parseRelation(src));
    r.input.value=isMathInput(r.input)?inputLatex(src,"rel"):spaceLogicalWords(src).value;
    if(!isMathInput(r.input))r.input.setSelectionRange(r.input.value.length,r.input.value.length);
    r.input.focus();preview(r);
  }
  function apply(r,src,reason,actions){
    try {
      var verdict=checkJustifiedStep(sourceFor(r),src,actions,cfgFor(r));
      if(!verdict.ok)throw new ParseError(verdict.msg);
      write(r,src,reason,actions);check(rows.indexOf(r),true);
    }catch(e){say(r.msg,errMsg(e),"bad");}
  }
  function preview(r){
    r.preview.innerHTML="";
    if(!isMathInput(r.input)&&r.input.value.trim())try {r.preview.innerHTML=formula(r.input.value);typeset(r.preview);}catch(_){}
  }
  function accept(r,verdict){
    var src=readInput(r.input);r.valid=true;r.summary.replaceChildren();
    r.summary.appendChild(el("div",{class:"as-formula",dir:"ltr",html:formula(src)}));
    var entry=proofEntry(r);
    if(!r.sourceId||r.sourceId==="auto")r.sourceId=lineId(entry.source);
    r.summary.appendChild(el("div",{class:"as-reason",dir:"rtl"},[
      el("span",{class:"as-step-feedback"},[el("span",{class:"as-check","aria-hidden":"true",text:"✓"}),el("span",{text:"הצעד נכון!"})]),
      el("span",{html:proofReason(entry,r)})
    ]));
    r.summary.appendChild(button("עריכה",function(){invalidate(rows.indexOf(r));updateSource(r);r.reasonFields.forEach(function(f){f.refresh();});r.input.focus();}));
    r.editor.hidden=true;r.summary.hidden=false;r.row.classList.add("as-accepted");typeset(r.summary);
  }
  function check(upto,advance){
    var active=rows.slice(0,upto+1),lines=[];
    if(!advance)while(active.length&&!active[active.length-1].input.value.trim())active.pop();
    if(!active.length){say(status,"כתבו את השורה הבאה בפתרון.","info");return false;}
    for(var i=0;i<active.length;i++)try {lines.push(readInput(active[i].input));}
    catch(e){active[i].editor.hidden=false;active[i].summary.hidden=true;active[i].input.setAttribute("aria-invalid","true");say(active[i].msg,errMsg(e),"bad");say(status,"הבדיקה נעצרה בשורה "+(i+1)+".","info");return false;}
    var proofs=[];
    try{for(var pi=0;pi<active.length;pi++){proofs.push(proofEntry(active[pi]));if(checkLineProof(start,proofs,cfg,proofMath).results.some(function(v){return !v.ok;}))break;}}
    catch(e){say(status,"הבדיקה נעצרה. "+errMsg(e),"bad");return false;}
    var result=checkLineProof(start,proofs,cfg,proofMath),failed=-1;closeInputKeys();
    result.results.forEach(function(v,i){
      var r=active[i];r.input.setAttribute("aria-invalid",v.ok?"false":"true");
      if(v.ok)accept(r,v);else {failed=i;r.editor.hidden=false;r.summary.hidden=true;say(r.msg,v.msg,"bad");}
    });
    if(failed>=0){
      rows.slice(failed+1).forEach(function(r){r.valid=false;r.editor.hidden=false;r.summary.hidden=true;r.row.classList.remove("as-accepted");say(r.msg,"ממתין לתיקון הצעד הקודם.","info");});
      say(status,"הבדיקה נעצרה בשורה המסומנת. תקנו אותה ובדקו שוב.","info");return false;
    }
    var note=result.done?"✓ הפתרון נכון.":result.stack.length?"✓ הצעד נכון. המקרה משורה "+result.stack[result.stack.length-1].number+" עדיין פתוח; בסיום בחרו סיום מקרה.":result.pending.length?"✓ הצעד נכון. נותר לסיים ולאחד את כל המקרים.":advance?"✓ הצעד נכון! מה הצעד הבא?":"✓ כל הצעדים שנבדקו נכונים. אפשר להמשיך.";
    say(status,note,"good");
    if(advance&&!result.done){if(active.length===rows.length)add(true);else rows[active.length].input.focus();}
    return true;
  }
  function nextHint(r,reveal){
    r.hint.replaceChildren();
    function message(text){var msg=el("div");r.hint.appendChild(msg);say(msg,text,"info");}
    try {
      var cfg=cfgFor(r);
      var source=sourceFor(r),node=parseRelation(source),stages=[start].concat(path),at=-1;
      if(isSolved(node,cfg.solve)){message(proofBefore(r).stack.length?"המסקנה כבר מצומצמת. בחרו סיום מקרה וציינו את שורות הפתיחה והמסקנה.":proofBefore(r).pending.length?"נותר לאחד את המקרים שסיימתם.":"הפתרון כבר מצומצם. אפשר לבדוק אותו.");return;}
      if(cfg.explicitCases&&cfg.vars.length===1&&node.disj.length===1){
        var denominator=relationParts(source).filter(function(p){return p.node.t==="div"&&hasVar(p.node.b)&&algebraSigns(p.node.b,algebraFacts(node.disj[0],cfg)).indexOf(0)>=0;})[0];
        if(denominator){
          var name=expressionSource(denominator.node.b),partitionPlan=[{op:"partition",split:{conditions:[name+">0",name+"<0",name+"=0"],excluded:[null,null,{reason:"denominator",value:name}]}}];
          var partitionLine=executeAction(source,partitionPlan[0],cfg),partitionCheck=checkJustifiedStep(source,partitionLine,partitionPlan,cfg);
          if(partitionCheck.ok){
            r.hint.appendChild(el("p",{html:reasonMarkup(partitionPlan,source,cfg)}));
            if(reveal){r.hint.appendChild(el("div",{class:"as-formula",dir:"ltr",html:formula(partitionLine)}));r.hint.appendChild(button("יישום הצעד והמשך",function(){apply(r,partitionLine,actionReason(partitionPlan),partitionPlan);}));}
            typeset(r.hint);return;
          }
        }
      }
      var history=[start].concat(rows.slice(0,rows.indexOf(r)).map(function(row){return readInput(row.input);}));
      // Factoring and expanding are distinct stages, although each side has
      // the same value. Otherwise the hint can skip the factorization it needs.
      function stageKey(a){
        function constants(n){var q=exactFraction(n);if(q)return fractionNode(q);var out=Object.assign({},n);["a","b","n","base"].forEach(function(k){if(n[k]&&typeof n[k]==="object")out[k]=constants(n[k]);});return out;}
        return relationSource({t:"rel",disj:a.disj.map(function(d){return {ops:d.ops,parts:d.parts.map(constants)};})});
      }
      function sameStage(a,b){return stageKey(a)===stageKey(b);}
      function visited(s){var n=parseRelation(s);return history.some(function(h){return sameStage(n,parseRelation(h));});}
      function progress(n){return relationSize(n)+4*n.disj.reduce(function(s,d){return s+comparisonChunks(d).filter(function(c){return !isolatedComparison(c,cfg.solve);}).length;},0);}
      stages.forEach(function(s,i){
        var n=parseRelation(s);
        if(sameStage(n,node))at=i;
      });
      var candidate=at>=0&&at<path.length?path[at]:null,note=at>=0&&at<steps.length?steps[at]:null;
      var reduced=relationCandidates(source,cfg).filter(function(c){return c.source!==relationSource(node)&&progress(parseRelation(c.source))<progress(node)&&!visited(c.source);})[0],reason="";
      if(reduced){candidate=reduced.source;note=null;reason=reduced.logical?"וגם מתאר חיתוך; או מתאר איחוד. מצמצמים תנאים ומאחדים קטעים חופפים.":"מפשטים את הביטויים בשורה הנוכחית.";}
      if(candidate&&visited(candidate)){candidate=null;note=null;}
      if(!candidate){
        // A shorter earlier model line is not necessarily progress. Prefer the
        // most reduced valid continuation, and never suggest a visited line.
        candidate=path.filter(function(s){return !visited(s)&&progress(parseRelation(s))<progress(node)&&judgeStep(node,parseRelation(s),null,cfg).ok;})
          .sort(function(a,b){return progress(parseRelation(a))-progress(parseRelation(b));})[0];note=null;
      }
      var suggestedPlan=candidate&&inferJustification(source,candidate,cfg);
      if(candidate&&!suggestedPlan){candidate=null;note=null;}
      if(!candidate){
        var denominators=relationParts(source).filter(function(p){return p.node.t==="div"&&hasVar(p.node.b);}).map(function(p){return {op:"mul",value:expressionSource(p.node.b)};});
        var proposed=linearPlan(source,cfg).slice(0,1).concat(denominators,[{op:"conditions"},{op:"simplify"},{op:"abs"},{op:"zero"},{op:"sqrt"},{op:"cbrt"},{op:"cube"}]);
        for(var pi=0;pi<proposed.length;pi++)try{
          var generated=executeAction(source,proposed[pi],cfg),best=relationCandidates(generated,cfg)[0];
          var plan=[proposed[pi]];if(best.logical)plan.push({op:"conditions"});
          if(checkJustifiedStep(source,best.source,plan,cfg).ok&&!visited(best.source)){candidate=best.source;suggestedPlan=plan;reason=actionReason(plan);break;}
        }catch(_){}
      }
      if(!candidate)throw new ParseError("אפשר לבחור פעולה על האגפים או לפצל את המקרים לעבודה נפרדת.");
      var candidateReduction=relationCandidates(candidate,cfg)[0],reducedConditions=false;
      if(candidateReduction.source!==relationSource(parseRelation(candidate))&&!visited(candidateReduction.source)&&progress(parseRelation(candidateReduction.source))<progress(parseRelation(candidate))){
        candidate=candidateReduction.source;reducedConditions=!!candidateReduction.logical;suggestedPlan=null;
      }
      var justificationPlan=suggestedPlan||inferJustification(source,candidate,cfg);
      var verdict=checkJustifiedStep(source,candidate,justificationPlan,cfg);
      if(!verdict.ok)throw new ParseError("אפשר להיעזר בפתרון לדוגמה או לבחור פעולה על האגפים.");
      if(note)r.hint.appendChild(note.cloneNode(true));
      else r.hint.appendChild(el("p",{dir:"rtl",html:reasonMarkup(justificationPlan,source)}));
      if(reducedConditions)r.hint.appendChild(el("p",{text:"מצמצמים גם את התנאים בעזרת חיתוך ואיחוד."}));
      if(reveal){
        r.hint.appendChild(el("div",{class:"as-formula",dir:"ltr",html:formula(candidate)}));
        r.hint.appendChild(button("יישום הצעד והמשך",function(){apply(r,candidate,actionReason(justificationPlan),justificationPlan);}));
      }
      typeset(r.hint);
    }catch(e){message(errMsg(e));}
  }
  function showActionResult(r,next,reason,preserveSelection,actions,host){
    var cfg=cfgFor(r);
    host=host||r.result;
    var source=sourceFor(r),candidates=(preserveSelection?[{source:relationSource(parseRelation(next)),label:"הצעד שנבחר"}]:relationCandidates(next,cfg)).filter(function(c){
      if(cfg.assumption&&c.logical&&!actions.some(function(a){return a.op==="conditions";}))return false;
      return checkJustifiedStep(source,c.source,actions.concat(c.logical?[{op:"conditions"}]:[]),cfg).ok;
    });
    if(!candidates.length)throw new ParseError(checkJustifiedStep(source,next,actions,cfg).msg||"הפעולה אינה נותנת צעד חדש.");
    var chosen=candidates[0],display=el("div",{class:"as-formula",dir:"ltr",html:formula(chosen.source)});
    function selectedActions(){return actions.concat(chosen.logical?[{op:"conditions"}]:[]);}
    function explanation(){return actionReason(selectedActions(),{source:source,cfg:cfg});}
    var caption=el("p",{class:"as-reason",dir:"rtl",html:reasonMarkup(selectedActions(),source,cfg)});
    host.replaceChildren(display,caption);
    if(candidates.length>1){
      var alternatives=el("details",{class:"as-alternatives"},[el("summary",{text:"צורות נוספות של הצעד"})]),choices=el("div",{class:"as-candidates"});
      candidates.forEach(function(candidate){
        var choice=button(candidate.label,function(){chosen=candidate;display.innerHTML=formula(chosen.source);caption.innerHTML=reasonMarkup(selectedActions(),source,cfg);choices.querySelectorAll("button").forEach(function(b){b.setAttribute("aria-pressed",b===choice?"true":"false");});typeset(display);typeset(caption);});
        choice.setAttribute("aria-pressed",candidate===chosen?"true":"false");
        choice.appendChild(el("span",{dir:"ltr",html:formula(candidate.source)}));choices.appendChild(choice);
      });alternatives.appendChild(choices);host.appendChild(alternatives);
    }
    host.appendChild(button("יישום הצעד והמשך",function(){apply(r,chosen.source,explanation(),actions.concat(chosen.logical?[{op:"conditions"}]:[]));}));typeset(host);
  }
  function toolsFor(r,owner){
    function sourceFor(){return sourceBeforeAction(r,owner);}
    function changed(){invalidate(rows.indexOf(r));refreshFollowing(r,owner);}
    function typedPicker(kind,refresh,pick,highlight){
      var f=field(kind,"הביטוי שרוצים לפשט","as-fragment-input"),matches=el("div",{class:"as-fragment-matches"}),msg=el("div",{class:"ix-msg","aria-live":"polite"}),pending=false;
      var host=el("div",{class:"as-fragment-picker"},[el("label",{class:"as-fragment-label"},[el("span",{text:"הביטוי שרוצים לפשט"}),f.host])]);
      function clear(){pending=false;f.input.value="";f.render();matches.replaceChildren();say(msg,"");highlight([]);}
      function selected(part){pending=false;f.input.value=isMathInput(f.input)?inputLatex(part.source,kind):spaceLogicalWords(part.source).value;f.render();matches.replaceChildren();say(msg,"");highlight([]);}
      function select(part){try{pick(part);selected(part);}catch(e){say(msg,errMsg(e),"bad");}}
      function find(){
        var before=readInput(f.input);
        try{
          refresh();var parts=fragmentMatches(sourceFor(),before,kind);matches.replaceChildren();highlight(parts);
          if(!parts.length)throw new ParseError("החלק שכתבתם אינו נמצא בשורת המקור. כתבו אותו כפי שהוא מופיע בשורה.");
          if(parts.length===1){select(parts[0]);return;}
          say(msg,"החלק מופיע כמה פעמים. בחרו את המופע שרוצים לפשט.","info");
          var source=parseRelation(sourceFor());
          parts.forEach(function(part,i){
            var branch=kind==="expr"?+part.path.split(".")[0]:part.kind==="and"?part.branch:null;
            var where=branch===null?"חלופות "+(part.from+1)+"–"+part.to:"חלופה "+(branch+1);
            if(kind==="rel"&&part.kind==="and")where+=", תנאים "+(part.from+1)+"–"+part.to;
            if(kind==="expr")where+=", אגף "+(+part.path.split(".")[1]+1);
            var b=button("מופע "+(i+1)+" משמאל — "+where,function(){select(part);},"ix-quiet as-fragment-match");
            b.setAttribute("data-fragment-path",part.path);
            b.appendChild(el("span",{class:"as-formula",dir:"ltr",html:formula(branch===null?part.source:relationSource({t:"rel",disj:[source.disj[branch]]}))}));matches.appendChild(b);
          });typeset(matches);
        }catch(e){say(msg,errMsg(e),"bad");}
      }
      f.input.addEventListener("input",function(){pending=!!readInput(f.input).trim();matches.replaceChildren();highlight([]);say(msg,"");changed();});
      f.input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();find();}});
      host.appendChild(button("בחירת החלק",find));host.appendChild(msg);host.appendChild(matches);
      return {host:host,clear:clear,selected:selected,guard:function(){if(pending)throw new ParseError("לחצו על בחירת החלק שהקלדתם, או נקו את שדה הבחירה.");}};
    }
    var absolute=el("div",{class:"as-absolute"});
    var absRule=el("div",{class:"as-abs-rule"}),absChoices=el("div",{class:"as-parts as-abs-choices"});
    var absFingerprint=null,absSelected=null,absButtons=[];
    absolute.appendChild(el("p",{class:"as-reason",text:"איזה ערך מוחלט מפרקים?"}));absolute.appendChild(absChoices);
    function refreshAbsolute(){
      var src=sourceFor(r);
      if(src!==absFingerprint){
        var parts=absoluteParts(src);absFingerprint=src;absSelected=parts.length===1?parts[0]:null;
        if(owner.initialAction&&owner.initialAction.path!==undefined){
          try{absSelected=selectedAbsolute(src,owner.initialAction);}catch(_){}owner.initialAction=null;
        }
        absChoices.replaceChildren();absButtons=[];
        parts.forEach(function(part,i){
          var pick=button("",function(){absSelected=part;changed();explainAbsolute();},"ix-quiet as-abs-choice");
          pick.setAttribute("data-abs-path",part.path);pick.setAttribute("aria-label","פירוק "+part.source+" — מופע "+(i+1));
          pick.innerHTML=mx("\\("+part.tex+"\\)");
          if(parts.some(function(other){return other!==part&&other.source===part.source;}))pick.appendChild(el("span",{text:" (מופע "+(i+1)+")"}));
          absButtons.push({button:pick,part:part});absChoices.appendChild(pick);
        });
      }
      explainAbsolute();typeset(absChoices);
    }
    function readAbsolute(){
      if(sourceFor(r)!==absFingerprint){refreshAbsolute();throw new ParseError("השורה הקודמת השתנתה. בחרו מחדש איזה ערך מוחלט לפרק.");}
      if(!absSelected)throw new ParseError(absoluteParts(absFingerprint).length?"בחרו איזה ערך מוחלט לפרק.":"אין בשורה ערך מוחלט לפירוק.");
      return {op:"abs",path:absSelected.path,expression:absSelected.source};
    }
    function explainAbsolute(){
      absRule.replaceChildren();r.result.replaceChildren();
      absButtons.forEach(function(b){b.button.setAttribute("aria-pressed",absSelected&&b.part.path===absSelected.path?"true":"false");});
      try {
        var result=expandAbsolute(sourceFor(r),readAbsolute(),cfgFor(r));
        absRule.appendChild(el("p",{html:mx(result.note)}));
        if(result.cases)result.cases.forEach(function(c){
          absRule.appendChild(el("div",{class:"as-or-case"},[el("span",{text:"כאשר"}),el("span",{class:"as-formula",dir:"ltr",html:formula(c.condition)}),el("span",{text:"מחליפים לפי"}),el("span",{class:"as-formula",dir:"ltr",html:mx("\\("+c.replacement+"\\)")})]));
        });
        if(result.rule){
          var halves=result.rule.split(" \\iff "),cases=halves[1].split(/\\quad\\text\{או\}\\quad/);
          function mathPart(src){return el("span",{class:"math inline",dir:"ltr",text:"\\("+src+"\\)"});}
          var alternatives=el("span",{class:"as-rule-cases"});
          cases.forEach(function(c,i){
            if(i)alternatives.appendChild(el("span",{class:"ix-or",dir:"rtl",text:"או"}));
            alternatives.appendChild(mathPart(c.trim()));
          });
          var rule=el("div",{class:"as-formula as-rule-equivalence",dir:"ltr"},[
            mathPart(halves[0]),mathPart("\\iff"),alternatives
          ]);
          absRule.appendChild(rule);
        }
        typeset(absRule);
      }catch(e){say(absRule,errMsg(e),"info");}
    }
    absolute.appendChild(absRule);
    absolute.appendChild(el("a",{href:"#box-key-abs-solving",text:absoluteMethodLabel(),class:"as-rule-link"}));
    var replacement=el("div",{class:"as-replacements"});
    var choices=el("div",{class:"as-parts"}),list=el("div",{class:"as-replacement-list"}),replaceSource=el("div",{class:"as-formula",dir:"ltr"});
    var selected=[],bank=[],fingerprint=null;
    function selection(){bank.forEach(function(b){b.input.disabled=!b.input.checked&&selected.some(function(s){return s.part.paths.some(function(p){return b.part.paths.some(function(q){return overlappingParts(p,q);});});});});changed();}
    function partEdits(part,value){return part.paths.map(function(path){return {path:path,before:part.source,after:value};});}
    function edits(){return selected.reduce(function(all,s){return all.concat(partEdits(s.part,readInput(s.field.input)));},[]);}
    function choose(part,checkbox){
      if(!checkbox.checked){var old=selected.filter(function(s){return s.part.path===part.path;})[0];if(old)old.row.remove();selected=selected.filter(function(s){return s!==old;});replacePicker.clear();selection();return;}
      var existing=selected.filter(function(s){return s.part.paths.join()===part.paths.join();})[0];
      if(existing){existing.field.input.focus();return;}
      if(selected.some(function(s){return s.part.paths.some(function(p){return part.paths.some(function(q){return overlappingParts(p,q);});});}))throw new ParseError("החלק חופף לחלק שכבר נבחר. מחקו קודם את הבחירה הקודמת.");
      replacePicker.selected(part);
      var f=field("expr","הביטוי החלופי","as-replacement-input"),msg=el("div",{class:"ix-msg","aria-live":"polite"});
      var item=el("div",{class:"as-replacement", "data-path":part.path},[el("span",{dir:"ltr",html:mx("\\("+part.tex+"\\)")}),el("span",{text:"מחליפים ב־"}),f.host]);
      if(part.paths.length>1)item.appendChild(el("span",{class:"as-occurrences",text:"בכל "+part.paths.length+" המופעים"}));
      item.appendChild(button("בדיקת ההחלפה",function(){try {replacePicker.guard();replaceRelationParts(sourceFor(r),partEdits(part,readInput(f.input)),cfgFor(r));say(msg,"✓ ההחלפה נכונה.","good");}catch(e){say(msg,errMsg(e),"bad");}}));
      item.appendChild(button("מחיקת הבחירה",function(){checkbox.checked=false;choose(part,checkbox);},"ix-quiet"));
      var help=el("details",{class:"as-suggestions"},[el("summary",{text:"עזרה: הצגת החלפות אפשריות"})]),suggestions=el("div",{class:"as-candidates"});
      help.appendChild(suggestions);item.appendChild(help);
      help.addEventListener("toggle",function(){if(!help.open)return;
        suggestions.replaceChildren();
        var facts=algebraFacts({parts:[],ops:[]},cfgFor(r)),candidates=algebraCandidates(part.node,facts);
        candidates.forEach(function(candidate){
          try{replaceRelationParts(sourceFor(r),partEdits(part,candidate.source),cfgFor(r));}catch(_){return;}
          var choice=button(candidate.label,function(){
            f.input.value=isMathInput(f.input)?inputLatex(candidate.source,"expr"):candidate.source;
            if(!isMathInput(f.input))f.input.setSelectionRange(f.input.value.length,f.input.value.length);
            changed();say(msg,"✓ ההחלפה נכונה.","good");f.input.focus();
          });
          choice.setAttribute("aria-label",candidate.label+": "+candidate.source);
          choice.innerHTML=mx("\\("+tex(candidate.node)+"\\)");suggestions.appendChild(choice);
        });
        if(!suggestions.children.length)suggestions.appendChild(el("span",{text:"אין כאן פישוט נוסף מוצע. אפשר לכתוב החלפה בעצמכם."}));
        typeset(suggestions);
      });
      item.appendChild(msg);f.input.addEventListener("input",function(){say(msg,"");changed();});
      selected.push({part:part,field:f,row:item});list.appendChild(item);selection();typeset(item);f.input.focus();
    }
    function refreshParts(){
      var src=sourceFor(r);replaceSource.innerHTML=formula(src);
      if(fingerprint!==src){
        fingerprint=src;selected=[];bank=[];choices.replaceChildren();list.replaceChildren();r.result.replaceChildren();
        replacePicker.clear();
        relationPartGroups(src).forEach(function(part){
          var count=part.paths.length>1?" — "+part.paths.length+" מופעים":"";
          var input=el("input",{type:"checkbox","data-part":part.path,"aria-label":"החלפת הביטוי "+part.source+count});
          input.addEventListener("change",function(){choose(part,input);});bank.push({input:input,part:part});
          choices.appendChild(el("label",{class:"as-part"},[input,el("span",{dir:"ltr",html:mx("\\("+part.tex+"\\)")}),count?el("span",{class:"as-occurrences",text:count}):null]));
        });
      }
      typeset(replacement);
    }
    var replacePicker=typedPicker("expr",refreshParts,function(part){choose(Object.assign({},part,{paths:[part.path]}),{checked:true});},function(parts){bank.forEach(function(b){b.input.parentNode.classList.toggle("as-part-match",parts.some(function(p){return b.part.paths.indexOf(p.path)>=0;}));});});
    replacement.appendChild(replaceSource);replacement.appendChild(replacePicker.host);replacement.appendChild(choices);replacement.appendChild(list);
    var conditions=el("div",{class:"as-conditions"},[el("p",{class:"as-reason",text:"כתבו או בחרו את החלק שרוצים לפשט, ואז את התוצאה והנימוק. וגם הוא חיתוך; או הוא איחוד."})]);
    var conditionSource=el("div",{class:"as-formula",dir:"ltr"}),conditionChoices=el("div",{class:"as-parts"}),conditionList=el("div",{class:"as-condition-list"});
    var conditionSelected=[],conditionBank=[],conditionFingerprint=null;
    function conditionSelection(){
      conditionBank.forEach(function(b){b.input.disabled=!b.input.checked&&conditionSelected.some(function(s){return conditionOverlap(s.part,b.part);});});changed();
    }
    function currentConditionSource(){
      var src=sourceFor(r);
      if(src!==conditionFingerprint){refreshConditions();throw new ParseError("השורה הקודמת השתנתה. בחרו מחדש את החלקים לפישוט.");}
      return src;
    }
    function chooseCondition(part,checkbox){
      if(!checkbox.checked){
        var old=conditionSelected.filter(function(s){return s.part.path===part.path;})[0];if(old)old.row.remove();
        conditionSelected=conditionSelected.filter(function(s){return s!==old;});conditionPicker.clear();conditionSelection();return;
      }
      var existing=conditionSelected.filter(function(s){return s.part.path===part.path;})[0];
      if(existing){existing.field.input.focus();return;}
      if(conditionSelected.some(function(s){return conditionOverlap(s.part,part);}))throw new ParseError("החלק חופף לחלק שכבר נבחר. מחקו קודם את הבחירה הקודמת.");
      conditionPicker.selected(part);
      var f=field("rel","הפישוט של התנאים שנבחרו","as-condition-input",[["∅","∅"],["ℝ","ℝ"]]),msg=el("div",{class:"ix-msg","aria-live":"polite"});
      var reason=el("select",{class:"as-condition-reason","aria-label":"נימוק לפישוט"},[
        el("option",{value:"conditions",text:"חיתוך ואיחוד תנאים"}),el("option",{value:"denominator",text:"אין פתרונות במקרה הזה — המכנה מתאפס"})]);reason.value="conditions";
      var evidence=field("expr","המכנה שמתאפס","as-condition-denominator");
      var exclusion=el("div",{class:"as-condition-exclusion"},[el("label",{},[el("span",{text:"המכנה שמתאפס"}),evidence.host]),el("span",{class:"as-reason",text:"כתבו ∅ בתוצאה: אין פתרונות במקרה הזה."})]);exclusion.hidden=true;
      var item=el("div",{class:"as-replacement as-condition-replacement","data-condition-path":part.path},[
        el("div",{class:"as-formula",dir:"ltr",html:formula(part.source)}),el("span",{text:"התוצאה לאחר הפישוט"}),f.host,
        el("label",{class:"as-condition-rule"},[el("span",{text:"נימוק"}),reason]),exclusion
      ]);
      function edit(after){return {path:part.path,before:part.source,after:after===undefined?readInput(f.input):after,reason:reason.value,value:reason.value==="denominator"?readInput(evidence.input):""};}
      function checkCondition(){
        try{conditionPicker.guard();executeAction(currentConditionSource(),{op:"conditionReplace",edits:[edit()]},cfgFor(r));say(msg,"✓ הפישוט נכון.","good");}
        catch(e){say(msg,errMsg(e),"bad");}
      }
      item.appendChild(button("בדיקת הפישוט",checkCondition));
      item.appendChild(button("מחיקת הבחירה",function(){checkbox.checked=false;chooseCondition(part,checkbox);},"ix-quiet"));
      var help=el("details",{class:"as-suggestions"},[el("summary",{text:"עזרה: הצגת פישוטים אפשריים"})]),suggestions=el("div",{class:"as-candidates"});
      help.appendChild(suggestions);item.appendChild(help);
      help.addEventListener("toggle",function(){if(!help.open)return;
        suggestions.replaceChildren();
        try {
          var src=currentConditionSource();
          (reason.value==="denominator"?[{source:"∅",label:"אין פתרונות במקרה הזה"}]:relationCandidates(part.source,cfgFor(r))).forEach(function(candidate){
            if(candidate.source===part.source)return;
            try{executeAction(src,{op:"conditionReplace",edits:[edit(candidate.source)]},cfgFor(r));}catch(_){return;}
            var choice=button(candidate.label,function(){
              try{
                conditionPicker.guard();executeAction(currentConditionSource(),{op:"conditionReplace",edits:[edit(candidate.source)]},cfgFor(r));
                f.input.value=isMathInput(f.input)?inputLatex(candidate.source,"rel"):spaceLogicalWords(candidate.source).value;
                if(!isMathInput(f.input))f.input.setSelectionRange(f.input.value.length,f.input.value.length);
                changed();say(msg,"✓ הפישוט נכון.","good");f.input.focus();
              }catch(e){say(msg,errMsg(e),"bad");}
            });
            choice.setAttribute("aria-label",candidate.label+": "+candidate.source);
            choice.innerHTML=formula(candidate.source);suggestions.appendChild(choice);
          });
          if(!suggestions.children.length)suggestions.appendChild(el("span",{text:"אין כאן פישוט נוסף מוצע. אפשר לכתוב החלפה בעצמכם."}));
          typeset(suggestions);
        }catch(e){say(msg,errMsg(e),"bad");}
      });
      item.appendChild(msg);f.input.addEventListener("input",function(){say(msg,"");changed();});
      f.input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();checkCondition();}});
      function reasonChanged(){exclusion.hidden=reason.value!=="denominator";help.open=false;suggestions.replaceChildren();say(msg,"");changed();}
      reason.addEventListener("change",reasonChanged);evidence.input.addEventListener("input",reasonChanged);
      conditionSelected.push({part:part,field:f,row:item,edit:edit});conditionList.appendChild(item);conditionSelection();typeset(item);f.input.focus();
    }
    function refreshConditions(){
      var src=sourceFor(r);conditionSource.innerHTML=formula(src);
      if(src!==conditionFingerprint){
        conditionFingerprint=src;conditionSelected=[];conditionBank=[];conditionChoices.replaceChildren();conditionList.replaceChildren();r.result.replaceChildren();
        conditionPicker.clear();
        conditionParts(src).forEach(function(part){
          var checkbox=el("input",{type:"checkbox","data-condition":part.path,"aria-label":"פישוט "+part.source});
          checkbox.addEventListener("change",function(){chooseCondition(part,checkbox);});conditionBank.push({input:checkbox,part:part});
          conditionChoices.appendChild(el("label",{class:"as-part"},[checkbox,el("span",{dir:"ltr",html:formula(part.source)})]));
        });
      }typeset(conditions);
    }
    var conditionPicker=typedPicker("rel",refreshConditions,function(part){
      var choice=conditionBank.filter(function(b){return b.part.path===part.path;})[0];
      if(choice.input.disabled)throw new ParseError("החלק חופף לחלק שכבר נבחר. מחקו קודם את הבחירה הקודמת.");
      choice.input.checked=true;chooseCondition(part,choice.input);
    },function(parts){conditionBank.forEach(function(b){b.input.parentNode.classList.toggle("as-part-match",parts.some(function(p){return p.path===b.part.path;}));});});
    conditions.appendChild(conditionSource);conditions.appendChild(conditionPicker.host);conditions.appendChild(conditionChoices);conditions.appendChild(conditionList);
    var orPanel=el("div",{class:"as-or-picker"}),orChoices=el("div",{class:"as-formula as-or-expression",dir:"ltr"}),orPreview=el("div",{class:"as-or-preview"});
    var orFingerprint=null,orSelected=null,orCase=null,orButtons=[];
    orPanel.appendChild(el("p",{class:"as-reason",text:"סמנו את ה־או בשורת המקור, ואז בחרו מקרה אחד לפתיחה."}));
    orPanel.appendChild(orChoices);orPanel.appendChild(orPreview);
    function previewOr(){
      orPreview.replaceChildren();
      orButtons.forEach(function(b){b.button.setAttribute("aria-pressed",b.at===orSelected?"true":"false");});
      if(orSelected===null)return;
      splitRelationCases(orFingerprint,{at:orSelected},cfgFor(r)).forEach(function(c,i){
        var pick=button("בחירת מקרה "+(i+1),function(){orCase=i;changed();previewOr();},"ix-quiet as-case-choice");
        pick.setAttribute("data-case-choice",String(i));pick.setAttribute("aria-pressed",orCase===i?"true":"false");
        orPreview.appendChild(el("div",{class:"as-or-case"},[pick,el("div",{class:"as-formula",dir:"ltr",html:formula(c.source)})]));
      });typeset(orPreview);
    }
    function refreshOr(){
      var src=relationSource(parseRelation(sourceFor(r)));
      if(src!==orFingerprint){
        var disj=parseRelation(src).disj;
        orFingerprint=src;orSelected=disj.length===2?1:null;orCase=null;orButtons=[];orChoices.replaceChildren();
        disj.forEach(function(d,i){
          if(i){
            var pick=button("או",function(){orSelected=i;orCase=null;changed();previewOr();},"ix-quiet as-or-choice");
            pick.setAttribute("data-split-at",String(i));pick.setAttribute("aria-label","פיצול ב־או "+i+" משמאל");
            orButtons.push({at:i,button:pick});orChoices.appendChild(pick);
          }
          orChoices.appendChild(el("span",{class:"as-or-term"},["(",el("span",{html:formula(relationSource({t:"rel",disj:[d]}))}),")"]));
        });
      }
      previewOr();typeset(orChoices);
    }
    var custom=el("div",{class:"as-custom-cases"}),caseList=el("div"),caseFields=[];
    custom.appendChild(el("p",{class:"as-reason",text:"כתבו את כל המקרים, כולל נקודות השוויון. למקרה שאינו רלוונטי בחרו נימוק. החלוקה תיכתב בשורת או; אפשר לפעול על כולה או לבחור מקרה לעבודה בנפרד."}));
    custom.appendChild(caseList);
    function labelCases(){caseFields.forEach(function(c,i){c.label.textContent="מקרה "+(i+1);c.field.input.setAttribute("aria-label","התנאי למקרה "+(i+1));c.remove.disabled=caseFields.length<=2;});}
    function addCase(){
      var c={field:field("rel","התנאי למקרה","as-case-condition")};
      c.label=el("span");c.remove=button("מחיקת המקרה",function(){c.row.remove();caseFields=caseFields.filter(function(other){return other!==c;});labelCases();changed();},"ix-quiet");
      c.mode=el("select",{"aria-label":"מצב המקרה",class:"as-case-mode"},[el("option",{value:"work",text:"לבדיקה"}),el("option",{value:"exclude",text:"לא רלוונטי"})]);c.mode.value="work";
      c.reason=el("select",{"aria-label":"נימוק להחרגת המקרה",class:"as-case-exclusion-rule"},[el("option",{value:"denominator",text:"המכנה מתאפס"}),el("option",{value:"contradiction",text:"סתירה לתנאי קיים"})]);c.reason.value="denominator";
      c.evidence=field("rel","המכנה שמתאפס או התנאי הסותר","as-case-evidence");
      c.evidenceLabel=el("span",{class:"as-reason",text:"המכנה שמתאפס:"});
      c.exclusion=el("div",{class:"as-case-exclusion"},[c.reason,c.evidenceLabel,c.evidence.host]);c.exclusion.hidden=true;
      c.mode.addEventListener("change",function(){c.exclusion.hidden=c.mode.value!=="exclude";changed();});
      c.reason.addEventListener("change",function(){c.evidenceLabel.textContent=c.reason.value==="denominator"?"המכנה שמתאפס:":"התנאי הסותר:";changed();});c.evidence.input.addEventListener("input",changed);
      c.row=el("div",{class:"as-replacement as-case-definition"},[c.label,c.field.host,c.mode,c.remove,c.exclusion]);
      c.field.input.addEventListener("input",changed);caseFields.push(c);caseList.appendChild(c.row);labelCases();
    }
    addCase();addCase();
    custom.appendChild(button("הוספת מקרה",function(){addCase();changed();caseFields[caseFields.length-1].field.input.focus();}));
    var closing=el("div",{class:"as-close-case"}),openingSelect=el("select",{class:"as-opening-line","aria-label":"שורת פתיחת המקרה"}),conclusionSelect=el("select",{class:"as-conclusion-line","aria-label":"שורת המסקנה"});
    closing.appendChild(el("label",{class:"as-action-select"},[el("span",{text:"שורת פתיחת המקרה"}),openingSelect]));
    closing.appendChild(el("label",{class:"as-action-select"},[el("span",{text:"שורת המסקנה"}),conclusionSelect]));
    [openingSelect,conclusionSelect].forEach(function(select){select.addEventListener("change",changed);});
    var citations=el("div",{class:"as-line-citations"}),citationChoices=el("div",{class:"as-parts"}),citationNote=el("p",{class:"as-reason"}),citationFingerprint=null,citationInputs=[];
    citations.appendChild(citationNote);citations.appendChild(citationChoices);
    function fillReferences(select,records,fallback){
      var old=select.value;select.replaceChildren();records.forEach(function(p){select.appendChild(el("option",{value:lineId(p.number),text:"שורה "+p.number}));});
      select.value=records.some(function(p){return lineId(p.number)===old;})?old:records.length?lineId(fallback||records[records.length-1].number):"";
    }
    function refreshReferences(op){
      var state=proofBefore(r),current=state.stack.map(function(p){return p.number;}),source=sourceNumber(r,state);
      if(op==="endCase"){
        fillReferences(openingSelect,state.stack);
        fillReferences(conclusionSelect,state.available.filter(function(p){return JSON.stringify(p.scope)===JSON.stringify(current);}));return;
      }
      var records=op==="merge"?state.records.filter(function(p){return p.type==="close"&&!p.group.merged&&p.group.source===source&&JSON.stringify(p.scope)===JSON.stringify(current);}):state.available.filter(function(p){return p.number!==source;});
      var fingerprint=op+":"+source+":"+records.map(function(p){return p.number+":"+p.text;}).join(";");
      citationNote.textContent=op==="merge"?"בחרו את שורות סיום המקרים של שורת המקור. האיחוד ישמור את התנאים שטרם פושטו.":"בחרו שורות נוספות לצירוף עם שורת המקור באמצעות וגם.";
      if(fingerprint!==citationFingerprint){
        citationFingerprint=fingerprint;citationInputs=[];citationChoices.replaceChildren();
        records.forEach(function(p){
          var input=el("input",{type:"checkbox","data-cite-line":String(p.number),value:lineId(p.number),"aria-label":"ציטוט שורה "+p.number});input.addEventListener("change",changed);citationInputs.push(input);
          citationChoices.appendChild(el("label",{class:"as-part"},[input,el("span",{text:"שורה "+p.number+(p.type==="close"?" (סיום המקרה משורה "+p.opening+")":"")}),el("span",{dir:"ltr",html:formula(p.text)})]));
        });
        if(!records.length)citationChoices.appendChild(el("span",{text:op==="merge"?"אין עדיין סיומי מקרים לשורה הזאת.":"אין שורות נוספות הזמינות במקרה הזה."}));
      }typeset(citations);
    }
    var panels={abs:absolute,replace:replacement,conditionReplace:conditions,splitOr:orPanel,splitCustom:custom,endCase:closing,merge:citations,combine:citations};
    var host=el("div",{class:"as-action-options"},[absolute,replacement,conditions,orPanel,custom,closing,citations]);
    return {host:host,show:function(op){
      [absolute,replacement,conditions,orPanel,custom,closing,citations].forEach(function(panel){panel.hidden=panel!==panels[op];});host.hidden=!panels[op];
      if(op==="endCase"||op==="merge"||op==="combine")try{refreshReferences(op);}catch(e){say(citationNote,errMsg(e),"bad");}
      try{if(op==="abs")refreshAbsolute();if(op==="replace")refreshParts();if(op==="conditionReplace")refreshConditions();if(op==="splitOr")refreshOr();}
      catch(e){var target=op==="replace"?replaceSource:op==="conditionReplace"?conditionSource:op==="splitOr"?orPreview:absRule;say(target,errMsg(e),"bad");}
    },read:function(op){
      if(op==="endCase")return {opening:openingSelect.value,conclusion:conclusionSelect.value};
      if(op==="merge"||op==="combine")return {lines:citationInputs.filter(function(input){return input.checked;}).map(function(input){return input.value;})};
      if(op==="abs")return readAbsolute();
      if(op==="splitCustom")return {conditions:caseFields.map(function(c){return readInput(c.field.input);}),excluded:caseFields.map(function(c){return c.mode.value==="exclude"?{reason:c.reason.value,value:readInput(c.evidence.input)}:null;})};
      if(op==="splitOr"){
        if(relationSource(parseRelation(sourceFor(r)))!==orFingerprint){refreshOr();throw new ParseError("השורה שלפני הפיצול השתנתה. בחרו מחדש באיזה או לפצל.");}
        if(orSelected===null)throw new ParseError("בחרו את ה־או שבו רוצים לפצל את השורה.");
        if(orCase===null)throw new ParseError("בחרו איזה מקרה לפתוח.");
        return {at:orSelected,choice:orCase};
      }
      if(op==="replace"){
        if(sourceFor(r)!==fingerprint){refreshParts();throw new ParseError("השורה הקודמת השתנתה. בחרו מחדש את החלקים להחלפה.");}
        replacePicker.guard();
        return {op:op,edits:edits()};
      }
      currentConditionSource();conditionPicker.guard();return {op:op,edits:conditionSelected.map(function(s){return s.edit();})};
    }};
  }
  var actionGroups=[
    {id:"sides",label:"פעולות על האגפים",ops:["add","sub","mul","div","swap"]},
    {id:"simplify",label:"פישוט והחלפה",ops:["simplify","replace","conditions","conditionReplace","combine"]},
    {id:"cases",label:"עבודה במקרים",ops:["splitCustom","splitSign","splitOr","endCase","abs","merge"]},
    {id:"rules",label:"כללים נוספים",ops:["sqrt","cbrt","cube","zero","formula","log","exp"]}
  ];
  var actionLabels=Object.assign({},ACTION_NAMES,{replace:"החלפת ביטויים שנבחרו",conditionReplace:"פישוט תנאים שנבחרו",splitCustom:"פיצול לפי תנאים שכותבים",splitSign:"פיצול לפי סימן ביטוי",splitOr:"פתיחת מקרה (או)",endCase:"סיום מקרה",combine:"שילוב שורות (וגם)"});
  function refreshFollowing(r,f){r.reasonFields.slice(r.reasonFields.indexOf(f)+1).forEach(function(next){next.refresh();});refreshActionControls(r);}
  function standaloneAction(op){return ["splitCustom","splitSign","splitOr","endCase","merge","combine"].indexOf(op)>=0;}
  function sourceBeforeAction(r,f){
    var index=r.reasonFields.indexOf(f),src=sourceFor(r);
    if(index<0)throw new ParseError("בחרו מחדש את הפעולה.");
    r.reasonFields.slice(0,index).forEach(function(previous){src=executeAction(src,readAction(r,previous),cfgFor(r));});
    return src;
  }
  function readAction(r,f){
    var op=f.select.value;
    if(standaloneAction(op)&&r.reasonFields.length!==1)throw new ParseError("הפעולה הזאת נכתבת בשורה נפרדת. מחקו את הפעולות הנוספות או בצעו אותה בצעד הבא.");
    if(["splitOr","endCase","merge","combine"].indexOf(op)>=0)throw new ParseError("פתיחת מקרה, סיום ושילוב שורות נכתבים כל אחד בשורה נפרדת.");
    if(op==="splitCustom")return {op:"partition",split:f.tools.read(op)};
    if(op==="splitSign"){
      var cases=splitRelationCases(sourceBeforeAction(r,f),{value:readInput(f.input)},cfgFor(r));
      return {op:"partition",split:{conditions:cases.map(function(c){return c.condition;})}};
    }
    if(op==="abs"||op==="replace"||op==="conditionReplace")return f.tools.read(op);
    return {op:op,value:f.host.hidden?"":readInput(f.input)};
  }
  function appendActionState(r){
    if(r.certificate||!r.reasonFields.length||r.reasonFields.some(function(f){return !f.select.value;}))return {ok:false,note:"בחרו והשלימו את הפעולה הנוכחית לפני צירוף פעולה נוספת."};
    if(r.reasonFields.some(function(f){return standaloneAction(f.select.value);}))return {ok:false,note:"הפעולה הזאת נכתבת בשורה נפרדת. אפשר להמשיך בצעד הבא."};
    try{
      var source=sourceFor(r),context=cfgFor(r);
      r.reasonFields.forEach(function(f){source=executeAction(source,readAction(r,f),context);});
      if(relationTruth(parseRelation(source))!==null)return {ok:false,note:"התקבלה קבוצה ריקה או כל הישר; אין פעולה נוספת לצירוף כאן."};
      return {ok:true,note:""};
    }catch(_){return {ok:false,note:"השלימו פעולה תקינה לפני צירוף פעולה נוספת."};}
  }
  function refreshActionControls(r){
    if(r.suggestButton)r.suggestButton.textContent="הצגת התוצאה הצפויה";
    if(r.addActionButton){var append=appendActionState(r);r.addActionButton.disabled=!append.ok;r.addActionButton.setAttribute("title",append.note);}
    if(r.inputEntry)r.inputEntry.hidden=false;
    if(r.preview)r.preview.hidden=false;
    if(r.checkButton)r.checkButton.hidden=false;
    if(r.sourceBar)r.sourceBar.hidden=specialKind(r)==="close";
  }
  function justification(r){
    var actions;
    if(r.certificate){
      actions=JSON.parse(JSON.stringify(r.certificate));
    }else actions=r.reasonFields.map(function(f){return readAction(r,f);});
    return actions.every(function(a){return !a.op;})?[]:actions;
  }
  function reasonField(r,action){
    var category=el("select",{class:"as-action-category","aria-label":"סוג הפעולה"}),select=el("select",{class:"as-justification-rule","aria-label":"הפעולה"});
    category.appendChild(el("option",{value:"",text:"בחרו סוג פעולה…"}));
    actionGroups.forEach(function(g){category.appendChild(el("option",{value:g.id,text:g.label}));});
    var selectedGroup=actionGroups.filter(function(g){return action&&g.ops.indexOf(action.op)>=0;})[0];category.value=selectedGroup?selectedGroup.id:"";
    var f=field("expr","הביטוי או הבסיס בנימוק","as-justification-value");f.select=select;f.initialAction=action;
    var operand=action&&action.value?expressionSource(actionOperand(action.value)):"";
    f.input.value=isMathInput(f.input)?inputLatex(operand,"expr"):operand;
    var categoryLabel=el("label",{class:"as-action-select"},[el("span",{text:"סוג הפעולה"}),category]);
    var actionLabel=el("label",{class:"as-action-select"},[el("span",{text:"הפעולה"}),select]);
    var operandCaption=el("span",{text:"ביטוי"}),operandLabel=el("label",{class:"as-action-select as-action-operand"},[operandCaption,f.host]);
    var optionsHost=el("div",{class:"as-action-details"});
    f.note=el("div",{class:"as-reason as-action-note"});
    function choices(value){
      var group=actionGroups.filter(function(g){return g.id===category.value;})[0];
      var splitMode="splitSign";
      if(group&&group.id==="cases")try{if(parseRelation(sourceBeforeAction(r,f)).disj.length>1)splitMode="splitOr";}catch(_){}
      if(value==="splitSign"||value==="splitOr")value=splitMode;
      select.replaceChildren(el("option",{value:"",text:"בחרו פעולה…"}));
      if(group)group.ops.forEach(function(op){
        if((op==="splitSign"||op==="splitOr")&&op!==splitMode)return;
        select.appendChild(el("option",{value:op,text:actionLabels[op],disabled:standaloneAction(op)&&r.reasonFields.length>1}));
      });
      select.value=value||"";actionLabel.hidden=!group;
    }
    function refresh(){
      choices(select.value);
      f.host.hidden=["sub","add","mul","div","log","exp","splitSign"].indexOf(select.value)<0;
      operandLabel.hidden=f.host.hidden;operandCaption.textContent=select.value==="log"||select.value==="exp"?"בסיס":select.value==="splitSign"?"לפי סימן הביטוי":"מספר או ביטוי";
      f.input.setAttribute("aria-label",select.value==="splitSign"?"הביטוי שלפי סימנו מפצלים":select.value==="log"||select.value==="exp"?"הבסיס בפעולה":"המספר או הביטוי בפעולה");
      if(!f.host.hidden&&f.input.upgrade)f.input.upgrade();
      f.render();
      var hasTool=["abs","replace","conditionReplace","splitOr","splitCustom","endCase","merge","combine"].indexOf(select.value)>=0;
      if(hasTool&&!f.tools){f.tools=toolsFor(r,f);optionsHost.appendChild(f.tools.host);}
      optionsHost.hidden=!hasTool;
      if(f.tools)f.tools.show(hasTool?select.value:"");
      f.note.textContent=select.value==="splitSign"?"החלוקה תירשם כשורת או. אפשר לפעול על כל השורה או לבחור מקרים לעבודה בנפרד.":select.value==="merge"?"משלבים את תוצאות המקרים עם ההנחות שלהם. תנאים שעדיין לא צומצמו יישארו לצעד הבא.":select.value==="mul"||select.value==="div"?"אפשר לבחור גם ביטוי עם משתנה. כיוון האי־שוויון תלוי בסימן שלו.":"";
      refreshActionControls(r);
    }
    f.row=el("div",{class:"as-justification-entry"},[el("div",{class:"as-action-fields"},[categoryLabel,actionLabel,operandLabel,button("מחיקת הפעולה",function(){f.row.remove();r.reasonFields=r.reasonFields.filter(function(x){return x!==f;});if(!r.reasonFields.length)reasonField(r);invalidate(rows.indexOf(r));r.reasonFields.forEach(function(next){next.refresh();});},"ix-quiet as-delete-action")]),f.note,optionsHost]);
    category.addEventListener("change",function(){choices("");invalidate(rows.indexOf(r));refresh();refreshFollowing(r,f);});
    select.addEventListener("change",function(){invalidate(rows.indexOf(r));refresh();refreshFollowing(r,f);});f.input.addEventListener("input",function(){invalidate(rows.indexOf(r));refreshFollowing(r,f);});
    f.refresh=refresh;r.reasonFields.push(f);r.reasonList.appendChild(f.row);choices(action&&action.op);refresh();return f;
  }
  function setJustification(r,actions){
    r.reasonFields=[];r.reasonList.replaceChildren();r.certificate=null;r.reasonNotice.replaceChildren();r.reasonManual.hidden=false;
    if(actions&&actions.some(function(a){return ["replace","conditionReplace","cases","partition","merge"].indexOf(a.op)>=0;})){
      r.certificate=JSON.parse(JSON.stringify(actions));r.reasonManual.hidden=true;
      r.reasonNotice.appendChild(el("span",{class:"as-reason",dir:"rtl",html:reasonMarkup(actions)}));typeset(r.reasonNotice);
      r.reasonNotice.appendChild(button("עריכת הנימוק",function(){setJustification(r,[]);invalidate(rows.indexOf(r));}));
    }else (actions&&actions.length?actions:[null]).forEach(function(a){reasonField(r,a);});
    refreshActionControls(r);
  }
  function reasonEditor(r){
    r.reasonFields=[];r.reasonList=el("div",{class:"as-justification-list"});r.reasonNotice=el("div",{class:"as-justification-notice"});
    r.reasonResult=el("div",{class:"as-result as-action-preview","aria-live":"polite"});r.result=r.reasonResult;
    var suggest=button("הצגת התוצאה הצפויה",function(){
      r.reasonResult.replaceChildren();
      try{
        if(specialKind(r)){previewProofAction(r);return;}
        var actions=justification(r),next=sourceFor(r);
        if(!actions.length)throw new ParseError("בחרו פעולה בנימוק כדי לראות את התוצאה שלה.");
        actions.forEach(function(a){next=executeAction(next,a,cfgFor(r));});
        var last=actions[actions.length-1],preserve=["replace","conditionReplace","partition","merge"].indexOf(last.op)>=0;
        showActionResult(r,next,actionReason(actions),preserve,actions,r.reasonResult);
      }catch(e){var msg=el("div");r.reasonResult.replaceChildren(msg);say(msg,errMsg(e),"bad");}
    });
    r.suggestButton=suggest;r.addActionButton=button("צירוף פעולה",function(){if(!appendActionState(r).ok){refreshActionControls(r);return;}reasonField(r);invalidate(rows.indexOf(r));r.reasonFields.forEach(function(f){f.refresh();});});
    r.reasonManual=el("div",{class:"as-justification-manual"},[r.reasonList,el("div",{class:"ix-bar"},[r.addActionButton,suggest])]);
    reasonField(r);
    return el("div",{class:"as-justification"},[r.reasonManual,r.reasonNotice,r.reasonResult]);
  }
  function previewProofAction(r){
    var entry=proofEntry(r,null),state=replayRow(r,entry),verdict=state.results[state.results.length-1];
    if(!verdict||!verdict.ok)throw new ParseError(verdict&&verdict.msg||"בדקו את השורות שציטטתם.");
    var result=state.records[state.records.length-1],next=result.text;
    r.reasonResult.replaceChildren(el("div",{class:"as-formula",dir:"ltr",html:formula(next)}),el("p",{class:"as-reason",text:proofReason(entry,r)}));
    r.reasonResult.appendChild(button("יישום הצעד והמשך",function(){
      try{
        var current=proofEntry(r,null),checked=replayRow(r,current),last=checked.results[checked.results.length-1];
        if(!last.ok)throw new ParseError(last.msg);
        var value=checked.records[checked.records.length-1].text;
        invalidate(rows.indexOf(r));
        r.input.value=isMathInput(r.input)?inputLatex(value,"rel"):spaceLogicalWords(value).value;
        preview(r);check(rows.indexOf(r),true);
      }catch(e){say(r.msg,errMsg(e),"bad");}
    }));typeset(r.reasonResult);
  }
  function labelRows(){rows.forEach(function(r,i){r.label.textContent="שורה "+(i+2);r.input.setAttribute("aria-label","שורת פתרון "+(i+2));});}
  function add(focus){
    var f=field("rel","שורת פתרון","pw-input"),r={id:"line-"+(nextRowId++),input:f.input,reason:"",valid:false,sourceId:"auto"};
    r.msg=el("div",{class:"ix-msg","aria-live":"polite"});r.hint=el("div",{class:"pw-hints","aria-live":"polite"});r.result=el("div",{class:"as-result","aria-live":"polite"});
    r.preview=el("div",{class:"pw-preview",dir:"ltr"});r.label=el("span",{class:"as-step-label"});r.summary=el("div",{class:"as-compact"});r.summary.hidden=true;
    r.sourceSelect=el("select",{class:"as-source-line","aria-label":"שורת מקור"});r.sourcePreview=el("div",{class:"as-source-preview as-formula",dir:"ltr"});r.scopeNote=el("div",{class:"as-assumption"});
    r.sourceBar=el("div",{class:"as-source-reference"},[el("label",{class:"as-action-select"},[el("span",{text:"שורת מקור"}),r.sourceSelect]),r.sourcePreview]);
    r.sourceSelect.addEventListener("change",function(){r.sourceId=r.sourceSelect.value;invalidate(rows.indexOf(r));updateSource(r);r.reasonFields.forEach(function(f){f.refresh();});});
    var remove=button("מחיקת הצעד",function(){closeInputKeys();var i=rows.indexOf(r);rows.splice(i,1);r.row.remove();invalidate(i);labelRows();if(!rows.length)add(true);});
    r.inputEntry=el("div",{class:"as-result-entry"},[el("span",{class:"as-reason",text:"השורה המתקבלת:"}),el("div",{class:"pw-entry"},[f.host])]);
    r.checkButton=button("בדיקת הצעד והמשך",function(){check(rows.indexOf(r),true);},"ix-main");
    r.editor=el("div",{class:"as-editor"},[el("div",{class:"as-editor-head"},[el("span",{text:"מה עושים בצעד הזה?"}),remove]),r.scopeNote,r.sourceBar,reasonEditor(r),r.inputEntry,r.preview,
      el("div",{class:"ix-bar as-actions"},[r.checkButton,button("רמז",function(){nextHint(r,false);}),button("הצגת צעד אפשרי",function(){nextHint(r,true);})]),r.msg,r.hint]);
    r.row=el("div",{class:"pw-row as-step"},[r.label,r.summary,r.editor]);rows.push(r);paper.appendChild(r.row);labelRows();updateSource(r);
    r.input.addEventListener("input",function(){r.reason="";invalidate(rows.indexOf(r));preview(r);});
    r.input.addEventListener("focus",function(){if(isMathInput(r.input))r.preview.innerHTML="";});
    r.input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();check(rows.indexOf(r),true);}},true);
    if(focus)r.input.focus();return r;
  }
  function reset(){closeInputKeys();revision++;proofMath.clear();rows=[];paper.replaceChildren(initialLine);say(status,"");add(false);}
  var solution=el("section",{class:"pw-solution"});
  steps.forEach(function(s,i){solution.appendChild(el("div",{class:"pw-example",dir:"ltr",html:formula(path[i])}));solution.appendChild(s);});
  var modelReferenced=false;
  solution.addEventListener("practice-show",function(){
    if(modelReferenced)return;modelReferenced=true;
    steps.forEach(function(s,i){
      var before=i?path[i-1]:start,refs=[];
      try{
        var plan=inferJustification(before,path[i],cfg);
        actionReason(plan,{source:before,cfg:cfg,decorate:function(a,text,current){
          ruleReferences(a,current).forEach(function(ref){if(!refs.some(function(r){return r.id===ref.id&&r.label===ref.label;}))refs.push(ref);});return text;
        }});
        refs=refs.filter(function(ref){return !Array.from(s.querySelectorAll("a")).some(function(a){return (a.getAttribute("href")||"").split("#")[1]===ref.id;});});
        if(refs.length)s.appendChild(el("div",{class:"as-model-references",dir:"rtl",html:referenceMarkup(refs)}));
      }catch(_){} // An unavailable suggested derivation must not hide the authored solution.
    });
  });
  hints.forEach(function(h){h.remove();});
  var initialLine=el("div",{class:"pw-row as-given"},[
    el("span",{class:"as-step-label",text:"שורה 1"}),
    el("div",{class:"as-compact"},[el("div",{class:"as-formula",dir:"ltr",html:formula(start)}),el("div",{class:"as-reason",dir:"rtl",text:"נקודת מוצא"})])
  ]);
  paper.appendChild(initialLine);
  var ui=el("div",{class:"pw algebra-work"},[options.start?null:practiceHelp(true),paper,
    el("div",{class:"ix-bar"},[button("הוספת שורה",function(){var last=rows[rows.length-1],count=rows.length;if(!last.input.value.trim())last.input.focus();else if(check(rows.length-1,true)&&rows.length===count)add(true);}),button("בדיקת הפתרון",function(){check(rows.length-1,false);}),button("מההתחלה",reset)]),status]);
  var workspace=options.start?ui:practiceWorkspace(ui);
  if(!options.start)attachSolutionAnswer(box,workspace,solution);
  if(options.start)box.appendChild(workspace);else mountPracticeViews(box,workspace,steps.length||solution.children.length?solution:null);
  box.classList.add("practice-ready");add(false);typeset(box);
  return {validate:function(){if(rows.some(function(r){return r.input.value.trim();}))check(rows.length-1,false);},snapshot:function(){
    var active=rows.slice();while(active.length&&!active[active.length-1].input.value.trim())active.pop();
    var entries=active.map(function(r){return proofEntry(r);}),checked=checkLineProof(start,entries,cfg,proofMath),bad=checked.results.filter(function(v){return !v.ok;})[0];if(bad)throw new ParseError(bad.msg);
    return {entries:entries,done:checked.done};
  }};
}
function initPractice(box) {
  var start = attr(box, "start"), seq = attr(box, "limit");
  var mode = seq ? "lim" : isRelation(parseRelation(start)) ? "rel" : "expr";
  var parse = mode === "rel" ? parseRelation : parseExpr;
  var vars = (attr(box, "vars") || "").split(",").filter(Boolean);
  if (!vars.length) vars = seq ? [seq] : Object.keys(varsOf(parse(start))).sort();
  var cfg = { mode: mode, seq: seq, vars: vars, solve: attr(box, "solve") || (vars.indexOf("x") >= 0 ? "x" : vars[0]),
    positive: (attr(box, "positive") || "").split(",").filter(Boolean), verify: false };
  var steps = childDivs(box, "step"), hints = childDivs(box, "hint");
  if (!steps.length) return;
  var path = steps.map(function (s) { return prepLine(attr(s, "line")).full; });
  var target = attr(box, "goal") || path[path.length - 1], entries = [], lastInput, hintCount = 0;
  function math(src) {
    var n = parse(src);
    return mode === "rel" ? htmlRel(n) : "\\(" + (seq && hasVar(n, seq) ? "\\lim_{" + seq + "\\to\\infty}\\left(" + tex(n) + "\\right)" : tex(n)) + "\\)";
  }
  function btn(label, fn) { return el("button", { type: "button", class: "ix-btn", text: label, onclick: fn }); }
  var paper = el("div", { class: "pw-paper" }), status = el("div", { class: "ix-msg", "aria-live": "polite" });
  var hintArea = el("div", { class: "pw-hints", "aria-live": "polite" });
  function invalidate() {
    entries.forEach(function (r) { say(r.msg, ""); r.input.removeAttribute("aria-invalid"); });
    say(status, ""); hintArea.replaceChildren(); hintCount = 0;
  }
  function add(focus) {
    var input = mathInput({ type: "text", class: "blank-input pw-input", dir: "ltr", autocomplete: "off", spellcheck: "false" }, mode);
    var preview = el("div", { class: "pw-preview", dir: "ltr" }), msg = el("div", { class: "ix-msg", "aria-live": "polite" });
    var r = { input: input, msg: msg };
    var remove = btn("מחיקת הצעד", function () { entries.splice(entries.indexOf(r), 1); r.row.remove(); invalidate(); labelRows(); if (!entries.length) add(true); });
    r.row = el("div", { class: "pw-row" }, [el("div", { class: "pw-entry" }, [input, remove]), preview, msg]);
    entries.push(r); paper.appendChild(r.row); labelRows(); invalidate();
    input.addEventListener("focus", function () { lastInput = input; });
    input.addEventListener("input", function () {
      invalidate();
      if (isMathInput(input)) { preview.textContent = ""; return; }
      try { preview.innerHTML = mx(math(input.value)); typeset(preview); } catch (e) { preview.textContent = ""; }
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); if (e.ctrlKey || e.metaKey) check(); else add(true); } }, true);
    if (focus) input.focus();
  }
  function labelRows() { entries.forEach(function (r, i) { r.input.setAttribute("aria-label", "שורת פתרון " + (i + 1)); }); }
  function check() {
    invalidate();
    var active = entries.slice();
    while (active.length && !active[active.length - 1].input.value.trim()) active.pop();
    if (!active.length) { say(status, "כתבו שורה בפתרון כדי לבדוק אותה.", "info"); return; }
    var lines = [], invalid = false;
    active.forEach(function (e) {
      try { lines.push(readInput(e.input)); }
      catch (err) { invalid = true; say(e.msg, errMsg(err), "bad"); e.input.setAttribute("aria-invalid", "true"); }
    });
    if (invalid) return;
    var r = checkWorking(start, lines, cfg, target);
    r.results.forEach(function (v, i) {
      say(active[i].msg, v.ok ? "✓" : v.msg, v.ok ? "good" : "bad");
      active[i].input.setAttribute("aria-invalid", v.ok ? "false" : "true");
    });
    if (r.results.some(function (v) { return !v.ok; })) say(status, "הבדיקה נעצרה בשורה המסומנת. אחרי תיקון אפשר לבדוק שוב.", "info");
    else say(status, r.done ? "✓ הפתרון נכון." : "השורות תקינות. אפשר להמשיך לפשט או לבודד את הנעלם.", r.done ? "good" : "info");
  }
  function hint() {
    hintArea.replaceChildren();
    var lines;
    try { lines = entries.map(function (r) { return readInput(r.input).trim(); }).filter(Boolean); }
    catch (err) { say(hintArea, errMsg(err), "info"); return; }
    var cur = lines.length ? lines[lines.length - 1] : start, at = -1;
    try { at = [start].concat(path).map(function (s) { return math(s); }).indexOf(math(cur)); } catch (e) { /* generic hint below */ }
    if (at >= 0 && at < steps.length) {
      hintArea.appendChild(steps[at].cloneNode(true));
      if (hintCount++) hintArea.appendChild(el("div", { html: mx(math(path[at])) }));
    } else if (hints.length) hintArea.appendChild(hints[Math.min(hintCount++, hints.length - 1)].cloneNode(true));
    else hintArea.appendChild(el("p", { text: mode === "lim" ? "אפשר לנסות לשכתב בעזרת גבולות מוכרים. הפתרון לדוגמה מציג דרך אחת." : "אפשר לנסות לפתוח סוגריים, לאסוף איברים או לבודד את הנעלם. הפתרון לדוגמה מציג דרך אחת." }));
    typeset(hintArea);
  }
  var keys = keyRow(seq ? KEYSETS.lim : vars.map(function (v) { return [v, v]; }).concat(mode === "rel" ? KEYSETS.rel : KEYSETS.expr.filter(function (k) { return vars.indexOf(k[0]) < 0; })), function () { return lastInput; });
  var solution = el("section", { class: "pw-solution" });
  steps.forEach(function (s, i) { solution.appendChild(el("div", { class: "pw-example", html: mx(math(path[i])) })); solution.appendChild(s); });
  hints.forEach(function (h) { h.remove(); });
  var ui = el("div", { class: "pw" }, [practiceHelp(false),el("div", { class: "pw-start", html: mx(math(start)) }),
    paper, keys, el("div", { class: "ix-bar" }, [btn("הוספת שורה", function () { add(true); }), btn("בדיקת הפתרון", check), btn("רמז", hint)]), status, hintArea]);
  var workspace=practiceWorkspace(ui);attachSolutionAnswer(box,workspace,solution);
  mountPracticeViews(box,workspace,solution); box.classList.add("practice-ready"); add(false); typeset(box);
}
function initDerive(box) {
  var relationStart=attr(box,"start");
  if(relationStart&&!attr(box,"limit"))try {if(isRelation(parseRelation(relationStart))){initRelationPractice(box);return;}}catch(e){box.appendChild(el("p",{class:"ix-msg ix-bad",text:errMsg(e)}));return;}
  if (box.closest(".thmbox-question")) { initPractice(box); return; }
  var startSrc = attr(box, "start");
  if (!startSrc) return;
  var seq = attr(box, "limit"), mode, start;
  try {
    if (seq) { mode = "lim"; start = parseExpr(startSrc); }
    else { start = parseRelation(startSrc); mode = isRelation(start) ? "rel" : "expr"; if (mode === "expr") start = parseExpr(startSrc); }
  } catch (e) { box.appendChild(el("p", { class: "ix-msg ix-bad", text: "שגיאה בהגדרת התרגיל: " + errMsg(e) })); return; }
  var vars = (attr(box, "vars") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  if (!vars.length) vars = seq ? [seq] : Object.keys(varsOf(start)).sort();
  var rel = mode === "rel";
  var LIM = seq ? "\\lim\\limits_{" + seq + " \\to \\infty} " : "";
  var hints = childDivs(box, "hint"), h = 0;
  hints.forEach(function (x) { x.classList.add("ix-hidden"); });
  var steps = [];
  childDivs(box, "step").forEach(function (d) {
    var P = prepLine(attr(d, "line") || ""), node;
    var whole = null;
    try { node = rel ? parseRelation(P.text) : parseExpr(P.text); } catch (e) { node = null; }
    try { whole = rel ? null : parseExpr(P.full); } catch (e) { whole = null; }
    var S = { div: d, node: node, whole: whole, text: P.text, full: P.full, boxes: P.boxes.map(function (b) {
      return { sign: b.sign, ans: b.ans, state: "empty", input: null, allowExpression: attr(d,"allow-expression")==="true",
        kind: b.sign ? "sign" : /^\s*-?\s*inf\s*$/.test(b.ans) ? "num" : guessKind(b.ans) };
    }) };
    steps.push(S);
  });
  // with solve="x" a box holds x (or a step) in terms of the other variables: check it in the
  // variables of its own answer, so that "5x-2" for x = (y+2)/5 is told "use y", not a random point
  if (attr(box, "solve")) steps.forEach(function (S) {
    S.boxes.forEach(function (b) {
      if (b.sign) return;
      try { var bv = Object.keys(varsOf(parseExpr(b.ans))).sort(); if (bv.length) b.vars = bv; } catch (e) { /* keep vars */ }
    });
  });
  var shown = 0, lastInput = null;

  // the TeX of a line, with its boxes empty (?), filled by the reader (green) or filled in (blue)
  function lineHtml(S, node, first) {
    PHTEX = function (i) {
      var k = typeof i === "string" ? +i.slice(1) : i, b = S ? S.boxes[k] : null;
      if (!b || b.state === "empty") return "\\boxed{\\,?" + (S && S.boxes.length > 1 ? "_{" + (k + 1) + "}" : "") + "\\,}";
      var v = b.sign ? SIGN_TEX[b.sign] : tex(parseExpr(b.ans));
      return "{\\color{" + (b.state === "ok" ? "#15803d" : "#1d4ed8") + "}{" + v + "}}";
    };
    var out;
    try {
      if (rel) out = htmlRel(node);
      else {
        var pre = first ? "" : "= ";
        // a line with n (also inside a box) is still a sequence: it carries "lim"
        var withLim = seq && hasVar(S && S.whole || node, seq), body = tex(node);
        // lim of a sum or a difference needs brackets: lim (a - b), not (lim a) - b
        if (withLim && (node.t === "add" || node.t === "sub" || node.t === "neg")) body = "\\left(" + body + "\\right)";
        out = "\\(" + pre + (withLim ? LIM : "") + body + "\\)";
      }
    } finally { PHTEX = null; }
    return out;
  }
  function button(text, cls, action) {
    return el("button", { type: "button", class: "ix-btn" + (cls ? " " + cls : ""), onclick: action }, [text]);
  }
  var rows = el("div", { class: "dv-rows" });
  rows.appendChild(el("div", { class: "dv-row dv-start" }, [
    el("div", { class: "dv-math" }, [el("div", { class: "dv-f", html: mx(lineHtml(null, start, true)) })]),
    el("div", { class: "dv-note" })
  ]));
  var msg = el("div", { class: "ix-msg", "aria-live": "polite" });
  var bNext = button("הצעד הראשון", "ix-main", next);
  var bFill = button("השלמת הצעד", "", fillCurrent);
  var bAll = button("כל הפתרון", "ix-quiet", all);
  var bReset = button("מההתחלה", "ix-quiet", reset);
  var bHint = hints.length ? button("רמז (0/" + hints.length + ")", "", function () {
    if (h < hints.length) { hints[h].classList.remove("ix-hidden"); typeset(hints[h]); h++; }
    bHint.textContent = "רמז (" + h + "/" + hints.length + ")"; bHint.disabled = h >= hints.length;
  }) : null;
  var anyExpr = steps.some(function (S) { return S.boxes.some(function (b) { return b.kind === "expr"; }); });
  // the variable keys are the variables the boxes are written in (y when solving for x)
  var keyVars = {};
  steps.forEach(function (S) { S.boxes.forEach(function (b) { if (b.kind === "expr") (b.vars || vars).forEach(function (v) { keyVars[v] = 1; }); }); });
  var exprKeys = Object.keys(keyVars).sort().map(function (v) { return [v, v]; })
    .concat(KEYSETS.expr.filter(function (k) { return k[0] !== "x"; }));
  var keys = keyRow(seq ? KEYSETS.lim : anyExpr ? exprKeys : KEYSETS.num,
    function () { return lastInput; });
  keys.classList.add("dv-keys");
  var bar = el("div", { class: "ix-bar dv-bar" }, [bNext, bFill, bAll, bReset, bHint]);
  var ui = el("div", { class: "dv" }, [rows, keys, bar, msg]);
  box.insertBefore(ui, hints[0] || null);
  steps.forEach(function (S) { S.div.remove(); });
  box.classList.add("derive-ready");
  typeset(ui);
  sync();

  function rowOf(S) {
    if (S.row) return S.row;
    var f = el("div", { class: "dv-f" });
    var ins = el("div", { class: "dv-in" });
    var note = el("div", { class: "dv-note" });
    while (S.div.firstChild) note.appendChild(S.div.firstChild);
    var sm = el("div", { class: "ix-msg dv-msg", "aria-live": "polite" });
    S.f = f; S.ins = ins; S.msg = sm;
    S.row = el("div", { class: "dv-row" }, [el("div", { class: "dv-math" }, [f, ins, sm]), note]);
    S.boxes.forEach(function (b, k) {
      var label = "?" + (S.boxes.length > 1 ? SUB.charAt(k + 1) : "");
      var cell = el("span", { class: "dv-box" }, [el("span", { class: "dv-lab", text: label + " =" })]);
      if (b.sign) {
        ["<", ">", "<=", ">=", "="].forEach(function (sg) {
          cell.appendChild(el("button", { type: "button", class: "ix-key dv-sign", text: SIGN_TXT[sg],
            onclick: function () { checkSign(S, k, sg); } }));
        });
      } else {
        b.input = mathInput({ type: "text", class: "blank-input dv-input", dir: "ltr", autocomplete: "off", spellcheck: "false",
          size: String(Math.min(16, Math.max(4, b.ans.length + 2))), "aria-label": "התשובה בתיבה " + label }, b.kind);
        b.input.addEventListener("focus", function () { lastInput = b.input; });
        b.input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); checkStep(S); } }, true);
        cell.appendChild(b.input);
      }
      b.cell = cell;
      ins.appendChild(cell);
    });
    if (S.boxes.some(function (b) { return !b.sign; })) ins.appendChild(button("בדיקה", "dv-check", function () { checkStep(S); }));
    draw(S);
    typeset(note);     // the note was taken out of the page before MathJax ran
    return S.row;
  }
  function draw(S) {
    S.f.innerHTML = mx(S.node ? lineHtml(S, S.node, false) : "\\(?\\)");
    typeset(S.f);
    S.boxes.forEach(function (b) { if (b.cell) b.cell.hidden = b.state !== "empty"; });
    var open = S.boxes.some(function (b) { return b.state === "empty"; });
    S.ins.hidden = !open;
    S.row.classList.toggle("dv-done", !open);
  }
  function stepDone(S) { return S.boxes.every(function (b) { return b.state !== "empty"; }); }
  // the line with the reader's values in the boxes: does it say the same as the model line?
  function sameLine(S, vals) {
    var src = S.text.replace(/§(R?)(\d+)/g, function (_, r, k) {
      var b = S.boxes[+k];
      return r ? (b.sign) : "(" + (vals[+k] !== undefined ? vals[+k] : b.ans) + ")";
    });
    try {
      if (rel) {
        var A = parseRelation(S.full), B = parseRelation(src), sv = attr(box, "solve") || (vars.indexOf("x") >= 0 ? "x" : vars[0]);
        return relSets(A, B, sv, vars.filter(function (x) { return x !== sv; }), []).ok;
      }
      var a = parseExpr(S.full), b2 = parseExpr(src);
      return seq ? seqSame(a, b2, seq).ok : compareExpr(a, b2, vars.length ? vars : ["x"], []).ok;
    } catch (e) { return false; }
  }
  function checkStep(S) {
    var bad = null, vals = {}, open = [];
    S.boxes.forEach(function (b, k) {
      if (b.sign || b.state !== "empty") return;
      var v;
      try { v = readInput(b.input).replace(/‎/g, "").trim(); }
      catch (err) { if (!bad) bad = { k:k, msg:errMsg(err) }; return; }
      if (!v) { if (!bad) bad = { k: k, msg: "מלאו את התיבה." }; return; }
      vals[k] = v; open.push(k);
    });
    if (bad) { draw(S); say(S.msg, bad.msg, "info"); S.boxes[bad.k].input.focus(); return; }
    var results = {};
    open.forEach(function (k) {
      var b = S.boxes[k], r;
      try { r = checkAnswer(b.kind, b.ans, vals[k], b.vars || vars, {allowExpression:b.allowExpression}); } catch (e) { r = { ok: false, msg: errMsg(e) }; }
      results[k] = r;
    });
    var allOk = open.every(function (k) { return results[k].ok; });
    var waitSign = S.boxes.some(function (b) { return b.sign && b.state === "empty"; });
    if (!allOk && !waitSign && open.length > 1 && !open.some(function(k){return results[k].partial;}) && sameLine(S, vals)) {
      // the same line in another order, e.g. (x-3)(x-2) for (x-2)(x-3): keep the reader's values
      open.forEach(function (k) { S.boxes[k].ans = vals[k]; S.boxes[k].state = "ok"; });
    } else {
      open.forEach(function (k) {
        if (results[k].ok) S.boxes[k].state = "ok";
        else if (!bad) bad = { k: k, msg: results[k].msg || "לא נכון. נסו שוב." };
      });
    }
    draw(S);
    if (bad) {
      var lab = "?" + (S.boxes.length > 1 ? SUB.charAt(bad.k + 1) : "");
      say(S.msg, (S.boxes.length > 1 ? "בתיבה " + lab + ": " : "") + bad.msg, "bad");
      if (S.boxes[bad.k].input) S.boxes[bad.k].input.focus();
      return;
    }
    say(S.msg, "");
    if (stepDone(S)) advance(S);
  }
  function checkSign(S, k, sg) {
    var b = S.boxes[k];
    if (sg === b.sign) { b.state = "ok"; say(S.msg, ""); draw(S); if (stepDone(S)) advance(S); }
    else say(S.msg, "זה לא הסימן הנכון כאן. מה קרה לכיוון בצעד הזה?", "bad");
  }
  // a line completed by the reader opens the next one
  function advance(S) {
    if (steps.indexOf(S) === shown - 1 && shown < steps.length) next();
    else sync();
  }
  function next() {
    if (shown >= steps.length) return;
    var S = steps[shown++];
    rows.appendChild(rowOf(S));
    sync();
    var first = S.boxes.filter(function (b) { return b.input && b.state === "empty"; })[0];
    if (first) first.input.focus({ preventScroll: false });
  }
  function fillCurrent() {
    if (!shown) next();
    var S = steps[shown - 1];
    S.boxes.forEach(function (b) { if (b.state === "empty") b.state = "shown"; });
    say(S.msg, "");
    draw(S); sync();
  }
  function all() {
    while (shown < steps.length) next();
    steps.forEach(function (S) { S.boxes.forEach(function (b) { if (b.state === "empty") b.state = "shown"; }); say(S.msg, ""); draw(S); });
    sync();
  }
  function reset() {
    steps.forEach(function (S) {
      if (S.row) S.row.remove();
      S.boxes.forEach(function (b) { b.state = "empty"; if (b.input) b.input.value = ""; });
      if (S.msg) say(S.msg, "");
      if (S.row) draw(S);
    });
    shown = 0; say(msg, ""); sync();
  }
  function sync() {
    bNext.textContent = shown ? "הצעד הבא" : "הצעד הראשון";
    bNext.disabled = shown >= steps.length;
    var cur = shown ? steps[shown - 1] : null;
    bFill.disabled = !cur || stepDone(cur);
    bAll.disabled = shown >= steps.length && steps.every(stepDone);
    bReset.hidden = !shown;
    var open = steps.slice(0, shown).some(function (S) { return S.boxes.some(function (b) { return b.input && b.state === "empty"; }); });
    keys.hidden = !open;
    var done = shown === steps.length && steps.every(stepDone);
    say(msg, done ? "✓ סוף הפתרון." : "", done ? "good" : null);
  }
}

/* ---------------- 6c. Ordering ---------------- */
function initOrder(box) {
  var steps = childDivs(box, "step");
  if (steps.length < 2) return;
  var after = childDivs(box, "after");
  after.forEach(function (x) { x.classList.add("ix-hidden"); });
  var cards = steps.map(function (s, i) {
    var r = attr(s, "rank");
    var c = el("div", { class: "ord-card", role: "button", tabindex: "0" });
    while (s.firstChild) c.appendChild(s.firstChild);
    var why = attr(s, "why");
    return { node: c, rank: r === null ? i : +r, why: why, src: s };
  });
  var ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; });
  steps.forEach(function (s) { s.remove(); });
  var pool = el("div", { class: "ord-pool", "aria-label": "הצעדים שעוד לא סודרו" });
  var placed = el("ol", { class: "ord-placed", "aria-label": "הסדר שלכם" });
  var msg = el("div", { class: "ix-msg", "aria-live": "polite" });
  var order = [], shuffled = cards.slice();
  var bar = el("div", { class: "ix-bar" }, [
    el("button", { type: "button", class: "ix-btn ix-main", onclick: check }, ["בדיקה"]),
    el("button", { type: "button", class: "ix-btn", onclick: reset }, ["התחלה מחדש"]),
    el("button", { type: "button", class: "ix-btn ix-quiet", onclick: solve }, ["הצגת הסדר הנכון"])]);
  var ui = el("div", { class: "ord-ui" }, [
    el("div", { class: "ord-head", text: "לחצו על הצעדים לפי הסדר הנכון:" }), pool,
    el("div", { class: "ord-head", text: "הסדר שלכם:" }), placed, bar, msg]);
  box.insertBefore(ui, after[0] || null);
  box.classList.add("order-ready");
  cards.forEach(function (c) {
    var act = function () { toggle(c); };
    c.node.addEventListener("click", act);
    c.node.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
  });
  reset();

  function draw() {
    pool.innerHTML = ""; placed.innerHTML = "";
    var inPool = shuffled.filter(function (c) { return order.indexOf(c) < 0; });
    inPool.forEach(function (c) { pool.appendChild(c.node); });
    if (!inPool.length) pool.appendChild(el("div", { class: "ord-empty", text: "כל הצעדים סודרו. לחצו ״בדיקה״." }));
    order.forEach(function (c) { var li = el("li"); li.appendChild(c.node); placed.appendChild(li); });
    if (!order.length) placed.appendChild(el("li", { class: "ord-empty", text: "עוד לא בחרתם צעדים." }));
  }
  function toggle(c) {
    cards.forEach(function (x) { x.node.classList.remove("good", "bad"); });
    say(msg, "");
    var k = order.indexOf(c);
    if (k >= 0) order.splice(k, 1); else order.push(c);
    draw();
    c.node.focus();
  }
  function check() {
    cards.forEach(function (x) { x.node.classList.remove("good", "bad"); });
    if (order.length < cards.length) { say(msg, "עוד לא סידרתם את כל הצעדים (" + order.length + " מתוך " + cards.length + ").", "info"); return; }
    for (var i = 0; i < order.length; i++) {
      if (order[i].rank !== ranks[i]) {
        for (var j = 0; j < i; j++) order[j].node.classList.add("good");
        order[i].node.classList.add("bad");
        say(msg, (i ? "הצעדים הראשונים במקום. " : "") + "הצעד המסומן באדום לא מתאים כאן." + (order[i].why ? " " + order[i].why : " נסו שוב: לחצו עליו כדי להחזיר אותו."), "bad");
        return;
      }
    }
    order.forEach(function (c) { c.node.classList.add("good"); });
    say(msg, "✓ הסדר נכון!", "good");
    after.forEach(function (x) { x.classList.remove("ix-hidden"); typeset(x); });
  }
  function reset() {
    order = [];
    shuffled = cards.slice();
    for (var t = 0; t < 10; t++) {
      for (var i = shuffled.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp; }
      if (shuffled.some(function (c, i) { return c.rank !== ranks[i]; })) break;
    }
    cards.forEach(function (x) { x.node.classList.remove("good", "bad"); });
    after.forEach(function (x) { x.classList.add("ix-hidden"); });
    say(msg, "");
    draw();
  }
  function solve() {
    order = cards.slice().sort(function (a, b) { return a.rank - b.rank; });
    draw();
    check();
  }
}

/* ---------------- 6d. References shown in place ---------------- */
/* Ported from the BGU calculus book. A click on a link to a box (#box-...) opens a
   panel below the paragraph holding the link, with a COPY of the box, instead of
   jumping away; a second click on the link, the × button or Esc closes it. The panel's
   "מעבר לתיבה" link still jumps to the box itself. Links inside a panel open further
   panels, up to three deep. Ctrl/Cmd/Shift-click and middle-click navigate as usual.
   The copy is a static summary of the box: blanks show their answers, step-by-step
   reveals show every step, quizzes keep only their explanations, folded answers are
   open, and the widgets' own controls are dropped. A simulation stays live (the iframe
   is copied; _styles.html sizes every widget frame). Ids are removed so none repeat. */
function staticCopy(box) {
  var c = box.cloneNode(true);
  c.querySelectorAll(".pw-view-controls, .pw-workspace, .pw, .composition-ui, .ix-panel, .blank-entry, .set-case-nav, .set-stage-nav, .dv-bar, .dv-in, .dv-keys, .dv-msg, .ord-ui, .solve-bar, .tf-opt, .tf-feedback, .fill > .hint, .derive > .hint")
    .forEach(function (n) { n.remove(); });
  c.querySelectorAll(".pw-views").forEach(function(n){n.classList.remove("pw-comparing");});
  c.querySelectorAll(".pw-view-panels, .pw-view-panel, .pw-panel-title").forEach(function(n){n.hidden=false;n.removeAttribute("role");n.removeAttribute("aria-labelledby");});
  c.querySelectorAll(".set-plot").forEach(function(n){if(!n.classList.contains("sp-answer"))n.remove();});
  c.querySelectorAll(".blank-input, .blank-mark").forEach(function (n) { n.remove(); });
  c.querySelectorAll(".blank-answer").forEach(function (n) { n.hidden = false; });
  c.querySelectorAll(".ix-hidden, .solve-hidden").forEach(function (n) { n.classList.remove("ix-hidden", "solve-hidden"); });
  c.querySelectorAll(".tf-quiz").forEach(function (q) { q.classList.remove("tf-js"); });
  c.querySelectorAll("details").forEach(function (d) { d.open = true; });
  c.querySelectorAll(".case").forEach(function (d) { d.hidden = false; });
  c.removeAttribute("id");
  c.style.display = "";
  c.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
  return c;
}
function initRefs() {
  var open = [];
  function closePanel(entry) {
    entry.panel.remove();
    entry.link.classList.remove("xref-open");
    entry.link.setAttribute("aria-expanded", "false");
    open = open.filter(function (e) { return e !== entry; });
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href^='#box-']");
    if (!a || a.classList.contains("xref-jump")) return;
    if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    var depth = 0, n = a;
    while ((n = n.parentElement && n.parentElement.closest(".xref-panel"))) depth++;
    if (depth >= 3) return;
    var id = a.getAttribute("href").slice(1), target = document.getElementById(id);
    if (!target) return;                                   // not on this page: navigate
    ev.preventDefault();
    var already = open.filter(function (e) { return e.link === a; })[0];
    if (already) { closePanel(already); return; }
    var jump = el("a", { class: "xref-jump", href: "#" + id, text: "מעבר לתיבה ←" });
    var close = el("button", { type: "button", class: "xref-close", "aria-label": "סגירה", text: "×" });
    var panel = el("div", { class: "xref-panel" }, [el("div", { class: "xref-head" }, [jump, close]), staticCopy(target)]);
    var block = a.closest(".as-reason-line, .as-model-references, .as-abs-rule, p, li, td, th, dd, figcaption") || a.parentElement;
    if (block.tagName === "TD" || block.tagName === "TH") block = block.closest("table");
    block.parentNode.insertBefore(panel, block.nextSibling);
    var entry = { link: a, panel: panel };
    open.push(entry);
    a.classList.add("xref-open");
    a.setAttribute("aria-expanded", "true");
    close.addEventListener("click", function () { closePanel(entry); a.focus(); });
    jump.addEventListener("click", function () { closePanel(entry); });
    typeset(panel);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && open.length) {
      var last = open[open.length - 1];
      closePanel(last);
      last.link.focus();
    }
  });
}

function initSetCases() {
  document.querySelectorAll(".set-cases").forEach(function (box) {
    var cases = childDivs(box, "case"), current = 0;
    if (!cases.length) return;
    if (attr(box, "navigation") === "steps") {
      var stageButtons = cases.map(function (c,i) {
        return el("button", { type:"button", class:"ix-btn ix-quiet", text:(i+1)+". "+attr(c,"title"), onclick:function () { current=i;showStage(); } });
      });
      function showStage() {
        closeInputKeys();
        cases.forEach(function (c,i) { c.hidden=i!==current;stageButtons[i].setAttribute("aria-pressed",String(i===current)); });
      }
      box.insertBefore(el("div", {class:"set-stage-nav",role:"group","aria-label":"שלבי התרגול"},stageButtons),box.firstChild);
      showStage();return;
    }
    var select = el("select", { "aria-label":"בחירת מקרה" });
    cases.forEach(function (c,i) { select.appendChild(el("option", { value:String(i), text:(i+1)+". "+attr(c,"title") })); });
    var previous = el("button", { type:"button", class:"ix-btn ix-quiet", text:"הקודם", onclick:function () { current--;show(); } });
    var next = el("button", { type:"button", class:"ix-btn ix-quiet", text:"הבא", onclick:function () { current++;show(); } });
    function show() { cases.forEach(function(c,i){c.hidden=i!==current;});select.value=String(current);previous.disabled=current===0;next.disabled=current===cases.length-1; }
    select.addEventListener("change", function () { current=+select.value;show(); });
    box.insertBefore(el("div", { class:"set-case-nav" }, [previous,select,next]),box.firstChild);
    show();
  });
}
function initComposition(box){
  var fields={},previews={},ui=el("div",{class:"composition-ui"}),inputs=el("div",{class:"composition-fields"}),msg=el("div",{class:"ix-msg","aria-live":"polite"}),result=el("div",{class:"as-formula",dir:"ltr"});
  ["g","f"].forEach(function(name){
    var input=mathInput({type:"text",class:"blank-input composition-"+name,dir:"ltr","aria-label":"הפונקציה "+name},"expr");fields[name]=input;
    var preview=el("span",{class:"as-field-preview ix-preview",dir:"ltr"});previews[name]=preview;
    var entry=el("span",{class:"as-field as-expr-field composition-entry"},[input,preview]);
    bindInputKeys(input,"expr",true);
    inputs.appendChild(el("label",{class:"composition-field",dir:"ltr"},[el("span",{html:mx("\\("+name+"(x)=\\)")}),entry]));
    function renderPreview(){
      preview.innerHTML="";
      if(isMathInput(input)||!input.value.trim())return;
      var parsed=parsedSoFar(readInput(input),parseExpr);
      if(parsed)showParsed(preview,"\\("+tex(parsed.node)+"\\)",parsed.whole);
    }
    input.addEventListener("input",function(){say(msg,"");result.replaceChildren();renderPreview();});
    input.addEventListener("focus",renderPreview);
    input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();check();}});
  });
  function check(){
    try{
      var r=checkComposition(attr(box,"target"),readInput(fields.f),readInput(fields.g));
      result.innerHTML=r.node?mx("\\(f(g(x))="+tex(r.node)+"\\)"):"";typeset(result);say(msg,r.msg,r.ok?"good":r.empty?"info":"bad");
    }catch(e){result.replaceChildren();say(msg,errMsg(e),"bad");}
  }
  ui.appendChild(inputs);ui.appendChild(el("div",{class:"ix-bar"},[
    el("button",{type:"button",class:"ix-btn ix-main",text:"בדיקת ההרכבה",onclick:check}),
    el("button",{type:"button",class:"ix-btn ix-quiet",text:"רמז",onclick:function(){say(msg,"מה מחשבים קודם? זו g. מה עושים לתוצאה? זו f.","info");}}),
    el("button",{type:"button",class:"ix-btn ix-quiet",text:"ניסיון חדש",onclick:function(){fields.f.value="";fields.g.value="";previews.f.replaceChildren();previews.g.replaceChildren();result.replaceChildren();say(msg,"");closeInputKeys();fields.g.focus();}})
  ]));ui.appendChild(result);ui.appendChild(msg);box.appendChild(ui);typeset(ui);
}
function init() {
  if (root.CourseMathInput) root.CourseMathInput.configure({ toLatex:inputLatex });
  // capture phase: the mark is in place before any widget reads the value
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(".blank-input")) markOr(t);
  }, true);
  initRefs();
  initBlanks();
  document.querySelectorAll(".sequence-classify").forEach(initSequenceClassify);
  initSetCases();
  document.querySelectorAll(".composition-practice").forEach(initComposition);
  document.querySelectorAll(".derive").forEach(initDerive);
  document.querySelectorAll(".order").forEach(initOrder);
  // Optional editor downloads must never delay hiding answers or wiring controls.
  if (root.CourseMathInput) root.CourseMathInput.load();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

})(typeof window !== "undefined" ? window : this);
