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
  return { query };
}
module.exports = { makeInflux };
