import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './action-layer.mjs';
import { createPublisher, visibleFormattingText } from './publisher.mjs';

const startMarker = '{/* wbl-edit:start home.hero.headline */}';
const endMarker = '{/* wbl-edit:end home.hero.headline */}';

test('live link text compares rendered wording instead of nested formatting syntax', () => {
  assert.equal(visibleFormattingText('**Autonomee**'), 'Autonomee');
  assert.equal(visibleFormattingText('<u>Autonomee</u>'), 'Autonomee');
});

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

async function fixture({ deployFails = false, siteVerifier = true } = {}) {
  const sandbox = await mkdtemp(path.join(tmpdir(), 'wbl-publisher-test-'));
  const root = path.join(sandbox, 'site');
  const recordRoot = path.join(sandbox, 'records', 'change-one');
  const recordsRoot = path.dirname(recordRoot);
  const sourcePath = path.join(root, 'src/pages/index.astro');
  const manifestPath = path.join(root, 'scripts/wbl-editor/editor-map.json');
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await mkdir(path.join(recordRoot, '05_isolated_implementation/output'), { recursive: true });
  await mkdir(path.join(recordRoot, '07_site_handoff/output'), { recursive: true });

  await writeFile(sourcePath, `<h1>${startMarker}Original headline${endMarker}</h1>\n`);
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schema_version: 1,
      routes: {
        '/': {
          'home.hero.headline': {
            selector: '[data-wbl-edit-id="home\\.hero\\.headline"]',
            source: 'src/pages/index.astro',
            start_marker: startMarker,
            end_marker: endMarker,
            edit_class: 'site-interface',
            max_length: 120,
          },
        },
      },
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify({
      name: 'publisher-fixture',
      type: 'module',
      scripts: {
        'editor:test': 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
        'analytics:verify': 'node -e "process.exit(0)"',
        ...(siteVerifier ? { 'site:verify': 'node -e "process.exit(0)"' } : {}),
      },
    }, null, 2)}\n`,
  );

  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'WBL Publisher Test');
  git(root, 'config', 'user.email', 'publisher-test@example.invalid');
  git(root, 'add', '--', '.');
  git(root, 'commit', '-m', 'fixture baseline');
  const baselineCommit = git(root, 'rev-parse', 'HEAD');

  const remote = path.join(sandbox, 'remote.git');
  execFileSync('git', ['clone', '--bare', root, remote], { encoding: 'utf8' });
  git(root, 'remote', 'add', 'origin', remote);

  const remoteWriter = path.join(sandbox, 'remote-writer');
  execFileSync('git', ['clone', remote, remoteWriter], { encoding: 'utf8' });
  git(remoteWriter, 'config', 'user.name', 'Concurrent Writer');
  git(remoteWriter, 'config', 'user.email', 'concurrent@example.invalid');
  await writeFile(path.join(remoteWriter, 'remote.txt'), 'concurrent remote change\n');
  git(remoteWriter, 'add', '--', 'remote.txt');
  git(remoteWriter, 'commit', '-m', 'concurrent remote change');
  git(remoteWriter, 'push', 'origin', 'main');

  const savedSource = `<h1>${startMarker}Saved headline${endMarker}</h1>\n`;
  await writeFile(sourcePath, savedSource);
  await writeFile(
    path.join(recordRoot, '05_isolated_implementation/output/implementation.json'),
    `${JSON.stringify({
      schema_version: 1,
      status: 'applied',
      request_hash: 'a'.repeat(64),
      applied_at: '2026-09-17T01:00:00.000Z',
      page_route: '/',
      changed_files: [{
        path: 'src/pages/index.astro',
        before_sha256: sha256(`<h1>${startMarker}Original headline${endMarker}</h1>\n`),
        after_sha256: sha256(savedSource),
      }],
      edits: [{ edit_id: 'home.hero.headline', after_text: 'Saved headline' }],
    }, null, 2)}\n`,
  );

  const deployCalls = [];
  const liveCalls = [];
  const publisher = await createPublisher({
    root,
    recordRoot,
    recordRootPrefix: recordsRoot,
    manifestPath,
    baselineCommit,
    repository: '',
    bootstrapPaths: [],
    deployVerifier: async (commit) => {
      deployCalls.push(commit);
      if (deployFails) throw new Error('simulated deployment failure');
      return { status: 'success', run_id: 1, run_url: 'https://example.invalid/run/1' };
    },
    liveVerifier: async (expectations) => {
      liveCalls.push(expectations);
      assert.equal(expectations[0].route, '/');
      assert.deepEqual(expectations[0].values, [{
        edit_id: 'home.hero.headline',
        text: 'Saved headline',
      }]);
      return {
        status: 'verified',
        checks: [{ route: '/', url: 'https://example.invalid/', result: 'pass' }],
        live_urls: ['https://example.invalid/'],
      };
    },
  });
  return {
    sandbox,
    root,
    remote,
    recordRoot,
    sourcePath,
    baselineCommit,
    publisher,
    deployCalls,
    liveCalls,
  };
}

test('Publish stages only receipt-bound source, rebases remote drift, pushes main, and records live proof', async () => {
  const current = await fixture();
  const ready = await current.publisher.status();
  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.paths, ['src/pages/index.astro']);

  const receipt = await current.publisher.publish({
    authorization: 'publish-button',
    page_route: '/',
    unsaved_count: 0,
  });
  assert.equal(receipt.status, 'published');
  assert.deepEqual(receipt.paths, ['src/pages/index.astro']);
  assert.deepEqual(receipt.file_evidence, [{
    path: 'src/pages/index.astro',
    sha256: sha256(await readFile(current.sourcePath)),
  }]);
  assert.equal(current.deployCalls.length, 1);
  assert.equal(current.liveCalls.length, 1);
  assert.equal(git(current.root, 'status', '--porcelain'), '');
  assert.equal(
    execFileSync('git', ['--git-dir', current.remote, 'show', 'main:remote.txt'], { encoding: 'utf8' }),
    'concurrent remote change\n',
  );
  assert.match(
    execFileSync('git', ['--git-dir', current.remote, 'show', 'main:src/pages/index.astro'], { encoding: 'utf8' }),
    /Saved headline/,
  );
  const completed = JSON.parse(await readFile(
    path.join(current.recordRoot, `07_site_handoff/output/publication.${receipt.publication_id}.json`),
    'utf8',
  ));
  assert.equal(completed.commit_sha, git(current.root, 'rev-parse', 'HEAD'));
  assert.equal((await current.publisher.status()).status, 'published');

  git(current.root, 'revert', '--no-edit', receipt.commit_sha);
  git(current.root, 'push', 'origin', 'HEAD:main');
  assert.match(
    execFileSync('git', ['--git-dir', current.remote, 'show', 'main:src/pages/index.astro'], { encoding: 'utf8' }),
    /Original headline/,
  );
  assert.equal(
    execFileSync('git', ['--git-dir', current.remote, 'show', 'main:remote.txt'], { encoding: 'utf8' }),
    'concurrent remote change\n',
  );
});

test('Publish rejects unsaved browser edits before Git mutation', async () => {
  const current = await fixture();
  const before = git(current.root, 'rev-parse', 'HEAD');
  await assert.rejects(
    current.publisher.publish({
      authorization: 'publish-button',
      page_route: '/',
      unsaved_count: 1,
    }),
    (error) => error.code === 'unsaved-edits',
  );
  assert.equal(git(current.root, 'rev-parse', 'HEAD'), before);
  assert.match(await readFile(current.sourcePath, 'utf8'), /Saved headline/);
});

test('Publish rejects unknown dirty paths instead of broad staging', async () => {
  const current = await fixture();
  await writeFile(path.join(current.root, 'unexpected.txt'), 'must not publish\n');
  await assert.rejects(
    current.publisher.authorizeCurrentState(),
    (error) => {
      assert.equal(error.code, 'unpublished-file-outside-allowlist');
      assert.match(error.message, /unexpected\.txt/);
      return true;
    },
  );
  assert.equal(git(current.root, 'diff', '--cached', '--name-only'), '');
});

test('A failed deployment remains retry-ready and never creates a Published receipt', async () => {
  const current = await fixture({ deployFails: true });
  await assert.rejects(
    current.publisher.publish({
      authorization: 'publish-button',
      page_route: '/',
      unsaved_count: 0,
    }),
    /simulated deployment failure/,
  );
  const retry = await current.publisher.status();
  assert.equal(retry.status, 'retry-ready');
  assert.equal(retry.phase, 'pushed');
  const files = await (await import('node:fs/promises')).readdir(
    path.join(current.recordRoot, '07_site_handoff/output'),
  );
  assert.equal(files.some((name) => /^publication\.[a-f0-9]{16}\.json$/.test(name)), false);
});

test('Publish supports the current site baseline when no separate site verifier is declared', async () => {
  const current = await fixture({ siteVerifier: false });
  const receipt = await current.publisher.publish({
    authorization: 'publish-button',
    page_route: '/',
    unsaved_count: 0,
  });
  assert.equal(receipt.status, 'published');
  assert.equal(receipt.checks.some((check) => check.name === 'site-owner'), false);
  assert.equal(receipt.checks.filter((check) => check.name === 'site-build').length, 2);
  assert.equal(receipt.checks.filter((check) => check.name === 'analytics').length, 2);
});
