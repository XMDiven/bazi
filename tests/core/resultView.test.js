const test = require('node:test');
const assert = require('node:assert/strict');
const { buildResultView, diffPillars } = require('../../miniprogram/core/resultView');
const { calculate } = require('../../miniprogram/core/calculate');
const { DISCLAIMER } = require('../../miniprogram/core/constants');
const { FEATURES } = require('../../miniprogram/core/features');
const { makeInput } = require('../helpers');

const URUMQI = makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: 'urumqi' });

test('basic view', () => {
  const v = buildResultView(calculate(makeInput()));
  assert.deepEqual(v.summaryGroups, ['庚午', '辛巳', '丁丑', '丙午']);
  assert.equal(v.subline, '1990年5月12日 12:00 · 农历四月十八 · 马');
  // 1990-05-12 落在 1990 年夏令时区间内，所以出现夏令时标签（PRD 7.1）
  assert.deepEqual(v.methodChips, [{ kind: 'zi_sect', text: '23:00 换日' }, { kind: 'true_solar', text: '真太阳时 关' }, { kind: 'dst', text: '夏令时 未扣除' }]);
  assert.deepEqual(buildResultView(calculate(makeInput({ year: 2000, month: 1, day: 1 }))).methodChips.map(c => c.kind), ['zi_sect', 'true_solar']);
  assert.deepEqual(v.table.columns[0], { key: 'year', label: '年柱', gan: '庚', ganWuXing: '金', zhi: '午', zhiWuXing: '火', hideGanText: '丁、己', naYin: '路旁土', a11y: '年柱，天干庚，五行金，地支午，五行火' });
  assert.equal(v.table.showHideGan, true);
  assert.equal(v.table.showNaYin, true);
  assert.equal(v.wuXingText, '金 2 · 木 0 · 水 0 · 火 5 · 土 1');
  assert.deepEqual(v.timeLines, ['输入时间 1990年5月12日 12:00']);
  assert.deepEqual(v.termsLines, ['上一节气 立夏 5月6日 02:35', '下一节气 小满 5月21日 15:37']);
  assert.equal(v.termsYear, 1990);
  assert.equal(v.derivation.length, 5);
  assert.equal(v.disclaimer, DISCLAIMER);
});
test('dst chip only when eligible', () => {
  const v = buildResultView(calculate(makeInput({ year: 1990, month: 7, day: 1, applyDst: true })));
  assert.deepEqual(v.methodChips[2], { kind: 'dst', text: '夏令时 已扣除' });
  assert.deepEqual(v.timeLines, ['输入时间 1990年7月1日 12:00', '夏令时 −60.0 分钟', '修正后 1990年7月1日 11:00']);
  const v2 = buildResultView(calculate(makeInput({ year: 1990, month: 7, day: 1 })));
  assert.deepEqual(v2.methodChips[2], { kind: 'dst', text: '夏令时 未扣除' });
});
test('urumqi timeLines', () => {
  const v = buildResultView(calculate(URUMQI));
  assert.deepEqual(v.timeLines, ['输入时间 2024年2月4日 18:00', '经度 −129.5 分钟', '均时差 −14.1 分钟', '修正后 2024年2月4日 15:36', '出生地 乌鲁木齐']);
  assert.deepEqual(v.methodChips[1], { kind: 'true_solar', text: '真太阳时 开' });
});
test('shengXiao note in subline', () => {
  const v = buildResultView(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 })));
  assert.equal(v.subline, '2024年2月4日 17:00 · 农历腊月廿五 · 龙（按立春）· 按春节为兔');
});
test('unknown precision subline and 3 columns', () => {
  const v = buildResultView(calculate(makeInput({ precision: 'unknown' })));
  assert.equal(v.subline, '1990年5月12日 时辰不详 · 农历四月十八 · 马');
  assert.equal(v.table.columns.length, 3);
});
test('feature switches remove blocks', () => {
  const r = calculate(makeInput());
  const off = buildResultView(r, { ...FEATURES, wuXingCount: false, hideGan: false, naYin: false });
  assert.equal(off.wuXingText, null);
  assert.equal(off.table.showHideGan, false);
  assert.equal(off.table.showNaYin, false);
  const json = JSON.stringify(off);
  assert.ok(!json.includes('路旁土'));
  assert.ok(!json.includes('丁、己'));
  assert.ok(!json.includes('火 5'));
});
test('no judgement words', () => {
  for (const input of [makeInput(), URUMQI, makeInput({ precision: 'unknown' })]) {
    const json = JSON.stringify(buildResultView(calculate(input)));
    for (const word of ['缺', '旺', '喜用', '十神']) assert.ok(!json.includes(word), word);
  }
});
test('diffPillars', () => {
  const b = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };
  const d = diffPillars(calculate(makeInput({ ...b, ziSect: 'late23' })), calculate(makeInput({ ...b, ziSect: 'midnight' })));
  assert.deepEqual(d, { changedKeys: ['day'], toast: '日柱：甲戌 → 癸酉' });
  assert.deepEqual(diffPillars(calculate(makeInput()), calculate(makeInput())), { changedKeys: [], toast: '四柱未变化' });
  const multi = diffPillars(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 16, minute: 0 })), calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 })));
  assert.equal(multi.toast, '年柱：癸卯 → 甲辰；月柱：乙丑 → 丙寅；时柱：庚申 → 辛酉');
});
