const { getCityById, searchCities, groupByProvince, hotCities, recentCities } = require('../../core/cities');
const storage = require('../../services/storage');

const GROUPS = groupByProvince();

/** 已选城市在两栏里的位置；没选时停在第一个省 */
function locate(cityId) {
  const city = getCityById(cityId);
  const pi = city ? GROUPS.findIndex(g => g.province === city.province) : -1;
  if (pi < 0) return { activeIndex: 0, selectedIndex: -1, cityAnchor: 'c-0-0' };
  return { activeIndex: pi, selectedIndex: pi, cityAnchor: `c-${pi}-${GROUPS[pi].cities.findIndex(c => c.id === cityId)}` };
}

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    value: { type: String, value: '', optionalTypes: [null] },
  },
  data: {
    query: '',
    results: [],
    groups: GROUPS,
    activeIndex: 0,
    selectedIndex: -1,
    cityAnchor: '',
    recentList: [],
    hotList: hotCities(),
  },
  observers: {
    show(show) {
      if (!show) return;
      // 每次打开时重算：刚换算或刚存的档案，下次打开就能看到；并定位到已选城市所在的省
      this.setData({
        query: '',
        results: [],
        ...locate(this.data.value),
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
    onClearQuery() {
      this.setData({ query: '', results: [] });
    },
    onProvince(e) {
      const index = Number(e.currentTarget.dataset.index);
      // 每个省的锚点 id 不同，切换省份时右栏一定会回到顶部
      this.setData({ activeIndex: index, cityAnchor: `c-${index}-0` });
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
