// 万年历节日白名单（PRD 9.1）：不显示宗教节日和西方节日
const { Solar } = require('lunar-javascript');

const FESTIVAL_WHITELIST = ['元旦节', '劳动节', '国庆节', '春节', '元宵节', '端午节', '七夕节', '中秋节', '重阳节', '腊八节', '除夕'];
const DISPLAY_NAME = { 元旦节: '元旦' };
const ALLOWED = new Set(FESTIVAL_WHITELIST);

function festivalsOn({ year, month, day }) {
  const solar = Solar.fromYmd(year, month, day);
  return [...solar.getFestivals(), ...solar.getLunar().getFestivals()]
    .filter(name => ALLOWED.has(name))
    .map(name => DISPLAY_NAME[name] || name);
}

module.exports = { FESTIVAL_WHITELIST, DISPLAY_NAME, festivalsOn };
