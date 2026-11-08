const M = require('../assets/interactive.js');
let fails = 0;
function t(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); }
}
const C = (k, a, i) => M.checkAnswer(k, a, i).ok;
const V = (k, a, i) => M.checkAnswer(k, a, i, [], {allowExpression:true}).ok;
// numbers
t('1/2 vs 0.5', C('num', '1/2', '0.5'), true);
t('sqrt3/2', V('num', 'sqrt(3)/2', '√3/2'), true);
t('sqrt3/2 b', V('num', 'sqrt(3)/2', 'sqrt3/2'), true);
t('approx', M.checkAnswer('num', 'sqrt(3)/2', '0.866').near, true);
t('sign', M.checkAnswer('num', '-2', '2').msg.includes('סימן'), true);
t('pi/6', V('num', 'pi/6', 'π/6'), true);
t('log2 7', V('num', '(1+log_2(7))/2', '(1+log2(7))/2'), true);
t('log2 8', V('num', '3', 'log_2 8'), true);
t('log 100', V('num', '2', 'log 100'), true);
t('cbrt -8', V('num', '-2', 'cbrt(-8)'), true);
t('(-8)^(1/3)', V('num', '-2', '(-8)^(1/3)'), true);
t('floor', V('num', '-2', 'floor(-1.2)'), true);
t('2^-3', V('num', '1/8', '2^-3'), true);
t('8^(2/3)', V('num', '4', '8^(2/3)'), true);
t('abs', V('num', '5', '|-5|'), true);
t('implicit 2pi', V('num', '2*pi', '2π'), true);
// Numeric answers require finished results unless the field explicitly opts in.
for(const [answer,draft] of [['10','|-7|+|3|'],['5','|3-8|'],['8','|-2|*|-4|'],['2','||-3|-5|'],['10','7+3'],['8','2^3'],['3','sqrt(9)'],['3','log_2(8)'],['1/2','2/4'],['2','4/2'],['0','0/3'],['1/2','1/(1+1)']]){
  const r=M.checkAnswer('num',answer,draft);
  t('unfinished '+draft,r.ok,false);t('useful feedback '+draft,r.partial,true);
  t('explicit expression permission '+draft,V('num',answer,draft),true);
}
for(const s of ['10','-2','0','0.5','-1/2','(-1)/(2)','1/(-2)','(-1)/(-2)','inf','-inf'])t('finished '+s,C('num',s,s),true);
t('wrong value remains wrong',M.checkAnswer('num','10','7+4').partial,undefined);
t('opt-in is not a truthy string',M.checkAnswer('num','10','7+3',[],{allowExpression:'false'}).ok,false);
t('equivalent expression answers unchanged',C('expr','10','7+3'),true);
// expressions
t('expr inv', C('expr', '(x+2)/5', 'x/5+2/5'), true);
t('expr wrong', C('expr', '(x+2)/5', '(x-2)/5'), false);
t('expr msg', M.checkAnswer('expr', '(x+2)/5', '(x-2)/5').msg.slice(0, 10), 'לא בדיוק. ');
t('expr sq', C('expr', '(x+4)^2', 'x^2+8x+16'), true);
t('expr sqrt', C('expr', 'sqrt(x-3)+1', '√(x-3)+1'), true);
t('expr 2^(3-x)', C('expr', '2^(3-x)', '8*2^(-x)'), true);
t('expr abs', C('expr', '|x+3|-1', 'abs(x+3)-1'), true);
// sets
t('interval', C('set', '(-2,inf)', '(-2,∞)'), true);
t('interval ineq needs set notation', C('set', '(-2,inf)', 'x>-2'), false);
t('interval builder', C('set', '(-2,inf)', '{x | x>-2}'), true);
t('interval brackets', M.checkAnswer('set', '[3,5)', '(3,5]').msg.includes('נקודות הקצה'), true);
t('union', C('set', '(-inf,0)U(1/2,inf)', '(−∞,0)∪(0.5,∞)'), true);
t('union ineq needs set notation', C('set', '(-inf,0)U(1/2,inf)', 'x<0 or x>1/2'), false);
t('union ineq heb needs set notation', C('set', '(-inf,0)U(1/2,inf)', 'x<0 או x>1/2'), false);
t('union builder', C('set', '(-inf,0)U(1/2,inf)', '{x | x<0 או x>1/2}'), true);
t('R minus', C('set', 'R\\{-2,2}', '(-inf,-2)U(-2,2)U(2,inf)'), true);
t('R minus ineq needs set notation', C('set', 'R\\{2}', 'x != 2'), false);
t('R minus builder', C('set', 'R\\{2}', '{x | x != 2}'), true);
t('finite set notation', C('set', '{4,-1}', '{-1, 4}'), true);
t('bare values need set notation', C('set', '{4,-1}', '-1, 4'), false);
t('finite braces', C('set', '{4,-1}', '{4,-1}'), true);
t('finite eq needs set notation', C('set', '{4,-1}', 'x=4 or x=-1'), false);
t('empty', C('set', '{}', '∅'), true);
t('empty2', C('set', '{}', '{}'), true);
t('closed needs set notation', C('set', '[-6,2]', '-6<=x<=2'), false);
t('complement', M.checkAnswer('set', '(-inf,-2]U[1,inf)', '(-2,1)').msg.includes('אינם'), true);
t('R', C('set', 'R', '(-inf,inf)'), true);
t('missing elt', M.checkAnswer('set', '{1,2,3}', '{1,2}').msg, 'חסר איבר אחד.');
t('point set', C('set', '{3}', '{3}'), true);
t('bare point needs braces', C('set', '{3}', '3'), false);
// solve sets of relations
const S = s => M.setTex(M.solveSet(M.parseRelation(s), 'x', {}));
t('lin', S('3-2x<7'), '(-2, \\infty)');
t('abs<', S('|x-4|<3'), '(1, 7)');
t('abs>=', S('|2x+1|>=3'), '(-\\infty, -2] \\cup [1, \\infty)');
t('1/x<2', S('1/x<2'), '(-\\infty, 0) \\cup (\\frac{1}{2}, \\infty)');
t('eq', S('|2x-3|=5'), '\\{-1, 4\\}');
t('double root', S('x^2+6x+9=0'), '\\{-3\\}');
t('sqrt3', S('x^2<3'), '(-\\sqrt{3}, \\sqrt{3})');
t('no sol', S('|x-2|=-1'), '\\emptyset');
t('floor', S('floor(x)=3'), '[3, 4)');
// step judging
const cfg = { vars: ['x'], solve: 'x', positive: [], verify: true, mode: 'rel' };
const J = (a, b, r, c) => M.judgeStep(M.parseRelation(a), M.parseRelation(b), r, c || cfg);
t('add ok', J('3-2x<7', '-2x<4', 'add').ok, true);
t('add wrong rule', J('3-2x<7', '-2x<4', 'mulpos').ok, false);
t('mulneg ok', J('-2x<4', 'x>-2', 'mulneg').ok, true);
t('mulneg noflip', J('-2x<4', 'x<-2', 'mulneg').msg.includes('שלילי'), true);
t('combined', J('3-2x<7', 'x>-2', 'add').partial, true);
t('abs unwrap', J('|x-4|<3', '-3<x-4<3', 'abs').ok, true);
t('chain add', J('-3<x-4<3', '1<x<7', 'add').ok, true);
t('abs eq', J('|2x-3|=5', '2x-3=5 or 2x-3=-5', 'abs').ok, true);
t('disj add', J('2x-3=5 or 2x-3=-5', '2x=8 or 2x=-2', 'add').ok, true);
t('disj mul', J('2x=8 or 2x=-2', 'x=4 or x=-1', 'mulpos').ok, true);
t('unequal add', J('3-2x<7', '-2x<10', 'add').msg.includes('כמויות שונות'), true);
const cfg2 = { vars: ['x', 'y'], solve: 'x', positive: [], verify: true, mode: 'rel' };
t('inverse add', J('y=5x-2', 'y+2=5x', 'add', cfg2).ok, true);
t('inverse mul', J('y+2=5x', 'x=(y+2)/5', 'mul', cfg2).ok, true);
t('inverse root', J('y+1=x^3', 'cbrt(y+1)=x', 'root', cfg2).ok, true);
t('exp log', J('2^(2x-1)=7', '2x-1=log_2(7)', 'log').ok, true);
t('log exp', J('log_2(x)=3', 'x=2^3', 'exp').ok, true);
t('mulexpr', J('1/x<2', '1<2x', 'mulpos').msg.length > 0, true);
t('solved', M.isSolved(M.parseRelation('x>-2'), 'x'), true);
t('solved2', M.isSolved(M.parseRelation('1<x<7'), 'x'), true);
t('not solved', M.isSolved(M.parseRelation('-2x<4'), 'x'), false);
// expression steps
const ce = { vars: ['x'], solve: 'x', positive: [], verify: false, mode: 'expr' };
const JE = (a, b) => M.judgeStep(M.parseExpr(a), M.parseExpr(b), null, ce);
t('expr step ok', JE('4^x*2^3/8^x', '2^(2x)*2^3/2^(3x)').ok, true);
t('expr step bad', JE('4^x*2^3/8^x', '2^(2x+3-3x+1)').ok, false);
console.log(M.tex(M.parseExpr('2x^2-4x+7')), '|', M.tex(M.parseExpr('(x+2)/5')), '|', M.tex(M.parseExpr('log_2(x-3)+1')), '|', M.tex(M.parseExpr('3sqrt(2)')), '|', M.tex(M.parseExpr('-x^2')), '|', M.tex(M.parseExpr('2^-x')));
console.log(fails ? fails + ' FAILED' : 'ALL OK');
const F = (k, a, i, form) => M.checkAnswer(k, a, i, [], { form });
console.log('form frac', F('num', '3/4', '0.75', 'frac').partial === true, F('num', '3/4', '3/4', 'frac').ok === true);
console.log('form product', F('expr', '(x-3)(x+3)', 'x^2-9', 'product').partial === true, F('expr', '(x-3)(x+3)', '(x+3)(x-3)', 'product').ok === true);
console.log('form simple', F('expr', 'x^8', 'x^3x^5', 'simple').partial === true, F('expr', 'x^8', 'x^8', 'simple').ok === true);
console.log('form abs', F('set', '(2,8)', '(2,8)', 'abs').partial === true, F('set', '(2,8)', '|x-5|<3', 'abs').ok === true);
console.log('positive logs', M.checkAnswer('expr', '3log_2(x)-1/2log_2(y)', '3log2(x) - log2(y)/2', [], { positive: ['x','y'] }).ok);
