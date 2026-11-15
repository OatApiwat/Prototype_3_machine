import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('./calul/Calul3D.jsx', () => ({ default: () => <div data-testid="calul3d" /> }));
vi.mock('./hall/Hall3D.jsx', () => ({ default: () => <div data-testid="hall3d" /> }));

import MddpSensorPage from './mddp/MddpSensorPage.jsx';
import CalulSensorPage from './calul/CalulSensorPage.jsx';
import HallSensorPage from './hall/HallSensorPage.jsx';

// smoke tests: every Sensor Dashboard renders (with no data yet) and keeps the legacy frames / titles
describe('sensor dashboards render', () => {
  it('MDDP_184', () => {
    const { container } = render(<MddpSensorPage />);
    expect(container.textContent).toContain('Run card');
    expect(container.textContent).toContain('Left arm zone (SN 1–10)');
    expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(9);
  });
  it('CALUL_037', () => {
    const { container } = render(<CalulSensorPage />);
    for (const t of [
      'KUKA',
      'FESTO',
      'IAI',
      'Festo error codes',
      'IAI error codes',
      'Measured at last arrival',
    ])
      expect(container.textContent).toContain(t);
  });
  it('HAll_013', () => {
    const { container } = render(<HallSensorPage />);
    for (const t of ['HAll', 'Oven parameters', 'Oven Temperature setting', 'Blower Vibration X / Y / Z'])
      expect(container.textContent).toContain(t);
  });
});
