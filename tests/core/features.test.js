const test = require('node:test');
const assert = require('node:assert/strict');
const { FEATURES, DOWNGRADE_ORDER } = require('../../miniprogram/core/features');
const { buildResultView } = require('../../miniprogram/core/resultView');
const { buildDayDetail } = require('../../miniprogram/core/almanac');
const { calculate } = require('../../miniprogram/core/calculate');
const { makeInput } = require('../helpers');

const result = calculate(makeInput());

// 每关一级，对应区块的数据都必须从 view 中消失（JSON 中也找不到）
const GONE = {
  wuXingCount: (view, json) => view.wuXingText === null && !json.includes('火 5'),
  naYin: (view, json) => !view.table.showNaYin && !json.includes('路旁土'),
  hideGan: (view, json) => !view.table.showHideGan && !json.includes('丁、己'),
};

test('all switches default on', () => {
  for (const key of DOWNGRADE_ORDER) assert.equal(FEATURES[key], true, key);
});

test('closing switches in PRD 2.3 order removes each block', () => {
  let flags = { ...FEATURES };
  for (const key of DOWNGRADE_ORDER) {
    flags = { ...flags, [key]: false };
    const view = buildResultView(result, flags);
    const json = JSON.stringify(view);
    for (const closed of DOWNGRADE_ORDER.slice(0, DOWNGRADE_ORDER.indexOf(key) + 1)) {
      if (GONE[closed]) assert.ok(GONE[closed](view, json), `${closed} still visible after closing ${key}`);
    }
    // 关闭任何开关后，四柱本身、推导与免责声明仍在
    assert.deepEqual(view.summaryGroups, ['庚午', '辛巳', '丁丑', '丙午']);
    assert.equal(view.derivation.length, 5);
    assert.ok(view.disclaimer);
    const day = buildDayDetail({ year: 2024, month: 2, day: 10 }, 'late23', flags);
    assert.equal(day.hours.length, flags.hourTable ? 13 : 0);
    assert.ok(day.ganzhiText);
  }
});
