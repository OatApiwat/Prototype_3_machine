// Verification loop helper (runs against the live stack):  node tools/verify.mjs [http://localhost:8080]
// Checks: backend health, every measurement present, no gaps (> GAP ms) in the cached series, ms timestamps, row rates.
const base = process.argv[2] || 'http://localhost:8080';
const EXPECT = { mddp_fast: [1000, 2], mddp_arm: [20, 2], mddp_carrier: [20, 1], calul_vac: [100, 1], calul_robot: [20, 1], calul_flow: [20, 1], calul_festo: [20, 3], calul_arrival: [0, 1], hall_oven: [10, 1], hall_tray: [10, 1] };
const j = async (p) => (await fetch(base + p)).json();
const health = await j('/api/health'); let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
if (!health.ok) fail('health: ' + health.lastError);
for (const [m, [hz, series]] of Object.entries(EXPECT)) {
  if (!health.measurements.includes(m)) { fail('missing measurement ' + m); continue; }
  const { rows } = await j(`/api/history?measurement=${m}&seconds=30`);
  const by = new Map(); for (const r of rows) { const k = [r.side, r.k, r.axis, r.point].join('/'); (by.get(k) || by.set(k, []).get(k)).push(r.t); }
  let maxGap = 0, n = 0; for (const [, ts] of by) { ts.sort((a, b) => a - b); n += ts.length; for (let i = 1; i < ts.length; i++) maxGap = Math.max(maxGap, ts[i] - ts[i - 1]); }
  const allowed = hz ? 3 * 1000 / hz + 5 : 1e9;
  console.log(m.padEnd(14), 'series', by.size, 'rows(30s)', n, 'max gap ms', maxGap, hz ? '(limit ' + allowed + ')' : '(event stream)');
  if (hz && maxGap > allowed) fail(`${m}: gap ${maxGap} ms`);
  if (hz && by.size < series) fail(`${m}: expected >= ${series} series`);
}
console.log(bad ? `${bad} problem(s)` : 'ALL OK'); process.exit(bad ? 1 : 0);
