// 两个算法设置的大白话文案、子时派别显隐与真太阳时即时预览（PRD 5.5）
const { calculate } = require('./calculate');
const { validateInput } = require('./validate');
const { getCityById } = require('./cities');
const { diffMinutes } = require('./wallTime');
const { hm } = require('./format');

const MINUS = '−';

const METHOD_COPY = {
  ziSect: { title: '晚上 11 点后出生，日柱算哪天？', hint: '子时派别 · 两种说法都常见，不确定就用默认' },
  trueSolar: { title: '按出生地校正时间', hint: '真太阳时 · 各地天亮早晚不同，新疆与北京相差约 2 小时' },
};

const ZI_SECT_ITEMS = [
  { key: 'late23', text: '算第二天', sub: '23:00 换日' },
  { key: 'midnight', text: '算当天', sub: '0:00 换日' },
];

const fingerprint = result => `${result.summary}|${result.warnings.join('|')}`;

/** 两种子时派别的四柱或边界提示是否不同；输入不完整时按不开真太阳时判断 */
function ziSectMatters(input) {
  const cityMissing = input.useTrueSolarTime && !getCityById(input.cityId);
  const base = cityMissing ? { ...input, useTrueSolarTime: false } : input;
  if (!validateInput(base).ok) return false;
  return fingerprint(calculate({ ...base, ziSect: 'late23' })) !== fingerprint(calculate({ ...base, ziSect: 'midnight' }));
}

/** '−2 小时 24 分' | '+8 分' */
function signedDuration(minutes) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const body = h ? `${h} 小时${m ? ` ${m} 分` : ''}` : `${m} 分`;
  return `${minutes < 0 ? MINUS : '+'}${body}`;
}

function pillarChanges(before, after) {
  const changes = after.pillars
    .map((p, i) => ({ label: p.label, from: before.pillars[i].gan + before.pillars[i].zhi, to: p.gan + p.zhi }))
    .filter(c => c.from !== c.to)
    .map(c => `${c.label}由 ${c.from} 变为 ${c.to}`);
  return changes.length ? changes.join('，') : '四柱不变';
}

/** @returns {{shift: string, change: string} | null} */
function trueSolarPreview(input) {
  if (!input.useTrueSolarTime || input.precision === 'unknown' || !getCityById(input.cityId)) return null;
  if (!validateInput(input).ok) return null;
  const on = calculate(input);
  const off = calculate({ ...input, useTrueSolarTime: false });
  const delta = signedDuration(diffMinutes(on.localWall, on.beijingWall));
  const shift = input.precision === 'exact'
    ? `校正后 ${hm(on.localWall)}（北京时间 ${delta}）`
    : `按时辰中点校正 ${delta}`;
  return { shift, change: pillarChanges(off, on) };
}

module.exports = { METHOD_COPY, ZI_SECT_ITEMS, ziSectMatters, trueSolarPreview };
