import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getAllEntries, entryUrl } from '../lib/content';
import { TOPICS } from '../topics';

const SITE = 'https://writingsbylala.com';

const staticPaths = [
  '/',
  '/library/',
  '/about/',
  '/swahg/',
  '/ministry/',
  '/swahg-blueprint/',
  '/swahg-curriculum/',
  '/swahg-jobs/',
  '/swahg-resume-builder/',
  '/swahg-start/',
];

const swahgLessonPaths = readdirSync(join(process.cwd(), 'public'))
  .filter((name) => name.startsWith('swahg-lesson-'))
  .sort()
  .map((name) => `/${name}/`);

function absolute(path: string) {
  return new URL(path, SITE).toString();
}

function urlNode(loc: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
}

export async function GET() {
  const entries = await getAllEntries();
  const urls = [
    ...staticPaths.map((path) => urlNode(absolute(path))),
    ...swahgLessonPaths.map((path) => urlNode(absolute(path))),
    ...TOPICS.map((topic) => urlNode(absolute(`/topics/${topic.slug}/`))),
    ...entries.map((entry) => urlNode(entryUrl(entry, SITE), entry.data.date)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
