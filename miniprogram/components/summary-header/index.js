Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    groups: { type: Array, value: [] },
    subline: { type: String, value: '' },
    changed: { type: Array, value: [] }, // 与 groups 对齐的布尔数组
  },
});
