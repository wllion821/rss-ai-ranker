import fs from 'fs/promises';
import path from 'path';
import { fetchAllRss } from './fetch-rss.ts';
import { filterNewArticles } from './dedupe.ts';
import { scoreAllArticles } from './score.ts';
import { saveArticles } from './generate-json.ts';

async function main() {
  console.log('--- Starting RSS AI Ranker Daily Run ---');
  
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

    // 5. Generate JSON
    await saveArticles(scoredArticles);

    console.log('--- Workflow Complete ---');
  } catch (error) {
    console.error('Workflow failed:', error);
    process.exit(1);
  }
}

main();
