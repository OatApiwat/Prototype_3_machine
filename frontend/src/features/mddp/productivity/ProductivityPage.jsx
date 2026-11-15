import React, { useMemo, useState } from 'react';
import { useProductivityData } from './useProductivityData.js';
import PartChart from './PartChart.jsx';
import {
  DEFECTS,
  DEFECT_COLORS,
  PARTS_PER_STRIP,
  bySuspension,
  hasDefect,
  niceAxis,
  stripLabel,
  stripRows,
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

const defectNames = (m) => DEFECTS.filter((_, i) => hasDefect(m, i)).join(', ') || 'No defect';
const bars = (rows) => DEFECTS.map((_, d) => rows.map((r) => (r ? hasDefect(r.defect, d) : 0)));
const fmtT = (t) => new Date(t).toLocaleString('sv-SE');

function Legend() {
  return (
    <div className="plegend">
      <b>Defect :</b>
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
  const [pickRc, setPickRc] = useState(null),
    [pickStrip, setPickStrip] = useState(null);
  const first = useProductivityData(null);
  const rc = pickRc || (first.cards && first.cards.length ? first.cards[first.cards.length - 1].rc : null);
  const { cards, parts, error } = useProductivityData(rc);
  const strips = useMemo(() => [...new Set(parts.map((r) => r.strip))].sort((a, b) => a - b), [parts]);
  const strip = pickStrip && strips.includes(pickStrip) ? pickStrip : strips[strips.length - 1];
  const rows = useMemo(
    () => (strip ? stripRows(parts, strip) : Array(PARTS_PER_STRIP).fill(null)),
    [parts, strip]
  );
  const sus = useMemo(() => bySuspension(parts), [parts]);
  const sm = summarize(rows);
  const totalN = sus.reduce((a, s) => a + s.n, 0),
    totalD = sus.reduce((a, s) => a + s.d, 0);
  const wide = { display: 'grid', gap: 8, marginTop: 8 };

  const partTip = (i) => {
    const r = rows[i];
    return r
      ? [
          `Part ${i + 1} · ${fmtT(r.t)}`,
          ...PARAMS.map((p) => `${p.title}: ${r[p.f].toFixed(p.dec)} ${p.unit}`),
          defectNames(r.defect),
        ]
      : [`Part ${i + 1}`, 'not made yet'];
  };
  const lineChart = (p) => ({
    n: PARTS_PER_STRIP,
    lines: [{ label: p.title, color: 'text', values: rows.map((r) => (r ? r[p.f] : null)) }],
    axis: niceAxis(...range(rows.map((r) => r && r[p.f]))),
    bars: bars(rows),
    ylabel: `${p.unit}`,
    xlabel: `Part No. (1 - ${PARTS_PER_STRIP})`,
    ...RIGHT,
  });
  const vibChart = (v) => {
    const vals = v.f.map((f) => rows.map((r) => (r ? r[f] : null)));
    return {
      n: PARTS_PER_STRIP,
      lines: AXES.map(([, color], k) => ({ color, values: vals[k] })),
      axis: niceAxis(...range(vals.flat())),
      bars: bars(rows),
      ylabel: v.unit,
      xlabel: `Part No. (1 - ${PARTS_PER_STRIP})`,
      ...RIGHT,
    };
  };
  const susTip = (i) => {
    const s = sus[i];
    return [
      `Suspension ${i + 1} (strip ${s.strip} of carrier, part ${s.part})`,
      `Defective parts: ${s.d} of ${s.n} pcs (${s.n ? ((100 * s.d) / s.n).toFixed(1) : 0}%)`,
      ...DEFECTS.map((d, k) => (s.cnt[k] ? `${d}: ${s.cnt[k]}` : null)).filter(Boolean),
    ];
  };
  const susMax = Math.max(2, ...sus.map((s) => s.cnt.reduce((a, b) => a + b, 0)));
  const susAxis = niceAxis(0, susMax);
  susAxis.lo = 0;

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
          Run Card :
          <select
            className="pill"
            value={rc || ''}
            onChange={(e) => (setPickRc(e.target.value), setPickStrip(null))}
          >
            {(cards || []).map((c) => (
              <option key={c.rc} value={c.rc}>
                {c.rc} ({c.pieces} pcs)
              </option>
            ))}
          </select>
        </label>
        <label className="pfield">
          Strip No :
          <select className="pill" value={strip || ''} onChange={(e) => setPickStrip(+e.target.value)}>
            {strips.map((s) => (
              <option key={s} value={s}>
                {stripLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <Legend />
      </div>
      {error && (
        <div className="card" style={{ marginTop: 8, color: 'var(--red)' }}>
          Cannot load data: {error}
        </div>
      )}
      {!error && cards && !cards.length && (
        <div className="card" style={{ marginTop: 8, color: 'var(--muted)' }}>
          No finished pieces in InfluxDB yet — wait a few seconds for the first carrier.
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <PartChart
          title={`Defective parts per suspension — Run Card ${rc || '-'}`}
          right={`${sus.length} suspensions · ${totalN ? ((100 * totalD) / totalN).toFixed(1) : 0}% defective overall`}
          height={230}
          draw={{
            n: sus.length,
            lines: [{ color: '#c0392b', values: sus.map((s) => (s.n ? (100 * s.d) / s.n : null)) }],
            lineRight: true,
            axis: susAxis,
            bars: DEFECTS.map((_, d) => sus.map((s) => s.cnt[d])),
            ylabel: 'Defects found (count, by type)',
            xlabel: 'Suspension No. on carrier (1 carrier = 3 strips = 60 suspensions)',
            rightMax: 100,
            rightTicks: [0, 25, 50, 75, 100],
            rightFmt: (v) => v + '%',
            rightLabel: 'Defective parts (%)',
          }}
          tip={susTip}
        />
      </div>
      <div style={{ ...wide, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {PARAMS.map((p) => (
          <PartChart
            key={p.f}
            title={`${p.title} (${p.unit})`}
            right={rows.some(Boolean) ? last(rows, p.f, p.dec) : ''}
            height={220}
            draw={lineChart(p)}
            tip={partTip}
          />
        ))}
      </div>
      <div style={{ ...wide, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {VIBS.map((v) => (
          <PartChart
            key={v.title}
            title={v.title}
            right={AXES.map(([a], k) => `${a} ${lastVal(rows, v.f[k])}`).join('  ')}
            height={250}
            draw={vibChart(v)}
            tip={(i) => {
              const r = rows[i];
              return r
                ? [
                    `Part ${i + 1} · ${fmtT(r.t)}`,
                    ...AXES.map(([a], k) => `${a}: ${r[v.f[k]].toFixed(2)} ${v.unit}`),
                    defectNames(r.defect),
                  ]
                : [`Part ${i + 1}`, 'not made yet'];
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
          Run Card {rc || '-'} / {strip ? stripLabel(strip) : '-'}
        </b>
        <span>{sm.n} parts inspected</span>
        <span style={{ color: sm.total ? 'var(--red)' : undefined }}>{sm.total} defects found</span>
        <span>
          {sm.defective} defective parts{sm.n ? ` (${((100 * sm.defective) / sm.n).toFixed(0)}%)` : ''}
        </span>
        <span>Top defect type: {sm.top}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
          Data from InfluxDB (mddp_part) · refreshed every 5 s
        </span>
      </div>
    </div>
  );
}

function range(vals) {
  const v = vals.filter((x) => typeof x === 'number');
  return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
}
function lastVal(rows, f) {
  const r = [...rows].reverse().find(Boolean);
  return r ? r[f].toFixed(2) : '--';
}
const last = (rows, f, dec) => {
  const r = [...rows].reverse().find(Boolean);
  return r ? r[f].toFixed(dec) : '';
};
