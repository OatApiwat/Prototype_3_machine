import React, { useEffect, useRef, useState } from 'react';
import { fit } from '../../../lib/canvasUtil.js';
import { drawPartChart, slotAt } from './drawPartChart.js';

/** Canvas chart + hover tooltip. `tip(i)` returns the tooltip lines of category i (or null). */
export default function PartChart({ title, right, height = 200, draw, tip, onPick, hoverIndex, onHover }) {
  const ref = useRef(null),
    [hover, setHover] = useState(-1),
    [box, setBox] = useState(null),
    latest = useRef({});
  const paint = () => {
    const cv = ref.current;
    if (!cv || !cv.clientWidth) return;
    const { g, w, h } = fit(cv);
    drawPartChart(g, w, h, { ...latest.current.draw, hover: latest.current.hover });
  };
  useEffect(() => {
    latest.current = { draw, hover: hoverIndex != null && hoverIndex >= 0 ? hoverIndex : hover };
    paint();
  });
  useEffect(() => {
    const cv = ref.current,
      ro = new ResizeObserver(paint),
      mo = new MutationObserver(paint); // theme switch
    ro.observe(cv);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect(),
      i = slotAt(e.clientX - r.left, r.width, draw.n);
    setHover(i);
    onHover?.(i);
    setBox(i >= 0 ? { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width } : null);
  };
  const lines = hover >= 0 && tip ? tip(hover) : null;
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
        onClick={(e) => {
          if (!onPick) return;
          onMove(e); // a cold click (no mouse move before it) must still hit the bar under the pointer
          const r = ref.current.getBoundingClientRect(),
            i = slotAt(e.clientX - r.left, r.width, draw.n);
          if (i >= 0) onPick(i);
        }}
        data-clickable={onPick ? '1' : undefined}
        onMouseLeave={() => {
          setHover(-1);
          setBox(null);
          onHover?.(-1);
        }}
      />
      {lines && box && (
        <div
          className="ptip"
          style={{ left: Math.min(box.x + 14, box.w - 190), top: Math.max(28, box.y - 10) }}
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
