const test = require('node:test');
const assert = require('node:assert/strict');
const { Solar } = require('lunar-javascript');
const C = require('../../miniprogram/core/constants');

test('disclaimer verbatim', () => assert.equal(C.DISCLAIMER, '本工具仅提供传统干支历法的日期换算与文化科普，不提供任何命运解读或预测，请理性看待传统文化。'));
test('zi sect lib mapping', () => assert.deepEqual(C.ZI_SECT_TO_LIB, { late23: 1, midnight: 2 }));
test('boundary thresholds per PRD 6.5', () => assert.deepEqual(C.BOUNDARY, { JIE_MINUTES: 30, SHICHEN_MINUTES: 10, DAY_MINUTES: 10 }));
test('downgrade order per PRD 2.3', () => assert.deepEqual(require('../../miniprogram/core/features').DOWNGRADE_ORDER, ['wuXingCount', 'naYin', 'hideGan', 'reverseLookup', 'hourTable']));
test('library sane', () => assert.equal(Solar.fromYmdHms(2000, 1, 1, 12, 0, 0).getLunar().getEightChar().getDay(), '戊午'));
