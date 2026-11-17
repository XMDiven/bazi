const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../miniprogram/core/dst');
const { w } = require('../helpers');

test('six periods', () => assert.equal(D.CHINA_DST_PERIODS.length, 6));
test('1990 boundaries', () => {
  assert.equal(D.isInChinaDst(w(1990, 4, 15, 1, 59)), false);
  assert.equal(D.isInChinaDst(w(1990, 4, 15, 2, 0)), true);
  assert.equal(D.isInChinaDst(w(1990, 9, 16, 1, 59)), true);
  assert.equal(D.isInChinaDst(w(1990, 9, 16, 2, 0)), false);
});
test('outside 1986–1991', () => {
  assert.equal(D.isInChinaDst(w(1985, 7, 1, 12, 0)), false);
  assert.equal(D.isInChinaDst(w(1992, 7, 1, 12, 0)), false);
});
test('other years', () => {
  assert.equal(D.isInChinaDst(w(1986, 5, 4, 2, 0)), true);
  assert.equal(D.isInChinaDst(w(1991, 9, 15, 1, 59)), true);
});
