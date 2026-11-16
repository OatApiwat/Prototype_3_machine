import React, { useEffect, useRef } from 'react';
import { DASHBOARDS, MACHINES } from '../config/machines.js';

/** Dropdown opened by clicking a machine in the Portal: pick one of its dashboards. */
export default function MachineMenu({ machine, x, y, onPick, onClose }) {
  const first = useRef(null);
  useEffect(() => {
    first.current?.focus();
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div
        className="pmenu"
        role="menu"
        style={{ left: Math.min(x, window.innerWidth - 240), top: Math.min(y, window.innerHeight - 150) }}
      >
        <div className="pmh">{MACHINES[machine].name}</div>
        {DASHBOARDS.map((d, i) => (
          <button
            key={d.id}
            role="menuitem"
            ref={i === 0 ? first : null}
            onClick={() => onPick(machine, d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>
    </>
  );
}
