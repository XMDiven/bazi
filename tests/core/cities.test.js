const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../../miniprogram/core/data/cities');
const { getCityById, searchCities, groupByProvince } = require('../../miniprogram/core/cities');

test('seed has 34 unique cities', () => {
  assert.equal(DATA.length, 34);
  assert.equal(new Set(DATA.map(c => c.id)).size, 34);
});
test('getCityById', () => {
  assert.equal(getCityById('urumqi').longitude, 87.62);
  assert.equal(getCityById('nope'), null);
  assert.equal(getCityById(null), null);
});
test('search', () => {
  assert.deepEqual(searchCities('乌鲁').map(c => c.id), ['urumqi']);
  assert.ok(searchCities('广东省').some(c => c.id === 'guangzhou'));
  assert.deepEqual(searchCities('  '), []);
});
test('groupByProvince is stable and complete', () => {
  const g = groupByProvince();
  assert.equal(g.reduce((n, x) => n + x.cities.length, 0), 34);
  assert.deepEqual(groupByProvince().map(x => x.province), g.map(x => x.province));
});
