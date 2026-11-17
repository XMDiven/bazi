const test = require('node:test');
const assert = require('node:assert/strict');
const { reverseLookup } = require('../../miniprogram/core/reverse');
const { pillarsAt } = require('../../miniprogram/core/calculate');
const { toUtcMs, fromUtcMs } = require('../../miniprogram/core/wallTime');
const { w, NOW, fmt } = require('../helpers');

const R = (p, s = 'late23', now = NOW) => reverseLookup(p, s, now).map(h => [fmt(h.start), fmt(h.end), h.hasJie]);

test('known date', () => assert.deepEqual(R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }), [
  ['1990-05-12 11:00', '1990-05-12 12:59', false], ['1930-05-27 11:00', '1930-05-27 12:59', false]]));
test('jie inside shichen is clipped', () => assert.deepEqual(R({ year: '甲辰', month: '丙寅', day: '戊戌', time: '庚申' })[0], ['2024-02-04 16:28', '2024-02-04 16:59', true]));
test('late23 zi merges across midnight', () => assert.deepEqual(R({ year: '甲辰', month: '丁卯', day: '甲戌', time: '甲子' })[0], ['2024-03-10 23:00', '2024-03-11 00:59', false]));
test('midnight sect late zi', () => assert.deepEqual(R({ year: '甲辰', month: '丁卯', day: '癸酉', time: '甲子' }, 'midnight')[0], ['2024-03-10 23:00', '2024-03-10 23:59', false]));
test('never after now', () => assert.deepEqual(R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }, 'late23', w(1990, 5, 12, 12, 0))[0], ['1990-05-12 11:00', '1990-05-12 12:00', false]));
test('impossible combo → []', () => assert.deepEqual(R({ year: '庚午', month: '甲子', day: '丁丑', time: '丙午' }), []));
test('no time: by day, merged', () => {
  const hits = R({ year: '庚午', month: '辛巳', day: '丁丑', time: null });
  assert.deepEqual(hits[0], ['1990-05-11 23:00', '1990-05-12 22:59', false]);
  assert.deepEqual(R({ year: '庚午', month: '辛巳', day: '丁丑', time: null }, 'midnight')[0], ['1990-05-12 00:00', '1990-05-12 23:59', false]);
});
test('no time on 立春 day is clipped', () => {
  assert.deepEqual(R({ year: '甲辰', month: '丙寅', day: '戊戌', time: null })[0], ['2024-02-04 16:28', '2024-02-04 22:59', true]);
});

// 固定种子的线性同余发生器
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

test('round trip on 200 random past instants', () => {
  const rand = lcg(20261117);
  const lo = toUtcMs(w(1900, 1, 1)) / 60000;
  const hi = toUtcMs(NOW) / 60000;
  for (let i = 0; i < 200; i++) {
    const sect = i % 2 ? 'midnight' : 'late23';
    const t = fromUtcMs((lo + Math.floor(rand() * (hi - lo + 1))) * 60000);
    const p = pillarsAt(t, t, sect).map(x => x.gan + x.zhi);
    const hits = reverseLookup({ year: p[0], month: p[1], day: p[2], time: p[3] }, sect, NOW);
    const tm = toUtcMs(t);
    assert.ok(hits.some(h => toUtcMs(h.start) <= tm && tm <= toUtcMs(h.end)), `${fmt(t)} ${sect} ${p.join(' ')}`);
    for (const h of hits) {
      for (const edge of [h.start, h.end]) {
        assert.deepEqual(pillarsAt(edge, edge, sect).map(x => x.gan + x.zhi), p, `edge ${fmt(edge)}`);
      }
    }
  }
});
test('perf < 500ms per lookup', () => { const t = Date.now(); R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }); assert.ok(Date.now() - t < 500); });
