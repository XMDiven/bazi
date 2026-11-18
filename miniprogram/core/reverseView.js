// 反查结果的展示与跳转（PRD 8.2）
const { Solar } = require('lunar-javascript');
const { shichenOf } = require('./shichen');
const { dateCn, monthDayCn, weekdayCn, hm } = require('./format');

const sameDate = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

function lunarShort(w) {
  const l = Solar.fromYmd(w.year, w.month, w.day).getLunar();
  return `农历${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

function rangeText({ start, end }) {
  if (sameDate(start, end)) return `${hm(start)}–${hm(end)}`;
  return `${hm(start)} – ${monthDayCn(end)} ${hm(end)}`;
}

function buildReverseItems(hits) {
  return hits.map((hit, index) => {
    const parts = [`${dateCn(hit.start)} ${weekdayCn(hit.start)}`, rangeText(hit), lunarShort(hit.start)];
    if (hit.hasJie) parts.push('含交节');
    return { index, text: parts.join(' · ') };
  });
}

/** 点击一条反查结果时的换算输入：填了时柱按“只知时辰”，否则按“不详” */
function inputForHit(hit, hasTime, ziSect) {
  const base = {
    calendar: 'solar', isLeapMonth: false, hour: 12, minute: 0, shichen: 6,
    cityId: null, useTrueSolarTime: false, ziSect, applyDst: false,
  };
  if (hasTime) {
    const { year, month, day } = hit.start;
    return { ...base, year, month, day, precision: 'shichen', shichen: shichenOf(hit.start) };
  }
  // 按日命中时，“23:00 换日”的段从前一天 23:00 开始，主日是段末那一天
  const { year, month, day } = hit.end;
  return { ...base, year, month, day, precision: 'unknown' };
}

module.exports = { buildReverseItems, inputForHit };
