// Every guided derivation (.derive) in the lecture files:
//  - the start and every line parse, also with their boxes as placeholders (as the page draws them);
//  - every line says the same as the line before it (an equivalent relation, an equal
//    expression, the same sequence, or the correct limit of it);
//  - every box's answer checks against itself, and sign boxes sit only in relations;
//  - the last line is an answer: x alone (relations), a number (limits), the goal (expressions).
// Run from Notes/:  node tests/derive.test.js
const fs = require('fs');
const M = require('../assets/interactive.js');
const files = fs.readdirSync('.').filter(f => /^\d\d-.*\.qmd$/.test(f));
let count = 0, bad = 0;
const attrsOf = s => { const a = {}; s.replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { a[k] = v; }); return a; };
const plain = s => (s || '').replace(/\\\(|\\\)|<[^>]+>/g, '');
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(:{3,})\s*\{\.derive ([^\n]*)\}\s*$/.exec(lines[i]);
    if (!m) continue;
    count++;
    const fence = m[1], A = attrsOf(m[2]), where = `${f}:${i + 1}`;
    const fail = msg => { bad++; console.log(`${where} ${A.start}: ${msg}`); };
    const steps = [];
    let j = i + 1;
    for (; j < lines.length && lines[j].trim() !== fence; j++) {
      const s = /^:::\s*\{\.step ([^\n]*)\}\s*$/.exec(lines[j]);
      if (s) steps.push({ line: attrsOf(s[1]).line, allowExpression:attrsOf(s[1])['allow-expression']==='true', at: j + 1 });
    }
    if (j >= lines.length) { fail('no closing fence ' + fence); continue; }
    if (!steps.length) { fail('no steps'); continue; }
    const seq = A.limit;
    let prev, mode;
    try {
      if (seq) { prev = M.parseExpr(A.start); mode = 'lim'; }
      else { prev = M.parseRelation(A.start); mode = prev.disj.some(d => d.ops.length) ? 'rel' : 'expr'; if (mode === 'expr') prev = M.parseExpr(A.start); }
    } catch (e) { fail('start does not parse: ' + e.message); continue; }
    let vars = A.vars ? A.vars.split(',').map(s => s.trim()) : seq ? [seq] : Object.keys(varsIn(A.start)).sort();
    if (!vars.length) vars = ['x'];
    const solve = A.solve || (vars.includes('x') ? 'x' : vars[0]);
    const cfg = { vars, solve, positive: (A.positive || '').split(',').filter(Boolean), verify: false, mode, seq };
    for (const st of steps) {
      if (st.line === undefined) { fail(`line ${st.at}: a step without line=`); break; }
      const P = M.prepLine(st.line);
      let L;
      try {
        if (mode === 'rel') { M.parseRelation(P.text); L = M.parseRelation(P.full); }
        else { M.parseExpr(P.text); L = M.parseExpr(P.full); }
      } catch (e) { fail(`line ${st.at} "${st.line}" does not parse: ${e.message}`); break; }
      for (const b of P.boxes) {
        if (b.sign) { if (mode !== 'rel') fail(`line ${st.at}: a sign box outside a relation`); continue; }
        const kind = /^\s*-?\s*inf\s*$/.test(b.ans) ? 'num' : M.guessKind(b.ans);
        try { const r = M.checkAnswer(kind, b.ans, b.ans, vars, {allowExpression:st.allowExpression}); if (!r.ok) fail(`line ${st.at}: box [${b.ans}] fails its own check`); }
        catch (e) { fail(`line ${st.at}: box [${b.ans}] does not parse: ${e.message}`); }
      }
      const r = M.judgeStep(prev, L, null, cfg);
      if (!r.ok) fail(`line ${st.at} "${st.line}": ${plain(r.msg)}`);
      prev = L;
    }
    const done = mode === 'rel' ? M.isSolved(prev, solve)
      : mode === 'lim' ? M.limDone(prev, seq)
      : !A.goal || M.tex(prev) === M.tex(M.parseExpr(A.goal));
    if (!done) fail('the last line is not an answer');
  }
}
// the variables of an expression or relation, read from its parse tree
function varsIn(s) {
  const o = {};
  const walk = n => { if (!n || typeof n !== 'object') return; if (n.t === 'var') o[n.n] = 1; Object.values(n).forEach(walk); };
  try { walk(M.parseRelation(s)); } catch (e) { try { walk(M.parseExpr(s)); } catch (e2) { /* reported elsewhere */ } }
  return o;
}
console.log(bad ? `${bad} problems in ${count} derivations` : `all ${count} derivations OK`);
