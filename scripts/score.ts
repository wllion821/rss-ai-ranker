import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const BATCH_SCORING_PROMPT = `你是一个科技博客评审专家。
请对以下多篇文章进行评估，并输出一个 JSON 数组。

评估维度：
1. 技术深度（0-100）
2. 新颖性（0-100）
3. 实用性（0-100）
4. 信息密度（0-100）

关注主题优先级：AI > Apple 生态 > 编程工具 > 自动化 > 独立开发 > 产品设计

输出格式要求：
必须返回一个标准的 JSON 数组，包含在 \`\`\`json 代码块中。每个对象必须包含：
{
  "ref_id": "文章提供的参考ID",
  "recommendationScore": 0-100,
  "popularityScore": 0-100,
  "priority": "high" | "medium" | "low",
  "comment": "一句话简评",
  "reason": "一句话推荐原因",
  "tags": ["标签1", "标签2"]
}

文章列表：
{{articles_json}}`;

function cleanContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // 去掉 HTML 标签
    .replace(/\s+/g, ' ')    // 压缩空白字符
    .trim()
    .slice(0, 1000);         // 截断到 1000 字符
}

function extractJsonArray(text: string): any[] {
  try {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      try {
        const parsed = JSON.parse(fencedMatch[1].trim());
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      try {
        const parsed = JSON.parse(text.slice(startIndex, endIndex + 1).trim());
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  } catch (e) {
    console.error('JSON Parse Error. Raw response snippet:', text.slice(0, 200));
    return [];
  }
}

async function scoreBatch(batch: any[], retries = 3): Promise<any[]> {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return batch.map(a => ({ ...a, status: 'error', recommendationScore: 0 }));
  }

  const articlesInput = batch.map((a, index) => ({
    ref_id: index.toString(),
    title: a.title,
    content: cleanContent(a.content || a.summary || '')
  }));

  const prompt = BATCH_SCORING_PROMPT.replace('{{articles_json}}', JSON.stringify(articlesInput, null, 2));

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      if (!content) throw new Error('Empty AI response');
      
      const scoredResults = extractJsonArray(content);
      
      return batch.map((article, index) => {
        const scoreData = scoredResults.find((s: any) => s.ref_id === index.toString());
        return { 
          ...article, 
          ...(scoreData || { 
            recommendationScore: 0, 
            priority: 'low', 
            comment: 'Score mapping failed', 
            status: 'score_failed' 
          })
        };
      });
    } catch (error: any) {
      console.warn(`Retry batch scoring ${i + 1}/${retries}. Msg: ${error?.message || error}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return batch.map(a => ({ ...a, status: 'score_failed', recommendationScore: 0 }));
}

export async function scoreAllArticles(articles: any[]): Promise<any[]> {
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < articles.length; i += batchSize) {
    batches.push(articles.slice(i, i + batchSize));
  }

  console.log(`Processing ${articles.length} articles in ${batches.length} batches using Gemini Native SDK...`);
  const results: any[] = [];

  for (let index = 0; index < batches.length; index++) {
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const batch = batches[index];
    try {
      console.log(`Scoring batch ${index + 1}/${batches.length}...`);
      const scoredBatch = await scoreBatch(batch);
      results.push(...scoredBatch);
    } catch (error: any) {
      console.error(`Batch ${index + 1} failed:`, error?.message || error);
      results.push(...batch.map(a => ({ ...a, status: 'score_failed', recommendationScore: 0 })));
    }
  }

  return results;
}
