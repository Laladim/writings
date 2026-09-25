import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './action-layer.mjs';
import { createArticleLayer } from './article-layer.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbl-article-layer-'));
  const record = path.join(root, 'record');
  const source = path.join(root, 'src/content/guides/sample-post.md');
  await mkdir(path.dirname(source), { recursive: true });
  for (const stage of ['03_visual_edit_capture', '05_isolated_implementation']) {
    await mkdir(path.join(record, stage, 'output'), { recursive: true });
  }
  const markdown = '---\ntitle: "Sample"\ntype: "guide"\ntopics: ["automation"]\ndate: 2026-09-25\ndescription: "Sample post"\n---\n\nRead this useful guide.\n';
  await writeFile(source, markdown);
  return { root, record, source, markdown };
}

test('article layer applies link, bold, and underline without changing visible wording', async () => {
  const f = await fixture();
  try {
    const layer = await createArticleLayer({ root: f.root, recordRoot: f.record, baselineCommit: 'abc123' });
    const current = await layer.load('/guide/sample-post/');
    const after = 'Read this <u>useful</u> [**guide**](https://example.com).';
    const receipt = await layer.save({
      authorization: 'save-button', page_route: current.route, source: current.source.replace(/\.md$/, ''),
      before_source_sha256: current.source_sha256, before_body: current.body, after_body: after,
    });
    assert.equal(receipt.status, 'applied');
    assert.match(await readFile(f.source, 'utf8'), /Read this <u>useful<\/u> \[\*\*guide\*\*\]\(https:\/\/example\.com\)\./);
    assert.deepEqual(receipt.live_expectations[0].fragments.map((item) => item.kind).sort(), ['bold', 'link', 'underline']);
    assert.equal(receipt.live_expectations[0].fragments.find((item) => item.kind === 'link').text, 'guide');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('article layer rejects wording changes and source drift', async () => {
  const f = await fixture();
  try {
    const layer = await createArticleLayer({ root: f.root, recordRoot: f.record, baselineCommit: 'abc123' });
    const current = await layer.load('/guide/sample-post/');
    await assert.rejects(() => layer.save({
      authorization: 'save-button', page_route: current.route, source: current.source,
      before_source_sha256: current.source_sha256, before_body: current.body, after_body: 'Different wording.',
    }), /WBL Editorial/);
    await writeFile(f.source, `${f.markdown}\nExternal change.\n`);
    await assert.rejects(() => layer.save({
      authorization: 'save-button', page_route: current.route, source: current.source,
      before_source_sha256: current.source_sha256, before_body: current.body, after_body: '**Read** this useful guide.',
    }), /changed/);
    assert.notEqual(sha256(await readFile(f.source, 'utf8')), current.source_sha256);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('article layer rejects a source identifier that does not match the route', async () => {
  const f = await fixture();
  try {
    const layer = await createArticleLayer({ root: f.root, recordRoot: f.record, baselineCommit: 'abc123' });
    const current = await layer.load('/guide/sample-post/');
    await assert.rejects(() => layer.save({
      authorization: 'save-button', page_route: current.route, source: 'src/content/guides/different-post',
      before_source_sha256: current.source_sha256, before_body: current.body, after_body: '**Read** this useful guide.',
    }), /does not match its route/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
