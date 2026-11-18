const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../miniprogram/core/pickerModel');

const solar = (year, month, day) => ({ calendar: 'solar', year, month, day, isLeapMonth: false });
const lunar = (year, month, day, isLeapMonth = false) => ({ calendar: 'lunar', year, month, day, isLeapMonth });

test('year options span 1900–2100 (lunar from 1899 for Jan 1900)', () => {
  const ys = P.yearOptions('solar');
  assert.equal(ys.length, 201);
  assert.deepEqual([ys[0], ys[200]], [{ value: 1900, label: '1900年' }, { value: 2100, label: '2100年' }]);
  assert.equal(P.yearOptions('lunar')[0].value, 1899);
});
test('columns for solar and lunar', () => {
  const c = P.columnsFor(solar(2024, 2, 4));
  assert.equal(c.months.length, 12);
  assert.equal(c.days.length, 29);
  assert.equal(c.days[3].label, '4日');
  const l = P.columnsFor(lunar(2023, 2, 1, true));
  assert.equal(l.months.length, 13);
  assert.equal(l.months[2].label, '闰二月');
  assert.equal(l.days.length, 29);
});
test('indexes round trip', () => {
  const v = lunar(2023, 2, 15, true);
  const idx = P.toIndexes(v);
  assert.deepEqual(idx, [124, 2, 14]);
  assert.deepEqual(P.fromIndexes(v, idx), v);
});
test('scrolling month clamps day to last day', () => {
  const v = solar(2024, 1, 31);
  assert.deepEqual(P.fromIndexes(v, [124, 1, 30]), solar(2024, 2, 29));
  const l = lunar(2023, 2, 30);
  assert.deepEqual(P.fromIndexes(l, [124, 2, 29]), lunar(2023, 2, 29, true));
});
test('changing to a year without the leap month drops leap', () => {
  const v = lunar(2023, 2, 10, true);
  assert.deepEqual(P.normalizeDate({ ...v, year: 2024 }), lunar(2024, 2, 10, false));
});
test('switch calendar keeps the same day', () => {
  assert.deepEqual(P.switchCalendar(solar(2023, 3, 22), 'lunar'), lunar(2023, 2, 1, true));
  assert.deepEqual(P.switchCalendar(lunar(2023, 2, 1, true), 'solar'), solar(2023, 3, 22));
  assert.deepEqual(P.switchCalendar(solar(2023, 3, 22), 'solar'), solar(2023, 3, 22));
});
test('switch to lunar near range start stays selectable', () => {
  const r = P.switchCalendar(solar(1900, 1, 5), 'lunar');
  assert.deepEqual(r, lunar(1899, 12, 5));
  assert.equal(P.toIndexes(r)[0], 0);
});
test('texts', () => {
  assert.equal(P.dateText(solar(2024, 2, 4)), '2024年2月4日');
  assert.equal(P.dateText(lunar(2023, 2, 1, true)), '农历 2023年闰二月初一');
  assert.equal(P.timeText({ precision: 'exact', hour: 8, minute: 5 }), '08:05');
  assert.equal(P.timeText({ precision: 'shichen', shichen: 6 }), '午时 11:00–12:59');
  assert.equal(P.timeText({ precision: 'unknown' }), '时辰不详');
});
test('hour and minute options', () => {
  assert.equal(P.HOUR_OPTIONS.length, 24);
  assert.equal(P.MINUTE_OPTIONS[5], '05分');
});
