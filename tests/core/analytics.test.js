const test = require('node:test');
const assert = require('node:assert/strict');
const { EVENT_SCHEMA, buildEvent } = require('../../miniprogram/core/analytics');

test('schema covers PRD 17.2', () => {
  assert.deepEqual(Object.keys(EVENT_SCHEMA).sort(), [
    'almanac_day_open', 'app_error', 'article_view', 'convert_submit', 'copy', 'derivation_expand',
    'method_toggle', 'poster_save', 'profile_save', 'result_view', 'reverse_submit', 'share', 'term_tip_open',
  ]);
});
test('valid events pass', () => {
  assert.deepEqual(buildEvent('convert_submit', { calendar: 'solar', precision: 'exact', true_solar: 0, zi_sect: 'late23' }),
    { name: 'convert_submit', params: { calendar: 'solar', precision: 'exact', true_solar: 0, zi_sect: 'late23' } });
  assert.deepEqual(buildEvent('derivation_expand'), { name: 'derivation_expand', params: {} });
  assert.ok(buildEvent('reverse_submit', { result_bucket: '2-5' }));
  assert.ok(buildEvent('article_view', { article: 'K10' }));
  assert.ok(buildEvent('term_tip_open', { term: 'nayin' }));
  assert.ok(buildEvent('app_error', { where: 'result', code: 'calc' }));
});
test('bad events throw', () => {
  assert.throws(() => buildEvent('nope', {}), /BAD_EVENT/);
  assert.throws(() => buildEvent('result_view', { source: 'convert', date: '1990-05-12' }), /BAD_EVENT/);
  assert.throws(() => buildEvent('result_view', { source: '1990-05-12' }), /BAD_EVENT/);
  assert.throws(() => buildEvent('result_view', {}), /BAD_EVENT/);
  assert.throws(() => buildEvent('derivation_expand', { x: 1 }), /BAD_EVENT/);
});
