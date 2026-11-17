// 审核降级开关（PRD 2.3）：被驳回时只改这里的值并重新提审
const FEATURES = {
  wuXingCount: true,
  naYin: true,
  hideGan: true,
  reverseLookup: true,
  hourTable: true,
};

// 逐级关闭的顺序
const DOWNGRADE_ORDER = ['wuXingCount', 'naYin', 'hideGan', 'reverseLookup', 'hourTable'];

module.exports = { FEATURES, DOWNGRADE_ORDER };
