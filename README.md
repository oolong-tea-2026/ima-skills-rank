# IMA Skills Rank Tracker

## 项目目的

监控 IMA Studio 系列 Skills 在 ClawHub 搜索中的排名表现，作为 SDO（Skill Discovery Optimization）工作成效的可视化看板。供硕哥和 Yuki 等相关同事使用。

## 架构

```
GitHub Actions Cron (每天 17:13 CST)
  │  调用 api.wulong.dev search API
  │  结果写入 data/snapshots/YYYY-MM-DD.json
  │  更新 data/index.json
  ▼
GitHub Repo (oolong-tea-2026/ima-skills-rank, public)
  │  数据存储：JSON 文件 + Git 版本管理
  ▼
api.wulong.dev/ima-rank/v1/* (Cloudflare Worker)
  │  代理 GitHub raw → JSON API
  │  端点：/config, /index, /snapshot?date=
  ▼
ima-skills-rank.wulong.dev (Cloudflare Worker)
  │  前端 SPA，从 API 读数据渲染
```

### 组件

| 组件 | 位置 | 说明 |
|------|------|------|
| 前端 | `index.html` → CF Worker `ima-skills-rank` | 单文件 SPA，深色主题，Skill 卡片布局 |
| API 层 | `api-gateway/ima-rank.js` | 代理 GitHub raw，5 分钟缓存 |
| 数据抓取 | `fetch-ranks.js` + GitHub Actions cron | 每天 17:13 CST 自动跑 |
| 配置 | `data/config.json` | 监控列表（skills + keywords），改完 push 即生效 |
| 数据 | `data/snapshots/YYYY-MM-DD.json` + `data/index.json` | 每日快照 + 日期目录 |

### 域名

- 看板：https://ima-skills-rank.wulong.dev
- API：https://api.wulong.dev/ima-rank/v1

### 仓库

- 前端 + 数据 + cron：https://github.com/oolong-tea-2026/ima-skills-rank (public)
- API 层：https://github.com/oolong-tea-2026/api-gateway (public)

## 当前状态 (P0 完成)

- ✅ 7 个 Skills × 各自 7 个目标搜索词 = 49 个 combo
- ✅ 每个 Skill 一张卡片，排名按颜色分 5 档（绿/灰绿/橄榄/橙/红）
- ✅ 搜索词点击跳转 ClawHub 搜索，Skill 名称点击跳转 ClawHub skill 页面
- ✅ 日期导航（← prev / current / next →），根据 index 中的有效日期控制
- ✅ 每天 17:13 CST 自动抓取 + commit
- ✅ 配置变更只需改 `data/config.json` 并 push

## TODO (后续功能)

### P1: 历史趋势图
- [ ] 点击某个 skill×keyword 的排名 → 展开折线图，显示排名随时间变化
- [ ] API 新增 `/ima-rank/v1/trend?skill=xxx&keyword=yyy&from=&to=` 端点
- [ ] 前端集成轻量图表库（Chart.js 或 inline SVG）

### P1.5: 汇总统计
- [ ] 每个 Skill 的入围率趋势
- [ ] 全局排名改善/恶化指标
- [ ] 对比两个日期的 diff 视图

### P2: 可能的增强
- [ ] Yuki 或其他同事的 Skills 加入监控
- [ ] 搜索词自动推荐（基于 ClawHub 热门搜索）
- [ ] 排名变化飞书/微信通知（cron 检测到显著变化时推送）
- [ ] 竞品 skill 排名对比

## 配置变更流程

1. 编辑 `data/config.json`（加/删 skill 或 keyword）
2. `git push`
3. 下次 cron 自动用新配置抓数据，前端自动渲染新卡片

## 技术细节

- 抓取 34 个唯一搜索词，每个间隔 2 秒，总耗时约 1.5-2 分钟
- 每个搜索词取 top 50 结果，在结果中查找我们的 slug
- ClawHub search API 通过 api.wulong.dev 代理（内置 CLAWHUB_TOKEN + 429 重试）
- 前端 API 层有 5 分钟 Cloudflare 边缘缓存
- GitHub Actions 免费额度：公开仓库无限
