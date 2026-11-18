const { isoDate } = require('../../core/format');

const SWIPE_PX = 50;
const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    cells: { type: Array, value: [] }, // buildMonth().cells
  },
  data: { weekHead: WEEK_HEAD, viewCells: [] },
  observers: {
    cells(cells) {
      this.setData({ viewCells: cells.map(c => ({ ...c, key: isoDate(c.date) })) });
    },
  },
  methods: {
    onCell(e) {
      this.triggerEvent('select', { date: e.currentTarget.dataset.date });
    },
    onTouchStart(e) {
      this.touchX = e.touches[0].clientX;
    },
    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchX;
      if (dx < -SWIPE_PX) this.triggerEvent('next');
      else if (dx > SWIPE_PX) this.triggerEvent('prev');
    },
  },
});
