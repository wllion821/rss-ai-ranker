import fs from 'fs/promises';
import path from 'path';
import { fetchAllRss } from './fetch-rss.ts';
import { filterNewArticles } from './dedupe.ts';

async function main() {
  try {
    // 1. 读取配置
    const sourcesPath = path.join(process.cwd(), 'data/sources.json');
    const sourcesContent = await fs.readFile(sourcesPath, 'utf-8');
    const sources = JSON.parse(sourcesContent);

    console.log(`Starting Phase 2: Processing ${sources.length} sources...`);

    // 2. 抓取 RSS
    const rawArticles = await fetchAllRss(sources);
    console.log(`Fetched ${rawArticles.length} raw articles total.`);

    // 3. 去重
    const newArticles = await filterNewArticles(rawArticles);
    console.log(`Found ${newArticles.length} new articles after deduplication.`);

    // 4. 保存为临时文件供 Phase 3 使用 (如果是测试)
    const tempPath = path.join(process.cwd(), 'data/raw-new-articles.json');
    await fs.writeFile(tempPath, JSON.stringify(newArticles, null, 2));
    console.log(`New articles saved to ${tempPath}`);

  } catch (error) {
    console.error('Main workflow error:', error);
    process.exit(1);
  }
}

main();
