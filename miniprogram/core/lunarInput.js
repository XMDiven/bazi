// 农历输入选项与公历互转（PRD 5.1）。库的闰月用负数月份表示。
const { Lunar, LunarYear, LunarMonth, Solar } = require('lunar-javascript');

const MONTH_LABELS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const DAY_LABELS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const libMonth = (m, isLeap) => (isLeap ? -m : m);

function getLeapMonth(y) {
  return LunarYear.fromYear(y).getLeapMonth();
}

function getLunarMonthDays(y, m, isLeap) {
  const month = LunarMonth.fromYm(y, libMonth(m, isLeap));
  return month ? month.getDayCount() : null;
}

function monthLabel(m, isLeap) {
  return `${isLeap ? '闰' : ''}${MONTH_LABELS[m - 1]}`;
}

function getLunarMonthOptions(y) {
  const leap = getLeapMonth(y);
  const options = [];
  for (let m = 1; m <= 12; m++) {
    options.push({ month: m, isLeap: false, label: monthLabel(m, false) });
    if (m === leap) options.push({ month: m, isLeap: true, label: monthLabel(m, true) });
  }
  return options;
}

function getLunarDayOptions(y, m, isLeap) {
  const count = getLunarMonthDays(y, m, isLeap) || 0;
  return DAY_LABELS.slice(0, count).map((label, i) => ({ day: i + 1, label }));
}

function lunarToSolarDate({ year, month, day, isLeapMonth }) {
  try {
    const s = Lunar.fromYmd(year, libMonth(month, isLeapMonth), day).getSolar();
    return { year: s.getYear(), month: s.getMonth(), day: s.getDay() };
  } catch (e) {
    return null;
  }
}

function solarToLunarDate({ year, month, day }) {
  const l = Solar.fromYmd(year, month, day).getLunar();
  const m = l.getMonth();
  return { year: l.getYear(), month: Math.abs(m), day: l.getDay(), isLeapMonth: m < 0 };
}

module.exports = {
  MONTH_LABELS, DAY_LABELS, monthLabel,
  getLeapMonth, getLunarMonthDays, getLunarMonthOptions, getLunarDayOptions,
  lunarToSolarDate, solarToLunarDate,
};
