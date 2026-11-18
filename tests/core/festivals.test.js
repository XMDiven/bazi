const test = require('node:test');
const assert = require('node:assert/strict');
const { festivalsOn } = require('../../miniprogram/core/festivals');

test('festival whitelist', () => {
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 10 }), ['春节']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 9 }), ['除夕']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 1, day: 1 }), ['元旦']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 14 }), []);
  assert.deepEqual(festivalsOn({ year: 2024, month: 12, day: 25 }), []);
  assert.deepEqual(festivalsOn({ year: 2024, month: 10, day: 1 }), ['国庆节']);
});
