const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInput } = require('../../miniprogram/core/validate');
const { makeInput } = require('../helpers');

const errs = o => validateInput(makeInput(o)).errors;

test('valid solar input', () => {
  const r = validateInput(makeInput());
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
  assert.deepEqual(r.solarDate, { year: 1990, month: 5, day: 12 });
});
test('invalid solar date', () => {
  assert.equal(errs({ month: 2, day: 30 }).date, '请选择有效日期');
  assert.equal(errs({ month: 13 }).date, '请选择有效日期');
});
test('out of range', () => {
  assert.equal(errs({ year: 1899, month: 12, day: 31 }).date, '仅支持 1900 年至 2100 年');
  assert.equal(errs({ year: 2101, month: 1, day: 1 }).date, '仅支持 1900 年至 2100 年');
  assert.equal(errs({ calendar: 'lunar', year: 2100, month: 12, day: 2 }).date, '仅支持 1900 年至 2100 年');
});
test('lunar leap month missing', () => assert.equal(errs({ calendar: 'lunar', year: 2024, month: 2, day: 1, isLeapMonth: true }).date, '该年没有这个闰月'));
test('lunar day missing', () => assert.equal(errs({ calendar: 'lunar', year: 2023, month: 2, day: 30, isLeapMonth: true }).date, '该月没有这一天'));
test('lunar bad month', () => assert.equal(errs({ calendar: 'lunar', year: 2023, month: 13, day: 1 }).date, '请选择有效日期'));
test('valid lunar input gives solarDate', () => {
  const r = validateInput(makeInput({ calendar: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: true }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.solarDate, { year: 2023, month: 3, day: 22 });
});
test('exact time invalid', () => {
  assert.equal(errs({ hour: 24 }).time, '请选择出生时间');
  assert.equal(errs({ minute: -1 }).time, '请选择出生时间');
  assert.equal(errs({ hour: undefined }).time, '请选择出生时间');
});
test('shichen invalid', () => {
  assert.equal(errs({ precision: 'shichen', shichen: 13 }).time, '请选择时辰');
  assert.equal(errs({ precision: 'shichen', shichen: 12 }).time, undefined);
});
test('unknown precision ignores time', () => assert.equal(errs({ precision: 'unknown', hour: 99 }).time, undefined));
test('bad precision', () => assert.equal(errs({ precision: 'x' }).time, '请选择出生时间'));
test('true solar needs city', () => {
  assert.equal(errs({ useTrueSolarTime: true }).city, '开启真太阳时需先选择出生地');
  assert.equal(errs({ useTrueSolarTime: true, cityId: 'nope' }).city, '开启真太阳时需先选择出生地');
  assert.equal(errs({ useTrueSolarTime: true, cityId: 'urumqi' }).city, undefined);
});
test('unknown precision with true solar and no city is ok', () => assert.equal(validateInput(makeInput({ precision: 'unknown', useTrueSolarTime: true })).ok, true));
test('non-object input', () => assert.equal(validateInput(null).ok, false));
