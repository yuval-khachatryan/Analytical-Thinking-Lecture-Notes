const fs = require('fs');
const M = require('../assets/interactive.js');
// every chapter file (NN-*.qmd)
const src = fs.readdirSync('.').filter(f => /^\d\d-.*\.qmd$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const re = /\[\$([^$]*)\$\]\{\.blank ((?:[^"}]|"[^"]*")*)\}/g;
function attrs(s) { const o = {}; s.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v; }); return o; }
function texToInput(t) {
  let s = t;
  for (let i = 0; i < 5; i++) {
    s = s.replace(/\\sqrt\[3\]\{([^{}]*)\}/g, 'cbrt($1)').replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
    s = s.replace(/\\[td]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
    s = s.replace(/\^\{([^{}]*)\}/g, '^($1)');
  }
  s = s.replace(/\\left|\\right|\\big|\\Big/g, '').replace(/\\mathbb\{R\}/g, 'R').replace(/\\setminus/g, '-')
       .replace(/\\emptyset/g, '{}').replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\cup/g, 'U')
       .replace(/\\infty/g, 'inf').replace(/\\pi/g, 'pi').replace(/\\log_\{?(\d+)\}?\s*([a-z0-9]+)/g, 'log_$1($2)')
       .replace(/\\sin\s*/g, 'sin ').replace(/\\le/g, '<=').replace(/\\cdot/g, '*').replace(/\\,/g, '')
       .replace(/\\mid/g, '|').replace(/\\text\{\s*או\s*\}/g, ' or ').replace(/\{\}/g, m => m);
  return s;
}
let n = 0, bad = 0;
let m;
while ((m = re.exec(src))) {
  n++;
  const shown = m[1], a = attrs(m[2]);
  const kind = a.kind || M.guessKind(a.ans);
  const vars = (a.vars || '').split(',').filter(Boolean);
  const opts = { form: a.form, positive: (a.positive || '').split(',').filter(Boolean) };
  let r;
  try { M.checkAnswer(kind, a.ans, a.ans, vars, {}); } catch (e) { console.log('ANS PARSE FAIL', a.ans, e.message); bad++; continue; }
  if (a.form === 'abs') continue;           // shown answer is a relation, not the set itself
  const inp = texToInput(shown);
  try { r = M.checkAnswer(kind, a.ans, inp, vars, {}); } catch (e) { r = { ok: false, msg: 'EXC ' + e.message }; }
  if (!r.ok) { bad++; console.log('MISMATCH', JSON.stringify(shown), '->', inp, '| ans', a.ans, '|', kind, '|', r.msg); }
  if (a.miss) a.miss.split('||').forEach(p => { const v = p.split('::')[0].trim(); try { M.checkAnswer(kind, v, v, vars, {}); } catch (e) { bad++; console.log('MISS PARSE', v); } });
}
console.log(n, 'blanks,', bad, 'problems');
if (bad) process.exitCode = 1;
