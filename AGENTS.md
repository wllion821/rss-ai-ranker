# AGENTS.md — RSS AI Ranker 项目规范

## 项目定义
W先生备忘录 · AI 科技日报。个人科技博客 AI 推荐聚合站。
每天自动扫描 ~90 个 RSS 源，AI 打分排序，生成静态网站。

## 网站地址
https://wllion821.github.io/rss-ai-ranker/

## 架构红线（不可违反）
- 纯静态，无数据库，无服务器
- 数据存储：JSON 文件 + Git
- 前端：Astro
- 后台脚本：Node.js + TypeScript（GitHub Actions 运行）
- AI：Gemini 2.5 Flash（@google/generative-ai SDK，不用 OpenAI 兼容层）
- 部署：GitHub Pages
- 禁止引入：Supabase、Vercel、Docker、SSR、前端直调 API

## 样式红线（极其重要）
- ❌ 禁止使用 Tailwind class（GitHub Pages 构建后不生效）
- ✅ 全部使用 style="" 内联样式
- ✅ 仅允许 <style> 标签用于 @media 查询和滚动条隐藏
- 深色主题：背景 #0f172a，文字 #e2e8f0
- 卡片：白色 #fff，圆角 12px，阴影
- 品牌色：青色 #22d3ee（Logo 发光色）
- 评分颜色：>=80 绿 #22c55e，60-80 黄 #eab308，<60 灰 #9ca3af

## 数据流    GitHub Actions cron (UTC 16:00 = 北京 00:00)
→ scripts/main.ts
→ fetch RSS（并发 10，24小时过滤）
→ dedupe（扫描所有历史 JSON）
→ call Gemini API（并发 3，间隔 1s）
→ generate data/articles-YYYY-MM-DD.json
→ git commit & push
→ Astro build
→ GitHub Pages deploy            

## 关键文件说明
| 文件 | 职责 |
|------|------|
| scripts/fetch-rss.ts | RSS 抓取，24小时过滤 |
| scripts/dedupe.ts | 增量去重（全历史） |
| scripts/score.ts | Gemini API 打分 |
| scripts/generate-json.ts | 生成当日 JSON |
| scripts/main.ts | 串联以上步骤 |
| scripts/check-sources.ts | RSS 源可用性检测 |
| data/sources.json | 90 个 RSS 源列表 |
| data/articles-*.json | 每日文章数据 |
| src/pages/index.astro | 首页 |
| src/components/ArticleCard.astro | 文章卡片 |
| src/components/ScoreBadge.astro | 评分徽章 |
| src/layouts/BaseLayout.astro | 全局布局 |

## 工程规范
- 增量去重：扫描 data/ 所有 articles-*.json 的 id 字段
- 并发控制：RSS 10，AI 3
- Retry 3 次 + 30s 超时
- 单源/单篇失败不阻塞全流程
- 错误写日志
- summary 清洗：去 HTML、去 URL、去 HN points/comments 数字、截断 200 字符
- 只显示 recommendationScore >= 70 的文章

## AI 模型配置
- 模型：gemini-2.5-flash
- SDK：@google/generative-ai（原生 SDK）
- 环境变量：GEMINI_API_KEY（存在 GitHub Secrets）
- 不使用 OpenAI 兼容层（之前测试 400 错误太多）

## 开发环境
- 家里：MacBook M4 Air + Gemini CLI + Codex for Mac
- 单位：Windows 11 + VS Code + GitHub Copilot Agent
- 同步：iCloud Drive
- 不会开发，依赖 AI 工具生成代码

## 开发规则
- 生成完整可运行代码，不给片段
- 分阶段执行，每阶段完成后等待确认
- 不要自作主张引入新依赖或改变架构
- 改文件前说明要改什么、为什么改
- 遇到错误立即停止，汇报问题并提供建议
- 每次修改完成后，自动执行 git add . && git commit -m "简要描述" && git push