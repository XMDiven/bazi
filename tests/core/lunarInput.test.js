const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../miniprogram/core/lunarInput');

test('getLeapMonth', () => {
  assert.equal(L.getLeapMonth(2023), 2);
  assert.equal(L.getLeapMonth(2020), 4);
  assert.equal(L.getLeapMonth(2024), 0);
});
test('month options with leap', () => {
  const opts = L.getLunarMonthOptions(2023);
  assert.equal(opts.length, 13);
  assert.deepEqual(opts[2], { month: 2, isLeap: true, label: '闰二月' });
  assert.deepEqual(opts.map(o => o.label).slice(-3), ['十月', '冬月', '腊月']);
  assert.equal(opts[0].label, '正月');
  assert.equal(L.getLunarMonthOptions(2024).length, 12);
});
test('month days', () => {
  assert.equal(L.getLunarMonthDays(2023, 2, true), 29);
  assert.equal(L.getLunarMonthDays(2023, 2, false), 30);
  assert.equal(L.getLunarMonthDays(2024, 2, true), null);
});
test('day options', () => {
  const d = L.getLunarDayOptions(2023, 2, true);
  assert.equal(d.length, 29);
  assert.deepEqual(d[0], { day: 1, label: '初一' });
  assert.equal(L.getLunarDayOptions(2023, 2, false)[29].label, '三十');
  assert.deepEqual(L.getLunarDayOptions(2024, 2, true), []);
});
test('lunarToSolarDate', () => {
  assert.deepEqual(L.lunarToSolarDate({ year: 1990, month: 4, day: 18, isLeapMonth: false }), { year: 1990, month: 5, day: 12 });
  assert.deepEqual(L.lunarToSolarDate({ year: 2023, month: 2, day: 1, isLeapMonth: true }), { year: 2023, month: 3, day: 22 });
  assert.equal(L.lunarToSolarDate({ year: 2024, month: 2, day: 1, isLeapMonth: true }), null);
  assert.equal(L.lunarToSolarDate({ year: 2023, month: 2, day: 30, isLeapMonth: true }), null);
});
test('solarToLunarDate', () => {
  assert.deepEqual(L.solarToLunarDate({ year: 2023, month: 3, day: 22 }), { year: 2023, month: 2, day: 1, isLeapMonth: true });
});
