const privacy = require('../../services/privacy');

Component({
  options: { styleIsolation: 'apply-shared' },
  data: { show: false },
  lifetimes: {
    attached() {
      this.unsubscribe = privacy.subscribe(resolve => {
        this.resolve = resolve;
        this.setData({ show: true });
      });
    },
    detached() {
      if (this.unsubscribe) this.unsubscribe();
      this.finish({ event: 'disagree' });
    },
  },
  methods: {
    finish(result) {
      const { resolve } = this;
      this.resolve = null;
      if (resolve) resolve(result);
      if (this.data.show) this.setData({ show: false });
    },
    onAgree() {
      this.finish({ buttonId: 'privacy-agree', event: 'agree' });
    },
    onDisagree() {
      this.finish({ event: 'disagree' });
    },
    openContract() {
      wx.openPrivacyContract({});
    },
  },
});
