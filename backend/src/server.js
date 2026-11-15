'use strict';
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { Cache } = require('./cache');
const { makeInflux } = require('./influx');
const { carriersOf, partsOf, rangeOf } = require('./productivity');

const cfg = {
  url: process.env.INFLUX_URL || 'http://localhost:8086',
  org: process.env.INFLUX_ORG || 'mpt',
  bucket: process.env.INFLUX_BUCKET || 'machines',
  token: process.env.INFLUX_TOKEN || 'dev-token-change-me',
  pollMs: +process.env.POLL_MS || 5000,
  renderDelayMs: +process.env.RENDER_DELAY_MS || 9000,
  cacheSec: +process.env.CACHE_SECONDS || 120,
  tzOffsetMin: Number.isFinite(+process.env.TZ_OFFSET_MIN) && process.env.TZ_OFFSET_MIN ? +process.env.TZ_OFFSET_MIN : 420,   // day boundaries when the request has no tz (Asia/Bangkok)
  cacheFastSec: +process.env.CACHE_FAST_SECONDS || 60,
  marginMs: +process.env.POLL_MARGIN_MS || 2000,
  historyTtlMs: +process.env.HISTORY_TTL_MS || 45000,
  port: +process.env.PORT || 3001
};

const LOG_M = 'calul_fault', LOG_SEC = 3 * 3600;   // fault-code log: kept for the whole sim horizon so the "since start" tables are complete
const cache = new Cache({ default: cfg.cacheSec, mddp_fast: cfg.cacheFastSec, [LOG_M]: LOG_SEC });
const influx = makeInflux(cfg);
const app = express();
app.use(cors());

let stopPrev = Date.now() - cfg.cacheSec * 1000;   // warm-up window: refill the cache once at start
let polling = false, lastPollOk = null, lastError = null;
const clients = new Set();

function broadcast(rows) {
  if (!rows.length || !clients.size) return;
  const by = {};
  for (const r of rows) (by[r.m] = by[r.m] || []).push(r);
  const msg = JSON.stringify({ type: 'batch', data: by });
  for (const ws of clients) if (ws.readyState === 1) ws.send(msg);
}

async function poll() {
  if (polling) return; polling = true;
  try {
    // stop slightly in the past so rows still being written by Node-RED are never missed
    const stop = Date.now() - cfg.marginMs;
    if (stop > stopPrev) {
      const rows = await influx.query(stopPrev, stop);
      const by = new Map();
      for (const r of rows) { if (!by.has(r.m)) by.set(r.m, []); by.get(r.m).push(r); }
      for (const [m, arr] of by) cache.add(m, arr);
      stopPrev = stop; lastPollOk = Date.now(); lastError = null;
      broadcast(rows);
    }
  } catch (e) { lastError = String(e.message || e); console.error('poll failed:', lastError); }
  finally { polling = false; }
}
setInterval(poll, cfg.pollMs);
// warm-up: the log measurement is refilled for its whole window once at start (the normal window is only cacheSec)
influx.query(Date.now() - LOG_SEC * 1000, stopPrev, LOG_M).then((rows) => { if (rows.length) cache.add(LOG_M, rows); }).catch((e) => console.error('log warm-up failed:', String(e.message || e))).finally(poll);

// ---- REST ----
app.get('/api/config', (_q, res) => res.json({ pollMs: cfg.pollMs, renderDelayMs: cfg.renderDelayMs, cacheSec: cfg.cacheSec, cacheFastSec: cfg.cacheFastSec }));
app.get('/api/health', (_q, res) => res.json({ ok: lastError === null, lastPollOk, lastError, clients: clients.size, measurements: cache.measurements() }));

const hist = new Map(), HIST_MAX = 64;   // key -> { at, promise }  (TTL cache + request coalescing for ranges older than the ring buffer)
app.get('/api/history', async (req, res) => {
  const m = String(req.query.measurement || '').replace(/[^A-Za-z0-9_]/g, '');
  const sec = Math.min(+req.query.seconds || 60, 86400);
  if (!m) return res.status(400).json({ error: 'measurement required' });
  if (cache.measurements().length && !cache.measurements().includes(m)) return res.status(404).json({ error: 'unknown measurement' });
  const t0 = Date.now() - sec * 1000, old = cache.oldest(m);
  if (old !== null && old <= t0 + 2000) return res.json({ source: 'cache', rows: cache.since(m, t0) });
  const key = m + ':' + Math.round(sec / 10);
  let h = hist.get(key);
  if (!h || Date.now() - h.at > cfg.historyTtlMs) {
    for (const [k, v] of hist) if (Date.now() - v.at > cfg.historyTtlMs) hist.delete(k);
    if (hist.size >= HIST_MAX) hist.delete(hist.keys().next().value);
    h = { at: Date.now(), promise: influx.query(t0, Date.now() - cfg.marginMs, m) }; hist.set(key, h);
    h.promise.catch(() => hist.delete(key));
  }
  try { res.json({ source: 'influx', rows: await h.promise }); } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// ---- productivity dashboard: per run card, per piece (small TTL cache + request coalescing; data older than the live cache) ----
const prod = new Map();
const cached = (key, ttl, fn) => {
  let h = prod.get(key);
  if (!h || Date.now() - h.at > ttl) {
    for (const [k, v] of prod) if (Date.now() - v.at > 60000) prod.delete(k);
    h = { at: Date.now(), promise: fn() }; prod.set(key, h);
    h.promise.catch(() => prod.delete(key));
  }
  return h.promise;
};
// GET /api/mddp/runcards?dateStart=YYYY-MM-DD&dateEnd=YYYY-MM-DD   run cards with pieces from 00:00 of dateStart to the end of dateEnd (TZ_OFFSET_MIN, default Asia/Bangkok);
//     no dateEnd = dateStart; legacy from/to (epoch ms) still accepted; no parameters = last 24 h
// GET /api/mddp/carriers?rc=<run card>          carriers of a run card with their Strip numbers
// GET /api/mddp/parts?rc=<run card>&strip=Strip-76,Strip-77   the pieces (20 per strip) of the strips
const rcOf = (q) => String(q.rc || '').replace(/[^A-Za-z0-9_-]/g, '');
const fail = (res, e) => res.status(502).json({ error: String(e.message || e) });
app.get('/api/mddp/runcards', async (req, res) => {
  const q = req.query, byDate = q.dateStart != null || q.dateEnd != null;
  const range = rangeOf(byDate ? q.dateStart ?? q.dateEnd : q.from, byDate ? q.dateEnd ?? q.dateStart : q.to, cfg.tzOffsetMin);
  if (!range) return res.status(400).json({ error: 'invalid date' });
  if (byDate && (q.dateStart ?? q.dateEnd) > (q.dateEnd ?? q.dateStart)) return res.status(400).json({ error: 'dateStart must not be after dateEnd' });
  const { from, to } = range;
  if (!(from < to)) return res.json([]);
  try { res.json(await cached(`rcs:${Math.round(from / 1000)}:${Math.round(to / 1000)}`, cfg.pollMs, async () => (await influx.runCards(from, to)).map((c) => ({ rc: c.rc })).sort((a, b) => (a.rc < b.rc ? -1 : 1)))); } catch (e) { fail(res, e); }
});
app.get('/api/mddp/carriers', async (req, res) => {
  const rc = rcOf(req.query);
  if (!rc) return res.status(400).json({ error: 'rc required' });
  try { res.json(carriersOf(await cached('parts:' + rc, cfg.pollMs, () => influx.parts(rc)))); } catch (e) { fail(res, e); }
});
app.get('/api/mddp/parts', async (req, res) => {
  const rc = rcOf(req.query), strips = String(req.query.strip || '').split(',').filter((x) => /^Strip-\d+$/.test(x));
  if (!rc || !strips.length) return res.status(400).json({ error: 'rc and strip required' });
  try { res.json(partsOf(await cached('parts:' + rc, cfg.pollMs, () => influx.parts(rc)), strips)); } catch (e) { fail(res, e); }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: { threshold: 1024 } });
wss.on('connection', (ws) => {
  clients.add(ws);
  const snap = {};   // initial backfill straight from the cache (no Influx query)
  const t0 = Date.now() - cfg.cacheSec * 1000;
  for (const m of cache.measurements()) snap[m] = cache.since(m, m === LOG_M ? 0 : t0);
  ws.send(JSON.stringify({ type: 'snapshot', serverNow: Date.now(), data: snap }));
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});
setInterval(() => { for (const ws of clients) { if (!ws.isAlive || ws.bufferedAmount > 20e6) { ws.terminate(); clients.delete(ws); continue; } ws.isAlive = false; ws.ping(); } }, 30000);
server.listen(cfg.port, () => console.log('backend on :' + cfg.port, cfg));
