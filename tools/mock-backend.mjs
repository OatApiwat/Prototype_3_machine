// Dev/CI helper: backend look-alike WITHOUT InfluxDB (feeds the same Node-RED sim lines straight into the WebSocket),
// used to smoke-test the frontend where Docker is not available.  node tools/mock-backend.mjs  (needs backend/node_modules)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const express = require('../backend/node_modules/express'); const { WebSocketServer } = require('../backend/node_modules/ws');
const http = require('node:http'); const { tick } = require('../nodered/sim/index.js');
const state = {}, buf = [], faults = [], partsAll = []; const app = express(); const delay = 8000;
const gm = require('../nodered/sim/gen_mddp.js');
{ const b0 = Date.now() - 600000; for (const l of gm.signals.part(b0, b0, b0 + 520000).split('\n')) if (l) partsAll.push(parse(l)); }
const { carriersOf, partsOf, rangeOf } = require('../backend/src/productivity.js');
const cardsIn = (from, to) => { const m = new Map(); for (const p of partsAll) { if (p.t < from || p.t > to) continue; const o = m.get(p.rc) || { rc: p.rc, pieces: 0, defective: 0, first: p.t, last: 0 }; o.pieces++; if (p.defect > 0) o.defective++; o.first = Math.min(o.first, p.t); o.last = Math.max(o.last, p.t); m.set(p.rc, o); } return [...m.values()]; };
app.get('/api/mddp/runcards', (q, r) => { const d = q.query, byDate = d.dateStart != null || d.dateEnd != null, g = rangeOf(byDate ? d.dateStart ?? d.dateEnd : d.from, byDate ? d.dateEnd ?? d.dateStart : d.to, 420); if (!g) return r.status(400).json({ error: 'invalid date' }); r.json(cardsIn(g.from, g.to).map((c) => ({ rc: c.rc })).sort((a, b) => (a.rc < b.rc ? -1 : 1))); });
app.get('/api/mddp/carriers', (q, r) => r.json(carriersOf(partsAll.filter((p) => p.rc === q.query.rc))));
app.get('/api/mddp/parts', (q, r) => r.json(partsOf(partsAll.filter((p) => p.rc === q.query.rc), +q.query.seq)));
app.get('/api/config', (_q, r) => r.json({ pollMs: 5000, renderDelayMs: delay }));
function parse(line) {
  const sp = line.match(/^(\S+) (.+) (\d+)$/); const [h, f, ts] = [sp[1], sp[2], +sp[3]]; const [m, ...tg] = h.split(','); const o = { m, t: ts };
  tg.forEach((x) => { const [k, v] = x.split('='); o[k] = v; });
  const re = /([A-Za-z0-9_]+)=("(?:[^"]*)"|[^,]*)/g; let q;
  while ((q = re.exec(f))) { const v = q[2]; o[q[1]] = v.startsWith('"') ? v.slice(1, -1) : v.endsWith('i') ? parseInt(v) : parseFloat(v); }
  return o;
}
const server = http.createServer(app); const wss = new WebSocketServer({ server, path: '/ws' }); const clients = new Set();
wss.on('connection', (ws) => { clients.add(ws); const by = {}; for (const r of buf) (by[r.m] = by[r.m] || []).push(r); by.calul_fault = faults.slice(); ws.send(JSON.stringify({ type: 'snapshot', serverNow: Date.now(), data: by })); ws.on('close', () => clients.delete(ws)); });
tick(state, Date.now() - 120000);
let pending = [];
setInterval(() => { const l = tick(state, Date.now() - 1000); if (l) for (const x of l.split("\n")) pending.push(parse(x)); }, 250);
setInterval(() => { const rows = pending; pending = []; for (const r of rows) buf.push(r); const cut = Date.now() - 120000; while (buf.length && buf[0].t < cut) buf.shift(); for (const r of rows) { if (r.m === 'calul_fault') faults.push(r); if (r.m === 'mddp_part') partsAll.push(r); } const by = {}; for (const r of rows) (by[r.m] = by[r.m] || []).push(r); const msg = JSON.stringify({ type: 'batch', data: by }); clients.forEach((c) => c.readyState === 1 && c.send(msg)); }, 5000);
server.listen(3001, () => console.log('mock backend :3001'));
