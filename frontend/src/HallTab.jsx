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

export default function HallTab() {
  const [win, setWin] = useState(() => +(localStorage.getItem('hall.win') || 60));
  const winRef = useRef(win); winRef.current = win; const getWin = useMemo(() => () => winRef.current, []);
  useEffect(() => { localStorage.setItem('hall.win', win); }, [win]);
  useTick(1000);
  const c = (n) => theme(n), K = 'hall_oven|';
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2) => <div className="card"><Graph title={title} series={series.map(([f, col, lab]) => ({ key: K, field: f, color: c(col), label: lab }))} ymin={ymin} ymax={ymax} ticks={ticks} unit={unit} dec={dec} win={getWin} /></div>;
  const trays = keysWith('hall_tray|').map((k) => ({ k: k.split('|')[1], x: sample(k, 'x', nowRender()) })).filter((o) => o.x !== null && Math.abs(o.x) <= XOV).sort((a, b) => a.x - b.x);
  return (
    <div>
      <h1>HAll_013 — convection oven</h1>
      <div className="toolbar"><span>Window {Math.round(win)} s</span><button className="pill" onClick={() => setWin((w) => Math.max(5, w / 1.5))}>＋</button><button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>－</button></div>
      <div className="card"><Oven /></div>
      <div className="stats"><Stat label="Oven temp" k={K} f="temp" d={1} unit="°C" /><Stat label="Heater duty" k={K} f="duty" d={0} unit="%" /><Stat label="Blower" k={K} f="rpm" d={0} unit="rpm" /><Stat label="Conveyor" k={K} f="conv" d={2} unit="mm/s" /><Stat label="Blower motor temp" k={K} f="blower_temp" d={1} unit="°C" /><div className="stat"><span>Trays in oven</span><b>{trays.length}</b></div></div>
      <div className="grid2">
        {G('Oven temperature (°C)', [['temp', '--red', 'T']], 156, 164, [156, 158, 160, 162, 164], ' °C', 2)}
        {G('Blower speed (rpm)', [['rpm', '--blue', 'rpm']], 1445, 1455, [1445, 1450, 1455], ' rpm', 1)}
        {G('Heater duty (%)', [['duty', '--amber', 'duty']], 0, 100, [0, 50, 100], ' %', 0)}
        {G('Blower vibration X Y Z (mm/s RMS)', [['vx', '--red', 'X'], ['vy', '--green', 'Y'], ['vz', '--blue', 'Z']], 0, 2, [0, 0.5, 1, 1.5, 2], '', 3)}
        {G('Blower motor temperature (°C)', [['blower_temp', '--cyan', 'T']], 55, 75, [55, 60, 65, 70, 75], ' °C', 1)}
        {G('Conveyor speed (mm/s)', [['conv', '--green', 'v']], 22.5, 23.3, [22.6, 22.9, 23.2], ' mm/s', 3)}
      </div>
      <div className="card"><table className="t"><thead><tr><th>Tray</th><th>Position (mm)</th></tr></thead><tbody>{trays.map((o) => <tr key={o.k}><td>#{o.k}</td><td>{o.x.toFixed(0)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
