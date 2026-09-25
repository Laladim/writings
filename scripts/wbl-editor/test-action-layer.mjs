import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { EditorError, createActionLayer } from './action-layer.mjs';

const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readHmrConfig(editorMode) {
  const environment = { ...process.env };
  if (editorMode) environment.WBL_EDITOR_ENABLED = '1';
  else delete environment.WBL_EDITOR_ENABLED;
  const configUrl = `${pathToFileURL(path.join(editorRoot, 'astro.config.mjs')).href}?editor=${editorMode}`;
  const script = `const module = await import(${JSON.stringify(configUrl)}); const server = module.default.vite?.server; console.log(JSON.stringify({ hasServer: Boolean(server), hmr: server?.hmr ?? null }));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: editorRoot,
    env: environment,
    encoding: 'utf8',
  }));
}

const headlineStart = '{/* wbl-edit:start home.hero.headline */}';
const headlineEnd = '{/* wbl-edit:end home.hero.headline */}';
const introductionStart = '{/* wbl-edit:start home.hero.introduction */}';
const introductionEnd = '{/* wbl-edit:end home.hero.introduction */}';
const firstStart = '{/* wbl-edit:start home.browse.topic-label */}';
const firstEnd = '{/* wbl-edit:end home.browse.topic-label */}';
const secondStart = '{/* wbl-edit:start home.browse.type-label */}';
const secondEnd = '{/* wbl-edit:end home.browse.type-label */}';

const originalSource = [
  '<h1>',
  `${headlineStart}Notes from a life in progress.${headlineEnd}`,
  '</h1>',
  '<p>',
  `${introductionStart}Lover of Christ.`,
  `  Loves to write.${introductionEnd}`,
  '</p>',
  '<h2>',
  `${firstStart}Browse by topic${firstEnd}`,
  '</h2>',
  '<h2>',
  `${secondStart}Browse by type${secondEnd}`,
  '</h2>',
  '',
].join('\n');

function buildSession(overrides = {}) {
  const edits = overrides.edits ?? [
    {
      sequence: 1,
      edit_id: 'home.hero.headline',
      selector: '[data-wbl-edit-id="home\\.hero\\.headline"]',
      before_text: 'Notes from a life in progress.',
      after_text: 'Notes from a life in progress. TEST',
      first_changed_at: '2026-09-16T13:10:00.000Z',
      last_changed_at: '2026-09-16T13:10:00.000Z',
      mutation_count: 1,
      edit_class: 'site-interface',
    },
    {
      sequence: 2,
      edit_id: 'home.hero.introduction',
      selector: '[data-wbl-edit-id="home\\.hero\\.introduction"]',
      before_text: 'Lover of Christ. Loves to write.',
      after_text: 'Lover of Christ. Loves to write. TEST',
      first_changed_at: '2026-09-16T13:10:01.000Z',
      last_changed_at: '2026-09-16T13:10:01.000Z',
      mutation_count: 1,
      edit_class: 'site-interface',
    },
    {
      sequence: 3,
      edit_id: 'home.browse.topic-label',
      selector: '[data-wbl-edit-id="home\\.browse\\.topic-label"]',
      before_text: 'Browse by topic',
      after_text: 'Browse topics',
      first_changed_at: '2026-09-16T13:10:02.000Z',
      last_changed_at: '2026-09-16T13:10:02.000Z',
      mutation_count: 1,
      edit_class: 'site-interface',
    },
    {
      sequence: 4,
      edit_id: 'home.browse.type-label',
      selector: '[data-wbl-edit-id="home\\.browse\\.type-label"]',
      before_text: 'Browse by type',
      after_text: 'Browse formats',
      first_changed_at: '2026-09-16T13:10:03.000Z',
      last_changed_at: '2026-09-16T13:10:03.000Z',
      mutation_count: 1,
      edit_class: 'site-interface',
    },
  ];
  return {
    session_id: overrides.session_id ?? 'session-one',
    started_at: '2026-09-16T13:10:00.000Z',
    page_route: '/',
    viewport: { width: 1440, height: 900 },
    baseline_rendered_sha256: 'a'.repeat(64),
    events: edits.map((edit) => ({
      sequence: edit.sequence,
      at: edit.last_changed_at,
      edit_id: edit.edit_id,
      selector: edit.selector,
      before_text: edit.before_text,
      after_text: edit.after_text,
    })),
    edits,
    save_clicked_at: '2026-09-16T13:10:03.000Z',
  };
}

async function fixture() {
  const sandbox = await mkdtemp(path.join(tmpdir(), 'wbl-editor-test-'));
  const root = path.join(sandbox, 'site');
  const recordsRoot = path.join(sandbox, 'records');
  const recordRoot = path.join(recordsRoot, 'inline-editor-mvp');
  const sourcePath = path.join(root, 'src/pages/index.astro');
  const manifestPath = path.join(root, 'scripts/wbl-editor/editor-map.json');
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await mkdir(path.join(recordRoot, '03_visual_edit_capture/output'), { recursive: true });
  await mkdir(path.join(recordRoot, '04_agent_plan/output'), { recursive: true });
  await mkdir(path.join(recordRoot, '05_isolated_implementation/output'), { recursive: true });
  await mkdir(path.join(recordRoot, '07_site_handoff/output'), { recursive: true });
  await writeFile(sourcePath, originalSource);
  await writeFile(
    manifestPath,
    JSON.stringify({
      schema_version: 1,
      routes: {
        '/': {
          'home.hero.headline': {
            label: 'Homepage headline',
            selector: '[data-wbl-edit-id="home\\.hero\\.headline"]',
            source: 'src/pages/index.astro',
            start_marker: headlineStart,
            end_marker: headlineEnd,
            edit_class: 'site-interface',
            max_length: 120,
          },
          'home.hero.introduction': {
            label: 'Homepage introduction',
            selector: '[data-wbl-edit-id="home\\.hero\\.introduction"]',
            source: 'src/pages/index.astro',
            start_marker: introductionStart,
            end_marker: introductionEnd,
            edit_class: 'site-interface',
            max_length: 400,
          },
          'home.browse.topic-label': {
            label: 'Browse by topic',
            selector: '[data-wbl-edit-id="home\\.browse\\.topic-label"]',
            source: 'src/pages/index.astro',
            start_marker: firstStart,
            end_marker: firstEnd,
            edit_class: 'site-interface',
            max_length: 80,
          },
          'home.browse.type-label': {
            label: 'Browse by type',
            selector: '[data-wbl-edit-id="home\\.browse\\.type-label"]',
            source: 'src/pages/index.astro',
            start_marker: secondStart,
            end_marker: secondEnd,
            edit_class: 'site-interface',
            max_length: 80,
          },
        },
      },
    }),
  );
  await writeFile(
    path.join(recordRoot, 'change.json'),
    JSON.stringify({ schema_version: 1, change_id: 'inline-editor-mvp' }),
  );
  const layer = await createActionLayer({
    root,
    recordRoot,
    manifestPath,
    recordRootPrefix: recordsRoot,
    baselineCommit: 'a67528d6b4d0d6fbc311849ae6f6fe7f91c36b14',
  });
  return { layer, sourcePath, root, recordRoot, recordsRoot, manifestPath };
}

test('capture exposes accumulated state without writing source', async () => {
  const { layer, sourcePath } = await fixture();
  const before = await readFile(sourcePath, 'utf8');
  const session = buildSession();
  await layer.captureSession(session);
  assert.deepEqual(layer.inspectSession('session-one').edits, session.edits);
  assert.equal(await readFile(sourcePath, 'utf8'), before);
});

test('save applies actual homepage copy and labels, then duplicate save is idempotent', async () => {
  const { layer, sourcePath } = await fixture();
  const session = buildSession();
  const first = await layer.save(session);
  const afterFirst = await readFile(sourcePath, 'utf8');
  assert.match(afterFirst, /Notes from a life in progress\. TEST/);
  assert.match(afterFirst, /Lover of Christ\. Loves to write\. TEST/);
  assert.match(afterFirst, /Browse topics/);
  assert.match(afterFirst, /Browse formats/);
  assert.equal(first.changed_files.length, 1);
  assert.equal(first.idempotent, false);

  const duplicate = await layer.save(session);
  assert.equal(duplicate.request_hash, first.request_hash);
  assert.equal(duplicate.idempotent, true);
  assert.equal(await readFile(sourcePath, 'utf8'), afterFirst);
});

test('different Save sessions append immutable revisions and latest rollback preserves the prior Save', async () => {
  const current = await fixture();
  const first = await current.layer.save(buildSession());
  const secondEdit = {
    sequence: 1,
    edit_id: 'home.hero.headline',
    selector: '[data-wbl-edit-id="home\\.hero\\.headline"]',
    before_text: 'Notes from a life in progress. TEST',
    after_text: 'Notes from a life in progress. TEST AGAIN',
    first_changed_at: '2026-09-16T13:11:00.000Z',
    last_changed_at: '2026-09-16T13:11:00.000Z',
    mutation_count: 1,
    edit_class: 'site-interface',
  };
  const secondSession = buildSession({ session_id: 'session-two', edits: [secondEdit] });
  secondSession.started_at = '2026-09-16T13:11:00.000Z';
  secondSession.save_clicked_at = '2026-09-16T13:11:01.000Z';
  const second = await current.layer.save(secondSession);
  assert.notEqual(second.request_hash, first.request_hash);
  assert.match(await readFile(current.sourcePath, 'utf8'), /progress\. TEST AGAIN/);
  assert.equal((await current.layer.inspectReceipt('session-one')).request_hash, first.request_hash);
  assert.equal((await current.layer.inspectReceipt('session-two')).request_hash, second.request_hash);
  const requests = (await import('node:fs/promises')).readdir(
    path.join(current.recordRoot, '03_visual_edit_capture/output'),
  );
  assert.equal((await requests).filter((name) => /^change-request.*\.json$/.test(name)).length, 2);

  const duplicate = await current.layer.save(secondSession);
  assert.equal(duplicate.idempotent, true);
  const rollback = await current.layer.rollback(second.request_hash);
  assert.equal(rollback.status, 'rolled-back');
  assert.match(await readFile(current.sourcePath, 'utf8'), /progress\. TEST/);
  assert.doesNotMatch(await readFile(current.sourcePath, 'utf8'), /TEST AGAIN/);
});

test('unknown session inspection is pending and frozen session bytes cannot change', async () => {
  const current = await fixture();
  assert.deepEqual(await current.layer.inspectReceipt('not-saved'), { status: 'pending' });
  const first = buildSession();
  await current.layer.save(first);
  const changed = buildSession({ session_id: first.session_id });
  changed.edits[0].after_text = 'Different bytes';
  changed.events[0].after_text = 'Different bytes';
  await assert.rejects(current.layer.save(changed), (error) => {
    assert.equal(error.code, 'session-already-frozen');
    return true;
  });
});

test('unknown mapping and source drift fail without partial writes', async () => {
  const { layer, sourcePath } = await fixture();
  const unknown = buildSession({
    edits: [{
      sequence: 1,
      edit_id: 'unknown.element',
      selector: '[data-wbl-edit-id="unknown.element"]',
      before_text: 'Unknown',
      after_text: 'Changed',
      first_changed_at: '2026-09-16T13:10:00.000Z',
      last_changed_at: '2026-09-16T13:10:00.000Z',
      mutation_count: 1,
      edit_class: 'site-interface',
    }],
  });
  await assert.rejects(layer.save(unknown), (error) => {
    assert.equal(error instanceof EditorError, true);
    assert.equal(error.code, 'unknown-mapping');
    return true;
  });
  assert.equal(await readFile(sourcePath, 'utf8'), originalSource);

  const driftFixture = await fixture();
  await writeFile(
    driftFixture.sourcePath,
    originalSource.replace('Browse by topic', 'Drifted label'),
  );
  await assert.rejects(driftFixture.layer.save(buildSession()), (error) => {
    assert.equal(error instanceof EditorError, true);
    assert.equal(error.code, 'source-drift');
    return true;
  });
  assert.match(await readFile(driftFixture.sourcePath, 'utf8'), /Drifted label/);
  assert.doesNotMatch(await readFile(driftFixture.sourcePath, 'utf8'), /Browse formats/);
});

test('rollback restores the exact original values', async () => {
  const current = await fixture();
  const { layer, sourcePath } = current;
  const saved = await layer.save(buildSession());
  const rollback = await layer.rollback(saved.request_hash);
  assert.equal(rollback.status, 'rolled-back');
  assert.equal(await readFile(sourcePath, 'utf8'), originalSource);
  const reloadedLayer = await createActionLayer({
    root: current.root,
    recordRoot: current.recordRoot,
    manifestPath: current.manifestPath,
    recordRootPrefix: current.recordsRoot,
    baselineCommit: 'a67528d6b4d0d6fbc311849ae6f6fe7f91c36b14',
  });
  assert.equal((await reloadedLayer.inspectRollback(saved.request_hash)).status, 'rolled-back');
});

test('a saved receipt can be recovered by session ID after a page reload', async () => {
  const current = await fixture();
  const saved = await current.layer.save(buildSession());
  const reloadedLayer = await createActionLayer({
    root: current.root,
    recordRoot: current.recordRoot,
    manifestPath: current.manifestPath,
    recordRootPrefix: current.recordsRoot,
    baselineCommit: 'a67528d6b4d0d6fbc311849ae6f6fe7f91c36b14',
  });
  const recovered = await reloadedLayer.inspectReceipt('session-one');
  assert.equal(recovered.status, 'applied');
  assert.equal(recovered.request_hash, saved.request_hash);
});

test('the real Home, Library, and About mappings have unique source markers', async () => {
  const folder = path.dirname(fileURLToPath(import.meta.url));
  const siteRoot = path.resolve(folder, '../..');
  const manifest = JSON.parse(await readFile(path.join(folder, 'editor-map.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.routes).sort(), ['/', '/about/', '/library/']);
  for (const route of Object.values(manifest.routes)) {
    for (const mapping of Object.values(route)) {
      const source = await readFile(path.join(siteRoot, mapping.source), 'utf8');
      assert.equal(source.split(mapping.start_marker).length - 1, 1, mapping.start_marker);
      assert.equal(source.split(mapping.end_marker).length - 1, 1, mapping.end_marker);
      assert.match(mapping.selector, /^\[data-wbl-edit-id=/);
    }
  }
});

test('editor mode disables HMR without changing ordinary Astro development', async () => {
  assert.deepEqual(readHmrConfig(true), { hasServer: true, hmr: false });
  assert.deepEqual(readHmrConfig(false), { hasServer: false, hmr: null });
  const component = await readFile(path.join(editorRoot, 'src/components/WblEditor.astro'), 'utf8');
  assert.match(component, /editor\.dataset\.documentId = crypto\.randomUUID\(\)/);
  assert.match(component, /lastEditedId = editId/);
  assert.match(component, /Ready for next edit/);
  assert.match(component, /fieldState\.get\(focusId\)\?\.element\.focus/);
});
