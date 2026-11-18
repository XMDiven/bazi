Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    // buildResultView().table
    table: { type: Object, value: null },
    changed: { type: Array, value: [] },
  },
  methods: {
    onCell(e) {
      this.triggerEvent('cell', { term: e.currentTarget.dataset.term });
    },
  },
});
