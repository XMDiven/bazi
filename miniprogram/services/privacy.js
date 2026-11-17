// 隐私授权（PRD 15.2）：首次调用隐私接口时，微信回调 onNeedPrivacyAuthorization，由当前页面的 privacy-sheet 弹出。
let listeners = [];

function emit(resolve) {
  const top = listeners[listeners.length - 1];
  if (!top) {
    resolve({ event: 'disagree' });
    return;
  }
  top(resolve);
}

function install() {
  if (typeof wx === 'undefined' || typeof wx.onNeedPrivacyAuthorization !== 'function') return; // eslint-disable-line no-undef
  wx.onNeedPrivacyAuthorization(resolve => emit(resolve)); // eslint-disable-line no-undef
}

/** 只有最后订阅的（最上层页面的）弹层会响应；返回取消订阅函数 */
function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

module.exports = { install, subscribe };
