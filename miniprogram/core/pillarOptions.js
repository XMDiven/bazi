// 反查选择器的联动选项（PRD 8.1）：五虎遁定月干，五鼠遁定时干
const { LunarUtil } = require('lunar-javascript');
const { SHICHEN } = require('./shichen');

const JIA_ZI = LunarUtil.JIA_ZI.slice();
const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const YIN = ZHI.indexOf('寅');

const ganIndex = gz => (typeof gz === 'string' && JIA_ZI.includes(gz) ? GAN.indexOf(gz[0]) : -1);
const ganZhi = (g, z) => GAN[((g % 10) + 10) % 10] + ZHI[((z % 12) + 12) % 12];

/** 五虎遁：甲己之年丙作首，乙庚之岁戊为头，丙辛岁首寻庚起，丁壬壬寅顺水流，戊癸何方发，甲寅之上好追求 */
function monthOptionsForYear(yearGZ) {
  const g = ganIndex(yearGZ);
  if (g < 0) return [];
  const first = ((g % 5) * 2 + 2) % 10;
  return Array.from({ length: 12 }, (_, i) => ganZhi(first + i, YIN + i));
}

/** 五鼠遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途 */
const ziGanOf = dayGan => ((dayGan % 5) * 2) % 10;

function timeOptionsForDay(dayGZ, ziSect) {
  const g = ganIndex(dayGZ);
  if (g < 0) return [];
  const first = ziGanOf(g);
  const plainLabel = i => `${ZHI[i]}时`;
  if (ziSect === 'late23') {
    return Array.from({ length: 12 }, (_, i) => ({ ganzhi: ganZhi(first + i, i), label: plainLabel(i) }));
  }
  // 0:00 换日：晚子时仍属当日日柱，但时干按次日日干推
  const options = Array.from({ length: 12 }, (_, i) => ({
    ganzhi: ganZhi(first + i, i),
    label: i === 0 ? SHICHEN[0].name : plainLabel(i),
  }));
  options.push({ ganzhi: ganZhi(ziGanOf(g + 1), 0), label: SHICHEN[12].name });
  return options;
}

module.exports = { JIA_ZI, monthOptionsForYear, timeOptionsForDay };
