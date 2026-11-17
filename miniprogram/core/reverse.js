// 四柱反查（PRD 8）：只列 1900 年至 nowWall 之间的时刻，结果为北京时间，不做任何修正。
const { MIN_DATE } = require('./constants');
const { toUtcMs, fromUtcMs, MINUTE_MS } = require('./wallTime');
const { MONTH_ZHI_BY_JIE, getTermsAround } = require('./terms');
const { SHICHEN, shichenRange } = require('./shichen');
const { pillarsAt } = require('./calculate');
const { JIA_ZI } = require('./pillarOptions');

const DAY_MS = 1440 * MINUTE_MS;
const LATE_ZI = SHICHEN.length - 1;
const JIE_BY_MONTH_ZHI = Object.fromEntries(Object.entries(MONTH_ZHI_BY_JIE).map(([jie, zhi]) => [zhi, jie]));
// 日柱按六十甲子连续循环：2000-01-01 为戊午
const DAY_ANCHOR_MS = Date.UTC(2000, 0, 1);
const DAY_ANCHOR_INDEX = JIA_ZI.indexOf('戊午');

const toMinute = w => toUtcMs(w) / MINUTE_MS;
const fromMinute = m => fromUtcMs(m * MINUTE_MS);

function dayGanZhi(dateMs) {
  const n = Math.round((dateMs - DAY_ANCHOR_MS) / DAY_MS);
  return JIA_ZI[(((DAY_ANCHOR_INDEX + n) % 60) + 60) % 60];
}

/** 目标年柱、月柱对应的“节”窗口 [start, end)，单位为毫秒（钟面时间按 UTC 编码） */
function monthWindow(year, monthZhi) {
  const jieName = JIE_BY_MONTH_ZHI[monthZhi];
  const termYear = jieName === '小寒' ? year + 1 : year;
  const jies = getTermsAround({ year: termYear }).filter(t => t.isJie);
  const i = jies.findIndex(t => t.name === jieName && t.wall.year === termYear);
  return { startMs: jies[i].utcMs, endMs: jies[i + 1].utcMs };
}

function candidateYears(yearGZ, lastYear) {
  const years = [];
  for (let y = MIN_DATE.year - 1; y <= lastYear; y++) {
    const mid = { year: y, month: 7, day: 1, hour: 12, minute: 0 };
    const [p] = pillarsAt(mid, mid, 'late23');
    if (p.gan + p.zhi === yearGZ) years.push(y);
  }
  return years;
}

function makeMatcher(target, ziSect) {
  const want = [target.year, target.month, target.day, target.time].filter(Boolean);
  return minute => {
    const t = fromMinute(minute);
    const got = pillarsAt(t, t, ziSect);
    return want.every((gz, i) => got[i].gan + got[i].zhi === gz);
  };
}

/** 在 [lo, hi] 中找第一个与 lo 状态不同的分钟（区间内只有一次变化） */
function firstFlip(lo, hi, matches) {
  const startState = matches(lo);
  let a = lo;
  let b = hi;
  while (b - a > 1) {
    const mid = Math.floor((a + b) / 2);
    if (matches(mid) === startState) a = mid;
    else b = mid;
  }
  return b;
}

/** 一个时辰块内的命中段；块内日柱、时柱不变，最多发生一次交节 */
function blockHit(lo, hi, matches) {
  const head = matches(lo);
  const tail = matches(hi);
  if (head && tail) return { start: lo, end: hi, hasJie: false };
  if (!head && !tail) return null;
  const flip = firstFlip(lo, hi, matches);
  return head ? { start: lo, end: flip - 1, hasJie: true } : { start: flip, end: hi, hasJie: true };
}

function mergeAdjacent(segments) {
  const merged = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && last.end + 1 === s.start) {
      last.end = s.end;
      last.hasJie = last.hasJie || s.hasJie;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

/**
 * @param {{year:string, month:string, day:string, time:string|null}} target
 * @param {'late23'|'midnight'} ziSect
 * @param {WallTime} nowWall 当前北京时间，由调用方传入
 * @returns {{start:WallTime, end:WallTime, hasJie:boolean}[]} 按时间倒序
 */
function reverseLookup(target, ziSect, nowWall) {
  const monthZhi = target.month && target.month[1];
  if (!target.year || !target.day || !JIE_BY_MONTH_ZHI[monthZhi]) return [];
  const minMinute = toMinute({ ...MIN_DATE, hour: 0, minute: 0 });
  const maxMinute = toMinute(nowWall);
  const matches = makeMatcher(target, ziSect);
  const segments = [];

  for (const year of candidateYears(target.year, nowWall.year)) {
    const { startMs, endMs } = monthWindow(year, monthZhi);
    const firstDay = Math.floor(startMs / DAY_MS) * DAY_MS;
    for (let dayMs = firstDay; dayMs < endMs; dayMs += DAY_MS) {
      const date = fromUtcMs(dayMs);
      const todayGZ = dayGanZhi(dayMs);
      for (const s of SHICHEN) {
        const blockDayGZ = s.index === LATE_ZI && ziSect === 'late23' ? dayGanZhi(dayMs + DAY_MS) : todayGZ;
        if (blockDayGZ !== target.day) continue;
        const range = shichenRange(date, s.index);
        const lo = Math.max(toMinute(range.start), minMinute);
        const hi = Math.min(toMinute(range.end), maxMinute);
        if (lo > hi) continue;
        const hit = blockHit(lo, hi, matches);
        if (hit) segments.push(hit);
      }
    }
  }

  segments.sort((a, b) => a.start - b.start);
  return mergeAdjacent(segments)
    .reverse()
    .map(s => ({ start: fromMinute(s.start), end: fromMinute(s.end), hasJie: s.hasJie }));
}

module.exports = { reverseLookup, dayGanZhi };
