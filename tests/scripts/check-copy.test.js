const test = require('node:test');
const assert = require('node:assert/strict');
const { findViolations } = require('../../scripts/check-copy');
const { DISCLAIMER } = require('../../miniprogram/core/constants');

test('word hit', () => assert.deepEqual(findViolations('今日运势'), [{ kind: 'word', value: '运势', line: 1 }]));
test('api hit', () => {
  const v = findViolations('ok\nL.getDayYi()');
  assert.equal(v.length, 1);
  assert.deepEqual(v[0], { kind: 'api', value: 'getDayYi', line: 2 });
  assert.equal(findViolations('x.getDayChongDesc()')[0].value, 'getDayChong');
});
test('safe api names are not hit', () => assert.deepEqual(findViolations('l.getDayGan(); l.getDayInGanZhi(); l.getDayInChinese();'), []));
test('disclaimer allowed', () => assert.deepEqual(findViolations(`const D = '${DISCLAIMER}';`), []));
