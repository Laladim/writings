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

  if (!html.includes(tagUrl) || !html.includes(`gtag('config', '${GA_MEASUREMENT_ID}')`) && !html.includes('gtag(\'config\', gaMeasurementId)')) {
    failures.push(`${filePath}: Analytics tag or config call is missing`);
  }
}

if (failures.length > 0) {
  throw new Error(`Google Analytics ${mode} failed:\n${failures.join('\n')}`);
}

console.log(
  `Google Analytics ${mode} PASS: ${htmlFiles.length}/${htmlFiles.length} HTML files use ${GA_MEASUREMENT_ID}`
  + (mode === 'inject' ? `; injected ${injectedCount}` : ''),
);
