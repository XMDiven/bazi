const CITIES = require('./data/cities');

const SEARCH_LIMIT = 30;
const RECENT_LIMIT = 6;
// 热门城市：人口最多的 8 个，用于城市弹层顶部的快捷选择
const HOT_CITY_IDS = ['北京市-北京', '上海市-上海', '广东省-广州', '广东省-深圳', '四川省-成都', '重庆市-重庆', '湖北省-武汉', '陕西省-西安'];

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

function hotCities() {
  return HOT_CITY_IDS.map(getCityById).filter(Boolean);
}

/**
 * 最近用过的城市：默认出生地排第一，其余按最近换算与档案的使用时间倒序。
 * 去重，并跳过已不在城市表里的 id（例如旧版数据）。
 */
function recentCities({ defaultCityId = null, recent = [], profiles = [] } = {}, limit = RECENT_LIMIT) {
  const used = [
    ...recent.map(r => ({ cityId: r.input.cityId, at: r.createdAt })),
    ...profiles.map(p => ({ cityId: p.input.cityId, at: p.lastOpenedAt })),
  ].sort((a, b) => b.at - a.at);
  const out = [];
  for (const id of [defaultCityId, ...used.map(u => u.cityId)]) {
    const city = getCityById(id);
    if (city && !out.includes(city)) out.push(city);
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = { getCityById, searchCities, groupByProvince, hotCities, recentCities };
