const test = require('node:test');
const assert = require('node:assert/strict');

function freshPrivacy() {
  delete require.cache[require.resolve('../../miniprogram/services/privacy')];
  return require('../../miniprogram/services/privacy');
}

function mockWx() {
  const state = { handler: null };
  global.wx = { onNeedPrivacyAuthorization: fn => { state.handler = fn; } };
  return state;
}

test('subscriber receives resolve after install', () => {
  const state = mockWx();
  const P = freshPrivacy();
  P.install();
  const got = [];
  const off = P.subscribe(resolve => got.push(resolve));
  const resolve = () => {};
  state.handler(resolve, { referrer: 'setClipboardData' });
  assert.deepEqual(got, [resolve]);
  off();
  state.handler(resolve);
  assert.equal(got.length, 1);
});
test('only the latest subscriber (top page) handles it', () => {
  const state = mockWx();
  const P = freshPrivacy();
  P.install();
  const a = [];
  const b = [];
  P.subscribe(r => a.push(r));
  const offB = P.subscribe(r => b.push(r));
  state.handler('r1');
  assert.deepEqual([a, b], [[], ['r1']]);
  offB();
  state.handler('r2');
  assert.deepEqual(a, ['r2']);
});
test('no subscriber → disagree so the call does not hang', () => {
  const state = mockWx();
  const P = freshPrivacy();
  P.install();
  const results = [];
  state.handler(r => results.push(r));
  assert.deepEqual(results, [{ event: 'disagree' }]);
});
test('install is safe without the API', () => {
  global.wx = {};
  assert.doesNotThrow(() => freshPrivacy().install());
  delete global.wx;
  assert.doesNotThrow(() => freshPrivacy().install());
});
