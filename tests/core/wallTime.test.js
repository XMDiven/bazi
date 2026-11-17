const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../../miniprogram/core/wallTime');
const { w } = require('../helpers');

test('addMinutes across year boundary', () => assert.deepEqual(W.addMinutes(w(1990, 1, 1, 0, 30), -133), w(1989, 12, 31, 22, 17)));
test('addMinutes into leap day', () => assert.deepEqual(W.addMinutes(w(2024, 2, 28, 23, 50), 20), w(2024, 2, 29, 0, 10)));
test('toUtcMs / fromUtcMs round trip', () => assert.deepEqual(W.fromUtcMs(W.toUtcMs(w(2024, 2, 4, 16, 27))), w(2024, 2, 4, 16, 27)));
test('diffMinutes', () => assert.equal(W.diffMinutes(w(2024, 2, 4, 16, 27), w(2024, 2, 4, 15, 0)), 87));
test('isValidSolarDate', () => {
  assert.equal(W.isValidSolarDate(1900, 2, 29), false);
  assert.equal(W.isValidSolarDate(2000, 2, 29), true);
  assert.equal(W.isValidSolarDate(2023, 13, 1), false);
  assert.equal(W.isValidSolarDate(2023, 4, 31), false);
  assert.equal(W.isValidSolarDate(2023, 1.5, 1), false);
});
test('supported range', () => {
  assert.equal(W.isInSupportedRange({ year: 1899, month: 12, day: 31 }), false);
  assert.equal(W.isInSupportedRange({ year: 1900, month: 1, day: 1 }), true);
  assert.equal(W.isInSupportedRange({ year: 2100, month: 12, day: 31 }), true);
  assert.equal(W.isInSupportedRange({ year: 2101, month: 1, day: 1 }), false);
});
test('compareWall', () => {
  assert.equal(W.compareWall(w(2024, 1, 1), w(2024, 1, 2)), -1);
  assert.equal(W.compareWall(w(2024, 1, 1), w(2024, 1, 1)), 0);
  assert.equal(W.compareWall(w(2024, 1, 1, 0, 1), w(2024, 1, 1)), 1);
});
test('beijingNow', () => assert.deepEqual(W.beijingNow(Date.UTC(2024, 0, 31, 20, 0)), w(2024, 2, 1, 4, 0)));
