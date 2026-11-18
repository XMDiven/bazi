const { buildDayDetail } = require('../../core/almanac');
const { parseIsoDate } = require('../../core/format');
const { TERMS } = require('../../core/articles');
const storage = require('../../services/storage');
const { track } = require('../../services/track');

Page({
  data: {
    status: 'loading',
    detail: null,
    festivalText: '',
    tip: { show: false, term: '', def: '', article: '' },
  },

  onLoad(query) {
    const date = parseIsoDate(query.date);
    if (!date) {
      this.setData({ status: 'invalid' });
      return;
    }
    this.date = date;
    const detail = buildDayDetail(date, storage.loadSettings().ziSect);
    this.setData({ status: 'ok', detail, festivalText: detail.festivals.join('、') });
    track('almanac_day_open');
  },

  onUseDay() {
    getApp().globalData.prefill = { date: this.date };
    wx.switchTab({ url: '/pages/convert/index' });
  },

  onTerm(e) {
    const name = e.currentTarget.dataset.term;
    const term = TERMS[name];
    if (!term) return;
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
});
