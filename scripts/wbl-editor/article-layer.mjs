import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { EditorError, sha256 } from './action-layer.mjs';

const ROUTE = /^\/(guide|story|note|reflection|tool)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;
const FOLDERS = {
  guide: 'guides',
  story: 'stories',
  note: 'notes',
  reflection: 'reflections',
  tool: 'tools',
};

function normalize(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function visibleMarkdown(value) {
  return normalize(
    String(value ?? '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<\/?u>/gi, '')
      .replace(/[*_]{1,3}/g, '')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|/g, ' '),
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formattingExpectations(markdown) {
  const fragments = [];
  for (const match of markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    fragments.push({ kind: 'link', text: visibleMarkdown(match[1]), href: match[2] });
  }
  for (const match of markdown.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    fragments.push({ kind: 'bold', html: `<strong>${escapeHtml(match[1])}</strong>` });
  }
  for (const match of markdown.matchAll(/<u>([^<\n]+)<\/u>/gi)) {
    fragments.push({ kind: 'underline', html: `<u>${escapeHtml(match[1])}</u>` });
  }
  return fragments;
}

function routeSource(route) {
  const match = ROUTE.exec(route);
  if (!match) throw new EditorError('unsupported-article-route', 'This WBL route is not an editable article', 422);
  return `src/content/${FOLDERS[match[1]]}/${match[2]}.md`;
}

function splitMarkdown(source) {
  const match = source.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (!match) throw new EditorError('invalid-markdown-source', 'The article frontmatter is invalid', 422);
  return { frontmatter: match[1], body: match[2].replace(/^\n/, '').replace(/\n$/, '') };
}

async function atomicWrite(filePath, value) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, value, { flag: 'wx' });
  await rename(temporary, filePath);
}

async function nextPath(folder, base, requestHash) {
  await mkdir(folder, { recursive: true });
  const primary = path.join(folder, base);
  try {
    await readFile(primary);
    const extension = path.extname(base);
    return path.join(folder, `${base.slice(0, -extension.length)}.${requestHash.slice(0, 12)}${extension}`);
  } catch (error) {
    if (error?.code === 'ENOENT') return primary;
    throw error;
  }
}

export async function createArticleLayer({ root, recordRoot, baselineCommit }) {
  const resolvedRoot = await realpath(root);
  const resolvedRecord = await realpath(recordRoot);

  async function load(route) {
    const source = routeSource(route);
    const absolute = path.resolve(resolvedRoot, source);
    if (!absolute.startsWith(`${resolvedRoot}${path.sep}`)) throw new EditorError('path-escape', 'Article source escaped the worktree', 403);
    const bytes = await readFile(absolute, 'utf8');
    const parsed = splitMarkdown(bytes);
    return { route, source, body: parsed.body, source_sha256: sha256(bytes) };
  }

  async function save(payload) {
    if (payload?.authorization !== 'save-button') throw new EditorError('save-authorization-required', 'Use the visible Save button', 403);
    const current = await load(payload.page_route);
    const submittedSource = String(payload.source ?? '');
    const canonicalSubmittedSource = submittedSource.endsWith('.md') ? submittedSource : `${submittedSource}.md`;
    if (canonicalSubmittedSource !== current.source) throw new EditorError('source-mismatch', 'The submitted article source does not match its route', 409);
    if (payload.before_source_sha256 !== current.source_sha256) throw new EditorError('source-drift', 'The article source changed. Reload before saving.', 409);
    const beforeBody = String(payload.before_body ?? '');
    const afterBody = String(payload.after_body ?? '');
    if (beforeBody !== current.body) throw new EditorError('body-drift', 'The visible editor baseline no longer matches source', 409);
    if (beforeBody === afterBody) throw new EditorError('unchanged-edit', 'No formatting change is waiting to save', 422);
    if (visibleMarkdown(beforeBody) !== visibleMarkdown(afterBody)) {
      throw new EditorError('owner-return-required', 'This changes the article wording. Send it through WBL Editorial before saving.', 422);
    }
    const expectations = formattingExpectations(afterBody);
    if (!expectations.length) throw new EditorError('unsupported-format-change', 'Use Link, Bold, or Underline for this formatting-only editor.', 422);

    const original = await readFile(path.join(resolvedRoot, current.source), 'utf8');
    const parsed = splitMarkdown(original);
    const candidate = `${parsed.frontmatter}\n${afterBody.replace(/\s+$/, '')}\n`;
    const request = {
      schema_version: 1,
      change_id: path.basename(resolvedRecord),
      page_route: current.route,
      source: current.source,
      baseline_commit: typeof baselineCommit === 'function' ? baselineCommit() : baselineCommit,
      before_source_sha256: current.source_sha256,
      after_source_sha256: sha256(candidate),
      before_body_sha256: sha256(beforeBody),
      after_body_sha256: sha256(afterBody),
      saved_at: new Date().toISOString(),
      edit_class: 'mechanical-formatting',
      live_expectations: [{ route: current.route, fragments: expectations }],
    };
    const requestBytes = `${JSON.stringify(request, null, 2)}\n`;
    const requestHash = sha256(requestBytes);
    const capture = path.join(resolvedRecord, '03_visual_edit_capture/output');
    const requestPath = await nextPath(capture, 'change-request.json', requestHash);
    await atomicWrite(requestPath, requestBytes);
    await atomicWrite(path.join(resolvedRoot, current.source), candidate);

    const receipt = {
      schema_version: 1,
      status: 'applied',
      request_hash: requestHash,
      idempotence_key: requestHash,
      page_route: current.route,
      worktree: resolvedRoot,
      baseline_commit: request.baseline_commit,
      applied_at: new Date().toISOString(),
      changed_files: [{ path: current.source, before_sha256: current.source_sha256, after_sha256: sha256(candidate) }],
      edits: [{ edit_id: 'article.body.formatting', edit_class: 'mechanical-formatting', source: current.source }],
      live_expectations: request.live_expectations,
      checks: { visible_wording_unchanged: 'pass', route_mapping: 'pass', source_drift: 'pass', path_boundary: 'pass' },
    };
    const output = path.join(resolvedRecord, '05_isolated_implementation/output');
    const receiptPath = await nextPath(output, 'implementation.json', requestHash);
    await atomicWrite(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    return { ...receipt, body: afterBody, source_sha256: sha256(candidate) };
  }

  return { load, save };
}
