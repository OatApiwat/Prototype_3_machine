import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { Stat, useTick, theme, SpcBox } from './Live.jsx';
import { nowRender, sample, keysWith, rowsOf } from './store.js';
import { fit } from './canvasUtil.js';
import Hall3D from './Hall3D.jsx';

const XS = 2650, XOV = 1900, SETPT = 160;

function TopView() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const TW = 1000, TH = 112, TPX = 0.098, TX0 = 500, TY0 = 58, p = (x) => TX0 + x * TPX;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = TH + 'px';
      const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h); const t = nowRender(), K = 'hall_oven|';
      const T = sample(K, 'temp', t); if (T === null) return;
      const ang = sample(K, 'ang', t) ?? 0, tt = ang / 7;
      g.save(); g.scale(w / TW, h / TH);
      const hot = Math.max(0, Math.min(1, (T - 100) / 60)), hw = 500 * TPX;
      g.fillStyle = '#e2e8f0'; g.fillRect(p(-2900), TY0 - 41, 5800 * TPX, 82);
      g.strokeStyle = '#9333ea'; g.lineWidth = 2; for (let x = -2800; x <= 2800; x += 120) { g.beginPath(); g.moveTo(p(x), TY0 - 39); g.lineTo(p(x), TY0 + 39); g.stroke(); }
      g.strokeStyle = '#581c87'; g.lineWidth = 2; g.strokeRect(p(-2900), TY0 - 41, 5800 * TPX, 82);
      g.fillStyle = `rgba(255,170,110,${0.12 + 0.18 * hot})`; g.fillRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 2 * hw);
      for (let dx = -1750; dx <= 1750; dx += 250) for (let dz = 0; dz < 2; dz++) { const ph2 = (((tt * 0.5 + dx * 0.002 + dz * 0.5) % 1) + 1) % 1, yy = TY0 + (dz ? 1 : -1) * (14 + ph2 * (hw - 18)); g.strokeStyle = `rgba(239,68,68,${0.35 * Math.sin(ph2 * Math.PI)})`; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(p(dx), yy); g.lineTo(p(dx), yy + (dz ? 7 : -7)); g.stroke(); }
      for (const key of keysWith('hall_tray|')) {
        const x2 = sample(key, 'x', t); if (x2 === null) continue;
        const prog = Math.max(0, Math.min(1, (XOV - x2) / (2 * XOV))), wd = (230 - 20) * TPX, ht = 740 * TPX, cx = p(x2), rh = ht / 12, col = mix(GLUE0, GLUE1, prog);
        g.fillStyle = '#374151'; g.fillRect(cx - wd / 2 - 1.5, TY0 - ht / 2 - 1.5, wd + 3, ht + 3);
        g.fillStyle = col; for (let c = 0; c < 12; c++) g.fillRect(cx - wd / 2 + 1.5, TY0 - ht / 2 + c * rh + rh * 0.2, wd - 3, rh * 0.6);
      }
      g.strokeStyle = '#1e293b'; g.lineWidth = 2.5; g.strokeRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 2 * hw);
      g.fillStyle = 'rgba(30,41,59,.14)'; g.fillRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 8); g.fillRect(p(-XOV), TY0 + hw - 8, 2 * XOV * TPX, 8);
      g.fillStyle = '#c2410c'; g.fillRect(p(-330), TY0 - 24, 660 * TPX, 48); g.globalAlpha = 0.9; g.fillStyle = '#1d4ed8'; g.beginPath(); g.arc(p(0), TY0, 16, 0, 6.3); g.fill(); g.globalAlpha = 1;
      g.save(); g.translate(p(0), TY0); g.rotate(ang); g.strokeStyle = '#dbeafe'; g.lineWidth = 2; for (let b = 0; b < 4; b++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 3); g.lineTo(0, 13); g.stroke(); } g.restore();
      g.fillStyle = '#1d4ed8'; g.beginPath(); g.arc(p(700) + 20, TY0 - 32, 10, 0, 6.3); g.fill(); g.strokeStyle = '#334155'; g.lineWidth = 2; g.beginPath(); g.moveTo(p(0), TY0 - 16); g.lineTo(p(700) + 20, TY0 - 32); g.stroke();
      g.font = '700 11px "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      const tag = (s, x, y, bg) => { const wd = g.measureText(s).width + 10; g.fillStyle = bg; g.fillRect(x, y - 8, wd, 16); g.fillStyle = '#fff'; g.fillText(s, x + 5, y); };
      tag('Blower', p(0) - 62, TY0 - 36, '#1d4ed8'); tag('Motor', p(700) + 34, TY0 - 32, '#1d4ed8'); tag('Heater', p(-330), TY0 + 34, '#c2410c');
      g.fillStyle = theme('--text'); g.font = '800 12px "Segoe UI", Arial, sans-serif'; g.fillText('Top view', 6, 12);
      g.fillStyle = '#2563eb'; g.fillText('\u2190 OUT', 6, TH - 8); g.textAlign = 'right'; g.fillText('IN \u2190', TW - 6, TH - 8);
      g.restore();
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}   // drawing extents (mm) of the oven picture

// 2D side view: port of the legacy drawing (geometry only); every value (temperature, duty, roller/blower angle, tray positions) is read from InfluxDB
const VW = 1000, VH = 215, KS = 0.62, PXM = 0.158, X0 = 500, TRAY_L = 230, NCAR = 12;
const GLUE0 = [134, 239, 172], GLUE1 = [21, 128, 61];
const px = (x) => X0 + x * PXM, OVX0 = px(-XOV), OVX1 = px(XOV), OVY0 = 120, OVY1 = 354, BELTY = 360, TRH = 20;
const mix = (a, b, u) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`;
const LOOPS = [];
[-1, 1].forEach((sd) => [0, 26].forEach((off) => { const ex = sd < 0 ? OVX0 + 26 + off * 0.4 : OVX1 - 26 - off * 0.4, bx = px(0) + sd * (8 + off * 0.3); LOOPS.push([[bx, 262], [bx, 270 + off * 0.5], [ex, 270 + off * 0.5], [ex, 332 - off * 0.5], [bx, 332 - off * 0.5], [bx, 262]]); }));
function chip(g, txt, x, y, bg, fg, align) { g.font = '700 19px "Segoe UI", Arial, sans-serif'; const w = g.measureText(txt).width + 16, l = align === 'c' ? x - w / 2 : x; g.fillStyle = bg; g.beginPath(); g.roundRect(l, y - 16, w, 32, 5); g.fill(); g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(txt, l + 8, y + 1); }
function Oven() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = VH + 'px';
      const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h); const t = nowRender(), K = 'hall_oven|';
      const T = sample(K, 'temp', t);
      if (T === null) { g.fillStyle = theme('--muted'); g.textAlign = 'center'; g.font = '16px sans-serif'; g.fillText('No data', w / 2, h / 2); return; }
      const duty = sample(K, 'duty', t) ?? 50, roll = sample(K, 'roll', t) ?? 0, ang = sample(K, 'ang', t) ?? 0, tt = ang / 7;   // tt: animation clock derived from the stored blower angle
      g.save(); g.translate(w * (1 - KS) / 2, -84 * KS * h / VH); g.scale(w / VW * KS, h / VH * KS);
      const hot = Math.max(0, Math.min(1, (T - 100) / 60));
      g.fillStyle = '#fff'; g.strokeStyle = '#1e293b'; g.lineWidth = 2; g.fillRect(OVX0, OVY0, OVX1 - OVX0, OVY1 - OVY0); g.strokeRect(OVX0, OVY0, OVX1 - OVX0, OVY1 - OVY0);
      g.fillStyle = `rgba(255,170,110,${0.18 + 0.22 * hot})`; g.fillRect(OVX0 + 1, 240, OVX1 - OVX0 - 2, OVY1 - 240 - 1);
      g.fillStyle = '#334155'; g.font = '800 22px "Segoe UI", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Oven ' + T.toFixed(1) + ' °C', OVX0 + 12, OVY0 + 22);
      g.save(); g.beginPath(); g.rect(OVX0 + 2, 241, OVX1 - OVX0 - 4, OVY1 - 242); g.clip();
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const L of LOOPS) { g.beginPath(); L.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.setLineDash([22, 26]); g.lineDashOffset = -tt * 40; g.strokeStyle = `rgba(239,68,68,${0.22 + 0.3 * hot})`; g.lineWidth = 4; g.stroke(); }
      g.setLineDash([]);
      for (let jx = -1650; jx <= 1650; jx += 330) for (let jj = 0; jj < 2; jj++) { const ph = (((tt * 0.5 + jx * 0.0013 + jj * 0.5) % 1) + 1) % 1, ya = 274 + ph * 40; g.strokeStyle = `rgba(239,68,68,${0.5 * Math.sin(ph * Math.PI) * (0.5 + 0.5 * hot)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(px(jx) + (jj ? 5 : -5), ya); g.lineTo(px(jx) + (jj ? 5 : -5), ya + 18); g.stroke(); }
      for (let sh = 0; sh < 3; sh++) { g.beginPath(); for (let sx = OVX0 + 4; sx <= OVX1 - 4; sx += 6) { const sy = 296 + sh * 14 + 3 * Math.sin(sx * 0.07 + tt * 2.2 + sh * 1.7); if (sx === OVX0 + 4) g.moveTo(sx, sy); else g.lineTo(sx, sy); } g.strokeStyle = `rgba(234,88,12,${0.10 + 0.14 * hot})`; g.lineWidth = 2; g.stroke(); }
      g.restore();
      const hg = Math.round(120 + duty * 1.2); g.fillStyle = `rgb(${Math.min(255, hg + 80)},${Math.round(90 - duty * 0.5)},20)`; g.fillRect(px(-330), 250, px(330) - px(-330), 9);
      g.fillStyle = '#ea580c'; g.fillRect(px(-30), 259, 18, 26); g.fillStyle = '#9a3412'; g.fillRect(px(-30) + 6, 259, 6, 40);
      g.fillStyle = '#1d4ed8'; g.fillRect(px(-260), 190, px(260) - px(-260), 60);
      g.save(); g.translate(px(0), 220); g.strokeStyle = '#bfdbfe'; g.lineWidth = 3; for (let b = 0; b < 4; b++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.stroke(); } g.restore();
      g.save(); g.translate(px(0), 220); g.rotate(ang); g.strokeStyle = '#dbeafe'; g.lineWidth = 3; for (let b = 0; b < 4; b++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 22); g.stroke(); } g.restore();
      g.fillStyle = '#334155'; g.fillRect(px(0) - 3, 170, 6, 20); g.fillRect(px(0) - 3, 166, 6, 6);
      g.fillStyle = '#1d4ed8'; g.fillRect(px(700), OVY0 + 24, 90, 50); g.fillStyle = '#334155'; g.fillRect(px(0), 168, px(700) - px(0), 3);
      g.fillStyle = '#0ea5e9'; g.fillRect(px(700) + 90, OVY0 + 34, 14, 14);
      g.fillStyle = '#bfdbfe'; g.font = '700 19px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('Motor', px(700) + 45, OVY0 + 52);
      g.strokeStyle = '#581c87'; g.lineWidth = 3; g.beginPath(); g.moveTo(px(-2900), BELTY + 22); g.lineTo(px(2900), BELTY + 22); g.stroke();
      for (let x = -2800; x <= 2800; x += 120) { const cx = px(x), r = 8; g.fillStyle = '#9333ea'; g.beginPath(); g.arc(cx, BELTY + 8, r, 0, 6.3); g.fill(); g.strokeStyle = '#f3e8ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, BELTY + 8); g.lineTo(cx + Math.cos(roll + x) * (r - 1), BELTY + 8 + Math.sin(roll + x) * (r - 1)); g.stroke(); }
      const trays = keysWith('hall_tray|').map((key) => ({ k: +key.split('|')[1], x: sample(key, 'x', t) })).filter((o) => o.x !== null).sort((a, b) => b.k - a.k);
      for (const { k, x: x2 } of trays) {
        const prog = Math.max(0, Math.min(1, (XOV - x2) / (2 * XOV))), wd = TRAY_L * PXM, cx2 = px(x2), y0 = BELTY - TRH + 2 - 8, col = mix(GLUE0, GLUE1, prog);
        for (let r = NCAR - 1; r >= 0; r--) { const ox = r * 0.9, oy = -r * 1.0; g.fillStyle = '#374151'; g.fillRect(cx2 - wd / 2 + ox, y0 + oy, wd, TRH); g.fillStyle = col; g.fillRect(cx2 - wd / 2 + ox + 1.5, y0 + oy + 3, wd - 3, TRH - 6); g.strokeStyle = 'rgba(15,23,42,.45)'; g.lineWidth = 0.6; g.strokeRect(cx2 - wd / 2 + ox, y0 + oy, wd, TRH); }
        g.fillStyle = '#0f172a'; g.font = '700 19px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('#' + (k + 1), cx2 + 5, y0 - 18);
      }
      const ln = (x1, y1, x2, y2) => { g.strokeStyle = '#1e40af'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
      chip(g, 'Blower', px(-440), 168, '#1d4ed8', '#fff', 'c'); ln(px(-440) + 30, 170, px(-100), 205);
      chip(g, 'Blower Motor', px(700) + 45, OVY0 - 12, '#1d4ed8', '#fff', 'c'); ln(px(700) + 45, OVY0, px(700) + 45, OVY0 + 24);
      chip(g, 'Vibration sensor', px(700) + 120, OVY0 + 100, '#0ea5e9', '#fff', 'c'); ln(px(700) + 97, OVY0 + 88, px(700) + 97, OVY0 + 48);
      chip(g, 'Plate Heater', px(-1250), 254, '#c2410c', '#fff', 'c'); ln(px(-1250) + 50, 254, px(-330), 254);
      chip(g, 'Thermometer', px(-1250), 292, '#ea580c', '#fff', 'c'); ln(px(-1250) + 55, 292, px(-30), 280);
      chip(g, 'Conveyor', px(-1300), 406, '#7e22ce', '#fff', 'c');
      chip(g, 'IN \u2190  (from CALUL)', px(2550), 406, '#dbeafe', '#1e3a8a', 'c');
      chip(g, '\u2190 OUT', px(-2650), 406, '#dbeafe', '#1e3a8a', 'c');
      g.restore();
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
  const cure = rowsOf('hall_cure|'), lastCure = [...cure].reverse().find((r) => r.t <= t), setS = (lastCure && lastCure.set_s) || 165.94;
  const v = (f, d = 2) => { const x = sample(K, f, t); return typeof x === 'number' ? x.toFixed(d) : '--'; };
  const P = [['Oven Temperature setting', SETPT + ' °C'], ['Oven Temperature actual', v('temp', 1) + ' °C'], ['Oven Curing Time (last tray out)', mmss(lastCure && lastCure.cure_s) + ' min:s'], ['Oven Curing Time (set)', mmss(lastCure && lastCure.set_s) + ' min:s'], ['Blower Speed', v('rpm', 0) + ' rpm'], ['Blower Vibration X / Y / Z', v('vx', 2) + ' / ' + v('vy', 2) + ' / ' + v('vz', 2) + ' mm/s'], ['Conveyor Speed', v('conv', 2) + ' mm/s'], ['Blower Temperature', v('blower_temp', 1) + ' °C'], ['Trays in oven', String(trays.length)]];
  return (
    <div>
      <div className="topgrid3">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 10, top: 8, zIndex: 5 }} className="seg"><button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>2D</button><button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>3D</button></div>
          {mode === '3d'
            ? <div className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}><div className="ovtitle">HAll_013 &nbsp;<span>Convection oven — 3D view</span></div><Hall3D /></div>
            : <div style={{ display: 'grid', gridTemplateRows: '215px 112px', gap: 8 }}><div className="card" style={{ position: 'relative', padding: 0, margin: 0, overflow: 'hidden', boxSizing: 'border-box' }}><div className="ovtitle">HAll_013 &nbsp;<span>Convection oven — side view</span></div><Oven /></div><div className="card" style={{ padding: 0, margin: 0, overflow: 'hidden', boxSizing: 'border-box' }}><TopView /></div></div>}
        </div>
        <div className="card"><div style={{ fontWeight: 700, marginBottom: 4 }}>Oven parameters</div><table className="t"><tbody>{P.map(([n, x]) => <tr key={n}><td>{n}</td><td><b>{x}</b></td></tr>)}</tbody></table></div>
      </div>
      <div className="dock">
        <span>Graph zoom <button className="pill" onClick={() => setWin((w) => Math.min(120, w * 1.5))}>−</button> <button className="pill" onClick={() => setWin((w) => Math.max(5, w / 1.5))}>+</button> {win >= 60 ? (win / 60).toFixed(1) + ' min' : Math.round(win) + ' s'}</span>
        <span className="legend"><span>Trays come from CALUL (12 Carriers per tray) → IN → oven → OUT</span><span><i className="sw" style={{ background: '#86efac' }} />uncured → <i className="sw" style={{ background: '#15803d' }} />cured</span></span>
      </div>
      <div className="kframe halll"><span className="kh">HAll</span><SpcBox className="kspc" />
        <div className="g3">
          {G('Oven temperature actual / setting', [['temp', '--red', '']], 154, 164, [154, 156, 158, 160, 162, 164], ' °C', 2, { refs: [{ v: SETPT, label: 'setting 160', color: '--muted' }] })}
          {G('Blower speed', [['rpm', '--blue', '']], 1445, 1455, [1445, 1447, 1449, 1451, 1453, 1455], ' rpm', 0)}
          {G('Conveyor speed', [['conv', '--green', '']], 22.7, 23.1, [22.7, 22.8, 22.9, 23.0, 23.1], ' mm/s', 2)}
          <div className="card" style={{ padding: 2 }}>{[['vx', 'X', '--red', 0.8, 1.6, [0.8, 1.2, 1.6]], ['vy', 'Y', '--green', 0.6, 1.2, [0.6, 0.9, 1.2]], ['vz', 'Z', '--blue', 0.4, 0.9, [0.4, 0.65, 0.9]]].map(([f, a, col, lo, hi, tk]) => <Graph key={f} title={a === 'X' ? 'Blower vibration X axis' : a + ' axis'} series={[{ key: K, field: f, color: c(col), label: a }]} ymin={lo} ymax={hi} ticks={tk} unit=" mm/s" dec={3} win={getWin} height={82} noTime={f !== 'vz'} />)}</div>
          {G('Blower temperature', [['blower_temp', '--amber', '']], 58, 68, [58, 60, 62, 64, 66, 68], ' °C', 0, {}, K, 250)}
          {G('Oven curing time (one point per tray out)', [['cure_s', '--green', '']], 160, 172, [160, 163, 166, 169, 172], ' min:s', 1, { dots: true, tickFmt: (v) => mmss(v), valFmt: (v) => mmss(v), refs: [{ v: setS + 3, label: '+3 s', color: '--red' }, { v: setS, label: 'set ' + mmss(setS), color: '--muted' }, { v: setS - 3, label: '−3 s', color: '--red' }] }, 'hall_cure|', 250)}
        </div>
      </div>
    </div>
  );
}
