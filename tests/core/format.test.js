const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../../miniprogram/core/format');
const { w } = require('../helpers');

test('dateCn / monthDayCn / hm / weekday', () => {
  assert.equal(F.dateCn({ year: 1990, month: 5, day: 12 }), '1990年5月12日');
  assert.equal(F.monthDayCn({ year: 1990, month: 5, day: 6 }), '5月6日');
  assert.equal(F.hm(w(1990, 5, 6, 2, 35)), '02:35');
  assert.equal(F.weekdayCn({ year: 1990, month: 5, day: 12 }), '周六');
});
test('minutesDelta', () => {
  assert.equal(F.minutesDelta(-129.52), '−129.5 分钟');
  assert.equal(F.minutesDelta(3.75), '+3.8 分钟');
  assert.equal(F.minutesDelta(0), '0.0 分钟');
  assert.equal(F.minutesDelta(-0.01), '0.0 分钟');
});
test('relativeTime', () => {
  const now = Date.UTC(2026, 10, 17, 4, 0); // 北京时间 12:00
  assert.equal(F.relativeTime(now, now - 30e3), '刚刚');
  assert.equal(F.relativeTime(now, now - 3 * 60e3), '3 分钟前');
  assert.equal(F.relativeTime(now, now - 2 * 3600e3), '2 小时前');
  assert.equal(F.relativeTime(now, now - 20 * 3600e3), '昨天');
  assert.equal(F.relativeTime(now, Date.UTC(2026, 0, 5, 4, 0)), '1月5日');
  assert.equal(F.relativeTime(now, Date.UTC(2025, 0, 5, 4, 0)), '2025年1月5日');
});
