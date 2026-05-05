import Parser from 'rss-parser';
import pLimit from 'p-limit';

const parser = new Parser({
  timeout: 30000, // 30s timeout
});

export interface RawArticle {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
}

export async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const feed = await parser.parseURL(url);
      return feed;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

export async function fetchAllRss(sources: any[]): Promise<RawArticle[]> {
  const limit = pLimit(10); // Concurrent limit 10
  
  const tasks = sources.map(source => limit(async () => {
    try {
      console.log(`Fetching: ${source.name} (${source.url})`);
      const feed = await fetchWithRetry(source.url);
      return feed.items.map((item: any) => ({
        title: item.title || 'No Title',
        link: item.link || item.enclosure?.url || '',
        source: source.name,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        summary: item.contentSnippet || item.content || '',
      }));
    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }));

  const results = await Promise.all(tasks);
  return results.flat();
}
