import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { usePersistentState } from './usePersistentState.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('usePersistentState', () => {
  it('uses the initial value, saves changes and restores them', () => {
    const a = renderHook(() => usePersistentState('t.k', 'x'));
    expect(a.result.current[0]).toBe('x');
    act(() => a.result.current[1]('y'));
    expect(JSON.parse(localStorage.getItem('t.k'))).toBe('y');
    a.unmount();
    const b = renderHook(() => usePersistentState('t.k', 'x'));
    expect(b.result.current[0]).toBe('y');
  });
  it('keeps null and arrays, and ignores broken storage content', () => {
    localStorage.setItem('t.bad', '{oops');
    const bad = renderHook(() => usePersistentState('t.bad', [1]));
    expect(bad.result.current[0]).toEqual([1]);
    const arr = renderHook(() => usePersistentState('t.arr', null));
    act(() => arr.result.current[1]([3, 4]));
    expect(JSON.parse(localStorage.getItem('t.arr'))).toEqual([3, 4]);
  });
});
