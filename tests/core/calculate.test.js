const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, pillarsAt } = require('../../miniprogram/core/calculate');
const { makeInput, w } = require('../helpers');

test('1990-05-12 12:00', () => {
  const r = calculate(makeInput());
  assert.equal(r.summary, '庚午 辛巳 丁丑 丙午');
  assert.equal(r.lunarText, '一九九〇年四月十八');
  assert.deepEqual([r.shengXiao, r.shengXiaoNote], ['马', null]);
  assert.deepEqual(r.wuXingCount, { 金: 2, 木: 0, 水: 0, 火: 5, 土: 1 });
  assert.deepEqual(r.pillars[0].hideGan, ['丁', '己']);
  assert.deepEqual(r.pillars.map(p => p.naYin), ['路旁土', '白蜡金', '涧下水', '天河水']);
  assert.deepEqual([r.terms.prevJie.name, r.terms.nextJie.name, r.terms.nextTerm.name], ['立夏', '芒种', '小满']);
  assert.deepEqual(r.pillars[0], { key: 'year', label: '年柱', gan: '庚', zhi: '午', ganWuXing: '金', zhiWuXing: '火', hideGan: ['丁', '己'], naYin: '路旁土' });
  assert.deepEqual(r.warnings, []);
});
test('2000-01-01', () => assert.equal(calculate(makeInput({ year: 2000, month: 1, day: 1 })).summary, '己卯 丙子 戊午 戊午'));
test('立春 2024 and shengXiao note', () => {
  assert.equal(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 16, minute: 0 })).summary, '癸卯 乙丑 戊戌 庚申');
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 }));
  assert.equal(r.summary, '甲辰 丙寅 戊戌 辛酉');
  assert.deepEqual([r.shengXiao, r.shengXiaoNote], ['龙', '按春节为兔']);
});
test('late zi sects', () => {
  const b = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };
  assert.equal(calculate(makeInput({ ...b, ziSect: 'late23' })).summary, '甲辰 丁卯 甲戌 甲子');
  assert.equal(calculate(makeInput({ ...b, ziSect: 'midnight' })).summary, '甲辰 丁卯 癸酉 甲子');
});
test('two-instant model: Urumqi across 立春', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: 'urumqi' }));
  assert.deepEqual(r.localWall, w(2024, 2, 4, 15, 36));
  assert.equal(r.summary, '甲辰 丙寅 戊戌 庚申'); // 若全部按 local 计算会得到 '癸卯 乙丑 …'
  assert.equal(r.method.city.name, '乌鲁木齐');
  assert.equal(r.corrections.totalMinutes, -144);
});
test('Urumqi across day and year', () => {
  const r = calculate(makeInput({ year: 1990, month: 1, day: 1, hour: 0, minute: 30, useTrueSolarTime: true, cityId: 'urumqi' }));
  assert.deepEqual(r.localWall, w(1989, 12, 31, 22, 17));
  assert.equal(r.summary, '己巳 丙子 乙丑 丁亥');
});
test('DST', () => {
  const r = calculate(makeInput({ year: 1990, month: 7, day: 1, applyDst: true }));
  assert.deepEqual(r.beijingWall, w(1990, 7, 1, 11, 0));
  assert.equal(r.method.dstApplied, true);
  assert.equal(r.method.dstEligible, true);
  assert.equal(r.corrections.dstMinutes, -60);
  const r2 = calculate(makeInput({ year: 1992, month: 7, day: 1, applyDst: true }));
  assert.equal(r2.method.dstApplied, false);
  assert.equal(r2.method.dstEligible, false);
});
test('lunar input', () => assert.equal(calculate(makeInput({ calendar: 'lunar', year: 1990, month: 4, day: 18 })).summary, '庚午 辛巳 丁丑 丙午'));
test('shichen mode uses midpoint', () => {
  const r = calculate(makeInput({ precision: 'shichen', shichen: 6 }));
  assert.equal(r.summary, '庚午 辛巳 丁丑 丙午');
  assert.deepEqual(r.inputWall, w(1990, 5, 12, 12, 0));
  assert.deepEqual(r.warnings, []);
});
test('shichen containing 立春 warns', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, precision: 'shichen', shichen: 8 }));
  assert.ok(r.warnings.includes('该时辰内四柱可能不同：开始时为 癸卯 乙丑 戊戌 庚申，结束时为 甲辰 丙寅 戊戌 庚申'));
});
test('unknown hour on 立春 day', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, precision: 'unknown' }));
  assert.equal(r.pillars.length, 3);
  assert.ok(r.warnings.includes('当天 16:27 交立春，时辰不详时年柱、月柱无法确定（交节前：癸卯年 乙丑月；交节后：甲辰年 丙寅月）'));
});
test('unknown hour on non-立春 jie day: month only', () => {
  const r = calculate(makeInput({ year: 1990, month: 5, day: 6, precision: 'unknown' }));
  assert.deepEqual(r.warnings, ['当天 02:35 交立夏，时辰不详时月柱无法确定（交节前：庚辰月；交节后：辛巳月）']);
});
test('unknown ignores true solar time and dst', () => {
  const r = calculate(makeInput({ year: 1990, month: 7, day: 1, precision: 'unknown', useTrueSolarTime: true, cityId: 'urumqi', applyDst: true }));
  assert.deepEqual(r.localWall, w(1990, 7, 1, 12, 0));
  assert.equal(r.method.dstApplied, false);
});
test('pillarsAt splits instants', () => {
  const p = pillarsAt(w(2024, 2, 4, 18, 0), w(2024, 2, 4, 15, 36), 'late23');
  assert.deepEqual(p.map(x => x.gan + x.zhi), ['甲辰', '丙寅', '戊戌', '庚申']);
});
test('invalid throws', () => assert.throws(() => calculate(makeInput({ month: 13 })), /INVALID_INPUT/));
test('perf: 500 runs < 2500ms', () => { const t = Date.now(); for (let i = 0; i < 500; i++) calculate(makeInput({ minute: i % 60 })); assert.ok(Date.now() - t < 2500); });
