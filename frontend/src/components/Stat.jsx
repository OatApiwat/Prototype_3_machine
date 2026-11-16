import React from 'react';
import { useTick, val, fmt } from '../hooks/useLive.js';

export default function Stat({ label, k, f, d = 2, unit = '', step }) {
  useTick();
  const v = val(k, f, step);
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{fmt(v, d)}</b>
      <small>{unit}</small>
    </div>
  );
}
