import { describe, it, expect, vi, afterEach } from 'vitest';
import { storeGet, storeSet } from './safeStorage.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('safeStorage', () => {
  it('reads and writes like localStorage', () => {
    storeSet('s.k', 5);
    expect(storeGet('s.k')).toBe('5');
    expect(storeGet('s.none')).toBeNull();
  });
  it('never throws when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storeGet('x')).toBeNull();
    expect(() => storeSet('x', 1)).not.toThrow();
  });
});
