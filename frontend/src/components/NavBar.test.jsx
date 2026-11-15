import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NavBar from './NavBar.jsx';

const base = { connected: true, paused: false, onPause() {}, theme: 'light', onTheme() {} };

describe('NavBar', () => {
  it('lists the machines and opens their dashboards', () => {
    const go = vi.fn();
    render(<NavBar {...base} loc={{ m: null, d: 'sensor' }} go={go} />);
    fireEvent.click(screen.getByText(/CALUL_037/));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Maintenance Dashboard' }));
    expect(go).toHaveBeenCalledWith({ m: 'calul', d: 'maintenance' });
  });
  it('marks the current page and shows Pause only inside a machine', () => {
    const { rerender } = render(<NavBar {...base} loc={{ m: null, d: 'sensor' }} go={() => {}} />);
    expect(screen.queryByText(/Pause/)).toBeNull();
    expect(screen.getByText('⌂ Portal').closest('button').getAttribute('aria-current')).toBe('page');
    rerender(<NavBar {...base} loc={{ m: 'hall', d: 'sensor' }} go={() => {}} />);
    expect(screen.getByText(/Pause/)).toBeTruthy();
    expect(
      screen
        .getByText(/HAll_013 ▾/)
        .closest('button')
        .getAttribute('aria-current')
    ).toBe('page');
  });
});
