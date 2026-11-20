const test = require('node:test');
const assert = require('node:assert/strict');
const { SHICHEN, shichenRange, shichenOf, clockTimeHint } = require('../../miniprogram/core/shichen');
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
test('clockTimeHint', () => {
  assert.equal(clockTimeHint(8, 30), '08:30 · 辰时');
  assert.equal(clockTimeHint(8, 59), '08:59 · 辰时（距巳时 1 分钟）');
  assert.equal(clockTimeHint(8, 51), '08:51 · 辰时（距巳时 9 分钟）');
  assert.equal(clockTimeHint(8, 50), '08:50 · 辰时');
  assert.equal(clockTimeHint(9, 0), '09:00 · 巳时（刚进入巳时）');
  assert.equal(clockTimeHint(9, 9), '09:09 · 巳时（刚进入巳时 9 分钟）');
  assert.equal(clockTimeHint(9, 10), '09:10 · 巳时');
  assert.equal(clockTimeHint(22, 55), '22:55 · 亥时（距晚子时 5 分钟）');
  assert.equal(clockTimeHint(23, 3), '23:03 · 晚子时（刚进入晚子时 3 分钟）');
  // 0:00 是早、晚子时的换日点，不是时辰分界，不提示
  assert.equal(clockTimeHint(0, 0), '00:00 · 早子时');
  assert.equal(clockTimeHint(0, 58), '00:58 · 早子时（距丑时 2 分钟）');
});
