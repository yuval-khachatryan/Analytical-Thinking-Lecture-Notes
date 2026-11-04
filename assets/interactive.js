/* interactive.js — the reader fills in answers and builds solutions.
   ---------------------------------------------------------------------------
   Loaded on every page (see _styles.html). Three widgets, all written as plain
   Quarto markdown and turned interactive here. Without JavaScript everything
   stays readable: the blanks show their answers and the steps their solution.

   1. Fill-in blanks:  [$\frac{1}{2}$]{.blank ans="1/2"}
        The span's content is the answer as it should LOOK (shown on request and
        in the PDF); ans= is what the reader's input is checked against:
          * a number      ans="sqrt(3)/2"      (checked by value, so 0.5 = 1/2)
          * an expression ans="(x+2)/5"        (checked at many values of x)
          * a set of reals ans="[-1,2)U(2,inf)" or "{3,-2}" or "R" or "{}"
            (intervals, unions, finite sets; the reader may also answer with
             inequalities such as  -1<=x<2 , or a bare list  3, -2 )
        kind="num|expr|set" overrides the guess; miss="v :: message || ..." adds
        a tailored message for a known wrong answer; w= sets the input width.
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
var NAMES = FUNCS.concat(["infinity", "inf", "pi", "or", "in"])
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
    .replace(/∅/g, "{}")
    .replace(/∖/g, "\\")
    .replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/⌊/g, "floor(").replace(/⌋/g, ")")
    .replace(/∈/g, " in ")
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
    if ("()[]{},|_\\;".indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
    if (c === "!") { t.push({ k: "!" }); i++; continue; }   // n! ("!=" was read above)
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
  if (p.k === "num" || p.k === "var" || p.k === "pi" || p.k === "e" || p.k === "fn" || p.k === "(") return true;
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

// A relation: disjuncts joined by "or"; each disjunct is a chain e0 op e1 op e2 ...
Parser.prototype.relation = function () {
  var disj = [];
  do {
    var parts = [this.expr()], ops = [];
    while (this.is("rel")) { ops.push(this.next().v); parts.push(this.expr()); }
    disj.push({ parts: parts, ops: ops });
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
      // a near-zero denominator is treated as 0 (sin(pi) is 1e-16), except for sequences
      // ($exact), whose terms really do get that small (n/2^n at n = 64)
      return b === 0 || (!(env && env.$exact) && Math.abs(b) < 1e-13) ? NaN : a / b;
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
function tex(n, parent) {
  parent = parent || 0;
  var s;
  switch (n.t) {
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
    case "div": s = "\\frac{" + tex(n.a, 0) + "}{" + tex(n.b, 0) + "}"; break;
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
  return wrap(s, prec(n) < parent);
}
var OPTEX = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge", "=": "=", "!=": "\\ne" };
function texChain(d) {
  var s = tex(d.parts[0]);
  for (var i = 0; i < d.ops.length; i++) s += " " + OPTEX[d.ops[i]] + " " + tex(d.parts[i + 1]);
  return s;
}
// HTML (not TeX) for a relation: the disjuncts joined by the Hebrew word.
function htmlRel(r) {
  return r.disj.map(function (d) { return "\\(" + texChain(d) + "\\)"; }).join(" <span class=\"ix-or\">או</span> ");
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

/* ---- parsing a set written by the reader ---- */
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
  if (p.k === "R") {
    this.next();
    var S = [piece(-Infinity, Infinity, 0, 0)];
    if (this.is("\\") || this.is("op", "-")) {
      this.next();
      var ex = this.setTerm();
      ex.forEach(function (q) { if (q.a === q.b) S = subtractPoint(S, q.a); });
    }
    return S;
  }
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
function parseSet(src) {
  var p = new Parser(tokenize(src));
  if (p.atEnd()) throw new ParseError("השדה ריק.");
  if (p.is("var") && p.peek(1) && p.peek(1).k === "in") { p.next(); p.next(); }
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
    S = p.setTerm();
    while (p.is("U") || p.is("or")) { p.next(); S = S.concat(p.setTerm()); }
  }
  if (!p.atEnd()) throw new ParseError("לא הצלחתי לקרוא את סוף הקבוצה.");
  return normSet(S);
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
function compareExpr(ref, got, vars, positive) {
  var envs = sampleEnvs(vars, positive), both = 0, bad = null, gotMissing = null;
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
  var nice = niceEnvs(vars, positive);
  for (var j = 0; j < nice.length; j++) {
    var a2 = ev(ref, nice[j]), b2 = ev(got, nice[j]);
    if (isFinite(a2) && isFinite(b2) && !close(a2, b2, 1e-7)) { bad = nice[j]; break; }
  }
  return { ok: false, why: "value", env: bad, refVal: ev(ref, bad), gotVal: ev(got, bad) };
}

function guessKind(ans) {
  var s = normalize(ans);
  if (/[{}]|\bU\b|inf|\bR\b|[<>]|!=|\bor\b/.test(s)) return "set";
  if (/^\s*[(\[]/.test(s) && /,/.test(s)) return "set";
  var vs;
  try { vs = Object.keys(varsOf(parseExpr(s))); } catch (e) { return "num"; }
  return vs.length ? "expr" : "num";
}

// Returns {ok, msg, near, partial} for one blank. opts: {form, positive}.
function checkAnswer(kind, ans, input, vars, opts) {
  var r = checkValue(kind, ans, input, vars, opts || {});
  if (r.ok && opts && opts.form) {
    var f = checkForm(opts.form, ans, input);
    if (f) return { ok: false, partial: true, msg: f };
  }
  return r;
}
var FORM_MSG = {
  frac: "הערך נכון, אבל כתבו אותו כשבר, למשל <code>3/4</code>.",
  product: "הערך נכון, אבל כתבו אותו כמכפלה של גורמים.",
  simple: "הערך נכון, אבל אפשר לפשט עוד.",
  abs: "הקבוצה נכונה, אבל כתבו אותה בעזרת ערך מוחלט.",
  interval: "הקבוצה נכונה, אבל כתבו אותה בסימון של קטעים, למשל <code>(1,3]</code>."
};
function checkForm(form, ans, input) {
  var s = normalize(input).replace(/\s+/g, "");
  if (form === "frac") {
    var fm = /^-?(\d+)(?:\/(\d+))?$/.exec(s);
    if (!fm) return FORM_MSG.frac;
    var gcd = function (a, b) { return b ? gcd(b, a % b) : a; };
    return fm[2] && gcd(+fm[1], +fm[2]) > 1 ? "הערך נכון, אבל אפשר לצמצם את השבר." : null;
  }
  if (form === "abs") return /\||abs/.test(s) ? null : FORM_MSG.abs;
  if (form === "interval") return /[<>=]|or/.test(s) ? FORM_MSG.interval : null;
  var n;
  try { n = parseExpr(input); } catch (e) { return null; }
  if (form === "product") { while (n.t === "neg") n = n.a; return n.t === "mul" ? null : FORM_MSG.product; }
  if (form === "simple") return nodes(n) <= nodes(parseExpr(ans)) ? null : FORM_MSG.simple;
  return null;
}
function checkValue(kind, ans, input, vars, opts) {
  input = String(input || "").trim();
  if (!input) return { ok: false, empty: true, msg: "עוד לא כתבתם תשובה." };
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
    if (Math.abs(a - b) <= 0.006 * Math.max(1, Math.abs(a))) return { ok: false, near: true, msg: "קרוב מאוד, אבל זה קירוב. כתבו ערך מדויק (שבר, שורש או \\(\\pi\\))." };
    if (a !== 0 && close(a * b, 1, 1e-9)) return { ok: false, msg: "קיבלתם את ההופכי של התשובה." };
    return { ok: false, msg: "לא נכון. נסו שוב." };
  }
  // expression
  var refVars = Object.keys(varsOf(ref)), gotVars = Object.keys(varsOf(got));
  var allowed = (vars && vars.length ? vars : refVars);
  var stray = gotVars.filter(function (v) { return allowed.indexOf(v) < 0; });
  if (stray.length) return { ok: false, msg: "המשתנה \\(" + stray[0] + "\\) לא אמור להופיע כאן. השתמשו ב-\\(" + allowed.join(", ") + "\\)." };
  var r = compareExpr(ref, got, allowed.length ? allowed : ["x"], opts.positive);
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
  add:      "הוספה או חיסור של אותו דבר בשני האגפים",
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
var MIRROR = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=", "!=": "!=" };

function reverseChain(d) {
  return { parts: d.parts.slice().reverse(), ops: d.ops.slice().reverse().map(function (o) { return MIRROR[o]; }) };
}
function opsEqual(a, b) { return a.length === b.length && a.every(function (o, i) { return o === b[i]; }); }
function opsFlipped(a, b) { return a.length === b.length && a.every(function (o, i) { return b[i] === MIRROR[o]; }); }
function isIneq(ops) { return ops.some(function (o) { return o !== "=" && o !== "!="; }); }

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

function isSolved(R, v) {
  return R.disj.every(function (d) {
    if (d.parts.length === 2) {
      return (d.parts[0].t === "var" && d.parts[0].n === v && !hasVar(d.parts[1], v)) ||
        (d.parts[1].t === "var" && d.parts[1].n === v && !hasVar(d.parts[0], v));
    }
    if (d.parts.length === 3) {
      return d.parts[1].t === "var" && d.parts[1].n === v && !hasVar(d.parts[0], v) && !hasVar(d.parts[2], v);
    }
    return false;
  });
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
  var same = relSets(prev, line, cfg.solve, params, cfg.positive);
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
    ? " כשמפרקים ערך מוחלט מקבלים <b>שני</b> תנאים: \\(|E| < c\\) פירושו \\(-c < E < c\\), ו-\\(|E| > c\\) פירושו \\(E > c\\) או \\(E < -c\\)." : "";
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
if (typeof document === "undefined") {
  if (typeof module !== "undefined") module.exports = {
    parseExpr: parseExpr, parseRelation: parseRelation, parseSet: parseSet, ev: ev, tex: tex, texChain: texChain,
    setTex: setTex, solveSet: solveSet, checkAnswer: checkAnswer, guessKind: guessKind, judgeStep: judgeStep,
    classifyStep: classifyStep, isSolved: isSolved, fmtNum: fmtNum, nodes: nodes, ParseError: ParseError,
    parsedSoFar: parsedSoFar, limOf: limOf, judgeLimStep: judgeLimStep, limDone: limDone, LIMRULES: LIMRULES
  };
  return;
}

function attr(el, name) {
  var v = el.getAttribute("data-" + name);
  return v === null ? el.getAttribute(name) : v;
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
    if (tries < 60) setTimeout(function () { typeset(node, tries + 1); }, 250);
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
  var a = input.selectionStart, b = input.selectionEnd;
  if (a === null || a === undefined) { a = b = input.value.length; }
  var pos = a + text.length;
  // "√()" / "{}" / "||" put the caret inside the brackets
  if (/\(\)$|\{\}$|\|\|$/.test(text)) pos = a + text.length - 1;
  input.value = input.value.slice(0, a) + text + input.value.slice(b);
  input.focus();
  input.setSelectionRange(pos, pos);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
// "x=4 או x=-1" in a left-to-right input: the bidi algorithm pulls the number that follows
// the Hebrew word over to its other side ("x=4 1- או x="). An invisible left-to-right mark
// right after "או" keeps the typed order on screen; normalize() reads the mark as a space.
function markOr(input) {
  var v = input.value;
  if (v.indexOf("או") < 0) return;
  var pos = input.selectionStart, out = "", added = 0;
  for (var i = 0; i < v.length; i++) {
    out += v[i];
    if (v[i] === "ו" && v[i - 1] === "א" && v[i + 1] !== "\u200e") { out += "\u200e"; if (pos !== null && i < pos) added++; }
  }
  if (out === v) return;
  input.value = out;
  if (pos !== null) input.setSelectionRange(pos + added, pos + added);
}
var KEYSETS = {
  lim: [["n", "n"], ["^", "^"], ["√", "√()"], ["( )", "()"], ["∞", "∞"], ["e", "e"], ["!", "!"], ["π", "π"]],
  num: [["√", "√()"], ["π", "π"]],
  set: [["∞", "∞"], ["−∞", "-∞"], ["∪", " ∪ "], ["[", "["], ["]", "]"], ["(", "("], [")", ")"], ["{ }", "{}"], ["∅", "∅"], ["ℝ", "ℝ"]],
  expr: [["x", "x"], ["^", "^"], ["√", "√()"], ["( )", "()"], ["| |", "||"], ["π", "π"]],
  rel: [["<", "<"], [">", ">"], ["≤", "≤"], ["≥", "≥"], ["=", "="], ["או", " או "], ["^", "^"], ["√", "√()"], ["| |", "||"], ["log", "log_()"], ["π", "π"]]
};
function keyRow(keys, target) {
  return el("div", { class: "ix-keys", role: "group", "aria-label": "סימנים" }, keys.map(function (k) {
    return el("button", { type: "button", class: "ix-key", text: k[0], tabindex: "-1",
      onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { var t = target(); if (t) insertAtCaret(t, k[1]); } });
  }));
}
// The preview under an input is just the formula; dimmed while it is still incomplete.
function showParsed(pv, html, whole) {
  pv.innerHTML = mx(html);
  pv.classList.toggle("ix-preview-partial", !whole);
  typeset(pv);
}
function debounce(f, ms) { var h; return function () { var a = arguments, me = this; clearTimeout(h); h = setTimeout(function () { f.apply(me, a); }, ms); }; }

/* ---------------- 6a. Fill-in blanks ---------------- */
function initBlanks() {
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
  var box = G.node, items = [], kinds = {}, last = null, panel = el("div", { class: "ix-panel" });
  G.items.forEach(function (sp) {
    var ans = attr(sp, "ans");
    if (ans === null) return;
    var kind = attr(sp, "kind") || guessKind(ans);
    kinds[kind] = true;
    var w = +attr(sp, "w") || Math.min(26, Math.max(4, normalize(ans).replace(/\s+/g, "").length + 2));
    if (sp.closest("td, th")) w = Math.min(w, 7);      // keep tables inside their box
    var shown = el("span", { class: "blank-answer" });
    while (sp.firstChild) shown.appendChild(sp.firstChild);
    shown.hidden = true;
    var input = el("input", { type: "text", class: "blank-input", dir: "ltr", size: String(w), autocomplete: "off",
      spellcheck: "false", "aria-label": "התשובה שלכם" });
    var mark = el("span", { class: "blank-mark", "aria-hidden": "true" });
    sp.appendChild(input);
    sp.appendChild(mark);
    sp.appendChild(shown);
    sp.classList.add("blank-ready");
    var it = { sp: sp, ans: ans, kind: kind, input: input, mark: mark, shown: shown,
      vars: (attr(sp, "vars") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
      miss: parseMiss(attr(sp, "miss")),
      opts: { form: attr(sp, "form"), positive: (attr(sp, "positive") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean) } };
    input.addEventListener("focus", function () { last = it; panel.classList.add("ix-active"); });
    input.addEventListener("blur", function () { setTimeout(function () {
      if (!panel.contains(document.activeElement) && !items.some(function (x) { return x.input === document.activeElement; }))
        panel.classList.remove("ix-active");
    }, 150); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); checkOne(it, true); allDone(); }
    });
    input.addEventListener("input", function () {
      sp.classList.remove("ok", "bad", "warn");
      mark.textContent = "";
      preview(it);
    });
    items.push(it);
  });
  if (!items.length) return;
  var hints = childDivs(box, "hint"), explain = childDivs(box, "explain");
  hints.concat(explain).forEach(function (h) { h.classList.add("ix-hidden"); });
  var h = 0;
  var msg = el("div", { class: "ix-msg", "aria-live": "polite" });
  var pv = el("div", { class: "ix-preview", "aria-live": "off" });
  var bHint = hints.length ? el("button", { type: "button", class: "ix-btn", onclick: function () {
    if (h < hints.length) { hints[h].classList.remove("ix-hidden"); typeset(hints[h]); h++; }
    bHint.textContent = "רמז (" + h + "/" + hints.length + ")"; bHint.disabled = h >= hints.length;
  } }, ["רמז (0/" + hints.length + ")"]) : null;
  var bShow = el("button", { type: "button", class: "ix-btn ix-quiet", onclick: showAll }, [items.length > 1 ? "הצגת התשובות" : "הצגת התשובה"]);
  var bReset = el("button", { type: "button", class: "ix-btn ix-quiet", hidden: true, onclick: reset }, ["ניסיון חדש"]);
  var bar = el("div", { class: "ix-bar" }, [
    el("button", { type: "button", class: "ix-btn ix-main", onclick: function () { checkAll(); } }, ["בדיקה"]),
    bHint, bShow, bReset]);
  // Keys only for what is awkward to type (√, π, ∞, ∪, ...), and only when an answer in
  // the group needs them: "/" and "^" are on every keyboard, and a √ under a fraction
  // question would wrongly suggest a root. keys="none" on the .fill turns them off.
  var keyKinds = Object.keys(kinds).filter(function (k) { return k !== "num"; });
  var needNumKeys = items.some(function (it) {
    return it.kind === "num" && it.opts.form !== "frac" && /sqrt|cbrt|pi/.test(normalize(it.ans));
  });
  var keys = [];
  keyKinds.forEach(function (k) { keys = keys.concat(KEYSETS[k] || []); });
  if (needNumKeys) keys = KEYSETS.num.concat(keys);
  if (attr(box, "keys") === "none") keys = [];
  var seen = {};
  keys = keys.filter(function (k) { if (seen[k[0]]) return false; seen[k[0]] = 1; return true; });
  [keys.length ? keyRow(keys, function () { return last && last.input; }) : null, pv, bar, msg].forEach(function (c) { if (c) panel.appendChild(c); });
  var anchor = box.classList.contains("fill") ? (hints[0] || explain[0] || null) : null;
  if (box.classList.contains("fill")) box.insertBefore(panel, anchor);
  else if (box.tagName === "TABLE" || box.tagName === "UL" || box.tagName === "OL" || box.tagName === "P") box.parentNode.insertBefore(panel, box.nextSibling);
  else box.appendChild(panel);
  box.classList.add("fill-ready");

  function preview(it) {
    var v = it.input.value.trim();
    if (!v || it.kind === "num" && /^-?\d+(\.\d+)?$/.test(v)) { pv.innerHTML = ""; return; }
    previewLater(it, v);
  }
  var previewLater = debounce(function (it, v) {
    var set = it.kind === "set", got = parsedSoFar(v, set ? parseSet : parseExpr);
    if (!got) { pv.innerHTML = ""; return; }
    showParsed(pv, "\\(" + (set ? setTex(got.node) : tex(got.node)) + "\\)", got.whole);
  }, 350);

  function checkOne(it, talk) {
    var r;
    try { r = checkAnswer(it.kind, it.ans, it.input.value, it.vars, it.opts); }
    catch (e) { r = { ok: false, msg: errMsg(e) }; }
    if (!r.ok && !r.empty && it.miss.length) {
      for (var i = 0; i < it.miss.length; i++) {
        var m;
        try { m = checkValue(it.kind, it.miss[i][0], it.input.value, it.vars, it.opts); } catch (e) { m = { ok: false }; }
        if (m.ok) { r.msg = it.miss[i][1]; break; }
      }
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
  }
  function showAll() {
    items.forEach(function (it) {
      it.input.hidden = true; it.mark.textContent = ""; it.shown.hidden = false; it.sp.classList.add("revealed");
    });
    explain.forEach(function (x) { x.classList.remove("ix-hidden"); typeset(x); });
    say(msg, "");
    pv.innerHTML = "";
    bShow.hidden = true; bReset.hidden = false;
  }
  function reset() {
    items.forEach(function (it) {
      it.input.hidden = false; it.input.value = ""; it.shown.hidden = true; it.mark.textContent = "";
      it.sp.classList.remove("revealed", "ok", "bad", "warn");
    });
    explain.forEach(function (x) { x.classList.add("ix-hidden"); });
    say(msg, "");
    bShow.hidden = false; bReset.hidden = true;
  }
}
function parseMiss(s) {
  if (!s) return [];
  return s.split("||").map(function (p) {
    var i = p.indexOf("::");
    return i < 0 ? null : [p.slice(0, i).trim(), p.slice(i + 2).trim().replace(/\$([^$]+)\$/g, "\\($1\\)")];
  }).filter(Boolean);
}

/* ---------------- 6b. Step builder: a solution ledger ----------------
   Laid out like the directed proofs of the Ramat Gan notes (their proof and
   argument editors): the goal and the starting line on top, then one
   fieldset per step: "מה עושים בצעד הזה?" (the rule) and the new line. A step
   that checks out folds into one line (label | new line | rule | עריכה), and
   the next step opens. "סיימתי — בדקו" checks everything; the last line gets
   a ✓ once the variable stands alone (or the expression is simple enough). */
var STEP_HELP = {
  rel: [
    "בכל צעד בחרו מהרשימה מה עושים, וכתבו את השורה שמתקבלת. אחר כך לחצו על ״בדיקת הצעד״ (או Enter).",
    "כל שורה צריכה להיות <b>שקולה</b> לשורה שלפניה, כלומר עם אותה קבוצת פתרונות. הבודק בודק גם שהפעולה שבחרתם היא באמת מה שעשיתם.",
    "בכל צעד פעולה אחת. שורה נכונה שמשלבת שתי פעולות תקבל ״נכון, אבל פצלו לשני צעדים״.",
    "צעד שאושר מוצג כשורה קצרה עם הפעולה שלו, והצעד הבא נפתח. אפשר לערוך צעד, למחוק אותו או לחזור לצעד האחרון.",
    "מסיימים כשהמשתנה לבד באחד האגפים. כדאי לכתוב את הפתרון גם על דף, עם הפעולה לצד כל שורה."
  ],
  lim: [
    "כל שורה היא שלב בחישוב הגבול. כל עוד יש בשורה \\(n\\), היא סדרה שעוד לא עברנו לגבול שלה, והיא חייבת להיות <b>שווה</b> לשורה הקודמת לכל \\(n\\).",
    "כשאפשר, עוברים לגבול: מחליפים כל סדרה סטנדרטית בגבול שלה (למשל \\(\\frac{1}{n} \\to 0\\)) ומחשבים לפי חשבון הגבולות. אם יוצאת צורה לא מוגדרת, כמו \\(\\frac{\\infty}{\\infty}\\), הבודק יעצור ויציע מה לעשות קודם.",
    "את \\(\\infty\\) כותבים <code>inf</code>. ״רמז לצעד״ בוחר את הפעולה, אחר כך משלים חלק מהשורה, ובסוף כותב אותה כולה.",
    "צעד שאושר מוצג כשורה קצרה, והצעד הבא נפתח. אפשר לערוך צעד, למחוק אותו או לחזור לצעד האחרון."
  ],
  expr: [
    "בכל צעד כתבו את השלב הבא בחישוב" + " (ואם יש רשימה, בחרו בה מה עשיתם). אחר כך לחצו על ״בדיקת הצעד״ (או Enter).",
    "כל שלב צריך להיות <b>שווה</b> לקודם, לכל ערך של המשתנה.",
    "צעד שאושר מוצג כשורה קצרה, והצעד הבא נפתח. אפשר לערוך צעד, למחוק אותו או לחזור לצעד האחרון.",
    "מסיימים כשהביטוי פשוט. כדאי לכתוב את החישוב גם על דף."
  ]
};
var stepSerial = 0;
function initSteps(box) {
  var startSrc = attr(box, "start");
  if (!startSrc) return;
  var vars = (attr(box, "vars") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var positive = (attr(box, "positive") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var start, mode, seqVar = attr(box, "limit");
  try {
    if (seqVar) { start = parseExpr(startSrc); mode = "lim"; vars = [seqVar]; }
    else {
      start = parseRelation(startSrc);
      mode = isRelation(start) ? "rel" : "expr";
      if (mode === "expr") start = parseExpr(startSrc);
    }
  } catch (e) { box.appendChild(el("p", { class: "ix-msg ix-bad", text: "שגיאה בהגדרת התרגיל: " + errMsg(e) })); return; }
  if (!vars.length) vars = Object.keys(varsOf(start)).sort();
  if (!vars.length) vars = ["x"];
  var solveVar = attr(box, "solve") || (vars.indexOf("x") >= 0 ? "x" : vars[0]);
  var goalSrc = attr(box, "goal"), goal = null;
  if (goalSrc) { try { goal = parseExpr(goalSrc); } catch (e) { goal = null; } }
  var ruleKeys = (attr(box, "rules") || "").split("|").map(function (s) { return s.trim(); }).filter(Boolean);
  var lim = mode === "lim", TABLE = lim ? LIMRULES : RULES;
  var verify = mode !== "expr" && ruleKeys.length > 0 && ruleKeys.every(function (k) { return TABLE[k]; });
  var labels = ruleKeys.map(function (k) { return lim ? (LIMRULES[k] ? LIMRULES[k].label : k) : (RULES[k] || k); });
  var cfg = { vars: vars, solve: solveVar, positive: positive, verify: verify, mode: mode, seq: seqVar };
  var rel = mode === "rel";
  var keyset = rel ? KEYSETS.rel : lim ? KEYSETS.lim : KEYSETS.expr.concat([["log", "log_()"]]);
  // The model solution, for the hints of a single step: "line :: rule || line :: rule".
  // [..] in a line marks what the second hint level leaves as a blank square.
  var model = (attr(box, "model") || "").split("||").map(function (st) {
    var parts = st.split("::").map(function (x) { return x.trim(); });
    if (!parts[0]) return null;
    return { full: parts[0].replace(/[\[\]]/g, ""), partial: /\[/.test(parts[0]) ? parts[0].replace(/\[[^\]]*\]/g, "▢") : null, rule: parts[1] || "" };
  }).filter(Boolean);

  var hints = childDivs(box, "hint"), sols = childDivs(box, "solution");
  hints.concat(sols).forEach(function (x) { x.classList.add("ix-hidden"); });
  var rows = [], accepted = 0, h = 0;

  function button(text, cls, action) {
    return el("button", { type: "button", class: "ix-btn" + (cls ? " " + cls : ""), onclick: action }, [text]);
  }
  var LIMTEX = "\\lim\\limits_{" + seqVar + " \\to \\infty} ";
  function lineHtml(node) {
    if (rel) return htmlRel(node);
    return "\\(" + (lim && hasVar(node, seqVar) ? LIMTEX : "") + tex(node) + "\\)";
  }
  var goalText = rel
    ? "המטרה: להגיע לשורה שבה \\(" + solveVar + "\\) לבד באחד האגפים."
    : lim ? "המטרה: לחשב את הגבול."
    : goal ? "המטרה: לפשט עד \\(" + tex(goal) + "\\)." : "המטרה: לפשט את הביטוי.";
  var startRow = el("div", { class: "st-given" }, [
    el("span", { class: "given-label", text: "נקודת המוצא" }),
    el("div", { class: "st-formula", html: mx(lineHtml(start)) })
  ]);
  var list = el("div", { class: "proof-steps" });
  var ledger = el("section", { class: "proof-ledger", "aria-label": "הפתרון" }, [
    el("div", { class: "proof-start st-goal", html: mx(goalText) }), startRow, list
  ]);
  var summary = el("div", { class: "ix-msg", "aria-live": "polite" });
  var bAdd = button("הוספת צעד", "", function () { addRow(true); });
  var bUndo = button("חזרה לצעד האחרון", "ix-quiet", undo);
  var bDone = button("סיימתי — בדקו", "ix-main", function () { check(rows.length - 1, true); });
  var bHint = hints.length ? button("רמז (0/" + hints.length + ")", "", function () {
    if (h < hints.length) { hints[h].classList.remove("ix-hidden"); typeset(hints[h]); h++; }
    bHint.textContent = "רמז (" + h + "/" + hints.length + ")"; bHint.disabled = h >= hints.length;
  }) : null;
  var bSol = sols.length ? button("הצגת פתרון מלא", "ix-quiet", function () {
    sols.forEach(function (x) { x.classList.toggle("ix-hidden"); typeset(x); });
    bSol.textContent = sols[0].classList.contains("ix-hidden") ? "הצגת פתרון מלא" : "הסתרת הפתרון";
  }) : null;
  var help = el("details", { class: "activity-help" }, [
    el("summary", { text: rel ? "איך כותבים ובודקים פתרון כאן?" : "איך כותבים ובודקים חישוב כאן?" }),
    el("ol", {}, STEP_HELP[mode].map(function (t) { return el("li", { html: mx(t) }); }))
  ]);
  var ui = el("div", { class: "st-ui" }, [
    help, ledger, el("div", { class: "ix-bar st-controls" }, [bAdd, bUndo, bDone]), summary,
    (bHint || bSol) ? el("div", { class: "ix-bar" }, [bHint, bSol]) : null
  ]);
  box.insertBefore(ui, hints[0] || sols[0] || null);
  box.classList.add("steps-ready");
  typeset(ui);
  addRow(false);

  function isBlank(R) { return !R.input.value.trim() && !(R.select && R.select.value); }
  function addRow(focus) {
    if (rows.length >= 20) return;
    var fbId = "st-msg-" + (++stepSerial);
    var legend = el("legend");
    var label = el("span", { class: "step-label", "aria-hidden": "true" });
    var select = labels.length ? el("select", { class: "proof-rule" },
      [el("option", { value: "", text: "בחרו מהרשימה…" })].concat(ruleKeys.map(function (k, i) {
        return el("option", { value: k, text: labels[i] });
      }))) : null;
    var input = el("input", { type: "text", class: "st-in", dir: "ltr", autocomplete: "off", spellcheck: "false",
      "aria-describedby": fbId, placeholder: rel ? "כתבו כאן את השורה שמתקבלת" : "כתבו כאן את השלב הבא" });
    var pv = el("div", { class: "ix-preview" });
    var fb = el("div", { id: fbId, class: "ix-msg", "aria-live": "polite" });
    var R = {};
    var editor = el("div", { class: "step-editor" }, [
      select ? el("label", { class: "proof-field" }, [el("span", { text: "מה עושים בצעד הזה?" }), select]) : null,
      el("label", { class: "proof-field" }, [el("span", { text: rel ? "השורה שמתקבלת" : "השלב הבא בחישוב" }), input]),
      keyRow(keyset, function () { return input; }), pv, fb,
      el("div", { class: "ix-bar" }, [
        button("בדיקת הצעד", "", function () { check(rows.indexOf(R), false); }),
        model.length ? (R.hintBtn = button("רמז לצעד", "", function () { stepHint(R); })) : null,
        button("מחיקת הצעד", "ix-quiet", function () { removeRow(R); })
      ])
    ]);
    // As in the Ramat Gan equivalence proofs: the new line, and under it the rule.
    var formula = el("div", { class: "st-formula" });
    var words = el("div", { class: "step-compact-reason" });
    var statement = el("div", { class: "step-statement" }, [formula]);
    var edit = button("עריכה", "step-edit", function () { invalidate(rows.indexOf(R)); focusRow(R); });
    var qed = el("span", { class: "proof-qed", text: "✓ סוף הפתרון" });
    var compact = el("div", { class: "step-compact" }, [statement, words, edit, qed]);
    compact.hidden = true; qed.hidden = true;
    var fs = el("fieldset", { class: "proof-step side-labelled" }, [legend, label, compact, editor]);
    R.fs = fs; R.legend = legend; R.label = label; R.select = select; R.input = input; R.pv = pv; R.fb = fb;
    R.editor = editor; R.compact = compact; R.formula = formula; R.words = words; R.statement = statement; R.qed = qed;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(rows.indexOf(R), false); } });
    input.addEventListener("input", function () { invalidate(rows.indexOf(R)); showPreview(R); });
    if (select) select.addEventListener("change", function () { invalidate(rows.indexOf(R)); });
    rows.push(R);
    list.appendChild(fs);
    renumber();
    if (focus) focusRow(R);
    return R;
  }
  function renumber() {
    rows.forEach(function (R, i) {
      R.legend.textContent = "צעד " + (i + 1);
      R.label.textContent = "צעד " + (i + 1);
      R.input.setAttribute("aria-label", "השורה בצעד " + (i + 1));
      if (R.select) R.select.setAttribute("aria-label", "מה עושים בצעד " + (i + 1));
    });
    bAdd.disabled = rows.length >= 20;
    bUndo.disabled = !accepted;
  }
  function focusRow(R) {
    if (!R) return;
    (R.select && !R.select.value ? R.select : R.input).focus();
  }
  var showPreview = debounce(function (R) {
    var v = R.input.value.trim();
    if (!v) { R.pv.innerHTML = ""; return; }
    // a hint's blank squares are read as a placeholder letter and shown as squares
    var sq = v.indexOf("▢") >= 0;
    var got = parsedSoFar(sq ? v.replace(/▢/g, "Z") : v, rel ? parseRelation : parseExpr);
    if (!got) { R.pv.innerHTML = ""; return; }
    var html = rel ? htmlRel(got.node) : lineHtml(got.node);
    if (sq) html = html.replace(/z/g, "\\square ");
    showParsed(R.pv, html, got.whole && !sq);
  }, 350);

  // A hint for one step, in up to three levels: the rule, the line with blank squares,
  // the whole line. It follows the model solution from the line the reader is at, when that
  // line is in the model; otherwise it goes by the step number.
  function keyOf(node) { return rel ? htmlRel(node) : tex(node); }
  function stepHint(R) {
    var i = rows.indexOf(R), before = start, j = i, note = "";
    if (i > 0) { try { before = parseLine(rows[i - 1].input.value.replace(/\u200e/g, "")); } catch (e) { before = null; } }
    if (i === 0) j = 0;
    else if (before) {
      var k = before ? keyOf(before) : null, found = -1;
      model.forEach(function (m, idx) { try { if (keyOf(parseLine(m.full)) === k) found = idx; } catch (e) {} });
      if (found >= 0) j = found + 1; else note = " (הדרך שלכם שונה מהפתרון לדוגמה, ולכן הרמז הולך לפי מספר הצעד.)";
    }
    var m = model[j];
    if (!m) { say(R.fb, "לפי הפתרון לדוגמה, כבר הגעתם לסוף. לחצו על ״סיימתי — בדקו״.", "info"); return; }
    var levels = [];
    if (R.select && m.rule) levels.push("rule");
    if (m.partial) levels.push("partial");
    levels.push("full");
    R.hl = R.hlFor === j ? Math.min(R.hl + 1, levels.length) : 1; R.hlFor = j;
    var what = levels[R.hl - 1];
    if (what === "rule") {
      R.select.value = m.rule; R.select.dispatchEvent(new Event("change", { bubbles: true }));
      say(R.fb, "רמז: בצעד הזה — " + R.select.options[R.select.selectedIndex].text + "." + note, "info");
    } else {
      if (R.select && m.rule && !R.select.value) { R.select.value = m.rule; R.select.dispatchEvent(new Event("change", { bubbles: true })); }
      R.input.value = what === "partial" ? m.partial : m.full;
      R.input.dispatchEvent(new Event("input", { bubbles: true }));
      say(R.fb, what === "partial" ? "רמז: השלימו את המשבצות ▢ ובדקו." + note : "זו השורה מהפתרון לדוגמה. לחצו על ״בדיקת הצעד״." + note, "info");
      R.input.focus();
    }
    R.hintBtn.textContent = "רמז לצעד (" + R.hl + "/" + levels.length + ")";
  }
  function acceptRow(R, line) {
    R.formula.innerHTML = mx(rel ? "\\(\\iff\\) " + htmlRel(line) : "\\(= " + (lim && hasVar(line, seqVar) ? LIMTEX : "") + tex(line) + "\\)");
    var rule = R.select ? R.select.options[R.select.selectedIndex].text : "";
    R.words.textContent = rule; R.words.hidden = !rule;
    R.compact.hidden = false; R.editor.hidden = true; R.qed.hidden = true;
    R.fs.classList.add("step-accepted");
    R.input.removeAttribute("aria-invalid");
    say(R.fb, "");
    typeset(R.formula);
  }
  function expandRow(R) {
    R.compact.hidden = true; R.editor.hidden = false; R.qed.hidden = true;
    R.fs.classList.remove("step-accepted");
  }
  // Steps from `from` on depend on what changed: open them again for checking.
  function invalidate(from) {
    if (from < 0) return;
    accepted = Math.min(accepted, from);
    rows.forEach(function (R, i) {
      if (i < from) return;
      expandRow(R); say(R.fb, ""); R.input.removeAttribute("aria-invalid");
    });
    say(summary, "");
    bUndo.disabled = !accepted;
  }
  function removeRow(R) {
    var i = rows.indexOf(R);
    rows.splice(i, 1); R.fs.remove();
    if (!rows.length) addRow(false);
    invalidate(Math.min(i, rows.length - 1));
    renumber();
    focusRow(rows[Math.min(i, rows.length - 1)]);
  }
  function undo() {
    if (!accepted) return;
    var i = accepted - 1;
    while (rows.length > i + 1 && isBlank(rows[rows.length - 1])) rows.pop().fs.remove();
    invalidate(i);
    renumber();
    focusRow(rows[i]);
  }
  function parseLine(v) { return rel ? parseRelation(v) : parseExpr(v); }
  function stop(R, html, kind, target) {
    say(R.fb, html, kind);
    if (kind === "bad") R.input.setAttribute("aria-invalid", "true");
    (target || R.input).focus();
  }
  function check(last, finishing) {
    if (finishing) while (last > 0 && isBlank(rows[last])) last--;
    invalidate(0);
    var prev = start, bad = -1;
    for (var i = 0; i <= last; i++) {
      var R = rows[i], v = R.input.value.trim(), line;
      if (!v) { stop(R, rel ? "כתבו כאן את השורה שמתקבלת." : "כתבו כאן את השלב הבא.", "info"); bad = i; break; }
      if (v.indexOf("▢") >= 0) { stop(R, "השלימו את המשבצות ▢ לפני הבדיקה.", "info"); bad = i; break; }
      try { line = parseLine(v); } catch (e) { stop(R, errMsg(e), "bad"); bad = i; break; }
      if (R.select && !R.select.value) { stop(R, "בחרו מהרשימה מה עושים בצעד הזה.", "info", R.select); bad = i; break; }
      var j = judgeStep(prev, line, R.select ? R.select.value : null, cfg);
      if (!j.ok) { stop(R, j.msg, j.partial ? "warn" : "bad"); bad = i; break; }
      acceptRow(R, line);
      prev = line; accepted = i + 1;
    }
    bUndo.disabled = !accepted;
    if (bad >= 0) {
      rows.slice(bad + 1).forEach(function (R) { if (!isBlank(R)) say(R.fb, "ממתין לתיקון הצעד הקודם.", "info"); });
      say(summary, "צריך לתקן את צעד " + (bad + 1) + "." + (bad ? " הצעדים שלפניו נכונים." : "") +
        (rows.length > bad + 1 ? " הצעדים שאחריו עדיין לא נבדקו." : ""), "bad");
      return;
    }
    var done = accepted > 0 && (rel ? isSolved(prev, solveVar) : lim ? limDone(prev, seqVar) : (goal ? nodes(prev) <= nodes(goal) : false));
    if (done) {
      while (rows.length > accepted && isBlank(rows[rows.length - 1])) rows.pop().fs.remove();
      renumber();
      if (rows.length > accepted) {
        say(summary, "המטרה כבר הושגה בצעד " + accepted + ". מחקו את הצעדים שאחריו.", "info");
        return;
      }
      rows[accepted - 1].qed.hidden = false;
      say(summary, rel ? "✓ הפתרון הושלם! \\(" + solveVar + "\\) לבד, וכל צעד נכון."
        : lim ? "✓ החישוב הושלם: \\(" + LIMTEX + tex(start) + " = " + tex(prev) + "\\)."
        : "✓ סיימתם! כל צעד נכון, והגעתם לביטוי פשוט.", "good");
      return;
    }
    say(summary, finishing
      ? (rel ? "כל הצעדים נכונים, אבל \\(" + solveVar + "\\) עדיין לא לבד. המשיכו."
        : lim ? "כל הצעדים נכונים, אבל עוד לא הגעתם למספר. המשיכו." : "כל הצעדים נכונים, אבל אפשר לפשט עוד. המשיכו.")
      : "הצעדים שנבדקו נכונים. המשיכו לצעד הבא, או לחצו על ״סיימתי — בדקו״.", "info");
    if (rows.length === accepted) addRow(false);
    focusRow(rows[accepted]);
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
  c.querySelectorAll(".ix-panel, .st-ui, .ord-ui, .solve-bar, .tf-opt, .tf-feedback, .fill > .hint, .steps > .hint")
    .forEach(function (n) { n.remove(); });
  c.querySelectorAll(".blank-input, .blank-mark").forEach(function (n) { n.remove(); });
  c.querySelectorAll(".blank-answer").forEach(function (n) { n.hidden = false; });
  c.querySelectorAll(".ix-hidden, .solve-hidden").forEach(function (n) { n.classList.remove("ix-hidden", "solve-hidden"); });
  c.querySelectorAll(".tf-quiz").forEach(function (q) { q.classList.remove("tf-js"); });
  c.querySelectorAll("details").forEach(function (d) { d.open = true; });
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
    var block = a.closest("p, li, td, th, dd, figcaption, .thmbox") || a.parentElement;
    if (block.tagName === "TD" || block.tagName === "TH") block = block.closest("table");
    block.parentNode.insertBefore(panel, block.nextSibling);
    var entry = { link: a, panel: panel };
    open.push(entry);
    a.classList.add("xref-open");
    a.setAttribute("aria-expanded", "true");
    close.addEventListener("click", function () { closePanel(entry); a.focus(); });
    jump.addEventListener("click", function () { closePanel(entry); });
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && open.length) {
      var last = open[open.length - 1];
      closePanel(last);
      last.link.focus();
    }
  });
}

function init() {
  // capture phase: the mark is in place before any widget reads the value
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(".st-in, .blank-input")) markOr(t);
  }, true);
  initRefs();
  initBlanks();
  document.querySelectorAll(".steps").forEach(initSteps);
  document.querySelectorAll(".order").forEach(initOrder);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

})(typeof window !== "undefined" ? window : this);
