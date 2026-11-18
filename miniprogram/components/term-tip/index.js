Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    term: { type: String, value: '' },
    def: { type: String, value: '' },
    article: { type: String, value: '' },
  },
  methods: {
    onRead() {
      this.triggerEvent('read', { article: this.data.article });
    },
    onClose() {
      this.triggerEvent('close');
    },
  },
});
