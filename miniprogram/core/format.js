// 展示格式（PRD 14.1）
const { beijingNow } = require('./wallTime');

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

module.exports = { pad2, dateCn, monthDayCn, hm, weekdayCn, minutesDelta, relativeTime };
