const CITIES = require('./data/cities');

const SEARCH_LIMIT = 30;

function getCityById(id) {
  return CITIES.find(c => c.id === id) || null;
}

function searchCities(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  return CITIES.filter(c => c.name.includes(q) || c.province.includes(q)).slice(0, SEARCH_LIMIT);
}

/** 按省份 Unicode 顺序分组；省内保持数据源顺序 */
function groupByProvince() {
  const map = new Map();
  for (const c of CITIES) {
    if (!map.has(c.province)) map.set(c.province, []);
    map.get(c.province).push(c);
  }
  return [...map.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map(province => ({ province, cities: map.get(province) }));
}

module.exports = { getCityById, searchCities, groupByProvince };
