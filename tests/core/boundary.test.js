const test = require('node:test');
const assert = require('node:assert/strict');
const { getBoundaryWarnings } = require('../../miniprogram/core/boundary');
const { calculate } = require('../../miniprogram/core/calculate');
const { w, makeInput } = require('../helpers');

const at = (b, l = b, s = 'late23') => getBoundaryWarnings({ beijingWall: b, localWall: l, ziSect: s });

test('立春 within 30 min', () => assert.ok(at(w(2024, 2, 4, 16, 0)).includes('该时刻临近立春交节（2月4日 16:27），年柱和月柱对出生时间精度敏感')));
test('non-立春 jie mentions month only', () => assert.ok(at(w(1990, 5, 6, 2, 50)).includes('该时刻临近立夏交节（5月6日 02:35），月柱对出生时间精度敏感')));
test('jie threshold', () => assert.deepEqual(at(w(1990, 5, 6, 2, 5)), []));
test('shichen threshold is 10 min strict', () => {
  assert.deepEqual(at(w(1990, 5, 12, 12, 50)), []);
  assert.deepEqual(at(w(1990, 5, 12, 12, 51)), ['该时刻临近时辰分界（13:00），时柱对出生时间精度敏感']);
  assert.deepEqual(at(w(1990, 5, 12, 13, 9)), ['该时刻临近时辰分界（13:00），时柱对出生时间精度敏感']);
});
test('late23: 22:55 gives shichen + day', () => assert.deepEqual(at(w(1990, 5, 12, 22, 55)), [
  '该时刻临近时辰分界（23:00），时柱对出生时间精度敏感',
  '该时刻临近换日（23:00），日柱对出生时间精度敏感',
]));
test('01:00 boundary from 00:55', () => assert.deepEqual(at(w(1990, 5, 12, 0, 55)), ['该时刻临近时辰分界（01:00），时柱对出生时间精度敏感']));
test('midnight sect: 00:05', () => {
  assert.ok(at(w(1990, 5, 12, 0, 5), w(1990, 5, 12, 0, 5), 'midnight').includes('该时刻临近换日（00:00），日柱对出生时间精度敏感'));
  assert.deepEqual(at(w(1990, 5, 12, 0, 5)), []);
  assert.deepEqual(at(w(1990, 5, 12, 23, 55), w(1990, 5, 12, 23, 55), 'midnight'), ['该时刻临近换日（00:00），日柱对出生时间精度敏感']);
});
test('jie uses beijing, shichen uses local', () => {
  const r = at(w(2024, 2, 4, 16, 20), w(2024, 2, 4, 13, 56));
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('立春'));
});
test('calculate appends boundary warnings only for exact', () => {
  assert.equal(calculate(makeInput({ hour: 12, minute: 55 })).warnings.length, 1);
  assert.deepEqual(calculate(makeInput({ precision: 'shichen', shichen: 6 })).warnings, []);
});
