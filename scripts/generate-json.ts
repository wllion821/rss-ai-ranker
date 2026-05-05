import fs from 'fs/promises';
import path from 'path';

export async function saveArticles(articles: any[]) {
  const date = new Date().toISOString().split('T')[0];
  const fileName = `articles-${date}.json`;
  const filePath = path.join(process.cwd(), 'data', fileName);

  // 检查是否已存在，如果存在则合并（简单策略：新覆盖旧，基于 ID）
  let finalData = articles;
  try {
    const existingContent = await fs.readFile(filePath, 'utf-8');
    const existingData = JSON.parse(existingContent);
    const dataMap = new Map();
    existingData.forEach((a: any) => dataMap.set(a.id, a));
    articles.forEach((a: any) => dataMap.set(a.id, a));
    finalData = Array.from(dataMap.values());
  } catch (e) {
    // File doesn't exist yet, that's fine
  }

  await fs.writeFile(filePath, JSON.stringify(finalData, null, 2));
  console.log(`Successfully saved ${finalData.length} articles to ${filePath}`);
  return filePath;
}
