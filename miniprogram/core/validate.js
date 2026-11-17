// 输入校验（PRD 5.3）。控件本身不提供非法选项，这里是兜底。
const { isValidSolarDate, isInSupportedRange } = require('./wallTime');
const { getLeapMonth, getLunarMonthDays, lunarToSolarDate } = require('./lunarInput');
const { getCityById } = require('./cities');
const { MIN_DATE, MAX_DATE } = require('./constants');

const MSG = {
  INVALID_DATE: '请选择有效日期',
  OUT_OF_RANGE: '仅支持 1900 年至 2100 年',
  NO_LEAP: '该年没有这个闰月',
  NO_DAY: '该月没有这一天',
  TIME: '请选择出生时间',
  SHICHEN: '请选择时辰',
  CITY: '开启真太阳时需先选择出生地',
};

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

function validateSolar({ year, month, day }) {
  if (!isValidSolarDate(year, month, day)) return { error: MSG.INVALID_DATE };
  const date = { year, month, day };
  if (!isInSupportedRange(date)) return { error: MSG.OUT_OF_RANGE };
  return { date };
}

function validateLunar({ year, month, day, isLeapMonth }) {
  if (!isInt(month, 1, 12) || !isInt(day, 1, 30) || !Number.isInteger(year)) return { error: MSG.INVALID_DATE };
  // 农历 1899 年腊月对应公历 1900 年 1 月，允许进入后再按公历范围判断
  if (year < MIN_DATE.year - 1 || year > MAX_DATE.year) return { error: MSG.OUT_OF_RANGE };
  if (isLeapMonth && getLeapMonth(year) !== month) return { error: MSG.NO_LEAP };
  const days = getLunarMonthDays(year, month, !!isLeapMonth);
  if (!days || day > days) return { error: MSG.NO_DAY };
  const date = lunarToSolarDate({ year, month, day, isLeapMonth: !!isLeapMonth });
  if (!date || !isInSupportedRange(date)) return { error: MSG.OUT_OF_RANGE };
  return { date };
}

function validateTime(input) {
  if (input.precision === 'unknown') return null;
  if (input.precision === 'shichen') return isInt(input.shichen, 0, 12) ? null : MSG.SHICHEN;
  if (input.precision === 'exact') return isInt(input.hour, 0, 23) && isInt(input.minute, 0, 59) ? null : MSG.TIME;
  return MSG.TIME;
}

/** @returns {{ok:boolean, errors:{date?:string, time?:string, city?:string}, solarDate:DateParts|null}} */
function validateInput(input) {
  if (!input || typeof input !== 'object') return { ok: false, errors: { date: MSG.INVALID_DATE }, solarDate: null };
  const errors = {};
  const dateResult = input.calendar === 'lunar' ? validateLunar(input) : validateSolar(input);
  if (dateResult.error) errors.date = dateResult.error;
  const timeError = validateTime(input);
  if (timeError) errors.time = timeError;
  if (input.useTrueSolarTime && input.precision !== 'unknown' && !getCityById(input.cityId)) errors.city = MSG.CITY;
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, solarDate: dateResult.date || null };
}

module.exports = { validateInput, MSG };
