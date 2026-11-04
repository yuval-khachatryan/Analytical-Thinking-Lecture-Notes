(function (root) {
  "use strict";
  function contains(S, x) { return S.some(p => (x > p.a || x === p.a && p.ac) && (x < p.b || x === p.b && p.bc)); }
  function normalize(S) {
    const out = [];
    S.filter(p => p.a < p.b || p.a === p.b && p.ac && p.bc).map(p => ({...p, ac: isFinite(p.a) && p.ac, bc: isFinite(p.b) && p.bc}))
      .sort((p,q) => p.a - q.a || Number(q.ac) - Number(p.ac)).forEach(p => {
        const q = out[out.length - 1];
        if (!q || p.a > q.b || p.a === q.b && !p.ac && !q.bc) { out.push(p); return; }
        if (p.a === q.a) q.ac = q.ac || p.ac;
        if (p.b > q.b) { q.b = p.b; q.bc = p.bc; } else if (p.b === q.b) q.bc = q.bc || p.bc;
      });
    return out;
  }
  function ends(A,B) { return [...new Set(A.concat(B).flatMap(p => [p.a,p.b]).filter(Number.isFinite))].sort((a,b) => a-b); }
  function sample(a,b) { return a === -Infinity ? (b === Infinity ? 0 : b - Math.max(1,Math.abs(b))) : b === Infinity ? a + Math.max(1,Math.abs(a)) : a/2+b/2; }
  function operation(A,B,op) {
    const e = [-Infinity,...ends(A,B),Infinity], out = [];
    const has = x => { const a=contains(A,x), b=contains(B,x); return op==='union' ? a||b : op==='intersection' ? a&&b : a&&!b; };
    for (let i=0;i<e.length-1;i++) {
      if (has(sample(e[i],e[i+1]))) out.push({a:e[i],b:e[i+1],ac:false,bc:false});
      if (isFinite(e[i+1]) && has(e[i+1])) out.push({a:e[i+1],b:e[i+1],ac:true,bc:true});
    }
    return normalize(out);
  }
  function witness(A,B) {
    const e=[-Infinity,...ends(A,B),Infinity];
    for (let i=0;i<e.length-1;i++) {
      if (isFinite(e[i]) && contains(A,e[i]) !== contains(B,e[i])) return e[i];
      const x=sample(e[i],e[i+1]); if (contains(A,x)!==contains(B,x)) return x;
    }
    return null;
  }
  function number(s) {
    const m=/^\s*([+-]?\d+(?:\.\d+)?)\s*(?:\/\s*([+-]?\d+(?:\.\d+)?))?\s*$/.exec(s);
    const v=m ? +m[1]/(m[2]===undefined?1:+m[2]) : NaN;
    return Number.isFinite(v)?v:NaN;
  }
  function label(n) {
    if (n===Infinity) return '∞'; if(n===-Infinity) return '−∞';
    for(let d=1;d<=100;d++) if(Math.abs(n*d-Math.round(n*d))<1e-9) return (d===1?String(Math.round(n)):Math.round(n*d)+'/'+d).replace('-', '−');
    return String(+n.toPrecision(8)).replace('-', '−');
  }
  function notation(S) { return normalize(S).map(p=>p.a===p.b?'{' + label(p.a) + '}':(p.ac?'[':'(')+label(p.a)+', '+label(p.b)+(p.bc?']':')')).join(' ∪ ') || '∅'; }
  const api={contains,normalize,operation,witness,number,label,notation};
  if(typeof module!=='undefined') module.exports=api; else root.Intervals=api;
})(typeof window==='undefined'?this:window);
