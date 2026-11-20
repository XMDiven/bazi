# AGENTS.md

## 项目概况

- **名称**：问辰查时（微信小程序，AppID `wx2675a4fc90534b72`）。代码与 PRD 中仍沿用早期名称「干支历换算」（如 `core/constants.js` 的 `APP_NAME`、隐私指引名），尚未统一。
- **定位**：公历、农历与四柱干支的换算工具，附四柱反查、万年历、节气表、档案、知识库。只做历法换算与科普，不做任何命理解读。
- **需求文档**：`docs/prd.md`（线上文档的本地副本，改需求时同步更新）。

## 技术栈

- 微信小程序原生开发（WXML / WXSS / JS），无前端框架，基础库 3.4.10，支持深色模式。
- 唯一运行时依赖：`lunar-javascript`（需在开发者工具里「构建 npm」）。
- 测试：Node 内置 `node:test`；端到端用 `miniprogram-automator`。

## 目录结构

```
miniprogram/
  core/        纯函数：历法计算、校验、视图模型、文案（全部有单元测试）
  services/    与 wx API 打交道：存储、埋点、隐私授权、分享图绘制
  components/  通用组件（底部弹层 sheet、城市/日期/干支选择等）
  pages/       主包页面：换算、结果、反查、万年历、档案、我的
  sub/         分包页面：日详情、节气表、知识库、隐私、关于
data/          城市经纬度源数据（GeoNames，CC BY 4.0）
scripts/       城市数据生成、违禁文案扫描、反查验证
tests/         单元测试；e2e/ 为端到端旅程
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm test` | 单元测试 |
| `npm run verify` | 提交前完整检查：单测 + 多时区单测 + 覆盖率（≥90%）+ 违禁文案扫描 |
| `npm run check:copy` | 扫描禁用词与禁用接口（如算命、运势、宜忌类 API） |
| `node scripts/build-cities.js` | 由 `data/cities.source.csv` 生成 `miniprogram/core/data/cities.js`，不要手改生成文件 |
| `npm run e2e` | 端到端测试，需开着微信开发者工具的服务端口 |

## 约定

- **全部本地计算**：无服务器、不发网络请求、不接第三方 SDK、不获取位置等个人信息。隐私接口只有剪贴板写入和保存图片到相册。
- **逻辑放 `core/` 并配测试**，页面和组件只负责展示与交互。
- **样式只用 `app.wxss` 里的设计令牌**（颜色、字号、间距）；朱砂色（`--accent`）每页不超过两处；可点元素加 `hover-class="tap-active"`。
- **文案平实、不越界**：禁用词见 `scripts/banned.js`，提交前跑 `npm run verify`。
- **出生地是独立的选填项**，由用户自己选择，不与真太阳时开关合并。
- **Git**：直接在 `main` 上开发和提交，不建功能分支；提交信息用 conventional commits 风格。
