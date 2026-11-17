// 档案与最近（PRD 10）。纯函数，全部返回新数组。
const { LIMITS } = require('./constants');
const { monthLabel, DAY_LABELS } = require('./lunarInput');
const { SHICHEN } = require('./shichen');
const { pad2 } = require('./format');

const KEY_FIELDS = ['calendar', 'year', 'month', 'day', 'isLeapMonth', 'precision', 'hour', 'minute', 'shichen', 'cityId', 'useTrueSolarTime', 'ziSect', 'applyDst'];

/** 只保留与本次精度相关的字段，按固定顺序序列化 */
function inputKey(input) {
  const normalized = {
    ...input,
    isLeapMonth: input.calendar === 'lunar' ? !!input.isLeapMonth : false,
    hour: input.precision === 'exact' ? input.hour : null,
    minute: input.precision === 'exact' ? input.minute : null,
    shichen: input.precision === 'shichen' ? input.shichen : null,
    cityId: input.cityId || null,
    useTrueSolarTime: !!input.useTrueSolarTime,
    applyDst: !!input.applyDst,
  };
  return JSON.stringify(KEY_FIELDS.map(k => normalized[k]));
}

const sameInput = (a, b) => inputKey(a) === inputKey(b);

function addRecent(list, { input, summary }, nowMs) {
  const item = { id: String(nowMs), input, summary, createdAt: nowMs };
  return [item, ...list.filter(r => !sameInput(r.input, input))].slice(0, LIMITS.RECENT);
}

function checkName(name) {
  const trimmed = String(name == null ? '' : name).trim();
  if (!trimmed) return { error: 'NAME_REQUIRED' };
  if (Array.from(trimmed).length > LIMITS.NAME_MAX) return { error: 'NAME_TOO_LONG' };
  return { name: trimmed };
}

function findProfileByInput(list, input) {
  return list.find(p => sameInput(p.input, input)) || null;
}

function createProfile(list, { name, input, summary }, nowMs) {
  const checked = checkName(name);
  if (checked.error) return { list, error: checked.error };
  const existing = findProfileByInput(list, input);
  if (existing) return { list, error: 'DUPLICATE', existing };
  if (list.length >= LIMITS.PROFILES) return { list, error: 'LIMIT' };
  const profile = { id: String(nowMs), name: checked.name, input, summary, pinned: false, createdAt: nowMs, lastOpenedAt: nowMs };
  return { list: [...list, profile] };
}

function updateProfile(list, id, patch, nowMs) {
  const current = list.find(p => p.id === id);
  if (!current) return { list, error: 'NOT_FOUND' };
  const next = { ...current, lastOpenedAt: nowMs };
  if (patch.name !== undefined) {
    const checked = checkName(patch.name);
    if (checked.error) return { list, error: checked.error };
    next.name = checked.name;
  }
  if (patch.input !== undefined) {
    const existing = list.find(p => p.id !== id && sameInput(p.input, patch.input));
    if (existing) return { list, error: 'DUPLICATE', existing };
    next.input = patch.input;
  }
  if (patch.summary !== undefined) next.summary = patch.summary;
  return { list: list.map(p => (p.id === id ? next : p)) };
}

const removeById = (list, id) => list.filter(x => x.id !== id);
const togglePin = (list, id) => list.map(p => (p.id === id ? { ...p, pinned: !p.pinned } : p));
const touchProfile = (list, id, nowMs) => list.map(p => (p.id === id ? { ...p, lastOpenedAt: nowMs } : p));

function sortProfiles(list) {
  return [...list].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.lastOpenedAt - a.lastOpenedAt));
}

function searchProfiles(list, q) {
  const query = String(q || '').trim();
  return query ? list.filter(p => p.name.includes(query)) : list;
}

/** 档案列表第三行：'公历 1990年5月12日 12:00' 或 '农历 1990年四月十八 · 时辰不详' */
function describeInput(input) {
  const date = input.calendar === 'lunar'
    ? `农历 ${input.year}年${monthLabel(input.month, input.isLeapMonth)}${DAY_LABELS[input.day - 1]}`
    : `公历 ${input.year}年${input.month}月${input.day}日`;
  if (input.precision === 'exact') return `${date} ${pad2(input.hour)}:${pad2(input.minute)}`;
  if (input.precision === 'shichen') return `${date} ${SHICHEN[input.shichen].name}`;
  return `${date} · 时辰不详`;
}

function profilesToText(list, summarize) {
  return list.map(p => [p.name, p.summary, summarize(p.input)].join('\n')).join('\n\n');
}

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isInputLike = v => isObj(v) && Number.isInteger(v.year) && Number.isInteger(v.month) && Number.isInteger(v.day) && typeof v.precision === 'string';

function sanitizeProfiles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(p => isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.summary === 'string'
    && isInputLike(p.input) && Number.isFinite(p.createdAt) && Number.isFinite(p.lastOpenedAt))
    .map(p => ({ ...p, pinned: !!p.pinned }));
}

function sanitizeRecent(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(r => isObj(r) && typeof r.id === 'string' && typeof r.summary === 'string' && isInputLike(r.input) && Number.isFinite(r.createdAt));
}

module.exports = {
  inputKey, addRecent, createProfile, updateProfile, removeById, togglePin, touchProfile,
  sortProfiles, searchProfiles, findProfileByInput, describeInput, profilesToText,
  sanitizeProfiles, sanitizeRecent,
};
