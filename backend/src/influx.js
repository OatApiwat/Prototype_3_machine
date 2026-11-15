'use strict';
const { InfluxDB } = require('@influxdata/influxdb-client');

function makeInflux(cfg) {
  const q = new InfluxDB({ url: cfg.url, token: cfg.token }).getQueryApi(cfg.org);
  // one Flux query for all measurements in [start, stop) -> rows pivoted per timestamp/series
  function fluxFor(startIso, stopIso, measurement) {
    const filt = measurement ? `|> filter(fn: (r) => r._measurement == "${measurement.replace(/[^A-Za-z0-9_]/g, '')}")` : '';
    return `from(bucket: "${cfg.bucket}") |> range(start: ${startIso}, stop: ${stopIso}) ${filt} ` +
      `|> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value") |> group() |> sort(columns: ["_time"])`;
  }
  async function query(startMs, stopMs, measurement) {
    const flux = fluxFor(new Date(startMs).toISOString(), new Date(stopMs).toISOString(), measurement);
    const out = [];
    await new Promise((resolve, reject) => {
      q.queryRows(flux, {
        next(row, meta) {
          const o = meta.toObject(row);
          const r = { m: o._measurement, t: Date.parse(o._time) };
          for (const [k, v] of Object.entries(o)) {
            if (k.startsWith('_') || k === 'result' || k === 'table') continue;
            if (v === '' || v === null || v === undefined) continue;
            r[k] = v;
          }
          out.push(r);
        },
        error: reject,
        complete: resolve
      });
    });
    return out;
  }
  // ---- productivity (defect) data: one row per finished piece, queried per run card (not part of the live stream) ----
  const rows = async (flux, f) => {
    const out = [];
    await new Promise((resolve, reject) => q.queryRows(flux, { next(row, meta) { out.push(f(meta.toObject(row))); }, error: reject, complete: resolve }));
    return out;
  };
  const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '');
  const runCards = () => rows(
    `from(bucket: "${cfg.bucket}") |> range(start: -${cfg.partsRetention || '24h'}) |> filter(fn: (r) => r._measurement == "mddp_part" and r._field == "defect") ` +
    `|> group(columns: ["rc"]) |> reduce(identity: {n: 0, d: 0, last: 0}, fn: (r, accumulator) => ({n: accumulator.n + 1, d: accumulator.d + (if r._value > 0 then 1 else 0), last: if int(v: r._time) > accumulator.last then int(v: r._time) else accumulator.last}))`,
    (o) => ({ rc: o.rc, pieces: o.n, defective: o.d, last: Math.round(o.last / 1e6) }));
  const parts = (rc) => rows(
    `from(bucket: "${cfg.bucket}") |> range(start: -${cfg.partsRetention || '24h'}) |> filter(fn: (r) => r._measurement == "mddp_part" and r.rc == "${safe(rc)}") ` +
    `|> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value") |> group() |> sort(columns: ["_time"])`,
    (o) => ({ t: Date.parse(o._time), side: o.side, strip: o.strip, part: o.part, carrier: o.carrier, temp: o.temp, peak: o.peak, dur: o.dur, velx: o.velx, vely: o.vely, velz: o.velz, accx: o.accx, accy: o.accy, accz: o.accz, defect: o.defect }));
  return { query, runCards, parts };
}
module.exports = { makeInflux };
