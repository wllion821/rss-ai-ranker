import fs from 'fs/promises';
import path from 'path';
import Parser from 'rss-parser';
import pLimit from 'p-limit';

const parser = new Parser({
  timeout: 15000, // 15s timeout
});

interface Source {
  name: string;
  url: string;
  [key: string]: any;
}

async function checkSource(source: Source): Promise<{ source: Source; ok: boolean; error?: string }> {
  try {
    await parser.parseURL(source.url);
    return { source, ok: true };
  } catch (error: any) {
    return { source, ok: false, error: error.message || String(error) };
  }
}

async function main() {
  const sourcesPath = path.join(process.cwd(), 'data/sources.json');
  const cleanSourcesPath = path.join(process.cwd(), 'data/sources-clean.json');

  try {
    const rawData = await fs.readFile(sourcesPath, 'utf-8');
    const sources: Source[] = JSON.parse(rawData);
    console.log(`Checking ${sources.length} sources...`);

    const limit = pLimit(10);
    const results = await Promise.all(
      sources.map(source => limit(() => checkSource(source)))
    );

    const available: Source[] = [];
    const unavailable: Array<{ name: string; url: string; error: string }> = [];

    results.forEach(res => {
      if (res.ok) {
        available.push(res.source);
        console.log(`✅ ${res.source.name} (${res.source.url})`);
      } else {
        unavailable.push({
          name: res.source.name,
          url: res.source.url,
          error: res.error || 'Unknown error'
        });
        console.log(`❌ ${res.source.name} (${res.source.url}) - ${res.error}`);
      }
    });

    await fs.writeFile(cleanSourcesPath, JSON.stringify(available, null, 2));

    console.log('\n--- Summary ---');
    console.log(`Total: ${sources.length}`);
    console.log(`✅ Available: ${available.length}`);
    console.log(`❌ Unavailable: ${unavailable.length}`);
    console.log(`Cleaned sources saved to: ${cleanSourcesPath}`);

  } catch (error) {
    console.error('Failed to check sources:', error);
    process.exit(1);
  }
}

main();
