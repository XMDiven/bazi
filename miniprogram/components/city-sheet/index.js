const { searchCities, groupByProvince, hotCities, recentCities } = require('../../core/cities');
const storage = require('../../services/storage');

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
    recentList: [],
    hotList: hotCities(),
  },
  observers: {
    show(show) {
      if (!show) return;
      // 每次打开时重算：刚换算或刚存的档案，下次打开就能看到
      this.setData({
        recentList: recentCities({
          defaultCityId: storage.loadSettings().cityId,
          recent: storage.loadRecent(),
          profiles: storage.loadProfiles(),
        }),
      });
    },
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
