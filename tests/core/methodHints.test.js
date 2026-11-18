const test = require('node:test');
const assert = require('node:assert/strict');
const { METHOD_COPY, ZI_SECT_ITEMS, ziSectMatters, trueSolarPreview } = require('../../miniprogram/core/methodHints');
const { makeInput } = require('../helpers');

const URUMQI_LICHUN = makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: 'urumqi' });

test('copy follows PRD 5.5', () => {
  assert.deepEqual(METHOD_COPY.ziSect, { title: '晚上 11 点后出生，日柱算哪天？', hint: '子时派别 · 两种说法都常见，不确定就用默认' });
  assert.deepEqual(METHOD_COPY.trueSolar, { title: '按出生地校正时间', hint: '真太阳时 · 各地天亮早晚不同，新疆与北京相差约 2 小时' });
  assert.deepEqual(ZI_SECT_ITEMS, [
    { key: 'late23', text: '算第二天', sub: '23:00 换日' },
    { key: 'midnight', text: '算当天', sub: '0:00 换日' },
  ]);
});

test('ziSectMatters: only when the two sects give different results', () => {
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30 })), true);
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, hour: 14, minute: 0 })), false);
  // 晚子时 23:00–23:59
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, precision: 'shichen', shichen: 12 })), true);
  // 早子时、时间不详不受影响
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, precision: 'shichen', shichen: 0 })), false);
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, precision: 'unknown' })), false);
  // 临近 23:00 换日时，边界提示不同也算
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, hour: 22, minute: 55 })), true);
});

test('ziSectMatters judges on the corrected time', () => {
  // 乌鲁木齐 23:30 校正后为 21:10，两派相同
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, useTrueSolarTime: true, cityId: 'urumqi' })), false);
});

test('ziSectMatters: incomplete input falls back to Beijing time', () => {
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, useTrueSolarTime: true, cityId: null })), true);
  assert.equal(ziSectMatters(makeInput({ year: 2024, month: 2, day: 30 })), false);
});

test('trueSolarPreview: exact time', () => {
  assert.deepEqual(trueSolarPreview(URUMQI_LICHUN), { shift: '校正后 15:36（北京时间 −2 小时 24 分）', change: '时柱由 辛酉 变为 庚申' });
});

test('trueSolarPreview: small shifts and no change', () => {
  assert.deepEqual(trueSolarPreview(makeInput({ year: 2024, month: 6, day: 1, useTrueSolarTime: true, cityId: 'shanghai' })),
    { shift: '校正后 12:08（北京时间 +8 分）', change: '四柱不变' });
});

test('trueSolarPreview: shichen uses the midpoint', () => {
  const p = trueSolarPreview({ ...URUMQI_LICHUN, precision: 'shichen', shichen: 9 });
  assert.equal(p.shift, '按时辰中点校正 −2 小时 24 分');
});

test('trueSolarPreview: hidden when off, no city, unknown time or invalid', () => {
  assert.equal(trueSolarPreview({ ...URUMQI_LICHUN, useTrueSolarTime: false }), null);
  assert.equal(trueSolarPreview({ ...URUMQI_LICHUN, cityId: null }), null);
  assert.equal(trueSolarPreview({ ...URUMQI_LICHUN, precision: 'unknown' }), null);
  assert.equal(trueSolarPreview({ ...URUMQI_LICHUN, day: 31 }), null);
});
