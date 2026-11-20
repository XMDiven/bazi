const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../miniprogram/services/storage');
const { DEFAULT_SETTINGS } = require('../../miniprogram/core/constants');
const { makeInput } = require('../helpers');

function memoryWx() {
  const store = {};
  return {
    store,
    getStorageSync: k => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v; },
    removeStorageSync: k => { delete store[k]; },
    clearStorageSync: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
}

test('round trip', () => {
  global.wx = memoryWx();
  assert.equal(S.saveSettings({ ziSect: 'midnight', useTrueSolarTime: true, cityId: '新疆维吾尔自治区-乌鲁木齐' }), true);
  assert.deepEqual(S.loadSettings(), { ziSect: 'midnight', useTrueSolarTime: true, cityId: '新疆维吾尔自治区-乌鲁木齐' });
  assert.equal(S.saveLastInput(makeInput()), true);
  assert.deepEqual(S.loadLastInput(), makeInput());
  assert.deepEqual(S.loadProfiles(), []);
  assert.deepEqual(S.loadRecent(), []);
});
test('get throws → defaults', () => {
  global.wx = { getStorageSync: () => { throw new Error('boom'); } };
  assert.deepEqual(S.loadProfiles(), []);
  assert.deepEqual(S.loadRecent(), []);
  assert.deepEqual(S.loadSettings(), DEFAULT_SETTINGS);
  assert.equal(S.loadLastInput(), null);
});
test('set throws → false', () => {
  global.wx = { setStorageSync: () => { throw new Error('full'); } };
  assert.equal(S.saveProfiles([]), false);
  assert.equal(S.saveRecent([]), false);
});
test('corrupt values', () => {
  global.wx = memoryWx();
  global.wx.store.profiles = 'garbage';
  global.wx.store.settings = { ziSect: 'weird', useTrueSolarTime: 'yes', cityId: 42 };
  global.wx.store.lastInput = { year: 'x' };
  assert.deepEqual(S.loadProfiles(), []);
  assert.deepEqual(S.loadSettings(), DEFAULT_SETTINGS);
  assert.equal(S.loadLastInput(), null);
});
test('clearRecent and clearAll', () => {
  global.wx = memoryWx();
  global.wx.store.recent = [1];
  global.wx.store.profiles = [1];
  assert.equal(S.clearRecent(), true);
  assert.equal('recent' in global.wx.store, false);
  assert.equal(S.clearAll(), true);
  assert.deepEqual(global.wx.store, {});
  global.wx = {};
  assert.equal(S.clearAll(), false);
});
test('no wx at all', () => {
  delete global.wx;
  assert.deepEqual(S.loadProfiles(), []);
  assert.equal(S.saveProfiles([]), false);
});
