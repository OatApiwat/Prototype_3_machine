import { css } from '../../../lib/canvasUtil.js';
import { DEFECT_COLORS, DEFECTS, PARTS_PER_STRIP, popcount } from './defects.js';

const L = 56,
  R = 64,
  T = 8,
  B = 36;

/** geometry shared by the drawing and the mouse hit test */
export const plotBox = (w, h, n) => ({ x: L, y: T, w: w - L - R, h: h - T - B, n, slot: (w - L - R) / n });
/** visible window [from, to) of the n categories (zoom); the whole range by default */
export const viewOf = (view, n) => ({ from: view ? view.from : 0, to: view ? view.to : n });
export const slotAt = (px, w, n, view) => {
  const { from, to } = viewOf(view, n),
    s = (w - L - R) / (to - from),
    i = from + Math.floor((px - L) / s);
  return px >= L && i >= from && i < to ? i : -1;
};
/** x (relative to the plot's left edge, as a 0..1 fraction) of the centre of category i */
export const fracOf = (i, n, view) => {
  const { from, to } = viewOf(view, n);
  return (i - from + 0.5) / (to - from);
};

/**
 * Category chart: x = parts (or suspensions), lines on the left axis, stacked defect bars on the right axis.
 * o = { lines: [{label,color,values:[number|null]}], bars: [[count per category] per defect type] | null,
 *       axis: {lo,hi,ticks}, ylabel, xlabel, n, rightMax, rightTicks, rightLabel, rightFmt, hover }
 */
export function drawPartChart(g, w, h, o) {
  const { n } = o,
    { from: v0, to: v1 } = viewOf(o.view, n),
    P = plotBox(w, h, v1 - v0),
    txt = css('--text'),
    mu = css('--muted'),
    line = css('--line');
  g.clearRect(0, 0, w, h);
  g.font = '11px "Segoe UI", Arial, sans-serif';
  const yL = (v) => P.y + P.h - ((v - o.axis.lo) / (o.axis.hi - o.axis.lo)) * P.h,
    yR = (v) => P.y + P.h - (v / o.rightMax) * P.h;
  // grid + left axis labels
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.lineWidth = 1;
  for (const v of o.axis.ticks) {
    g.strokeStyle = line;
    g.beginPath();
    g.moveTo(P.x, yL(v));
    g.lineTo(P.x + P.w, yL(v));
    g.stroke();
    g.fillStyle = mu;
    if (!o.leftHidden) g.fillText(o.leftFmt ? o.leftFmt(v) : String(+v.toFixed(3)), P.x - 6, yL(v));
  }
  // right axis labels
  g.textAlign = 'left';
  for (const v of o.rightTicks) {
    g.fillStyle = mu;
    g.fillText(o.rightFmt ? o.rightFmt(v) : String(v), P.x + P.w + 6, yR(v));
  }
  // hover column
  if (o.hover != null && o.hover >= v0 && o.hover < v1) {
    g.fillStyle = line;
    g.globalAlpha = 0.5;
    g.fillRect(P.x + (o.hover - v0) * P.slot, P.y, P.slot, P.h);
    g.globalAlpha = 1;
  }
  // stacked defect bars (right axis, or the left axis when o.barsLeft)
  const yB = o.barsLeft ? yL : yR;
  g.save();
  g.beginPath();
  g.rect(P.x, P.y, P.w, P.h);
  g.clip();
  if (o.bars) {
    const bw = Math.max(1.5, P.slot * 0.6);
    for (let i = v0; i < v1; i++) {
      let acc = 0;
      o.bars.forEach((col, d) => {
        const c = col[i] || 0;
        if (!c) return;
        g.fillStyle = DEFECT_COLORS[d];
        g.fillRect(P.x + (i - v0) * P.slot + (P.slot - bw) / 2, yB(acc + c), bw, yB(acc) - yB(acc + c));
        acc += c;
      });
    }
  }
  // group separators and labels (e.g. the 3 strips of a carrier)
  if (o.groups) {
    g.setLineDash([4, 4]);
    g.fillStyle = mu;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    o.groups.forEach((gr, k) => {
      if (k > 0) {
        g.strokeStyle = mu;
        g.beginPath();
        g.moveTo(P.x + (gr.from - v0) * P.slot, P.y);
        g.lineTo(P.x + (gr.from - v0) * P.slot, P.y + P.h);
        g.stroke();
      }
      g.fillText(gr.label, P.x + ((gr.from + gr.to) / 2 - v0) * P.slot, P.y + 3);
    });
    g.setLineDash([]);
  }
  // lines
  for (const s of o.lines) {
    g.strokeStyle = s.color === 'text' ? txt : s.color;
    g.fillStyle = g.strokeStyle;
    g.lineWidth = s.width || 2;
    g.beginPath();
    let pen = false;
    s.values.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      const x = P.x + (i - v0 + 0.5) * P.slot,
        y = o.lineRight ? yR(v) : yL(v);
      if (pen) g.lineTo(x, y);
      else g.moveTo(x, y);
      pen = true;
    });
    g.stroke();
    const rad = v1 - v0 > 30 ? 1.6 : 2.6;
    s.values.forEach((v, i) => {
      if (v == null) return;
      g.beginPath();
      g.arc(P.x + (i - v0 + 0.5) * P.slot, o.lineRight ? yR(v) : yL(v), rad, 0, 6.3);
      g.fill();
    });
  }
  g.restore();
  // x labels (all of them while they fit, otherwise every 5th)
  g.fillStyle = mu;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const every = P.slot >= 16 ? 1 : P.slot >= 8 ? 2 : 5;
  for (let i = v0; i < v1; i++)
    if (every === 1 || (i + 1) % every === 0 || i === 0)
      g.fillText(String(i + 1), P.x + (i - v0 + 0.5) * P.slot, P.y + P.h + 4);
  g.fillText(o.xlabel, P.x + P.w / 2, h - 14);
  // axis titles
  g.save();
  g.translate(12, P.y + P.h / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (!o.leftHidden) g.fillText(o.ylabel, 0, 0);
  g.restore();
  g.save();
  g.translate(w - 10, P.y + P.h / 2);
  g.rotate(Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(o.rightLabel, 0, 0);
  g.restore();
  // plot frame
  g.strokeStyle = line;
  g.strokeRect(P.x, P.y, P.w, P.h);
}

export { DEFECTS, PARTS_PER_STRIP, popcount };
