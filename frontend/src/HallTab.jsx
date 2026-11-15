import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { Stat, useTick, theme } from './Live.jsx';
import { nowRender, sample, keysWith, rowsOf } from './store.js';
import { fit } from './canvasUtil.js';
import Hall3D from './Hall3D.jsx';

const XS = 2650, XOV = 1900, SETPT = 160;

function TopView() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = '112px';
      const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h); const t = nowRender(), X = (x) => w / 2 + (x / (XS + 300)) * (w / 2 - 10);
      const T = sample('hall_oven|', 'temp', t); g.fillStyle = theme('--muted'); g.font = '12px "Segoe UI"'; g.textAlign = 'left'; g.fillText('Top view', 8, 14);
      g.fillStyle = theme('--grid'); g.fillRect(X(-XS - 300), h * 0.3, X(XS + 300) - X(-XS - 300), h * 0.45);
      if (T !== null) { const hot = Math.max(0, Math.min(1, (T - 100) / 60)); g.fillStyle = `rgba(239,68,68,${0.12 + 0.25 * hot})`; g.fillRect(X(-XOV), h * 0.18, X(XOV) - X(-XOV), h * 0.68); g.strokeStyle = '#ef4444'; g.strokeRect(X(-XOV), h * 0.18, X(XOV) - X(-XOV), h * 0.68); }
      for (const key of keysWith('hall_tray|')) { const x = sample(key, 'x', t); if (x === null) continue; g.fillStyle = Math.abs(x) <= XOV ? theme('--amber') : theme('--green'); g.fillRect(X(x) - 14, h * 0.36, 28, h * 0.33); }
      g.fillStyle = theme('--text'); g.textAlign = 'center'; g.fillText('OUT', X(-XS - 150), 28); g.fillText('IN', X(XS + 150), 28);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}   // drawing extents (mm) of the oven picture

function Oven() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = '215px';
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
  const [mode, setMode] = useState(() => localStorage.getItem('hall.mode') || '2d');
  useEffect(() => { localStorage.setItem('hall.mode', mode); }, [mode]);
  useTick(1000);
  const c = (n) => theme(n), K = 'hall_oven|', t = nowRender();
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2, extra = {}, key = K, h = 170) => <div className="card"><Graph title={title} series={series.map(([f, col, lab]) => ({ key, field: f, color: c(col), label: lab }))} ymin={ymin} ymax={ymax} ticks={ticks} unit={unit} dec={dec} win={getWin} height={h} {...extra} /></div>;
  const trays = keysWith('hall_tray|').map((k) => ({ k: k.split('|')[1], x: sample(k, 'x', t) })).filter((o) => o.x !== null && Math.abs(o.x) <= XOV);
  const cure = rowsOf('hall_cure|'), lastCure = [...cure].reverse().find((r) => r.t <= t);
  const v = (f, d = 2) => { const x = sample(K, f, t); return typeof x === 'number' ? x.toFixed(d) : '--'; };
  const P = [['Oven Temperature setting', SETPT + ' °C'], ['Oven Temperature actual', v('temp', 1) + ' °C'], ['Oven Curing Time (last tray out)', mmss(lastCure && lastCure.cure_s) + ' min:s'], ['Oven Curing Time (set)', mmss(lastCure && lastCure.set_s) + ' min:s'], ['Blower Speed', v('rpm', 0) + ' rpm'], ['Blower Vibration X', v('vx', 3) + ' mm/s'], ['Blower Vibration Y', v('vy', 3) + ' mm/s'], ['Blower Vibration Z', v('vz', 3) + ' mm/s'], ['Conveyor Speed', v('conv', 2) + ' mm/s'], ['Blower Temperature', v('blower_temp', 1) + ' °C'], ['Trays in oven', String(trays.length)]];
  return (
    <div>
      <div className="topgrid3">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 10, top: 8, zIndex: 5 }} className="seg"><button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>2D</button><button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>3D</button></div>
          {mode === '3d'
            ? <div className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}><div className="ovtitle">HAll_013 &nbsp;<span>Convection oven — 3D view</span></div><Hall3D /></div>
            : <div style={{ display: 'grid', gridTemplateRows: '215px 112px', gap: 8 }}><div className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}><div className="ovtitle">HAll_013 &nbsp;<span>Convection oven — side view</span></div><Oven /></div><div className="card" style={{ padding: 0, overflow: 'hidden' }}><TopView /></div></div>}
        </div>
        <div className="card"><div style={{ fontWeight: 700, marginBottom: 4 }}>Oven parameters</div><table className="t"><tbody>{P.map(([n, x]) => <tr key={n}><td>{n}</td><td><b>{x}</b></td></tr>)}</tbody></table></div>
      </div>
      <div className="dock">
        <span>Graph zoom <button className="pill" onClick={() => setWin((w) => Math.min(120, w * 1.5))}>−</button> <button className="pill" onClick={() => setWin((w) => Math.max(5, w / 1.5))}>+</button> {win >= 60 ? (win / 60).toFixed(1) + ' min' : Math.round(win) + ' s'}</span>
        <span className="legend"><span>Trays come from CALUL (12 Carriers per tray) → IN → oven → OUT</span><span><i className="sw" style={{ background: '#86efac' }} />uncured → <i className="sw" style={{ background: '#15803d' }} />cured</span></span>
      </div>
      <div className="kframe halll"><span className="kh">HAll</span>
        <div className="g3">
          {G('Oven temperature actual / setting', [['temp', '--red', 'T']], 154, 164, [156, 160, 164], ' °C', 2, { refs: [{ v: SETPT, label: 'setting 160', color: '--muted' }] })}
          {G('Blower speed', [['rpm', '--blue', 'rpm']], 1445, 1455, [1445, 1450, 1455], ' rpm', 1)}
          {G('Conveyor speed', [['conv', '--green', 'v']], 22.7, 23.1, [22.7, 22.9, 23.1], ' mm/s', 3)}
          <div className="card" style={{ padding: 2 }}>{[['vx', 'X', '--red', 0.8, 1.6, [0.8, 1.2, 1.6]], ['vy', 'Y', '--green', 0.6, 1.2, [0.6, 0.9, 1.2]], ['vz', 'Z', '--blue', 0.4, 0.9, [0.4, 0.65, 0.9]]].map(([f, a, col, lo, hi, tk]) => <Graph key={f} title={'Blower vibration ' + a} series={[{ key: K, field: f, color: c(col), label: a }]} ymin={lo} ymax={hi} ticks={tk} unit=" mm/s" dec={3} win={getWin} height={82} noTime={f !== 'vz'} />)}</div>
          {G('Blower temperature', [['blower_temp', '--amber', 'T']], 58, 68, [58, 63, 68], ' °C', 1, {}, K, 250)}
          {G('Oven curing time (one point per tray out)', [['cure_s', '--green', 'cure']], 160, 172, [160, 166, 172], ' s', 1, { dots: true, refs: [{ v: 165.94, label: 'set', color: '--muted' }] }, 'hall_cure|', 250)}
        </div>
      </div>
    </div>
  );
}
