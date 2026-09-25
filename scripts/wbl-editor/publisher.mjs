import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { EditorError, sha256 } from './action-layer.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_REPOSITORY = 'Laladim/writings';
const DEFAULT_LIVE_ORIGIN = 'https://writingsbylala.com';
const DEFAULT_WORKFLOW = 'deploy.yml';
const DEFAULT_RECORD_PREFIX =
  '/Users/laladimalanta/Life-Dashboard/cowork-outputs/wbl-interface-editor/changes';
const IGNORED_WORKTREE_PREFIXES = ['node_modules/', 'dist/', '.astro/'];

export const EDITOR_BOOTSTRAP_PATHS = [
  'astro.config.mjs',
  'package.json',
  'scripts/wbl-editor/action-layer.mjs',
  'scripts/wbl-editor/editor-map.json',
  'scripts/wbl-editor/publisher.mjs',
  'scripts/wbl-editor/start.mjs',
  'scripts/wbl-editor/test-action-layer.mjs',
  'scripts/wbl-editor/test-publisher.mjs',
  'scripts/wbl-editor/vite-plugin.mjs',
  'src/components/WblEditor.astro',
  'src/layouts/Base.astro',
  'src/pages/about.astro',
  'src/pages/index.astro',
  'src/pages/library.astro',
];

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function markerText(content, mapping) {
  const startCount = content.split(mapping.start_marker).length - 1;
  const endCount = content.split(mapping.end_marker).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new EditorError(
      'ambiguous-marker',
      `Expected one marker pair for ${mapping.edit_id}`,
      409,
    );
  }
  const start = content.indexOf(mapping.start_marker) + mapping.start_marker.length;
  const end = content.indexOf(mapping.end_marker, start);
  if (end < start) {
    throw new EditorError('ambiguous-marker', `Marker order is invalid for ${mapping.edit_id}`, 409);
  }
  return normalizeText(decodeEntities(content.slice(start, end)));
}

function htmlText(html) {
  return normalizeText(
    decodeEntities(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, filePath);
}

function parseRemote(remote) {
  const match = remote.trim().match(/(?:github\.com[/:])([^/]+\/[^/]+?)(?:\.git)?$/);
  return match?.[1] ?? '';
}

function isIgnoredWorktreePath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return IGNORED_WORKTREE_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function defaultRunner(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }).then(
    ({ stdout = '', stderr = '' }) => ({ code: 0, stdout, stderr }),
    (error) => {
      const result = {
        code: Number.isInteger(error?.code) ? error.code : 1,
        stdout: error?.stdout ?? '',
        stderr: error?.stderr ?? error?.message ?? '',
      };
      if (options.allowFailure) return result;
      throw new EditorError(
        'command-failed',
        `${command} ${args.join(' ')} failed: ${normalizeText(result.stderr || result.stdout)}`,
        409,
        { command, args, ...result },
      );
    },
  );
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function receiptFiles(folder, expression) {
  let names = [];
  try {
    names = await readdir(folder);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const values = [];
  for (const name of names.sort()) {
    if (!expression.test(name)) continue;
    values.push(await loadJson(path.join(folder, name)));
  }
  return values;
}

export async function createPublisher({
  root,
  recordRoot,
  manifestPath,
  baselineCommit,
  recordRootPrefix = DEFAULT_RECORD_PREFIX,
  repository = DEFAULT_REPOSITORY,
  liveOrigin = DEFAULT_LIVE_ORIGIN,
  workflow = DEFAULT_WORKFLOW,
  bootstrapPaths = EDITOR_BOOTSTRAP_PATHS,
  runner = defaultRunner,
  deployVerifier,
  liveVerifier,
  now = () => new Date().toISOString(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  deployTimeoutMs = 6 * 60 * 1000,
  liveTimeoutMs = 90 * 1000,
}) {
  const resolvedRoot = await realpath(root);
  const resolvedRecord = await realpath(recordRoot);
  const resolvedManifest = await realpath(manifestPath);
  if (recordRootPrefix) {
    const prefix = await realpath(recordRootPrefix);
    if (resolvedRecord !== prefix && !resolvedRecord.startsWith(`${prefix}${path.sep}`)) {
      throw new EditorError('path-escape', 'Publication record resolves outside its allowed root', 403);
    }
  }
  if (!resolvedManifest.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new EditorError('path-escape', 'Editor manifest resolves outside the Site worktree', 403);
  }
  const manifest = await loadJson(resolvedManifest);
  if (manifest.schema_version !== 1 || !manifest.routes) {
    throw new EditorError('invalid-manifest', 'Editor map must use schema version 1');
  }

  const outputRoot = path.join(resolvedRecord, '07_site_handoff/output');
  const pendingPath = path.join(outputRoot, 'publication-pending.json');
  const bootstrapSet = new Set(bootstrapPaths);
  const sourceMappings = new Map();
  for (const [route, routeMap] of Object.entries(manifest.routes)) {
    for (const [editId, entry] of Object.entries(routeMap)) {
      const mapping = { edit_id: editId, route, ...entry };
      if (!sourceMappings.has(entry.source)) sourceMappings.set(entry.source, []);
      sourceMappings.get(entry.source).push(mapping);
    }
  }
  let inFlight = null;

  async function command(commandName, args, options = {}) {
    return runner(commandName, args, { cwd: resolvedRoot, ...options });
  }

  async function git(args, options = {}) {
    return command('git', args, options);
  }

  async function currentCommit() {
    return (await git(['rev-parse', 'HEAD'])).stdout.trim();
  }

  async function validateRepository() {
    const remote = (await git(['remote', 'get-url', 'origin'])).stdout.trim();
    if (parseRemote(remote) !== repository) {
      throw new EditorError(
        'wrong-repository',
        `Publish is fixed to ${repository}; this worktree points to ${remote}`,
        409,
      );
    }
    const gitDir = (await git(['rev-parse', '--git-dir'])).stdout.trim();
    for (const operation of ['rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD']) {
      const candidate = path.resolve(resolvedRoot, gitDir, operation);
      if (await exists(candidate)) {
        throw new EditorError('git-operation-active', `Git operation ${operation} must be resolved first`, 409);
      }
    }
    return remote;
  }

  async function changedPaths() {
    const result = await git([
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      '.',
      ':(exclude)node_modules',
      ':(exclude)dist',
      ':(exclude).astro',
    ]);
    const files = [];
    for (const line of result.stdout.split('\n')) {
      if (!line) continue;
      const statusCode = line.slice(0, 2);
      const value = line.slice(3).trim().replace(/^"|"$/g, '');
      if (!value || isIgnoredWorktreePath(value)) continue;
      if (statusCode.includes('R') || statusCode.includes('C') || value.includes(' -> ')) {
        throw new EditorError('unsupported-git-change', `Rename or copy is not publishable: ${value}`, 409);
      }
      files.push(value);
    }
    return [...new Set(files)].sort();
  }

  async function appliedReceipts() {
    const implementations = await receiptFiles(
      path.join(resolvedRecord, '05_isolated_implementation/output'),
      /^implementation(?:\.[a-f0-9]{12})?\.json$/,
    );
    const rollbacks = await receiptFiles(
      outputRoot,
      /^rollback\.[a-f0-9]{12}\.json$/,
    );
    const rolledBack = new Set(
      rollbacks.filter((receipt) => receipt.status === 'rolled-back').map((receipt) => receipt.request_hash),
    );
    return implementations
      .filter((receipt) => receipt.status === 'applied' && !rolledBack.has(receipt.request_hash))
      .sort((left, right) => String(left.applied_at).localeCompare(String(right.applied_at)));
  }

  async function sourceAuthorization(filePath, receipts) {
    const bytes = await readFile(path.join(resolvedRoot, filePath));
    const digest = sha256(bytes);
    const matches = receipts.filter((receipt) =>
      receipt.changed_files?.some((changed) => changed.path === filePath && changed.after_sha256 === digest),
    );
    return { digest, receipt: matches.at(-1) ?? null };
  }

  async function deriveExpectations(paths) {
    const expectations = [];
    for (const filePath of paths) {
      const mappings = sourceMappings.get(filePath) ?? [];
      if (!mappings.length) continue;
      const content = await readFile(path.join(resolvedRoot, filePath), 'utf8');
      const byRoute = new Map();
      for (const mapping of mappings) {
        if (!byRoute.has(mapping.route)) byRoute.set(mapping.route, []);
        byRoute.get(mapping.route).push({
          edit_id: mapping.edit_id,
          text: markerText(content, mapping),
        });
      }
      for (const [route, values] of byRoute) expectations.push({ route, values });
    }
    expectations.sort((left, right) => left.route.localeCompare(right.route));
    return expectations;
  }

  async function authorizeCurrentState() {
    await validateRepository();
    const paths = await changedPaths();
    if (!paths.length) {
      throw new EditorError('nothing-to-publish', 'No saved local changes are waiting to publish', 409);
    }
    const head = await currentCommit();
    const bootstrapActive = head === baselineCommit;
    const receipts = await appliedReceipts();
    const authorized = [];
    const sourceEvidence = [];
    const rejected = [];
    for (const filePath of paths) {
      if (sourceMappings.has(filePath)) {
        const evidence = await sourceAuthorization(filePath, receipts);
        if (evidence.receipt) {
          authorized.push(filePath);
          sourceEvidence.push({
            path: filePath,
            sha256: evidence.digest,
            request_hash: evidence.receipt.request_hash,
          });
          continue;
        }
        if (bootstrapActive && bootstrapSet.has(filePath)) {
          authorized.push(filePath);
          sourceEvidence.push({ path: filePath, sha256: evidence.digest, bootstrap: true });
          continue;
        }
        rejected.push(`${filePath} (no current immutable Save receipt)`);
        continue;
      }
      if (bootstrapActive && bootstrapSet.has(filePath)) {
        authorized.push(filePath);
      } else {
        rejected.push(filePath);
      }
    }
    if (rejected.length) {
      throw new EditorError(
        'unpublished-file-outside-allowlist',
        `Publish stopped because these changes are not authorized: ${rejected.join(', ')}`,
        409,
        { rejected },
      );
    }
    const fileEvidence = [];
    for (const filePath of authorized.slice().sort()) {
      fileEvidence.push({
        path: filePath,
        sha256: sha256(await readFile(path.join(resolvedRoot, filePath))),
      });
    }
    const expectations = await deriveExpectations(authorized);
    if (!expectations.length) {
      throw new EditorError('missing-live-expectation', 'No fixed live text expectation could be derived', 409);
    }
    const plan = {
      schema_version: 1,
      baseline_commit: baselineCommit,
      head,
      repository,
      remote: 'origin',
      branch: 'main',
      paths: authorized.sort(),
      file_evidence: fileEvidence,
      source_evidence: sourceEvidence.sort((left, right) => left.path.localeCompare(right.path)),
      expectations,
    };
    return { ...plan, publication_id: sha256(stableJson(plan)).slice(0, 16) };
  }

  async function completedReceipt(publicationId) {
    const filePath = path.join(outputRoot, `publication.${publicationId}.json`);
    if (!(await exists(filePath))) return null;
    return loadJson(filePath);
  }

  async function latestCompletedReceipt() {
    const receipts = await receiptFiles(outputRoot, /^publication\.[a-f0-9]{16}\.json$/);
    return receipts
      .filter((receipt) => receipt.status === 'published')
      .sort((left, right) => String(left.published_at).localeCompare(String(right.published_at)))
      .at(-1) ?? null;
  }

  async function readPending() {
    if (!(await exists(pendingPath))) return null;
    return loadJson(pendingPath);
  }

  async function status() {
    const pending = await readPending();
    if (pending) {
      return {
        status: 'retry-ready',
        ready: true,
        publication_id: pending.publication_id,
        phase: pending.phase,
        paths: pending.paths,
        message: pending.last_error
          ? 'The previous Publish stopped safely. Click Publish to retry the same saved state.'
          : 'A saved publication is ready to continue.',
      };
    }
    try {
      const plan = await authorizeCurrentState();
      return {
        status: 'ready',
        ready: true,
        publication_id: plan.publication_id,
        paths: plan.paths,
        message: 'Your saved site update is ready to publish.',
      };
    } catch (error) {
      if (error instanceof EditorError && error.code === 'nothing-to-publish') {
        const completed = await latestCompletedReceipt();
        return completed
          ? {
              status: 'published',
              ready: false,
              commit_sha: completed.commit_sha,
              live_urls: completed.live_urls,
              message: 'The latest saved version is live.',
            }
          : { status: 'idle', ready: false, message: 'Save an edit before publishing.' };
      }
      throw error;
    }
  }

  async function runChecks({ afterRebase = false } = {}) {
    const checks = [];
    const packageJson = await loadJson(path.join(resolvedRoot, 'package.json'));
    const hasSiteVerifier = typeof packageJson.scripts?.['site:verify'] === 'string';
    const definitions = [
      ['editor-tests', 'npm', ['run', 'editor:test']],
      ['site-build', 'npm', ['run', 'build']],
      ['analytics', 'npm', ['run', 'analytics:verify']],
      ...(afterRebase && hasSiteVerifier ? [['site-owner', 'npm', ['run', 'site:verify']]] : []),
    ];
    for (const [name, commandName, args] of definitions) {
      const result = await command(commandName, args);
      checks.push({ name, result: 'pass', output_sha256: sha256(`${result.stdout}${result.stderr}`) });
    }
    return checks;
  }

  async function stageAndCommit(plan) {
    const changed = await changedPaths();
    if (stableJson(changed) !== stableJson(plan.paths.slice().sort())) {
      throw new EditorError(
        'publication-path-drift',
        'The worktree path set changed after Publish authorization',
        409,
        { expected: plan.paths, changed },
      );
    }
    for (const expected of plan.file_evidence) {
      const actual = sha256(await readFile(path.join(resolvedRoot, expected.path)));
      if (actual !== expected.sha256) {
        throw new EditorError(
          'publication-byte-drift',
          `The saved bytes changed after Publish authorization: ${expected.path}`,
          409,
          { path: expected.path, expected: expected.sha256, actual },
        );
      }
    }
    await git(['add', '--', ...plan.paths]);
    const staged = (await git(['diff', '--cached', '--name-only'])).stdout
      .split('\n')
      .filter(Boolean)
      .sort();
    if (stableJson(staged) !== stableJson(plan.paths.slice().sort())) {
      throw new EditorError(
        'staged-path-mismatch',
        'The staged Git paths do not equal the authorized publication paths',
        409,
        { expected: plan.paths, staged },
      );
    }
    await git(['diff', '--cached', '--check']);
    await git([
      'commit',
      '-m',
      'publish: WBL editor saved changes',
      '-m',
      `WBL-Editor-Publication: ${plan.publication_id}`,
    ]);
    return currentCommit();
  }

  async function fetchAndRebase() {
    await git(['fetch', 'origin', 'main']);
    const rebase = await git(['rebase', 'origin/main'], { allowFailure: true });
    if (rebase.code !== 0) {
      await git(['rebase', '--abort'], { allowFailure: true });
      throw new EditorError(
        'remote-conflict',
        'Publish stopped because current main conflicts with the saved patch. No force push was attempted.',
        409,
        { stdout: rebase.stdout, stderr: rebase.stderr },
      );
    }
    return currentCommit();
  }

  async function pushWithOneRaceRetry(pending) {
    let push = await git(['push', 'origin', 'HEAD:main'], { allowFailure: true });
    if (push.code === 0) return { commit: await currentCommit(), retried: false };
    const failure = `${push.stdout}\n${push.stderr}`;
    if (!/(rejected|non-fast-forward|fetch first|failed to push)/i.test(failure)) {
      throw new EditorError('push-failed', `Git push failed: ${normalizeText(failure)}`, 409);
    }
    pending.phase = 'push-race-retry';
    pending.last_error = normalizeText(failure);
    await atomicJson(pendingPath, pending);
    const commit = await fetchAndRebase();
    pending.commit_sha = commit;
    pending.checks.push(...await runChecks({ afterRebase: true }));
    await atomicJson(pendingPath, pending);
    push = await git(['push', 'origin', 'HEAD:main'], { allowFailure: true });
    if (push.code !== 0) {
      throw new EditorError(
        'push-race-repeated',
        'Publish stopped after a second remote update. No force push was attempted.',
        409,
        { stdout: push.stdout, stderr: push.stderr },
      );
    }
    return { commit: await currentCommit(), retried: true };
  }

  async function defaultDeployVerifier(commitSha) {
    const deadline = Date.now() + deployTimeoutMs;
    while (Date.now() < deadline) {
      const result = await command('gh', [
        'run',
        'list',
        '--repo',
        repository,
        '--workflow',
        workflow,
        '--commit',
        commitSha,
        '--limit',
        '10',
        '--json',
        'databaseId,headSha,status,conclusion,url,name',
      ]);
      const runs = JSON.parse(result.stdout || '[]');
      const run = runs.find((candidate) => candidate.headSha === commitSha);
      if (run?.status === 'completed') {
        if (run.conclusion !== 'success') {
          throw new EditorError(
            'deploy-failed',
            `GitHub Pages completed with ${run.conclusion}`,
            502,
            { run },
          );
        }
        return {
          status: 'success',
          run_id: run.databaseId,
          run_url: run.url,
          workflow_name: run.name,
        };
      }
      await sleep(5000);
    }
    throw new EditorError('deploy-timeout', 'GitHub Pages did not complete before the timeout', 504);
  }

  async function defaultLiveVerifier(expectations) {
    const deadline = Date.now() + liveTimeoutMs;
    let lastFailure = '';
    while (Date.now() < deadline) {
      const checks = [];
      let allPass = true;
      for (const expectation of expectations) {
        const liveUrl = new URL(expectation.route, liveOrigin).href;
        try {
          const response = await fetch(`${liveUrl}${liveUrl.includes('?') ? '&' : '?'}wblPublish=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'user-agent': 'WBL-Interface-Editor-Live-Check/1.0' },
          });
          const html = await response.text();
          const text = htmlText(html);
          const missing = expectation.values.filter((value) => !text.includes(normalizeText(value.text)));
          const pass = response.ok && missing.length === 0;
          checks.push({
            route: expectation.route,
            url: liveUrl,
            status_code: response.status,
            expected_edit_ids: expectation.values.map((value) => value.edit_id),
            missing_edit_ids: missing.map((value) => value.edit_id),
            result: pass ? 'pass' : 'fail',
          });
          if (!pass) allPass = false;
        } catch (error) {
          allPass = false;
          checks.push({ route: expectation.route, url: liveUrl, result: 'fail', error: error.message });
        }
      }
      if (allPass) return { status: 'verified', checks, live_urls: checks.map((check) => check.url) };
      lastFailure = JSON.stringify(checks);
      await sleep(3000);
    }
    throw new EditorError(
      'live-verification-failed',
      'The deployment finished, but the exact saved text was not verified on the live site',
      502,
      { last_failure: lastFailure },
    );
  }

  async function execute(payload) {
    if (payload?.authorization !== 'publish-button') {
      throw new EditorError('publish-authorization-required', 'Use the visible Publish button to authorize delivery', 403);
    }
    if (!Number.isInteger(payload.unsaved_count) || payload.unsaved_count !== 0) {
      throw new EditorError('unsaved-edits', 'Save or discard the current page edits before publishing', 409);
    }
    if (typeof payload.page_route !== 'string' || !payload.page_route.startsWith('/')) {
      throw new EditorError('invalid-route', 'The current editor route is required', 400);
    }

    let pending = await readPending();
    let plan;
    if (pending) {
      plan = pending.plan;
      const changed = await changedPaths();
      if (pending.phase === 'authorized' && changed.length) {
        const current = await authorizeCurrentState();
        if (current.publication_id !== pending.publication_id) {
          throw new EditorError(
            'pending-publication-drift',
            'The saved worktree changed after the pending publication was created',
            409,
          );
        }
        plan = current;
      } else if (pending.phase === 'authorized') {
        const message = (await git(['log', '-1', '--pretty=%B'])).stdout;
        if (message.includes(`WBL-Editor-Publication: ${pending.publication_id}`)) {
          pending.commit_sha = await currentCommit();
          pending.phase = 'committed';
          await atomicJson(pendingPath, pending);
        } else {
          throw new EditorError(
            'pending-publication-missing-commit',
            'The pending publication has no matching saved files or publication commit',
            409,
          );
        }
      }
    } else {
      plan = await authorizeCurrentState();
      const completed = await completedReceipt(plan.publication_id);
      if (completed) return { ...completed, idempotent: true };
      pending = {
        schema_version: 1,
        status: 'pending',
        publication_id: plan.publication_id,
        authorized_at: now(),
        authorization: {
          kind: 'button',
          label: 'Publish saved changes',
          page_route: payload.page_route,
        },
        phase: 'authorized',
        paths: plan.paths,
        plan,
        checks: [],
      };
      await atomicJson(pendingPath, pending);
    }

    try {
      if (pending.phase === 'authorized') {
        pending.checks.push(...await runChecks());
        pending.commit_sha = await stageAndCommit(plan);
        pending.phase = 'committed';
        await atomicJson(pendingPath, pending);
      }

      if (pending.phase === 'committed') {
        pending.commit_sha = await fetchAndRebase();
        pending.phase = 'rebased';
        await atomicJson(pendingPath, pending);
      }

      if (pending.phase === 'rebased') {
        pending.checks.push(...await runChecks({ afterRebase: true }));
        pending.phase = 'verified';
        await atomicJson(pendingPath, pending);
      }

      if (['verified', 'push-race-retry'].includes(pending.phase)) {
        const pushed = await pushWithOneRaceRetry(pending);
        pending.commit_sha = pushed.commit;
        pending.push_race_retried = pushed.retried;
        pending.phase = 'pushed';
        pending.pushed_at = now();
        delete pending.last_error;
        await atomicJson(pendingPath, pending);
      }

      const verifyDeploy = deployVerifier ?? defaultDeployVerifier;
      const verifyLive = liveVerifier ?? defaultLiveVerifier;
      if (pending.phase === 'pushed') {
        pending.deployment = await verifyDeploy(pending.commit_sha, {
          repository,
          workflow,
          runner: command,
        });
        pending.phase = 'deployed';
        await atomicJson(pendingPath, pending);
      }
      if (pending.phase === 'deployed') {
        pending.live = await verifyLive(plan.expectations, {
          liveOrigin,
          fetch,
        });
        pending.phase = 'live-verified';
        await atomicJson(pendingPath, pending);
      }

      const receipt = {
        schema_version: 1,
        status: 'published',
        publication_id: plan.publication_id,
        authorization: pending.authorization,
        commit_sha: pending.commit_sha,
        repository,
        branch: 'main',
        paths: plan.paths,
        file_evidence: plan.file_evidence,
        source_evidence: plan.source_evidence,
        expectations: plan.expectations,
        checks: pending.checks,
        deployment: pending.deployment,
        live_checks: pending.live.checks,
        live_urls: pending.live.live_urls,
        push_race_retried: pending.push_race_retried ?? false,
        published_at: now(),
        idempotent: false,
      };
      await atomicJson(path.join(outputRoot, `publication.${plan.publication_id}.json`), receipt);
      await unlink(pendingPath);
      return receipt;
    } catch (error) {
      pending.status = 'stopped';
      pending.last_error = `${error.code ? `${error.code}: ` : ''}${error.message}`;
      pending.stopped_at = now();
      await atomicJson(pendingPath, pending);
      throw error;
    }
  }

  async function publish(payload) {
    if (inFlight) return inFlight;
    inFlight = execute(payload).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return { status, publish, authorizeCurrentState };
}
