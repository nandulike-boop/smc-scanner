/*ENGINE*/
const DAY=375,TPB=6,DHIST=2600,IDAYS=8;
const SYM_DEF=[
 {s:'NIFTY',cls:'Index',p:26150,vol:.00042,ltf:3,htf:15,dp:2,bv:9000},
 {s:'BANKNIFTY',cls:'Index',p:59200,vol:.0005,ltf:3,htf:15,dp:2,bv:6000},
 {s:'RELIANCE',cls:'Stock',p:1520,vol:.0006,ltf:5,htf:15,dp:2,bv:4000},
 {s:'HDFCBANK',cls:'Stock',p:995,vol:.00055,ltf:5,htf:15,dp:2,bv:5000},
 {s:'ICICIBANK',cls:'Stock',p:1385,vol:.00058,ltf:5,htf:15,dp:2,bv:4200},
 {s:'INFY',cls:'Stock',p:1560,vol:.00065,ltf:5,htf:15,dp:2,bv:3800},
 {s:'TCS',cls:'Stock',p:3150,vol:.0006,ltf:5,htf:15,dp:2,bv:2000},
 {s:'SBIN',cls:'Stock',p:965,vol:.00065,ltf:5,htf:15,dp:2,bv:6000},
 {s:'AXISBANK',cls:'Stock',p:1255,vol:.00065,ltf:5,htf:15,dp:2,bv:3000},
 {s:'LT',cls:'Stock',p:4020,vol:.0006,ltf:5,htf:15,dp:2,bv:1500},
 {s:'ITC',cls:'Stock',p:405,vol:.0005,ltf:5,htf:15,dp:2,bv:7000},
 {s:'BHARTIARTL',cls:'Stock',p:2110,vol:.00055,ltf:5,htf:15,dp:2,bv:2500},
 {s:'KOTAKBANK',cls:'Stock',p:2150,vol:.0006,ltf:5,htf:15,dp:2,bv:2000},
 {s:'MARUTI',cls:'Stock',p:16100,vol:.0006,ltf:5,htf:15,dp:2,bv:600},
 {s:'SUNPHARMA',cls:'Stock',p:1760,vol:.0006,ltf:5,htf:15,dp:2,bv:1800},
 {s:'BAJFINANCE',cls:'Stock',p:1010,vol:.0008,ltf:5,htf:15,dp:2,bv:3500},
 {s:'CRUDEOIL',cls:'MCX',p:5320,vol:.0008,ltf:3,htf:60,dp:0,bv:1500},
 {s:'GOLDM',cls:'MCX',p:124800,vol:.00045,ltf:5,htf:60,dp:0,bv:800}];
const REAL_DEF=[
 {s:'NIFTY',cls:'Index',key:'NSE_INDEX|Nifty 50'},{s:'BANKNIFTY',cls:'Index',key:'NSE_INDEX|Nifty Bank'},
 {s:'RELIANCE',cls:'Stock',key:'NSE_EQ|INE002A01018'},{s:'HDFCBANK',cls:'Stock',key:'NSE_EQ|INE040A01034'},
 {s:'ICICIBANK',cls:'Stock',key:'NSE_EQ|INE090A01021'},{s:'INFY',cls:'Stock',key:'NSE_EQ|INE009A01021'},
 {s:'TCS',cls:'Stock',key:'NSE_EQ|INE467B01029'},{s:'SBIN',cls:'Stock',key:'NSE_EQ|INE062A01020'},
 {s:'AXISBANK',cls:'Stock',key:'NSE_EQ|INE238A01034'},{s:'LT',cls:'Stock',key:'NSE_EQ|INE018A01030'},
 {s:'ITC',cls:'Stock',key:'NSE_EQ|INE154A01025'},{s:'BHARTIARTL',cls:'Stock',key:'NSE_EQ|INE397D01024'},
 {s:'KOTAKBANK',cls:'Stock',key:'NSE_EQ|INE237A01036'},{s:'MARUTI',cls:'Stock',key:'NSE_EQ|INE585B01010'},
 {s:'SUNPHARMA',cls:'Stock',key:'NSE_EQ|INE044A01036'},{s:'BAJFINANCE',cls:'Stock',key:'NSE_EQ|INE296A01032'}];
const HZ=[{k:'intra',name:'Intraday',short:'Intraday'},
 {k:'short',name:'Short-term swing',short:'Short',ltf:1,htf:5,per:5,lv:['PWH','PWL']},
 {k:'mid',name:'Mid-term positional',short:'Mid',ltf:5,htf:21,per:21,lv:['PMH','PML']},
 {k:'long',name:'Long-term',short:'Long',ltf:21,htf:63,per:63,lv:['PQH','PQL']}];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randn(R){const u=R()||1e-9,v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function mkSym(d,seed,o={}){return{...d,R:rng(seed),m1:[],price:d.p,cur:null,tk:0,prevClose:d.p,up:o.up||.5,gapT:o.gapT===undefined?DAY:o.gapT,reg:{m:'acc',left:TPB*60,c:d.p,dir:1,tg:d.p},dHist:[],dDone:[]}}
function switchReg(S,p){const r=S.reg,R=S.R;
 if(r.m==='acc'&&R()<.8){let hi=p,lo=p;for(const b of S.m1.slice(-60)){if(b.h>hi)hi=b.h;if(b.l<lo)lo=b.l}
  r.dir=R()<.5?1:-1;const ov=(hi-lo)*.1+p*S.vol*2;r.tg=r.dir>0?hi+ov:lo-ov;r.m='man';r.left=TPB*(3+(R()*6|0))}
 else if(r.m!=='trd'){r.dir=r.m==='man'?(R()<.75?-r.dir:r.dir):(R()<S.up?1:-1);r.m='trd';r.left=TPB*(15+(R()*40|0))}
 else{r.m='acc';r.c=p;r.left=TPB*(25+(R()*60|0))}}
function stepTick(S){const r=S.reg,R=S.R,v=S.vol/Math.sqrt(TPB);let p=S.price,mu,sg;
 if(r.m==='acc'){mu=(r.c-p)/p*.03;sg=v*.7}else if(r.m==='man'){mu=(r.tg-p)/p*.12;sg=v*.9}else{mu=r.dir*v*.22;sg=v*1.15}
 p*=1+mu+sg*randn(R);if(--r.left<=0)switchReg(S,p);S.price=p;
 const c=S.cur,vv=Math.round(S.bv/TPB*(.4+R()*1.2)*(1+Math.abs(p-c.c)/(p*v)*.8));
 c.h=Math.max(c.h,p);c.l=Math.min(c.l,p);c.c=p;c.v+=vv;return p}
function newBar(S,t){let p=S.price;if(S.gapT&&t%S.gapT===0&&t>0){S.prevClose=p;p*=1+randn(S.R)*S.vol*4;S.price=p;S.reg.c=p}S.cur={t,o:p,h:p,l:p,c:p,v:0}}
function aggDay(S,d){let b=null;for(const x of S.m1){if((x.t/DAY|0)!==d)continue;if(!b)b={t:d,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v,done:true};else{if(x.h>b.h)b.h=x.h;if(x.l<b.l)b.l=x.l;b.c=x.c;b.v+=x.v}}return b}
function closeBar(S){S.m1.push(S.cur);const t=S.cur.t+1;if(S.gapT&&t%DAY===0){const b=aggDay(S,t/DAY-1);if(b)S.dDone.push(b)}newBar(S,t);if(S.m1.length>DAY*12)S.m1.splice(0,DAY)}
function genHistory(S,days){newBar(S,0);for(let t=0;t<days*DAY;t++){for(let k=0;k<TPB;k++)stepTick(S);closeBar(S)}S.tk=0}
function genDaily(d,seed){const T=mkSym({...d,vol:d.vol*Math.sqrt(DAY)*.85,bv:d.bv*DAY},seed,{up:.6,gapT:0});newBar(T,0);
 for(let t=0;t<DHIST;t++){for(let k=0;k<TPB;k++)stepTick(T);T.m1.push(T.cur);newBar(T,t+1)}
 const k=d.p/T.m1[T.m1.length-1].c;return T.m1.map(b=>({t:b.t-DHIST,o:b.o*k,h:b.h*k,l:b.l*k,c:b.c*k,v:b.v,done:true}))}
function buildSym(d,i){const S=mkSym(d,7919+i*131);S.dHist=genDaily(d,104729+i*37);genHistory(S,IDAYS);return S}
function dayBars(S,live){const out=S.dHist.concat(S.dDone);if(live&&S.cur){const d=S.cur.t/DAY|0;let b={t:d,o:S.cur.o,h:S.cur.h,l:S.cur.l,c:S.cur.c,v:S.cur.v,done:false},first=null;
  for(let i=S.m1.length-1;i>=0&&(S.m1[i].t/DAY|0)===d;i--){const x=S.m1[i];first=x;if(x.h>b.h)b.h=x.h;if(x.l<b.l)b.l=x.l;b.v+=x.v}if(first)b.o=first.o;out.push(b)}return out}
function resample(arr,tf,cd){const out=[];let b=null,key=-1;
 for(const x of arr){const d=Math.floor(x.t/DAY),q=Math.floor((x.t%DAY)/tf),k=d*1e4+q;
  if(k!==key){if(b)out.push(b);key=k;b={t:d*DAY+q*tf,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v,n:x.w||1}}
  else{if(x.h>b.h)b.h=x.h;if(x.l<b.l)b.l=x.l;b.c=x.c;b.v+=x.v;b.n+=x.w||1}}
 if(b)out.push(b);for(const o of out)o.done=o.n>=Math.min(tf,DAY-o.t%DAY)||(cd!=null&&(o.t/DAY|0)<cd);return out}
function resampleN(arr,n){if(n===1)return arr;const out=[];let b=null,key=null;
 for(const x of arr){const k=Math.floor(x.t/n);
  if(k!==key){if(b)out.push(b);key=k;b={t:k*n,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v,n:1,dn:x.done!==false}}
  else{if(x.h>b.h)b.h=x.h;if(x.l<b.l)b.l=x.l;b.c=x.c;b.v+=x.v;b.n++;if(x.done===false)b.dn=false}}
 if(b)out.push(b);for(let i=0;i<out.length;i++){const o=out[i];o.done=o.dn&&(i<out.length-1||o.n===n)}return out}
function adx(b,n=14){const N=b.length,out=new Array(N).fill(NaN);if(N<2*n+1)return out;let tr=0,pd=0,md=0,ad=0,s=0;
 for(let i=1;i<N;i++){const up=b[i].h-b[i-1].h,dn=b[i-1].l-b[i].l,p=up>dn&&up>0?up:0,m=dn>up&&dn>0?dn:0,
  t=Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c));
  if(i<=n){tr+=t;pd+=p;md+=m;if(i<n)continue}else{tr=tr-tr/n+t;pd=pd-pd/n+p;md=md-md/n+m}
  const a=100*pd/tr,c=100*md/tr,x=a+c?100*Math.abs(a-c)/(a+c):0;
  if(i<2*n){s+=x;if(i===2*n-1){ad=s/n;out[i]=ad}}else{ad=(ad*(n-1)+x)/n;out[i]=ad}}return out}
function atrA(b,n=14){const o=new Array(b.length).fill(NaN);let a=0;
 for(let i=0;i<b.length;i++){const t=i?Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c)):b[i].h-b[i].l;
  if(i<n){a+=t;if(i===n-1){a/=n;o[i]=a}}else{a=(a*(n-1)+t)/n;o[i]=a}}return o}
function ema(b,n){const k=2/(n+1),o=new Array(b.length);let e=0;for(let i=0;i<b.length;i++){e=i?b[i].c*k+e*(1-k):b[i].c;o[i]=e}return o}
function biasOf(b){const n=b.length;if(n<55)return{b:0,adx:NaN,ok:false};const e1=ema(b,20),e2=ema(b,50),i=n-1,c=b[i].c;
 return{b:c>e1[i]&&e1[i]>e2[i]?1:c<e1[i]&&e1[i]<e2[i]?-1:0,adx:adx(b)[i],ok:true}}
function fvgAt(L,k,dir,a){if(k<2)return null;const x=L[k-2],z=L[k];
 if(dir<0&&x.l>z.h&&x.l-z.h>.05*a)return{top:x.l,bot:z.h,k,t:L[k-1].t};
 if(dir>0&&z.l>x.h&&z.l-x.h>.05*a)return{top:z.l,bot:x.h,k,t:L[k-1].t};return null}
function manage(tr,b,eod){const d=tr.dir,hit=p=>d>0?b.l<=p:b.h>=p,reach=p=>d>0?b.h>=p:b.l<=p;
 const fin=(px,why)=>{tr.R=tr.booked+tr.rem*(px-tr.entry)*d/tr.risk;tr.exit=px;tr.why=why;tr.done=true;tr.exitT=b.t};
 if(hit(tr.slCur))return fin(tr.slCur,tr.booked?'Breakeven stop':'Stop-loss');
 if(!tr.booked&&reach(tr.t1)){tr.booked=.75;tr.rem=.5;tr.slCur=tr.entry;tr.t1T=b.t}
 if(tr.booked&&reach(tr.t2))return fin(tr.t2,'Target 2');
 if(eod)fin(b.c,'Session close')}
/* One engine for every horizon, live AND backtest: walks closed bars only, so nothing repaints. */
function analyze(L,H,o,cfg){
 const hadx=adx(H),at=atrA(L),per=o.per,perHL={};
 for(const x of L){const k=Math.floor(x.t/per),q=perHL[k]||(perHL[k]={h:-1e18,l:1e18});if(x.h>q.h)q.h=x.h;if(x.l<q.l)q.l=x.l}
 const piv=[];for(let j=2;j<H.length-2;j++){const c=H[j],conf=H[j+2].t+o.htf;
  if(c.h>H[j-1].h&&c.h>H[j-2].h&&c.h>=H[j+1].h&&c.h>=H[j+2].h)piv.push({p:c.h,n:'HTF swing high',hi:1,conf});
  if(c.l<H[j-1].l&&c.l<H[j-2].l&&c.l<=H[j+1].l&&c.l<=H[j+2].l)piv.push({p:c.l,n:'HTF swing low',hi:0,conf})}
 const trades=[],sweeps=[],fvgs=[],open=[],adxL=[],bodies=[];let pend=null,setup=null,tr=null,hj=-1,pi=0,pools=[],lp=[],bs=0;
 for(let i=0;i<L.length;i++){
  const b=L[i],end=b.t+o.ltf,pv=L[i-1],a=at[i]>0?at[i]:(b.h-b.l||b.c*.001),d=Math.floor(b.t/per),eod=o.eod?o.eod(b):false;
  while(hj+1<H.length&&H[hj+1].t+o.htf<=end)hj++;
  const ax=hj>=0?hadx[hj]:NaN;adxL.push(ax);
  while(pi<piv.length&&piv[pi].conf<=end){pools.push(piv[pi++]);if(pools.length>6)pools.shift()}
  const body=Math.abs(b.c-b.o);bodies.push(body);bs+=body;if(bodies.length>14)bs-=bodies.shift();const avgB=bs/bodies.length;
  for(let q=open.length-1;q>=0;q--){const f=open[q];if(f.dir<0?b.h>=f.top:b.l<=f.bot){f.mit=b.t;open.splice(q,1)}}
  if(i>=2){const x=L[i-2];let f=null;
   if(x.l>b.h&&x.l-b.h>.1*a)f={dir:-1,top:x.l,bot:b.h,t:L[i-1].t,a};
   else if(x.h<b.l&&b.l-x.h>.1*a)f={dir:1,top:b.l,bot:x.h,t:L[i-1].t,a};
   if(f){fvgs.push(f);open.push(f)}}
  if(tr&&!tr.done&&i>tr.i)manage(tr,b,eod);
  if(tr&&tr.done)tr=null;
  if(i>=4){const j=i-2,c=L[j];
   if(c.h>L[j-1].h&&c.h>L[j-2].h&&c.h>=L[j+1].h&&c.h>=b.h){lp.push({p:c.h,n:'LTF swing high',hi:1});if(lp.length>4)lp.shift()}
   if(c.l<L[j-1].l&&c.l<L[j-2].l&&c.l<=L[j+1].l&&c.l<=b.l){lp.push({p:c.l,n:'LTF swing low',hi:0});if(lp.length>4)lp.shift()}}
  const PD=perHL[d-1],lv=(PD?[{p:PD.h,n:o.lv[0],hi:1},{p:PD.l,n:o.lv[1],hi:0}]:[]).concat(pools,lp);
  if(pv){const rg=b.h-b.l||1e-9;
   for(const q of lv){let s=null;
    if(q.hi&&b.h>q.p&&b.c<q.p&&pv.c<q.p&&b.h-Math.max(b.o,b.c)>.3*rg)s={dir:-1,ext:b.h};
    else if(!q.hi&&b.l<q.p&&b.c>q.p&&pv.c>q.p&&Math.min(b.o,b.c)-b.l>.3*rg)s={dir:1,ext:b.l};
    if(s){Object.assign(s,{i,t:b.t,lv:q.p,n:q.n});sweeps.push(s);if(!tr&&!setup)pend=s;break}}}
  if(pend&&!setup&&!tr&&i>pend.i){const dir=pend.dir;
   if(i-pend.i>12||(dir<0?b.h>pend.ext:b.l<pend.ext)||eod)pend=null;
   else{let ref=dir<0?1e18:-1e18;for(let k=Math.max(0,pend.i-8);k<pend.i;k++)ref=dir<0?Math.min(ref,L[k].l):Math.max(ref,L[k].h);
    if((dir<0?b.c<ref:b.c>ref)&&body>=cfg.disp*avgB&&(dir<0?b.c<b.o:b.c>b.o)){
     let ob=null;for(let k=i-1;k>=Math.max(0,pend.i-2);k--){const c=L[k];if(dir<0?c.c>c.o:c.c<c.o){ob={top:c.h,bot:c.l,t:c.t};break}}
     setup={dir,sw:pend,mss:i,mssT:b.t,ref,ob,fvg:null,sl:dir<0?pend.ext+cfg.buf*a:pend.ext-cfg.buf*a,chop:!(ax>=cfg.adxMin),adx:ax};
     for(let k=Math.max(pend.i,2);k<=i;k++)setup.fvg=fvgAt(L,k,dir,a)||setup.fvg;
     pend=null}}}
  else if(setup&&!tr&&i>setup.mss){const s=setup,dir=s.dir;
   if(!s.fvg){s.fvg=fvgAt(L,i,dir,a);if(!s.fvg&&i-s.mss>=3)setup=null}
   else if(i>s.fvg.k){const f=s.fvg;
    if(dir<0?(b.h>=f.bot&&b.c<=f.top&&b.c<s.sl):(b.l<=f.top&&b.c>=f.bot&&b.c>s.sl)){const risk=Math.abs(b.c-s.sl);
     if(risk>=.25*a&&risk<=3*a){tr={sym:o.sym,hz:o.hz,dir,i,t:b.t,entry:b.c,sl:s.sl,slCur:s.sl,risk,t1:b.c+dir*1.5*risk,t2:b.c+dir*cfg.rr2*risk,rr2:cfg.rr2,
      chop:s.chop,blocked:s.chop&&cfg.chopFilter,adx:s.adx,lvl:s.sw.n,sweepT:s.sw.t,sweepP:s.sw.ext,mssT:s.mssT,fvg:f,ob:s.ob,
      sess:o.sess(b),R:0,booked:0,rem:1,done:false};trades.push(tr)}
     setup=null}}
   if(setup&&(i-setup.mss>30||(dir<0?b.c>setup.sl:b.c<setup.sl)||eod))setup=null}}
 const n=L.length,ax=adxL[n-1],last=L[n-1],recentSw=sweeps.length&&n-1-sweeps[sweeps.length-1].i<10;
 const amd=recentSw?'Manipulation':ax>=25?'Distribution':ax<20?'Accumulation':'Transition';
 let vs=0;for(let k=Math.max(0,n-21);k<n-1;k++)vs+=L[k].v;const rvol=n>1?last.v/(vs/Math.min(20,n-1)):1;
 return{L,hadx,adxL,at,trades,sweeps,fvgs,setup,pend,tr:tr&&!tr.done?tr:null,perHL,per,lvN:o.lv,ltf:o.ltf,htf:o.htf,hz:o.hz,pools:pools.concat(lp),amd,rvol,ax,axPrev:adxL[n-4],last,atr:at[n-1]}}
function runIntra(S,cfg){const L=resample(S.m1,S.ltf,S.cd).filter(b=>b.done),H=resample(S.m1,S.htf,S.cd).filter(b=>b.done);
 return analyze(L,H,{ltf:S.ltf,htf:S.htf,per:DAY,lv:['PDH','PDL'],eod:b=>(b.t%DAY)+S.ltf>=DAY,sess:b=>(b.t%DAY)<DAY*.45?'Morning':'Afternoon',sym:S.s,hz:'intra'},cfg)}
function runHz(S,hz,cfg,D){const L=resampleN(D,hz.ltf).filter(b=>b.done),H=resampleN(D,hz.htf).filter(b=>b.done);
 return analyze(L,H,{ltf:hz.ltf,htf:hz.htf,per:hz.per,lv:hz.lv,eod:null,sess:()=>hz.name,sym:S.s,hz:hz.k},cfg)}
function stats(tr){const t=tr.filter(x=>x.done&&!x.blocked),n=t.length;let gw=0,gl=0,w=0,eq=0,pk=0,dd=0;const curve=[0];
 for(const x of t){if(x.R>0){w++;gw+=x.R}else gl-=x.R;eq+=x.R;curve.push(eq);if(eq>pk)pk=eq;if(pk-eq>dd)dd=pk-eq}
 const bl=tr.filter(x=>x.done&&x.blocked);
 return{n,w,wr:n?w/n*100:0,pf:gl?gw/gl:(gw?Infinity:0),exp:n?eq/n:0,netR:eq,ddR:dd,curve,avgW:w?gw/w:0,avgL:n-w?gl/(n-w):0,saved:bl.filter(x=>x.R<0).length,savedR:-bl.filter(x=>x.R<0).reduce((a,x)=>a+x.R,0),blockedN:bl.length}}
function quarterly(M){const out=[];let b=null,key=null;for(const x of M){const k=x.qk;if(k!==key){if(b)out.push(b);key=k;b={t:x.t,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v,n:1,dn:x.done!==false}}else{if(x.h>b.h)b.h=x.h;if(x.l<b.l)b.l=x.l;b.c=x.c;b.v+=x.v;b.n++;if(x.done===false)b.dn=false}}
 if(b)out.push(b);out.forEach((o,i)=>{o.done=o.dn&&(i<out.length-1||o.n===3)});return out}
/* daily-only universe stock: Short = 1D/1W, Mid = 1W/1M (native monthly), Long = 1M/3M */
function runUni(S,cfg){const D=S.dHist.filter(b=>b.done!==false),W=resampleN(D,5).filter(b=>b.done),M=S.M.filter(b=>b.done!==false),Q=quarterly(S.M).filter(b=>b.done);
 const mk=(h,L,H)=>analyze(L,H,{ltf:h.ltf,htf:h.htf,per:h.per,lv:h.lv,eod:null,sess:()=>h.name,sym:S.s,hz:h.k},cfg);
 return{short:mk(HZ[1],D,W),mid:mk(HZ[2],W,M),long:mk(HZ[3],M,Q)}}
/*END*/
if(typeof module!=='undefined')module.exports={runUni,quarterly,SYM_DEF,REAL_DEF,HZ,buildSym,runIntra,runHz,dayBars,stats,biasOf,resample,resampleN,stepTick,closeBar,TPB,DAY};
