const { FEATURES } = require('../../core/features');
const { beijingNow } = require('../../core/wallTime');
const { reverseLookup } = require('../../core/reverse');
const { buildReverseItems, inputForHit } = require('../../core/reverseView');
const { encodeInput } = require('../../core/queryCodec');
const { resultBucket } = require('../../core/analytics');
const { track } = require('../../services/track');

const safe = v => {
  try {
    return decodeURIComponent(v || '');
  } catch (e) {
    return '';
  }
};

Page({
  data: {
    status: 'loading', // loading | ok | empty | off
    title: '',
    items: [],
    notice: ['结果均为北京时间，未使用真太阳时与夏令时'],
  },

  onLoad(query) {
    if (!FEATURES.reverseLookup) {
      this.setData({ status: 'off' });
      return;
    }
    const target = { year: safe(query.y), month: safe(query.m), day: safe(query.d), time: safe(query.t) || null };
    this.sect = query.sect === 'midnight' ? 'midnight' : 'late23';
    this.hasTime = !!target.time;
    this.hits = reverseLookup(target, this.sect, beijingNow(Date.now()));
    track('reverse_submit', { result_bucket: resultBucket(this.hits.length) });
    this.setData({
      status: this.hits.length ? 'ok' : 'empty',
      title: [target.year, target.month, target.day, target.time].filter(Boolean).join(' '),
      items: buildReverseItems(this.hits),
    });
  },

  onItem(e) {
    const hit = this.hits[Number(e.currentTarget.dataset.index)];
    const input = inputForHit(hit, this.hasTime, this.sect);
    wx.navigateTo({ url: `/pages/result/index?q=${encodeInput(input)}&source=reverse` });
  },

  openK4() {
    wx.navigateTo({ url: '/sub/learn/article?id=K4' });
  },
});
