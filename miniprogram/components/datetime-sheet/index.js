const P = require('../../core/pickerModel');
const { SHICHEN, clockTimeHint } = require('../../core/shichen');

const CALENDAR_ITEMS = [{ key: 'solar', text: '公历' }, { key: 'lunar', text: '农历' }];
const PRECISION_ITEMS = [
  { key: 'exact', text: '精确到分钟' },
  { key: 'shichen', text: '只知时辰' },
  { key: 'unknown', text: '不详' },
];

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    // {calendar, year, month, day, isLeapMonth, precision, hour, minute, shichen}
    value: { type: Object, value: null },
  },
  data: {
    calendarItems: CALENDAR_ITEMS,
    precisionItems: PRECISION_ITEMS,
    shichenList: SHICHEN,
    hourOptions: P.HOUR_OPTIONS,
    minuteOptions: P.MINUTE_OPTIONS,
    draft: null,
    columns: null,
    dateIndexes: [0, 0, 0],
    timeIndexes: [12, 0],
    clockHint: '',
  },
  observers: {
    show(show) {
      if (show && this.data.value) this.load(this.data.value);
    },
  },
  methods: {
    load(value) {
      const date = P.normalizeDate(value);
      this.render({ ...value, ...date });
    },
    render(draft) {
      this.setData({
        draft,
        columns: P.columnsFor(draft),
        dateIndexes: P.toIndexes(draft),
        timeIndexes: [draft.hour, draft.minute],
        clockHint: clockTimeHint(draft.hour, draft.minute),
      });
    },
    onCalendar(e) {
      const { draft } = this.data;
      this.render({ ...draft, ...P.switchCalendar(draft, e.detail.key) });
    },
    onDateChange(e) {
      const { draft } = this.data;
      this.render({ ...draft, ...P.fromIndexes(draft, e.detail.value) });
    },
    onPrecision(e) {
      this.render({ ...this.data.draft, precision: e.detail.key });
    },
    onTimeChange(e) {
      const [hour, minute] = e.detail.value;
      this.setData({ draft: { ...this.data.draft, hour, minute }, timeIndexes: [hour, minute], clockHint: clockTimeHint(hour, minute) });
    },
    onShichen(e) {
      this.setData({ draft: { ...this.data.draft, shichen: Number(e.currentTarget.dataset.index) } });
    },
    onConfirm() {
      this.triggerEvent('confirm', this.data.draft);
    },
    onClose() {
      this.triggerEvent('close');
    },
  },
});
