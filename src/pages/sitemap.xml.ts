import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { getAllEntries, entryUrl } from '../lib/content';
import { TOPICS } from '../topics';

const SITE = 'https://writingsbylala.com';

const staticPaths = [
  '/',
  '/library/',
  '/about/',
];

const publicRoot = join(process.cwd(), 'public');

function htmlShouldBeIndexed(filePath: string) {
  const html = readFileSync(filePath, 'utf8');
  if (/<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) return false;
  if (/<meta\s+http-equiv=["']refresh["']/i.test(html)) return false;
  return true;
}

function routeFromPublicHtml(filePath: string) {
  const rel = relative(publicRoot, filePath).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function discoverPublicHtmlPaths(dir: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...discoverPublicHtmlPaths(fullPath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    if (!htmlShouldBeIndexed(fullPath)) continue;
    paths.push(routeFromPublicHtml(fullPath));
  }
  return paths;
}

const publicHtmlPaths = statSync(publicRoot).isDirectory()
  ? discoverPublicHtmlPaths(publicRoot).sort()
  : [];

function absolute(path: string) {
  return new URL(path, SITE).toString();
}

function urlNode(loc: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
}

export async function GET() {
  const entries = await getAllEntries();
  const locs = new Map<string, string | undefined>();
  for (const path of [...staticPaths, ...publicHtmlPaths]) {
    locs.set(absolute(path), undefined);
  }
  for (const topic of TOPICS) {
    locs.set(absolute(`/topics/${topic.slug}/`), undefined);
  }
  for (const entry of entries) {
    locs.set(entryUrl(entry, SITE), entry.data.date.toISOString().slice(0, 10));
  }

  const urls = [...locs.entries()].map(([loc, lastmod]) =>
    urlNode(loc, lastmod ? new Date(`${lastmod}T00:00:00.000Z`) : undefined)
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
