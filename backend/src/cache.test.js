const test = require('node:test'); const assert = require('node:assert');
const { Cache } = require('./cache');
test('ring buffer trims by time and slices by since()', () => {
  const c = new Cache({ default: 10 });
  c.add('a', [{ t: 0 }, { t: 5000 }, { t: 12000 }]);
  assert.deepStrictEqual(c.since('a', 0).map(r => r.t), [5000, 12000]);
  assert.deepStrictEqual(c.since('a', 6000).map(r => r.t), [12000]);
  assert.strictEqual(c.oldest('a'), 5000);
});
