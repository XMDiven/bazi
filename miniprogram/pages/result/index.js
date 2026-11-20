const { METHOD_COPY, ZI_SECT_ITEMS } = require('../../core/methodHints');
const { decodeInput, encodeInput } = require('../../core/queryCodec');
const { calculate } = require('../../core/calculate');
const { buildResultView, diffPillars } = require('../../core/resultView');
const { buildCopyText, buildShareTitle } = require('../../core/shareText');
const { buildPosterSpec } = require('../../core/poster');
const { addRecent, findProfileByInput, updateProfile } = require('../../core/records');
const { TERMS } = require('../../core/articles');
const storage = require('../../services/storage');
const { track } = require('../../services/track');
const posterCanvas = require('../../services/posterCanvas');

const SOURCES = ['convert', 'archive', 'recent', 'reverse', 'almanac', 'share'];
const STORAGE_FULL_TIP = '保存失败，可在「我的 › 数据与隐私」清理';
// 弹层用大白话标题 + 术语副标题（PRD 7.2 / 5.5）；算法条标签保持简写
const METHOD_TITLES = { zi_sect: METHOD_COPY.ziSect.title, true_solar: METHOD_COPY.trueSolar.title, dst: '夏令时' };
const METHOD_HINTS = { zi_sect: METHOD_COPY.ziSect.hint, true_solar: METHOD_COPY.trueSolar.hint, dst: '' };

function methodOptions(kind, input) {
  if (kind === 'zi_sect') {
    return ZI_SECT_ITEMS.map(item => ({ key: item.key, text: `${item.text}（${item.sub}）`, selected: input.ziSect === item.key }));
  }
  if (kind === 'true_solar') {
    return [
      { key: 'on', text: '开启', selected: input.useTrueSolarTime },
      { key: 'off', text: '关闭', selected: !input.useTrueSolarTime },
    ];
  }
  return [
    { key: 'on', text: '是，减去 1 小时', selected: input.applyDst },
    { key: 'off', text: '否，按原时间换算', selected: !input.applyDst },
  ];
}

Page({
  data: {
    status: 'loading', // loading | ok | invalid | error
    view: null,
    changed: [],
    derivationOpen: false,
    profileName: '',
    methodKind: '',
    methodTitle: '',
    methodHint: '',
    methodOptions: [],
    showCitySheet: false,
    tip: { show: false, term: '', def: '', article: '' },
    showPoster: false,
    posterPath: '',
    posterDenied: false,
    fromProfile: false,
    profileDirty: false,
  },

  onLoad(query) {
    this.profileId = query.profileId || '';
    this.source = SOURCES.includes(query.source) ? query.source : 'convert';
    const input = decodeInput(query.q);
    if (!input) {
      this.setData({ status: 'invalid' });
      return;
    }
    let result;
    try {
      result = calculate(input);
    } catch (e) {
      this.setData({ status: 'error' });
      track('app_error', { where: 'result', code: 'calc' });
      return;
    }
    this.input = input;
    this.result = result;
    this.render([]);
    this.setData({ status: 'ok', fromProfile: !!this.profileId });
    track('result_view', { source: this.source });
    storage.saveRecent(addRecent(storage.loadRecent(), { input, summary: result.summary }, Date.now()));
  },

  onShow() {
    if (this.input) this.refreshProfileName();
  },

  render(changedKeys) {
    const view = buildResultView(this.result);
    this.setData({ view, changed: this.result.pillars.map(p => changedKeys.includes(p.key)) });
  },

  refreshProfileName() {
    const profile = findProfileByInput(storage.loadProfiles(), this.input);
    this.existingProfile = profile;
    this.setData({ profileName: profile ? profile.name : '' });
  },

  // ---------- 算法切换 ----------
  onChip(e) {
    const kind = e.detail.kind;
    this.setData({
      methodKind: kind,
      methodTitle: METHOD_TITLES[kind],
      methodHint: METHOD_HINTS[kind],
      methodOptions: methodOptions(kind, this.input),
    });
  },
  closeMethod() {
    this.setData({ methodKind: '' });
  },
  onMethodOption(e) {
    const { key } = e.currentTarget.dataset;
    const kind = this.data.methodKind;
    const input = { ...this.input };
    if (kind === 'zi_sect') input.ziSect = key;
    if (kind === 'dst') input.applyDst = key === 'on';
    if (kind === 'true_solar') {
      input.useTrueSolarTime = key === 'on';
      if (input.useTrueSolarTime && !input.cityId) {
        // 先关算法弹层再开城市弹层，避免两层遮罩叠在一起
        this.setData({ methodKind: '', showCitySheet: true });
        wx.showToast({ title: '开启真太阳时需先选择出生地', icon: 'none' });
        return;
      }
    }
    this.setData({ methodKind: '' });
    this.applyInput(kind, input);
  },
  onCitySelect(e) {
    this.setData({ showCitySheet: false, methodKind: '' });
    if (!e.detail.cityId) return;
    this.applyInput('true_solar', { ...this.input, useTrueSolarTime: true, cityId: e.detail.cityId });
  },
  closeCity() {
    this.setData({ showCitySheet: false });
  },
  applyInput(kind, input) {
    let after;
    try {
      after = calculate(input);
    } catch (e) {
      track('app_error', { where: 'result', code: 'calc' });
      return;
    }
    const diff = diffPillars(this.result, after);
    this.input = input;
    this.result = after;
    this.render(diff.changedKeys);
    this.refreshProfileName();
    wx.showToast({ title: diff.toast, icon: 'none' });
    track('method_toggle', { kind, changed: diff.changedKeys.length ? 1 : 0 });
    if (this.profileId) this.setData({ profileDirty: true });
  },
  onUpdateProfile() {
    const { list, error } = updateProfile(storage.loadProfiles(), this.profileId, { input: this.input, summary: this.result.summary }, Date.now());
    if (error) {
      wx.showToast({ title: error === 'DUPLICATE' ? '已有相同的档案' : '更新失败', icon: 'none' });
      return;
    }
    if (!storage.saveProfiles(list)) {
      wx.showToast({ title: STORAGE_FULL_TIP, icon: 'none' });
      return;
    }
    this.setData({ profileDirty: false });
    this.refreshProfileName();
    wx.showToast({ title: '已更新到档案', icon: 'none' });
  },

  // ---------- 术语、推导、节气 ----------
  onCell(e) {
    const term = TERMS[e.detail.term];
    if (!term) return;
    this.setData({ tip: { show: true, term: e.detail.term, def: term.def, article: term.article } });
    track('term_tip_open', { term: term.id });
  },
  closeTip() {
    this.setData({ 'tip.show': false });
  },
  onReadArticle(e) {
    this.setData({ 'tip.show': false });
    wx.navigateTo({ url: `/sub/learn/article?id=${e.detail.article}` });
  },
  toggleDerivation() {
    const open = !this.data.derivationOpen;
    this.setData({ derivationOpen: open });
    if (open && !this.derivationTracked) {
      this.derivationTracked = true;
      track('derivation_expand');
    }
  },
  openTerms() {
    wx.navigateTo({ url: `/sub/terms/index?year=${this.data.view.termsYear}` });
  },

  // ---------- 操作栏 ----------
  onSaveProfile() {
    if (this.existingProfile) {
      wx.navigateTo({ url: `/pages/profile-edit/index?id=${this.existingProfile.id}` });
      return;
    }
    wx.navigateTo({ url: `/pages/profile-edit/index?q=${encodeInput(this.input)}` });
  },
  onCopy() {
    wx.setClipboardData({
      data: buildCopyText(this.result),
      success: () => track('copy'),
    });
  },
  onPoster() {
    posterCanvas.draw(this, buildPosterSpec(this.data.view))
      .then(posterPath => this.setData({ posterPath, showPoster: true, posterDenied: false }))
      .catch(() => {
        track('app_error', { where: 'result', code: 'poster' });
        wx.showToast({ title: '图片生成失败', icon: 'none' });
      });
  },
  closePoster() {
    this.setData({ showPoster: false });
  },
  onPosterSave() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: () => {
        track('poster_save');
        this.setData({ showPoster: false });
        wx.showToast({ title: '已保存到相册', icon: 'none' });
      },
      fail: err => {
        const msg = (err && err.errMsg) || '';
        if (/auth|authorize|deny|denied/i.test(msg)) this.setData({ posterDenied: true });
      },
    });
  },
  openSetting() {
    wx.openSetting({});
  },

  // ---------- 状态页 ----------
  onRetry() {
    wx.switchTab({ url: '/pages/convert/index' });
  },

  onShareAppMessage() {
    if (!this.result) return { path: '/pages/convert/index' };
    track('share', { from: 'result' });
    return { title: buildShareTitle(this.result), path: '/pages/convert/index' };
  },
});
