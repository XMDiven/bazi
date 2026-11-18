// 页面传参：QueryInput ⇄ 字符串。解码后必须通过校验，否则返回 null（PRD 7.5 参数无效）。
const { validateInput } = require('./validate');

const FIELDS = ['calendar', 'year', 'month', 'day', 'isLeapMonth', 'precision', 'hour', 'minute', 'shichen', 'cityId', 'useTrueSolarTime', 'ziSect', 'applyDst'];
const ZI_SECTS = ['late23', 'midnight'];
const CALENDARS = ['solar', 'lunar'];

function pick(obj) {
  const out = {};
  for (const k of FIELDS) out[k] = obj[k];
  return out;
}

function encodeInput(input) {
  return encodeURIComponent(JSON.stringify(pick(input)));
}

function parse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(str));
    } catch (e2) {
      return null;
    }
  }
}

function decodeInput(str) {
  if (typeof str !== 'string' || !str) return null;
  let raw = parse(str);
  if (typeof raw === 'string') raw = parse(raw);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = pick(raw);
  const typesOk = CALENDARS.includes(input.calendar) && ZI_SECTS.includes(input.ziSect)
    && typeof input.isLeapMonth === 'boolean' && typeof input.useTrueSolarTime === 'boolean' && typeof input.applyDst === 'boolean'
    && (input.cityId === null || typeof input.cityId === 'string');
  if (!typesOk || !validateInput(input).ok) return null;
  return input;
}

module.exports = { encodeInput, decodeInput };
