const { getArticle } = require('../../core/articles');
const { calculate } = require('../../core/calculate');
const { buildResultView } = require('../../core/resultView');
const { track } = require('../../services/track');

function exampleView(example) {
  if (!example) return null;
  try {
    const view = buildResultView(calculate(example.input));
    return { groups: view.summaryGroups, subline: view.subline, note: example.note };
  } catch (e) {
    return null;
  }
}

Page({
  data: { status: 'loading', article: null, example: null },

  onLoad(query) {
    const article = getArticle(query.id);
    if (!article) {
      this.setData({ status: 'invalid' });
      return;
    }
    wx.setNavigationBarTitle({ title: article.title });
    this.setData({ status: 'ok', article, example: exampleView(article.example) });
    track('article_view', { article: article.id });
  },
});
