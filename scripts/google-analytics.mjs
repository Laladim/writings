import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GA_MEASUREMENT_ID } from '../site.config.mjs';

const mode = process.argv[2] ?? 'verify';
const allowedModes = new Set(['inject', 'verify']);

if (!allowedModes.has(mode)) {
  throw new Error(`Unknown mode: ${mode}. Use "inject" or "verify".`);
}

if (!/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) {
  throw new Error(`Invalid Google Analytics measurement ID: ${GA_MEASUREMENT_ID}`);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const outputRoot = path.join(repositoryRoot, 'dist');
const tagUrl = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
const anyTagPattern = /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/g;

const tagMarkup = `    <!-- WBL Google Analytics -->
    <script async src="${tagUrl}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    </script>`;

const eventMarker = 'data-wbl-analytics="v1"';
const eventMarkup = `    <!-- WBL privacy-safe interaction events -->
    <script ${eventMarker}>
      (() => {
        const allowed = new Set(['wbl_internal_cta','wbl_external_cta','wbl_resource_download','wbl_tool_start','wbl_tool_complete']);
        const safePath = (value) => {
          try { return new URL(value, location.href).pathname; } catch { return ''; }
        };
        window.wblTrack = (eventName, fields = {}) => {
          if (!allowed.has(eventName) || typeof window.gtag !== 'function') return;
          const safe = { page_path: location.pathname };
          for (const key of ['cta_location','destination_path','destination_domain','resource_name','tool_name']) {
            if (typeof fields[key] === 'string') safe[key] = fields[key].slice(0, 100);
          }
          window.gtag('event', eventName, { ...safe, transport_type: 'beacon' });
        };
        document.addEventListener('click', (event) => {
          const element = event.target.closest('[data-wbl-event],a[data-wbl-cta],a[data-cta],a[download]');
          if (!element) return;
          const explicit = element.getAttribute('data-wbl-event');
          if (explicit) {
            window.wblTrack(explicit, {
              cta_location: element.getAttribute('data-wbl-location') || '',
              resource_name: element.getAttribute('data-wbl-resource') || '',
              tool_name: element.getAttribute('data-wbl-tool') || '',
            });
            return;
          }
          if (!(element instanceof HTMLAnchorElement)) return;
          const destination = new URL(element.href, location.href);
          const isDownload = element.hasAttribute('download') || /\.(pdf|docx?|xlsx?|csv|zip)$/i.test(destination.pathname);
          const eventName = isDownload ? 'wbl_resource_download' : destination.origin === location.origin ? 'wbl_internal_cta' : 'wbl_external_cta';
          window.wblTrack(eventName, {
            cta_location: element.getAttribute('data-wbl-location') || element.getAttribute('data-cta') || '',
            destination_path: safePath(destination.href),
            destination_domain: destination.hostname,
            resource_name: isDownload ? destination.pathname.split('/').pop() : '',
          });
        });
      })();
    </script>`;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }

  return files;
}

const htmlFiles = await findHtmlFiles(outputRoot);
if (htmlFiles.length === 0) {
  throw new Error(`No HTML files found in ${outputRoot}. Run the Astro build first.`);
}

let injectedCount = 0;
const failures = [];

for (const filePath of htmlFiles) {
  let html = await readFile(filePath, 'utf8');
  const tagIds = [...html.matchAll(anyTagPattern)].map((match) => match[1]);

  if (tagIds.length > 1) {
    failures.push(`${filePath}: found ${tagIds.length} Google tags`);
    continue;
  }

  if (tagIds.length === 1 && tagIds[0] !== GA_MEASUREMENT_ID) {
    failures.push(`${filePath}: found unexpected measurement ID ${tagIds[0]}`);
    continue;
  }

  if (tagIds.length === 0 && mode === 'inject') {
    const headCloseIndex = html.search(/<\/head\s*>/i);
    if (headCloseIndex === -1) {
      failures.push(`${filePath}: missing </head>`);
      continue;
    }

    html = `${html.slice(0, headCloseIndex)}${tagMarkup}\n${html.slice(headCloseIndex)}`;
    await writeFile(filePath, html, 'utf8');
    injectedCount += 1;
  }

  if (!html.includes(eventMarker) && mode === 'inject') {
    const bodyCloseIndex = html.search(/<\/body\s*>/i);
    if (bodyCloseIndex === -1) {
      failures.push(`${filePath}: missing </body>`);
      continue;
    }
    html = `${html.slice(0, bodyCloseIndex)}${eventMarkup}\n${html.slice(bodyCloseIndex)}`;
    await writeFile(filePath, html, 'utf8');
  }

  if (!html.includes(tagUrl) || !html.includes(`gtag('config', '${GA_MEASUREMENT_ID}')`) && !html.includes('gtag(\'config\', gaMeasurementId)')) {
    failures.push(`${filePath}: Analytics tag or config call is missing`);
  }
  if (!html.includes(eventMarker)) {
    failures.push(`${filePath}: WBL privacy-safe event tracker is missing`);
  }
  for (const eventName of ['wbl_internal_cta','wbl_external_cta','wbl_resource_download','wbl_tool_start','wbl_tool_complete']) {
    if (!html.includes(eventName)) failures.push(`${filePath}: event contract missing ${eventName}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Google Analytics ${mode} failed:\n${failures.join('\n')}`);
}

console.log(
  `Google Analytics ${mode} PASS: ${htmlFiles.length}/${htmlFiles.length} HTML files use ${GA_MEASUREMENT_ID}`
  + (mode === 'inject' ? `; injected ${injectedCount}` : ''),
);
