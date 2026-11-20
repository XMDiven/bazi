// 十三时辰（子时拆为早子时、晚子时，PRD 5.1）
const { pad2 } = require('./format');
const { BOUNDARY } = require('./constants');

const NAMES = ['早子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '晚子时'];

// 每个时辰的起止（小时），早子时 0:00–0:59，晚子时 23:00–23:59，其余 2 小时
function bounds(index) {
  if (index === 0) return { startHour: 0, endHour: 0 };
  if (index === 12) return { startHour: 23, endHour: 23 };
  const startHour = index * 2 - 1;
  return { startHour, endHour: startHour + 1 };
}

const SHICHEN = NAMES.map((name, index) => {
  const { startHour, endHour } = bounds(index);
  return { index, name, start: `${pad2(startHour)}:00`, end: `${pad2(endHour)}:59` };
});

function shichenRange(dateParts, index) {
  const { startHour, endHour } = bounds(index);
  const at = (hour, minute) => ({ year: dateParts.year, month: dateParts.month, day: dateParts.day, hour, minute });
  const single = startHour === endHour;
  return {
    start: at(startHour, 0),
    end: at(endHour, 59),
    mid: single ? at(startHour, 30) : at(endHour, 0),
  };
}

function shichenOf(w) {
  if (w.hour === 0) return 0;
  if (w.hour === 23) return 12;
  return Math.floor((w.hour + 1) / 2);
}

/**
 * 滚轮下方的即时说明，如「08:59 · 辰时（距巳时 1 分钟）」。
 * 按钟表时间算（不含真太阳时修正）；分界点与阈值同 boundary.js 的时辰提示：奇数整点，距离严格小于阈值才提示。
 */
function clockTimeHint(hour, minute) {
  const m = hour * 60 + minute;
  const current = SHICHEN[shichenOf({ hour, minute })].name;
  let hint = '';
  for (let h = 1; h <= 23; h += 2) {
    const distance = m - h * 60;
    if (Math.abs(distance) >= BOUNDARY.SHICHEN_MINUTES) continue;
    if (distance < 0) hint = `（距${SHICHEN[shichenOf({ hour: h, minute: 0 })].name} ${-distance} 分钟）`;
    else hint = distance === 0 ? `（刚进入${current}）` : `（刚进入${current} ${distance} 分钟）`;
  }
  return `${pad2(hour)}:${pad2(minute)} · ${current}${hint}`;
}

module.exports = { SHICHEN, shichenRange, shichenOf, clockTimeHint };
