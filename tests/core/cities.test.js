const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../../miniprogram/core/data/cities');
const { getCityById, searchCities, groupByProvince, provinceShort, cityLabel, hotCities, recentCities } = require('../../miniprogram/core/cities');

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

test('hotCities all resolve', () => {
  assert.equal(hotCities().length, 8);
});
test('recentCities: default first, then by time, deduped, stale ids skipped, capped', () => {
  const rec = (cityId, at) => ({ input: { cityId }, createdAt: at });
  const prof = (cityId, at) => ({ input: { cityId }, lastOpenedAt: at });
  const ids = recentCities({
    defaultCityId: '北京市-北京',
    recent: [rec('江苏省-苏州', 30), rec('beijing', 50), rec(null, 60), rec('北京市-北京', 70)],
    profiles: [prof('云南省-大理白族自治州', 40), prof('江苏省-苏州', 10)],
  }).map(c => c.id);
  assert.deepEqual(ids, ['北京市-北京', '云南省-大理白族自治州', '江苏省-苏州']);
  const many = Array.from({ length: 10 }, (_, i) => rec(hotCities()[i % 8].id, i));
  assert.equal(recentCities({ recent: many }).length, 4);
  assert.deepEqual(recentCities(), []);
});
test('groupByProvince keeps source order and short names', () => {
  const g = groupByProvince();
  assert.deepEqual(g.slice(0, 4).map(x => x.short), ['北京', '天津', '上海', '重庆']);
  assert.ok(g.every(x => x.short && x.short.length <= 3), g.map(x => x.short).join());
});
test('provinceShort', () => {
  assert.equal(provinceShort('新疆维吾尔自治区'), '新疆');
  assert.equal(provinceShort('广西壮族自治区'), '广西');
  assert.equal(provinceShort('内蒙古自治区'), '内蒙古');
  assert.equal(provinceShort('香港特别行政区'), '香港');
  assert.equal(provinceShort('黑龙江省'), '黑龙江');
});
test('cityLabel', () => {
  assert.equal(cityLabel(getCityById('新疆维吾尔自治区-乌鲁木齐')), '乌鲁木齐 · 新疆');
  assert.equal(cityLabel(getCityById('北京市-北京')), '北京');
  assert.equal(cityLabel(getCityById('香港特别行政区-香港')), '香港');
  assert.equal(cityLabel(null), '');
});
