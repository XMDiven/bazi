const test = require('node:test');
const assert = require('node:assert/strict');
const { track } = require('../../miniprogram/services/track');

test('reports valid events', () => {
  const calls = [];
  global.wx = { reportEvent: (n, p) => calls.push([n, p]) };
  track('result_view', { source: 'convert' });
  assert.deepEqual(calls, [['result_view', { source: 'convert' }]]);
});
test('silently ignores bad events and wx failures', () => {
  const calls = [];
  global.wx = { reportEvent: (n, p) => calls.push([n, p]) };
  track('result_view', { source: 'x', date: '1990' });
  assert.deepEqual(calls, []);
  global.wx = { reportEvent: () => { throw new Error('x'); } };
  assert.doesNotThrow(() => track('copy'));
  delete global.wx;
  assert.doesNotThrow(() => track('copy'));
});
