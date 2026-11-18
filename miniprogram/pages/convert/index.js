const { SUBTITLE, DISCLAIMER_SHORT } = require('../../core/constants');
const { FEATURES } = require('../../core/features');
const { beijingNow } = require('../../core/wallTime');
const { validateInput } = require('../../core/validate');
const { calculate } = require('../../core/calculate');
const { getCityById } = require('../../core/cities');
const { encodeInput } = require('../../core/queryCodec');
const { dateText, timeText } = require('../../core/pickerModel');
const { JIA_ZI, monthOptionsForYear, timeOptionsForDay } = require('../../core/pillarOptions');
const storage = require('../../services/storage');
const { track } = require('../../services/track');
const { APP_SHARE_TITLE } = require('../../core/shareText');
const { METHOD_COPY, ZI_SECT_ITEMS, ziSectMatters, trueSolarPreview } = require('../../core/methodHints');
const { TERMS } = require('../../core/articles');

const FIELD_ORDER = ['date', 'time', 'city'];
const FIELD_SELECTOR = { date: '#date-field', time: '#date-field', city: '#city-field' };
const RV_FIELDS = [
  { key: 'year', label: '年柱', id: 'rv-year' },
  { key: 'month', label: '月柱', id: 'rv-month' },
  { key: 'day', label: '日柱', id: 'rv-day' },
  { key: 'time', label: '时柱', id: 'rv-time' },
];
const RV_REQUIRED_MSG = { year: '请选择年柱', month: '请选择月柱', day: '请选择日柱' };

function defaultInput(settings) {
  const today = beijingNow(Date.now());
  return {
    calendar: 'solar', year: today.year, month: today.month, day: today.day, isLeapMonth: false,
    precision: 'exact', hour: 12, minute: 0, shichen: 6,
    cityId: settings.cityId, useTrueSolarTime: settings.useTrueSolarTime, ziSect: settings.ziSect, applyDst: false,
  };
}

function rvOptions(field, rv, sect) {
  if (field === 'year' || field === 'day') return JIA_ZI;
  if (field === 'month') return rv.year ? monthOptionsForYear(rv.year) : [];
  return rv.day ? timeOptionsForDay(rv.day, sect).map(o => o.ganzhi) : [];
}

/** 上游变化后，清空不再合法的下游选择 */
function pruneReverse(rv, sect) {
  const next = { ...rv };
  if (next.month && !rvOptions('month', next, sect).includes(next.month)) next.month = null;
  if (next.time && !rvOptions('time', next, sect).includes(next.time)) next.time = null;
  return next;
}

Page({
  data: {
    subtitle: SUBTITLE,
    disclaimer: DISCLAIMER_SHORT,
    showModeSwitch: FEATURES.reverseLookup,
    mode: 'birth',
    ziSectItems: ZI_SECT_ITEMS,
    copy: METHOD_COPY,
    input: null,
    ziSectVisible: false,
    solarPreview: null,
    tip: { show: false, term: '', def: '', article: '' },
    dateText: '',
    timeText: '',
    cityText: '',
    errors: {},
    showDateSheet: false,
    showCitySheet: false,
    showDstSheet: false,
    rvFields: RV_FIELDS,
    rv: { year: null, month: null, day: null, time: null },
    rvSect: 'late23',
    rvErrors: {},
    rvSheetField: '',
    rvSheetTitle: '',
    rvSheetOptions: [],
  },

  onLoad() {
    const settings = storage.loadSettings();
    this.setInput(storage.loadLastInput() || defaultInput(settings));
    this.setData({ rvSect: settings.ziSect });
  },

  onShow() {
    const app = getApp();
    const prefill = app.globalData.prefill;
    if (!prefill) return;
    app.globalData.prefill = null;
    const { year, month, day } = prefill.date;
    this.setInput({ ...this.data.input, calendar: 'solar', year, month, day, isLeapMonth: false, precision: 'unknown' });
    this.setData({ mode: 'birth', errors: {} });
  },

  setInput(input) {
    const city = getCityById(input.cityId);
    this.setData({
      input,
      dateText: dateText(input),
      timeText: timeText(input),
      cityText: city ? `${city.name} · ${city.province}` : '',
      // 隐藏子时派别时不改 input.ziSect，用户已选的值保留（PRD 5.5）
      ziSectVisible: ziSectMatters(input),
      solarPreview: trueSolarPreview(input),
    });
  },

  onMode(e) {
    this.setData({ mode: e.currentTarget.dataset.key });
  },

  // ---------- 出生信息 ----------
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
    this.setData({ 'errors.city': '' });
  },
  onZiSect(e) {
    this.setInput({ ...this.data.input, ziSect: e.detail.key });
  },

  onSubmit() {
    const input = { ...this.data.input, applyDst: false };
    const { ok, errors } = validateInput(input);
    if (!ok) {
      this.setData({ errors });
      const first = FIELD_ORDER.find(k => errors[k]);
      wx.pageScrollTo({ selector: FIELD_SELECTOR[first], duration: 200 });
      return;
    }
    this.setData({ errors: {} });
    let dstEligible = false;
    try {
      dstEligible = calculate(input).method.dstEligible;
    } catch (e) {
      track('app_error', { where: 'convert', code: 'calc' });
    }
    if (dstEligible) {
      this.pendingInput = input;
      this.setData({ showDstSheet: true });
      return;
    }
    this.go(input);
  },
  onDstYes() {
    this.setData({ showDstSheet: false });
    this.go({ ...this.pendingInput, applyDst: true });
  },
  onDstNo() {
    this.setData({ showDstSheet: false });
    this.go({ ...this.pendingInput, applyDst: false });
  },
  closeDst() {
    this.setData({ showDstSheet: false });
  },

  go(input) {
    storage.saveLastInput(input);
    this.setInput(input);
    track('convert_submit', {
      calendar: input.calendar,
      precision: input.precision,
      true_solar: input.useTrueSolarTime ? 1 : 0,
      zi_sect: input.ziSect,
    });
    wx.navigateTo({ url: `/pages/result/index?q=${encodeInput(input)}&source=convert` });
  },

  // ---------- 四柱反查 ----------
  openRv(e) {
    const field = e.currentTarget.dataset.field;
    const def = RV_FIELDS.find(f => f.key === field);
    this.setData({
      rvSheetField: field,
      rvSheetTitle: `选择${def.label}`,
      rvSheetOptions: rvOptions(field, this.data.rv, this.data.rvSect),
    });
  },
  closeRv() {
    this.setData({ rvSheetField: '' });
  },
  onRvSelect(e) {
    const rv = pruneReverse({ ...this.data.rv, [this.data.rvSheetField]: e.detail.ganzhi }, this.data.rvSect);
    this.setData({ rv, rvSheetField: '', rvErrors: {} });
  },
  onRvSect(e) {
    const rvSect = e.detail.key;
    this.setData({ rvSect, rv: pruneReverse(this.data.rv, rvSect) });
  },
  onRvSubmit() {
    const { rv, rvSect } = this.data;
    const rvErrors = {};
    for (const key of Object.keys(RV_REQUIRED_MSG)) if (!rv[key]) rvErrors[key] = RV_REQUIRED_MSG[key];
    if (Object.keys(rvErrors).length) {
      this.setData({ rvErrors });
      return;
    }
    const q = [`y=${encodeURIComponent(rv.year)}`, `m=${encodeURIComponent(rv.month)}`, `d=${encodeURIComponent(rv.day)}`,
      `t=${encodeURIComponent(rv.time || '')}`, `sect=${rvSect}`].join('&');
    wx.navigateTo({ url: `/pages/reverse/index?${q}` });
  },

  // ---------- 术语卡 ----------
  openTip(e) {
    const name = e.currentTarget.dataset.term;
    const term = TERMS[name];
    this.setData({ tip: { show: true, term: name, def: term.def, article: term.article } });
    track('term_tip_open', { term: term.id });
  },
  closeTip() {
    this.setData({ 'tip.show': false });
  },
  onReadArticle(e) {
    this.setData({ 'tip.show': false });
    wx.navigateTo({ url: `/sub/learn/article?id=${e.detail.article}` });
  },

  // 右下角分享按钮与右上角菜单共用：只分享换算首页，不带表单里的任何输入
  onShareAppMessage() {
    track('share', { from: 'convert' });
    return { title: APP_SHARE_TITLE, path: '/pages/convert/index' };
  },
});
