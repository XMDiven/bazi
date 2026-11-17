Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    items: { type: Array, value: [] }, // [{key, text}]
    value: { type: String, value: '' },
  },
  methods: {
    onTap(e) {
      const { key } = e.currentTarget.dataset;
      if (key !== this.data.value) this.triggerEvent('change', { key });
    },
  },
});
