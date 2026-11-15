import React from 'react';
const LINE = ['MDDP', 'HMA', 'DTC', 'DTC', 'DTC', 'UVL', 'HPC5L', 'CPM 5L', 'MDDP', 'MDDP', 'MDDP', 'UVL', 'MDDP_184', 'HPC5L', 'CPM 5L', 'HMA', 'CALUL_037', 'HAll_013'];
const LIVE = { MDDP_184: 'mddp', CALUL_037: 'calul', HAll_013: 'hall' };
export default function Portal({ go }) {
  return (<div><h1>Portal — Kagra, HVM_1010 Line A2202</h1>
    <div className="card portal">{LINE.map((n, i) => LIVE[n]
      ? <div key={i} className="mach live" onClick={() => go(LIVE[n])}>{n}<small>open</small></div>
      : <div key={i} className="mach">{n}<small>Not connected</small></div>)}</div></div>);
}
