const R = require('../../core/records');
const storage = require('../../services/storage');
const { track } = require('../../services/track');

const CONFIRM_WORD = '清除';

Page({
  data: {
    showClearAll: false,
    confirmText: '',
    canClear: false,
  },

  onCopyProfiles() {
    const list = R.sortProfiles(storage.loadProfiles());
    if (!list.length) {
      wx.showToast({ title: '还没有档案', icon: 'none' });
      return;
    }
    wx.setClipboardData({ data: R.profilesToText(list, R.describeInput), success: () => track('copy') });
  },

  onClearRecent() {
    wx.showModal({
      content: '清空全部换算记录？',
      confirmText: '清空',
      success: res => {
        if (res.confirm && storage.clearRecent()) wx.showToast({ title: '已清空', icon: 'none' });
      },
    });
  },

  openClearAll() {
    this.setData({ showClearAll: true, confirmText: '', canClear: false });
  },
  closeClearAll() {
    this.setData({ showClearAll: false });
  },
  onConfirmInput(e) {
    const confirmText = e.detail.value;
    this.setData({ confirmText, canClear: confirmText.trim() === CONFIRM_WORD });
  },
  onClearAll() {
    if (!this.data.canClear) return;
    const ok = storage.clearAll();
    this.setData({ showClearAll: false });
    wx.showToast({ title: ok ? '已清除' : '清除失败', icon: 'none' });
  },
});
