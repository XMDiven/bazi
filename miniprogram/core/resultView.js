// 结果页展示模型（PRD 7.1 / 7.2）。页面只 setData，不自己拼字符串。
const { DISCLAIMER, ZI_SECT_LABEL } = require('./constants');
const { FEATURES } = require('./features');
const { SHICHEN } = require('./shichen');
const { buildDerivation } = require('./derivation');
const { dateCn, monthDayCn, hm, minutesDelta } = require('./format');

const WU_XING_ORDER = ['金', '木', '水', '火', '土'];

/** '1990年5月12日 12:00' / '1990年5月12日 午时' / '1990年5月12日 时辰不详' */
function inputTimeText(result) {
  const { input, inputWall } = result;
  if (input.precision === 'exact') return `${dateCn(inputWall)} ${hm(inputWall)}`;
  if (input.precision === 'shichen') return `${dateCn(inputWall)} ${SHICHEN[input.shichen].name}`;
  return `${dateCn(inputWall)} 时辰不详`;
}

/** '一九九〇年四月十八' → '农历四月十八' */
const lunarShort = lunarText => `农历${lunarText.slice(lunarText.indexOf('年') + 1)}`;

function shengXiaoText(result) {
  return result.shengXiaoNote ? `${result.shengXiao}（按立春）· ${result.shengXiaoNote}` : result.shengXiao;
}

function methodChips(result) {
  const chips = [
    { kind: 'zi_sect', text: ZI_SECT_LABEL[result.input.ziSect] },
    { kind: 'true_solar', text: `真太阳时 ${result.method.trueSolarApplied ? '开' : '关'}` },
  ];
  if (result.method.dstEligible) chips.push({ kind: 'dst', text: `夏令时 ${result.method.dstApplied ? '已扣除' : '未扣除'}` });
  return chips;
}

function tableColumns(result, features) {
  return result.pillars.map(p => ({
    key: p.key,
    label: p.label,
    gan: p.gan,
    ganWuXing: p.ganWuXing,
    zhi: p.zhi,
    zhiWuXing: p.zhiWuXing,
    hideGanText: features.hideGan ? p.hideGan.join('、') : null,
    naYin: features.naYin ? p.naYin : null,
    a11y: `${p.label}，天干${p.gan}，五行${p.ganWuXing}，地支${p.zhi}，五行${p.zhiWuXing}`,
  }));
}

function timeLines(result) {
  const { method, corrections, localWall } = result;
  const lines = [`输入时间 ${inputTimeText(result)}`];
  if (!method.dstApplied && !method.trueSolarApplied) return lines;
  if (method.dstApplied) lines.push(`夏令时 ${minutesDelta(corrections.dstMinutes)}`);
  if (method.trueSolarApplied) {
    lines.push(`经度 ${minutesDelta(corrections.longitudeMinutes)}`, `均时差 ${minutesDelta(corrections.equationMinutes)}`);
  }
  lines.push(`修正后 ${dateCn(localWall)} ${hm(localWall)}`);
  if (method.trueSolarApplied) lines.push(`出生地 ${method.city.name}`);
  return lines;
}

const termLine = (label, t) => `${label} ${t.name} ${monthDayCn(t.wall)} ${hm(t.wall)}`;

function buildResultView(result, features = FEATURES) {
  const columns = tableColumns(result, features);
  return {
    summary: result.summary,
    summaryGroups: result.pillars.map(p => p.gan + p.zhi),
    subline: `${inputTimeText(result)} · ${lunarShort(result.lunarText)} · ${shengXiaoText(result)}`,
    lunarShort: lunarShort(result.lunarText),
    shengXiaoText: shengXiaoText(result),
    methodChips: methodChips(result),
    warnings: result.warnings,
    table: { columns, showHideGan: !!features.hideGan, showNaYin: !!features.naYin },
    wuXingText: features.wuXingCount
      ? WU_XING_ORDER.map(k => `${k} ${result.wuXingCount[k]}`).join(' · ')
      : null,
    timeLines: timeLines(result),
    termsLines: [termLine('上一节气', result.terms.prevTerm), termLine('下一节气', result.terms.nextTerm)],
    termsYear: result.beijingWall.year,
    derivation: buildDerivation(result),
    disclaimer: DISCLAIMER,
  };
}

function diffPillars(before, after) {
  const changed = after.pillars.filter((p, i) => {
    const b = before.pillars[i];
    return !b || b.gan + b.zhi !== p.gan + p.zhi;
  });
  if (!changed.length) return { changedKeys: [], toast: '四柱未变化' };
  const toast = changed.map(p => {
    const b = before.pillars.find(x => x.key === p.key);
    return `${p.label}：${b ? b.gan + b.zhi : '—'} → ${p.gan}${p.zhi}`;
  }).join('；');
  return { changedKeys: changed.map(p => p.key), toast };
}

module.exports = { buildResultView, diffPillars, inputTimeText, lunarShort };
