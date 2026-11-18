// 换算与反查双向一致性验证（PRD 8.3 / 1.2）：随机 5,000 个过去时刻，两种子时派别各一半。发布前运行。
const { reverseLookup } = require('../miniprogram/core/reverse');
const { pillarsAt } = require('../miniprogram/core/calculate');
const { toUtcMs, fromUtcMs } = require('../miniprogram/core/wallTime');

const TOTAL = Number(process.argv[2]) || 5000;
const SEED = 20261117;
const NOW = { year: 2026, month: 11, day: 17, hour: 12, minute: 0 };

function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

const pad = n => String(n).padStart(2, '0');
const fmt = t => `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`;
const gzAt = (t, sect) => pillarsAt(t, t, sect).map(p => p.gan + p.zhi);

function checkOne(t, sect) {
  const p = gzAt(t, sect);
  const hits = reverseLookup({ year: p[0], month: p[1], day: p[2], time: p[3] }, sect, NOW);
  const tm = toUtcMs(t);
  if (!hits.some(h => toUtcMs(h.start) <= tm && tm <= toUtcMs(h.end))) return `${fmt(t)} ${sect} ${p.join(' ')}: not found`;
  for (const h of hits) {
    for (const edge of [h.start, h.end]) {
      if (gzAt(edge, sect).join(' ') !== p.join(' ')) return `${fmt(t)} ${sect}: hit edge ${fmt(edge)} maps to other pillars`;
    }
    if (toUtcMs(h.end) > toUtcMs(NOW)) return `${fmt(t)} ${sect}: hit after now`;
  }
  return null;
}

function main() {
  const rand = lcg(SEED);
  const lo = toUtcMs({ year: 1900, month: 1, day: 1, hour: 0, minute: 0 }) / 60000;
  const hi = toUtcMs(NOW) / 60000;
  const failures = [];
  for (let i = 0; i < TOTAL; i++) {
    const t = fromUtcMs((lo + Math.floor(rand() * (hi - lo + 1))) * 60000);
    const failure = checkOne(t, i % 2 ? 'midnight' : 'late23');
    if (failure) failures.push(failure);
  }
  if (failures.length) {
    failures.slice(0, 20).forEach(f => console.error(f));
    console.error(`${TOTAL - failures.length}/${TOTAL} ok`);
    return 1;
  }
  console.log(`${TOTAL}/${TOTAL} ok`);
  return 0;
}

process.exit(main());
