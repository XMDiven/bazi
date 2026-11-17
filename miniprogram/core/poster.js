// 分享图片内容（PRD 7.4）：产品名、四柱表、农历与生肖、免责声明；不含出生地和称呼
const { APP_NAME, DISCLAIMER } = require('./constants');

function buildPosterSpec(view) {
  return {
    lines: [
      { text: APP_NAME, role: 'title' },
      { text: view.summaryGroups.join(' '), role: 'pillars' },
      { text: `${view.lunarShort} · ${view.shengXiaoText}`, role: 'body' },
      { text: DISCLAIMER, role: 'small' },
    ],
    columns: view.table.columns.map(c => ({ label: c.label, gan: c.gan, zhi: c.zhi })),
  };
}

module.exports = { buildPosterSpec };
