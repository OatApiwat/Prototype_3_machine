import React, { useEffect, useState } from 'react';
import { nowRender, sample } from './store.js';

// re-render a few times per second so cards follow the (delayed) render clock
export function useTick(ms = 250) { const [, set] = useState(0); useEffect(() => { const i = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(i); }, [ms]); }
export function val(key, field, step) { return sample(key, field, nowRender(), step); }
export const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : '--');
export function Stat({ label, k, f, d = 2, unit = '', step }) {
  useTick();
  const v = val(k, f, step);
  return <div className="stat"><span>{label}</span><b>{fmt(v, d)}</b><small>{unit}</small></div>;
}
export const theme = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
