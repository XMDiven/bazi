const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../../miniprogram/core/data/cities');
const { getCityById, searchCities, groupByProvince } = require('../../miniprogram/core/cities');

test('covers prefecture-level cities with unique ids', () => {
  assert.ok(DATA.length >= 300);
  assert.equal(new Set(DATA.map(c => c.id)).size, DATA.length);
  // 不再只有省会：地级市、自治州、地区都能选到
  for (const name of ['苏州', '大理白族自治州', '喀什地区', '三亚']) assert.ok(DATA.some(c => c.name === name), name);
});
test('getCityById', () => {
  assert.equal(getCityById('新疆维吾尔自治区-乌鲁木齐').longitude, 87.6);
  assert.equal(getCityById('nope'), null);
  assert.equal(getCityById(null), null);
});
test('search', () => {
  assert.deepEqual(searchCities('乌鲁').map(c => c.id), ['新疆维吾尔自治区-乌鲁木齐']);
  assert.ok(searchCities('广东省').some(c => c.id === '广东省-广州'));
  assert.deepEqual(searchCities('  '), []);
});
test('groupByProvince is stable and complete', () => {
  const g = groupByProvince();
  assert.equal(g.reduce((n, x) => n + x.cities.length, 0), DATA.length);
  assert.deepEqual(groupByProvince().map(x => x.province), g.map(x => x.province));
});
