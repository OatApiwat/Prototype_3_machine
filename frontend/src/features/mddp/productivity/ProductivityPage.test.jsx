import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ProductivityPage from './ProductivityPage.jsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const now = Date.now();
const row = (susp, defect) => ({
  t: now + susp * 1000,
  side: 'L',
  seq: 1,
  carrier: 7,
  strip: Math.ceil(susp / 20),
  strip_no: Math.ceil(susp / 20),
  part: ((susp - 1) % 20) + 1,
  susp,
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
const carrier = {
  seq: 1,
  carrier: 7,
  strips: [1, 2, 3],
  start: now,
  end: now + 60000,
  pieces: 60,
  defective: 2,
  cnt: [1, 0, 0, 0, 1, 0],
};

describe('Productivity dashboard', () => {
  it('walks date -> run card -> carrier and summarises the carrier', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        calls.push(String(url));
        const u = String(url);
        const data = u.includes('runcards')
          ? [{ rc: 'RC-1-01', pieces: 2700, defective: 100, first: now, last: now + 1000 }]
          : u.includes('carriers')
            ? [carrier]
            : Array.from({ length: 60 }, (_, i) => row(i + 1, i === 4 ? 0b00001 : i === 30 ? 0b10000 : 0));
        return { ok: true, json: async () => data };
      })
    );
    const { container } = render(<ProductivityPage />);
    await waitFor(() => expect(container.textContent).toContain('60 parts inspected'));
    expect(container.textContent).toContain('Carrier 07');
    expect(container.textContent).toContain('2 defects found');
    expect(container.textContent).toContain('2 defective parts');
    expect(container.textContent).toContain('Date Start');
    expect(container.textContent).toContain('LM-5');
    expect(screen.getByText('MI')).toBeTruthy();
    expect(container.querySelectorAll('canvas')).toHaveLength(6);
    expect(calls.some((c) => c.includes('/api/mddp/parts?rc=RC-1-01&seq=1'))).toBe(true);
    const n = calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBe(n); // loaded once, no polling
  });
  it('lets the user pick one strip of the carrier', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        const data = u.includes('runcards')
          ? [{ rc: 'RC-1-01', pieces: 2700, defective: 100, first: now, last: now + 1000 }]
          : u.includes('carriers')
            ? [carrier]
            : Array.from({ length: 60 }, (_, i) => row(i + 1, i === 4 ? 0b00001 : i === 30 ? 0b10000 : 0));
        return { ok: true, json: async () => data };
      })
    );
    const { container } = render(<ProductivityPage />);
    await waitFor(() => expect(container.textContent).toContain('60 parts inspected'));
    const sel = screen.getByLabelText(/Strip No/);
    expect(sel.querySelectorAll('option')).toHaveLength(4); // all + 3 strips
    fireEvent.change(sel, { target: { value: '2' } });
    await waitFor(() => expect(container.textContent).toContain('20 parts inspected'));
    expect(container.textContent).toContain('1 defects found');
  });
  it('explains an empty period', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] }))
    );
    render(<ProductivityPage />);
    await waitFor(() => expect(screen.getByText(/No run cards in this period/)).toBeTruthy());
  });
});
