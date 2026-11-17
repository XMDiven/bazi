const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCitiesCsv } = require('../../scripts/build-cities');

test('csv validation', () => {
  const { cities, errors } = parseCitiesCsv('province,name,longitude,latitude,source\n广东省,深圳,114.06,22.54,X\n广东省,深圳,114.06,22.54,X\n火星,某地,200,10,X');
  assert.equal(cities.length, 1);
  assert.equal(errors.length, 2);
  assert.deepEqual(cities[0], { id: '广东省-深圳', name: '深圳', province: '广东省', longitude: 114.06 });
});
test('bad header', () => {
  const { cities, errors } = parseCitiesCsv('a,b\n1,2');
  assert.equal(cities.length, 0);
  assert.equal(errors.length, 1);
});
test('empty name and bad latitude', () => {
  const { errors } = parseCitiesCsv('province,name,longitude,latitude,source\n广东省,,114,22,X\n广东省,某,114,60,X');
  assert.equal(errors.length, 2);
});
