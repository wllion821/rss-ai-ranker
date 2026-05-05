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
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const tasks = sources.map(source => limit(async () => {
    try {
      console.log(`Fetching: ${source.name} (${source.url})`);
      const feed = await fetchWithRetry(source.url);
      
      const items = feed.items.map((item: any) => ({
        title: item.title || 'No Title',
        link: item.link || item.enclosure?.url || '',
        source: source.name,
        publishedAt: item.isoDate || item.pubDate || '', // Keep empty if not found
        summary: item.contentSnippet || item.content || '',
      }));

      // Filter by time: Only last 24h OR missing publishedAt
      return items.filter((item: any) => {
        if (!item.publishedAt) return true;
        const pubDate = new Date(item.publishedAt);
        return pubDate >= twentyFourHoursAgo;
      });
    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }));

  const results = await Promise.all(tasks);
  return results.flat();
}
