// 复制与分享文本（PRD 7.4）：不含出生地和称呼
const { APP_NAME, ZI_SECT_LABEL } = require('./constants');
const { inputTimeText, lunarShort } = require('./resultView');

function methodText(result) {
  const parts = [`子时派别 ${ZI_SECT_LABEL[result.input.ziSect]}`, `真太阳时 ${result.method.trueSolarApplied ? '开' : '关'}`];
  if (result.method.dstEligible) parts.push(`夏令时 ${result.method.dstApplied ? '已扣除' : '未扣除'}`);
  return parts.join(' · ');
}

function buildCopyText(result) {
  return [
    result.summary,
    `公历 ${inputTimeText(result)} · ${lunarShort(result.lunarText)}`,
    methodText(result),
    `——来自${APP_NAME}`,
  ].join('\n');
}

const buildShareTitle = result => `四柱干支：${result.summary}`;

module.exports = { buildCopyText, buildShareTitle };
