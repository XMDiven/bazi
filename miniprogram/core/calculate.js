// 主换算（PRD 6）。双时刻模型：年柱、月柱用北京时间判定；日柱、时柱用修正后的当地时刻判定。
const { Solar } = require('lunar-javascript');
const { ZI_SECT_TO_LIB } = require('./constants');
const { addMinutes, diffMinutes } = require('./wallTime');
const { isInChinaDst } = require('./dst');
const { trueSolarCorrection } = require('./solarTime');
const { getCityById } = require('./cities');
const { shichenRange } = require('./shichen');
const { validateInput } = require('./validate');
const { findAdjacent, findJieOnDate, liChunOf } = require('./terms');
const { hm } = require('./format');

const DST_MINUTES = -60;
const SHENG_XIAO = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
const PILLAR_DEFS = [
  { key: 'year', label: '年柱', lib: 'Year' },
  { key: 'month', label: '月柱', lib: 'Month' },
  { key: 'day', label: '日柱', lib: 'Day' },
  { key: 'time', label: '时柱', lib: 'Time' },
];
const UNKNOWN_HOUR = 12;
const LAST_MINUTE = { hour: 23, minute: 59 };

function lunarAt(w) {
  return Solar.fromYmdHms(w.year, w.month, w.day, w.hour, w.minute, 0).getLunar();
}

function eightCharAt(w, ziSect) {
  const ec = lunarAt(w).getEightChar();
  ec.setSect(ZI_SECT_TO_LIB[ziSect]);
  return ec;
}

function pillarFrom(ec, def) {
  const wuXing = ec[`get${def.lib}WuXing`]();
  return {
    key: def.key,
    label: def.label,
    gan: ec[`get${def.lib}Gan`](),
    zhi: ec[`get${def.lib}Zhi`](),
    ganWuXing: wuXing[0],
    zhiWuXing: wuXing[1],
    hideGan: ec[`get${def.lib}HideGan`](),
    naYin: ec[`get${def.lib}NaYin`](),
  };
}

const sameWall = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;

/** 年柱、月柱取 beijingWall；日柱、时柱取 localWall */
function pillarsAt(beijingWall, localWall, ziSect) {
  const ecBeijing = eightCharAt(beijingWall, ziSect);
  const ecLocal = sameWall(beijingWall, localWall) ? ecBeijing : eightCharAt(localWall, ziSect);
  return PILLAR_DEFS.map((def, i) => pillarFrom(i < 2 ? ecBeijing : ecLocal, def));
}

const summaryOf = pillars => pillars.map(p => p.gan + p.zhi).join(' ');

/** 对一个输入钟面时刻依次叠加夏令时与真太阳时 */
function resolveInstant(inputWall, input, city) {
  const known = input.precision !== 'unknown';
  const dstEligible = known && isInChinaDst(inputWall);
  const dstApplied = !!input.applyDst && dstEligible;
  const dstMinutes = dstApplied ? DST_MINUTES : 0;
  const beijingWall = addMinutes(inputWall, dstMinutes);
  const trueSolarApplied = !!input.useTrueSolarTime && known && !!city;
  const solar = trueSolarApplied
    ? trueSolarCorrection(beijingWall, city.longitude)
    : { longitudeMinutes: 0, equationMinutes: 0, totalMinutes: 0 };
  const localWall = addMinutes(beijingWall, solar.totalMinutes);
  return {
    beijingWall,
    localWall,
    dstEligible,
    dstApplied,
    trueSolarApplied,
    corrections: {
      dstMinutes,
      longitudeMinutes: solar.longitudeMinutes,
      equationMinutes: solar.equationMinutes,
      totalMinutes: diffMinutes(localWall, inputWall),
    },
  };
}

function atTime(date, hour, minute) {
  return { year: date.year, month: date.month, day: date.day, hour, minute };
}

function unknownHourWarning(solarDate, ziSect) {
  const jie = findJieOnDate(solarDate);
  if (!jie) return null;
  const startWall = atTime(solarDate, 0, 0);
  const endWall = atTime(solarDate, LAST_MINUTE.hour, LAST_MINUTE.minute);
  const [by, bm] = pillarsAt(startWall, startWall, ziSect);
  const [ay, am] = pillarsAt(endWall, endWall, ziSect);
  const yearDiffers = by.gan + by.zhi !== ay.gan + ay.zhi;
  const monthDiffers = bm.gan + bm.zhi !== am.gan + am.zhi;
  if (!yearDiffers && !monthDiffers) return null;
  const head = `当天 ${hm(jie.wall)} 交${jie.name}，时辰不详时`;
  if (yearDiffers) {
    return `${head}年柱、月柱无法确定（交节前：${by.gan}${by.zhi}年 ${bm.gan}${bm.zhi}月；交节后：${ay.gan}${ay.zhi}年 ${am.gan}${am.zhi}月）`;
  }
  return `${head}月柱无法确定（交节前：${bm.gan}${bm.zhi}月；交节后：${am.gan}${am.zhi}月）`;
}

function shichenWarning(solarDate, input, city, midSummary) {
  const range = shichenRange(solarDate, input.shichen);
  const summaryAt = w => {
    const r = resolveInstant(w, input, city);
    return summaryOf(pillarsAt(r.beijingWall, r.localWall, input.ziSect));
  };
  const startSummary = summaryAt(range.start);
  const endSummary = summaryAt(range.end);
  if (startSummary === midSummary && endSummary === midSummary) return null;
  return `该时辰内四柱可能不同：开始时为 ${startSummary}，结束时为 ${endSummary}`;
}

function countWuXing(pillars) {
  const count = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const p of pillars) {
    count[p.ganWuXing] += 1;
    count[p.zhiWuXing] += 1;
  }
  return count;
}

function inputWallOf(input, solarDate) {
  if (input.precision === 'exact') return atTime(solarDate, input.hour, input.minute);
  if (input.precision === 'shichen') return shichenRange(solarDate, input.shichen).mid;
  return atTime(solarDate, UNKNOWN_HOUR, 0);
}

/** @returns {Result} */
function calculate(input) {
  const { ok, solarDate } = validateInput(input);
  if (!ok) throw new Error('INVALID_INPUT');

  const city = getCityById(input.cityId);
  const inputWall = inputWallOf(input, solarDate);
  const instant = resolveInstant(inputWall, input, city);
  const { beijingWall, localWall } = instant;

  let pillars = pillarsAt(beijingWall, localWall, input.ziSect);
  const warnings = [];
  if (input.precision === 'unknown') {
    pillars = pillars.slice(0, 3);
    const warning = unknownHourWarning(solarDate, input.ziSect);
    if (warning) warnings.push(warning);
  }
  const summary = summaryOf(pillars);
  if (input.precision === 'shichen') {
    const warning = shichenWarning(solarDate, input, city, summary);
    if (warning) warnings.push(warning);
  }

  const shengXiao = SHENG_XIAO[pillars[0].zhi];
  const byNewYear = lunarAt(beijingWall).getYearShengXiao();
  const adjacentAll = findAdjacent(beijingWall, { jieOnly: false });
  const adjacentJie = findAdjacent(beijingWall, { jieOnly: true });

  return {
    input,
    inputWall,
    beijingWall,
    localWall,
    corrections: instant.corrections,
    method: {
      dstApplied: instant.dstApplied,
      dstEligible: instant.dstEligible,
      trueSolarApplied: instant.trueSolarApplied,
      city: city ? { id: city.id, name: city.name, longitude: city.longitude } : null,
    },
    pillars,
    summary,
    lunarText: lunarAt(localWall).toString(),
    shengXiao,
    shengXiaoNote: byNewYear === shengXiao ? null : `按春节为${byNewYear}`,
    wuXingCount: countWuXing(pillars),
    terms: {
      prevTerm: adjacentAll.prev,
      nextTerm: adjacentAll.next,
      prevJie: adjacentJie.prev,
      nextJie: adjacentJie.next,
      liChun: liChunOf(beijingWall.year),
    },
    warnings,
  };
}

module.exports = { calculate, pillarsAt, summaryOf, lunarAt, SHENG_XIAO };
