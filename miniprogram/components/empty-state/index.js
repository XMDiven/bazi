Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    text: { type: String, value: '' },
    actionText: { type: String, value: '' },
  },
  methods: {
    onAction() {
      this.triggerEvent('action');
    },
  },
});
