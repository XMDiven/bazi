const { ARTICLES } = require('../../core/articles');

Page({
  data: {
    articles: ARTICLES.map(a => ({ id: a.id, title: a.title })),
  },
  onOpen(e) {
    wx.navigateTo({ url: `/sub/learn/article?id=${e.currentTarget.dataset.id}` });
  },
});
