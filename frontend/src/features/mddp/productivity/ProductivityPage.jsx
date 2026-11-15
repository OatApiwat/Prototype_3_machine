import React, { useEffect, useMemo, useState } from 'react';
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
const RIGHT = { rightMax: 6, rightTicks: [0, 2, 4, 6], rightLabel: 'Defects of the piece (count)' };
const X_LABEL = `Suspension No. (1 - ${SUSPENSIONS}) · 1 carrier = ${STRIPS_PER_CARRIER} strips × ${PARTS_PER_STRIP}`;

const pad = (n) => String(n).padStart(2, '0');
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayStart = (s) => new Date(s + 'T00:00:00').getTime();
const dayEnd = (s) => new Date(s + 'T23:59:59.999').getTime();
const fmtT = (t) => new Date(t).toLocaleString('sv-SE');
const defectNames = (m) => {
  const names = DEFECTS.filter((_, i) => hasDefect(m, i));
  return names.length ? `${names.length} defect(s): ${names.join(', ')}` : 'No defect';
};
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

/** One "set" = one visit of a carrier = 3 strips x 20 pieces; shown as one column of charts */
function SetColumn({ rc, visit, index, nonce }) {
  const res = useLoaded(partsUrl(rc, visit.seq), nonce);
  const rows = useMemo(() => carrierRows(res.url ? res.data : []), [res]);
  const sm = summarize(rows);
  const groups = Array.from({ length: STRIPS_PER_CARRIER }, (_, k) => ({
    from: k * PARTS_PER_STRIP,
    to: (k + 1) * PARTS_PER_STRIP,
    label: visit.strips[k] ? stripLabel(visit.strips[k]) : `Strip ${k + 1}`,
  }));
  const tipHead = (i, r) => `Suspension ${i + 1} (strip ${r.strip}, part ${r.part}) · ${fmtT(r.t)}`;
  const partTip = (i) => {
    const r = rows[i];
    return r
      ? [
          tipHead(i, r),
          ...PARAMS.map((p) => `${p.title}: ${r[p.f].toFixed(p.dec)} ${p.unit}`),
          defectNames(r.defect),
        ]
      : [`Suspension ${i + 1}`, 'not made yet'];
  };
  // defect bars: same stacked look as the overview chart; the count axis fits the data (min 2) so the bars stay tall
  const stackMax = Math.max(
    2,
    ...rows.map((r) => (r ? DEFECTS.reduce((n, _, d) => n + hasDefect(r.defect, d), 0) : 0))
  );
  const rightTicks = Array.from({ length: stackMax + 1 }, (_, k) => k);
  const common = {
    n: SUSPENSIONS,
    groups,
    bars: bars(rows),
    xlabel: X_LABEL,
    ...RIGHT,
    rightMax: stackMax,
    rightTicks: stackMax > 6 ? [0, stackMax] : rightTicks,
  };
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
  return (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="set-column">
      <div className="card" style={{ padding: '6px 10px' }}>
        <b>
          Set {index + 1} · {carrierLabel(visit.carrier)} (visit {visit.seq})
        </b>{' '}
        <span style={{ color: 'var(--muted)' }}>
          {clock(visit.start)} · Strips {visit.strips.join(', ')}
          {visit.pieces >= SUSPENSIONS ? '' : ' · in progress'}
        </span>
      </div>
      {res.error && (
        <div className="card" style={{ color: 'var(--red)' }}>
          Cannot load data: {res.error}
        </div>
      )}
      {!res.error && !res.loading && sm.n === 0 && (
        <div className="card" style={{ color: 'var(--muted)' }}>
          No parts yet for this set.
        </div>
      )}
      {PARAMS.map((p) => (
        <PartChart
          key={p.f}
          title={`${p.title} (${p.unit})`}
          right={cur(p.f, p.dec)}
          height={200}
          draw={lineChart(p)}
          tip={partTip}
        />
      ))}
      {VIBS.map((v) => (
        <PartChart
          key={v.title}
          title={v.title}
          right={AXES.map(([a], k) => `${a} ${cur(v.f[k], 2)}`).join('  ')}
          height={200}
          draw={vibChart(v)}
          tip={(i) => {
            const r = rows[i];
            return r
              ? [
                  tipHead(i, r),
                  ...AXES.map(([a], k) => `${a}: ${r[v.f[k]].toFixed(2)} ${v.unit}`),
                  defectNames(r.defect),
                ]
              : [`Suspension ${i + 1}`, 'not made yet'];
          }}
        />
      ))}
      <div className="card" style={{ padding: '6px 10px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>{sm.n} parts inspected</span>
        <span style={{ color: sm.total ? 'var(--red)' : undefined }}>{sm.total} defects found</span>
        <span>
          {sm.defective} defective parts{sm.n ? ` (${((100 * sm.defective) / sm.n).toFixed(0)}%)` : ''}
        </span>
        <span>Top defect code: {sm.top}</span>
      </div>
    </div>
  );
}

export default function ProductivityPage() {
  const today = dayStr(new Date());
  const [dateStart, setDateStart] = useState(today),
    [dateEnd, setDateEnd] = useState(today),
    [pickRc, setPickRc] = useState(null),
    [pickCarrier, setPickCarrier] = useState(null),
    [pickSets, setPickSets] = useState(null); // null = all sets of the carrier, else a list of visit numbers
  const from = dayStart(dateStart),
    to = dayEnd(dateEnd),
    badRange = !(from < to);
  // loaded in steps (date range -> run cards -> carriers of the run card; the pieces are loaded by each set column), each once per selection
  const [nonce, setNonce] = useState(0);
  const step1 = useLoaded(cardsUrl(from, to), nonce);
  const cards = useMemo(() => [...(step1.url ? step1.data : [])].sort((a, b) => a.first - b.first), [step1]);
  const rc = cards.some((c) => c.rc === pickRc) ? pickRc : (cards[cards.length - 1]?.rc ?? null);
  const step2 = useLoaded(carriersUrl(rc), nonce);
  const carriers = useMemo(() => (step2.url ? step2.data : []).filter((c) => c.carrier != null), [step2]);
  const complete = (c) => c.pieces >= SUSPENSIONS;
  const carrierNos = useMemo(() => [...new Set(carriers.map((c) => c.carrier))], [carriers]);
  const defaultVisit = carriers.filter(complete).slice(-1)[0] ?? carriers[carriers.length - 1];
  const carrierNo = carrierNos.includes(pickCarrier) ? pickCarrier : defaultVisit?.carrier;
  // the sets of the selected carrier: every visit of that carrier number in the run card (carrier numbers are reused)
  const sets = carriers.filter((c) => c.carrier === carrierNo);
  const chosen = pickSets ? sets.filter((c) => pickSets.includes(c.seq)) : sets;
  const shown = chosen.length ? chosen : sets;
  const allSets = shown.length === sets.length;
  const toggleSet = (seq) => {
    const cur = shown.map((c) => c.seq);
    const next = cur.includes(seq) ? cur.filter((x) => x !== seq) : [...cur, seq];
    setPickSets(next.length === 0 || next.length === sets.length ? null : next);
  };
  const reload = () => setNonce((n) => n + 1);
  // close the set dropdown when clicking anywhere else or pressing Esc
  useEffect(() => {
    const close = (e) =>
      document.querySelectorAll('details.multi[open]').forEach((d) => {
        if (e.type === 'keydown' ? e.key === 'Escape' : !d.contains(e.target)) d.removeAttribute('open');
      });
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  const card = cards.find((c) => c.rc === rc);
  const err = step1.error || step2.error;

  // run card overview: defects per carrier visit (click a bar to open that carrier's set)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 16 }}>Process parameter &amp; defect monitoring</b>
          <span style={{ flex: 1 }} />
          <Legend />
        </div>
        <div className="pselect-row">
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
              onChange={(e) => (setPickRc(e.target.value), setPickCarrier(null), setPickSets(null))}
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
              value={carrierNo ?? ''}
              onChange={(e) => (setPickCarrier(+e.target.value), setPickSets(null))}
              disabled={!carrierNos.length}
            >
              {carrierNos.map((n) => (
                <option key={n} value={n}>
                  {carrierLabel(n)}
                  {carriers.filter((c) => c.carrier === n).length > 1
                    ? ` · ${carriers.filter((c) => c.carrier === n).length} sets`
                    : ''}
                </option>
              ))}
            </select>
          </label>
          <span className="pfield">
            Strip :
            <details className="multi" role="group" aria-label="Sets of 3 strips">
              <summary className="pill">
                {allSets
                  ? `All ${sets.length} set(s)`
                  : shown.map((c) => `Set ${sets.indexOf(c) + 1}`).join(', ')}
              </summary>
              <div className="multi-list">
                <label>
                  <input
                    type="checkbox"
                    checked={allSets}
                    disabled={!sets.length}
                    onChange={() => setPickSets(null)}
                  />{' '}
                  All
                </label>
                {sets.map((c, k) => (
                  <label key={c.seq} title={`visit ${c.seq}`}>
                    <input
                      type="checkbox"
                      checked={shown.some((x) => x.seq === c.seq)}
                      onChange={() => toggleSet(c.seq)}
                    />{' '}
                    Set {k + 1} · Strips {c.strips.join(', ')} · {clock(c.start)}
                    {complete(c) ? '' : ' (in progress)'}
                  </label>
                ))}
              </div>
            </details>
          </span>
          <button className="pill" onClick={reload} title="Load the latest data from InfluxDB">
            ↻ Refresh
          </button>
        </div>
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
            onPick={(i) => (setPickCarrier(ov[i].carrier), setPickSets([ov[i].seq]))}
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
      {shown.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gap: 8,
              marginTop: 8,
              gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))`,
            }}
          >
            {shown.map((c) => (
              <SetColumn key={rc + '/' + c.seq} rc={rc} visit={c} index={sets.indexOf(c)} nonce={nonce} />
            ))}
          </div>
          <div className="card" style={{ marginTop: 8, padding: '6px 10px', color: 'var(--muted)' }}>
            Run Card {rc} / {carrierLabel(carrierNo)} · {shown.length} of {sets.length} set(s) shown · Data
            from InfluxDB (mddp_part)
            {card
              ? ` · run card ${card.pieces.toLocaleString()} / ${PIECES_PER_RUN_CARD.toLocaleString()} pcs`
              : ''}{' '}
            · press Refresh to load newer pieces
          </div>
        </>
      )}
    </div>
  );
}
