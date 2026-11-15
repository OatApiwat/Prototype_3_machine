import React, { useEffect, useRef } from 'react';
import { nowRender, sample, keysWith } from '../../lib/store.js';
import { fit } from '../../lib/canvasUtil.js';
import { theme } from '../../hooks/useLive.js';
import { XOV, GLUE0, GLUE1, mix } from './hallScene.js';

// 2D side view: port of the legacy drawing (geometry only); every value (temperature, duty, roller/blower angle, tray positions) is read from InfluxDB
const VW = 1000,
  VH = 215,
  KS = 0.62,
  PXM = 0.158,
  X0 = 500,
  TRAY_L = 230,
  NCAR = 12;
const px = (x) => X0 + x * PXM,
  OVX0 = px(-XOV),
  OVX1 = px(XOV),
  OVY0 = 120,
  OVY1 = 354,
  BELTY = 360,
  TRH = 20;
const LOOPS = [];
[-1, 1].forEach((sd) =>
  [0, 26].forEach((off) => {
    const ex = sd < 0 ? OVX0 + 26 + off * 0.4 : OVX1 - 26 - off * 0.4,
      bx = px(0) + sd * (8 + off * 0.3);
    LOOPS.push([
      [bx, 262],
      [bx, 270 + off * 0.5],
      [ex, 270 + off * 0.5],
      [ex, 332 - off * 0.5],
      [bx, 332 - off * 0.5],
      [bx, 262],
    ]);
  })
);
function chip(g, txt, x, y, bg, fg, align) {
  g.font = '700 19px "Segoe UI", Arial, sans-serif';
  const w = g.measureText(txt).width + 16,
    l = align === 'c' ? x - w / 2 : x;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(l, y - 16, w, 32, 5);
  g.fill();
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillText(txt, l + 8, y + 1);
}
/** 2D side view: oven, blower, heater and trays (port of the legacy drawing; values come from InfluxDB) */
export default function SideView() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current;
      if (!cv || !cv.clientWidth) return;
      cv.style.height = VH + 'px';
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const t = nowRender(),
        K = 'hall_oven|';
      const T = sample(K, 'temp', t);
      if (T === null) {
        g.fillStyle = theme('--muted');
        g.textAlign = 'center';
        g.font = '16px sans-serif';
        g.fillText('No data', w / 2, h / 2);
        return;
      }
      const duty = sample(K, 'duty', t) ?? 50,
        roll = sample(K, 'roll', t) ?? 0,
        ang = sample(K, 'ang', t) ?? 0,
        tt = ang / 7; // tt: animation clock derived from the stored blower angle
      g.save();
      g.translate((w * (1 - KS)) / 2, (-84 * KS * h) / VH);
      g.scale((w / VW) * KS, (h / VH) * KS);
      const hot = Math.max(0, Math.min(1, (T - 100) / 60));
      g.fillStyle = '#fff';
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2;
      g.fillRect(OVX0, OVY0, OVX1 - OVX0, OVY1 - OVY0);
      g.strokeRect(OVX0, OVY0, OVX1 - OVX0, OVY1 - OVY0);
      g.fillStyle = `rgba(255,170,110,${0.18 + 0.22 * hot})`;
      g.fillRect(OVX0 + 1, 240, OVX1 - OVX0 - 2, OVY1 - 240 - 1);
      g.fillStyle = '#334155';
      g.font = '800 22px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      g.fillText('Oven ' + T.toFixed(1) + ' °C', OVX0 + 12, OVY0 + 22);
      g.save();
      g.beginPath();
      g.rect(OVX0 + 2, 241, OVX1 - OVX0 - 4, OVY1 - 242);
      g.clip();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const L of LOOPS) {
        g.beginPath();
        L.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
        g.setLineDash([22, 26]);
        g.lineDashOffset = -tt * 40;
        g.strokeStyle = `rgba(239,68,68,${0.22 + 0.3 * hot})`;
        g.lineWidth = 4;
        g.stroke();
      }
      g.setLineDash([]);
      for (let jx = -1650; jx <= 1650; jx += 330)
        for (let jj = 0; jj < 2; jj++) {
          const ph = (((tt * 0.5 + jx * 0.0013 + jj * 0.5) % 1) + 1) % 1,
            ya = 274 + ph * 40;
          g.strokeStyle = `rgba(239,68,68,${0.5 * Math.sin(ph * Math.PI) * (0.5 + 0.5 * hot)})`;
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(px(jx) + (jj ? 5 : -5), ya);
          g.lineTo(px(jx) + (jj ? 5 : -5), ya + 18);
          g.stroke();
        }
      for (let sh = 0; sh < 3; sh++) {
        g.beginPath();
        for (let sx = OVX0 + 4; sx <= OVX1 - 4; sx += 6) {
          const sy = 296 + sh * 14 + 3 * Math.sin(sx * 0.07 + tt * 2.2 + sh * 1.7);
          if (sx === OVX0 + 4) g.moveTo(sx, sy);
          else g.lineTo(sx, sy);
        }
        g.strokeStyle = `rgba(234,88,12,${0.1 + 0.14 * hot})`;
        g.lineWidth = 2;
        g.stroke();
      }
      g.restore();
      const hg = Math.round(120 + duty * 1.2);
      g.fillStyle = `rgb(${Math.min(255, hg + 80)},${Math.round(90 - duty * 0.5)},20)`;
      g.fillRect(px(-330), 250, px(330) - px(-330), 9);
      g.fillStyle = '#ea580c';
      g.fillRect(px(-30), 259, 18, 26);
      g.fillStyle = '#9a3412';
      g.fillRect(px(-30) + 6, 259, 6, 40);
      g.fillStyle = '#1d4ed8';
      g.fillRect(px(-260), 190, px(260) - px(-260), 60);
      g.save();
      g.translate(px(0), 220);
      g.strokeStyle = '#bfdbfe';
      g.lineWidth = 3;
      for (let b = 0; b < 4; b++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, 22);
        g.stroke();
      }
      g.restore();
      g.save();
      g.translate(px(0), 220);
      g.rotate(ang);
      g.strokeStyle = '#dbeafe';
      g.lineWidth = 3;
      for (let b = 0; b < 4; b++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 6);
        g.lineTo(0, 22);
        g.stroke();
      }
      g.restore();
      g.fillStyle = '#334155';
      g.fillRect(px(0) - 3, 170, 6, 20);
      g.fillRect(px(0) - 3, 166, 6, 6);
      g.fillStyle = '#1d4ed8';
      g.fillRect(px(700), OVY0 + 24, 90, 50);
      g.fillStyle = '#334155';
      g.fillRect(px(0), 168, px(700) - px(0), 3);
      g.fillStyle = '#0ea5e9';
      g.fillRect(px(700) + 90, OVY0 + 34, 14, 14);
      g.fillStyle = '#bfdbfe';
      g.font = '700 19px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillText('Motor', px(700) + 45, OVY0 + 52);
      g.strokeStyle = '#581c87';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(px(-2900), BELTY + 22);
      g.lineTo(px(2900), BELTY + 22);
      g.stroke();
      for (let x = -2800; x <= 2800; x += 120) {
        const cx = px(x),
          r = 8;
        g.fillStyle = '#9333ea';
        g.beginPath();
        g.arc(cx, BELTY + 8, r, 0, 6.3);
        g.fill();
        g.strokeStyle = '#f3e8ff';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(cx, BELTY + 8);
        g.lineTo(cx + Math.cos(roll + x) * (r - 1), BELTY + 8 + Math.sin(roll + x) * (r - 1));
        g.stroke();
      }
      const trays = keysWith('hall_tray|')
        .map((key) => ({ k: +key.split('|')[1], x: sample(key, 'x', t) }))
        .filter((o) => o.x !== null)
        .sort((a, b) => b.k - a.k);
      for (const { k, x: x2 } of trays) {
        const prog = Math.max(0, Math.min(1, (XOV - x2) / (2 * XOV))),
          wd = TRAY_L * PXM,
          cx2 = px(x2),
          y0 = BELTY - TRH + 2 - 8,
          col = mix(GLUE0, GLUE1, prog);
        for (let r = NCAR - 1; r >= 0; r--) {
          const ox = r * 0.9,
            oy = -r * 1.0;
          g.fillStyle = '#374151';
          g.fillRect(cx2 - wd / 2 + ox, y0 + oy, wd, TRH);
          g.fillStyle = col;
          g.fillRect(cx2 - wd / 2 + ox + 1.5, y0 + oy + 3, wd - 3, TRH - 6);
          g.strokeStyle = 'rgba(15,23,42,.45)';
          g.lineWidth = 0.6;
          g.strokeRect(cx2 - wd / 2 + ox, y0 + oy, wd, TRH);
        }
        g.fillStyle = '#0f172a';
        g.font = '700 19px "Segoe UI", Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'alphabetic';
        g.fillText('#' + (k + 1), cx2 + 5, y0 - 18);
      }
      const ln = (x1, y1, x2, y2) => {
        g.strokeStyle = '#1e40af';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      };
      chip(g, 'Blower', px(-440), 168, '#1d4ed8', '#fff', 'c');
      ln(px(-440) + 30, 170, px(-100), 205);
      chip(g, 'Blower Motor', px(700) + 45, OVY0 - 12, '#1d4ed8', '#fff', 'c');
      ln(px(700) + 45, OVY0, px(700) + 45, OVY0 + 24);
      chip(g, 'Vibration sensor', px(700) + 120, OVY0 + 100, '#0ea5e9', '#fff', 'c');
      ln(px(700) + 97, OVY0 + 88, px(700) + 97, OVY0 + 48);
      chip(g, 'Plate Heater', px(-1250), 254, '#c2410c', '#fff', 'c');
      ln(px(-1250) + 50, 254, px(-330), 254);
      chip(g, 'Thermometer', px(-1250), 292, '#ea580c', '#fff', 'c');
      ln(px(-1250) + 55, 292, px(-30), 280);
      chip(g, 'Conveyor', px(-1300), 406, '#7e22ce', '#fff', 'c');
      chip(g, 'IN \u2190  (from CALUL)', px(2550), 406, '#dbeafe', '#1e3a8a', 'c');
      chip(g, '\u2190 OUT', px(-2650), 406, '#dbeafe', '#1e3a8a', 'c');
      g.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}
