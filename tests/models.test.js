// Every step builder with a model solution (model="line :: rule || ...") in the lecture
// files: the model must pass step by step with its rules, and must end where the builder
// says "done". Run from Notes/:  node tests/models.test.js
const fs = require('fs');
const M = require('../assets/interactive.js');
const files = fs.readdirSync('.').filter(f => /^\d\d-.*\.qmd$/.test(f));
let count = 0, bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /^:{3,}\s*\{\.steps ([^\n]*)\}\s*$/gm;
  let m;
  while ((m = re.exec(src))) {
    const attrs = {};
    m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
    if (!attrs.model) continue;
    count++;
    const line = src.slice(0, m.index).split('\n').length;
    const lim = attrs.limit, ruleKeys = (attrs.rules || '').split('|').filter(Boolean);
    const table = lim ? M.LIMRULES : null;
    let prev, mode;
    if (lim) { prev = M.parseExpr(attrs.start); mode = 'lim'; }
    else { prev = M.parseRelation(attrs.start); mode = prev.disj.some(d => d.ops.length) ? 'rel' : 'expr'; if (mode === 'expr') prev = M.parseExpr(attrs.start); }
    const vars = lim ? [lim] : (attrs.vars ? attrs.vars.split(',') : Object.keys(varsIn(attrs.start)).sort());
    const cfg = { vars: vars.length ? vars : ['x'], solve: attrs.solve || 'x', positive: (attrs.positive || '').split(',').filter(Boolean),
      verify: mode !== 'expr' && ruleKeys.length > 0, mode, seq: lim };
    const steps = attrs.model.split('||').map(s => s.split('::').map(x => x.trim()));
    for (const [raw, rule] of steps) {
      const text = raw.replace(/[[\]]/g, '');
      if (rule && ruleKeys.length && !ruleKeys.includes(rule)) { bad++; console.log(`${f}:${line} rule "${rule}" is not in rules=`); }
      const L = mode === 'rel' ? M.parseRelation(text) : M.parseExpr(text);
      const j = M.judgeStep(prev, L, rule || null, cfg);
      if (!j.ok) { bad++; console.log(`${f}:${line} ${attrs.start} -> ${text} [${rule}]: ${(j.msg || '').replace(/\\\(|\\\)/g, '')}`); }
      prev = L;
    }
    const done = mode === 'rel' ? M.isSolved(prev, cfg.solve) : mode === 'lim' ? M.limDone(prev, lim) : true;
    if (!done) { bad++; console.log(`${f}:${line} ${attrs.start}: the model does not end where the builder says done`); }
  }
}
function varsIn(s) { const o = {}; (s.match(/[a-df-z]/g) || []).forEach(c => { o[c] = 1; }); return o; }
console.log(bad ? `${bad} problems in ${count} model solutions` : `all ${count} model solutions OK`);
process.exitCode = bad ? 1 : 0;
