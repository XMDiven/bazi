// 5 条关键旅程（PRD 3）。前置：微信开发者工具已开启服务端口，并已执行“工具 → 构建 npm”。
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const automator = require('miniprogram-automator');
const { encodeInput } = require('../miniprogram/core/queryCodec');

const cliPath = process.env.WX_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const projectPath = path.resolve(__dirname, '..');
const WAIT = 800;

const baseInput = {
  calendar: 'solar', year: 2024, month: 3, day: 10, isLeapMonth: false,
  precision: 'exact', hour: 23, minute: 30, shichen: 12,
  cityId: null, useTrueSolarTime: false, ziSect: 'late23', applyDst: false,
};

async function summaryText(page) {
  const header = await page.$('#summary');
  const groups = await header.$$('.group');
  return (await Promise.all(groups.map(g => g.text()))).join(' ');
}

describe('key journeys', { timeout: 180000 }, () => {
  let mp;

  before(async () => {
    mp = await automator.launch({ cliPath, projectPath });
  });
  after(async () => {
    if (mp) await mp.close();
  });
  beforeEach(async () => {
    await mp.callWxMethod('clearStorageSync');
  });

  test('1 核对：切换子时派别', async () => {
    let page = await mp.reLaunch('/pages/convert/index');
    await page.waitFor(WAIT);
    await page.setData({ input: baseInput, mode: 'birth' });
    await (await page.$('#submit')).tap();
    await page.waitFor(WAIT);
    page = await mp.currentPage();
    assert.equal(page.path, 'pages/result/index');
    assert.equal(await summaryText(page), '甲辰 丁卯 甲戌 甲子');

    const bar = await page.$('method-bar');
    await (await bar.$('#method-zi')).tap();
    await page.waitFor(WAIT);
    const options = await page.$$('.method-option');
    await options[1].tap(); // 0:00 换日
    await page.waitFor(WAIT);
    assert.equal(await summaryText(page), '甲辰 丁卯 癸酉 甲子');
  });

  test('2 记录家人：存入档案', async () => {
    let page = await mp.reLaunch(`/pages/result/index?q=${encodeInput(baseInput)}&source=convert`);
    await page.waitFor(WAIT);
    await (await page.$('#save-profile')).tap();
    await page.waitFor(WAIT);
    page = await mp.currentPage();
    assert.equal(page.path, 'pages/profile-edit/index');
    await (await page.$('#name-input')).input('妈妈');
    await page.waitFor(200);
    await (await page.$('#save')).tap();
    await page.waitFor(WAIT);
    page = await mp.switchTab('/pages/archive/index');
    await page.waitFor(WAIT);
    const items = await page.$$('.profile-item');
    assert.equal(items.length, 1);
    assert.ok((await items[0].text()).includes('妈妈'));
  });

  test('3 反查', async () => {
    let page = await mp.reLaunch('/pages/convert/index');
    await page.waitFor(WAIT);
    await (await page.$('#mode-reverse')).tap();
    await page.setData({ rv: { year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }, rvSect: 'late23' });
    await (await page.$('#rv-submit')).tap();
    await page.waitFor(WAIT * 2);
    page = await mp.currentPage();
    assert.equal(page.path, 'pages/reverse/index');
    const items = await page.$$('.reverse-item');
    assert.ok((await items[0].text()).includes('1990年5月12日'));
  });

  test('4 查日子：用这一天换算', async () => {
    let page = await mp.switchTab('/pages/almanac/index');
    await page.waitFor(WAIT);
    await page.callMethod('showMonth', 2024, 2);
    await page.waitFor(WAIT);
    const grid = await page.$('#month-grid');
    const cells = await grid.$$('.day-cell');
    let target = null;
    for (const c of cells) {
      if ((await c.attribute('data-date')) === '2024-02-04') target = c;
    }
    assert.ok(target, 'cell 2024-02-04 not found');
    await target.tap();
    await page.waitFor(WAIT);
    await (await page.$('#open-day')).tap();
    await page.waitFor(WAIT);
    page = await mp.currentPage();
    assert.equal(page.path, 'sub/day/index');
    await (await page.$('#use-day')).tap();
    await page.waitFor(WAIT);
    page = await mp.currentPage();
    assert.equal(page.path, 'pages/convert/index');
    assert.equal(await page.data('dateText'), '2024年2月4日');
    assert.equal(await page.data('input.precision'), 'unknown');
  });

  test('5 学习：术语弹层与全文', async () => {
    let page = await mp.reLaunch(`/pages/result/index?q=${encodeInput(baseInput)}&source=convert`);
    await page.waitFor(WAIT);
    const table = await page.$('#pillar-table');
    const ganCells = await table.$$('.gan-cell');
    await ganCells[0].tap();
    await page.waitFor(WAIT);
    assert.equal(await page.data('tip.show'), true);
    const tip = await page.$('term-tip');
    await (await tip.$('#read-article')).tap();
    await page.waitFor(WAIT);
    page = await mp.currentPage();
    assert.equal(page.path, 'sub/learn/article');
  });
});
