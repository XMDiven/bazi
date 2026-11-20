// 退场动画时长，与 index.wxss 里的 sheet-out / mask-out 保持一致
const LEAVE_MS = 200;

Component({
  options: { styleIsolation: 'apply-shared', multipleSlots: true },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
  },
  // show 由页面控制；visible 决定节点是否还在，关闭时先播退场动画再移除
  data: { visible: false, leaving: false },
  observers: {
    show(show) {
      clearTimeout(this.leaveTimer);
      if (show) {
        this.setData({ visible: true, leaving: false });
      } else if (this.data.visible) {
        this.setData({ leaving: true });
        this.leaveTimer = setTimeout(() => this.setData({ visible: false, leaving: false }), LEAVE_MS);
      }
    },
  },
  lifetimes: {
    attached() {
      if (this.data.show) this.setData({ visible: true });
    },
    detached() {
      clearTimeout(this.leaveTimer);
    },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    noop() {},
  },
});
