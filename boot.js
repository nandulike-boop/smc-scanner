const real=globalThis.__realFetch||globalThis.fetch,T0=Date.now(),STOP=T0+22*6e4,C=new Map();let nx=T0,n=0;
globalThis.KA=setInterval(()=>{},5e3);const sl=ms=>new Promise(r=>setTimeout(r,ms)),res=(s,j)=>({status:s,headers:{get:()=>null},json:async()=>j});
globalThis.fetch=async(u,o={})=>{if(C.has(u))return res(200,C.get(u));if(Date.now()>STOP)return res(404,{status:'error'});
 const t=Date.now(),a=Math.max(t,nx);nx=a+125;if(a>t)await sl(a-t);if(++n%200==0)console.log(n,'requests',(Date.now()-T0)/1e3|0,'s');
 const r=await real(u,{...o,signal:AbortSignal.timeout(15e3)});if(r.status==429){nx=Date.now()+5e3;return r}
 if(r.status!=200)return r;const j=await r.json();if(j&&j.status=='success')C.set(u,j);return res(200,j)};
require('./tune.js');
