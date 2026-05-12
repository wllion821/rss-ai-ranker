# GEMINI.md — RSS AI Ranker 项目规范

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

## 数据流
```
GitHub Actions cron (UTC 16:00 = 北京 00:00)
→ scripts/main.ts
→ fetch RSS（并发 10，24小时过滤）
→ dedupe（扫描所有历史 JSON）
→ call Gemini API（串行 batch，间隔 1.5s）
→ generate daily summary
→ generate data/articles-YYYY-MM-DD.json
→ git commit & push
→ Astro build
→ GitHub Pages deploy
→ process.exit(0)
```

## JSON 数据结构
### data/articles-YYYY-MM-DD.json
```json
{
  "dailySummary": "今日科技速递：...",
  "articles": [
    {
      "id": "sha256-of-url",
      "title": "文章标题",
      "link": "https://original-url",
      "source": "博客名",
      "publishedAt": "2026-05-05T08:00:00Z",
      "summary": "RSS 提供的摘要",
      "recommendationScore": 87,
      "popularityScore": 72,
      "priority": "high",
      "comment": "AI 简评",
      "reason": "推荐原因",
      "tags": ["AI", "LLM", "Tools"]
    }
  ]
}
```

### data/sources.json
```json
[
  {
    "name": "博客名",
    "url": "https://example.com/rss.xml",
    "category": ["AI", "Tools"],
    "priority": 5
  }
]
```

## 关键文件说明
| 文件 | 职责 |
|------|------|
| scripts/fetch-rss.ts | RSS 抓取，24小时过滤，无日期的赋当前时间 |
| scripts/dedupe.ts | 增量去重（扫描全历史），空链接用 title+source 做备用 key |
| scripts/score.ts | Gemini API 打分，串行 batch，1.5s 间隔，JSON 提取优先解析代码块 |
| scripts/summary.ts | Gemini API 生成每日中文摘要，30s 超时保护 |
| scripts/generate-json.ts | 生成当日 JSON（对象格式：dailySummary + articles） |
| scripts/main.ts | 串联以上步骤，10 分钟整体超时，结束后 process.exit(0) |
| scripts/check-sources.ts | RSS 源可用性检测 |
| data/sources.json | 90 个 RSS 源列表 |
| data/articles-*.json | 每日文章数据（对象格式） |
| src/pages/index.astro | 首页：AI 摘要 + 统计面板 + 搜索 + 标签筛选 + 文章卡片 |
| src/pages/archive.astro | 归档页：按日期列表 |
| src/pages/day/[date].astro | 归档详情：某天的文章 |
| src/components/ArticleCard.astro | 文章卡片组件 |
| src/components/ScoreBadge.astro | 评分徽章组件 |
| src/layouts/BaseLayout.astro | 全局布局：导航栏 + 页脚 |
| public/logo.jpg | W先生备忘录 Logo |

## 当前页面功能
- 首页：AI 每日摘要（可展开/收起）、统计面板（今日新增/平均分/高分文章/活跃源）、搜索框、标签筛选栏、≥70 分文章卡片列表
- 归档页：按日期倒序，每天一行（日期 + 文章数 + 最高分标题）
- 归档详情页：某天的全部 ≥70 分文章
- 导航栏：Logo + W先生备忘录 · AI 科技日报 + 首页 + 归档

## 工程规范
- 增量去重：扫描 data/ 所有 articles-*.json 的 id 字段
- 并发控制：RSS 10 并发，AI 串行（batch 间隔 1.5s）
- Retry 3 次 + 30s 超时
- 单源/单篇失败不阻塞全流程
- summary 清洗：去 HTML、去 URL、去 HN points/comments 数字、截断 200 字符
- 只显示 recommendationScore >= 70 的文章
- process.exit(0) 确保脚本退出

## AI 模型配置
- 模型：gemini-2.5-flash
- SDK：@google/generative-ai（原生 SDK）
- 环境变量：GEMINI_API_KEY（存在 GitHub Secrets）
- 不使用 OpenAI 兼容层

## 开发环境
- 家里：MacBook M4 Air + Gemini CLI + Codex for Mac
- 单位：Windows 11 + VS Code + GitHub Copilot Agent
- 同步：iCloud Drive + Git
- 项目路径（Mac）：~/Library/Mobile Documents/com~apple~CloudDocs/01 Project/rss-ai-ranker/
- 不会开发，依赖 AI 工具生成代码

## 开发规则
- 生成完整可运行代码，不给片段
- 分阶段执行，每阶段完成后等待确认
- 不要自作主张引入新依赖或改变架构
- 改文件前说明要改什么、为什么改
- 遇到错误立即停止，汇报问题并提供建议
- 每次修改完成后，自动执行 git add . && git commit -m "简要描述" && git push
