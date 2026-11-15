import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import ProductivityPage from './ProductivityPage.jsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const row = (strip, part, defect) => ({
  t: 1.7e12 + part * 1000,
  side: 'L',
  strip,
  part,
  carrier: 1,
  temp: 109,
  peak: 90,
  dur: 70,
  velx: 30,
  vely: 4,
  velz: 5,
  accx: 6,
  accy: 0.8,
  accz: 1,
  defect,
});

describe('Productivity dashboard', () => {
  it('loads run cards and shows the selected strip with its summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('runcards')
            ? [{ rc: 'RC-1-01', pieces: 3, defective: 1 }]
            : [row(1, 1, 0), row(1, 2, 0b11), row(1, 3, 0)],
      }))
    );
    const { container } = render(<ProductivityPage />);
    await waitFor(() => expect(container.textContent).toContain('3 parts inspected'));
    expect(container.textContent).toContain('2 defects found');
    expect(container.textContent).toContain('Top defect type: ASQ-LCM');
    expect(container.textContent).toContain('Defect :');
    expect(screen.getByText(/Defective parts per suspension/)).toBeTruthy();
    expect(container.querySelectorAll('canvas')).toHaveLength(6);
  });
  it('explains an empty database', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] }))
    );
    render(<ProductivityPage />);
    await waitFor(() => expect(screen.getByText(/No finished pieces/)).toBeTruthy());
  });
});
