import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { builtRouteExists } from './built-route-exists.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const editorialRoute = /^\/(guide|story|note|reflection|tool)\/[^/]+\/$/;
const volumeContracts = [
  { label: 'Work', slug: 'work', statement: 'Building AI Systems for Content Marketing' },
  { label: 'Community', slug: 'community', statement: 'Building AI Systems for Freelancers' },
  { label: 'Life', slug: 'life', statement: 'Battling Blood Cancer & Chronic Diseases' },
  { label: 'Faith', slug: 'faith', statement: 'Believing God & Making Sense of Life' },
];

async function filesUnder(directory, suffix) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await filesUnder(full, suffix));
    if (entry.isFile() && entry.name.endsWith(suffix)) found.push(full);
  }
  return found;
}

function routeFor(file) {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

const routeExists = (route) => builtRouteExists(dist, route);
const hasCloseBookLink = (html) => /<a\b(?=[^>]*\bhref="\/")[^>]*>\s*Close the book\s*<\/a>/i.test(html);

async function checkInternalLinks(route, html, canonical) {
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/.test(href)) continue;
    let url;
    try { url = new URL(href, canonical); } catch { continue; }
    if (url.origin !== 'https://writingsbylala.com') continue;
    if (!await routeExists(url.pathname)) failures.push(`${route}: broken internal link ${url.pathname}`);
  }
}

const htmlFiles = await filesUnder(dist, '.html');
const failures = [];
let editorialCount = 0;
const editorialRoutes = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  if (!html.includes('data-wbl-analytics="v1"')) failures.push(`${route}: analytics event contract missing`);
  if (!editorialRoute.test(route)) continue;
  editorialCount += 1;
  editorialRoutes.push(route);
  const canonical = `https://writingsbylala.com${route}`;
  const required = [
    `rel="canonical" href="${canonical}"`,
    'property="og:type" content="article"',
    'name="twitter:card"',
    '"@type":"Article"',
    '"@type":"BreadcrumbList"',
    '"name":"Lala Dimalanta"',
    '"name":"Writings by Lala"',
    '"datePublished"',
    '"dateModified"',
    '"articleSection"',
  ];
  for (const marker of required) if (!html.includes(marker)) failures.push(`${route}: missing ${marker}`);
  if (!hasCloseBookLink(html)) failures.push(`${route}: Close the book is not a homepage link`);
  if (/name="robots"[^>]+(?:noindex|nosnippet)/i.test(html)) failures.push(`${route}: crawl or snippet eligibility blocked`);
  await checkInternalLinks(route, html, canonical);
}

const homeHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!homeHtml.includes('data-book-home')) failures.push('/: interactive book homepage marker missing');
const homeVolumeLinks = [...homeHtml.matchAll(/data-volume-link="([^"]+)"/g)].map((match) => match[1]);
const expectedVolumeLinks = volumeContracts.map(({ slug }) => slug);
if (JSON.stringify(homeVolumeLinks) !== JSON.stringify(expectedVolumeLinks)) {
  failures.push(`/: expected bookmark order ${expectedVolumeLinks.join(', ')}, found ${homeVolumeLinks.join(', ') || 'none'}`);
}
const coverTitleLinks = [...homeHtml.matchAll(/data-cover-volume-link="([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(coverTitleLinks) !== JSON.stringify(expectedVolumeLinks)) {
  failures.push(`/: expected cover title order ${expectedVolumeLinks.join(', ')}, found ${coverTitleLinks.join(', ') || 'none'}`);
}
for (const volume of volumeContracts) {
  const coverTitlePattern = new RegExp(
    `<a[^>]+href="/${volume.slug}/"[^>]+data-cover-volume-link="${volume.slug}"[^>]*>[\\s\\S]*?${volume.statement.replaceAll('&', '&amp;')}[\\s\\S]*?\\(${volume.label}\\)[\\s\\S]*?</a>`,
  );
  if (!coverTitlePattern.test(homeHtml)) failures.push(`/: ${volume.label} cover title is missing or not linked`);
}
await checkInternalLinks('/', homeHtml, 'https://writingsbylala.com/');

const volumeMemberships = new Map();
for (const volume of volumeContracts) {
  const route = `/${volume.slug}/`;
  if (!await routeExists(route)) {
    failures.push(`${route}: volume route missing`);
    continue;
  }
  const html = await readFile(path.join(dist, volume.slug, 'index.html'), 'utf8');
  if (!html.includes(`data-volume-page="${volume.slug}"`)) failures.push(`${route}: volume page marker missing`);
  const entryCount = Number(html.match(/data-volume-entry-count="(\d+)"/)?.[1] ?? 0);
  if (entryCount < 1) failures.push(`${route}: volume has no matched writings`);
  const escapedStatement = volume.statement.replaceAll('&', '&amp;');
  if (!html.includes(escapedStatement)) failures.push(`${route}: exact volume statement missing`);
  if (!html.includes(`>${volume.label}<`)) failures.push(`${route}: volume label missing`);
  if (!hasCloseBookLink(html)) failures.push(`${route}: Close the book is not a homepage link`);
  if (/<span\b[^>]*>\s*Close the book\s*<\/span>/i.test(html)) failures.push(`${route}: Close the book is still plain text`);
  if (/\b(?:coming soon|tbd)\b/i.test(html)) failures.push(`${route}: public planning language present`);
  const volumeEntries = [...html.matchAll(/data-volume-entry="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(volumeEntries).size !== volumeEntries.length) failures.push(`${route}: contains a duplicate contents entry`);
  for (const entryRoute of volumeEntries) {
    const memberships = volumeMemberships.get(entryRoute) ?? [];
    memberships.push(volume.slug);
    volumeMemberships.set(entryRoute, memberships);
  }
  await checkInternalLinks(route, html, `https://writingsbylala.com${route}`);
}
for (const route of editorialRoutes) {
  const memberships = volumeMemberships.get(route) ?? [];
  if (memberships.length !== 1) {
    failures.push(`${route}: expected exactly one primary volume, found ${memberships.join(', ') || 'none'}`);
  }
}
for (const route of volumeMemberships.keys()) {
  if (!editorialRoutes.includes(route)) failures.push(`${route}: volume entry is not an editorial route`);
}
if (/\b(?:coming soon|tbd)\b/i.test(homeHtml)) failures.push('/: public planning language present');

const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8');
if (!/User-agent:\s*\*/i.test(robots) || !/Allow:\s*\//i.test(robots)) failures.push('robots.txt does not allow wildcard crawling');
if (!robots.includes('https://writingsbylala.com/sitemap.xml')) failures.push('robots.txt sitemap is wrong');
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapCount = sitemapUrls.length;
if (new Set(sitemapUrls).size !== sitemapCount) failures.push('sitemap contains duplicate URLs');
for (const route of editorialRoutes) {
  if (!sitemapUrls.includes(`https://writingsbylala.com${route}`)) failures.push(`${route}: editorial page missing from sitemap`);
}
for (const value of sitemapUrls) {
  let url;
  try { url = new URL(value); } catch { failures.push(`sitemap has invalid URL ${value}`); continue; }
  if (url.origin !== 'https://writingsbylala.com' || !await routeExists(url.pathname)) failures.push(`sitemap URL has no built route ${value}`);
}
if (editorialCount === 0) failures.push('no editorial pages found');

if (failures.length) throw new Error(`WBL technical eligibility failed:\n${failures.join('\n')}`);
console.log(`WBL technical eligibility PASS: ${editorialCount} editorial pages, ${htmlFiles.length} HTML pages, ${sitemapCount} sitemap URLs`);
