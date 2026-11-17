# 干支历换算 v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/prd.md`（v1.0）实现完整的微信小程序，包含换算、四柱反查、万年历、节气表、档案、知识库，全部本地计算，不含任何解读。

**Architecture:** 分三层，依赖只能自上而下：

1. **pages / components**：只负责渲染和转发交互。
2. **services**：对 `wx` 能力的薄封装，包括存储、隐私授权、埋点、海报。
3. **core**：纯 CommonJS 函数，不依赖 `wx`，可在 Node 中直接测试。

所有“展示用的字符串”都在 core 里生成并测试，页面只做 `setData`。换算采用“双时刻”模型：

- 年柱、月柱用**北京时间**（只扣除夏令时）判定；
- 日柱、时柱用**修正后的当地时刻**（叠加真太阳时）判定。

**Tech Stack:** 原生微信小程序（WXML / WXSS / JS，CommonJS，基础库 ≥ 3.0.0）；运行时依赖只有 `lunar-javascript@1.7.8`（MIT）；单元测试用 Node ≥ 22 内置的 `node:test`；端到端测试用 `miniprogram-automator@0.13.0`（开发依赖，MIT，微信官方）。

**Spec:** `docs/prd.md`。每个任务都标注了对应的 PRD 章节，执行前先读该章节。章节号以 `PRD x.y` 表示。

## Global Constraints

- **依赖**：运行时只允许 `lunar-javascript`，版本锁定 `1.7.8`（`--save-exact`）。开发依赖只允许 `miniprogram-automator@0.13.0`，理由是它是唯一能驱动开发者工具跑端到端测试的官方工具。除此之外不加任何依赖，包括 UI 框架、TypeScript、测试框架、打包器。
- **分层**：`miniprogram/core/**` 禁止出现 `wx`、`getApp`、`Page`、`Component`。`services/**` 是唯一可以调用 `wx.*` 的地方，页面不直接调用存储或埋点接口。
- **时间**：统一使用 `WallTime = {year, month, day, hour, minute}`，表示北京时间的钟面时间。core 中禁止使用本地时区的 Date API（`getHours`、`getDate`、`new Date(y,m,d)` 等），只能用 `Date.UTC` 和 `getUTC*`。
- **范围**：公历 1900-01-01 至 2100-12-31。反查结果不晚于“当前北京时间”。
- **子时派别**：`'late23'` 对应库的 `setSect(1)`，是默认值；`'midnight'` 对应 `setSect(2)`。库本身默认是 2，所以每次创建 EightChar 都必须显式调用 `setSect`。
- **禁用调用**：禁止调用 lunar-javascript 中输出宜忌、吉凶、神煞类信息的方法，包括 `getDayYi`、`getDayJi`、`getTimeYi`、`getTimeJi`、`getDayChong*`、`getDaySha`、`getPengZu*`、`getDayJiShen`、`getDayXiongSha`、`getDayPositionTai*`、`getDayNineStar`、`getDayTianShen*`、`getShiShen*`、`getDayun`、`getYun` 等。`scripts/check-copy.js` 会扫描这些方法名。
- **禁用词**（PRD 14.3）：算命、测算、占卜、命理、命盘、运势、运程、吉凶、预测、改运、大师、风水、开光、财运、姻缘、排盘、宜忌、冲煞、喜用、旺衰、十神、神煞、大运、流年。`miniprogram/` 下任何文件都不能出现这些词，唯一例外是免责声明原文。
- **免责声明原文**：`本工具仅提供传统干支历法的日期换算与文化科普，不提供任何命运解读或预测，请理性看待传统文化。`
- **埋点**：任何埋点参数都不能包含日期、时间、干支、城市或称呼，只允许 PRD 17.2 中列出的枚举值，由 `core/analytics.js` 的 schema 强制校验。
- **城市数据**：**禁止 agent 自行编造经纬度。** 本计划只附带 34 个省级行政中心的种子数据。完整城市列表必须由用户提供数据源文件后，通过 Task 3 的构建脚本生成。
- **提交规范**：使用 conventional commits；**提交信息里不加任何 AI 署名或 `Co-Authored-By` 行。**

## Review Focus

1. **手机时区不是 UTC+8** → 所有结果必须与北京时区下完全一致。由 `npm run test:tz` 覆盖（Task 1 定义脚本，Task 2 和 Task 7 的测试会在三个时区下执行）。
2. **真太阳时跨过交节**（乌鲁木齐 2024-02-04 18:00）→ 年柱、月柱必须按北京时间判定。由 Task 7 覆盖。
3. **晚子时**（23:00–23:59）在两种派别、反查、万年历中的处理必须一致。由 Task 7、Task 10、Task 11 共同覆盖。
4. **反查不泄露未来时刻**，即使手机时间被调乱也不行。`now` 必须由调用方传入，测试中固定取值。由 Task 10 覆盖。
5. **存储损坏或写满** → 档案页、最近页、结果页不白屏，并给出 PRD 7.5 中规定的提示。由 Task 12 和 Task 19 覆盖。

---

## File Structure

```
bazi/
├── package.json  project.config.json  .gitignore
├── docs/prd.md
├── data/cities.source.csv            # 由用户提供（待决事项），agent 不得创建
├── scripts/
│   ├── banned.js                     # 禁用词 + 禁用 API 名单（不打包）
│   ├── check-copy.js                 # 扫描 miniprogram/
│   ├── build-cities.js               # CSV → miniprogram/core/data/cities.js
│   └── verify-reverse.js             # 5,000 次随机互验（慢，发布前运行）
├── miniprogram/
│   ├── app.js  app.json  app.wxss  theme.json  sitemap.json
│   ├── core/
│   │   ├── constants.js  features.js  format.js
│   │   ├── wallTime.js  dst.js  solarTime.js  shichen.js
│   │   ├── data/cities.js  cities.js
│   │   ├── lunarInput.js  validate.js  terms.js  festivals.js
│   │   ├── calculate.js  boundary.js  derivation.js
│   │   ├── reverse.js  pillarOptions.js
│   │   ├── almanac.js
│   │   ├── records.js
│   │   ├── resultView.js  shareText.js  poster.js  queryCodec.js
│   │   ├── articles.js               # 知识库 K1–K10 正文与术语表
│   │   └── analytics.js              # 事件 schema
│   ├── services/ storage.js  privacy.js  track.js  posterCanvas.js
│   ├── components/ segmented/ sheet/ notice/ empty-state/ action-bar/
│   │               privacy-sheet/ datetime-sheet/ city-sheet/ ganzhi-sheet/
│   │               summary-header/ pillar-table/ method-bar/ month-grid/ term-tip/
│   ├── pages/  convert/ result/ reverse/ almanac/ archive/ profile-edit/ me/
│   └── sub/    day/ terms/ learn/ privacy/ about/
├── tests/  core/*.test.js  services/*.test.js  scripts/*.test.js  helpers.js
└── e2e/    journeys.test.js
```

## Shared Types（JSDoc，所有任务通用）

```js
/** @typedef {{year:number, month:number, day:number, hour:number, minute:number}} WallTime */
/** @typedef {{year:number, month:number, day:number}} DateParts */

/** @typedef {Object} QueryInput
 * @property {'solar'|'lunar'} calendar
 * @property {number} year @property {number} month @property {number} day
 * @property {boolean} isLeapMonth                    // 仅农历时有意义
 * @property {'exact'|'shichen'|'unknown'} precision
 * @property {number} hour @property {number} minute  // 仅 exact 时有意义
 * @property {number} shichen                         // 0–12，仅 shichen 时有意义（见 Task 4）
 * @property {string|null} cityId
 * @property {boolean} useTrueSolarTime
 * @property {'late23'|'midnight'} ziSect
 * @property {boolean} applyDst
 */

/** @typedef {{key:'year'|'month'|'day'|'time', label:string, gan:string, zhi:string,
 *   ganWuXing:string, zhiWuXing:string, hideGan:string[], naYin:string}} Pillar */

/** @typedef {{name:string, isJie:boolean, utcMs:number, wall:WallTime}} SolarTerm */

/** @typedef {Object} Result
 * @property {QueryInput} input
 * @property {WallTime} inputWall        // 用户输入（农历已转公历；shichen 取中点；unknown 取 12:00）
 * @property {WallTime} beijingWall      // inputWall 扣除夏令时
 * @property {WallTime} localWall        // beijingWall 叠加真太阳时（未开启时与 beijingWall 相同）
 * @property {{dstMinutes:number, longitudeMinutes:number, equationMinutes:number, totalMinutes:number}} corrections
 * @property {{dstApplied:boolean, dstEligible:boolean, city:{id,name,longitude}|null}} method
 * @property {Pillar[]} pillars          // unknown 时为 3 项
 * @property {string} summary            // '庚午 辛巳 丁丑 丙午'
 * @property {string} lunarText          // '一九九〇年四月十八'
 * @property {string} shengXiao          // 按年柱地支
 * @property {string|null} shengXiaoNote // '按春节为兔'，与按立春相同时为 null
 * @property {{金:number, 木:number, 水:number, 火:number, 土:number}} wuXingCount
 * @property {{prevTerm:SolarTerm, nextTerm:SolarTerm, prevJie:SolarTerm, nextJie:SolarTerm, liChun:SolarTerm}} terms
 * @property {string[]} warnings
 */
```

`tests/helpers.js` 导出以下辅助函数：

- `makeInput(overrides)`，默认值：
  `{calendar:'solar', year:1990, month:5, day:12, isLeapMonth:false, precision:'exact', hour:12, minute:0, shichen:6, cityId:null, useTrueSolarTime:false, ziSect:'late23', applyDst:false}`
- `w(y, m, d, h=0, mi=0)` → `WallTime`
- `NOW = {year:2026, month:11, day:17, hour:12, minute:0}`：所有依赖“当前时间”的测试都使用这个值。

---

# Phase A · 基础

### Task 1: 工程骨架、配置、脚本

**PRD:** 4, 13.2, 13.7, 16

**Files:**
- Create: `package.json`, `.gitignore`, `project.config.json`
- Create: `miniprogram/app.js`, `miniprogram/app.json`, `miniprogram/app.wxss`, `miniprogram/theme.json`, `miniprogram/sitemap.json`
- Create: 4 个 Tab 页和其余页面的占位文件（每个页面一个 `index.{js,json,wxml,wxss}`，WXML 只放页面标题）
- Create: `miniprogram/core/constants.js`, `miniprogram/core/features.js`
- Create: `tests/helpers.js`, `tests/core/constants.test.js`

**Interfaces:**
- Produces（`constants.js`）：
  - `APP_NAME='干支历换算'`，`SUBTITLE='公历、农历与干支历换算'`，`DISCLAIMER`（原文见 Global Constraints），`ME_HEADER='全部数据仅保存在这台手机上'`
  - `MIN_DATE={year:1900,month:1,day:1}`，`MAX_DATE={year:2100,month:12,day:31}`
  - `ZI_SECT_TO_LIB={late23:1, midnight:2}`，`ZI_SECT_LABEL={late23:'23:00 换日', midnight:'0:00 换日'}`
  - `LIMITS={RECENT:20, PROFILES:100, NAME_MAX:10}`
  - `BOUNDARY={JIE_MINUTES:30, SHICHEN_MINUTES:10, DAY_MINUTES:10}`
  - `STORAGE_KEYS={PROFILES:'profiles', RECENT:'recent', SETTINGS:'settings', LAST_INPUT:'lastInput'}`
  - `DEFAULT_SETTINGS={ziSect:'late23', useTrueSolarTime:false, cityId:null}`
- Produces（`features.js`）：`FEATURES = {wuXingCount:true, naYin:true, hideGan:true, reverseLookup:true, hourTable:true}`。数组 `DOWNGRADE_ORDER` 按 PRD 2.3 的顺序列出这五个开关名。

- [ ] **Step 1: 初始化仓库与依赖**

```bash
cd /Users/mdiven/Code/Projects/bazi
git init && npm init -y
npm install lunar-javascript@1.7.8 --save-exact
npm install miniprogram-automator@0.13.0 --save-dev --save-exact
```

在 `package.json` 中设置 `"private": true`，并加入以下 scripts：

```json
{
  "test": "node --test \"tests/**/*.test.js\"",
  "test:tz": "TZ=America/Los_Angeles npm test && TZ=Asia/Kolkata npm test && TZ=UTC npm test",
  "test:coverage": "node --test --experimental-test-coverage --test-coverage-include=\"miniprogram/core/**\" --test-coverage-exclude=\"miniprogram/core/data/**\" --test-coverage-lines=90 \"tests/**/*.test.js\"",
  "check:copy": "node scripts/check-copy.js",
  "verify:reverse": "node scripts/verify-reverse.js",
  "e2e": "node --test \"e2e/**/*.test.js\"",
  "verify": "npm test && npm run test:tz && npm run test:coverage && npm run check:copy"
}
```

`.gitignore` 写入：`node_modules/`、`miniprogram/miniprogram_npm/`、`project.private.config.json`。

- [ ] **Step 2: 写小程序配置**

- **`project.config.json`**：
  - `miniprogramRoot: "miniprogram/"`，`appid: "touristappid"`（占位，由用户替换）
  - `setting.packNpmManually: true`
  - `packNpmRelationList: [{packageJsonPath:"./package.json", miniprogramNpmDistDir:"./miniprogram/"}]`
  - `libVersion` 设为 3.0.0 及以上的稳定版。
- **`app.json`**：
  - 主包 pages 依次为 `pages/convert/index`（首页）、`pages/result/index`、`pages/reverse/index`、`pages/almanac/index`、`pages/archive/index`、`pages/profile-edit/index`、`pages/me/index`。
  - `subPackages`：`{root:"sub", pages:["day/index","terms/index","learn/index","learn/article","privacy/index","about/index"]}`。
  - `tabBar`：4 项（换算、万年历、档案、我的），**不设置 iconPath**（PRD 13.7：设计交付前先用纯文字 Tab 栏），颜色引用 `@tabColor` 等 theme 变量。
  - `"darkmode": true`，`"themeLocation": "theme.json"`，`"style": "v2"`，`"lazyCodeLoading": "requiredComponents"`。
- **`theme.json`**：light 和 dark 两组值，包括导航栏背景、导航栏文字颜色、tabBar 颜色，取值来自 PRD 13.2。
- **`app.wxss`**：在 `page` 上定义 PRD 13.2 的 8 个颜色令牌，并在 `@media (prefers-color-scheme: dark)` 中覆盖。再定义字号变量 `--fs-display:64rpx; --fs-title:36rpx; --fs-body:30rpx; --fs-aux:26rpx; --fs-min:24rpx` 和间距变量 `--sp-1..5: 8/16/24/32/48rpx`。全局设置 `font-variant-numeric: tabular-nums; line-height:1.6`。之后所有样式只引用这些变量。

- [ ] **Step 3: 写失败测试 `tests/core/constants.test.js`**

```js
test('disclaimer verbatim', () => assert.equal(C.DISCLAIMER, '本工具仅提供传统干支历法的日期换算与文化科普，不提供任何命运解读或预测，请理性看待传统文化。'));
test('zi sect lib mapping', () => assert.deepEqual(C.ZI_SECT_TO_LIB, { late23: 1, midnight: 2 }));
test('boundary thresholds per PRD 6.5', () => assert.deepEqual(C.BOUNDARY, { JIE_MINUTES: 30, SHICHEN_MINUTES: 10, DAY_MINUTES: 10 }));
test('downgrade order per PRD 2.3', () => assert.deepEqual(require('../../miniprogram/core/features').DOWNGRADE_ORDER, ['wuXingCount', 'naYin', 'hideGan', 'reverseLookup', 'hourTable']));
test('library sane', () => assert.equal(Solar.fromYmdHms(2000, 1, 1, 12, 0, 0).getLunar().getEightChar().getDay(), '戊午'));
```

- [ ] **Step 4: 运行测试，确认失败**

运行 `npm test`。预期结果：FAIL，报错 `Cannot find module`。

- [ ] **Step 5: 实现**

实现 `constants.js`、`features.js`、`tests/helpers.js`。

- [ ] **Step 6: 运行测试，确认通过**

运行 `npm test && npm run test:tz`。预期结果：全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold v1 project structure, theme tokens and constants"
```

---

### Task 2: 钟面时间、夏令时、展示格式

**PRD:** 6.2, 14.1

**Files:**
- Create: `core/wallTime.js`, `core/dst.js`, `core/format.js`
- Test: `tests/core/wallTime.test.js`, `tests/core/dst.test.js`, `tests/core/format.test.js`

**Interfaces:**
- Produces（`wallTime.js`）：
  - `toUtcMs(w)`、`fromUtcMs(ms)`、`addMinutes(w, n)`、`diffMinutes(a, b)`
  - `isValidSolarDate(y, m, d)`、`isInSupportedRange(dateParts)`、`compareWall(a, b) → -1|0|1`
  - `beijingNow(nowMs) → WallTime`：等于 `fromUtcMs(nowMs + 8h)`。
- Produces（`dst.js`）：
  - `CHINA_DST_PERIODS`：6 个区间，取值见 PRD 6.2，每个区间按钟面时间理解为 `[start 02:00, end 02:00)`。
  - `isInChinaDst(w) → boolean`
- Produces（`format.js`）：
  - `dateCn(dateParts) → '1990年5月12日'`
  - `monthDayCn(dateParts) → '5月6日'`
  - `hm(w) → '02:35'`
  - `weekdayCn(dateParts) → '周六'`
  - `minutesDelta(n) → '−129.5 分钟' | '+3.8 分钟' | '0.0 分钟'`：保留 1 位小数，负号用 U+2212。
  - `relativeTime(nowMs, thenMs) → string`：按北京日期判断，规则为：< 1 分钟返回 `刚刚`；< 60 分钟返回 `N 分钟前`；同一天返回 `N 小时前`；前一天返回 `昨天`；同一年返回 `M月D日`；否则返回 `YYYY年M月D日`。

- [ ] **Step 1: 写失败测试**

wallTime 和 dst 的测试要覆盖以下边界：

- `addMinutes(w(1990,1,1,0,30), -133)` 等于 `w(1989,12,31,22,17)`
- `addMinutes(w(2024,2,28,23,50), 20)` 等于 `w(2024,2,29,0,10)`
- `isValidSolarDate`：`1900-02-29` 为 false，`2000-02-29` 为 true
- 支持范围的两端：`1899-12-31` 为 false，`2101-01-01` 为 false
- `beijingNow(Date.UTC(2024,0,31,20,0))` 等于 `w(2024,2,1,4,0)`
- 夏令时 1990 年的四个边界点：`04-15 01:59` 为 false，`04-15 02:00` 为 true，`09-16 01:59` 为 true，`09-16 02:00` 为 false
- 1985 年和 1992 年都为 false

format 的测试：

```js
test('dateCn / monthDayCn / hm / weekday', () => {
  assert.equal(F.dateCn({ year: 1990, month: 5, day: 12 }), '1990年5月12日');
  assert.equal(F.monthDayCn({ year: 1990, month: 5, day: 6 }), '5月6日');
  assert.equal(F.hm(w(1990, 5, 6, 2, 35)), '02:35');
  assert.equal(F.weekdayCn({ year: 1990, month: 5, day: 12 }), '周六');
});
test('minutesDelta', () => {
  assert.equal(F.minutesDelta(-129.52), '−129.5 分钟');
  assert.equal(F.minutesDelta(3.75), '+3.8 分钟');
});
test('relativeTime', () => {
  const now = Date.UTC(2026, 10, 17, 4, 0); // 北京时间 12:00
  assert.equal(F.relativeTime(now, now - 30e3), '刚刚');
  assert.equal(F.relativeTime(now, now - 3 * 60e3), '3 分钟前');
  assert.equal(F.relativeTime(now, now - 2 * 3600e3), '2 小时前');
  assert.equal(F.relativeTime(now, now - 20 * 3600e3), '昨天');
  assert.equal(F.relativeTime(now, Date.UTC(2026, 0, 5, 4, 0)), '1月5日');
  assert.equal(F.relativeTime(now, Date.UTC(2025, 0, 5, 4, 0)), '2025年1月5日');
});
```

- [ ] **Step 2: 运行测试，确认失败**

运行 `npm test`。预期结果：FAIL。

- [ ] **Step 3: 实现三个模块**

- [ ] **Step 4: 运行测试，确认通过**

运行 `npm test && npm run test:tz`。预期结果：PASS。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): wall-clock math, China DST periods and display formatting"
```

---

### Task 3: 城市数据管线与真太阳时

**PRD:** 5.1（出生地）、6.2、19.2

**Files:**
- Create: `core/data/cities.js`（种子数据）、`core/cities.js`、`core/solarTime.js`
- Create: `scripts/build-cities.js`
- Test: `tests/core/cities.test.js`, `tests/core/solarTime.test.js`, `tests/scripts/build-cities.test.js`

**Interfaces:**
- Produces（`data/cities.js`）：`module.exports = [{id, name, province, longitude}]`。种子数据是 34 个省级行政中心，经度取值如下，`province` 填行政区全称：

```
beijing 北京 北京市 116.41 · tianjin 天津 天津市 117.20 · shanghai 上海 上海市 121.47 · chongqing 重庆 重庆市 106.55
shijiazhuang 石家庄 河北省 114.51 · taiyuan 太原 山西省 112.55 · hohhot 呼和浩特 内蒙古自治区 111.75 · shenyang 沈阳 辽宁省 123.43
changchun 长春 吉林省 125.32 · harbin 哈尔滨 黑龙江省 126.53 · nanjing 南京 江苏省 118.80 · hangzhou 杭州 浙江省 120.16
hefei 合肥 安徽省 117.23 · fuzhou 福州 福建省 119.30 · nanchang 南昌 江西省 115.86 · jinan 济南 山东省 117.12
zhengzhou 郑州 河南省 113.63 · wuhan 武汉 湖北省 114.31 · changsha 长沙 湖南省 112.94 · guangzhou 广州 广东省 113.26
nanning 南宁 广西壮族自治区 108.37 · haikou 海口 海南省 110.20 · chengdu 成都 四川省 104.07 · guiyang 贵阳 贵州省 106.63
kunming 昆明 云南省 102.83 · lhasa 拉萨 西藏自治区 91.11 · xian 西安 陕西省 108.94 · lanzhou 兰州 甘肃省 103.83
xining 西宁 青海省 101.78 · yinchuan 银川 宁夏回族自治区 106.23 · urumqi 乌鲁木齐 新疆维吾尔自治区 87.62 · hongkong 香港 香港特别行政区 114.17
macau 澳门 澳门特别行政区 113.54 · taipei 台北 台湾省 121.56
```

- Produces（`cities.js`）：
  - `getCityById(id) → City|null`
  - `searchCities(query) → City[]`：按 name 或 province 子串匹配，最多 30 条。
  - `groupByProvince() → {province, cities}[]`：按 province 的拼音或 Unicode 排序均可，但排序必须稳定。
- Produces（`solarTime.js`）：
  - `longitudeOffsetMinutes(lon) → (lon − 120) × 4`
  - `equationOfTimeMinutes(y, m, d) → number`：N 为当年第几天，`B = 2π(N−81)/364`，`EoT = 9.87·sin2B − 7.53·cosB − 1.5·sinB`。
  - `trueSolarCorrection(beijingWall, lon) → {longitudeMinutes, equationMinutes, totalMinutes}`：均时差取 `addMinutes(beijingWall, round(longitudeMinutes))` 所在那一天；`totalMinutes` 为两者之和四舍五入取整。
- Produces（`scripts/build-cities.js`）：
  - 导出 `parseCitiesCsv(text) → {cities, errors}`。CSV 表头必须为 `province,name,longitude,latitude,source`。每行校验：经度在 73–136 之间、纬度在 3–54 之间、name 非空、同一 province 内 name 不重复。`id` 由 `province` 和 `name` 生成稳定的 slug，可直接用中文。
  - 作为 CLI 运行时读取 `data/cities.source.csv`。有任何 error 时打印错误并 `exit(1)`；否则写入 `miniprogram/core/data/cities.js`，文件头部注释注明数据来源列中出现过的 source 值。
  - 若 CSV 文件不存在，打印 `data/cities.source.csv not found — keep seed data (see PRD 19.2)`，并以 `exit(0)` 退出。

- [ ] **Step 1: 写失败测试**

```js
// solarTime
test('EoT extremes', () => {
  assert.ok(Math.abs(S.equationOfTimeMinutes(2024, 2, 11) + 14.574) < 0.01);
  assert.ok(Math.abs(S.equationOfTimeMinutes(2024, 11, 3) - 16.290) < 0.01);
});
test('Urumqi 1990-01-01 00:30 total -133', () => assert.equal(S.trueSolarCorrection(w(1990, 1, 1, 0, 30), 87.62).totalMinutes, -133));
test('Urumqi 2024-02-04 18:00 total -144, EoT -14.1', () => {
  const c = S.trueSolarCorrection(w(2024, 2, 4, 18, 0), 87.62);
  assert.equal(c.totalMinutes, -144);
  assert.ok(Math.abs(c.equationMinutes + 14.08) < 0.01);
});
test('Beijing 2024-03-10 12:00 total -25', () => assert.equal(S.trueSolarCorrection(w(2024, 3, 10, 12, 0), 116.41).totalMinutes, -25));
// cities
test('seed has 34 unique cities', () => { assert.equal(DATA.length, 34); assert.equal(new Set(DATA.map(c => c.id)).size, 34); });
test('search', () => {
  assert.deepEqual(searchCities('乌鲁').map(c => c.id), ['urumqi']);
  assert.ok(searchCities('广东省').some(c => c.id === 'guangzhou'));
});
// build-cities
test('csv validation', () => {
  const { cities, errors } = parseCitiesCsv('province,name,longitude,latitude,source\n广东省,深圳,114.06,22.54,X\n广东省,深圳,114.06,22.54,X\n火星,某地,200,10,X');
  assert.equal(cities.length, 1);
  assert.equal(errors.length, 2);
});
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 验证**

运行 `npm test && node scripts/build-cities.js`。预期结果：测试 PASS；脚本输出 `not found — keep seed data`。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): city data pipeline with seed capitals and true solar time"
```

---

### Task 4: 农历输入与时辰定义

**PRD:** 5.1, 6.4

**Files:**
- Create: `core/lunarInput.js`, `core/shichen.js`
- Test: `tests/core/lunarInput.test.js`, `tests/core/shichen.test.js`

**Interfaces:**
- Produces（`lunarInput.js`）：
  - `getLeapMonth(y)`、`getLunarMonthDays(y, m, isLeap) → 29|30|null`
  - `getLunarMonthOptions(y) → [{month, isLeap, label}]`：闰月排在同名月之后，label 依次为 `正月…十月 冬月 腊月`，闰月写作 `闰二月`。
  - `getLunarDayOptions(y, m, isLeap) → [{day, label}]`：label 为 `初一…三十`。
  - `lunarToSolarDate({year, month, day, isLeapMonth}) → DateParts|null`：用 `try/catch` 包住库调用，非法输入返回 null。
- Produces（`shichen.js`）：
  - `SHICHEN`：13 项 `{index, name, start:'HH:mm', end:'HH:mm'}`。index 0 为 `早子时 00:00–00:59`，1 为 `丑时 01:00–02:59`，以此类推到 11 为 `亥时 21:00–22:59`，12 为 `晚子时 23:00–23:59`。
  - `shichenRange(dateParts, index) → {start:WallTime, end:WallTime, mid:WallTime}`：mid 的取值：早子时为 00:30，晚子时为 23:30，其余为起点 + 60 分钟。
  - `shichenOf(w) → index`：23 点返回 12，0 点返回 0。

- [ ] **Step 1: 写失败测试**

lunarInput 的用例：

- `getLeapMonth`：2023 返回 2，2020 返回 4，2024 返回 0。
- `getLunarMonthOptions(2023)`：长度为 13，`[2]` 为 `{month:2,isLeap:true,label:'闰二月'}`。
- `getLunarMonthDays`：(2023,2,true) 返回 29，(2023,2,false) 返回 30，(2024,2,true) 返回 null。
- `lunarToSolarDate`：(1990,4,18) 返回 `{1990,5,12}`；(2023,2,1,闰) 返回 `{2023,3,22}`；(2024,2,1,闰) 返回 null；(2023,2,30,闰) 返回 null。

shichen 的用例：

```js
test('13 shichen with split zi', () => {
  assert.equal(SHICHEN.length, 13);
  assert.deepEqual(SHICHEN[0], { index: 0, name: '早子时', start: '00:00', end: '00:59' });
  assert.deepEqual(SHICHEN[6], { index: 6, name: '午时', start: '11:00', end: '12:59' });
  assert.deepEqual(SHICHEN[12], { index: 12, name: '晚子时', start: '23:00', end: '23:59' });
});
test('range mid', () => {
  assert.deepEqual(shichenRange({ year: 1990, month: 5, day: 12 }, 6).mid, w(1990, 5, 12, 12, 0));
  assert.deepEqual(shichenRange({ year: 1990, month: 5, day: 12 }, 12).mid, w(1990, 5, 12, 23, 30));
});
test('shichenOf', () => {
  assert.equal(shichenOf(w(1990, 5, 12, 23, 10)), 12);
  assert.equal(shichenOf(w(1990, 5, 12, 0, 10)), 0);
  assert.equal(shichenOf(w(1990, 5, 12, 12, 59)), 6);
});
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): lunar input options and shichen definitions"
```

---

### Task 5: 输入校验

**PRD:** 5.3

**Files:**
- Create: `core/validate.js`
- Test: `tests/core/validate.test.js`

**Interfaces:**
- Produces: `validateInput(input) → {ok, errors:{date?, time?, city?}, solarDate:DateParts|null}`

错误文案（必须一字不差）：

| 字段 | 条件 | 文案 |
| --- | --- | --- |
| date | 公历日期不存在 | `请选择有效日期` |
| date | 超出范围，含农历换算后超出 | `仅支持 1900 年至 2100 年` |
| date | 当年没有该闰月 | `该年没有这个闰月` |
| date | 该月没有这一天 | `该月没有这一天` |
| time | `exact` 时 hour 或 minute 非法 | `请选择出生时间` |
| time | `shichen` 时 index 不在 0–12 | `请选择时辰` |
| city | `useTrueSolarTime && precision!=='unknown'` 且找不到城市 | `开启真太阳时需先选择出生地` |

- [ ] **Step 1: 写失败测试**

每条规则至少一个用例，另加以下用例：

- 农历 2100 年 12 月初二：换算后为 2101-01-01，应返回 `仅支持 1900 年至 2100 年`。
- `precision:'unknown'` 且开启真太阳时、未选城市：应返回 ok。
- 合法的农历输入：应返回对应的 `solarDate`。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): validate query input"
```

---

### Task 6: 节气（按时刻）与节日白名单

**PRD:** 6.1, 9.1, 9.3

> 已验证：库的 `getPrevJie()` / `getNextJie()` 按**日**判断，在 2024-02-04 16:00 调用时会把 16:27 的立春当作“上一个节”。因此不得使用这两个方法。

**Files:**
- Create: `core/terms.js`, `core/festivals.js`
- Test: `tests/core/terms.test.js`, `tests/core/festivals.test.js`

**Interfaces:**
- Produces（`terms.js`）：
  - `JIE_NAMES`：12 个“节”。
  - `MONTH_ZHI_BY_JIE = {立春:'寅', 惊蛰:'卯', 清明:'辰', 立夏:'巳', 芒种:'午', 小暑:'未', 立秋:'申', 白露:'酉', 寒露:'戌', 立冬:'亥', 大雪:'子', 小寒:'丑'}`
  - `getTermsAround(w) → SolarTerm[]`：合并 w 所在年份及前后各一年的 `getJieQiTable()`，按 utcMs 去重、排序。大写拼音键按 `DA_XUE→大雪, DONG_ZHI→冬至, XIAO_HAN→小寒, DA_HAN→大寒, LI_CHUN→立春, YU_SHUI→雨水, JING_ZHE→惊蛰` 映射为中文。`wall` 截断到分钟。
  - `findAdjacent(w, {jieOnly}) → {prev, next}`：prev 取 `utcMs <= toUtcMs(w)` 的最后一个，next 取 `> toUtcMs(w)` 的第一个。注意比较时 w 按秒为 0 处理，所以 16:27 仍早于 16:27:07。
  - `liChunOf(year) → SolarTerm`
  - `findJieOnDate(dateParts) → SolarTerm|null`
  - `yearTerms(year) → SolarTerm[]`：返回公历该年 1 月 1 日至 12 月 31 日之间的 24 个节气。
  - `nextTermFrom(w) → {term, days}`：days 为两者北京日期之差。
- Produces（`festivals.js`）：
  - `FESTIVAL_WHITELIST = ['元旦节','劳动节','国庆节','春节','元宵节','端午节','七夕节','中秋节','重阳节','腊八节','除夕']`
  - `DISPLAY_NAME = {元旦节:'元旦'}`，其余节日原样显示。
  - `festivalsOn(dateParts) → string[]`：合并 `Solar.getFestivals()` 与 `Lunar.getFestivals()` 的结果，按白名单过滤后返回显示名。

- [ ] **Step 1: 写失败测试**

```js
test('立春 exact times', () => {
  for (const [y, t] of [[2000, '2000-02-04 20:40'], [2023, '2023-02-04 10:42'], [2024, '2024-02-04 16:27'], [2025, '2025-02-03 22:10']]) {
    const lc = T.liChunOf(y);
    assert.equal(`${y}-${pad(lc.wall.month)}-${pad(lc.wall.day)} ${pad(lc.wall.hour)}:${pad(lc.wall.minute)}`, t);
  }
});
test('adjacent by instant', () => {
  const a = T.findAdjacent(w(2024, 2, 4, 16, 27), { jieOnly: true });
  assert.equal(a.prev.name, '小寒');
  assert.equal(a.next.name, '立春');
  assert.equal(T.findAdjacent(w(2024, 2, 4, 16, 28), { jieOnly: true }).prev.name, '立春');
});
test('adjacent incl. 中气', () => {
  const a = T.findAdjacent(w(1990, 5, 12, 12, 0), { jieOnly: false });
  assert.deepEqual([a.prev.name, a.next.name], ['立夏', '小满']);
});
test('yearTerms 2024', () => {
  const ts = T.yearTerms(2024);
  assert.equal(ts.length, 24);
  assert.equal(ts[0].name, '小寒');
  assert.equal(ts[23].name, '冬至');
});
test('nextTermFrom NOW', () => assert.deepEqual(((r) => [r.term.name, r.days])(T.nextTermFrom(NOW)), ['小雪', 5]));
test('festival whitelist', () => {
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 10 }), ['春节']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 9 }), ['除夕']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 1, day: 1 }), ['元旦']);
  assert.deepEqual(festivalsOn({ year: 2024, month: 2, day: 14 }), []);
  assert.deepEqual(festivalsOn({ year: 2024, month: 12, day: 25 }), []);
});
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 验证**

运行 `npm test && npm run test:tz`。预期结果：PASS。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): instant-accurate solar terms and festival whitelist"
```

---

# Phase B · 计算

### Task 7: 主换算 `calculate`（双时刻模型）

**PRD:** 6.1–6.4

**Files:**
- Create: `core/calculate.js`
- Test: `tests/core/calculate.test.js`

**Interfaces:**
- Consumes：Task 2–6 的全部模块。
- Produces：
  - `calculate(input) → Result`：校验失败时抛出 `Error('INVALID_INPUT')`。
  - `pillarsAt(beijingWall, localWall, ziSect) → Pillar[4]`：供 Task 10、Task 11 复用。

计算流程（必须按此顺序）：

1. **inputWall**：
   - `exact` 时取输入的日期和时间；
   - `shichen` 时取 `shichenRange(...).mid`；
   - `unknown` 时取当天 12:00。
2. **beijingWall**：`dstEligible = precision!=='unknown' && isInChinaDst(inputWall)`。`input.applyDst && dstEligible` 时减 60 分钟，否则不变。
3. **localWall**：`useTrueSolarTime && precision!=='unknown' && city` 时，叠加 `trueSolarCorrection(beijingWall, city.longitude).totalMinutes`；否则等于 beijingWall。
4. **pillarsAt**：
   - 年柱、月柱：取 `Solar.fromYmdHms(beijingWall).getLunar().getEightChar()`；
   - 日柱、时柱：取 `Solar.fromYmdHms(localWall)...getEightChar()`；
   - 两者都要 `setSect(ZI_SECT_TO_LIB[ziSect])`。
   - 每柱字段来自 `getXGan/getXZhi/getXWuXing`（返回两个字，第一个是天干五行，第二个是地支五行）`/getXHideGan/getXNaYin`。
5. **unknown**：只保留前 3 柱。若 `findJieOnDate(solarDate)` 有结果，分别在 00:00 和 23:59 计算年柱、月柱；不同时追加提示：`当天 HH:mm 交{节名}，时辰不详时年柱、月柱无法确定（交节前：{年}年 {月}月；交节后：{年}年 {月}月）`。只有月柱不同时，“年柱、月柱”改为“月柱”，括号内只列月柱。
6. **shichen**：对 `range.start` 和 `range.end` 分别执行步骤 2–4。若两端四柱的 summary 与中点的 summary 不全相同，追加提示：`该时辰内四柱可能不同：开始时为 {startSummary}，结束时为 {endSummary}`。
7. **shengXiao**：由年柱地支映射（子鼠 丑牛 寅虎 卯兔 辰龙 巳蛇 午马 未羊 申猴 酉鸡 戌狗 亥猪）。用 beijingWall 对应农历的 `getYearShengXiao()` 得到按春节的生肖；两者不同时，`shengXiaoNote` 为 `按春节为X`。
8. **lunarText**：取 localWall 对应的农历。
9. **terms**：
   - `prevTerm/nextTerm = findAdjacent(beijingWall, {jieOnly:false})`
   - `prevJie/nextJie = findAdjacent(beijingWall, {jieOnly:true})`
   - `liChun = liChunOf(beijingWall.year)`
10. **wuXingCount**：五个键都必须存在。**summary**：各柱 `gan+zhi` 用空格连接。

- [ ] **Step 1: 写失败测试**

```js
test('1990-05-12 12:00', () => {
  const r = calculate(makeInput());
  assert.equal(r.summary, '庚午 辛巳 丁丑 丙午');
  assert.equal(r.lunarText, '一九九〇年四月十八');
  assert.deepEqual([r.shengXiao, r.shengXiaoNote], ['马', null]);
  assert.deepEqual(r.wuXingCount, { 金: 2, 木: 0, 水: 0, 火: 5, 土: 1 });
  assert.deepEqual(r.pillars[0].hideGan, ['丁', '己']);
  assert.deepEqual(r.pillars.map(p => p.naYin), ['路旁土', '白蜡金', '涧下水', '天河水']);
  assert.deepEqual([r.terms.prevJie.name, r.terms.nextJie.name, r.terms.nextTerm.name], ['立夏', '芒种', '小满']);
});
test('2000-01-01', () => assert.equal(calculate(makeInput({ year: 2000, month: 1, day: 1 })).summary, '己卯 丙子 戊午 戊午'));
test('立春 2024 and shengXiao note', () => {
  assert.equal(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 16, minute: 0 })).summary, '癸卯 乙丑 戊戌 庚申');
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 }));
  assert.equal(r.summary, '甲辰 丙寅 戊戌 辛酉');
  assert.deepEqual([r.shengXiao, r.shengXiaoNote], ['龙', '按春节为兔']);
});
test('late zi sects', () => {
  const b = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };
  assert.equal(calculate(makeInput({ ...b, ziSect: 'late23' })).summary, '甲辰 丁卯 甲戌 甲子');
  assert.equal(calculate(makeInput({ ...b, ziSect: 'midnight' })).summary, '甲辰 丁卯 癸酉 甲子');
});
test('two-instant model: Urumqi across 立春', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: 'urumqi' }));
  assert.deepEqual(r.localWall, w(2024, 2, 4, 15, 36));
  assert.equal(r.summary, '甲辰 丙寅 戊戌 庚申'); // 若全部按 local 计算会得到 '癸卯 乙丑 …'
});
test('Urumqi across day and year', () => {
  const r = calculate(makeInput({ year: 1990, month: 1, day: 1, hour: 0, minute: 30, useTrueSolarTime: true, cityId: 'urumqi' }));
  assert.deepEqual(r.localWall, w(1989, 12, 31, 22, 17));
  assert.equal(r.summary, '己巳 丙子 乙丑 丁亥');
});
test('DST', () => {
  const r = calculate(makeInput({ year: 1990, month: 7, day: 1, applyDst: true }));
  assert.deepEqual(r.beijingWall, w(1990, 7, 1, 11, 0));
  assert.equal(r.method.dstApplied, true);
  assert.equal(calculate(makeInput({ year: 1992, month: 7, day: 1, applyDst: true })).method.dstApplied, false);
});
test('lunar input', () => assert.equal(calculate(makeInput({ calendar: 'lunar', year: 1990, month: 4, day: 18 })).summary, '庚午 辛巳 丁丑 丙午'));
test('shichen mode uses midpoint', () => assert.equal(calculate(makeInput({ precision: 'shichen', shichen: 6 })).summary, '庚午 辛巳 丁丑 丙午'));
test('shichen containing 立春 warns', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, precision: 'shichen', shichen: 8 }));
  assert.ok(r.warnings.includes('该时辰内四柱可能不同：开始时为 癸卯 乙丑 戊戌 庚申，结束时为 甲辰 丙寅 戊戌 庚申'));
});
test('unknown hour on 立春 day', () => {
  const r = calculate(makeInput({ year: 2024, month: 2, day: 4, precision: 'unknown' }));
  assert.equal(r.pillars.length, 3);
  assert.ok(r.warnings.includes('当天 16:27 交立春，时辰不详时年柱、月柱无法确定（交节前：癸卯年 乙丑月；交节后：甲辰年 丙寅月）'));
});
test('invalid throws', () => assert.throws(() => calculate(makeInput({ month: 13 })), /INVALID_INPUT/));
test('perf: 500 runs < 2500ms', () => { const t = Date.now(); for (let i = 0; i < 500; i++) calculate(makeInput({ minute: i % 60 })); assert.ok(Date.now() - t < 2500); });
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 验证**

运行 `npm test && npm run test:tz`。预期结果：PASS。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): two-instant four pillars calculation with precision modes"
```

---

### Task 8: 边界提示

**PRD:** 6.5

**Files:**
- Create: `core/boundary.js`
- Modify: `core/calculate.js`：仅在 `exact` 时追加边界提示。
- Test: `tests/core/boundary.test.js`

**Interfaces:**
- Produces: `getBoundaryWarnings({beijingWall, localWall, ziSect}) → string[]`

规则：阈值取 `BOUNDARY`，距离必须严格小于阈值才提示，每类最多一条。

- **交节**：用 beijingWall 与最近的“节”比较。提示文案：`该时刻临近{节名}交节（{M月D日 HH:mm}），{立春时为“年柱和月柱”，否则为“月柱”}对出生时间精度敏感`。
- **时辰**：用 localWall 与最近的奇数整点比较（包括前一天 23:00 和后一天 01:00）。提示文案：`该时刻临近时辰分界（HH:00），时柱对出生时间精度敏感`。
- **换日**：用 localWall 与换日点比较，`late23` 的换日点是 23:00，`midnight` 的换日点是 00:00。提示文案：`该时刻临近换日（HH:00），日柱对出生时间精度敏感`。

当 `late23` 时，23:00 同时是时辰分界和换日点，两条提示都要输出。

- [ ] **Step 1: 写失败测试**

```js
const at = (b, l = b, s = 'late23') => getBoundaryWarnings({ beijingWall: b, localWall: l, ziSect: s });
test('立春 within 30 min', () => assert.ok(at(w(2024, 2, 4, 16, 0)).includes('该时刻临近立春交节（2月4日 16:27），年柱和月柱对出生时间精度敏感')));
test('shichen threshold is 10 min strict', () => {
  assert.deepEqual(at(w(1990, 5, 12, 12, 50)), []);
  assert.deepEqual(at(w(1990, 5, 12, 12, 51)), ['该时刻临近时辰分界（13:00），时柱对出生时间精度敏感']);
});
test('late23: 22:55 gives shichen + day', () => assert.equal(at(w(1990, 5, 12, 22, 55)).length, 2));
test('midnight sect: 00:05', () => {
  assert.ok(at(w(1990, 5, 12, 0, 5), w(1990, 5, 12, 0, 5), 'midnight').includes('该时刻临近换日（00:00），日柱对出生时间精度敏感'));
  assert.deepEqual(at(w(1990, 5, 12, 0, 5)), []);
});
test('jie uses beijing, shichen uses local', () => {
  const r = at(w(2024, 2, 4, 16, 20), w(2024, 2, 4, 13, 56));
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('立春'));
});
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): boundary warnings with per-type thresholds"
```

---

### Task 9: 推导过程

**PRD:** 7.3

**Files:**
- Create: `core/derivation.js`
- Test: `tests/core/derivation.test.js`

**Interfaces:**
- Consumes：`Result`（Task 7）、`format.js`、`shichen.js`
- Produces: `buildDerivation(result) → string[]`

模板如下（`{}` 为程序填入的值，日期和时间都用 `format.js` 生成）：

1. **输入**：
   - exact：`输入时间：{dateCn} {hm}（北京时间）` + `，已按夏令时减去 1 小时`（dstApplied 时） + `；真太阳时 {hm(local)}（{城市}，经度 {minutesDelta}、均时差 {minutesDelta}）`（开启真太阳时） + `，未启用真太阳时`（未开启时），句末加 `。`
   - shichen：`输入时间：{dateCn} {时辰名}（{start}–{end}），按 {hm(mid)} 计算（北京时间）`，后面的拼接规则同上。
   - unknown：`输入日期：{dateCn}，时辰不详，只推年、月、日三柱。`
2. **年柱**：`年柱：在立春（{dateCn} {hm}）之{后|前} → {年柱}年。`
3. **月柱**：`月柱：在{prevJie}（{monthDayCn} {hm}）之后、{nextJie}之前 → 月支为{支}；年干{年干}，按五虎遁得月干{月干} → {月柱}。`
4. **日柱**：
   - localWall.hour 为 23 且 late23：`日柱：晚子时按“23:00 换日”计入次日 → {日柱}。`
   - localWall.hour 为 23 且 midnight：`日柱：晚子时按“0:00 换日”仍计当日 → {日柱}。`
   - 其他情况：`日柱：按六十甲子连续计日 → {日柱}。`
5. **时柱**（unknown 时没有这一步）：
   - 普通时辰：`时柱：{hm} 属{时辰名}（{start}–{end}）；日干{日干}，按五鼠遁得时干{时干} → {时柱}。`
   - 晚子时：`时柱：{hm} 属晚子时（23:00–23:59）；按次日日干{次日日干}，用五鼠遁得时干{时干} → {时柱}。`
   - 次日日干可通过 `Solar.fromYmd(next day).getLunar().getDayGan()` 获取。

- [ ] **Step 1: 写失败测试**

```js
test('PRD 7.3 example verbatim', () => {
  assert.deepEqual(buildDerivation(calculate(makeInput())), [
    '输入时间：1990年5月12日 12:00（北京时间），未启用真太阳时。',
    '年柱：在立春（1990年2月4日 10:14）之后 → 庚午年。',
    '月柱：在立夏（5月6日 02:35）之后、芒种之前 → 月支为巳；年干庚，按五虎遁得月干辛 → 辛巳。',
    '日柱：按六十甲子连续计日 → 丁丑。',
    '时柱：12:00 属午时（11:00–12:59）；日干丁，按五鼠遁得时干丙 → 丙午。',
  ]);
});
test('true solar input line', () => {
  const d = buildDerivation(calculate(makeInput({ year: 2024, month: 2, day: 4, hour: 18, minute: 0, useTrueSolarTime: true, cityId: 'urumqi' })));
  assert.equal(d[0], '输入时间：2024年2月4日 18:00（北京时间）；真太阳时 15:36（乌鲁木齐，经度 −129.5 分钟、均时差 −14.1 分钟）。');
});
test('late zi lines', () => {
  const d = buildDerivation(calculate(makeInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, ziSect: 'midnight' })));
  assert.equal(d[3], '日柱：晚子时按“0:00 换日”仍计当日 → 癸酉。');
  assert.equal(d[4], '时柱：23:30 属晚子时（23:00–23:59）；按次日日干甲，用五鼠遁得时干甲 → 甲子。');
});
test('before 立春', () => {
  assert.equal(buildDerivation(calculate(makeInput({ year: 1990, month: 1, day: 15 })))[1], '年柱：在立春（1990年2月4日 10:14）之前 → 己巳年。');
});
test('unknown has 4 lines', () => assert.equal(buildDerivation(calculate(makeInput({ precision: 'unknown' }))).length, 4));
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): generate step-by-step derivation text"
```

---

### Task 10: 四柱反查与选项过滤

**PRD:** 8

**Files:**
- Create: `core/pillarOptions.js`, `core/reverse.js`, `scripts/verify-reverse.js`
- Test: `tests/core/pillarOptions.test.js`, `tests/core/reverse.test.js`

**Interfaces:**
- Produces（`pillarOptions.js`）：
  - `JIA_ZI`：60 项，可用 `LunarUtil.JIA_ZI`。
  - `monthOptionsForYear(yearGZ) → string[12]`：按五虎遁推出，从寅月开始。
  - `timeOptionsForDay(dayGZ, ziSect) → {ganzhi, label}[]`：`late23` 时 12 项（子到亥）；`midnight` 时 13 项，最后一项是晚子时，其干支按次日日干推出，label 为 `晚子时`。
- Produces（`reverse.js`）：`reverseLookup({year, month, day, time|null}, ziSect, nowWall) → ReverseHit[]`，其中 `ReverseHit = {start:WallTime, end:WallTime, hasJie:boolean}`，按时间倒序排列。

算法（已在原型中验证，不得改成全年扫描）：

1. 候选年份 Y 从 1899 到 `nowWall.year`。只保留 `pillarsAt(Y-07-01 12:00)` 的年柱等于目标年柱的年份。
2. 由目标月支，通过 `MONTH_ZHI_BY_JIE` 找到对应的“节”，作为时间窗口 `[该节时刻, 下一个节时刻)`。丑月的窗口落在 Y+1 年（小寒到次年立春）。窗口再与 `[1900-01-01 00:00, nowWall]` 取交集。
3. 在窗口内按天遍历。每天切成 13 个时辰块，块的起止与 `SHICHEN` 一致。对每块，用 `pillarsAt(t, t, ziSect)` 分别计算块首和块尾（反查不做任何修正）：
   - 首尾都匹配：整块命中。
   - 只有一端匹配：用二分查找到精确的分钟边界，并标记 `hasJie=true`。
   - 都不匹配：跳过。
   - 匹配条件：目标未填时柱时，只比较前三柱。
4. 把首尾相接（前一段 end + 1 分钟 = 后一段 start）的段合并成一条。最后倒序返回。

- [ ] **Step 1: 写失败测试**

```js
const R = (p, s = 'late23', now = NOW) => reverseLookup(p, s, now).map(h => [fmt(h.start), fmt(h.end), h.hasJie]);
// fmt = 'YYYY-MM-DD HH:mm'
test('known date', () => assert.deepEqual(R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }), [
  ['1990-05-12 11:00', '1990-05-12 12:59', false], ['1930-05-27 11:00', '1930-05-27 12:59', false]]));
test('jie inside shichen is clipped', () => assert.deepEqual(R({ year: '甲辰', month: '丙寅', day: '戊戌', time: '庚申' })[0], ['2024-02-04 16:28', '2024-02-04 16:59', true]));
test('late23 zi merges across midnight', () => assert.deepEqual(R({ year: '甲辰', month: '丁卯', day: '甲戌', time: '甲子' })[0], ['2024-03-10 23:00', '2024-03-11 00:59', false]));
test('midnight sect late zi', () => assert.deepEqual(R({ year: '甲辰', month: '丁卯', day: '癸酉', time: '甲子' }, 'midnight')[0], ['2024-03-10 23:00', '2024-03-10 23:59', false]));
test('never after now', () => assert.deepEqual(R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }, 'late23', w(1990, 5, 12, 12, 0))[0], ['1990-05-12 11:00', '1990-05-12 12:00', false]));
test('impossible combo → []', () => assert.deepEqual(R({ year: '庚午', month: '甲子', day: '丁丑', time: '丙午' }), []));
test('options', () => {
  assert.deepEqual([monthOptionsForYear('庚午')[0], monthOptionsForYear('庚午')[11]], ['戊寅', '己丑']);
  assert.equal(timeOptionsForDay('丁丑', 'late23')[0].ganzhi, '庚子');
  assert.deepEqual(timeOptionsForDay('丁丑', 'midnight').at(-1), { ganzhi: '壬子', label: '晚子时' });
});
test('round trip on 200 random past instants', () => {
  // 用固定种子的 LCG 生成 1900-01-01 至 NOW 之间的整分钟时刻 t；
  // p = pillarsAt(t, t, 'late23')；断言 reverseLookup(p, 'late23', NOW) 中有某一项 start <= t <= end
});
test('perf < 500ms per lookup', () => { const t = Date.now(); R({ year: '庚午', month: '辛巳', day: '丁丑', time: '丙午' }); assert.ok(Date.now() - t < 500); });
```

`scripts/verify-reverse.js`：执行同样的往返验证 5,000 次，两种派别各一半。全部通过时打印 `5000/5000 ok`，有失败时打印失败样本并 `exit(1)`。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 验证**

运行 `npm test && npm run verify:reverse`。预期结果：测试 PASS，脚本输出 `5000/5000 ok`。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): reverse lookup from four pillars limited to the past"
```

---

### Task 11: 万年历模型

**PRD:** 9

**Files:**
- Create: `core/almanac.js`
- Test: `tests/core/almanac.test.js`

**Interfaces:**
- Consumes：`terms.js`、`festivals.js`、`calculate.pillarsAt`、`shichen.js`、`format.js`
- Produces:
  - `buildMonth(year, month, today:DateParts, selected:DateParts) → {title, yearGanZhiText, cells}`。cells 共 42 个，周一开始，每个元素为 `{date, day, sub, subKind:'term'|'festival'|'lunarMonth'|'lunarDay', inMonth, isToday, isSelected}`。sub 的优先级：节气 > 节日 > 农历初一显示月名（如“二月”“闰二月”）> 农历日。`title` 为 `2024年2月`。`yearGanZhiText` 取该月 15 日 12:00 的年柱，格式为 `甲辰年`。
  - `buildDayDetail(dateParts, ziSect) → {solarText, lunarText, ganzhiText, shengXiao, term:{name, timeText}|null, festivals, hours}`
    - `solarText`：`2024年2月10日 周六`。
    - `ganzhiText`：用 00:00 和 23:59 分别计算年柱、月柱、日柱。三柱都相同时为 `甲辰年 丙寅月 甲辰日`；年柱或月柱不同时为 `癸卯年 乙丑月 → 16:27 起 甲辰年 丙寅月，戊戌日`。日柱取当天 12:00 的值。
    - `hours`：13 行 `{name, range:'00:00–00:59', ganzhi, note}`。时柱干支在每个时辰中点计算，晚子时的时干按次日日干推。只有晚子时一行有 note：`late23` 时为 `日柱已入次日`，`midnight` 时为 `日柱仍为当日`；其余行为 `''`。`FEATURES.hourTable` 为 false 时 hours 为 `[]`。
  - `buildYearTerms(year, nowWall) → [{name, isJie, dateText:'2月4日 周日', timeText:'16:27', past:boolean, upcoming:boolean}]`：只有第一个满足 `!past` 的节气 `upcoming` 为 true。

- [ ] **Step 1: 写失败测试**

```js
test('Feb 2024 grid', () => {
  const m = buildMonth(2024, 2, { year: 2026, month: 11, day: 17 }, { year: 2024, month: 2, day: 4 });
  assert.equal(m.cells.length, 42);
  assert.deepEqual(m.cells[0].date, { year: 2024, month: 1, day: 29 });
  const c = d => m.cells.find(x => x.date.month === 2 && x.date.day === d);
  assert.deepEqual([c(4).sub, c(4).subKind], ['立春', 'term']);
  assert.deepEqual([c(9).sub, c(10).sub], ['除夕', '春节']);
  assert.deepEqual([c(5).sub, c(5).subKind], ['廿六', 'lunarDay']);
  assert.equal(m.title, '2024年2月');
});
test('lunar month first day shows month name', () => {
  const m = buildMonth(2024, 3, { year: 2026, month: 11, day: 17 }, { year: 2024, month: 3, day: 1 });
  const c = m.cells.find(x => x.date.month === 3 && x.date.day === 10);
  assert.deepEqual([c.sub, c.subKind], ['二月', 'lunarMonth']);
});
test('day detail on 立春 day', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 4 }, 'late23');
  assert.equal(d.ganzhiText, '癸卯年 乙丑月 → 16:27 起 甲辰年 丙寅月，戊戌日');
  assert.deepEqual(d.term, { name: '立春', timeText: '16:27' });
});
test('day detail hours', () => {
  const d = buildDayDetail({ year: 2024, month: 2, day: 10 }, 'late23');
  assert.equal(d.hours.length, 13);
  assert.deepEqual(d.hours[0], { name: '早子时', range: '00:00–00:59', ganzhi: '甲子', note: '' });
  assert.deepEqual(d.hours[12], { name: '晚子时', range: '23:00–23:59', ganzhi: '丙子', note: '日柱已入次日' });
  assert.equal(buildDayDetail({ year: 2024, month: 2, day: 10 }, 'midnight').hours[12].note, '日柱仍为当日');
});
test('year terms', () => {
  const t = buildYearTerms(2026, NOW);
  assert.equal(t.length, 24);
  assert.equal(t.find(x => x.upcoming).name, '小雪');
});
```

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 验证**

运行 `npm test`。另外编写一个性能测试：`buildMonth` 连续调用 12 次，总耗时 < 600ms。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): almanac month grid, day detail and year terms"
```

---

### Task 12: 档案、最近与存储服务

**PRD:** 10, 12, 15.1

**Files:**
- Create: `core/records.js`, `services/storage.js`
- Test: `tests/core/records.test.js`, `tests/services/storage.test.js`

**Interfaces:**
- Produces（`records.js`，纯函数，全部返回新数组）：
  - `inputKey(input) → string`：按固定字段顺序执行 `JSON.stringify`。
  - `addRecent(list, {input, summary}, nowMs)`：同 key 的记录移到最前；上限 20。
  - `createProfile(list, {name, input, summary}, nowMs) → {list, error?:'NAME_REQUIRED'|'NAME_TOO_LONG'|'LIMIT'|'DUPLICATE', existing?}`：name 去掉首尾空白后，长度按 `Array.from` 计算，上限 10。
  - `updateProfile(list, id, {name?, input?, summary?}, nowMs) → {list, error?}`：校验规则与 create 相同；DUPLICATE 检查要排除自身。
  - `removeById(list, id)`、`togglePin(list, id)`、`touchProfile(list, id, nowMs)`：touch 只更新 `lastOpenedAt`。
  - `sortProfiles(list)`：置顶在前，其余按 `lastOpenedAt` 倒序。
  - `searchProfiles(list, q)`：按 name 子串匹配。
  - `findProfileByInput(list, input)`
  - `profilesToText(list, summarize:(input)=>string) → string`：每个档案一段，段间用空行分隔。每段第一行为称呼，第二行为四柱，第三行为输入说明。
  - `sanitizeProfiles(raw)`、`sanitizeRecent(raw)`：非数组返回 `[]`，并丢弃字段不完整的条目。
  - Profile 结构：`{id, name, input, summary, pinned, createdAt, lastOpenedAt}`。Recent 结构：`{id, input, summary, createdAt}`。id 取 `String(nowMs)`。
- Produces（`services/storage.js`）：
  - `load(key)` 和 `save(key, value) → boolean`，内部都用 `try/catch` 包住。
  - `loadProfiles()`、`saveProfiles()`、`loadRecent()`、`saveRecent()`、`loadSettings()`（与 DEFAULT_SETTINGS 合并）、`saveSettings()`、`loadLastInput()`、`saveLastInput()`、`clearRecent()`、`clearAll() → boolean`。
  - 每次调用时才读取全局 `wx`，以便测试注入 mock。

- [ ] **Step 1: 写失败测试**

records 需要覆盖以下行为：

- 最近：上限 20、去重后移到最前。
- 档案：上限 100（第 101 条返回 `LIMIT`）、`DUPLICATE` 返回 existing、名称规则（空白名、11 个字）、update 时允许保存为自身的同一输入、置顶排序、搜索、`profilesToText` 的格式。
- 两个 sanitize 函数处理垃圾输入。

storage 需要覆盖：

- `getStorageSync` 抛异常时，load 返回 `[]` 或默认设置；
- `setStorageSync` 抛异常时，save 返回 false；
- 存储中保存的是字符串时，`loadProfiles()` 返回 `[]`。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): profiles and recent records with fault-tolerant storage"
```

---

### Task 13: 展示模型、分享文本、海报、页面传参

**PRD:** 7.1, 7.2, 7.4, 2.3

**Files:**
- Create: `core/resultView.js`, `core/shareText.js`, `core/poster.js`, `core/queryCodec.js`
- Test: 每个文件对应一个测试文件

**Interfaces:**
- Produces（`resultView.js`）：
  - `buildResultView(result, features = FEATURES) → ResultView`，结构如下：

```
{ summaryGroups:['庚午','辛巳','丁丑','丙午'], subline:'1990年5月12日 12:00 · 农历四月十八 · 马',
  methodChips:[{kind:'zi_sect', text:'23:00 换日'}, {kind:'true_solar', text:'真太阳时 关'}, {kind:'dst', text:'夏令时 已扣除'}],
  warnings:[...],
  table:{ columns:[{label:'年柱', gan, ganWuXing, zhi, zhiWuXing, hideGanText:'丁、己', naYin, a11y:'年柱，天干庚，五行金，地支午，五行火'}] , showHideGan, showNaYin },
  wuXingText:'金 2 · 木 0 · 水 0 · 火 5 · 土 1' | null,
  timeLines:['输入时间 1990年5月12日 12:00'] | ['输入时间 …','夏令时 −60.0 分钟','经度 −129.5 分钟','均时差 −14.1 分钟','修正后 2024年2月4日 15:36','出生地 乌鲁木齐'],
  termsLines:['上一节气 立夏 5月6日 02:35','下一节气 小满 5月21日 15:37'],
  derivation: string[], disclaimer }
```

    规则说明：
    - `subline` 中的农历部分：`lunarText` 去掉年份，月份前缀为“农历”。`shengXiaoNote` 存在时，生肖写作 `龙（按立春）· 按春节为兔`。
    - `dst` 标签只在 `method.dstEligible` 时出现。
    - 关闭 `wuXingCount` / `hideGan` / `naYin` 开关时，对应字段为 null 或 false。
  - `diffPillars(before:Result, after:Result) → {changedKeys:string[], toast:string}`：toast 示例为 `日柱：甲戌 → 癸酉`，多处变化时用 `；` 连接；没有变化时为 `四柱未变化`。
- Produces（`shareText.js`）：
  - `buildCopyText(result) → string`：4 行。第 1 行为四柱；第 2 行为公历与农历；第 3 行为算法设定；第 4 行为 `——来自干支历换算`。
  - `buildShareTitle(result) → '四柱干支：庚午 辛巳 丁丑 丙午'`
- Produces（`poster.js`）：`buildPosterSpec(view) → {lines:[{text, role:'title'|'pillars'|'body'|'small'}]}`。内容依次为：APP_NAME、四柱四组、`农历… · 生肖`、DISCLAIMER。**不含**出生地和称呼。
- Produces（`queryCodec.js`）：`encodeInput(input) → string`、`decodeInput(str) → QueryInput|null`。解码后执行 `validateInput`，校验不通过返回 null。

- [ ] **Step 1: 写失败测试**

要断言的内容：

- 上面结构中给出的示例值，以及乌鲁木齐用例的 `timeLines`。
- 三个开关分别关闭时，对应区块消失。
- `diffPillars`：切换派别时 toast 为 `日柱：甲戌 → 癸酉`。
- `buildCopyText` 的 4 行与示例完全一致。第 3 行格式为 `子时派别 23:00 换日 · 真太阳时 关`。
- 海报文本中不出现“乌鲁木齐”。
- `JSON.stringify(view)` 中不包含 `缺`、`旺`、`喜用`、`十神`。
- codec 往返一致；传入垃圾字符串返回 null。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

- [ ] **Step 4: 运行测试，确认通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): result view model, share text, poster spec and query codec"
```

---

### Task 14: 埋点 schema、知识库内容、禁用词扫描

**PRD:** 11, 14.3, 17

**Files:**
- Create: `core/analytics.js`, `services/track.js`, `core/articles.js`
- Create: `scripts/banned.js`, `scripts/check-copy.js`
- Test: `tests/core/analytics.test.js`, `tests/core/articles.test.js`, `tests/scripts/check-copy.test.js`

**Interfaces:**
- Produces（`analytics.js`）：
  - `EVENT_SCHEMA`：完整对应 PRD 17.2，每个参数都是枚举数组。
  - `buildEvent(name, params) → {name, params}`：未知事件或枚举外的值会抛出 `Error('BAD_EVENT')`。
- Produces（`services/track.js`）：`track(name, params)`，内部调用 `buildEvent` 后执行 `wx.reportEvent`，整体包在 `try/catch` 里，任何失败都静默忽略。
- Produces（`articles.js`）：
  - `ARTICLES: [{id:'K1'..'K10', title, paragraphs:string[], example?:{input, note}}]`：按 PRD 11 的表格编写正文。每篇不超过 800 字，示例用 `makeInput` 形态的输入，由页面调用 `calculate` 实时生成。
  - `TERMS: {天干:{def, article:'K1'}, 地支, 藏干:{…,'K8'}, 纳音:{…,'K9'}, 五行, 节, 中气, 真太阳时:'K5', 均时差:'K5', 子时派别:'K6'}`：每个 `def` 为一句话。
- Produces（`scripts/banned.js`）：`BANNED_WORDS`（Global Constraints 中的 24 个）、`BANNED_APIS`（Global Constraints 中列出的方法名）、`ALLOWED_PHRASES = [DISCLAIMER]`。
- Produces（`scripts/check-copy.js`）：
  - `findViolations(text) → [{kind:'word'|'api', value, line}]`
  - CLI 扫描 `miniprogram/` 下的 `.js/.json/.wxml/.wxss` 文件，跳过 `miniprogram_npm`。有命中时打印 `path:line 禁用词「X」` 或 `path:line 禁用接口 X` 并 `exit(1)`；没有命中时打印 `copy check passed`。

- [ ] **Step 1: 写失败测试**

- analytics：合法事件通过；参数中混入日期字符串（如 `date:'1990-05-12'`）或未知参数时抛出 `BAD_EVENT`。
- articles：
  - 共 10 篇，每篇字数 ≤ 800；
  - 每篇执行 `findViolations` 都为空；
  - K2 包含 `四柱干支，俗称生辰八字`；
  - K9 只是对照表，不含“命”字。
- check-copy：
  - `findViolations('今日运势')` 返回 `[{kind:'word', value:'运势', line:1}]`；
  - `findViolations('L.getDayYi()')` 返回一个 api 命中；
  - 免责声明原文不命中。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

知识库正文需要编写的事实，以 PRD 6 和 PRD 11 为准，不得超出。

- [ ] **Step 4: 验证**

运行 `npm run verify`。预期结果：全部通过，覆盖率不低于 90%。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): analytics schema, knowledge articles and banned copy scan"
```

**检查点 A/B：** 换算内核完成，对应 PRD 1.2 中“算得对”的全部门槛。

---

# Phase C · UI 基础

> 页面与组件的硬性规则：
> 1. 所有展示字符串都来自 core 的 view model；WXML 中只出现 PRD 14.4 固定文案和按钮动词。
> 2. 只用 `app.wxss` 中的令牌，不写死颜色值。
> 3. 下表中标注的 `id` 是端到端测试（Task 23）的契约，名称不可改动。
> 4. 每个页面任务完成后执行 `npm run verify`，并把“手动检查”清单交给用户；不得声称已在真机上验证。

### Task 15: 基础组件、隐私授权、全局错误

**PRD:** 13.4, 13.5, 15.2, 7.5

**Files:**
- Create: `components/segmented`, `components/sheet`, `components/notice`, `components/empty-state`, `components/action-bar`, `components/privacy-sheet`
- Create: `services/privacy.js`
- Modify: `app.js`
- Test: `tests/services/privacy.test.js`

**Interfaces:**
- **segmented**：properties 为 `items:[{key,text}]`、`value`；触发 `change` 事件，`detail` 为 `{key}`。
- **sheet**：properties 为 `show`、`title`；提供 `slot`；触发 `close` 事件；入场动画 200ms ease-out；底部适配 `env(safe-area-inset-bottom)`。
- **notice**：properties 为 `lines:string[]`，背景用 `--notice`，不带图标。
- **empty-state**：properties 为 `text`、`actionText`；触发 `action` 事件。
- **action-bar**：使用 slot，固定在页面底部并适配安全区。
- **privacy-sheet**：订阅 `services/privacy.js` 的请求后显示。包含两个按钮：
  - “同意”使用 `<button open-type="agreePrivacyAuthorization" bindagreeprivacyauthorization>`；
  - “不同意”调用 `resolve({event:'disagree'})`。
  - 文案见 PRD 15.2，其中《干支历换算隐私保护指引》链接到 `wx.openPrivacyContract`。
- **services/privacy.js**：
  - `install()`：在 `app.js` 的 `onLaunch` 中调用，内部注册 `wx.onNeedPrivacyAuthorization(resolve => emit(resolve))`。
  - `subscribe(listener) → unsubscribe`。
  - 隐私开发方式以微信官方《小程序隐私协议开发指南》的当前版本为准；如果需要 `__usePrivacyCheck__` 等配置，按文档添加。
- **app.js**：`onError(msg)` 中调用 `track('app_error', {where:'app', code:'runtime'})`，不上报 msg 内容。

- [ ] **Step 1: 写失败测试**

`privacy.test.js` 使用 mock 的 wx：

- `install` 后触发回调，订阅者能收到 resolve；
- 取消订阅后不再收到。

- [ ] **Step 2: 运行测试，确认失败**

- [ ] **Step 3: 实现**

实现以上组件和服务。

- [ ] **Step 4: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：** 在开发者工具中打开任一页面，切换深色模式，确认组件配色正确。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): base components, privacy authorization sheet and error tracking"
```

---

### Task 16: 选择器组件

**PRD:** 5.1, 8.1, 13.4

**Files:**
- Create: `components/datetime-sheet`, `components/city-sheet`, `components/ganzhi-sheet`

**Interfaces:**
- **datetime-sheet**：
  - properties 为 `show`、`value:{calendar, year, month, day, isLeapMonth, precision, hour, minute, shichen}`。
  - 内部结构：顶部是公历/农历的 segmented；中间是 `picker-view` 的年、月、日三列，农历列表来自 `lunarInput`；下方是精度 segmented 和时间区（精确时为时、分两列，时辰时为 `SHICHEN` 列表，不详时隐藏）。
  - 公历、农历切换时，用 `lunarToSolarDate` 或库的反向换算保持同一天。
  - 点“确定”时触发 `confirm` 事件，`detail` 为新的 value。
- **city-sheet**：
  - properties 为 `show`、`value:cityId`。
  - 内部结构：顶部搜索框（调用 `searchCities`），下方是 `groupByProvince` 两级列表，底部固定文字 `暂不支持境外出生地`。
  - 选中城市触发 `select`，`detail` 为 `{cityId}`；另有“不选”项，触发时 `detail` 为 `{cityId:null}`。
- **ganzhi-sheet**：
  - properties 为 `show`、`options:string[]`（可选的干支）、`allowEmpty`。
  - 内部结构：6×10 网格显示 `JIA_ZI`，不在 options 里的格子置灰且不可点；`allowEmpty` 为真时显示“不填”。
  - 选中后触发 `select`。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 农历 2023 年出现闰二月。
2. 公历切到农历时日期保持不变。
3. 在城市搜索框输入“乌鲁”，只出现乌鲁木齐。
4. 选定年柱庚午后，月柱只能选 12 个。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): date-time, city and ganzhi picker sheets"
```

---

# Phase D · 页面

### Task 17: 换算页（两种模式）

**PRD:** 5, 8.1

**Files:**
- Modify: `pages/convert/index.*`

**行为：**

- **模式切换**：segmented 的 `#mode-birth` 和 `#mode-reverse`。`FEATURES.reverseLookup` 为 false 时，隐藏分段控件。
- **出生信息模式**：
  - 字段行：`#date-field`（打开 datetime-sheet）、`#city-field`、`#true-solar`（switch）、`#zi-sect`（segmented）。
  - 字段的错误文案显示在对应行下方。
  - 主按钮为 `#submit`，文案“换算”。
  - 默认值和草稿按 PRD 5.2：首次使用 `beijingNow`，之后读取 `loadLastInput`。换算页是 Tab 页，`switchTab` 不能带 query，所以从万年历进入时，由日详情页先把 `{date}` 写入 `getApp().globalData.prefill`；换算页在 `onShow` 时读取一次并清空，预填该日期，并把精度设为 unknown。
  - 设置项默认取 `loadSettings`。
- **提交流程**：
  1. 执行 `validateInput`。有错误时用 `pageScrollTo` 滚到第一个错误，然后结束。
  2. 若 `dstEligible`，打开 sheet。按钮 `#dst-yes` 文案为“是，减去 1 小时”，`#dst-no` 文案为“否，按原时间换算”，标题和正文见 PRD 5.4。用户的选择写入 `applyDst`。
  3. 依次执行 `saveLastInput`、`track('convert_submit', …)`、`navigateTo('/pages/result/index?q=…&source=convert')`。
- **反查模式**：
  - 四个字段：`#rv-year`、`#rv-month`、`#rv-day`、`#rv-time`，都打开 ganzhi-sheet。选项来自 `monthOptionsForYear` 和 `timeOptionsForDay`。上游字段变化时，清空下游不再合法的选择。
  - 子时派别使用 segmented。
  - 按钮 `#rv-submit` 跳转到 `/pages/reverse/index?y=&m=&d=&t=&sect=`。
- **副标题**：页面副标题为 `SUBTITLE`。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 输入 1990-05-12 12:00，结果为 `庚午 辛巳 丁丑 丙午`。
2. 输入 1990-07-01 时出现夏令时弹层。
3. 开启真太阳时但未选城市，出现错误提示并滚动到该字段。
4. 在反查模式下选择 庚午 / 辛巳 / 丁丑 / 丙午，能跳转到反查页。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(convert): birth-info and reverse-lookup input modes"
```

---

### Task 18: 结果页

**PRD:** 7

**Files:**
- Create: `components/summary-header`, `components/pillar-table`, `components/method-bar`, `components/term-tip`, `services/posterCanvas.js`
- Modify: `pages/result/index.*`

**行为：**

- **加载**：`onLoad({q, source, profileId?})` 执行 `decodeInput`。结果为 null 时显示 empty-state（`没能读取这次换算` / `重新换算`）。否则执行 `calculate`：抛异常时显示错误状态（`换算出错了` / `反馈问题`，按钮使用 `open-type="feedback"`），并调用 `track('app_error', {where:'result', code:'calc'})`。计算成功时调用 `buildResultView`。
- **区块**：严格按 PRD 7.1 的顺序排列。
  - `#summary` 的文本内容等于 `summary`。
  - `#method-zi`、`#method-solar`、`#method-dst` 三个标签都打开 sheet 切换算法。切换后重算，再用 `diffPillars` 标出变化的柱位（下划线 class 为 `.changed`），并调用 `wx.showToast`。开启真太阳时但没有城市时，在 sheet 中嵌入 city-sheet。
  - 四柱表的单元格点击后显示 term-tip，内容来自 `TERMS`，并调用 `track('term_tip_open')`；“阅读全文”跳转到 `/sub/learn/article?id=`。
  - 节气区块点击后跳转到 `/sub/terms/index?year=`。
  - 推导区块 `#derivation-toggle` 默认收起；第一次展开时调用 `track('derivation_expand')`。
- **最近**：计算成功后执行 `saveRecent(addRecent(...))`。保存失败时不提示。
- **操作栏**：
  - `#save-profile`：若 `findProfileByInput` 找到已有档案，文案为 `已存为·{name}`，点击进入编辑页；否则跳转到 `/pages/profile-edit/index?q=…`。
  - `#copy`：调用 `wx.setClipboardData(buildCopyText)`。
  - 分享按钮使用 `open-type="share"`。
  - `#poster`：用 `posterCanvas.draw(spec)` 生成临时文件，在 sheet 中预览；`#poster-save` 调用 `saveImageToPhotosAlbum`。权限被拒时显示“需要相册权限才能保存图片”和“去设置”（调用 `wx.openSetting`）。
  - 页面中放置 `<privacy-sheet/>`。
- **分享**：`onShareAppMessage` 返回 `{title: buildShareTitle, path: '/pages/convert/index'}`。
- **从档案打开**：如果结果是从档案打开的，切换算法后显示一条 notice 并附按钮“更新到档案”。
- **存储失败**：存储失败时的提示文案见 PRD 7.5。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 输入 2024-03-10 23:30，切换子时派别，toast 显示 `日柱：甲戌 → 癸酉`。
2. 展开推导，内容与 PRD 7.3 一致。
3. 复制后粘贴，得到 4 行文本。
4. 保存海报时首次弹出隐私授权，海报底部有免责声明。
5. 修改 URL 参数 q 为非法值，页面显示空状态。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(result): full result page with method toggles, derivation and sharing"
```

---

### Task 19: 反查结果页、档案页、档案编辑页

**PRD:** 8.2, 10

**Files:**
- Modify: `pages/reverse/index.*`, `pages/archive/index.*`, `pages/profile-edit/index.*`

**行为：**

- **反查结果页**：
  - 调用 `reverseLookup(params, sect, beijingNow(Date.now()))`。
  - 顶部 notice 写 `结果均为北京时间，未使用真太阳时与夏令时`。
  - 每条记录用 `.reverse-item` 展示，格式为 `1990年5月12日 周六 · 11:00–12:59 · 农历四月十八`；`hasJie` 为真时加 `· 含交节`；合并后跨日的记录按 PRD 8.2 的格式显示。
  - 点击记录后，构造 `precision:'shichen'` 的输入（未填时柱时为 unknown），跳转结果页，并带上 `source=reverse`。
  - 没有结果时显示 empty-state，文案见 PRD 14.4，并附上 K4 的链接。
  - 调用 `track('reverse_submit', {result_bucket})`。
- **档案页**：
  - segmented 分为 `#tab-profiles` 和 `#tab-recent`。
  - 档案列表 `.profile-item` 按 `sortProfiles` 排序，支持左滑出现置顶、编辑、删除；删除前确认，文案见 PRD 10.2。顶部有搜索框，没有结果时的文案见 PRD 10.3。
  - 最近列表 `.recent-item` 的右侧显示 `relativeTime`，左滑出现“存为档案”和“删除”；底部有“全部清空”。
  - 两个列表的空状态文案见 PRD 10.3。
  - 打开档案时先 `touchProfile`，再跳转结果页并带上 `source=archive&profileId=`。
  - `onShow` 时刷新列表。
- **档案编辑页**：
  - 称呼输入框为 `#name-input`；表单复用 datetime-sheet 和 city-sheet；保存按钮为 `#save`。
  - 保存前，如果四柱会变化，先确认 `四柱将变为 …`。
  - `createProfile` 或 `updateProfile` 返回的错误，映射为字段下方的文案：
    - NAME_REQUIRED：`请填写称呼`
    - NAME_TOO_LONG：`称呼最多 10 个字`
    - LIMIT：`档案已满 100 条，请先删除不需要的档案`
    - DUPLICATE：弹窗显示 `已在档案中：{name}`，按钮为“打开”和“取消”
  - 保存时如果存储失败，提示 PRD 7.5 中的文案。
  - 保存成功后调用 `track('profile_save')`。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 反查 甲辰 / 丙寅 / 戊戌 / 庚申，第一条为 `2024年2月4日 周日 · 16:28–16:59 · … · 含交节`。
2. 同一输入保存两次时，提示已存在。
3. 在开发者工具 Storage 中把 profiles 改成字符串，档案页显示空状态，不会白屏。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(archive): reverse results, profiles, recent and profile editing"
```

---

### Task 20: 万年历、日详情、节气表

**PRD:** 9

**Files:**
- Create: `components/month-grid`
- Modify: `pages/almanac/index.*`, `sub/day/index.*`, `sub/terms/index.*`

**行为：**

- **month-grid 组件**：渲染 `buildMonth().cells`，6 行固定高度。每个格子为 `.day-cell`，带 `data-date="YYYY-MM-DD"`。今天的格子用实心圆，选中的格子用描边，非本月日期降低透明度。左右滑动时触发 `prev`、`next` 事件。
- **万年历页**：
  - 头部显示 `title · yearGanZhiText`；点击头部打开年月 picker；“今天”按钮的 id 为 `#today`。
  - 下方是选中日的摘要卡：内容来自 `buildDayDetail` 的前几个字段，再加上 `nextTermFrom` 生成的 `距{name}还有 N 天`；入口包括 `#open-day`（日详情）和 `#open-terms`（节气表）。
  - 打开日详情时调用 `track('almanac_day_open')`。
- **日详情页**：
  - 按 PRD 9.2 展示 `buildDayDetail` 的全部字段。`hours` 为空时（开关关闭），整个区块不渲染。
  - 按钮 `#use-day` 先把 `{date}` 写入 `getApp().globalData.prefill`，再执行 `switchTab` 到换算页（读取逻辑见 Task 17）。
- **节气表页**：
  - 顶部用年份 picker，范围 1900–2100。
  - 列表内容来自 `buildYearTerms`：已过的节气降低透明度，`upcoming` 的节气显示“即将到来”标签，节和中气用小标签区分。
  - 点击任一行跳转到日详情。
  - 底部注明的文字见 PRD 9.3。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 2024 年 2 月的格子显示“立春”“除夕”“春节”。
2. 日详情的十二时辰表有 13 行。
3. 在“我的”中切换子时派别后，晚子时的备注随之变化。
4. 连续左右滑动切月时，页面不跳动。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(almanac): month grid, day detail and solar term table"
```

---

### Task 21: 我的、数据与隐私、关于、知识库

**PRD:** 11, 12, 15

**Files:**
- Modify: `pages/me/index.*`, `sub/privacy/index.*`, `sub/about/index.*`, `sub/learn/index.*`, `sub/learn/article.*`

**行为：**

- **我的页**：
  - 顶部显示 `ME_HEADER`。
  - 默认设置包括：子时派别、真太阳时、默认出生地（打开 city-sheet）。每项旁边有 `?`，跳转到对应文章。修改后调用 `saveSettings`。
  - 其余入口：知识库、数据与隐私、意见反馈（`button open-type="feedback"`）、关于。
- **数据与隐私页**：
  - 隐私说明正文与 PRD 15 一致。
  - `#copy-profiles`：用 `setClipboardData` 复制 `profilesToText` 的结果。
  - “清空最近”需要先确认。
  - `#clear-all`：打开 sheet，sheet 中有输入框，用户输入“清除”二字后按钮才可点；执行 `clearAll` 后提示“已清除”。
  - 页面中放置 `<privacy-sheet/>`。
- **关于页**：
  - 显示版本号，取自 `wx.getAccountInfoSync().miniProgram.version`，开发版为空时显示“开发版”。
  - 更新说明：从 `core/constants.js` 中的 `CHANGELOG` 数组按版本倒序渲染。v1.0.0 的内容写 3 行以内。
  - 服务协议：正文作为待办，留出占位段落“开发者联系方式待补充”（PRD 19.2）。
  - 免责声明。
- **知识库**：
  - 列表页展示 `ARTICLES` 的标题。
  - 文章页渲染各段正文；如果文章有 `example`，调用 `calculate` 后用 `buildResultView` 的摘要组件展示示例。
  - 打开文章时调用 `track('article_view', {article})`。

- [ ] **Step 1: 实现**

- [ ] **Step 2: 验证**

运行 `npm run verify`。

**手动检查（交给用户）：**

1. 清除全部数据后，档案和最近都为空，设置恢复为默认值。
2. 复制全部档案后，粘贴出的文本格式正确。
3. 知识库共 10 篇，示例都能正常显示。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(me): settings, data and privacy, about and knowledge base"
```

---

# Phase E · 质量与发布

### Task 22: 降级开关验证

**PRD:** 2.3, 18.2

**Files:**
- Test: `tests/core/features.test.js`

- [ ] **Step 1: 写测试**

按 `DOWNGRADE_ORDER` 依次关闭开关，每关闭一个都构建一次 view：

- `buildResultView`：对应字段消失，且 `JSON.stringify` 中不再出现该区块的数据。
- `buildDayDetail`：`hourTable` 关闭时 hours 为 `[]`。
- `reverseLookup`：只验证换算页不显示入口。这一点属于页面行为，在 E2E 中验证。

- [ ] **Step 2: 运行测试，确认通过**

运行 `npm test`。

- [ ] **Step 3: Commit**

```bash
git commit -m "test: verify downgrade feature flags"
```

---

### Task 23: 端到端测试（5 条关键旅程）

**PRD:** 3（关键旅程）、16

**前置条件：**

- 本机已安装微信开发者工具（本机已检测到 `/Applications/wechatwebdevtools.app`）。
- 在“设置 → 安全设置”中开启服务端口。
- 已执行“工具 → 构建 npm”。
- CLI 路径通过环境变量 `WX_DEVTOOLS_CLI` 传入，默认值为 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。

如果前置条件不满足，agent 应停止本任务并告知用户，不得跳过后声称完成。

**Files:**
- Create: `e2e/journeys.test.js`

**用例：**

`automator.launch({cliPath, projectPath})` 只执行一次，所有用例共用。每个用例开始前先执行 `miniProgram.callWxMethod('clearStorageSync')`。用 `page.setData` 写入表单值来代替滚轮操作。

1. **核对**：在换算页把表单设为 2024-03-10 23:30（late23），点击 `#submit`。断言 `#summary` 为 `甲辰 丁卯 甲戌 甲子`。在 `#method-zi` 中切换为 0:00 换日后，断言 `#summary` 为 `甲辰 丁卯 癸酉 甲子`。
2. **记录家人**：从结果页点 `#save-profile`，在 `#name-input` 中输入“妈妈”，点 `#save`。进入档案 Tab，断言 `.profile-item` 有 1 个，且包含“妈妈”。
3. **反查**：在 `#mode-reverse` 模式下，用 setData 设置 庚午 / 辛巳 / 丁丑 / 丙午，点 `#rv-submit`。断言第一个 `.reverse-item` 包含 `1990年5月12日`。
4. **查日子**：在万年历中跳转到 2024-02，点 `.day-cell[data-date="2024-02-04"]`，再点 `#open-day` 和 `#use-day`。断言换算页的日期字段显示 `2024年2月4日`，精度为“不详”。
5. **学习**：在结果页点四柱表的年柱天干单元格，断言 term-tip 可见；点“阅读全文”，断言当前路由为 `sub/learn/article`。

- [ ] **Step 1: 编写用例**

- [ ] **Step 2: 运行**

运行 `npm run e2e`。预期结果：5 PASS。

- [ ] **Step 3: Commit**

```bash
git commit -m "test(e2e): cover five key user journeys"
```

---

### Task 24: 发布前检查（交给用户）

**PRD:** 16, 18

本任务没有代码改动。agent 依次执行以下命令，并把结果原样汇报：

1. `npm run verify`：全部通过，覆盖率不低于 90%。
2. `npm run verify:reverse`：输出 `5000/5000 ok`。
3. `npm run e2e`：5 条用例通过。

然后把下面的清单交给用户，由用户完成：

- 开发者工具「代码依赖分析」：主包不超过 1.5MB，总包不超过 4MB。
- 真机矩阵（2 台 iOS + 3 台 Android）：冷启动小于 1.5 秒；飞行模式下完成 5 条旅程；大字体和深色模式下页面不错位。
- PRD 18.1 中的体验版内测与 5 人可用性测试。
- 逐项完成 PRD 18.2 的人工自查清单。
- PRD 19.2 中的待决事项全部关闭：名称、主体、城市数据源（确定后执行 `node scripts/build-cities.js`）、设计交付物（拿到后为 tabBar 补上 iconPath）、开发者联系方式。

打标签：

```bash
git tag v1.0.0
```
