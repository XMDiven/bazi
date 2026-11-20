const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeInput, decodeInput } = require('../../miniprogram/core/queryCodec');
const { makeInput } = require('../helpers');

test('round trip', () => {
  for (const input of [makeInput(), makeInput({ calendar: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: true, precision: 'shichen', shichen: 12, useTrueSolarTime: true, cityId: '新疆维吾尔自治区-乌鲁木齐', ziSect: 'midnight' })]) {
    const s = encodeInput(input);
    assert.equal(typeof s, 'string');
    assert.deepEqual(decodeInput(s), input);
    assert.deepEqual(decodeInput(decodeURIComponent(s)), input);
  }
});
test('garbage → null', () => {
  for (const bad of ['', 'abc', '%E0%A4%A', '{"year":1990}', encodeInput(makeInput({ month: 13 })), null, undefined, '[]', 'null']) {
    assert.equal(decodeInput(bad), null, String(bad));
  }
});
test('drops unknown fields', () => {
  const s = encodeURIComponent(JSON.stringify({ ...makeInput(), evil: 1 }));
  assert.deepEqual(decodeInput(s), makeInput());
});
