const E=require('./engine.js'),fs=require('fs'),{V,S}=require('./tag.js'),F=require('path').join(process.argv[3]||'out','scan.json'),A=S.A;
const st=a=>{const s=E.stats(a);return{n:s.n,wr:+s.wr.toFixed(1),pf:s.pf===Infinity?99:+s.pf.toFixed(2),exp:+s.exp.toFixed(3),net:+s.netR.toFixed(1)}};
(async()=>{const run=require('./run.js'),pv=(()=>{try{return JSON.parse(fs.readFileSync(F)).bt}catch(e){return null}})(),core=process.argv[2]!=='full'&&pv&&pv.chosen;let vs=null;
 if(core)S.PK=pv.chosen;else{await run.main();vs={};S.PK={};for(const z in A){vs[z]={};let bk='base',be=-1e9;for(const k in V){const s=st(A[z].filter(V[k]));vs[z][k]=s;if(s.n>=40&&s.exp>be){be=s.exp;bk=k}}S.PK[z]=bk;delete A[z]}}
 await run.main();const j=JSON.parse(fs.readFileSync(F)),PK=S.PK;if(core)j.bt=pv;else{const tr=[];
 for(const z in A)for(const t of A[z])if(V[PK[z]||'base'](t))tr.push({s:t.sym,hz:z,dir:t.dir,t:t.t,R:+t.R.toFixed(2),lvl:t.lvl,why:t.why,done:1});
 tr.sort((a,b)=>(a.hz=='intra'?a.t/375:a.t)-(b.hz=='intra'?b.t/375:b.t));const by={};for(const t of tr)(by[t.hz]=by[t.hz]||[]).push(t);
 let q=0;const cv=tr.map(t=>q+=t.R),sp=Math.max(1,Math.ceil(cv.length/250));
 j.bt={chosen:PK,variants:vs,total:st(tr),byHz:Object.fromEntries(Object.entries(by).map(([k,v])=>[k,st(v)])),curve:cv.filter((_,i)=>i%sp==0||i==cv.length-1).map(v=>+v.toFixed(1)),recent:tr.slice(-300)}}
 fs.writeFileSync(F,JSON.stringify(j));console.log('chosen',JSON.stringify(PK),JSON.stringify(j.bt.total));clearInterval(globalThis.KA)})().catch(e=>{console.error(e);process.exit(1)});
