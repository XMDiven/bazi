const { MIN_DATE, MAX_DATE } = require('../../core/constants');
const { beijingNow } = require('../../core/wallTime');
const { buildMonth, buildDayDetail } = require('../../core/almanac');
const { nextTermFrom } = require('../../core/terms');
const { isoDate, parseIsoDate } = require('../../core/format');
const storage = require('../../services/storage');

const pad2 = n => String(n).padStart(2, '0');
const monthIndex = (y, m) => y * 12 + (m - 1);
const MIN_INDEX = monthIndex(MIN_DATE.year, MIN_DATE.month);
const MAX_INDEX = monthIndex(MAX_DATE.year, MAX_DATE.month);

function todayDate() {
  const now = beijingNow(Date.now());
  return { year: now.year, month: now.month, day: now.day };
}

Page({
  data: {
    year: 0,
    month: 0,
    title: '',
    yearGanZhiText: '',
    cells: [],
    pickerValue: '',
    pickerStart: `${MIN_DATE.year}-${pad2(MIN_DATE.month)}`,
    pickerEnd: `${MAX_DATE.year}-${pad2(MAX_DATE.month)}`,
    detail: null,
    nextTermText: '',
    festivalText: '',
  },

  onLoad() {
    const today = todayDate();
    this.selected = today;
    this.showMonth(today.year, today.month);
  },

  onShow() {
    // 子时派别可能在「我的」里改过；今天也可能已变化
    if (this.data.year) this.showMonth(this.data.year, this.data.month);
  },

  showMonth(year, month) {
    const idx = Math.min(Math.max(monthIndex(year, month), MIN_INDEX), MAX_INDEX);
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const grid = buildMonth(y, m, todayDate(), this.selected);
    this.setData({
      year: y,
      month: m,
      title: grid.title,
      yearGanZhiText: grid.yearGanZhiText,
      cells: grid.cells,
      pickerValue: `${y}-${pad2(m)}`,
    });
    this.showDetail();
  },

  showDetail() {
    const sel = this.selected;
    const detail = buildDayDetail(sel, storage.loadSettings().ziSect);
    const { term, days } = nextTermFrom({ ...sel, hour: 23, minute: 59 });
    this.setData({ detail, festivalText: detail.festivals.join('、'), nextTermText: `距${term.name}还有 ${days} 天` });
  },

  onPrev() {
    this.showMonth(this.data.year, this.data.month - 1);
  },
  onNext() {
    this.showMonth(this.data.year, this.data.month + 1);
  },
  onToday() {
    const today = todayDate();
    this.selected = today;
    this.showMonth(today.year, today.month);
  },
  onPick(e) {
    const [y, m] = e.detail.value.split('-').map(Number);
    this.showMonth(y, m);
  },
  onSelect(e) {
    const date = parseIsoDate(e.detail.date);
    if (!date) return;
    this.selected = date;
    this.showMonth(date.year, date.month);
  },

  openDay() {
    wx.navigateTo({ url: `/sub/day/index?date=${isoDate(this.selected)}` });
  },
  openTerms() {
    wx.navigateTo({ url: `/sub/terms/index?year=${this.selected.year}` });
  },
});
