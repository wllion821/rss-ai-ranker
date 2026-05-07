import fs from 'fs/promises';
import path from 'path';

export async function saveArticles(articles: any[], dailySummary?: string) {
  const date = new Date().toISOString().split('T')[0];
  const fileName = `articles-${date}.json`;
  const filePath = path.join(process.cwd(), 'data', fileName);

  // 检查是否已存在，如果存在则合并（简单策略：新覆盖旧，基于 ID）
  let finalArticles = articles;
  let existingSummary = '';
  try {
    const existingContent = await fs.readFile(filePath, 'utf-8');
    const existingData = JSON.parse(existingContent);
    if (existingData.articles && Array.isArray(existingData.articles)) {
      // 新格式
      const dataMap = new Map();
      existingData.articles.forEach((a: any) => dataMap.set(a.id, a));
      articles.forEach((a: any) => dataMap.set(a.id, a));
      finalArticles = Array.from(dataMap.values());
      existingSummary = existingData.dailySummary || '';
    } else if (Array.isArray(existingData)) {
      // 旧格式，迁移
      const dataMap = new Map();
      existingData.forEach((a: any) => dataMap.set(a.id, a));
      articles.forEach((a: any) => dataMap.set(a.id, a));
      finalArticles = Array.from(dataMap.values());
    }
  } catch (e) {
    // File doesn't exist yet, that's fine
  }

  const finalData = {
    dailySummary: dailySummary || existingSummary,
    articles: finalArticles
  };

  await fs.writeFile(filePath, JSON.stringify(finalData, null, 2));
  console.log(`Successfully saved ${finalArticles.length} articles to ${filePath}`);
  return filePath;
}
