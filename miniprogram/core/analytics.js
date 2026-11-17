// 埋点 schema（PRD 17.2）。参数只允许枚举值，任何日期、时间、干支、城市、称呼都进不来。
const PAGES = ['app', 'convert', 'result', 'reverse', 'almanac', 'archive', 'profile_edit', 'me', 'day', 'terms', 'learn', 'privacy', 'about'];
const TERM_IDS = ['sizhu', 'tiangan', 'dizhi', 'canggan', 'nayin', 'wuxing', 'jie', 'zhongqi', 'zhentaiyangshi', 'junshicha', 'zishipaibie'];
const ARTICLE_IDS = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'];

const EVENT_SCHEMA = {
  convert_submit: {
    calendar: ['solar', 'lunar'],
    precision: ['exact', 'shichen', 'unknown'],
    true_solar: [0, 1],
    zi_sect: ['late23', 'midnight'],
  },
  result_view: { source: ['convert', 'archive', 'recent', 'reverse', 'almanac', 'share'] },
  method_toggle: { kind: ['zi_sect', 'true_solar', 'dst'], changed: [0, 1] },
  derivation_expand: {},
  term_tip_open: { term: TERM_IDS },
  profile_save: {},
  copy: {},
  share: {},
  poster_save: {},
  reverse_submit: { result_bucket: ['0', '1', '2-5', '6+'] },
  almanac_day_open: {},
  article_view: { article: ARTICLE_IDS },
  app_error: { where: PAGES, code: ['runtime', 'calc', 'storage', 'poster'] },
};

function bad() {
  return new Error('BAD_EVENT');
}

function buildEvent(name, params = {}) {
  const schema = Object.prototype.hasOwnProperty.call(EVENT_SCHEMA, name) ? EVENT_SCHEMA[name] : null;
  if (!schema || !params || typeof params !== 'object') throw bad();
  const keys = Object.keys(params);
  const expected = Object.keys(schema);
  if (keys.length !== expected.length || !expected.every(k => keys.includes(k))) throw bad();
  for (const k of expected) if (!schema[k].includes(params[k])) throw bad();
  return { name, params: { ...params } };
}

/** 反查结果数量分桶 */
function resultBucket(n) {
  if (n === 0) return '0';
  if (n === 1) return '1';
  return n <= 5 ? '2-5' : '6+';
}

module.exports = { EVENT_SCHEMA, buildEvent, resultBucket, TERM_IDS };
