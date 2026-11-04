const M = require('../assets/interactive.js');
const R = { vars: ['x'], solve: 'x', positive: [], verify: true, mode: 'rel' };
const RY = { vars: ['x', 'y'], solve: 'x', positive: [], verify: true, mode: 'rel' };
const E = { vars: ['x'], solve: 'x', positive: [], verify: false, mode: 'expr' };
const chains = [
  [R, '3-2x<7', [['-2x<4', 'add'], ['x>-2', 'mulneg']]],
  [R, '|x-4|<3', [['-3<x-4<3', 'abs'], ['1<x<7', 'add']]],
  [R, '5x-4<=2x+8', [['3x-4<=8', 'add'], ['3x<=12', 'add'], ['x<=4', 'mulpos']]],
  [R, '4-3x>=10', [['-3x>=6', 'add'], ['x<=-2', 'mulneg']]],
  [R, '-1<2x-5<7', [['4<2x<12', 'add'], ['2<x<6', 'mulpos']]],
  [R, '4^x=8', [['2^(2x)=2^3', 'simplify'], ['2x=3', 'log'], ['x=3/2', 'mulpos']]],
  [RY, 'y=5x-2', [['y+2=5x', 'add'], ['x=(y+2)/5', 'mul']]],
  [RY, 'y=x^3-1', [['y+1=x^3', 'add'], ['x=cbrt(y+1)', 'root']]],
  [RY, 'y=(x+3)/2', [['2y=x+3', 'mul'], ['x=2y-3', 'add']]],
  [R, '2^(2x-1)=7', [['2x-1=log_2(7)', 'log'], ['2x=1+log_2(7)', 'add'], ['x=(1+log_2(7))/2', 'mulpos']]],
  [E, '4^x*2^3/8^x', [['(2^2)^x*2^3/(2^3)^x'], ['2^(2x)*2^3/2^(3x)'], ['2^(2x+3-3x)'], ['2^(3-x)']]],
  // absolute value: example (א), (ג) and the exercise box-q-abs
  [R, '|2x-3|=5', [['2x-3=5 או 2x-3=-5', 'abs'], ['2x=8 או 2x=-2', 'add'], ['x=4 או x=-1', 'mulpos']]],
  [R, '|2x+1|>=3', [['2x+1>=3 או 2x+1<=-3', 'abs'], ['2x>=2 או 2x<=-4', 'add'], ['x>=1 או x<=-2', 'mulpos']]],
  [R, '|x+2|<=4', [['-4<=x+2<=4', 'abs'], ['-6<=x<=2', 'add']]],
  [R, '|3x-1|>2', [['3x-1>2 או 3x-1<-2', 'abs'], ['3x>3 או 3x<-1', 'add'], ['x>1 או x<-1/3', 'mulpos']]],
  [R, '|x+1|=4', [['x+1=4 או x+1=-4', 'abs'], ['x=3 או x=-5', 'add']]],
  [R, '|3x-2|<4', [['-4<3x-2<4', 'abs'], ['-2<3x<6', 'add'], ['-2/3<x<2', 'mulpos']]],
  [R, '|2x+3|=0', [['2x+3=0', 'abs'], ['2x=-3', 'add'], ['x=-3/2', 'mulpos']]],
  // polynomial roots: example (ב), box-q-roots, box-q-cubic
  [R, 'x^3-9x=0', [['x(x^2-9)=0', 'factor'], ['x(x-3)(x+3)=0', 'factor'], ['x=0 או x-3=0 או x+3=0', 'zero'], ['x=0 או x=3 או x=-3', 'add']]],
  [R, '3x^2-12=0', [['3x^2=12', 'add'], ['x^2=4', 'mulpos'], ['x=2 או x=-2', 'root']]],
  [R, 'x^3-x^2=0', [['x^2(x-1)=0', 'factor'], ['x=0 או x-1=0', 'zero'], ['x=0 או x=1', 'add']]],
  [R, 'x^2-5x+6=0', [['(x-2)(x-3)=0', 'factor'], ['x-2=0 או x-3=0', 'zero'], ['x=2 או x=3', 'add']]],
  [R, '2x^2+x-1=0', [['x=1/2 או x=-1', 'formula']]],
  [R, '2x^2+x-1=0', [['(2x-1)(x+1)=0', 'factor'], ['2x-1=0 או x+1=0', 'zero'], ['2x=1 או x=-1', 'add'], ['x=1/2 או x=-1', 'mulpos']]],
  [R, 'x^2-10x+25=0', [['(x-5)^2=0', 'factor'], ['x-5=0', 'zero'], ['x=5', 'add']]],
  [R, 'x^2-10x+25=0', [['(x-5)^2=0', 'factor'], ['x-5=0', 'root'], ['x=5', 'add']]],
  [R, 'x^3-4x=0', [['x(x-2)(x+2)=0', 'factor'], ['x=0 או x-2=0 או x+2=0', 'zero'], ['x=0 או x=2 או x=-2', 'add']]],
  [R, 'x^3-3x^2-x+3=0', [['(x-1)(x^2-2x-3)=0', 'factor'], ['(x-1)(x-3)(x+1)=0', 'factor'], ['x-1=0 או x-3=0 או x+1=0', 'zero'], ['x=1 או x=3 או x=-1', 'add']]],
  // exponential and logarithmic equations: box-q-exp-eq, box-exm-log (ד), (ו), box-q-log
  [R, '2^x=32', [['2^x=2^5', 'simplify'], ['x=5', 'log']]],
  [R, '3^(x+1)=27', [['3^(x+1)=3^3', 'simplify'], ['x+1=3', 'log'], ['x=2', 'add']]],
  [R, '(1/2)^x=4', [['2^(-x)=2^2', 'simplify'], ['-x=2', 'log'], ['x=-2', 'mulneg']]],
  [R, 'log_2(x)=3', [['x=2^3', 'exp'], ['x=8', 'simplify']]],
  [R, '5*2^x=40', [['2^x=8', 'mulpos'], ['2^x=2^3', 'simplify'], ['x=3', 'log']]],
  [R, '3^x=20', [['x=log_3(20)', 'log']]],
  [R, 'log_3(x)=4', [['x=3^4', 'exp'], ['x=81', 'simplify']]],
  [R, 'log_2(x+1)=3', [['x+1=2^3', 'exp'], ['x+1=8', 'simplify'], ['x=7', 'add']]],
  [R, '2^(x+1)=5', [['x+1=log_2(5)', 'log'], ['x=log_2(5)-1', 'add']]],
  // inverse functions: box-q-find-inverse
  [RY, 'y=3-4x', [['y+4x=3', 'add'], ['4x=3-y', 'add'], ['x=(3-y)/4', 'mul']]],
  [RY, 'y=(2x+1)/3', [['3y=2x+1', 'mul'], ['3y-1=2x', 'add'], ['x=(3y-1)/2', 'mul']]],
  [RY, 'y=cbrt(x+2)', [['y^3=x+2', 'power'], ['x=y^3-2', 'add']]],
];
let bad = 0;
for (const [cfg, start, steps] of chains) {
  let prev = cfg.mode === 'expr' ? M.parseExpr(start) : M.parseRelation(start);
  for (const [line, rule] of steps) {
    const L = cfg.mode === 'expr' ? M.parseExpr(line) : M.parseRelation(line);
    const j = M.judgeStep(prev, L, rule || null, cfg);
    if (!j.ok) { bad++; console.log('FAIL', start, '->', line, rule, j.msg); }
    prev = L;
  }
  const solved = cfg.mode === 'expr' ? M.nodes(prev) <= M.nodes(M.parseExpr('2^(3-x)')) : M.isSolved(prev, 'x');
  if (!solved) { bad++; console.log('NOT SOLVED at end', start); }
}
// a few wrong steps must be rejected with a sensible message
const W = [[R, '5x-4<=2x+8', '3x-4<=10', 'add'], [R, '-1<2x-5<7', '4<2x<7', 'add'], [R, '4-3x>=10', 'x>=-2', 'mulneg'],
  [RY, 'y=5x-2', 'y-2=5x', 'add'], [R, '|x-4|<3', 'x-4<3', 'abs'],
  // the new rules: a lost solution, two operations in one step, the wrong rule
  [R, 'x^2=4', 'x=2', 'root'], [R, 'x^2-5x+6=0', 'x=2 או x=3', 'zero'], [R, 'x^2-5x+6=0', 'x-2=0 או x-3=0', 'zero'],
  [R, '3x^2-12=0', 'x^2=4', 'mulpos'], [R, '(x-2)(x-3)=0', 'x-2=0 או x-3=0', 'add'], [R, '2x^2+x-1=0', '(2x-1)(x+1)=0', 'formula']];
for (const [cfg, a, b, r] of W) { const j = M.judgeStep(M.parseRelation(a), M.parseRelation(b), r, cfg); console.log(j.ok ? 'WRONGLY OK' : 'rejected:', a, '->', b, '|', (j.msg || '').replace(/\\\(|\\\)/g, '')); if (j.ok) bad++; }
console.log(bad ? bad + ' problems' : 'all chains OK');
