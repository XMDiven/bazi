Component({
  options: { styleIsolation: 'apply-shared', multipleSlots: true },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    noop() {},
  },
});
