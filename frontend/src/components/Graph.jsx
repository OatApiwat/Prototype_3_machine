import React, { useEffect, useRef, useState } from 'react';
import { nowRender, ui } from '../lib/store.js';
import { fit } from '../lib/canvasUtil.js';
import { drawGraph } from '../lib/drawGraph.js';

const PLOT_LEFT = 52,
  PLOT_RIGHT = 8; // must match lib/drawGraph.js

/** Scrolling line graph. series: [{ key, field, color, label }]; the x axis is the real (server) clock drawn at render time. */
export default function Graph(props) {
  const { series, height = 150, win, toggle = false, ownSpc = false } = props;
  const ref = useRef(null),
    hid = useRef({}),
    own = useRef(false),
    latest = useRef(props),
    [, bump] = useState(0);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cv = ref.current;
      if (!cv || !cv.clientWidth) return;
      const { g, w, h } = fit(cv);
      const p = latest.current;
      drawGraph(
        g,
        w,
        h,
        {
          unit: '',
          dec: 2,
          refs: [],
          spcOk: true,
          dots: false,
          noTime: false,
          toggle: false,
          ownSpc: false,
          tickFmt: null,
          valFmt: null,
          ylabel: null,
          joined: null,
          ...p,
        },
        { hid: hid.current, own: own.current }
      );
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e) => {
    const cv = ref.current,
      r = cv.getBoundingClientRect(),
      L = PLOT_LEFT,
      pw = r.width - L - PLOT_RIGHT,
      x = e.clientX - r.left;
    if (x < L || x > L + pw) {
      ui.hoverT = null;
      ui.hoverFrozen = null;
      return;
    }
    if (ui.hoverFrozen == null) ui.hoverFrozen = nowRender();
    ui.hoverT = nowRender() - win() * 1000 + ((x - L) / pw) * win() * 1000;
  };
  const lab = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    marginLeft: 6,
  };
  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={ref}
        style={{ height }}
        onMouseMove={onMove}
        onMouseLeave={() => {
          ui.hoverT = null;
          ui.hoverFrozen = null;
        }}
      />
      {(toggle || ownSpc) && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 22,
            zIndex: 2,
            background: 'var(--panel)',
            borderRadius: 4,
            padding: '0 2px',
          }}
        >
          {toggle &&
            series
              .filter((s) => !s.dash)
              .map((s) => (
                <label key={s.label} style={{ ...lab, color: s.color }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={(e) => {
                      hid.current[s.label] = !e.target.checked;
                      bump((n) => n + 1);
                    }}
                  />
                  {s.label}
                </label>
              ))}
          {ownSpc && (
            <label style={{ ...lab, color: 'var(--text)' }}>
              <input
                type="checkbox"
                onChange={(e) => {
                  own.current = e.target.checked;
                  bump((n) => n + 1);
                }}
              />
              SPC
            </label>
          )}
        </div>
      )}
    </div>
  );
}
