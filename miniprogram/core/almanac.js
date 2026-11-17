// 万年历模型（PRD 9）：只有日期、干支、节气和白名单节日
const { Solar } = require('lunar-javascript');
const { FEATURES } = require('./features');
const { toUtcMs } = require('./wallTime');
const { termOnDate, findJieOnDate, yearTerms } = require('./terms');
const { festivalsOn } = require('./festivals');
const { pillarsAt, SHENG_XIAO } = require('./calculate');
const { SHICHEN, shichenRange } = require('./shichen');
const { monthLabel, DAY_LABELS } = require('./lunarInput');
const { dateCn, monthDayCn, weekdayCn, hm } = require('./format');

const GRID_CELLS = 42;
const DAY_MS = 86400000;
const LATE_ZI = SHICHEN.length - 1;
const LATE_ZI_NOTE = { late23: '日柱已入次日', midnight: '日柱仍为当日' };

const sameDate = (a, b) => !!b && a.year === b.year && a.month === b.month && a.day === b.day;
const dateOfMs = ms => {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};
const at = (p, hour, minute) => ({ year: p.year, month: p.month, day: p.day, hour, minute });
const gz = p => p.gan + p.zhi;

function lunarOf(date) {
  const l = Solar.fromYmd(date.year, date.month, date.day).getLunar();
  const m = l.getMonth();
  return { month: Math.abs(m), isLeap: m < 0, day: l.getDay() };
}

function cellSub(date) {
  const term = termOnDate(date, { jieOnly: false });
  if (term) return { sub: term.name, subKind: 'term' };
  const [festival] = festivalsOn(date);
  if (festival) return { sub: festival, subKind: 'festival' };
  const lunar = lunarOf(date);
  if (lunar.day === 1) return { sub: monthLabel(lunar.month, lunar.isLeap), subKind: 'lunarMonth' };
  return { sub: DAY_LABELS[lunar.day - 1], subKind: 'lunarDay' };
}

/** 月格：周一开始，固定 6 行 42 格 */
function buildMonth(year, month, today, selected) {
  const firstMs = Date.UTC(year, month - 1, 1);
  const offset = (new Date(firstMs).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: GRID_CELLS }, (_, i) => {
    const date = dateOfMs(firstMs + (i - offset) * DAY_MS);
    return {
      date,
      day: date.day,
      ...cellSub(date),
      inMonth: date.month === month,
      isToday: sameDate(date, today),
      isSelected: sameDate(date, selected),
    };
  });
  const mid = at({ year, month, day: 15 }, 12, 0);
  return { title: `${year}年${month}月`, yearGanZhiText: `${gz(pillarsAt(mid, mid, 'late23')[0])}年`, cells };
}

function ganzhiTextOf(date) {
  const startWall = at(date, 0, 0);
  const endWall = at(date, 23, 59);
  const noon = at(date, 12, 0);
  const [y0, m0] = pillarsAt(startWall, startWall, 'late23');
  const [y1, m1] = pillarsAt(endWall, endWall, 'late23');
  const day = gz(pillarsAt(noon, noon, 'late23')[2]);
  if (gz(y0) === gz(y1) && gz(m0) === gz(m1)) return `${gz(y0)}年 ${gz(m0)}月 ${day}日`;
  const jie = findJieOnDate(date);
  return `${gz(y0)}年 ${gz(m0)}月 → ${hm(jie.wall)} 起 ${gz(y1)}年 ${gz(m1)}月，${day}日`;
}

function hourRows(date, ziSect) {
  return SHICHEN.map(s => {
    const { mid } = shichenRange(date, s.index);
    return {
      name: s.name,
      range: `${s.start}–${s.end}`,
      ganzhi: gz(pillarsAt(mid, mid, ziSect)[3]),
      note: s.index === LATE_ZI ? LATE_ZI_NOTE[ziSect] : '',
    };
  });
}

function buildDayDetail(date, ziSect, features = FEATURES) {
  const lunar = Solar.fromYmd(date.year, date.month, date.day).getLunar();
  const noon = at(date, 12, 0);
  const term = termOnDate(date, { jieOnly: false });
  return {
    date,
    solarText: `${dateCn(date)} ${weekdayCn(date)}`,
    lunarText: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganzhiText: ganzhiTextOf(date),
    shengXiao: SHENG_XIAO[pillarsAt(noon, noon, ziSect)[0].zhi],
    term: term ? { name: term.name, timeText: hm(term.wall) } : null,
    festivals: festivalsOn(date),
    hours: features.hourTable ? hourRows(date, ziSect) : [],
  };
}

function buildYearTerms(year, nowWall) {
  const now = toUtcMs(nowWall);
  let upcomingMarked = false;
  return yearTerms(year).map(t => {
    const past = t.utcMs <= now;
    const upcoming = !past && !upcomingMarked;
    if (upcoming) upcomingMarked = true;
    const date = { year: t.wall.year, month: t.wall.month, day: t.wall.day };
    return {
      name: t.name,
      isJie: t.isJie,
      date,
      dateText: `${monthDayCn(date)} ${weekdayCn(date)}`,
      timeText: hm(t.wall),
      past,
      upcoming,
    };
  });
}

module.exports = { buildMonth, buildDayDetail, buildYearTerms };
