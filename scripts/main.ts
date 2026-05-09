import fs from 'fs/promises';
import path from 'path';
import { fetchAllRss } from './fetch-rss.ts';
import { filterNewArticles } from './dedupe.ts';
import { scoreAllArticles } from './score.ts';
import { generateDailySummary } from './summary.ts';
import { saveArticles } from './generate-json.ts';

async function main() {
  console.log('--- Starting RSS AI Ranker Daily Run ---');

  // 设置 10 分钟超时
  const timeout = setTimeout(() => {
    console.error('Script timed out after 10 minutes');
    process.exit(1);
  }, 10 * 60 * 1000);

  try {
    // 1. Load Sources
    const sourcesPath = path.join(process.cwd(), 'data/sources.json');
    const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf-8'));
    console.log(`Loaded ${sources.length} sources.`);

    // 2. Fetch RSS
    const rawArticles = await fetchAllRss(sources);
    console.log(`Fetched ${rawArticles.length} raw articles.`);

    // 3. Deduplicate
    const newArticles = await filterNewArticles(rawArticles);
    console.log(`Found ${newArticles.length} new articles to process.`);

    if (newArticles.length === 0) {
      console.log('No new articles to score. Exiting.');
      return;
    }

    // 4. AI Scoring
    console.log('Starting AI scoring (this may take a while)...');
    const scoredArticles = await scoreAllArticles(newArticles);

    // 5. Generate Daily Summary
    console.log('Generating daily summary...');
    let dailySummary = '';
    try {
      dailySummary = await generateDailySummary(scoredArticles);
    } catch (error) {
      console.error('Summary generation failed, proceeding with empty summary:', error);
    }

    // 6. Generate JSON
    await saveArticles(scoredArticles, dailySummary);

    console.log('--- Workflow Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Workflow failed:', error);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

main();
