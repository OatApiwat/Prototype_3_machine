import React, { useEffect, useRef } from 'react';
import { nowRender, sample, keysWith } from '../../lib/store.js';
import { fit } from '../../lib/canvasUtil.js';
import { theme } from '../../hooks/useLive.js';
import { XOV, GLUE0, GLUE1, mix } from './hallScene.js';

/** Top view of the oven, trays and conveyor */
export default function TopView() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const TW = 1000,
      TH = 112,
      TPX = 0.098,
      TX0 = 500,
      TY0 = 58,
      p = (x) => TX0 + x * TPX;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current;
      if (!cv || !cv.clientWidth) return;
      cv.style.height = TH + 'px';
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const t = nowRender(),
        K = 'hall_oven|';
      const T = sample(K, 'temp', t);
      if (T === null) return;
      const ang = sample(K, 'ang', t) ?? 0,
        tt = ang / 7;
      g.save();
      g.scale(w / TW, h / TH);
      const hot = Math.max(0, Math.min(1, (T - 100) / 60)),
        hw = 500 * TPX;
      g.fillStyle = '#e2e8f0';
      g.fillRect(p(-2900), TY0 - 41, 5800 * TPX, 82);
      g.strokeStyle = '#9333ea';
      g.lineWidth = 2;
      for (let x = -2800; x <= 2800; x += 120) {
        g.beginPath();
        g.moveTo(p(x), TY0 - 39);
        g.lineTo(p(x), TY0 + 39);
        g.stroke();
      }
      g.strokeStyle = '#581c87';
      g.lineWidth = 2;
      g.strokeRect(p(-2900), TY0 - 41, 5800 * TPX, 82);
      g.fillStyle = `rgba(255,170,110,${0.12 + 0.18 * hot})`;
      g.fillRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 2 * hw);
      for (let dx = -1750; dx <= 1750; dx += 250)
        for (let dz = 0; dz < 2; dz++) {
          const ph2 = (((tt * 0.5 + dx * 0.002 + dz * 0.5) % 1) + 1) % 1,
            yy = TY0 + (dz ? 1 : -1) * (14 + ph2 * (hw - 18));
          g.strokeStyle = `rgba(239,68,68,${0.35 * Math.sin(ph2 * Math.PI)})`;
          g.lineWidth = 2;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(p(dx), yy);
          g.lineTo(p(dx), yy + (dz ? 7 : -7));
          g.stroke();
        }
      for (const key of keysWith('hall_tray|')) {
        const x2 = sample(key, 'x', t);
        if (x2 === null) continue;
        const prog = Math.max(0, Math.min(1, (XOV - x2) / (2 * XOV))),
          wd = (230 - 20) * TPX,
          ht = 740 * TPX,
          cx = p(x2),
          rh = ht / 12,
          col = mix(GLUE0, GLUE1, prog);
        g.fillStyle = '#374151';
        g.fillRect(cx - wd / 2 - 1.5, TY0 - ht / 2 - 1.5, wd + 3, ht + 3);
        g.fillStyle = col;
        for (let c = 0; c < 12; c++)
          g.fillRect(cx - wd / 2 + 1.5, TY0 - ht / 2 + c * rh + rh * 0.2, wd - 3, rh * 0.6);
      }
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2.5;
      g.strokeRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 2 * hw);
      g.fillStyle = 'rgba(30,41,59,.14)';
      g.fillRect(p(-XOV), TY0 - hw, 2 * XOV * TPX, 8);
      g.fillRect(p(-XOV), TY0 + hw - 8, 2 * XOV * TPX, 8);
      g.fillStyle = '#c2410c';
      g.fillRect(p(-330), TY0 - 24, 660 * TPX, 48);
      g.globalAlpha = 0.9;
      g.fillStyle = '#1d4ed8';
      g.beginPath();
      g.arc(p(0), TY0, 16, 0, 6.3);
      g.fill();
      g.globalAlpha = 1;
      g.save();
      g.translate(p(0), TY0);
      g.rotate(ang);
      g.strokeStyle = '#dbeafe';
      g.lineWidth = 2;
      for (let b = 0; b < 4; b++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 3);
        g.lineTo(0, 13);
        g.stroke();
      }
      g.restore();
      g.fillStyle = '#1d4ed8';
      g.beginPath();
      g.arc(p(700) + 20, TY0 - 32, 10, 0, 6.3);
      g.fill();
      g.strokeStyle = '#334155';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(p(0), TY0 - 16);
      g.lineTo(p(700) + 20, TY0 - 32);
      g.stroke();
      g.font = '700 11px "Segoe UI", Arial, sans-serif';
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      const tag = (s, x, y, bg) => {
        const wd = g.measureText(s).width + 10;
        g.fillStyle = bg;
        g.fillRect(x, y - 8, wd, 16);
        g.fillStyle = '#fff';
        g.fillText(s, x + 5, y);
      };
      tag('Blower', p(0) - 62, TY0 - 36, '#1d4ed8');
      tag('Motor', p(700) + 34, TY0 - 32, '#1d4ed8');
      tag('Heater', p(-330), TY0 + 34, '#c2410c');
      g.fillStyle = theme('--text');
      g.font = '800 12px "Segoe UI", Arial, sans-serif';
      g.fillText('Top view', 6, 12);
      g.fillStyle = '#2563eb';
      g.fillText('\u2190 OUT', 6, TH - 8);
      g.textAlign = 'right';
      g.fillText('IN \u2190', TW - 6, TH - 8);
      g.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
} // drawing extents (mm) of the oven picture
