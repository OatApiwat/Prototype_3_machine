import React from 'react';
import { useTick, val, fmt } from './Live.jsx';
const LINE = ['MDDP', 'HMA', 'DTC', 'DTC', 'DTC', 'UVL', 'HPC5L', 'CPM 5L', 'MDDP', 'MDDP', 'MDDP', 'UVL', 'MDDP_184', 'HPC5L', 'CPM 5L', 'HMA', 'CALUL_037', 'HAll_013'];
const LIVE = { MDDP_184: 'mddp', CALUL_037: 'calul', HAll_013: 'hall' };
const INFO = {
  MDDP_184: () => { const p = val('mddp_fast|L', 'p'); return p === null ? 'no data' : 'L pressure ' + fmt(p, 1) + ' kPa'; },
  CALUL_037: () => { const c = val('calul_robot|', 'cycle', true); return c === null ? 'no data' : 'cycle #' + fmt(c, 0); },
  HAll_013: () => { const t = val('hall_oven|', 'temp'); return t === null ? 'no data' : 'oven ' + fmt(t, 1) + ' °C'; }
};
export default function Portal({ go }) {
  useTick(500);
  return (<div><h1>Portal — Kagra, HVM_1010 Line A2202</h1>
    <div className="card portal">{LINE.map((n, i) => LIVE[n]
      ? <div key={i} className="mach live" onClick={() => go(LIVE[n])}>{n}<small>{INFO[n]()}</small></div>
      : <div key={i} className="mach">{n}<small>Not connected</small></div>)}</div></div>);
}
