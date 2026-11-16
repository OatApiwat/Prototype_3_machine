import React from 'react';
import { rowsOf } from '../../lib/store.js';
import { useTick, val } from '../../hooks/useLive.js';
import { PS } from './pointNames.js';

const KEY = 'calul_robot|',
  TOL = 0.1;

/** "Measured at last arrival" table: one row per waypoint */
export default function MeasuredTable() {
  useTick(500);
  const wp = val(KEY, 'wp', true);
  const rows = [];
  for (let i = 1; i <= 10; i++) {
    const a = rowsOf('calul_arrival|P' + i);
    const last = a[a.length - 1];
    let pos = 0,
      ang = 0;
    for (const r of a) {
      pos = Math.max(pos, Math.hypot(r.ex, r.ey, r.ez));
      ang = Math.max(ang, Math.abs(r.ea), Math.abs(r.eb), Math.abs(r.ec));
    }
    const n3 = last ? Math.hypot(last.ex, last.ey, last.ez) : 0,
      good = last && n3 <= TOL && pos <= TOL && ang <= TOL;
    rows.push(
      <tr key={i} style={wp === i - 1 ? { background: 'rgba(249,115,22,.25)' } : undefined}>
        <td>{i}</td>
        <td style={{ textAlign: 'left' }}>{PS[i - 1]}</td>
        {['x', 'y', 'z', 'a', 'b', 'c'].map((f) => (
          <td key={f}>{last ? last[f].toFixed(3) : '–'}</td>
        ))}
        <td>{last ? pos.toFixed(3) : '–'}</td>
        <td>{last ? ang.toFixed(3) : '–'}</td>
        <td className={good ? 'ok' : last ? 'bad' : ''}>{last ? (good ? '✔ OK' : '✘ OUT') : '–'}</td>
      </tr>
    );
  }
  return (
    <table className="t">
      <thead>
        <tr>
          <th>#</th>
          <th>Point</th>
          <th>X</th>
          <th>Y</th>
          <th>Z</th>
          <th>A</th>
          <th>B</th>
          <th>C</th>
          <th>Max Δ mm</th>
          <th>Max Δ °</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
