// 中国 1986–1991 年夏令时（tz 数据库 Asia/Shanghai），区间按钟面时间 [start 02:00, end 02:00)
const { toUtcMs } = require('./wallTime');

const CHINA_DST_PERIODS = [
  { start: { year: 1986, month: 5, day: 4 }, end: { year: 1986, month: 9, day: 14 } },
  { start: { year: 1987, month: 4, day: 12 }, end: { year: 1987, month: 9, day: 13 } },
  { start: { year: 1988, month: 4, day: 17 }, end: { year: 1988, month: 9, day: 11 } },
  { start: { year: 1989, month: 4, day: 16 }, end: { year: 1989, month: 9, day: 17 } },
  { start: { year: 1990, month: 4, day: 15 }, end: { year: 1990, month: 9, day: 16 } },
  { start: { year: 1991, month: 4, day: 14 }, end: { year: 1991, month: 9, day: 15 } },
];

const SWITCH_HOUR = 2;

function isInChinaDst(w) {
  const t = toUtcMs(w);
  return CHINA_DST_PERIODS.some(({ start, end }) =>
    t >= toUtcMs({ ...start, hour: SWITCH_HOUR, minute: 0 }) &&
    t < toUtcMs({ ...end, hour: SWITCH_HOUR, minute: 0 }));
}

module.exports = { CHINA_DST_PERIODS, isInChinaDst };
