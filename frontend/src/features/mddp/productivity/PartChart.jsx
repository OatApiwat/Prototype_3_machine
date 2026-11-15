import React, { useEffect, useRef, useState } from 'react';
import { fit } from '../../../lib/canvasUtil.js';
import { drawPartChart, slotAt, fracOf } from './drawPartChart.js';

const MIN_SPAN = 6;
/**
 * Canvas chart + hover tooltip. `tip(i)` returns the tooltip lines of category i (or null).
 * Ctrl/Cmd + wheel (or pinch) = zoom around the pointer, drag = pan, double click = reset (the window `draw.view` is owned by the page via `onZoom`).
 * With `id`, the tooltip is shown in every chart that has this id (one per set column) while one of them is hovered.
 */
export default function PartChart({
  id,
  title,
  right,
  height = 200,
  draw,
  tip,
  onPick,
  hoverIndex,
  hoverId,
  onHover,
  onZoom,
}) {
  const ref = useRef(null),
    [hover, setHover] = useState(-1),
    [box, setBox] = useState(null),
    latest = useRef({}),
    drag = useRef(null);
  const paint = () => {
    const cv = ref.current;
    if (!cv || !cv.clientWidth) return;
    const { g, w, h } = fit(cv);
    drawPartChart(g, w, h, { ...latest.current.draw, hover: latest.current.hover });
  };
  useEffect(() => {
    latest.current = { draw, onZoom, hover: hoverIndex != null && hoverIndex >= 0 ? hoverIndex : hover };
    paint();
  });
  useEffect(() => {
    const cv = ref.current,
      ro = new ResizeObserver(paint),
      mo = new MutationObserver(paint); // theme switch
    const wheel = (e) => {
      const { draw: d, onZoom: zoom } = latest.current;
      if (!zoom || !(e.ctrlKey || e.metaKey)) return; // plain wheel keeps scrolling the page
      e.preventDefault();
      const r = cv.getBoundingClientRect(),
        n = d.n,
        from = d.view ? d.view.from : 0,
        to = d.view ? d.view.to : n,
        span = to - from,
        at = slotAt(e.clientX - r.left, r.width, n, d.view),
        focus = at >= 0 ? at + 0.5 : (from + to) / 2,
        next = Math.min(n, Math.max(MIN_SPAN, Math.round(span * (e.deltaY < 0 ? 0.8 : 1.25)))),
        f0 = Math.round(focus - ((focus - from) * next) / span),
        nf = Math.min(n - next, Math.max(0, f0));
      zoom(next >= n ? null : { from: nf, to: nf + next });
    };
    cv.addEventListener('wheel', wheel, { passive: false });
    ro.observe(cv);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      cv.removeEventListener('wheel', wheel);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect(),
      i = slotAt(e.clientX - r.left, r.width, draw.n, draw.view);
    if (drag.current && onZoom && draw.view) {
      const d = drag.current,
        span = d.view.to - d.view.from,
        shift = Math.round(((d.x - e.clientX) / (r.width - 120)) * span),
        nf = Math.min(draw.n - span, Math.max(0, d.view.from + shift));
      onZoom({ from: nf, to: nf + span });
    }
    setHover(i);
    onHover?.(i, id);
    setBox(i >= 0 ? { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width } : null);
  };
  // the tooltip belongs to the chart it describes: here (hovered) or in the same chart of the other sets
  const shownAt = hoverId != null && hoverIndex >= 0 ? hoverIndex : hover,
    lines = shownAt >= 0 && tip && (hoverId == null || hoverId === id) ? tip(shownAt) : null,
    frac = shownAt >= 0 ? fracOf(shownAt, draw.n, draw.view) : 0,
    PLOT = 'calc(100% - 120px)';
  return (
    <div className="card" style={{ padding: '6px 8px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 13,
          padding: '0 4px',
        }}
      >
        <span>{title}</span>
        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{right}</span>
      </div>
      <canvas
        ref={ref}
        style={{ height, width: '100%', display: 'block' }}
        onMouseMove={onMove}
        onMouseDown={(e) => {
          drag.current = { x: e.clientX, view: draw.view };
        }}
        onMouseUp={() => {
          drag.current = null;
        }}
        onDoubleClick={() => onZoom?.(null)}
        onClick={(e) => {
          if (!onPick) return;
          onMove(e); // a cold click (no mouse move before it) must still hit the bar under the pointer
          const r = ref.current.getBoundingClientRect(),
            i = slotAt(e.clientX - r.left, r.width, draw.n, draw.view);
          if (i >= 0) onPick(i);
        }}
        data-clickable={onPick ? '1' : undefined}
        onMouseLeave={() => {
          drag.current = null;
          setHover(-1);
          setBox(null);
          onHover?.(-1, id);
        }}
      />
      {lines && (
        <div
          className="ptip"
          style={{
            // open to the side of the slot that has room, so a wide tooltip stays inside the chart
            ...(frac > 0.5
              ? { right: `calc(64px + (1 - ${frac}) * ${PLOT} + 22px)` }
              : { left: `calc(56px + ${frac} * ${PLOT} + 22px)` }),
            top: box ? Math.max(28, box.y - 10) : 40,
          }}
        >
          {lines.map((l, i) => (
            <div key={i} style={i === 0 ? { fontWeight: 700 } : undefined}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
