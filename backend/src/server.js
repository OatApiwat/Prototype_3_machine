'use strict';
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { Cache } = require('./cache');
const { makeInflux } = require('./influx');

const cfg = {
  url: process.env.INFLUX_URL || 'http://localhost:8086',
  org: process.env.INFLUX_ORG || 'mpt',
  bucket: process.env.INFLUX_BUCKET || 'machines',
  token: process.env.INFLUX_TOKEN || 'dev-token-change-me',
  pollMs: +process.env.POLL_MS || 5000,
  renderDelayMs: +process.env.RENDER_DELAY_MS || 8000,
  cacheSec: +process.env.CACHE_SECONDS || 120,
  cacheFastSec: +process.env.CACHE_FAST_SECONDS || 60,
  historyTtlMs: +process.env.HISTORY_TTL_MS || 45000,
  port: +process.env.PORT || 3001
};

const cache = new Cache({ default: cfg.cacheSec, mddp_fast: cfg.cacheFastSec });
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
    const stop = Date.now() - 1000;
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
setInterval(poll, cfg.pollMs); poll();

// ---- REST ----
app.get('/api/config', (_q, res) => res.json({ pollMs: cfg.pollMs, renderDelayMs: cfg.renderDelayMs, cacheSec: cfg.cacheSec, cacheFastSec: cfg.cacheFastSec }));
app.get('/api/health', (_q, res) => res.json({ ok: lastError === null, lastPollOk, lastError, clients: clients.size, measurements: cache.measurements() }));

const hist = new Map();   // key -> { at, promise }  (TTL cache + request coalescing for ranges older than the ring buffer)
app.get('/api/history', async (req, res) => {
  const m = String(req.query.measurement || '').replace(/[^A-Za-z0-9_]/g, '');
  const sec = Math.min(+req.query.seconds || 60, 86400);
  if (!m) return res.status(400).json({ error: 'measurement required' });
  const t0 = Date.now() - sec * 1000, old = cache.oldest(m);
  if (old !== null && old <= t0 + 2000) return res.json({ source: 'cache', rows: cache.since(m, t0) });
  const key = m + ':' + Math.round(sec / 10);
  let h = hist.get(key);
  if (!h || Date.now() - h.at > cfg.historyTtlMs) {
    h = { at: Date.now(), promise: influx.query(t0, Date.now() - 1000, m) }; hist.set(key, h);
    h.promise.catch(() => hist.delete(key));
  }
  try { res.json({ source: 'influx', rows: await h.promise }); } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: { threshold: 1024 } });
wss.on('connection', (ws) => {
  clients.add(ws);
  const snap = {};   // initial backfill straight from the cache (no Influx query)
  const t0 = Date.now() - cfg.cacheSec * 1000;
  for (const m of cache.measurements()) snap[m] = cache.since(m, t0);
  ws.send(JSON.stringify({ type: 'snapshot', serverNow: Date.now(), data: snap }));
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});
server.listen(cfg.port, () => console.log('backend on :' + cfg.port, cfg));
