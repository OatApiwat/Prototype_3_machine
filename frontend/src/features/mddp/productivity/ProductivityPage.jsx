import React, { useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '../../../hooks/usePersistentState.js';
import { cardsUrl, carriersUrl, partsUrl, useLoaded, useLoadedMany } from './useProductivityData.js';
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
const PCT_AXIS = { lo: 0, hi: 100, ticks: [0, 25, 50, 75, 100] };
const RIGHT = { rightMax: 6, rightTicks: [0, 2, 4, 6], rightLabel: 'Defects found (count, by code)' };
const X_LABEL = 'Suspension No.';

const pad = (n) => String(n).padStart(2, '0');
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayStart = (s) => new Date(s + 'T00:00:00').getTime();
const dayEnd = (s) => new Date(s + 'T23:59:59.999').getTime();
const fmtT = (t) => new Date(t).toLocaleString('sv-SE');
const defectNames = (m) => {
  const names = DEFECTS.filter((_, i) => hasDefect(m, i));
  return names.length ? `${names.length} defect(s): ${names.join(', ')}` : '';
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
/** tooltip lines of suspension i for every shown set at once (`linesOf(piece)` = the lines of that chart) */
const peerTip = (peers, i, linesOf) =>
  peers.flatMap((p) => {
    const r = p.rows[i];
    return r
      ? [
          `${p.label} · Suspension ${i + 1} (strip ${r.strip}, part ${r.part}) · ${fmtT(r.t)}`,
          ...linesOf(r, p.rows).filter(Boolean),
        ]
      : [`${p.label} · Suspension ${i + 1}`];
  });

function SetColumn({
  visit,
  index,
  rows,
  hoverI,
  hoverId,
  onHover,
  view,
  onZoom,
  loading,
  error,
  defectMax,
}) {
  const sm = summarize(rows);
  const peers = [{ label: `Set ${index + 1}`, rows }]; // each chart's tooltip describes its own set
  const groups = Array.from({ length: STRIPS_PER_CARRIER }, (_, k) => ({
    from: k * PARTS_PER_STRIP,
    to: (k + 1) * PARTS_PER_STRIP,
    label: visit.strips[k] ? stripLabel(visit.strips[k]) : `Strip ${k + 1}`,
  }));
  const partTip = (i) =>
    peerTip(peers, i, (r) => [
      ...PARAMS.map((p) => `${p.title}: ${r[p.f].toFixed(p.dec)} ${p.unit}`),
      defectNames(r.defect),
    ]);
  const vibTip = (v) => (i) =>
    peerTip(peers, i, (r) => [
      ...AXES.map(([a], k) => `${a}: ${r[v.f[k]].toFixed(2)} ${v.unit}`),
      defectNames(r.defect),
    ]);
  const defectTip = (i) =>
    peerTip(peers, i, (r, all) => {
      const k = Math.floor(i / PARTS_PER_STRIP),
        made = all.slice(k * PARTS_PER_STRIP, (k + 1) * PARTS_PER_STRIP).filter(Boolean),
        bad = made.filter((x) => x.defect > 0).length;
      return [
        defectNames(r.defect),
        `${stripLabel(r.strip_no ?? 0)}: ${bad} of ${made.length} pcs defective (${((100 * bad) / made.length).toFixed(1)}%)`,
      ];
    });
  // defect bars: one defect axis (same 0..N as the overview chart) in every chart, so the same defects look the same everywhere
  const stackMax = Math.max(
    defectMax,
    ...rows.map((r) => (r ? DEFECTS.reduce((n, _, d) => n + hasDefect(r.defect, d), 0) : 0))
  );
  const common = {
    n: SUSPENSIONS,
    view,
    groups,
    bars: bars(rows),
    xlabel: X_LABEL,
    ...RIGHT,
    rightMax: stackMax,
    rightTicks:
      stackMax % 4
        ? Array.from({ length: stackMax + 1 }, (_, k) => k)
        : [0, 1, 2, 3, 4].map((k) => (k * stackMax) / 4),
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
  // red line: % of defective pieces of each strip, as a step over its 20 suspensions
  const stripPct = rows.map((_, i) => {
    const k = Math.floor(i / PARTS_PER_STRIP),
      made = rows.slice(k * PARTS_PER_STRIP, (k + 1) * PARTS_PER_STRIP).filter(Boolean);
    return made.length ? (100 * made.filter((r) => r.defect > 0).length) / made.length : null;
  });
  const cur = (f, dec) => {
    const r = lastOf(rows);
    return r ? r[f].toFixed(dec) : '--';
  };
  return (
    <div className="set-frame" data-testid="set-column">
      <div className="card" style={{ padding: '6px 10px' }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <b>
            Set {index + 1} · {carrierLabel(visit.carrier)} (visit {visit.seq})
          </b>{' '}
          <span style={{ color: 'var(--muted)' }}>
            {clock(visit.start)} · Strips {visit.strips.join(', ')}
            {visit.pieces >= SUSPENSIONS ? '' : ' · in progress'}
          </span>
        </div>
      </div>
      {error && (
        <div className="card" style={{ color: 'var(--red)' }}>
          Cannot load data: {error}
        </div>
      )}
      {!error && !loading && sm.n === 0 && (
        <div className="card" style={{ color: 'var(--muted)' }}>
          No parts yet for this set.
        </div>
      )}
      <PartChart
        id="defect"
        title={`Defective parts — ${carrierLabel(visit.carrier)} (Set ${index + 1})`}
        right={`${sm.n} pcs · ${sm.n ? ((100 * sm.defective) / sm.n).toFixed(1) : 0}% defective`}
        height={200}
        draw={{
          ...common,
          lines: [{ color: '#c0392b', values: stripPct }],
          axis: PCT_AXIS,
          leftFmt: (v) => v + '%',
          ylabel: 'Defective parts (%)',
        }}
        tip={defectTip}
        hoverIndex={hoverI}
        hoverId={hoverId}
        onHover={onHover}
        onZoom={onZoom}
      />
      {PARAMS.map((p) => (
        <PartChart
          key={p.f}
          id={p.f}
          title={`${p.title} (${p.unit})`}
          right={cur(p.f, p.dec)}
          height={200}
          draw={lineChart(p)}
          tip={partTip}
          hoverIndex={hoverI}
          hoverId={hoverId}
          onHover={onHover}
          onZoom={onZoom}
        />
      ))}
      {VIBS.map((v) => (
        <PartChart
          key={v.title}
          id={v.title}
          title={v.title}
          right={AXES.map(([a], k) => `${a} ${cur(v.f[k], 2)}`).join('  ')}
          height={200}
          draw={vibChart(v)}
          tip={vibTip(v)}
          hoverIndex={hoverI}
          hoverId={hoverId}
          onHover={onHover}
          onZoom={onZoom}
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
  // the selections are remembered in localStorage (an unknown run card / carrier / set falls back to the default)
  const [dateStart, setDateStart] = usePersistentState('prod.dateStart', today),
    [dateEnd, setDateEnd] = usePersistentState('prod.dateEnd', today),
    [pickRc, setPickRc] = usePersistentState('prod.rc', null),
    [pickCarrier, setPickCarrier] = usePersistentState('prod.carrier', null),
    [hoverI, setHoverI] = useState(-1),
    [hoverId, setHoverId] = useState(null),
    [zoom, setZoom] = usePersistentState('prod.zoom', null),
    [pickSets, setPickSets] = usePersistentState('prod.sets', null); // null = all sets of the carrier, else a list of visit numbers
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
  // zoom window over the 60 suspensions, shared by every chart; anything invalid falls back to the full range
  const view =
    zoom &&
    Number.isInteger(zoom.from) &&
    Number.isInteger(zoom.to) &&
    zoom.from >= 0 &&
    zoom.to <= SUSPENSIONS &&
    zoom.to - zoom.from >= 2
      ? zoom
      : null;
  const zoomBy = (k) => {
    const from = view ? view.from : 0,
      to = view ? view.to : SUSPENSIONS,
      span = Math.min(SUSPENSIONS, Math.max(6, Math.round((to - from) * k))),
      f = Math.min(SUSPENSIONS - span, Math.max(0, Math.round((from + to - span) / 2)));
    setZoom(span >= SUSPENSIONS ? null : { from: f, to: f + span });
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
  const err = step1.error || step2.error;

  // pieces of the shown sets (loaded once per selection) -> per strip statistics for the carrier chart
  const many = useLoadedMany(
    shown.map((c) => partsUrl(rc, c.seq)),
    nonce
  );
  const rowsOf = shown.map((_, i) => carrierRows(many.data[i] || []));
  // one defect axis (0..N, N a multiple of 4) shared by the carrier chart and every piece chart
  const maxPiece = Math.max(
    0,
    ...rowsOf.flat().map((r) => (r ? DEFECTS.reduce((n, _, d) => n + hasDefect(r.defect, d), 0) : 0))
  );
  const defectMax = Math.ceil(Math.max(4, maxPiece) / 4) * 4;
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
          <b style={{ fontSize: 16 }}>Defect monitoring</b>
          <span style={{ flex: 1 }} />
          <span className="zoombtns">
            <button className="pill" title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(0.7)}>
              +
            </button>
            <button className="pill" title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(1.4)}>
              −
            </button>
            <button className="pill" title="Reset zoom" aria-label="Reset zoom" onClick={() => setZoom(null)}>
              ⟲
            </button>
          </span>
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
            {shown.map((c, i) => (
              <SetColumn
                key={rc + '/' + c.seq}
                visit={c}
                index={sets.indexOf(c)}
                rows={rowsOf[i]}
                hoverI={hoverI}
                hoverId={hoverId}
                onHover={(i, id) => {
                  setHoverI(i);
                  setHoverId(i >= 0 ? id : null);
                }}
                view={view}
                onZoom={setZoom}
                loading={many.loading}
                error={many.error}
                defectMax={defectMax}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
