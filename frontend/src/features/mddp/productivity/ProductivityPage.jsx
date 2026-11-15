import React, { useMemo, useState } from 'react';
import { cardsUrl, carriersUrl, partsUrl, useLoaded } from './useProductivityData.js';
import PartChart from './PartChart.jsx';
import {
  DEFECTS,
  DEFECT_COLORS,
  PIECES_PER_RUN_CARD,
  STRIPS_PER_CARRIER,
  PARTS_PER_STRIP,
  SUSPENSIONS,
  carrierLabel,
  carrierRows,
  clock,
  hasDefect,
  niceAxis,
  stripLabel,
  summarize,
} from './defects.js';

const PARAMS = [
  { f: 'temp', title: 'Epoxy head temperature', unit: '°C', dec: 2 },
  { f: 'peak', title: 'Dispense pressure (peak)', unit: 'kPa', dec: 1 },
  { f: 'dur', title: 'Epoxy dispense time', unit: 'ms', dec: 1 },
];
const VIBS = [
  { title: 'Vibration of robot motor X, Y, Z (velocity)', unit: 'mm/s', f: ['velx', 'vely', 'velz'] },
  { title: 'Vibration of robot motor X, Y, Z (acceleration)', unit: 'm/s²', f: ['accx', 'accy', 'accz'] },
];
const AXES = [
  ['X', 'text'],
  ['Y', '#d62728'],
  ['Z', '#1a9e6e'],
];
const RIGHT = { rightMax: 6, rightTicks: [0, 2, 4, 6], rightLabel: 'Defect count' };
const X_LABEL = `Suspension No. (1 - ${SUSPENSIONS}) · 1 carrier = ${STRIPS_PER_CARRIER} strips × ${PARTS_PER_STRIP}`;

const X_LABEL_STRIP = `Suspension No. within the strip (1 strip = ${PARTS_PER_STRIP} pieces)`;

const pad = (n) => String(n).padStart(2, '0');
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayStart = (s) => new Date(s + 'T00:00:00').getTime();
const dayEnd = (s) => new Date(s + 'T23:59:59.999').getTime();
const fmtT = (t) => new Date(t).toLocaleString('sv-SE');
const defectNames = (m) => DEFECTS.filter((_, i) => hasDefect(m, i)).join(', ') || 'No defect';
const bars = (rows) => DEFECTS.map((_, d) => rows.map((r) => (r ? hasDefect(r.defect, d) : 0)));
const lastOf = (rows) => [...rows].reverse().find(Boolean);
const range = (vals) => {
  const v = vals.filter((x) => typeof x === 'number');
  return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
};

function Legend() {
  return (
    <div className="plegend">
      <b>Defect code :</b>
      {DEFECTS.map((d, i) => (
        <span key={d}>
          <i style={{ background: DEFECT_COLORS[i] }} />
          {d}
        </span>
      ))}
    </div>
  );
}

export default function ProductivityPage() {
  const today = dayStr(new Date());
  const [dateStart, setDateStart] = useState(today),
    [dateEnd, setDateEnd] = useState(today),
    [pickRc, setPickRc] = useState(null),
    [pickSeq, setPickSeq] = useState(null),
    [pickStrip, setPickStrip] = useState(null);
  const from = dayStart(dateStart),
    to = dayEnd(dateEnd),
    badRange = !(from < to);
  // loaded in steps (date range -> run cards -> carriers of the run card -> pieces of the carrier), each once per selection
  const [nonce, setNonce] = useState(0);
  const step1 = useLoaded(cardsUrl(from, to), nonce);
  const cards = useMemo(() => [...(step1.url ? step1.data : [])].sort((a, b) => a.first - b.first), [step1]);
  const rc = cards.some((c) => c.rc === pickRc) ? pickRc : (cards[cards.length - 1]?.rc ?? null);
  const step2 = useLoaded(carriersUrl(rc), nonce);
  const carriers = useMemo(() => (step2.url ? step2.data : []).filter((c) => c.carrier != null), [step2]);
  const complete = (c) => c.pieces >= SUSPENSIONS;
  const doneCarriers = carriers.filter(complete);
  const seq = carriers.some((c) => c.seq === pickSeq)
    ? pickSeq
    : (doneCarriers[doneCarriers.length - 1] ?? carriers[carriers.length - 1])?.seq;
  const step3 = useLoaded(partsUrl(rc, seq), nonce);
  const parts = useMemo(() => (step3.url ? step3.data : []), [step3]);
  const loading = !!(step1.loading || step2.loading || step3.loading);
  const reload = () => setNonce((n) => n + 1);
  const carrier = carriers.find((c) => c.seq === seq);
  const allRows = useMemo(() => carrierRows(parts), [parts]);
  const stripNos = carrier ? carrier.strips : [];
  // Strip No. selector: all 3 strips of the carrier, or one strip (20 pieces = 1 row of the machine)
  const sk = pickStrip >= 1 && pickStrip <= stripNos.length ? pickStrip - 1 : -1; // position 1-3 inside the carrier, kept when the carrier changes
  const off = sk >= 0 ? sk * PARTS_PER_STRIP : 0;
  const nView = sk >= 0 ? PARTS_PER_STRIP : SUSPENSIONS;
  const rows = sk >= 0 ? allRows.slice(off, off + PARTS_PER_STRIP) : allRows;
  const sm = summarize(rows);
  const groups = (sk >= 0 ? [sk] : Array.from({ length: STRIPS_PER_CARRIER }, (_, k) => k)).map((k, j) => ({
    from: j * PARTS_PER_STRIP,
    to: (j + 1) * PARTS_PER_STRIP,
    label: stripNos[k] ? stripLabel(stripNos[k]) : `Strip ${k + 1}`,
  }));
  const card = cards.find((c) => c.rc === rc);
  const err = step1.error || step2.error || step3.error;

  const partTip = (i) => {
    const r = rows[i];
    return r
      ? [
          `Suspension ${off + i + 1} (strip ${r.strip}, part ${r.part}) · ${fmtT(r.t)}`,
          ...PARAMS.map((p) => `${p.title}: ${r[p.f].toFixed(p.dec)} ${p.unit}`),
          defectNames(r.defect),
        ]
      : [`Suspension ${off + i + 1}`, 'not made yet'];
  };
  const common = { n: nView, groups, bars: bars(rows), xlabel: sk >= 0 ? X_LABEL_STRIP : X_LABEL, ...RIGHT };
  const lineChart = (p) => ({
    ...common,
    lines: [{ label: p.title, color: 'text', values: rows.map((r) => (r ? r[p.f] : null)) }],
    axis: niceAxis(...range(rows.map((r) => r && r[p.f]))),
    ylabel: p.unit,
  });
  const vibChart = (v) => {
    const vals = v.f.map((f) => rows.map((r) => (r ? r[f] : null)));
    return {
      ...common,
      lines: AXES.map(([, color], k) => ({ color, values: vals[k] })),
      axis: niceAxis(...range(vals.flat())),
      ylabel: v.unit,
    };
  };
  const cur = (f, dec) => {
    const r = lastOf(rows);
    return r ? r[f].toFixed(dec) : '--';
  };

  // run card overview: defects per carrier visit (click a bar to open that carrier)
  const ov = carriers;
  const ovMax = Math.max(2, ...ov.map((c) => c.cnt.reduce((a, b) => a + b, 0)));
  const ovAxis = niceAxis(0, ovMax);
  ovAxis.lo = 0;
  const ovTip = (i) => {
    const c = ov[i];
    return [
      `${carrierLabel(c.carrier)} · visit ${c.seq} · ${clock(c.start)}`,
      `Strips ${c.strips.join(', ')}`,
      `Defective parts: ${c.defective} of ${c.pieces} pcs (${((100 * c.defective) / c.pieces).toFixed(1)}%)`,
      ...DEFECTS.map((d, k) => (c.cnt[k] ? `${d}: ${c.cnt[k]}` : null)).filter(Boolean),
    ];
  };
  const totalN = ov.reduce((a, c) => a + c.pieces, 0),
    totalD = ov.reduce((a, c) => a + c.defective, 0);

  return (
    <div>
      <div
        className="card"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '6px 10px',
          marginTop: 8,
        }}
      >
        <b style={{ fontSize: 16 }}>Process parameter &amp; defect monitoring</b>
        <label className="pfield">
          Date Start :
          <input
            className="pill"
            type="date"
            value={dateStart}
            max={dateEnd}
            onChange={(e) => e.target.value && setDateStart(e.target.value)}
          />
        </label>
        <label className="pfield">
          Date End :
          <input
            className="pill"
            type="date"
            value={dateEnd}
            min={dateStart}
            onChange={(e) => e.target.value && setDateEnd(e.target.value)}
          />
        </label>
        <label className="pfield">
          Run Card :
          <select
            className="pill"
            value={rc || ''}
            onChange={(e) => (setPickRc(e.target.value), setPickSeq(null))}
            disabled={!cards.length}
          >
            {cards.map((c) => (
              <option key={c.rc} value={c.rc}>
                {c.rc} · {clock(c.first)} ({c.pieces.toLocaleString()} pcs
                {c.pieces >= PIECES_PER_RUN_CARD ? '' : ' · in progress'})
              </option>
            ))}
          </select>
        </label>
        <label className="pfield">
          Carrier No :
          <select
            className="pill"
            value={seq || ''}
            onChange={(e) => (setPickSeq(+e.target.value))}
            disabled={!carriers.length}
          >
            {carriers.map((c) => (
              <option key={c.seq} value={c.seq}>
                {carrierLabel(c.carrier)} · {clock(c.start)}
                {complete(c) ? '' : ' (in progress)'}
              </option>
            ))}
          </select>
        </label>
        <label className="pfield">
          Strip No :
          <select
            className="pill"
            value={sk >= 0 ? sk + 1 : ''}
            onChange={(e) => setPickStrip(e.target.value ? +e.target.value : null)}
            disabled={!carrier}
          >
            <option value="">All {STRIPS_PER_CARRIER} strips</option>
            {stripNos.map((n, k) => (
              <option key={n} value={k + 1}>
                Strip {k + 1} · No. {n}
              </option>
            ))}
          </select>
        </label>
        <button className="pill" onClick={reload} title="Load the latest data from InfluxDB">
          ↻ Refresh
        </button>
        <span style={{ flex: 1 }} />
        <Legend />
      </div>
      {badRange && (
        <div className="card" style={{ marginTop: 8, color: 'var(--red)' }}>
          Date Start must not be after Date End.
        </div>
      )}
      {err && (
        <div className="card" style={{ marginTop: 8, color: 'var(--red)' }}>
          Cannot load data: {err}
        </div>
      )}
      {!badRange && !err && cards.length === 0 && step1.url && !step1.loading && (
        <div className="card" style={{ marginTop: 8, color: 'var(--muted)' }}>
          No run cards in this period (InfluxDB keeps the last 7 days).
        </div>
      )}
      {ov.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <PartChart
            title={`Defective parts per carrier — Run Card ${rc}`}
            right={`${ov.length} carriers · ${totalN.toLocaleString()} pcs · ${totalN ? ((100 * totalD) / totalN).toFixed(1) : 0}% defective · click a bar to open a carrier`}
            height={200}
            onPick={(i) => (setPickSeq(ov[i].seq))}
            draw={{
              n: Math.max(ov.length, 45),
              lines: [{ color: '#c0392b', values: ov.map((c) => (100 * c.defective) / c.pieces) }],
              lineRight: true,
              barsLeft: true,
              axis: ovAxis,
              bars: DEFECTS.map((_, d) => ov.map((c) => c.cnt[d])),
              ylabel: 'Defects found (count, by code)',
              xlabel: 'Carrier visit in the run card (1 run card = 45 carriers = 2,700 pieces)',
              rightMax: 100,
              rightTicks: [0, 25, 50, 75, 100],
              rightFmt: (v) => v + '%',
              rightLabel: 'Defective parts (%)',
            }}
            tip={(i) => (ov[i] ? ovTip(i) : null)}
          />
        </div>
      )}
      {carrier && (
        <>
          {sm.n === 0 && (
            <div className="card" style={{ marginTop: 8, color: 'var(--muted)' }}>
              No parts yet for this {sk >= 0 ? 'strip' : 'carrier'}.
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gap: 8,
              marginTop: 8,
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {PARAMS.map((p) => (
              <PartChart
                key={p.f}
                title={`${p.title} (${p.unit})`}
                right={cur(p.f, p.dec)}
                height={220}
                draw={lineChart(p)}
                tip={partTip}
              />
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gap: 8,
              marginTop: 8,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}
          >
            {VIBS.map((v) => (
              <PartChart
                key={v.title}
                title={v.title}
                right={AXES.map(([a], k) => `${a} ${cur(v.f[k], 2)}`).join('  ')}
                height={250}
                draw={vibChart(v)}
                tip={(i) => {
                  const r = rows[i];
                  return r
                    ? [
                        `Suspension ${off + i + 1} (strip ${r.strip}, part ${r.part}) · ${fmtT(r.t)}`,
                        ...AXES.map(([a], k) => `${a}: ${r[v.f[k]].toFixed(2)} ${v.unit}`),
                        defectNames(r.defect),
                      ]
                    : [`Suspension ${off + i + 1}`, 'not made yet'];
                }}
              />
            ))}
          </div>
          <div
            className="card"
            style={{
              marginTop: 8,
              padding: '6px 10px',
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <b>
              Run Card {rc} / {carrierLabel(carrier.carrier)} (visit {carrier.seq})
            </b>
            <span>Strips {carrier.strips.join(', ')}</span>
            <span>{sm.n} parts inspected</span>
            <span style={{ color: sm.total ? 'var(--red)' : undefined }}>{sm.total} defects found</span>
            <span>
              {sm.defective} defective parts{sm.n ? ` (${((100 * sm.defective) / sm.n).toFixed(0)}%)` : ''}
            </span>
            <span>Top defect code: {sm.top}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
              {loading ? 'Loading… · ' : ''}
              Data from InfluxDB (mddp_part)
              {card
                ? ` · run card ${card.pieces.toLocaleString()} / ${PIECES_PER_RUN_CARD.toLocaleString()} pcs`
                : ''}{' '}
              · press Refresh to load newer pieces
            </span>
          </div>
        </>
      )}
    </div>
  );
}
