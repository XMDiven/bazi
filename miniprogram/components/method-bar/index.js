const IDS = { zi_sect: 'method-zi', true_solar: 'method-solar', dst: 'method-dst' };

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    chips: { type: Array, value: [] }, // [{kind, text}]
  },
  data: { ids: IDS },
  methods: {
    onChip(e) {
      this.triggerEvent('chip', { kind: e.currentTarget.dataset.kind });
    },
  },
});
