// Runs the robot with safe networking: paced requests, a 15 s timeout on each, and a 22 min hard stop.
const real = globalThis.fetch, RATE = 8, T0 = Date.now(), STOP = T0 + 22 * 60e3;
let next = Date.now(), n = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const empty = { status: 404, headers: { get: () => null }, json: async () => ({ status: 'error' }) };
globalThis.fetch = async (url, opt = {}) => {
  if (Date.now() > STOP) return empty;
  const now = Date.now(), at = Math.max(now, next); next = at + 1000 / RATE;
  if (at > now) await sleep(at - now);
  if (++n % 200 === 0) console.log(`${n} requests in ${((Date.now() - T0) / 1000) | 0}s`);
  const r = await (globalThis.__realFetch || real)(url, { ...opt, signal: AbortSignal.timeout(15000) });
  if (r.status === 429) next = Date.now() + 5000;
  return r;
};
require('./run.js').main().catch(e => { console.error(e); process.exit(1); });
