const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCopyText, buildShareTitle } = require('../../miniprogram/core/shareText');
const { calculate } = require('../../miniprogram/core/calculate');
const { makeInput } = require('../helpers');

test('copy text 4 lines', () => {
  assert.equal(buildCopyText(calculate(makeInput({ year: 2000, month: 1, day: 1 }))), '己卯 丙子 戊午 戊午\n公历 2000年1月1日 12:00 · 农历冬月廿五\n子时派别 23:00 换日 · 真太阳时 关\n——来自干支历换算');
  // 夏令时区间内的输入，第三行附带夏令时设定
  assert.equal(buildCopyText(calculate(makeInput())).split('\n')[2], '子时派别 23:00 换日 · 真太阳时 关 · 夏令时 未扣除');
});
test('copy text excludes city', () => {
  const t = buildCopyText(calculate(makeInput({ year: 1990, month: 7, day: 1, useTrueSolarTime: true, cityId: 'urumqi', applyDst: true })));
  assert.ok(!t.includes('乌鲁木齐'));
  assert.equal(t.split('\n')[2], '子时派别 23:00 换日 · 真太阳时 开 · 夏令时 已扣除');
});
test('share title', () => assert.equal(buildShareTitle(calculate(makeInput())), '四柱干支：庚午 辛巳 丁丑 丙午'));
