import React from 'react';
import { keysWith } from '../../lib/store.js';
import { useTick, val } from '../../hooks/useLive.js';

export default function RunCardBar() {
  useTick(500);
  let kL = 0;
  for (const key of keysWith('mddp_carrier|')) {
    const k = +key.split('|')[1],
      n = val(key, 'nL', true) ?? 0;
    if (n > 0 && k > kL) kL = k;
  }
  const nL = kL ? (val('mddp_carrier|' + kL, 'nL', true) ?? 0) : 0,
    nR = kL ? (val('mddp_carrier|' + kL, 'nR', true) ?? 0) : 0;
  const idx = Math.max(0, kL - 1),
    pieces = (idx % 45) * 60 + Math.floor((nL + nR) / 2);
  return (
    <div
      className="card"
      style={{ padding: '4px 10px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <b>
        Run card #{Math.floor(idx / 45) + 1} · {pieces.toLocaleString()} / 2,700 pieces
      </b>
      <div style={{ flex: 1, minWidth: 160, height: 8, background: 'var(--grid)', borderRadius: 4 }}>
        <div style={{ width: pieces / 27 + '%', height: 8, background: 'var(--green)', borderRadius: 4 }} />
      </div>
      <span style={{ color: 'var(--muted)' }}>Carrier load {(idx % 45) + 1}/45</span>
    </div>
  );
}
