const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPosterSpec } = require('../../miniprogram/core/poster');
const { buildResultView } = require('../../miniprogram/core/resultView');
const { calculate } = require('../../miniprogram/core/calculate');
const { DISCLAIMER, APP_NAME } = require('../../miniprogram/core/constants');
const { makeInput } = require('../helpers');

test('poster spec', () => {
  const spec = buildPosterSpec(buildResultView(calculate(makeInput({ useTrueSolarTime: true, cityId: '新疆维吾尔自治区-乌鲁木齐' }))));
  assert.deepEqual(spec.lines.map(l => l.role), ['title', 'pillars', 'body', 'small']);
  assert.equal(spec.lines[0].text, APP_NAME);
  assert.equal(spec.lines[3].text, DISCLAIMER);
  assert.equal(spec.columns.length, 4);
  assert.deepEqual(spec.columns[0], { label: '年柱', gan: '庚', zhi: '午' });
  assert.ok(!JSON.stringify(spec).includes('乌鲁木齐'));
});
