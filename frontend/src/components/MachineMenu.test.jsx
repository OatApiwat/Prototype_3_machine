import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MachineMenu from './MachineMenu.jsx';

describe('MachineMenu', () => {
  it('lists the three dashboards and reports the pick', () => {
    const onPick = vi.fn();
    render(<MachineMenu machine="calul" x={10} y={10} onPick={onPick} onClose={() => {}} />);
    expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).toEqual([
      'Sensor Dashboard',
      'Productivity Dashboard',
      'Maintenance Dashboard',
    ]);
    fireEvent.click(screen.getByText('Maintenance Dashboard'));
    expect(onPick).toHaveBeenCalledWith('calul', 'maintenance');
  });
  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<MachineMenu machine="mddp" x={0} y={0} onPick={() => {}} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
