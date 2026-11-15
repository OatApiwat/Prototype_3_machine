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
// API 2 answer: carriers of the run card, each with its sets (seq) and their strip numbers
const carriers = (...sets) => [{ carrier: 7, sets }];
const set1 = { seq: 1, strips: [1, 2, 3] };
const set2 = { seq: 2, strips: [4, 5, 6] };

describe('Productivity dashboard', () => {
  it('walks date -> run card -> carrier and summarises the carrier', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        calls.push(String(url));
        const u = String(url);
        const data = u.includes('runcards')
          ? [{ rc: 'RC-1-01' }]
          : u.includes('carriers')
            ? carriers(set1)
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
  it('shows one column per set of 3 strips of a reused carrier, all or picked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        const data = u.includes('runcards')
          ? [{ rc: 'RC-1-01' }]
          : u.includes('carriers')
            ? carriers(set1, set2)
            : Array.from({ length: 60 }, (_, i) => row(i + 1, i === 4 ? 0b00001 : 0));
        return { ok: true, json: async () => data };
      })
    );
    const { container } = render(<ProductivityPage />);
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
    expect(container.textContent).toContain('2 sets');
    fireEvent.click(screen.getByLabelText(/Set 2/)); // untick set 2
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(1));
    fireEvent.click(screen.getByLabelText('All'));
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
  });
  it('remembers the selection in localStorage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        const data = u.includes('runcards')
          ? [{ rc: 'RC-1-01' }]
          : u.includes('carriers')
            ? carriers(set1, set2)
            : Array.from({ length: 60 }, (_, i) => row(i + 1, 0));
        return { ok: true, json: async () => data };
      })
    );
    localStorage.setItem('prod.sets', JSON.stringify([2]));
    const { container, unmount } = render(<ProductivityPage />);
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(1));
    expect(container.textContent).toContain('visit 2');
    fireEvent.click(screen.getByLabelText('All'));
    await waitFor(() => expect(container.querySelectorAll('[data-testid="set-column"]')).toHaveLength(2));
    expect(JSON.parse(localStorage.getItem('prod.sets'))).toBeNull();
    unmount();
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
