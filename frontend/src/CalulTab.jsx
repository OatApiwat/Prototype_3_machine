import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { Stat, useTick, val, fmt, theme } from './Live.jsx';
import { nowRender, sample, rowsOf } from './store.js';
import { fit } from './canvasUtil.js';
import Calul3D from './Calul3D.jsx';

const KEY = 'calul_robot|', TOL = 0.10;
const PN = ['Home', 'Above buffer', 'Pick Front + Back', 'Lift (loaded)', 'Transfer via-point', 'Above tray', 'Place Front (to HAll)', 'Place Back (to HAll)', 'Lift (empty)', 'Return via-point'];
const J = ['j1', 'j2', 'j3', 'j4', 'j5'];

// robot skeleton from the joint positions stored in InfluxDB (no kinematics in the browser)
function Robot({ mode }) {
  const ref = useRef(null), cam = useRef({ az: 35, drag: null });
  const modeRef = useRef(mode); modeRef.current = mode;
  useEffect(() => {
    const cv = ref.current;
    const down = (e) => { cam.current.drag = { x: e.clientX, az: cam.current.az }; };
    const move = (e) => { const d = cam.current.drag; if (d) cam.current.az = d.az - (e.clientX - d.x) * 0.5; };
    const up = () => { cam.current.drag = null; };
    cv.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!cv.clientWidth) return; cv.style.height = Math.round(cv.clientWidth * 0.45) + 'px';
      const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h);
      const t = nowRender(), K = 'calul_robot|';
      const P = [[0, 0, 0]];
      for (const j of J) { const x = sample(K, j + 'x', t), y = sample(K, j + 'y', t), z = sample(K, j + 'z', t); if (x === null) { g.fillStyle = theme('--muted'); g.textAlign = 'center'; g.font = '16px sans-serif'; g.fillText('No data', w / 2, h / 2); return; } P.push([x, y, z]); }
      const az = (modeRef.current === '3d' ? cam.current.az : 0) * Math.PI / 180, ca = Math.cos(az), sa = Math.sin(az), el = modeRef.current === '3d' ? 0.5 : 0;
      const proj = (p) => { const x = p[0] * ca - p[1] * sa, d = p[0] * sa + p[1] * ca; return [x, -(p[2] * Math.cos(el) - d * Math.sin(el))]; };
      const S = Math.min(w / 1500, h / 1000), ox = w / 2 - 350 * S, oy = h - 60;
      const pt = (p) => { const q = proj(p); return [ox + q[0] * S, oy + q[1] * S]; };
      g.strokeStyle = theme('--line'); g.lineWidth = 1; for (let i = -400; i <= 1200; i += 200) { const a = pt([i, -600, 0]), b = pt([i, 600, 0]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      for (let i = -600; i <= 600; i += 200) { const a = pt([-400, i, 0]), b = pt([1200, i, 0]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      g.strokeStyle = '#ea580c'; g.lineCap = 'round';
      for (let i = 1; i < P.length; i++) { const a = pt(P[i - 1]), b = pt(P[i]); g.lineWidth = 16 - i * 1.6; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      P.forEach((p, i) => { const a = pt(p); g.fillStyle = '#1f2937'; g.beginPath(); g.arc(a[0], a[1], 5, 0, 6.3); g.fill(); });
      const vf = sample('calul_vac|', 'front', t) ?? 0, vb = sample('calul_vac|', 'back', t) ?? 0, tcp = pt(P[5]);
      g.fillStyle = vf < -50 ? '#22c55e' : '#94a3b8'; g.fillRect(tcp[0] - 16, tcp[1] + 4, 14, 8);
      g.fillStyle = vb < -50 ? '#22c55e' : '#94a3b8'; g.fillRect(tcp[0] + 2, tcp[1] + 4, 14, 8);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener('mousedown', down); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);
  return <canvas ref={ref} style={{ cursor: mode === '3d' ? 'grab' : 'default' }} />;
}

function Arrivals() {
  useTick(500);
  const wp = val(KEY, 'wp', true);
  const rows = [];
  for (let i = 1; i <= 10; i++) {
    const a = rowsOf('calul_arrival|P' + i); const last = a[a.length - 1];
    let pos = 0, ang = 0; for (const r of a) { pos = Math.max(pos, Math.hypot(r.ex, r.ey, r.ez)); ang = Math.max(ang, Math.abs(r.ea), Math.abs(r.eb), Math.abs(r.ec)); }
    const n3 = last ? Math.hypot(last.ex, last.ey, last.ez) : 0, good = last && n3 <= TOL && pos <= TOL && ang <= TOL;
    rows.push(<tr key={i} style={wp === i - 1 ? { background: 'rgba(249,115,22,.25)' } : undefined}><td>P{i} {PN[i - 1]}</td><td>{last ? last.cycle : '–'}</td>{['x', 'y', 'z', 'a', 'b', 'c'].map((f) => <td key={f}>{last ? last[f].toFixed(3) : '–'}</td>)}<td>{last ? pos.toFixed(3) : '–'}</td><td>{last ? ang.toFixed(3) : '–'}</td><td className={good ? 'ok' : last ? 'bad' : ''}>{last ? (good ? '✔ OK' : '✘ OUT') : '–'}</td></tr>);
  }
  return <table className="t"><thead><tr><th>Point (measured at last arrival)</th><th>Cycle</th><th>X</th><th>Y</th><th>Z</th><th>A</th><th>B</th><th>C</th><th>max pos dev</th><th>max ang dev</th><th>Check (±{TOL})</th></tr></thead><tbody>{rows}</tbody></table>;
}

function FestoErr() {
  useTick(1000);
  const pts = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'], ax = ['X', 'Y', 'Z'];
  return (<div><div style={{ fontWeight: 700, marginBottom: 4 }}>Festo positioning error per axis at last arrival (mm)</div>
    <table className="t"><thead><tr><th>Point</th>{ax.map((a) => <th key={a}>Error {a}</th>)}<th>Max |error|</th></tr></thead><tbody>
      {pts.map((p) => { const last = ax.map((a) => { const r = rowsOf(`calul_festo_err|${a}/${p}`); return r.length ? r[r.length - 1].err : null; }); const mx = Math.max(...last.map((v) => (v === null ? 0 : Math.abs(v)))); return <tr key={p}><td>{p}</td>{last.map((v, i) => <td key={i}>{v === null ? '–' : v.toFixed(4)}</td>)}<td>{mx.toFixed(4)}</td></tr>; })}
    </tbody></table></div>);
}

export default function CalulTab() {
  const [win, setWin] = useState(() => +(localStorage.getItem('calul.win') || 20));
  const [mode, setMode] = useState(() => localStorage.getItem('calul.mode') || '3d');
  const winRef = useRef(win); winRef.current = win; const getWin = useMemo(() => () => winRef.current, []);
  useEffect(() => { localStorage.setItem('calul.win', win); localStorage.setItem('calul.mode', mode); }, [win, mode]);
  useTick(500);
  const c = (n) => theme(n);
  const wpv = val(KEY, 'wp', true), atv = val(KEY, 'at', true), cyc = val(KEY, 'cycle', true), vfv = val('calul_vac|', 'front'), vbv = val('calul_vac|', 'back');
  const status = wpv === null ? 'No data' : `${atv >= 0 ? 'At P' + (atv + 1) + '  ' + PN[atv] : 'Moving to P' + (wpv + 1) + '  ' + PN[wpv]}   |   Front vacuum ${vfv < -50 ? 'ON' : 'off'}   Back vacuum ${vbv < -50 ? 'ON' : 'off'}   |   Cycle ${cyc}`;
  const life = val(KEY, 'life'), d = life ? Math.floor(life / 86400) : null, rem = life ? life - d * 86400 : 0;  // used life time = 730.5 d at start + running time
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2, key = KEY, extra = {}) => <div className="card"><Graph {...extra} title={title} series={series.map(([f, col, lab]) => ({ key, field: f, color: c(col), label: lab }))} ymin={ymin} ymax={ymax} ticks={ticks} unit={unit} dec={dec} win={getWin} /></div>;
  return (
    <div>
      <h1>CALUL_037 — KUKA KR 6 R900-2 HO</h1>
      <div className="toolbar"><span className="seg"><button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>2D</button><button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>3D</button></span>
        <span>Window {Math.round(win)} s</span><button className="pill" onClick={() => setWin((w) => Math.max(1, w / 1.5))}>＋</button><button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>－</button></div>
      <div className="card"><div style={{ fontWeight: 700, padding: '2px 4px 6px' }}>{status}</div>{mode === '3d' ? <Calul3D /> : <Robot mode="2d" />}</div>
      <div className="stats">
        <Stat label="Cycle" k={KEY} f="cycle" d={0} step /><Stat label="Front vacuum" k="calul_vac|" f="front" d={1} unit="kPa" /><Stat label="Back vacuum" k="calul_vac|" f="back" d={1} unit="kPa" />
        <div className="stat"><span>Buffer (from MDDP_184)</span><b>{(val("calul_flow|", "ready", true) ?? 0) >= 1e5 ? "queue available" : fmt(val("calul_flow|", "ready", true), 0)}</b></div><Stat label="Picked cycles" k="calul_flow|" f="picked" d={0} step /><Stat label="Sent to HAll" k="calul_flow|" f="sent" d={0} step />
        <div className="stat"><span>Robot used life time</span><b>{d === null ? '--' : `${d} d ${String(Math.floor(rem / 3600)).padStart(2, '0')} h ${String(Math.floor((rem % 3600) / 60)).padStart(2, '0')} min ${String(Math.floor(rem % 60)).padStart(2, '0')} s`}</b><small>2 years in service at start</small></div>
      </div>
      <div className="card"><Arrivals /></div>
      <div className="grid2">
        {G('TCP position (mm)', [['x', '--red', 'X'], ['y', '--green', 'Y'], ['z', '--blue', 'Z']], -400, 900, [-300, 0, 300, 600, 900], ' mm')}
        {G('TCP orientation A B C (°)', [['a', '--red', 'A'], ['b', '--green', 'B'], ['c', '--blue', 'C']], -10, 370, [0, 90, 180, 270, 360], '°', 1)}
        {G('Joint temperature J1-J6 (°C)', [1, 2, 3, 4, 5, 6].map((i) => ['t' + i, ['--red', '--amber', '--green', '--cyan', '--blue', '--muted'][i - 1], 'J' + i]), 30, 60, [30, 40, 50, 60], '', 1)}
        {G('Position deviation X Y Z (mm)', [['dx', '--red', 'dX'], ['dy', '--green', 'dY'], ['dz', '--blue', 'dZ']], -0.1, 0.1, [-0.1, -0.05, 0, 0.05, 0.1], '', 3)}
        {G('Orientation deviation A B C (°)', [['da', '--red', 'dA'], ['db', '--green', 'dB'], ['dc', '--blue', 'dC']], -0.1, 0.1, [-0.1, -0.05, 0, 0.05, 0.1], '', 3)}
        {G('Pickup vacuum Front / Back (kPa)', [['front', '--blue', 'Front'], ['back', '--cyan', 'Back']], -120, 10, [-100, -50, 0], '', 1, 'calul_vac|', { refs: [{ v: -80, label: 'alarm -80', color: '--red' }] })}
      </div>
      <h2>FESTO gantry</h2>
      <div className="grid3">{['X', 'Y', 'Z'].map((a, i) => <div className="card" key={a}><Graph title={`Temperature ${a} axis (°C)`} series={[{ key: 'calul_festo|' + a, field: 'temp', color: c(['--red', '--green', '--blue'][i]), label: a }]} ymin={20} ymax={60} ticks={[20, 30, 40, 50, 60]} unit=" °C" dec={1} win={getWin} /></div>)}</div>
      <div className="card"><FestoErr /></div>
    </div>
  );
}
