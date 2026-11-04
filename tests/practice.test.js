const assert = require('node:assert/strict');
const M = require('../assets/interactive.js');
const rel = {mode:'rel',vars:['x'],solve:'x',positive:[],verify:false};
const check = (lines,cfg=rel,start='5x-4<=2x+8',target='x<=4') => M.checkWorking(start,lines,cfg,target);
assert.equal(check(['-12<=-3x','x<=4']).done,true); // different route and sign reversal
assert.equal(check(['x<=4']).done,true); // combined steps
assert.equal(check(['3x<=12']).done,false); // correct but unfinished
assert.equal(check(['-3x>=-12','x>=4']).results[1].ok,false);
assert.equal(check(['3x<=13','x<=4']).results.length,1); // editing earlier line invalidates later work
assert.equal(check(['3x<=12','','x<=4']).done,false);
assert.equal(check(['x+(']).done,false);
assert.equal(check(['x=2 או x=-2'],rel,'x^2=4','x=2 או x=-2').done,true);
assert.equal(check(['x=2'],rel,'x^2=4','x=2 או x=-2').done,false); // lost solution
const lim={mode:'lim',vars:['n'],seq:'n',positive:[],verify:false};
assert.equal(check(['0'],lim,'cos(n)/n^2','0').done,true);
assert.equal(check(['1'],lim,'cos(n)/n^2','0').done,false);
assert.equal(check(['cos(n)/n','0'],lim,'cos(n)/n^2','0').done,false);
assert.equal(check(['2^(3-x)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,true);
assert.equal(check(['2^(-x+3)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,true);
assert.equal(check(['2^(2x+3)/2^(3x)'],{mode:'expr',vars:['x'],positive:[],verify:false},'4^x*2^3/8^x','2^(3-x)').done,false);
console.log('Independent solution checks passed.');
