const { MIN_DATE, MAX_DATE } = require('../../core/constants');
const { beijingNow } = require('../../core/wallTime');
const { buildYearTerms } = require('../../core/almanac');
const { isoDate } = require('../../core/format');

const YEARS = Array.from({ length: MAX_DATE.year - MIN_DATE.year + 1 }, (_, i) => MIN_DATE.year + i);

Page({
  data: {
    years: YEARS.map(y => `${y}年`),
    yearIndex: 0,
    year: 0,
    rows: [],
  },

  onLoad(query) {
    const now = beijingNow(Date.now());
    const asked = Number(query.year);
    this.showYear(YEARS.includes(asked) ? asked : now.year);
  },

  showYear(year) {
    this.rows = buildYearTerms(year, beijingNow(Date.now()));
    this.setData({ year, yearIndex: YEARS.indexOf(year), rows: this.rows });
  },

  onYear(e) {
    this.showYear(YEARS[Number(e.detail.value)]);
  },

  onRow(e) {
    const row = this.rows[Number(e.currentTarget.dataset.index)];
    wx.navigateTo({ url: `/sub/day/index?date=${isoDate(row.date)}` });
  },
});
