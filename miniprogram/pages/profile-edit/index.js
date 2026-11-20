const { decodeInput, encodeInput } = require('../../core/queryCodec');
const { validateInput } = require('../../core/validate');
const { calculate } = require('../../core/calculate');
const { getCityById } = require('../../core/cities');
const { dateText, timeText } = require('../../core/pickerModel');
const R = require('../../core/records');
const storage = require('../../services/storage');
const { track } = require('../../services/track');
const { METHOD_COPY, TRUE_SOLAR_DISABLED_HINT, ZI_SECT_ITEMS } = require('../../core/methodHints');

const NAME_ERRORS = {
  NAME_REQUIRED: '请填写称呼',
  NAME_TOO_LONG: '称呼最多 10 个字',
  LIMIT: '档案已满 100 条，请先删除不需要的档案',
};
const STORAGE_FULL_TIP = '保存失败，可在「我的 › 数据与隐私」清理';

function summaryOf(input) {
  try {
    return calculate(input).summary;
  } catch (e) {
    return '';
  }
}

Page({
  data: {
    status: 'loading', // loading | ok | invalid
    isEdit: false,
    name: '',
    input: null,
    dateText: '',
    timeText: '',
    cityText: '',
    summary: '',
    errors: {},
    ziSectItems: ZI_SECT_ITEMS,
    copy: METHOD_COPY,
    trueSolarDisabledHint: TRUE_SOLAR_DISABLED_HINT,
    showDateSheet: false,
    showCitySheet: false,
  },

  onLoad(query) {
    if (query.id) {
      const profile = storage.loadProfiles().find(p => p.id === query.id);
      if (!profile) {
        this.setData({ status: 'invalid' });
        return;
      }
      this.profile = profile;
      wx.setNavigationBarTitle({ title: '编辑档案' });
      this.setData({ isEdit: true, name: profile.name });
      this.setInput(profile.input);
    } else {
      const input = decodeInput(query.q);
      if (!input) {
        this.setData({ status: 'invalid' });
        return;
      }
      wx.setNavigationBarTitle({ title: '存入档案' });
      this.setInput(input);
    }
    this.setData({ status: 'ok' });
  },

  setInput(input) {
    const city = getCityById(input.cityId);
    this.setData({
      input,
      dateText: dateText(input),
      timeText: timeText(input),
      cityText: city ? `${city.name} · ${city.province}` : '',
      summary: summaryOf(input),
    });
  },

  onName(e) {
    this.setData({ name: e.detail.value, 'errors.name': '' });
  },
  openDate() {
    this.setData({ showDateSheet: true });
  },
  closeDate() {
    this.setData({ showDateSheet: false });
  },
  onDateConfirm(e) {
    this.setInput({ ...this.data.input, ...e.detail });
    this.setData({ showDateSheet: false, 'errors.date': '', 'errors.time': '' });
  },
  openCity() {
    this.setData({ showCitySheet: true });
  },
  closeCity() {
    this.setData({ showCitySheet: false });
  },
  onCitySelect(e) {
    this.setInput({ ...this.data.input, cityId: e.detail.cityId });
    this.setData({ showCitySheet: false, 'errors.city': '' });
  },
  onTrueSolar(e) {
    this.setInput({ ...this.data.input, useTrueSolarTime: e.detail.value });
  },
  onZiSect(e) {
    this.setInput({ ...this.data.input, ziSect: e.detail.key });
  },

  onSave() {
    const { input, name } = this.data;
    const { ok, errors } = validateInput(input);
    if (!ok) {
      this.setData({ errors });
      return;
    }
    const summary = summaryOf(input);
    if (this.profile && summary !== this.profile.summary) {
      wx.showModal({
        content: `四柱将变为 ${summary}`,
        confirmText: '保存',
        success: res => {
          if (res.confirm) this.commit(name, input, summary);
        },
      });
      return;
    }
    this.commit(name, input, summary);
  },

  commit(name, input, summary) {
    const list = storage.loadProfiles();
    const nowMs = Date.now();
    const result = this.profile
      ? R.updateProfile(list, this.profile.id, { name, input, summary }, nowMs)
      : R.createProfile(list, { name, input, summary }, nowMs);
    if (result.error === 'DUPLICATE') {
      const existing = result.existing;
      wx.showModal({
        content: `已在档案中：${existing.name}`,
        confirmText: '打开',
        cancelText: '取消',
        success: res => {
          if (res.confirm) wx.redirectTo({ url: `/pages/result/index?q=${encodeInput(existing.input)}&source=archive&profileId=${existing.id}` });
        },
      });
      return;
    }
    if (result.error) {
      this.setData({ 'errors.name': NAME_ERRORS[result.error] || '' });
      return;
    }
    if (!storage.saveProfiles(result.list)) {
      wx.showToast({ title: STORAGE_FULL_TIP, icon: 'none' });
      return;
    }
    track('profile_save');
    wx.showToast({ title: this.profile ? '已保存' : '已存入档案', icon: 'none' });
    wx.navigateBack();
  },
});
