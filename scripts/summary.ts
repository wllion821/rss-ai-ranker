import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SUMMARY_PROMPT = `你是科技博客编辑，请用中文写一段 60 字以内的今日科技速递摘要，概括以下文章的核心热点，语气简洁专业。

文章列表：
{{articles_json}}

请直接输出摘要文字，不要添加任何其他内容。`;

export async function generateDailySummary(scoredArticles: any[]): Promise<string> {
  try {
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return '';
    }

    if (scoredArticles.length === 0) {
      return '';
    }

    // 取前 10 篇文章
    const topArticles = scoredArticles
      .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
      .slice(0, 10);

    const articlesInput = topArticles.map(a => ({
      title: a.title,
      summary: a.summary || a.content || ''
    }));

    const prompt = SUMMARY_PROMPT.replace('{{articles_json}}', JSON.stringify(articlesInput, null, 2));

    // 添加 30 秒超时
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Summary generation timed out')), 30000)
    );

    const result = await Promise.race([
      model.generateContent(prompt, { maxOutputTokens: 200 }),
      timeoutPromise
    ]);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      console.error('Empty AI response for summary');
      return '';
    }

    const summary = content.trim();
    if (summary.length <= 100) {
      return summary;
    }

    const truncationIndex = Math.max(
      summary.lastIndexOf('。', 100),
      summary.lastIndexOf('，', 100),
      summary.lastIndexOf('.', 100),
      summary.lastIndexOf(',', 100)
    );

    if (truncationIndex > 0) {
      return summary.slice(0, truncationIndex + 1);
    }

    return summary.slice(0, 100) + '...';
  } catch (error) {
    console.error('Failed to generate daily summary:', error);
    return '';
  }
}