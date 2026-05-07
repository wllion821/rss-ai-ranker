import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export function generateId(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

export async function getExistingIds(): Promise<Set<string>> {
  const dataDir = path.join(process.cwd(), 'data');
  const files = await fs.readdir(dataDir);
  const articleFiles = files.filter(f => f.startsWith('articles-') && f.endsWith('.json'));
  
  const existingIds = new Set<string>();
  
  for (const file of articleFiles) {
    try {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const data = JSON.parse(content);
      const articles = data.articles || data; // 支持新旧格式
      articles.forEach((a: any) => {
        if (a.id) existingIds.add(a.id);
      });
    } catch (e) {
      console.warn(`Error reading ${file} during dedupe:`, e);
    }
  }
  
  return existingIds;
}

export async function filterNewArticles(articles: any[]): Promise<any[]> {
  const existingIds = await getExistingIds();
  return articles.filter(article => {
    const link = (article?.link || '').trim();
    const title = (article?.title || '').trim();
    const source = (article?.source || '').trim();

    if (!link && !title) {
      return false;
    }

    const id = link
      ? generateId(link)
      : generateId(`${title}::${source}`);

    article.id = id; // Inject ID
    return !existingIds.has(id);
  });
}
