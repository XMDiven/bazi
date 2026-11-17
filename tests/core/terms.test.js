const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../miniprogram/core/terms');
const { w, NOW, pad } = require('../helpers');

test('立春 exact times', () => {
  for (const [y, t] of [[2000, '2000-02-04 20:40'], [2023, '2023-02-04 10:42'], [2024, '2024-02-04 16:27'], [2025, '2025-02-03 22:10']]) {
    const lc = T.liChunOf(y);
    assert.equal(`${y}-${pad(lc.wall.month)}-${pad(lc.wall.day)} ${pad(lc.wall.hour)}:${pad(lc.wall.minute)}`, t);
  }
});
test('adjacent by instant', () => {
  const a = T.findAdjacent(w(2024, 2, 4, 16, 27), { jieOnly: true });
  assert.equal(a.prev.name, '小寒');
  assert.equal(a.next.name, '立春');
  assert.equal(T.findAdjacent(w(2024, 2, 4, 16, 28), { jieOnly: true }).prev.name, '立春');
});
test('adjacent incl. 中气', () => {
  const a = T.findAdjacent(w(1990, 5, 12, 12, 0), { jieOnly: false });
  assert.deepEqual([a.prev.name, a.next.name], ['立夏', '小满']);
});
test('getTermsAround uses Chinese names and is sorted', () => {
  const ts = T.getTermsAround(w(2024, 6, 1));
  assert.ok(ts.every(t => /^[一-龥]{2}$/.test(t.name)));
  assert.ok(ts.every((t, i) => i === 0 || ts[i - 1].utcMs < t.utcMs));
  assert.equal(ts.find(t => t.name === '立春' && t.wall.year === 2024).isJie, true);
  assert.equal(ts.find(t => t.name === '雨水').isJie, false);
});
test('findJieOnDate', () => {
  assert.equal(T.findJieOnDate({ year: 2024, month: 2, day: 4 }).name, '立春');
  assert.equal(T.findJieOnDate({ year: 2024, month: 2, day: 19 }), null); // 雨水是中气
});
test('yearTerms 2024', () => {
  const ts = T.yearTerms(2024);
  assert.equal(ts.length, 24);
  assert.equal(ts[0].name, '小寒');
  assert.equal(ts[23].name, '冬至');
});
test('yearTerms at range edges', () => {
  assert.equal(T.yearTerms(1900).length, 24);
  assert.equal(T.yearTerms(2100).length, 24);
});
test('nextTermFrom NOW', () => assert.deepEqual(((r) => [r.term.name, r.days])(T.nextTermFrom(NOW)), ['小雪', 5]));
