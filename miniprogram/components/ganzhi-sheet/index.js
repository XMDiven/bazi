const { JIA_ZI } = require('../../core/pillarOptions');

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    options: { type: Array, value: [] }, // 可选的干支
    value: { type: String, value: '', optionalTypes: [null] },
    allowEmpty: { type: Boolean, value: false },
  },
  data: { cells: [] },
  observers: {
    'options, value': function build(options, value) {
      const allowed = new Set(options || []);
      this.setData({ cells: JIA_ZI.map(gz => ({ gz, enabled: allowed.has(gz), selected: gz === value })) });
    },
  },
  methods: {
    onCell(e) {
      const { gz, enabled } = e.currentTarget.dataset;
      if (enabled) this.triggerEvent('select', { ganzhi: gz });
    },
    onEmpty() {
      this.triggerEvent('select', { ganzhi: null });
    },
    onClose() {
      this.triggerEvent('close');
    },
  },
});
