import React from 'react';
import { ui, setSpc } from '../lib/store.js';

export default function SpcBox({ style, className = '' }) {
  return (
    <label
      className={'spc1 ' + className}
      style={style}
      title="SPC chart: centre line and ±3 sigma control limits; red = outside the limits"
    >
      <input type="checkbox" checked={ui.spc} onChange={(e) => setSpc(e.target.checked)} /> SPC chart (all
      graphs)
    </label>
  );
}
