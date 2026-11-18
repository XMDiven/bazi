const test = require('node:test');
const assert = require('node:assert/strict');
const { ARTICLES, TERMS, getArticle } = require('../../miniprogram/core/articles');
const { findViolations } = require('../../scripts/check-copy');
const { calculate } = require('../../miniprogram/core/calculate');
const { EVENT_SCHEMA } = require('../../miniprogram/core/analytics');

const textOf = a => [a.title, ...a.paragraphs, a.example ? a.example.note : ''].join('\n');

test('10 articles K1–K10, each ≤ 800 chars', () => {
  assert.deepEqual(ARTICLES.map(a => a.id), ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10']);
  for (const a of ARTICLES) assert.ok(Array.from(a.paragraphs.join('')).length <= 800, `${a.id} too long`);
});
test('no banned words', () => {
  for (const a of ARTICLES) assert.deepEqual(findViolations(textOf(a)), [], a.id);
  for (const [k, t] of Object.entries(TERMS)) assert.deepEqual(findViolations(k + t.def), [], k);
});
test('K2 phrase, K9 table only', () => {
  assert.ok(getArticle('K2').paragraphs.join('').includes('四柱干支，俗称生辰八字'));
  assert.ok(!textOf(getArticle('K9')).includes('命'));
  assert.ok(getArticle('K9').paragraphs.join('').includes('甲子、乙丑：海中金'));
  assert.ok(getArticle('K8').paragraphs.join('').includes('丑：己、癸、辛'));
});
test('every example calculates', () => {
  for (const a of ARTICLES.filter(x => x.example)) assert.ok(calculate(a.example.input).summary, a.id);
  assert.ok(ARTICLES.filter(x => x.example).length >= 8);
});
test('terms point to articles and analytics ids', () => {
  const ids = new Set(ARTICLES.map(a => a.id));
  for (const t of Object.values(TERMS)) {
    assert.ok(ids.has(t.article));
    assert.ok(EVENT_SCHEMA.term_tip_open.term.includes(t.id));
  }
  assert.equal(getArticle('K99'), null);
});
