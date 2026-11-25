const E=require('./engine.js'),S={PK:null,A:{}};
const ema=(b,p)=>{const k=2/(p+1),o=[];let e=0;b.forEach((x,i)=>{e=i?x.c*k+e*(1-k):x.c;o.push(e)});return o};
function tag(r,H,h,l){if(!r)return;const a=ema(H,20),b=ema(H,50),bi=j=>j<50?0:H[j].c>a[j]&&a[j]>b[j]?1:H[j].c<a[j]&&a[j]<b[j]?-1:0;
 const at=t=>{let k=-1;for(let j=0;j<H.length&&H[j].t+h<=t+l;j++)k=j;return k};for(const x of r.trades){x.al=bi(at(x.t))===x.dir;x.lt=/^LTF/.test(x.lvl)}r.nb=bi(H.length-1)}
const V={base:()=>1,major:t=>!t.lt,trend:t=>t.al,both:t=>!t.lt&&t.al};
function ap(r,z){if(!r)return;for(const t of r.trades)if(t.done&&!t.blocked)(S.A[z]=S.A[z]||[]).push(t);const P=S.PK,f=P&&P[z]&&V[P[z]];if(!f||P[z]=='base')return;
 r.trades=r.trades.filter(f);if(r.tr&&!f(r.tr))r.tr=null;for(const k of['setup','pend'])if(r[k]){const s=r[k].sw||r[k];if(!f({lt:/^LTF/.test(s.n),al:r.nb===r[k].dir}))r[k]=null}}
const oU=E.runUni,oI=E.runIntra,dn=b=>b.done!==false,dd=b=>b.done;
E.runUni=(X,c)=>{const R=oU(X,c),D=X.dHist.filter(dn);tag(R.short,E.resampleN(D,5).filter(dd),5,1);tag(R.mid,X.M.filter(dn),21,5);tag(R.long,E.quarterly(X.M).filter(dd),63,21);for(const z of['short','mid','long'])ap(R[z],z);return R};
E.runIntra=(X,c)=>{const R=oI(X,c);tag(R,E.resample(X.m1,X.htf,X.cd).filter(dd),X.htf,X.ltf);ap(R,'intra');return R};
module.exports={V,S};
