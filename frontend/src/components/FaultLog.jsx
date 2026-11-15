import React, { useState } from 'react';
import { usePersistentState } from '../hooks/usePersistentState.js';
import { useTick } from '../hooks/useLive.js';
import { nowRender, rowsOf } from '../lib/store.js';

// Fault-code log (legacy "Festo error codes" / "IAI error codes"): rows come from InfluxDB (measurement calul_fault), newest first, 20 per page
const PER = 20,
  pad = (n) => String(n).padStart(2, '0');
const fDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fClock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};
const AXC = { X: 'var(--red)', Y: 'var(--green)', Z: 'var(--blue)' };

export default function FaultLog({ src, title, filters, itemLabel }) {
  useTick(1000);
  const [f, setF] = usePersistentState('faultlog.' + src, -1),
    [page, setPage] = useState(0);
  const t = nowRender();
  const all = rowsOf('calul_fault|' + src).filter((r) => r.t <= t && (f < 0 || r.item === filters[f]));
  const total = all.length,
    act = all.filter((r) => r.t + r.dur * 1000 > t).length;
  const rev = all.slice().reverse(),
    pages = Math.max(1, Math.ceil(rev.length / PER)),
    pg = Math.min(page, pages - 1),
    show = rev.slice(pg * PER, pg * PER + PER);
  const blanks = Math.max(0, 10 - show.length);
  const nCol = src === 'festo' ? 8 : 7;
  return (
    <div className="card t2tbl ferr" style={{ marginTop: 6 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {title}{' '}
        <span style={{ fontWeight: 500, color: 'var(--muted)', marginLeft: 10 }}>
          {total ? `active ${act} · total ${total} since start` : 'no error since start'}
        </span>
        <span className="pchips" style={{ float: 'right' }}>
          {['All', ...filters].map((n, i) => (
            <button
              key={n}
              className={f === i - 1 ? 'on' : ''}
              onClick={() => {
                setF(i - 1);
                setPage(0);
              }}
            >
              {n}
            </button>
          ))}
        </span>
      </div>
      <table className="t">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Time</th>
            <th>{itemLabel}</th>
            <th>Code</th>
            <th className="dsc">Description</th>
            {src === 'festo' && <th>Value</th>}
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {show.length ? (
            show.map((r, i) => {
              const active = r.t + r.dur * 1000 > t,
                end = r.t + r.dur * 1000;
              return (
                <tr key={r.t + r.item + r.code}>
                  <td>{total - pg * PER - i}</td>
                  <td>{fDate(r.t)}</td>
                  <td>{fClock(r.t)}</td>
                  <td className="axc" style={{ color: AXC[r.item] }}>
                    {r.item}
                  </td>
                  <td>{r.code}</td>
                  <td className="dsc">{r.desc}</td>
                  {src === 'festo' && <td>{r.code === 'E201' ? r.val.toFixed(1) + ' °C' : ''}</td>}
                  <td className={active ? 'st-a' : 'st-c'}>
                    {active ? 'Active' : `Cleared ${fDate(end)} ${fClock(end)}`}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={nCol} style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700 }}>
                ✔ No error code{f >= 0 ? ` on ${filters[f]}` : ''}
              </td>
            </tr>
          )}
          {Array.from({ length: blanks }, (_, i) => (
            <tr key={'b' + i}>
              {Array.from({ length: nCol }, (_, j) => (
                <td key={j}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rev.length > PER && (
        <div className="fpg">
          <button className="pill" disabled={pg === 0} onClick={() => setPage(0)}>
            «
          </button>
          <button className="pill" disabled={pg === 0} onClick={() => setPage(pg - 1)}>
            ‹ Prev
          </button>
          <span>
            Page {pg + 1} / {pages} ({pg * PER + 1}–{Math.min(rev.length, (pg + 1) * PER)} of {rev.length})
          </span>
          <button className="pill" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>
            Next ›
          </button>
          <button className="pill" disabled={pg >= pages - 1} onClick={() => setPage(pages - 1)}>
            »
          </button>
        </div>
      )}
    </div>
  );
}
