const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDerivation } = require('../../miniprogram/core/derivation');
const { calculate } = require('../../miniprogram/core/calculate');
const { makeInput } = require('../helpers');

test('PRD 7.3 example verbatim', () => {
  assert.deepEqual(buildDerivation(calculate(makeInput())), [
    '输入时间：1990年5月12日 12:00（北京时间），未启用真太阳时。',
    '年柱：在立春（1990年2月4日 10:14）之后 → 庚午年。',
    '月柱：在立夏（5月6日 02:35）之后、芒种之前 → 月支为巳；年干庚，按五虎遁得月干辛 → 辛巳。',
    '日柱：按六十甲子连续计日 → 丁丑。',
    '时柱：12:00 属午时（11:00–12:59）；日干丁，按五鼠遁得时干丙 → 丙午。',
  ]);
});
test('true solar input line', () => {
  const d = buildDerivation(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: '新疆维吾尔自治区-乌鲁木齐' })));
  assert.equal(d[0], '输入时间：2024年2月4日 18:00（北京时间）；真太阳时 15:36（乌鲁木齐，经度 −129.6 分钟、均时差 −14.1 分钟）。');
});
test('dst input line', () => {
  const d = buildDerivation(calculate(makeInput({ year: 1990, month: 7, day: 1, applyDst: true })));
  assert.equal(d[0], '输入时间：1990年7月1日 12:00（北京时间），已按夏令时减去 1 小时，未启用真太阳时。');
});
test('shichen input line', () => {
  const d = buildDerivation(calculate(makeInput({ precision: 'shichen', shichen: 6 })));
  assert.equal(d[0], '输入时间：1990年5月12日 午时（11:00–12:59），按 12:00 计算（北京时间），未启用真太阳时。');
});
test('late zi lines', () => {
  const d = buildDerivation(calculate(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, ziSect: 'midnight' })));
  assert.equal(d[3], '日柱：晚子时按“0:00 换日”仍计当日 → 癸酉。');
  assert.equal(d[4], '时柱：23:30 属晚子时（23:00–23:59）；按次日日干甲，用五鼠遁得时干甲 → 甲子。');
  const d2 = buildDerivation(calculate(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, ziSect: 'late23' })));
  assert.equal(d2[3], '日柱：晚子时按“23:00 换日”计入次日 → 甲戌。');
});
test('early zi', () => {
  const d = buildDerivation(calculate(makeInput({ hour: 0, minute: 30 })));
  assert.equal(d[4], '时柱：00:30 属早子时（00:00–00:59）；日干丁，按五鼠遁得时干庚 → 庚子。');
});
test('before 立春', () => {
  assert.equal(buildDerivation(calculate(makeInput({ year: 1990, month: 1, day: 15 })))[1], '年柱：在立春（1990年2月4日 10:14）之前 → 己巳年。');
});
test('unknown has 4 lines', () => {
  const d = buildDerivation(calculate(makeInput({ precision: 'unknown' })));
  assert.equal(d.length, 4);
  assert.equal(d[0], '输入日期：1990年5月12日，时辰不详，只推年、月、日三柱。');
});
test('立春 minute itself is still before (16:27 < 16:27:07)', () => {
  const d = buildDerivation(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 16, minute: 27 })));
  assert.equal(d[1], '年柱：在立春（2024年2月4日 16:27）之前 → 癸卯年。');
});
