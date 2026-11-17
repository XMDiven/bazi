const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../miniprogram/core/records');
const { makeInput } = require('../helpers');

const T0 = 1_700_000_000_000;

test('inputKey ignores irrelevant fields and key order', () => {
  const a = makeInput({ precision: 'unknown', hour: 3 });
  const b = { ...makeInput({ precision: 'unknown', hour: 9 }) };
  assert.equal(R.inputKey(a), R.inputKey(b));
  assert.notEqual(R.inputKey(makeInput()), R.inputKey(makeInput({ minute: 1 })));
});
test('recent: dedupe to front and cap 20', () => {
  let list = [];
  for (let i = 0; i < 25; i++) list = R.addRecent(list, { input: makeInput({ minute: i }), summary: 's' + i }, T0 + i);
  assert.equal(list.length, 20);
  assert.equal(list[0].summary, 's24');
  list = R.addRecent(list, { input: makeInput({ minute: 10 }), summary: 'again' }, T0 + 100);
  assert.equal(list.length, 20);
  assert.equal(list[0].summary, 'again');
  assert.equal(list.filter(x => x.input.minute === 10).length, 1);
  assert.deepEqual(Object.keys(list[0]).sort(), ['createdAt', 'id', 'input', 'summary']);
});
test('profile name rules', () => {
  assert.equal(R.createProfile([], { name: '   ', input: makeInput(), summary: 's' }, T0).error, 'NAME_REQUIRED');
  assert.equal(R.createProfile([], { name: '一二三四五六七八九十十', input: makeInput(), summary: 's' }, T0).error, 'NAME_TOO_LONG');
  const ok = R.createProfile([], { name: ' 一二三四五六七八九十 ', input: makeInput(), summary: 's' }, T0);
  assert.equal(ok.error, undefined);
  assert.equal(ok.list[0].name, '一二三四五六七八九十');
  assert.deepEqual(ok.list[0], { id: String(T0), name: '一二三四五六七八九十', input: makeInput(), summary: 's', pinned: false, createdAt: T0, lastOpenedAt: T0 });
});
test('profile duplicate and limit', () => {
  const { list } = R.createProfile([], { name: '妈妈', input: makeInput(), summary: 's' }, T0);
  const dup = R.createProfile(list, { name: '爸爸', input: makeInput(), summary: 's' }, T0 + 1);
  assert.equal(dup.error, 'DUPLICATE');
  assert.equal(dup.existing.name, '妈妈');
  assert.equal(dup.list, list);
  let many = [];
  for (let i = 0; i < 100; i++) many = R.createProfile(many, { name: 'p' + i, input: makeInput({ year: 1901 + i }), summary: 's' }, T0 + i).list;
  assert.equal(many.length, 100);
  assert.equal(R.createProfile(many, { name: 'x', input: makeInput({ year: 2050 }), summary: 's' }, T0 + 500).error, 'LIMIT');
});
test('update profile', () => {
  let { list } = R.createProfile([], { name: '妈妈', input: makeInput(), summary: 's' }, T0);
  ({ list } = R.createProfile(list, { name: '爸爸', input: makeInput({ year: 1960 }), summary: 's2' }, T0 + 1));
  const id = String(T0);
  const same = R.updateProfile(list, id, { name: '母亲', input: makeInput(), summary: 's' }, T0 + 2);
  assert.equal(same.error, undefined);
  assert.equal(same.list.find(p => p.id === id).name, '母亲');
  assert.equal(R.updateProfile(list, id, { input: makeInput({ year: 1960 }) }, T0 + 2).error, 'DUPLICATE');
  assert.equal(R.updateProfile(list, id, { name: '' }, T0 + 2).error, 'NAME_REQUIRED');
  assert.equal(R.updateProfile(list, 'nope', { name: 'x' }, T0 + 2).error, 'NOT_FOUND');
});
test('pin, touch, sort, search, remove', () => {
  let list = [];
  for (const [i, name] of ['妈妈', '爸爸', '外婆'].entries()) list = R.createProfile(list, { name, input: makeInput({ year: 1950 + i }), summary: 's' }, T0 + i).list;
  assert.deepEqual(R.sortProfiles(list).map(p => p.name), ['外婆', '爸爸', '妈妈']);
  list = R.touchProfile(list, String(T0), T0 + 10);
  assert.deepEqual(R.sortProfiles(list).map(p => p.name), ['妈妈', '外婆', '爸爸']);
  list = R.togglePin(list, String(T0 + 1));
  assert.deepEqual(R.sortProfiles(list).map(p => p.name), ['爸爸', '妈妈', '外婆']);
  assert.deepEqual(R.searchProfiles(list, '妈').map(p => p.name), ['妈妈']);
  assert.equal(R.searchProfiles(list, ' ').length, 3);
  assert.equal(R.removeById(list, String(T0)).length, 2);
  assert.equal(R.findProfileByInput(list, makeInput({ year: 1951 })).name, '爸爸');
  assert.equal(R.findProfileByInput(list, makeInput({ year: 1999 })), null);
});
test('describeInput', () => {
  assert.equal(R.describeInput(makeInput()), '公历 1990年5月12日 12:00');
  assert.equal(R.describeInput(makeInput({ calendar: 'lunar', month: 4, day: 18, precision: 'unknown' })), '农历 1990年四月十八 · 时辰不详');
  assert.equal(R.describeInput(makeInput({ calendar: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: true, precision: 'shichen', shichen: 6 })), '农历 2023年闰二月初一 午时');
});
test('profilesToText', () => {
  let list = R.createProfile([], { name: '妈妈', input: makeInput(), summary: '庚午 辛巳 丁丑 丙午' }, T0).list;
  list = R.createProfile(list, { name: '爸爸', input: makeInput({ precision: 'unknown' }), summary: '庚午 辛巳 丁丑' }, T0 + 1).list;
  assert.equal(R.profilesToText(list, R.describeInput),
    '妈妈\n庚午 辛巳 丁丑 丙午\n公历 1990年5月12日 12:00\n\n爸爸\n庚午 辛巳 丁丑\n公历 1990年5月12日 · 时辰不详');
});
test('sanitize garbage', () => {
  assert.deepEqual(R.sanitizeProfiles('oops'), []);
  assert.deepEqual(R.sanitizeProfiles(null), []);
  assert.deepEqual(R.sanitizeRecent({}), []);
  const good = R.createProfile([], { name: '妈妈', input: makeInput(), summary: 's' }, T0).list[0];
  assert.deepEqual(R.sanitizeProfiles([good, { id: 1 }, null, { ...good, input: 'x' }]), [good]);
  const recent = R.addRecent([], { input: makeInput(), summary: 's' }, T0);
  assert.deepEqual(R.sanitizeRecent([...recent, { id: 'x' }, 5]), recent);
});
