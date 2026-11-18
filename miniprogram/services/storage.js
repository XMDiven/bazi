// 本地存储（PRD 15.1）。所有读写都兜住异常：存储失败不影响换算本身。
const { STORAGE_KEYS, DEFAULT_SETTINGS } = require('../core/constants');
const { sanitizeProfiles, sanitizeRecent } = require('../core/records');
const { validateInput } = require('../core/validate');

// 每次调用时才读取全局 wx，便于测试注入（小程序里 global 不是真正的全局对象，所以用自由变量 wx）
const api = () => (typeof wx === 'undefined' ? undefined : wx); // eslint-disable-line no-undef

function load(key) {
  try {
    return api().getStorageSync(key);
  } catch (e) {
    return undefined;
  }
}

function save(key, value) {
  try {
    api().setStorageSync(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function remove(key) {
  try {
    api().removeStorageSync(key);
    return true;
  } catch (e) {
    return false;
  }
}

const loadProfiles = () => sanitizeProfiles(load(STORAGE_KEYS.PROFILES));
const saveProfiles = list => save(STORAGE_KEYS.PROFILES, list);
const loadRecent = () => sanitizeRecent(load(STORAGE_KEYS.RECENT));
const saveRecent = list => save(STORAGE_KEYS.RECENT, list);

function loadSettings() {
  const raw = load(STORAGE_KEYS.SETTINGS);
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    ziSect: s.ziSect === 'midnight' || s.ziSect === 'late23' ? s.ziSect : DEFAULT_SETTINGS.ziSect,
    useTrueSolarTime: typeof s.useTrueSolarTime === 'boolean' ? s.useTrueSolarTime : DEFAULT_SETTINGS.useTrueSolarTime,
    cityId: typeof s.cityId === 'string' ? s.cityId : DEFAULT_SETTINGS.cityId,
  };
}
const saveSettings = settings => save(STORAGE_KEYS.SETTINGS, settings);

function loadLastInput() {
  const raw = load(STORAGE_KEYS.LAST_INPUT);
  return raw && typeof raw === 'object' && validateInput(raw).ok ? raw : null;
}
const saveLastInput = input => save(STORAGE_KEYS.LAST_INPUT, input);

const clearRecent = () => remove(STORAGE_KEYS.RECENT);

function clearAll() {
  try {
    api().clearStorageSync();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  load, save,
  loadProfiles, saveProfiles, loadRecent, saveRecent,
  loadSettings, saveSettings, loadLastInput, saveLastInput,
  clearRecent, clearAll,
};
