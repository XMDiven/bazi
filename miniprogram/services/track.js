// 埋点：只用微信内置的自定义事件。任何失败都静默忽略，不影响功能。
const { buildEvent } = require('../core/analytics');

function track(name, params) {
  try {
    const event = buildEvent(name, params);
    wx.reportEvent(event.name, event.params); // eslint-disable-line no-undef
  } catch (e) {
    // 埋点失败不影响功能
  }
}

module.exports = { track };
