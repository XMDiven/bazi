const { encodeInput } = require('../../core/queryCodec');
const R = require('../../core/records');
const { relativeTime } = require('../../core/format');
const storage = require('../../services/storage');

const SWIPE_PX = 40;

Page({
  data: {
    tab: 'profiles',
    query: '',
    profiles: [],
    recent: [],
    totalProfiles: 0,
    openId: '',
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const all = R.sortProfiles(storage.loadProfiles());
    const nowMs = Date.now();
    const profiles = R.searchProfiles(all, this.data.query).map(p => ({ ...p, line3: R.describeInput(p.input) }));
    const recent = storage.loadRecent().map(r => ({ ...r, line2: R.describeInput(r.input), when: relativeTime(nowMs, r.createdAt) }));
    this.setData({ profiles, recent, totalProfiles: all.length, openId: '' });
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.key, openId: '' });
  },
  onSearch(e) {
    this.setData({ query: e.detail.value });
    this.refresh();
  },

  // ---------- 左滑 ----------
  onTouchStart(e) {
    this.touchX = e.touches[0].clientX;
    this.touchY = e.touches[0].clientY;
  },
  onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this.touchX;
    const dy = e.changedTouches[0].clientY - this.touchY;
    if (Math.abs(dx) <= Math.abs(dy)) return; // 以纵向为主是在滚动列表，不算左滑
    const { id } = e.currentTarget.dataset;
    if (dx < -SWIPE_PX) this.setData({ openId: id });
    else if (dx > SWIPE_PX && this.data.openId === id) this.setData({ openId: '' });
  },

  // ---------- 档案 ----------
  openProfile(e) {
    const { id } = e.currentTarget.dataset;
    if (this.data.openId) {
      this.setData({ openId: '' });
      return;
    }
    const list = storage.loadProfiles();
    const profile = list.find(p => p.id === id);
    if (!profile) return;
    storage.saveProfiles(R.touchProfile(list, id, Date.now()));
    wx.navigateTo({ url: `/pages/result/index?q=${encodeInput(profile.input)}&source=archive&profileId=${id}` });
  },
  onPin(e) {
    storage.saveProfiles(R.togglePin(storage.loadProfiles(), e.currentTarget.dataset.id));
    this.refresh();
  },
  onEdit(e) {
    wx.navigateTo({ url: `/pages/profile-edit/index?id=${e.currentTarget.dataset.id}` });
  },
  onDeleteProfile(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      content: `删除「${name}」？删除后无法恢复。`,
      confirmText: '删除',
      success: res => {
        if (!res.confirm) return;
        storage.saveProfiles(R.removeById(storage.loadProfiles(), id));
        this.refresh();
      },
    });
  },
  goConvert() {
    wx.switchTab({ url: '/pages/convert/index' });
  },

  // ---------- 最近 ----------
  openRecent(e) {
    if (this.data.openId) {
      this.setData({ openId: '' });
      return;
    }
    const item = this.data.recent.find(r => r.id === e.currentTarget.dataset.id);
    if (item) wx.navigateTo({ url: `/pages/result/index?q=${encodeInput(item.input)}&source=recent` });
  },
  onSaveRecent(e) {
    const item = this.data.recent.find(r => r.id === e.currentTarget.dataset.id);
    if (item) wx.navigateTo({ url: `/pages/profile-edit/index?q=${encodeInput(item.input)}` });
  },
  onDeleteRecent(e) {
    storage.saveRecent(R.removeById(storage.loadRecent(), e.currentTarget.dataset.id));
    this.refresh();
  },
  onClearRecent() {
    wx.showModal({
      content: '清空全部换算记录？',
      confirmText: '清空',
      success: res => {
        if (!res.confirm) return;
        storage.clearRecent();
        this.refresh();
      },
    });
  },
});
