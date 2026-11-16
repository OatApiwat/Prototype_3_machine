import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ProductivityPage from './ProductivityPage.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const now = Date.now();
const row = (susp, defect) => ({
  t: now + susp * 1000,
  side: 'L',
  seq: 1,
  carrier: 'CR-0007',
  strip: Math.ceil(susp / 20),
  strip_no: 'Strip-' + Math.ceil(susp / 20),
  suspension_no: ((susp - 1) % 20) + 1,
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
  defect: ['ASQ-LCM', 'ASQ-MCM', 'ASQ-PCM', 'ISAD-CM', 'LM-5', 'MI'].filter((_, d) => (defect >> d) & 1),
});
// step 1 answer: run cards with their carriers and strip numbers (3 consecutive strips = one set)
const runcards = (...groups) => ({
  dateStart: 'x',
  dateEnd: 'x',
  runcards: [{ rc: 'RC-1-01', carriers: [{ carrier: 'CR-0007', strips: groups }] }],
});
// the parts answer is carrier >> strip >> suspension; the fixtures above are flat rows
const nestData = (d) => {
  if (!d.suspension) return d;
  const { suspension, ...rest } = d;
  const strips = new Map();
  for (const { strip_no, ...r } of suspension) strips.set(strip_no, [...(strips.get(strip_no) || []), r]);
  return {
    ...rest,
    carrier: 'CR-0007',
    strips: [...strips].map(([strip_no, s]) => ({ strip_no, suspension: s })),
  };
};
const set1 = ['Strip-1', 'Strip-2', 'Strip-3'];
const set2 = ['Strip-4', 'Strip-5', 'Strip-6'];

const search = async () => {
  const b = await screen.findByRole('button', { name: /Search/ });
  await waitFor(() => expect(b.disabled).toBe(false));
  fireEvent.click(b);
};

describe('Productivity dashboard', () => {
  it('walks date -> run card -> carrier and summarises the carrier', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push(`${init?.method} ${url} ${init?.body}`);
        const u = String(url);
        const data = u.includes('runcards')
          ? runcards(set1)
          : {
              rc: 'RC-1-01',
              strips: [],
              suspension: Array.from({ length: 60 }, (_, i) =>
                row(i + 1, i === 4 ? 0b00001 : i === 30 ? 0b10000 : 0)
              ),
            };
        return { ok: true, json: async () => nestData(data) };
      })
    );
    const { container } = render(<ProductivityPage />);
    await search();
    await waitFor(() => expect(container.textContent).toContain('60 parts inspected'));
    expect(container.textContent).toContain('CR-0007');
    expect(container.textContent).toContain('2 defects found');
    expect(container.textContent).toContain('2 defective parts');
    expect(container.textContent).toContain('Date Start');
    expect(container.textContent).toContain('LM-5');
    expect(screen.getByText('MI')).toBeTruthy();
    expect(container.querySelectorAll('canvas')).toHaveLength(6);
    expect(
      calls.some(
        (c) =>
          c.startsWith('POST /api/mddp_184/parts ') &&
          JSON.parse(c.split(' ').slice(2).join(' ')).strips.join() === 'Strip-1,Strip-2,Strip-3'
      )
    ).toBe(true);
    const n = calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBe(n); // loaded once, no polling
  });
  it('shows one column per set of 3 strips of a reused carrier, all or picked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        const data = u.includes('runcards')
          ? runcards(set1, set2)
          : {
              rc: 'RC-1-01',
              strips: [],
              suspension: Array.from({ length: 60 }, (_, i) => row(i + 1, i === 4 ? 0b00001 : 0)),
            };
        return { ok: true, json: async () => nestData(data) };
      })
    );
    const { container } = render(<ProductivityPage />);
    expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(0); // nothing before Search
    await search();
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
    fireEvent.click(screen.getByLabelText(/Set 2/)); // untick set 2
    await search();
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(1));
    fireEvent.click(screen.getByLabelText('All'));
    await search();
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
  });
  it('remembers the selection in localStorage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        const data = u.includes('runcards')
          ? runcards(set1, set2)
          : { rc: 'RC-1-01', strips: [], suspension: Array.from({ length: 60 }, (_, i) => row(i + 1, 0)) };
        return { ok: true, json: async () => nestData(data) };
      })
    );
    localStorage.setItem('prod.sets', JSON.stringify(['Strip-4']));
    const { container, unmount } = render(<ProductivityPage />);
    await search();
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(1));
    expect(container.textContent).toContain('Set 2 · CR-0007');
    fireEvent.click(screen.getByLabelText('All'));
    await search();
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
    expect(JSON.parse(localStorage.getItem('prod.sets'))).toBeNull();
    unmount();
  });
  it('explains an empty period', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ runcards: [] }) }))
    );
    render(<ProductivityPage />);
    await waitFor(() => expect(screen.getByText(/No run cards in this period/)).toBeTruthy());
  });
});
