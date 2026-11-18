// 展示格式（PRD 14.1）
const { beijingNow, isValidSolarDate, isInSupportedRange } = require('./wallTime');

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MINUS = '−';

const pad2 = n => String(n).padStart(2, '0');

const dateCn = p => `${p.year}年${p.month}月${p.day}日`;
const monthDayCn = p => `${p.month}月${p.day}日`;
const hm = w => `${pad2(w.hour)}:${pad2(w.minute)}`;
const weekdayCn = p => WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];

/** '−129.5 分钟' | '+3.8 分钟' | '0.0 分钟' */
function minutesDelta(n) {
  const text = Math.abs(n).toFixed(1);
  if (text === '0.0') return '0.0 分钟';
  return `${n < 0 ? MINUS : '+'}${text} 分钟`;
}

function dayNumber(w) {
  return Date.UTC(w.year, w.month - 1, w.day) / 86400000;
}

/** 相对时间，按北京日期判断“昨天”“同一年” */
function relativeTime(nowMs, thenMs) {
  const diff = nowMs - thenMs;
  if (diff < 60e3) return '刚刚';
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)} 分钟前`;
  const now = beijingNow(nowMs);
  const then = beijingNow(thenMs);
  const dayGap = dayNumber(now) - dayNumber(then);
  if (dayGap === 0) return `${Math.floor(diff / 3600e3)} 小时前`;
  if (dayGap === 1) return '昨天';
  if (now.year === then.year) return monthDayCn(then);
  return dateCn(then);
}

const isoDate = p => `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;

/** 'YYYY-MM-DD' → DateParts；不存在或超出 1900–2100 时返回 null */
function parseIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const p = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidSolarDate(p.year, p.month, p.day) && isInSupportedRange(p) ? p : null;
}

module.exports = { pad2, dateCn, monthDayCn, hm, weekdayCn, minutesDelta, relativeTime, isoDate, parseIsoDate };
