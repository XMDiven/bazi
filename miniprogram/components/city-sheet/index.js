const { searchCities, groupByProvince } = require('../../core/cities');

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    value: { type: String, value: '', optionalTypes: [null] },
  },
  data: {
    query: '',
    results: [],
    groups: groupByProvince(),
    openProvince: '',
  },
  methods: {
    onInput(e) {
      const query = e.detail.value;
      this.setData({ query, results: searchCities(query) });
    },
    onProvince(e) {
      const { province } = e.currentTarget.dataset;
      this.setData({ openProvince: this.data.openProvince === province ? '' : province });
    },
    onCity(e) {
      this.triggerEvent('select', { cityId: e.currentTarget.dataset.id });
    },
    onNone() {
      this.triggerEvent('select', { cityId: null });
    },
    onClose() {
      this.triggerEvent('close');
    },
  },
});
