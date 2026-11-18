// 真太阳时修正（PRD 6.2）：经度修正 + 均时差
const { addMinutes } = require('./wallTime');

const STANDARD_MERIDIAN = 120; // 北京时间的标准经线
const MINUTES_PER_DEGREE = 4;

function longitudeOffsetMinutes(lon) {
  return (lon - STANDARD_MERIDIAN) * MINUTES_PER_DEGREE;
}

function dayOfYear(y, m, d) {
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000 + 1;
}

/** 均时差（分钟），常用近似公式：B = 2π(N−81)/364，EoT = 9.87·sin2B − 7.53·cosB − 1.5·sinB */
function equationOfTimeMinutes(y, m, d) {
  const b = (2 * Math.PI * (dayOfYear(y, m, d) - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function trueSolarCorrection(beijingWall, lon) {
  const longitudeMinutes = longitudeOffsetMinutes(lon);
  const day = addMinutes(beijingWall, Math.round(longitudeMinutes));
  const equationMinutes = equationOfTimeMinutes(day.year, day.month, day.day);
  return {
    longitudeMinutes,
    equationMinutes,
    totalMinutes: Math.round(longitudeMinutes + equationMinutes),
  };
}

module.exports = { longitudeOffsetMinutes, equationOfTimeMinutes, trueSolarCorrection };
