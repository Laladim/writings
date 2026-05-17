#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC_DIR = join(ROOT, 'public');
const MAX_WIDTH = Number(process.env.IMAGE_MAX_WIDTH || 1600);
const QUALITY = Number(process.env.IMAGE_QUALITY || 78);
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    if (name === 'favicon.png') continue;
    const file = join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) files.push(...walk(file));
    if (stat.isFile() && EXTENSIONS.has(extname(file).toLowerCase())) files.push(file);
  }
  return files;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function widthOf(file) {
  const output = run('sips', ['-g', 'pixelWidth', file]);
  const match = output.match(/pixelWidth:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function optimize(file) {
  const width = widthOf(file);
  const output = file.replace(/\.(jpe?g|png)$/i, '.webp');
  const target = output === file ? `${file}.tmp` : output;
  const args = ['-quiet'];
  if (width > MAX_WIDTH) args.push('-resize', String(MAX_WIDTH), '0');
  args.push('-q', String(QUALITY), file, '-o', target);
  run('cwebp', args);
  if (target !== output) run('mv', [target, output]);
  const before = statSync(file).size;
  const after = statSync(output).size;
  return { file: relative(ROOT, file), output: relative(ROOT, output), before, after };
}

if (!existsSync(PUBLIC_DIR)) {
  throw new Error(`Missing public directory: ${PUBLIC_DIR}`);
}

const results = walk(PUBLIC_DIR).map(optimize);
const before = results.reduce((sum, item) => sum + item.before, 0);
const after = results.reduce((sum, item) => sum + item.after, 0);

for (const item of results) {
  const saved = ((1 - item.after / item.before) * 100).toFixed(1);
  console.log(`${item.output} ${item.before} -> ${item.after} bytes saved=${saved}%`);
}

console.log(`optimized ${results.length} images, ${before} -> ${after} bytes`);
