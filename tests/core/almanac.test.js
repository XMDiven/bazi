const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMonth, buildDayDetail, buildYearTerms } = require('../../miniprogram/core/almanac');
const { NOW } = require('../helpers');

const TODAY = { year: 2026, month: 11, day: 17 };

test('Feb 2024 grid', () => {
  const m = buildMonth(2024, 2, TODAY, { year: 2024, month: 2, day: 4 });
  assert.equal(m.cells.length, 42);
  assert.deepEqual(m.cells[0].date, { year: 2024, month: 1, day: 29 });
  const c = d => m.cells.find(x => x.date.month === 2 && x.date.day === d);
  assert.deepEqual([c(4).sub, c(4).subKind], ['立春', 'term']);
  assert.deepEqual([c(9).sub, c(10).sub], ['除夕', '春节']);
  assert.deepEqual([c(5).sub, c(5).subKind], ['廿六', 'lunarDay']);
  assert.equal(m.title, '2024年2月');
  assert.equal(m.yearGanZhiText, '甲辰年');
  assert.equal(c(4).isSelected, true);
  assert.equal(m.cells[0].inMonth, false);
});
test('today flag', () => {
  const m = buildMonth(2026, 11, TODAY, TODAY);
  assert.equal(m.cells.filter(x => x.isToday).length, 1);
  assert.equal(m.cells.find(x => x.isToday).date.day, 17);
});
test('lunar month first day shows month name', () => {
  const m = buildMonth(2024, 3, TODAY, { year: 2024, month: 3, day: 1 });
  const c = m.cells.find(x => x.date.month === 3 && x.date.day === 10);
  assert.deepEqual([c.sub, c.subKind], ['二月', 'lunarMonth']);
});
test('leap month first day', () => {
  const m = buildMonth(2023, 3, TODAY, { year: 2023, month: 3, day: 1 });
  const c = m.cells.find(x => x.date.month === 3 && x.date.day === 22);
  assert.deepEqual([c.sub, c.subKind], ['闰二月', 'lunarMonth']);
});
test('day detail on 立春 day', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 4 }, 'late23');
  assert.equal(d.ganzhiText, '癸卯年 乙丑月 → 16:27 起 甲辰年 丙寅月，戊戌日');
  assert.deepEqual(d.term, { name: '立春', timeText: '16:27' });
  assert.equal(d.solarText, '2024年2月4日 周日');
});
test('day detail plain day', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 10 }, 'late23');
  assert.equal(d.ganzhiText, '甲辰年 丙寅月 甲辰日');
  assert.equal(d.term, null);
  assert.deepEqual(d.festivals, ['春节']);
  assert.equal(d.lunarText, '农历正月初一');
  assert.equal(d.shengXiao, '龙');
});
test('day detail hours', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 10 }, 'late23');
  assert.equal(d.hours.length, 13);
  assert.deepEqual(d.hours[0], { name: '早子时', range: '00:00–00:59', ganzhi: '甲子', note: '' });
  assert.deepEqual(d.hours[12], { name: '晚子时', range: '23:00–23:59', ganzhi: '丙子', note: '日柱已入次日' });
  assert.equal(buildDayDetail({ year: 2024, month: 2, day: 10 }, 'midnight').hours[12].note, '日柱仍为当日');
});
test('hour table switch off', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 10 }, 'late23', { hourTable: false });
  assert.deepEqual(d.hours, []);
});
test('year terms', () => {
  const t = buildYearTerms(2026, NOW);
  assert.equal(t.length, 24);
  assert.equal(t.find(x => x.upcoming).name, '小雪');
  assert.equal(t.filter(x => x.upcoming).length, 1);
  assert.deepEqual(t.find(x => x.name === '立春' ), { name: '立春', isJie: true, date: { year: 2026, month: 2, day: 4 }, dateText: '2月4日 周三', timeText: '04:02', past: true, upcoming: false });
});
test('perf: 12 months < 600ms', () => {
  const t = Date.now();
  for (let m = 1; m <= 12; m++) buildMonth(2030, m, TODAY, TODAY);
  assert.ok(Date.now() - t < 600);
});
