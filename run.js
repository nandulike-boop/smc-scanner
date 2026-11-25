// SMC data robot: pulls public Upstox v3 candles, runs the same SMC engine as the app,
// and writes out/scan.json (matching setups) + out/sym/<SYMBOL>.json (candles for the chart).
// Usage: node scanner/run.js <full|core> <outDir>
const fs = require('fs'), path = require('path');
const E = require('./engine.js');
const UNI = require('./universe.json'); // [symbol, isin, industry, tier]
const MODE = process.argv[2] || 'full', OUT = process.argv[3] || 'out';
const CFG = { adxMin: 20, buf: .15, rr2: 2.5, disp: 1.0, chopFilter: true };
const UP = 'https://api.upstox.com/v3/historical-candle/';
const DAY = E.DAY;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ist = (add = 0) => new Date(Date.now() + 5.5 * 3600e3 + add * 864e5).toISOString().slice(0, 10);
const istMin = () => { const d = new Date(Date.now() + 5.5 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const ek = encodeURIComponent;
let FETCHER = globalThis.fetch;
const stats = { req: 0, fail: 0 };

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      stats.req++;
      const r = await FETCHER(url, { headers: { Accept: 'application/json', 'User-Agent': 'smc-scanner-robot' } });
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      const j = await r.json();
      if (j && j.status === 'success') return (j.data && j.data.candles) || [];
      return null;
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  stats.fail++; return null;
}
async function pool(items, n, fn) {
  let i = 0; const out = new Array(items.length);
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

/* ---------- calendar: weekday index, same scheme as the app ---------- */
let BASE = null; // {ds, i}
const IDX = new Map();
function wdDiff(a, b) { const A = new Date(a + 'T12:00:00Z'), B = new Date(b + 'T12:00:00Z'); let n = 0; const s = A < B ? 1 : -1, d = new Date(A); while (d.toISOString().slice(0, 10) !== b) { d.setUTCDate(d.getUTCDate() + s); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n += s; } return n; }
function setBase(ds) { const w = new Date(ds + 'T12:00:00Z').getUTCDay(); BASE = { ds, i: 1000 + (w >= 1 && w <= 5 ? w - 1 : 4) }; IDX.clear(); }
function idxOf(ds) { if (!IDX.has(ds)) IDX.set(ds, BASE.i - wdDiff(ds, BASE.ds)); return IDX.get(ds); }

/* ---------- daily gap fill: Upstox daily candles lag 1–2 days, rebuild them from intraday ---------- */
function fillDaily(d, intra) { // both newest-first upstox arrays
  if (!d) return d; const last = d.length ? d[0][0].slice(0, 10) : '';
  const agg = new Map();
  for (const c of intra.slice().reverse()) { const ds = c[0].slice(0, 10); if (ds <= last) continue;
    const g = agg.get(ds); if (!g) agg.set(ds, [ds + 'T00:00:00+05:30', c[1], c[2], c[3], c[4], c[5] || 0, 0]);
    else { g[2] = Math.max(g[2], c[2]); g[3] = Math.min(g[3], c[3]); g[4] = c[4]; g[5] += c[5] || 0; } }
  const add = [...agg.values()].sort((a, b) => b[0] < a[0] ? -1 : 1);
  return add.concat(d);
}
const merge = (a, b) => { const m = new Map(); for (const c of (a || []).concat(b || [])) m.set(c[0], c); return [...m.values()].sort((x, y) => x[0] < y[0] ? 1 : -1); };

/* ---------- build engine inputs ---------- */
const toBar5 = c => { const ds = c[0].slice(0, 10), tm = c[0].slice(11, 16), mod = (+tm.slice(0, 2)) * 60 + (+tm.slice(3, 5)) - 555; return mod < 0 || mod >= DAY ? null : { t: idxOf(ds) * DAY + mod, o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] || 0, w: 5 }; };
function buildDaily(d) { const live = istMin() >= 555 && istMin() < 930; return d.slice().reverse().filter(c => c[0].slice(0, 10) <= BASE.ds).map(c => { const ds = c[0].slice(0, 10); return { t: idxOf(ds), o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] || 0, done: !(live && ds === ist()) }; }); }
function buildMonthly(m) { const cur = ist().slice(0, 7); return m.slice().reverse().map(c => { const ds = c[0].slice(0, 10), y = +ds.slice(0, 4), mo = +ds.slice(5, 7); return { t: idxOf(ds), o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] || 0, qk: y * 4 + ((mo - 1) / 3 | 0), done: ds.slice(0, 7) !== cur }; }); }

/* ---------- confluence, same rules as the app ---------- */
const biasDir = b => b.b;
function summarize(sym, meta, R, mtf) {
  const rows = [];
  for (const hz of Object.keys(R)) {
    const r = R[hz]; if (!r || !r.L || !r.L.length) continue;
    const u = r.tr || r.setup, dir = u ? u.dir : r.pend ? r.pend.dir : null;
    const act = r.tr ? 3 : r.setup ? 2 : r.pend ? 1 : 0; if (!act) continue;
    const hb = hz === 'intra' ? mtf.i[1].b : hz === 'short' ? mtf.d[1].b : mtf.d[2].b;
    const checks = [!!(r.tr || r.setup || r.pend), !!u, !!(r.tr || (r.setup && r.setup.fvg)), r.ax >= CFG.adxMin, dir != null && hb === dir, r.rvol >= 1];
    const sc = checks.filter(Boolean).length;
    let plan = null;
    if (r.tr) plan = { e: r.tr.entry, sl: r.tr.sl, t1: r.tr.t1, t2: r.tr.t2, z: [r.tr.fvg.bot, r.tr.fvg.top], proj: false };
    else if (r.setup && r.setup.fvg) { const z = r.setup.fvg, e = r.setup.dir < 0 ? z.bot : z.top, rk = Math.abs(e - r.setup.sl); plan = { e, sl: r.setup.sl, t1: e + r.setup.dir * 1.5 * rk, t2: e + r.setup.dir * CFG.rr2 * rk, z: [z.bot, z.top], proj: true }; }
    const sw = r.tr ? { n: r.tr.lvl, dir: r.tr.dir } : r.setup ? { n: r.setup.sw.n, dir: r.setup.sw.dir } : { n: r.pend.n, dir: r.pend.dir };
    const st = E.stats(r.trades), rd = v => v == null || !isFinite(v) ? null : +v.toFixed(2);
    rows.push({ s: sym, ind: meta.ind, tier: meta.tier, core: !!meta.core, hz, act, blocked: !!(r.tr && r.tr.blocked),
      dir, amd: r.amd, adx: rd(r.ax), adxUp: r.ax > r.axPrev, rvol: rd(r.rvol), sweep: sw,
      plan: plan && { e: rd(plan.e), sl: rd(plan.sl), t1: rd(plan.t1), t2: rd(plan.t2), z: plan.z.map(rd), proj: plan.proj },
      score: sc, checks, acc: { n: st.n, wr: rd(st.wr), pf: st.pf === Infinity ? 'inf' : rd(st.pf) }, price: rd(r.last.c) });
  }
  return rows;
}

/* ---------- main ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, 'sym'), { recursive: true });
  const prev = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'scan.json'), 'utf8')); } catch (e) { return null; } })();
  const core = E.REAL_DEF.map(d => ({ s: d.s, key: d.key, ind: d.cls === 'Index' ? 'Index' : (UNI.find(u => u[0] === d.s) || [])[2] || 'Stock', tier: d.cls === 'Index' ? 0 : 50, core: true, cls: d.cls }));
  const uni = MODE === 'full' ? UNI.filter(u => !core.some(c => c.s === u[0])).map(u => ({ s: u[0], key: 'NSE_EQ|' + u[1], ind: u[2], tier: u[3], core: false, cls: 'Stock' })) : [];
  const all = core.concat(uni);
  console.log(`mode=${MODE} symbols=${all.length}`);

  const raw = await pool(all, 6, async (m) => {
    const k = ek(m.key);
    const d = await get(`${UP}${k}/days/1/${ist()}/${ist(m.core ? -365 * 5 : -730)}`);
    const mo = await get(`${UP}${k}/months/1/${ist()}/${ist(-365 * 15)}`);
    let h = null, i = null;
    if (m.core) { h = await get(`${UP}${k}/minutes/5/${ist(-1)}/${ist(-14)}`); i = await get(`${UP}intraday/${k}/minutes/5`); }
    else { h = await get(`${UP}${k}/minutes/30/${ist(-1)}/${ist(-7)}`); i = await get(`${UP}intraday/${k}/minutes/30`); }
    return { m, d, mo, h, i };
  });

  // market date = newest intraday/daily date seen on the core symbols
  let mx = ''; for (const x of raw) { if (!x.m.core) continue; for (const arr of [x.i, x.h, x.d]) if (arr && arr.length && arr[0][0].slice(0, 10) > mx) mx = arr[0][0].slice(0, 10); }
  if (!mx) { console.error('No data came back from Upstox'); process.exit(1); }
  setBase(mx);

  const rows = [], errs = [], index = [], quotes = {};
  for (const x of raw) {
    const { m } = x; const intra = merge(x.h, x.i);
    const d = fillDaily(x.d, intra);
    if (!d || d.length < 120 || !x.mo || x.mo.length < 24) { errs.push(m.s); continue; }
    const file = { s: m.s, key: m.key, ind: m.ind, tier: m.tier, core: m.core, cls: m.cls, asOf: BASE.ds, d, m: x.mo };
    if (m.core) { file.h = x.h || []; file.i = x.i || []; }
    fs.writeFileSync(path.join(OUT, 'sym', m.s + '.json'), JSON.stringify(file));
    index.push(m.s);
    { const last = intra.length ? intra[0][4] : d[0][4]; const pc = d.find(c => c[0].slice(0, 10) < BASE.ds); quotes[m.s] = [+(+last).toFixed(2), pc ? +(+pc[4]).toFixed(2) : null, m.core ? 1 : 0]; }
    try {
      const D = buildDaily(d), M = buildMonthly(x.mo);
      const S = { s: m.s, dHist: D, M, dDone: [] };
      const R = E.runUni(S, CFG);
      const W = E.resampleN(D, 5).filter(b => b.done);
      const mtf = { i: [{ b: 0 }, { b: 0 }, { b: 0 }], d: [E.biasOf(D), E.biasOf(W), E.biasOf(M.filter(b => b.done !== false))] };
      if (m.core && intra.length > 100) {
        const bars = intra.slice().reverse().map(toBar5).filter(Boolean).filter(b => (b.t / DAY | 0) <= BASE.i);
        const cur = bars.pop(); const SI = { s: m.s, ltf: 5, htf: 15, m1: bars, cur, cd: BASE.i };
        R.intra = E.runIntra(SI, CFG);
        mtf.i = [5, 15, 60].map(n => E.biasOf(E.resample(bars, n, BASE.i).filter(b => b.done)));
      }
      rows.push(...summarize(m.s, m, R, mtf));
    } catch (e) { console.error(m.s, e.message); errs.push(m.s); }
  }
  // in core mode keep yesterday's universe rows
  if (MODE !== 'full' && prev && prev.rows) rows.push(...prev.rows.filter(r => !r.core));
  rows.sort((a, b) => b.act - a.act || b.score - a.score);
  const lastCandle = (() => { const x = raw.find(r => r.m.s === 'NIFTY'); return x && x.i && x.i.length ? x.i[0][0] : null; })();
  const out = { generated: new Date().toISOString(), mode: MODE, asOf: BASE.ds, lastCandle,
    universe: MODE === 'full' ? all.length : (prev && prev.universe) || core.length,
    universeAsOf: MODE === 'full' ? BASE.ds : (prev && prev.universeAsOf) || null,
    quotes: MODE === 'full' ? quotes : Object.assign({}, (prev && prev.quotes) || {}, quotes),
    errors: errs, requests: stats, symbols: MODE === 'full' ? index : [...new Set(index.concat((prev && prev.symbols) || []))], rows };
  fs.writeFileSync(path.join(OUT, 'scan.json'), JSON.stringify(out));
  console.log(`asOf=${BASE.ds} rows=${rows.length} errors=${errs.length} requests=${stats.req} failed=${stats.fail}`);
}
module.exports = { main, setFetcher: f => { FETCHER = f; } };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
