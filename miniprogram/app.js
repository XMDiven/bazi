const privacy = require('./services/privacy');
const { track } = require('./services/track');

App({
  globalData: { prefill: null },

  onLaunch() {
    privacy.install();
  },

  // 只上报错误类型，不上报错误内容（可能含输入数据）
  onError() {
    track('app_error', { where: 'app', code: 'runtime' });
  },
});
