import React, { useEffect, useRef, useState } from 'react';
import { nowRender, range, ui } from './store.js';
import { css, fit, clock } from './canvasUtil.js';

// Scrolling line graph. series: [{ key, field, color, label }], x axis = real (server) clock, drawn at render time.
export default function Graph({ title, series, ymin, ymax, ticks, unit = '', win, height = 150, dec = 2, refs = [], spcOk = true, dots = false, noTime = false, toggle = false, ownSpc = false, tickFmt = null, valFmt = null, ylabel = null }) {
  const ref = useRef(null), hid = useRef({}), own = useRef(false), [, bump] = useState(0);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return;
      const { g, w, h } = fit(cv); const L = 52, T = 22, R = 8, B = noTime ? 4 : 16, pw = w - L - R, ph = h - T - B;
      const tr = nowRender(), W = win() * 1000, t0 = tr - W;
      g.clearRect(0, 0, w, h); g.font = '12px "Segoe UI",Arial'; g.textBaseline = 'middle';
      g.fillStyle = series.length === 1 || toggle ? series[0].color : css('--text'); g.textAlign = 'left'; g.font = 'bold 13px "Segoe UI",Arial'; g.fillText(title, L, 10); g.font = '12px "Segoe UI",Arial';
      const yl = ylabel ?? unit.trim(); if (yl) { g.save(); g.fillStyle = css('--muted'); g.translate(11, T + ph / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(yl, 0, 0); g.restore(); }
      const y = (v) => T + ph - ((Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * ph;
      g.strokeStyle = css('--grid'); g.fillStyle = css('--muted'); g.textAlign = 'right';
      for (const v of ticks) { const yy = Math.round(y(v)) + 0.5; g.beginPath(); g.moveTo(L, yy); g.lineTo(L + pw, yy); g.stroke(); g.fillText(tickFmt ? tickFmt(v) : String(v), L - 4, yy); }
      g.textAlign = 'center'; if (!noTime) for (let i = 0; i < 4; i++) g.fillText(clock(t0 + (W * (i + 0.5)) / 4), L + (pw * (i + 0.5)) / 4, h - 6);
      g.save(); g.setLineDash([5, 4]); for (const rf of refs) { g.strokeStyle = css(rf.color || '--muted'); g.beginPath(); g.moveTo(L, y(rf.v)); g.lineTo(L + pw, y(rf.v)); g.stroke(); if (rf.label) { g.fillStyle = css(rf.color || '--muted'); g.textAlign = 'right'; g.fillText(rf.label, L + pw, y(rf.v) - 6); } } g.restore();
      let any = false, tx = L + pw; const minX = L + g.measureText(title).width * 1.1 + 14;
      series.forEach((s) => {
        if (hid.current[s.label]) return;
        const rows = range(s.key, t0 - 50, tr); if (!rows.length) return;
        any = true; g.strokeStyle = s.color; g.lineWidth = 1.2; g.beginPath();
        let prev = null;
        for (const r of rows) {
          const v = r[s.field]; if (typeof v !== 'number') continue;
          const x = L + ((r.t - t0) / W) * pw, yy = y(v);
          if (prev === null || r.t - prev > 1500) g.moveTo(x, yy); else g.lineTo(x, yy); prev = r.t;
        }
        g.stroke();
        if (dots) { g.fillStyle = s.color; for (const r of rows) { const v = r[s.field]; if (typeof v === 'number') { g.beginPath(); g.arc(L + ((r.t - t0) / W) * pw, y(v), 2.5, 0, 6.3); g.fill(); } } }
        const last = rows[rows.length - 1][s.field];
        if (tx - (series.length === 1 ? 170 : 70) > minX) { g.fillStyle = s.color; g.textAlign = 'right'; g.fillText(`${series.length === 1 ? clock(ui.hoverT != null ? ui.hoverT : tr) + '  ' : ''}${s.label} ${typeof last === 'number' ? (valFmt ? valFmt(last) : last.toFixed(dec)) : '--'}${unit}`, tx, 10); tx -= series.length > 3 ? 75 : 110; }
      });
      if ((ownSpc ? own.current : ui.spc && spcOk) && series.length) {
        const rows = range(series[0].key, tr - 60000, tr).map((r) => r[series[0].field]).filter((v) => typeof v === 'number');
        if (rows.length > 20) {
          const m = rows.reduce((a, v) => a + v, 0) / rows.length, sd = Math.sqrt(rows.reduce((a, v) => a + (v - m) ** 2, 0) / (rows.length - 1));
          g.save(); g.setLineDash([6, 4]); g.lineWidth = 1;
          [['UCL', m + 3 * sd, '--red'], ['CL', m, '--green'], ['LCL', m - 3 * sd, '--red']].forEach(([lab, v, c]) => { g.strokeStyle = css(c); g.fillStyle = css(c); g.beginPath(); g.moveTo(L, y(v)); g.lineTo(L + pw, y(v)); g.stroke(); g.textAlign = 'left'; g.fillText(`${lab} ${v.toFixed(dec)}`, L + 2, y(v) - 6); });
          g.restore();
          const vis = range(series[0].key, t0, tr); g.fillStyle = css('--red');
          for (const r of vis) { const v = r[series[0].field]; if (typeof v === 'number' && (v > m + 3 * sd || v < m - 3 * sd)) { g.beginPath(); g.arc(L + ((r.t - t0) / W) * pw, y(v), 3, 0, 6.3); g.fill(); } }
        }
      }
      if (!any) { g.fillStyle = css('--muted'); g.textAlign = 'center'; g.fillText('No data', L + pw / 2, T + ph / 2); }
      if (ui.hoverT != null && ui.hoverT >= t0 && ui.hoverT <= tr) {
        const hx = L + ((ui.hoverT - t0) / W) * pw;
        g.strokeStyle = css('--muted'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(hx, T); g.lineTo(hx, T + ph); g.stroke(); g.setLineDash([]);
        const lines = [clock(ui.hoverT)];
        series.forEach((s) => { if (hid.current[s.label]) return; const a = range(s.key, ui.hoverT - 1500, ui.hoverT + 1500); let best = null; for (const r of a) if (typeof r[s.field] === 'number' && (!best || Math.abs(r.t - ui.hoverT) < Math.abs(best.t - ui.hoverT))) best = r; lines.push(`${s.label} ${best ? best[s.field].toFixed(dec) + unit : '--'}`); });
        const tw = Math.max(...lines.map((l) => g.measureText(l).width)) + 12, bx = hx + 8 + tw > L + pw ? hx - 8 - tw : hx + 8;
        g.fillStyle = css('--panel'); g.strokeStyle = css('--line'); g.fillRect(bx, T + 4, tw, lines.length * 14 + 6); g.strokeRect(bx, T + 4, tw, lines.length * 14 + 6);
        g.fillStyle = css('--text'); g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, bx + 6, T + 14 + i * 14));
      }
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [title, series, ymin, ymax, win]);
  const onMove = (e) => { const cv = ref.current, r = cv.getBoundingClientRect(), L = 52, pw = r.width - L - 8, x = e.clientX - r.left; if (x < L || x > L + pw) { ui.hoverT = null; ui.hoverFrozen = null; return; } if (ui.hoverFrozen == null) ui.hoverFrozen = nowRender(); ui.hoverT = nowRender() - win() * 1000 + ((x - L) / pw) * win() * 1000; };
  const lab = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 6 };
  return (<div style={{ position: 'relative' }}>
    <canvas ref={ref} style={{ height }} onMouseMove={onMove} onMouseLeave={() => { ui.hoverT = null; ui.hoverFrozen = null; }} />
    {(toggle || ownSpc) && <div style={{ position: 'absolute', right: 10, top: 22, zIndex: 2, background: 'var(--panel)', borderRadius: 4, padding: '0 2px' }}>
      {toggle && series.map((s) => <label key={s.label} style={{ ...lab, color: s.color }}><input type="checkbox" defaultChecked onChange={(e) => { hid.current[s.label] = !e.target.checked; bump((n) => n + 1); }} />{s.label}</label>)}
      {ownSpc && <label style={{ ...lab, color: 'var(--text)' }}><input type="checkbox" onChange={(e) => { own.current = e.target.checked; bump((n) => n + 1); }} />SPC</label>}
    </div>}
  </div>);
}
