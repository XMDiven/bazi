const test = require('node:test');
const assert = require('node:assert/strict');
const { SHICHEN, shichenRange, shichenOf } = require('../../miniprogram/core/shichen');
const { w } = require('../helpers');

test('13 shichen with split zi', () => {
  assert.equal(SHICHEN.length, 13);
  assert.deepEqual(SHICHEN[0], { index: 0, name: '早子时', start: '00:00', end: '00:59' });
  assert.deepEqual(SHICHEN[1], { index: 1, name: '丑时', start: '01:00', end: '02:59' });
  assert.deepEqual(SHICHEN[6], { index: 6, name: '午时', start: '11:00', end: '12:59' });
  assert.deepEqual(SHICHEN[11], { index: 11, name: '亥时', start: '21:00', end: '22:59' });
  assert.deepEqual(SHICHEN[12], { index: 12, name: '晚子时', start: '23:00', end: '23:59' });
});
test('range mid', () => {
  assert.deepEqual(shichenRange({ year: 1990, month: 5, day: 12 }, 6).mid, w(1990, 5, 12, 12, 0));
  assert.deepEqual(shichenRange({ year: 1990, month: 5, day: 12 }, 12).mid, w(1990, 5, 12, 23, 30));
  assert.deepEqual(shichenRange({ year: 1990, month: 5, day: 12 }, 0).mid, w(1990, 5, 12, 0, 30));
  const r = shichenRange({ year: 1990, month: 5, day: 12 }, 1);
  assert.deepEqual([r.start, r.end], [w(1990, 5, 12, 1, 0), w(1990, 5, 12, 2, 59)]);
});
test('shichenOf', () => {
  assert.equal(shichenOf(w(1990, 5, 12, 23, 10)), 12);
  assert.equal(shichenOf(w(1990, 5, 12, 0, 10)), 0);
  assert.equal(shichenOf(w(1990, 5, 12, 12, 59)), 6);
  assert.equal(shichenOf(w(1990, 5, 12, 1, 0)), 1);
  assert.equal(shichenOf(w(1990, 5, 12, 22, 59)), 11);
});
