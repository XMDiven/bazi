const { ME_HEADER } = require('../../core/constants');
const { METHOD_COPY, ZI_SECT_ITEMS } = require('../../core/methodHints');
const { getCityById } = require('../../core/cities');
const storage = require('../../services/storage');

Page({
  data: {
    header: ME_HEADER,
    ziSectItems: ZI_SECT_ITEMS,
    copy: METHOD_COPY,
    settings: null,
    cityText: '',
    showCitySheet: false,
  },

  onShow() {
    this.setSettings(storage.loadSettings());
  },

  setSettings(settings) {
    const city = getCityById(settings.cityId);
    this.setData({ settings, cityText: city ? city.name : '未设置' });
  },

  update(patch) {
    const settings = { ...this.data.settings, ...patch };
    if (!storage.saveSettings(settings)) {
      wx.showToast({ title: '保存失败，可在「我的 › 数据与隐私」清理', icon: 'none' });
      return;
    }
    this.setSettings(settings);
  },

  onZiSect(e) {
    this.update({ ziSect: e.detail.key });
  },
  onTrueSolar(e) {
    this.update({ useTrueSolarTime: e.detail.value });
  },
  openCity() {
    this.setData({ showCitySheet: true });
  },
  closeCity() {
    this.setData({ showCitySheet: false });
  },
  onCitySelect(e) {
    this.setData({ showCitySheet: false });
    this.update({ cityId: e.detail.cityId });
  },

  openArticle(e) {
    wx.navigateTo({ url: `/sub/learn/article?id=${e.currentTarget.dataset.id}` });
  },
  openPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },
});
