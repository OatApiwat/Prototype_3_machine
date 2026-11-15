import test from 'node:test'; import assert from 'node:assert';
import { sample, rowsOf } from './store.js';
test('module loads', () => { assert.strictEqual(sample('x', 'v', 0), null); assert.deepStrictEqual(rowsOf('x'), []); });
