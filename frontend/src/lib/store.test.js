import { describe, it, expect } from 'vitest';
import { sample, rowsOf } from './store.js';

describe('store', () => {
  it('returns no data for an unknown series', () => {
    expect(sample('x', 'v', 0)).toBeNull();
    expect(rowsOf('x')).toEqual([]);
  });
});
