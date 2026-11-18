// 钟面时间（北京时间）运算。只用 Date.UTC / getUTC*，与手机时区无关。
const { MIN_DATE, MAX_DATE } = require('./constants');

const MINUTE_MS = 60 * 1000;
const BEIJING_OFFSET_MS = 8 * 60 * MINUTE_MS;

/** 把钟面时间当作 UTC 编码成毫秒，只用于钟面时间之间的加减与比较 */
function toUtcMs(w) {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour || 0, w.minute || 0);
}

function fromUtcMs(ms) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function addMinutes(w, n) {
  return fromUtcMs(toUtcMs(w) + n * MINUTE_MS);
}

/** a − b，单位分钟 */
function diffMinutes(a, b) {
  return (toUtcMs(a) - toUtcMs(b)) / MINUTE_MS;
}

function isValidSolarDate(y, m, d) {
  if (![y, m, d].every(Number.isInteger)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}

function dateKey(p) {
  return p.year * 10000 + p.month * 100 + p.day;
}

function isInSupportedRange(p) {
  const k = dateKey(p);
  return k >= dateKey(MIN_DATE) && k <= dateKey(MAX_DATE);
}

function compareWall(a, b) {
  return Math.sign(toUtcMs(a) - toUtcMs(b));
}

/** 当前北京时间；nowMs 由调用方传入（Date.now()） */
function beijingNow(nowMs) {
  return fromUtcMs(nowMs + BEIJING_OFFSET_MS);
}

module.exports = {
  MINUTE_MS, BEIJING_OFFSET_MS,
  toUtcMs, fromUtcMs, addMinutes, diffMinutes,
  isValidSolarDate, isInSupportedRange, compareWall, beijingNow,
};
