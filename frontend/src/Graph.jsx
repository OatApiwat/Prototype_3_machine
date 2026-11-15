import React, { useEffect, useRef } from 'react';
import { nowRender, range } from './store.js';
import { css, fit, clock } from './canvasUtil.js';

// Scrolling line graph. series: [{ key, field, color, label }], x axis = real (server) clock, drawn at render time.
export default function Graph({ title, series, ymin, ymax, ticks, unit = '', win, height = 150, dec = 2, hoverRef }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return;
      const { g, w, h } = fit(cv); const L = 46, T = 22, R = 8, B = 16, pw = w - L - R, ph = h - T - B;
      const tr = nowRender(), W = win() * 1000, t0 = tr - W;
      g.clearRect(0, 0, w, h); g.font = '12px "Segoe UI",Arial'; g.textBaseline = 'middle';
      g.fillStyle = css('--muted'); g.textAlign = 'left'; g.fillText(title, L, 10);
      const y = (v) => T + ph - ((Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * ph;
      g.strokeStyle = css('--grid'); g.fillStyle = css('--muted'); g.textAlign = 'right';
      for (const v of ticks) { const yy = Math.round(y(v)) + 0.5; g.beginPath(); g.moveTo(L, yy); g.lineTo(L + pw, yy); g.stroke(); g.fillText(String(v), L - 4, yy); }
      g.textAlign = 'center'; g.fillText(clock(t0 + W), L + pw - 40, h - 6); g.fillText(clock(t0), L + 40, h - 6);
      let any = false, tx = L + pw;
      series.forEach((s) => {
        const rows = range(s.key, t0 - 50, tr); if (!rows.length) return;
        any = true; g.strokeStyle = s.color; g.lineWidth = 1.2; g.beginPath();
        let prev = null;
        for (const r of rows) {
          const v = r[s.field]; if (typeof v !== 'number') continue;
          const x = L + ((r.t - t0) / W) * pw, yy = y(v);
          if (prev === null || r.t - prev > 1500) g.moveTo(x, yy); else g.lineTo(x, yy); prev = r.t;
        }
        g.stroke();
        const last = rows[rows.length - 1][s.field];
        g.fillStyle = s.color; g.textAlign = 'right'; g.fillText(`${s.label} ${typeof last === 'number' ? last.toFixed(dec) : '--'}${unit}`, tx, 10); tx -= 110;
      });
      if (!any) { g.fillStyle = css('--muted'); g.textAlign = 'center'; g.fillText('No data', L + pw / 2, T + ph / 2); }
      if (hoverRef && hoverRef.x != null && hoverRef.x >= L && hoverRef.x <= L + pw) {
        g.strokeStyle = css('--muted'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(hoverRef.x, T); g.lineTo(hoverRef.x, T + ph); g.stroke(); g.setLineDash([]);
      }
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [title, series, ymin, ymax, win]);
  return <canvas ref={ref} style={{ height }} />;
}
