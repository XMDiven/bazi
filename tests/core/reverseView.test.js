const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReverseItems, inputForHit } = require('../../miniprogram/core/reverseView');
const { calculate } = require('../../miniprogram/core/calculate');
const { w } = require('../helpers');

test('item text', () => {
  const [item] = buildReverseItems([{ start: w(1990, 5, 12, 11, 0), end: w(1990, 5, 12, 12, 59), hasJie: false }]);
  assert.equal(item.text, '1990年5月12日 周六 · 11:00–12:59 · 农历四月十八');
});
test('jie note', () => {
  const [item] = buildReverseItems([{ start: w(2024, 2, 4, 16, 28), end: w(2024, 2, 4, 16, 59), hasJie: true }]);
  assert.equal(item.text, '2024年2月4日 周日 · 16:28–16:59 · 农历腊月廿五 · 含交节');
});
test('cross-day merged segment', () => {
  const [item] = buildReverseItems([{ start: w(2024, 3, 10, 23, 0), end: w(2024, 3, 11, 0, 59), hasJie: false }]);
  assert.equal(item.text, '2024年3月10日 周日 · 23:00 – 3月11日 00:59 · 农历二月初一');
});
test('input for a shichen hit reproduces the pillars', () => {
  const hit = { start: w(2024, 3, 10, 23, 0), end: w(2024, 3, 11, 0, 59), hasJie: false };
  const input = inputForHit(hit, true, 'late23');
  assert.deepEqual([input.precision, input.shichen, input.year, input.month, input.day, input.ziSect], ['shichen', 12, 2024, 3, 10, 'late23']);
  assert.equal(calculate(input).summary, '甲辰 丁卯 甲戌 甲子');
});
test('input for a day hit uses the main day', () => {
  const hit = { start: w(1990, 5, 11, 23, 0), end: w(1990, 5, 12, 22, 59), hasJie: false };
  const input = inputForHit(hit, false, 'late23');
  assert.deepEqual([input.precision, input.year, input.month, input.day], ['unknown', 1990, 5, 12]);
  assert.equal(calculate(input).summary, '庚午 辛巳 丁丑');
});
