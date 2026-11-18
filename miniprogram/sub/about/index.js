const { APP_NAME, DISCLAIMER, CHANGELOG } = require('../../core/constants');

function versionText() {
  try {
    return wx.getAccountInfoSync().miniProgram.version || '开发版';
  } catch (e) {
    return '开发版';
  }
}

const byVersionDesc = (a, b) => {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
};

Page({
  data: {
    appName: APP_NAME,
    disclaimer: DISCLAIMER,
    version: '',
    changelog: [...CHANGELOG].sort(byVersionDesc),
  },

  onLoad() {
    this.setData({ version: versionText() });
  },
});
