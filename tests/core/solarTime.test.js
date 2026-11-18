const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../miniprogram/core/solarTime');
const { w } = require('../helpers');

test('longitude offset', () => assert.ok(Math.abs(S.longitudeOffsetMinutes(87.62) + 129.52) < 1e-9));
test('EoT extremes', () => {
  assert.ok(Math.abs(S.equationOfTimeMinutes(2024, 2, 11) + 14.574) < 0.01);
  assert.ok(Math.abs(S.equationOfTimeMinutes(2024, 11, 3) - 16.290) < 0.01);
});
test('Urumqi 1990-01-01 00:30 total -133', () => assert.equal(S.trueSolarCorrection(w(1990, 1, 1, 0, 30), 87.62).totalMinutes, -133));
test('Urumqi 2024-02-04 18:00 total -144, EoT -14.1', () => {
  const c = S.trueSolarCorrection(w(2024, 2, 4, 18, 0), 87.62);
  assert.equal(c.totalMinutes, -144);
  assert.ok(Math.abs(c.equationMinutes + 14.08) < 0.01);
});
test('Beijing 2024-03-10 12:00 total -25', () => assert.equal(S.trueSolarCorrection(w(2024, 3, 10, 12, 0), 116.41).totalMinutes, -25));
