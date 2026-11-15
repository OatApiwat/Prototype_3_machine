import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { Stat, useTick, theme } from './Live.jsx';
import { nowRender, sample, keysWith, rowsOf } from './store.js';
import { fit } from './canvasUtil.js';

const XS = 2650, XOV = 1900, SETPT = 160;   // drawing extents (mm) of the oven picture

function Oven() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = Math.round(cv.clientWidth * 0.3) + 'px';
      const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h); const t = nowRender();
      const T = sample('hall_oven|', 'temp', t), X = (x) => w / 2 + (x / (XS + 300)) * (w / 2 - 10), by = h * 0.7;
      if (T === null) { g.fillStyle = theme('--muted'); g.textAlign = 'center'; g.font = '16px sans-serif'; g.fillText('No data', w / 2, h / 2); return; }
      const hot = Math.max(0, Math.min(1, (T - 100) / 60));
      g.fillStyle = `rgb(${Math.round(120 + 120 * hot)},${Math.round(130 - 60 * hot)},${Math.round(130 - 80 * hot)})`; g.fillRect(X(-XOV - 40), h * 0.12, X(XOV + 40) - X(-XOV - 40), by - h * 0.12);
      g.fillStyle = theme('--panel'); g.fillRect(X(-XOV), h * 0.2, X(XOV) - X(-XOV), by - h * 0.2 - 4);
      g.fillStyle = theme('--text'); g.font = 'bold 15px "Segoe UI"'; g.textAlign = 'center'; g.fillText(`Oven ${T.toFixed(1)} °C (set ${SETPT})`, X(0), h * 0.17);
      g.fillStyle = theme('--muted'); g.fillRect(X(-XS - 300), by, X(XS + 300) - X(-XS - 300), 6);
      for (const key of keysWith('hall_tray|')) {
        const x = sample(key, 'x', t); if (x === null) continue;
        const inside = Math.abs(x) <= XOV; g.fillStyle = inside ? theme('--amber') : theme('--green'); g.fillRect(X(x) - 18, by - 24, 36, 22);
        g.fillStyle = '#111'; g.font = '10px sans-serif'; g.fillText('#' + key.split('|')[1], X(x), by - 10);
      }
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}

const mmss = (s) => (typeof s === 'number' ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '--');

export default function HallTab() {
  const [win, setWin] = useState(() => +(localStorage.getItem('hall.win') || 120));
  const winRef = useRef(win); winRef.current = win; const getWin = useMemo(() => () => winRef.current, []);
  useEffect(() => { localStorage.setItem('hall.win', win); }, [win]);
  useTick(1000);
  const c = (n) => theme(n), K = 'hall_oven|', t = nowRender();
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2, extra = {}, key = K, h = 150) => <div className="card"><Graph title={title} series={series.map(([f, col, lab]) => ({ key, field: f, color: c(col), label: lab }))} ymin={ymin} ymax={ymax} ticks={ticks} unit={unit} dec={dec} win={getWin} height={h} {...extra} /></div>;
  const trays = keysWith('hall_tray|').map((k) => ({ k: k.split('|')[1], x: sample(k, 'x', t) })).filter((o) => o.x !== null && Math.abs(o.x) <= XOV).sort((a, b) => a.x - b.x);
  const cure = rowsOf('hall_cure|'), lastCure = [...cure].reverse().find((r) => r.t <= t);
  const v = (f, d = 2) => { const x = sample(K, f, t); return typeof x === 'number' ? x.toFixed(d) : '--'; };
  const P = [['Oven temperature setting', SETPT + ' °C'], ['Oven temperature actual', v('temp', 1) + ' °C'], ['Curing time (last tray out)', mmss(lastCure && lastCure.cure_s)], ['Curing time (set)', mmss(lastCure && lastCure.set_s)], ['Blower speed', v('rpm', 0) + ' rpm'], ['Blower vibration X / Y / Z', `${v('vx')} / ${v('vy')} / ${v('vz')} mm/s`], ['Conveyor speed', v('conv', 2) + ' mm/s'], ['Blower temperature', v('blower_temp', 1) + ' °C'], ['Heater duty', v('duty', 0) + ' %'], ['Trays in oven', String(trays.length)]];
  return (
    <div>
      <h1>HAll_013 — convection oven</h1>
      <div className="toolbar"><span>Window {win >= 60 ? (win / 60).toFixed(1) + ' min' : Math.round(win) + ' s'}</span><button className="pill" onClick={() => setWin((w) => Math.max(5, w / 1.5))}>＋</button><button className="pill" onClick={() => setWin((w) => Math.min(120, w * 1.5))}>－</button></div>
      <div className="card"><Oven /></div>
      <div className="grid2">
        <div className="card"><div style={{ fontWeight: 700, marginBottom: 4 }}>Oven parameters</div><table className="t"><tbody>{P.map(([n, x]) => <tr key={n}><td>{n}</td><td>{x}</td></tr>)}</tbody></table></div>
        <div className="card"><div style={{ fontWeight: 700, marginBottom: 4 }}>Trays on the belt (12 carriers per tray, from CALUL_037)</div><table className="t"><thead><tr><th>Tray</th><th>Position (mm)</th></tr></thead><tbody>{trays.map((o) => <tr key={o.k}><td>#{o.k}</td><td>{o.x.toFixed(0)}</td></tr>)}</tbody></table></div>
        {G('Oven temperature actual / setting (°C)', [['temp', '--red', 'T']], 154, 164, [154, 157, 160, 163], ' °C', 2, { refs: [{ v: SETPT, label: 'setting 160', color: '--muted' }] })}
        {G('Blower speed (rpm)', [['rpm', '--blue', 'rpm']], 1445, 1455, [1445, 1450, 1455], ' rpm', 1)}
        {G('Conveyor speed (mm/s)', [['conv', '--green', 'v']], 22.7, 23.1, [22.7, 22.9, 23.1], ' mm/s', 3)}
        {G('Blower temperature (°C)', [['blower_temp', '--cyan', 'T']], 58, 68, [58, 63, 68], ' °C', 1)}
        {G('Heater duty (%)', [['duty', '--amber', 'duty']], 0, 100, [0, 50, 100], ' %', 0)}
        {G('Oven curing time per tray (s)', [['cure_s', '--green', 'cure']], 162, 170, [162, 164, 166, 168, 170], ' s', 1, { dots: true, refs: [{ v: 165.94, label: 'set', color: '--muted' }] }, 'hall_cure|')}
      </div>
      <div className="card">{[['vx', 'X', '--red'], ['vy', 'Y', '--green'], ['vz', 'Z', '--blue']].map(([f, a, col]) => <div key={f}>{G('Blower vibration ' + a + ' (mm/s RMS)', [[f, col, a]], f === 'vx' ? 0.8 : f === 'vy' ? 0.6 : 0.4, f === 'vx' ? 1.6 : f === 'vy' ? 1.2 : 0.9, f === 'vx' ? [0.8, 1.2, 1.6] : f === 'vy' ? [0.6, 0.9, 1.2] : [0.4, 0.6, 0.9], ' mm/s', 3, {}, K, 110)}</div>)}</div>
      <div className="nodata" style={{ padding: 6 }}>Trays come from CALUL_037 (12 carriers per tray) → IN → oven → OUT. Amber = in oven (curing), green = on the belt.</div>
    </div>
  );
}
