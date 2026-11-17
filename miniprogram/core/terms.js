// 节气（按时刻比较）。不使用库的 getPrevJie/getNextJie：它们按日判断，交节当天会出错。
const { Solar } = require('lunar-javascript');
const { toUtcMs, diffMinutes } = require('./wallTime');

const JIE_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const MONTH_ZHI_BY_JIE = {
  立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未',
  立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子', 小寒: '丑',
};
// 库的节气表在首尾用大写拼音键表示相邻年份的节气
const PINYIN_TO_NAME = {
  DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒',
  LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰',
};
const JIE_SET = new Set(JIE_NAMES);

const tableCache = new Map();

/** 库中“以 y 年 6 月所在农历年”为准的节气表，转换为 SolarTerm[] */
function libTable(y) {
  if (tableCache.has(y)) return tableCache.get(y);
  const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
  const terms = Object.keys(table).map(key => {
    const s = table[key];
    const name = PINYIN_TO_NAME[key] || key;
    const wall = { year: s.getYear(), month: s.getMonth(), day: s.getDay(), hour: s.getHour(), minute: s.getMinute() };
    return { name, isJie: JIE_SET.has(name), utcMs: toUtcMs(wall) + s.getSecond() * 1000, wall };
  });
  tableCache.set(y, terms);
  return terms;
}

const aroundCache = new Map();

/** w 所在年份及前后各一年的节气，按时刻排序去重 */
function getTermsAround(w) {
  const y = w.year;
  if (aroundCache.has(y)) return aroundCache.get(y);
  const byMs = new Map();
  for (const t of [...libTable(y - 1), ...libTable(y), ...libTable(y + 1)]) byMs.set(t.utcMs, t);
  const list = [...byMs.values()].sort((a, b) => a.utcMs - b.utcMs);
  aroundCache.set(y, list);
  return list;
}

/** prev：时刻 ≤ w（w 的秒按 0 计）的最后一个；next：时刻 > w 的第一个 */
function findAdjacent(w, { jieOnly }) {
  const t = toUtcMs(w);
  const list = getTermsAround(w).filter(x => !jieOnly || x.isJie);
  let prev = null;
  let next = null;
  for (const x of list) {
    if (x.utcMs <= t) prev = x;
    else { next = x; break; }
  }
  return { prev, next };
}

function liChunOf(year) {
  return getTermsAround({ year }).find(t => t.name === '立春' && t.wall.year === year);
}

const sameDate = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

function termOnDate(dateParts, { jieOnly }) {
  return getTermsAround(dateParts).find(t => (!jieOnly || t.isJie) && sameDate(t.wall, dateParts)) || null;
}

function findJieOnDate(dateParts) {
  return termOnDate(dateParts, { jieOnly: true });
}

function yearTerms(year) {
  return getTermsAround({ year }).filter(t => t.wall.year === year);
}

/** 下一个节气及相差的北京日期天数 */
function nextTermFrom(w) {
  const { next } = findAdjacent(w, { jieOnly: false });
  const day = p => ({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0 });
  return { term: next, days: diffMinutes(day(next.wall), day(w)) / 1440 };
}

module.exports = {
  JIE_NAMES, MONTH_ZHI_BY_JIE,
  getTermsAround, findAdjacent, liChunOf, termOnDate, findJieOnDate, yearTerms, nextTermFrom,
};
