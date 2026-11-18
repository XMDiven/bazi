// 日期时间弹层的列数据（PRD 5.1）：控件本身不提供非法日期与闰月
const { MIN_DATE, MAX_DATE } = require('./constants');
const { getLunarMonthOptions, getLunarDayOptions, lunarToSolarDate, solarToLunarDate, monthLabel, DAY_LABELS } = require('./lunarInput');
const { SHICHEN } = require('./shichen');
const { pad2 } = require('./format');

// 农历 1899 年腊月对应公历 1900 年 1 月
const FIRST_YEAR = { solar: MIN_DATE.year, lunar: MIN_DATE.year - 1 };

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => `${pad2(h)}时`);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => `${pad2(m)}分`);

function yearOptions(calendar = 'solar') {
  const first = FIRST_YEAR[calendar] || FIRST_YEAR.solar;
  return Array.from({ length: MAX_DATE.year - first + 1 }, (_, i) => ({ value: first + i, label: `${first + i}年` }));
}

const solarDays = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function monthOptions(calendar, year) {
  if (calendar === 'lunar') return getLunarMonthOptions(year);
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, isLeap: false, label: `${i + 1}月` }));
}

function dayOptions(calendar, year, month, isLeap) {
  if (calendar === 'lunar') return getLunarDayOptions(year, month, isLeap);
  return Array.from({ length: solarDays(year, month) }, (_, i) => ({ day: i + 1, label: `${i + 1}日` }));
}

/** 把日期收敛到合法值：年份入范围、闰月不存在则取同名月、日期不超过当月天数 */
function normalizeDate(value) {
  const years = yearOptions(value.calendar);
  const year = Math.min(Math.max(value.year, years[0].value), years[years.length - 1].value);
  const months = monthOptions(value.calendar, year);
  const isLeap = value.calendar === 'lunar' && !!value.isLeapMonth && months.some(m => m.month === value.month && m.isLeap);
  const month = Math.min(Math.max(value.month, 1), 12);
  const days = dayOptions(value.calendar, year, month, isLeap);
  const day = Math.min(Math.max(value.day, 1), days.length);
  return { calendar: value.calendar, year, month, day, isLeapMonth: isLeap };
}

function columnsFor(value) {
  const v = normalizeDate(value);
  return {
    years: yearOptions(v.calendar),
    months: monthOptions(v.calendar, v.year),
    days: dayOptions(v.calendar, v.year, v.month, v.isLeapMonth),
  };
}

function toIndexes(value) {
  const v = normalizeDate(value);
  const { years, months } = columnsFor(v);
  return [
    years.findIndex(y => y.value === v.year),
    months.findIndex(m => m.month === v.month && m.isLeap === v.isLeapMonth),
    v.day - 1,
  ];
}

/** picker-view 滚动后的新日期；月份切换时日期自动收敛到最后一天 */
function fromIndexes(value, [yi, mi, di]) {
  const years = yearOptions(value.calendar);
  const year = years[Math.min(Math.max(yi, 0), years.length - 1)].value;
  const months = monthOptions(value.calendar, year);
  const m = months[Math.min(Math.max(mi, 0), months.length - 1)];
  return normalizeDate({ calendar: value.calendar, year, month: m.month, isLeapMonth: m.isLeap, day: di + 1 });
}

/** 公历、农历切换时保持同一天 */
function switchCalendar(value, to) {
  const v = normalizeDate(value);
  if (v.calendar === to) return v;
  if (to === 'lunar') return normalizeDate({ calendar: 'lunar', ...solarToLunarDate(v) });
  const solar = lunarToSolarDate(v);
  return normalizeDate(solar ? { calendar: 'solar', ...solar, isLeapMonth: false } : { ...v, calendar: 'solar', isLeapMonth: false });
}

function dateText(value) {
  if (value.calendar === 'lunar') return `农历 ${value.year}年${monthLabel(value.month, value.isLeapMonth)}${DAY_LABELS[value.day - 1]}`;
  return `${value.year}年${value.month}月${value.day}日`;
}

function timeText(value) {
  if (value.precision === 'exact') return `${pad2(value.hour)}:${pad2(value.minute)}`;
  if (value.precision === 'shichen') {
    const s = SHICHEN[value.shichen];
    return `${s.name} ${s.start}–${s.end}`;
  }
  return '时辰不详';
}

module.exports = {
  HOUR_OPTIONS, MINUTE_OPTIONS,
  yearOptions, monthOptions, dayOptions, normalizeDate, columnsFor, toIndexes, fromIndexes, switchCalendar, dateText, timeText,
};
