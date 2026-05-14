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
  '/swahg-lesson-where-to-start/',
  '/swahg-lesson-choosing-your-computer/',
  '/swahg-lesson-online-jobs-account/',
  '/swahg-lesson-email-address-expert-secrets/',
  '/swahg-lesson-browser-expert-secrets/',
  '/swahg-lesson-storage-expert-secrets/',
  '/swahg-lesson-trello-love/',
  '/swahg-lesson-online-presence/',
  '/swahg-lesson-personal-branding/',
  '/swahg-lesson-employee-to-freelancer/',
  '/swahg-lesson-freelancer-or-va/',
  '/swahg-lesson-getting-hired-fast/',
  '/swahg-lesson-common-mistakes/',
  '/swahg-lesson-10-secret-skills/',
  '/swahg-lesson-creativeartistic-skills/',
  '/swahg-lesson-technical-skills/',
  '/swahg-lesson-specialized-business-skills/',
  '/swahg-lesson-freelancing-platforms/',
  '/swahg-lesson-freelancing-journey-introduction/',
  '/swahg-lesson-freelancing-journey-lesson-1/',
  '/swahg-lesson-freelancing-journey-lesson-2/',
  '/swahg-lesson-freelancing-journey-lesson-3/',
  '/swahg-lesson-freelancing-journey-lesson-4/',
  '/swahg-lesson-freelancing-journey-lesson-5/',
  '/swahg-lesson-freelancing-journey-lesson-6/',
  '/swahg-lesson-choosing-my-client/',
  '/swahg-lesson-english-101/',
  '/swahg-lesson-fb-chatbot-training/',
  '/swahg-lesson-fb-mobile-management/',
  '/swahg-lesson-smm-handbook/',
  '/swahg-lesson-smm-core-strategies/',
  '/swahg-lesson-instagram-strategy/',
  '/swahg-lesson-pinterest-marketing/',
  '/swahg-lesson-youtube-best-practices/',
  '/swahg-lesson-handbook/',
  '/swahg-lesson-bonus-tips-1/',
  '/swahg-lesson-bonus-tips-2/',
  '/swahg-lesson-bonus-tips-3/',
];

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
