#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC_DIR = join(ROOT, 'public');
const MAX_BYTES = Number(process.env.IMAGE_MAX_BYTES || 250_000);
const MAX_SVG_BYTES = Number(process.env.IMAGE_MAX_SVG_BYTES || 400_000);
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const file = join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) files.push(...walk(file));
    if (stat.isFile() && EXTENSIONS.has(extname(file).toLowerCase())) files.push(file);
  }
  return files;
}

if (!existsSync(PUBLIC_DIR)) {
  throw new Error(`Missing public directory: ${PUBLIC_DIR}`);
}

const files = walk(PUBLIC_DIR);
const failures = files
  .map((file) => ({ file, size: statSync(file).size }))
  .filter((item) => {
    const limit = extname(item.file).toLowerCase() === '.svg' ? MAX_SVG_BYTES : MAX_BYTES;
    return item.size > limit;
  });

for (const item of files.map((file) => ({ file, size: statSync(file).size })).sort((a, b) => b.size - a.size)) {
  console.log(`${relative(ROOT, item.file)} ${item.size} bytes`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} image(s) exceed raster=${MAX_BYTES} or svg=${MAX_SVG_BYTES} byte limits:`);
  for (const item of failures) {
    console.error(`- ${relative(ROOT, item.file)} ${item.size} bytes`);
  }
  process.exit(1);
}

console.log(`\nimage audit passed: ${files.length} image(s), raster max ${MAX_BYTES} bytes, svg max ${MAX_SVG_BYTES} bytes`);
