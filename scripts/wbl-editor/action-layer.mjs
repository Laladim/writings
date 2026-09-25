import { randomUUID, createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_RECORD_PREFIX =
  '/Users/laladimalanta/Life-Dashboard/cowork-outputs/wbl-interface-editor/changes';

export class EditorError extends Error {
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.name = 'EditorError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeHtml(value) {
  return value
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EditorError('invalid-session', `${name} must be an object`);
  }
}

function requireString(value, name, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    throw new EditorError('invalid-session', `${name} must be a non-empty string`);
  }
}

function validateSession(session, { requireSave = false } = {}) {
  requireObject(session, 'session');
  requireString(session.session_id, 'session_id');
  requireString(session.started_at, 'started_at');
  requireString(session.page_route, 'page_route');
  if (!session.page_route.startsWith('/')) {
    throw new EditorError('invalid-session', 'page_route must start with /');
  }
  requireObject(session.viewport, 'viewport');
  if (
    !Number.isInteger(session.viewport.width) ||
    !Number.isInteger(session.viewport.height) ||
    session.viewport.width < 320 ||
    session.viewport.height < 320
  ) {
    throw new EditorError('invalid-session', 'viewport dimensions must be integers of at least 320');
  }
  if (!/^[a-f0-9]{64}$/.test(session.baseline_rendered_sha256 ?? '')) {
    throw new EditorError('invalid-session', 'baseline_rendered_sha256 must be a SHA-256');
  }
  if (!Array.isArray(session.events) || session.events.length === 0 || session.events.length > 1000) {
    throw new EditorError('invalid-session', 'events must contain between 1 and 1000 entries');
  }
  if (!Array.isArray(session.edits) || session.edits.length === 0 || session.edits.length > 20) {
    throw new EditorError('invalid-session', 'edits must contain between 1 and 20 entries');
  }
  const editIds = new Set();
  const sequences = new Set();
  for (const edit of session.edits) {
    requireObject(edit, 'edit');
    for (const field of [
      'edit_id',
      'selector',
      'before_text',
      'after_text',
      'first_changed_at',
      'last_changed_at',
      'edit_class',
    ]) {
      requireString(edit[field], field, {
        allowEmpty: field === 'before_text' || field === 'after_text',
      });
    }
    if (!Number.isInteger(edit.sequence) || edit.sequence < 1) {
      throw new EditorError('invalid-session', 'edit sequence must be a positive integer');
    }
    if (!Number.isInteger(edit.mutation_count) || edit.mutation_count < 1) {
      throw new EditorError('invalid-session', 'mutation_count must be a positive integer');
    }
    if (editIds.has(edit.edit_id) || sequences.has(edit.sequence)) {
      throw new EditorError('invalid-session', 'edit IDs and sequences must be unique');
    }
    editIds.add(edit.edit_id);
    sequences.add(edit.sequence);
  }
  if (requireSave) {
    requireString(session.save_clicked_at, 'save_clicked_at');
  }
}

async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await writeFile(temporary, content, { flag: 'wx' });
  await rename(temporary, filePath);
}

async function writeJson(filePath, value) {
  await atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function existingFile(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function ensureWithin(candidate, root, label) {
  const resolvedRoot = await realpath(root);
  const resolvedCandidate = await realpath(candidate);
  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new EditorError('path-escape', `${label} resolves outside its allowed root`, 403);
  }
  return resolvedCandidate;
}

function markerCount(content, marker) {
  return content.split(marker).length - 1;
}

function readMarkerText(content, mapping) {
  if (
    markerCount(content, mapping.start_marker) !== 1 ||
    markerCount(content, mapping.end_marker) !== 1
  ) {
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
  return normalizeText(decodeHtml(content.slice(start, end)));
}

function readMarkerFragment(content, mapping) {
  readMarkerText(content, mapping);
  const start = content.indexOf(mapping.start_marker) + mapping.start_marker.length;
  const end = content.indexOf(mapping.end_marker, start);
  return content.slice(start, end);
}

function replaceMarkerText(content, mapping, expected, replacement) {
  const current = readMarkerText(content, mapping);
  if (current !== normalizeText(expected)) {
    throw new EditorError(
      'source-drift',
      `Source changed for ${mapping.edit_id}; expected "${expected}" and found "${current}"`,
      409,
      { edit_id: mapping.edit_id, expected, current },
    );
  }
  const start = content.indexOf(mapping.start_marker) + mapping.start_marker.length;
  const end = content.indexOf(mapping.end_marker, start);
  return `${content.slice(0, start)}${escapeHtml(replacement)}${content.slice(end)}`;
}

function restoreMarkerFragment(content, mapping, expected, originalFragment) {
  const current = readMarkerText(content, mapping);
  if (current !== normalizeText(expected)) {
    throw new EditorError(
      'source-drift',
      `Source changed for ${mapping.edit_id}; expected "${expected}" and found "${current}"`,
      409,
      { edit_id: mapping.edit_id, expected, current },
    );
  }
  const start = content.indexOf(mapping.start_marker) + mapping.start_marker.length;
  const end = content.indexOf(mapping.end_marker, start);
  return `${content.slice(0, start)}${originalFragment}${content.slice(end)}`;
}

function eventLogBytes(events) {
  return `${events
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((event) => JSON.stringify(event))
    .join('\n')}\n`;
}

function sourceDiff(edits) {
  return edits
    .map(
      (edit) =>
        `--- ${edit.source}\n+++ ${edit.source}\n@@ ${edit.edit_id} @@\n-${edit.before_text}\n+${edit.after_text}`,
    )
    .join('\n\n');
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readImplementation(recordRoot, requestHash) {
  const output = path.join(recordRoot, '05_isolated_implementation/output');
  let names = [];
  try {
    names = await readdir(output);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  for (const name of names.sort()) {
    if (!/^implementation(?:\.[a-f0-9]{12})?\.json$/.test(name)) continue;
    const receipt = await loadJson(path.join(output, name));
    if (receipt.request_hash === requestHash) return { receipt, path: path.join(output, name) };
  }
  return null;
}

async function chooseReceiptPath(folder, baseName, requestHash) {
  const primary = path.join(folder, baseName);
  if (!(await existingFile(primary))) return primary;
  const parsed = path.parse(baseName);
  return path.join(folder, `${parsed.name}.${requestHash.slice(0, 12)}${parsed.ext}`);
}

function revisionKey(sessionId) {
  return sha256(sessionId).slice(0, 12);
}

async function readRequestForSession(recordRoot, sessionId) {
  const output = path.join(recordRoot, '03_visual_edit_capture/output');
  let names = [];
  try {
    names = await readdir(output);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  for (const name of names.sort()) {
    if (!/^change-request(?:\.[a-f0-9]{12})?\.json$/.test(name)) continue;
    const requestPath = path.join(output, name);
    const bytes = await readFile(requestPath, 'utf8');
    const request = JSON.parse(bytes);
    if (request.session_id === sessionId) {
      return { request, bytes, hash: sha256(bytes), path: requestPath };
    }
  }
  return null;
}

export async function createActionLayer({
  root,
  recordRoot,
  manifestPath,
  recordRootPrefix = DEFAULT_RECORD_PREFIX,
  baselineCommit,
}) {
  const resolvedRoot = await realpath(root);
  const resolvedRecordPrefix = await realpath(recordRootPrefix);
  const resolvedRecord = await ensureWithin(recordRoot, resolvedRecordPrefix, 'recordRoot');
  const resolvedManifest = await ensureWithin(manifestPath, resolvedRoot, 'manifestPath');
  const metadata = await loadJson(path.join(resolvedRecord, 'change.json'));
  const manifest = await loadJson(resolvedManifest);
  if (manifest.schema_version !== 1 || !manifest.routes) {
    throw new EditorError('invalid-manifest', 'Editor map must use schema version 1');
  }
  const sessions = new Map();

  async function mapSession(session) {
    const routeMap = manifest.routes[session.page_route];
    if (!routeMap) {
      throw new EditorError('unknown-route', `No editor map exists for ${session.page_route}`, 422);
    }
    const sources = new Map();
    const mapped = [];
    for (const edit of session.edits.slice().sort((a, b) => a.sequence - b.sequence)) {
      const manifestEntry = routeMap[edit.edit_id];
      if (!manifestEntry) {
        throw new EditorError('unknown-mapping', `No source mapping exists for ${edit.edit_id}`, 422);
      }
      const mapping = { edit_id: edit.edit_id, ...manifestEntry };
      if (edit.selector !== mapping.selector) {
        throw new EditorError('selector-mismatch', `Selector changed for ${edit.edit_id}`, 422);
      }
      if (edit.edit_class !== 'site-interface' || mapping.edit_class !== 'site-interface') {
        throw new EditorError(
          'owner-return-required',
          `${edit.edit_id} is not eligible for direct Site application`,
          422,
        );
      }
      const before = normalizeText(edit.before_text);
      const after = normalizeText(edit.after_text);
      if (after === before) {
        throw new EditorError('unchanged-edit', `${edit.edit_id} does not contain a change`, 422);
      }
      if (!after || after.length > mapping.max_length) {
        throw new EditorError(
          'invalid-edit-value',
          `${edit.edit_id} must contain 1 to ${mapping.max_length} characters`,
          422,
        );
      }
      const candidate = path.resolve(resolvedRoot, mapping.source);
      const sourcePath = await ensureWithin(candidate, resolvedRoot, mapping.source);
      if (!sources.has(sourcePath)) {
        const beforeContent = await readFile(sourcePath, 'utf8');
        sources.set(sourcePath, { beforeContent, afterContent: beforeContent, source: mapping.source });
      }
      const state = sources.get(sourcePath);
      const beforeSourceFragment = readMarkerFragment(state.afterContent, mapping);
      state.afterContent = replaceMarkerText(state.afterContent, mapping, before, after);
      mapped.push({
        sequence: edit.sequence,
        edit_id: edit.edit_id,
        selector: edit.selector,
        edit_class: edit.edit_class,
        source: mapping.source,
        before_text: before,
        after_text: after,
        before_source_fragment: beforeSourceFragment,
        start_marker: mapping.start_marker,
        end_marker: mapping.end_marker,
      });
    }
    return { mapped, sources };
  }

  async function currentBaselineCommit() {
    return typeof baselineCommit === 'function' ? baselineCommit() : baselineCommit;
  }

  async function buildRequest(session, eventPath, eventHash) {
    const classes = new Set(session.edits.map((edit) => edit.edit_class));
    return {
      schema_version: 2,
      change_id: metadata.change_id,
      session_id: session.session_id,
      started_at: session.started_at,
      saved_at: session.save_clicked_at,
      page_route: session.page_route,
      viewport: session.viewport,
      monitor_mode: 'deterministic-event-log',
      agent_visibility: 'accumulated-session-state',
      baseline: {
        commit: await currentBaselineCommit(),
        rendered_sha256: session.baseline_rendered_sha256,
      },
      edit_class: classes.size === 1 ? [...classes][0] : 'mixed',
      event_log: {
        path: eventPath,
        sha256: eventHash,
        event_count: session.events.length,
      },
      save_trigger: {
        kind: 'button',
        label: 'Save',
        clicked_at: session.save_clicked_at,
      },
      edits: session.edits
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((edit) => ({
          sequence: edit.sequence,
          edit_id: edit.edit_id,
          selector: edit.selector,
          before_text: normalizeText(edit.before_text),
          after_text: normalizeText(edit.after_text),
          first_changed_at: edit.first_changed_at,
          last_changed_at: edit.last_changed_at,
          mutation_count: edit.mutation_count,
          edit_class: edit.edit_class,
        })),
    };
  }

  async function captureSession(session) {
    validateSession(session);
    const snapshot = structuredClone(session);
    sessions.set(session.session_id, snapshot);
    return {
      status: 'captured',
      session_id: session.session_id,
      event_count: session.events.length,
      edit_count: session.edits.length,
      source_written: false,
    };
  }

  function inspectSession(sessionId) {
    if (sessionId) return sessions.get(sessionId) ?? null;
    return [...sessions.values()].map((session) => structuredClone(session));
  }

  async function inspectReceipt(sessionId) {
    requireString(sessionId, 'session_id');
    const found = await readRequestForSession(resolvedRecord, sessionId);
    if (!found) return { status: 'pending' };
    const implementation = await readImplementation(resolvedRecord, found.hash);
    return implementation?.receipt ?? { status: 'pending', request_hash: found.hash };
  }

  async function inspectRollback(requestHash) {
    requireString(requestHash, 'request_hash');
    const rollbackPath = path.join(
      resolvedRecord,
      `07_site_handoff/output/rollback.${requestHash.slice(0, 12)}.json`,
    );
    if (!(await existingFile(rollbackPath))) {
      return { status: 'pending', request_hash: requestHash };
    }
    return loadJson(rollbackPath);
  }

  async function save(session) {
    validateSession(session, { requireSave: true });
    await captureSession(session);
    const eventBytes = eventLogBytes(session.events);
    const eventHash = sha256(eventBytes);
    const existingRequest = await readRequestForSession(resolvedRecord, session.session_id);
    const captureOutput = path.join(resolvedRecord, '03_visual_edit_capture/output');
    const primaryRequestPath = path.join(captureOutput, 'change-request.json');
    const usePrimary = !existingRequest && !(await existingFile(primaryRequestPath));
    const key = revisionKey(session.session_id);
    const eventRelative = existingRequest?.request.event_log.path ??
      `03_visual_edit_capture/output/editor-events${usePrimary ? '' : `.${key}`}.jsonl`;
    const request = await buildRequest(session, eventRelative, eventHash);
    const requestBytes = `${JSON.stringify(request, null, 2)}\n`;
    const requestHash = sha256(requestBytes);
    const eventPath = path.join(resolvedRecord, eventRelative);
    const requestName = usePrimary ? 'change-request.json' : `change-request.${key}.json`;
    const requestPath = existingRequest?.path ?? path.join(captureOutput, requestName);
    if (existingRequest) {
      if (existingRequest.hash !== requestHash) {
        throw new EditorError(
          'session-already-frozen',
          'This Save session already contains different immutable bytes',
          409,
          { existing_hash: existingRequest.hash, submitted_hash: requestHash },
        );
      }
      const existingImplementation = await readImplementation(resolvedRecord, requestHash);
      if (existingImplementation) {
        return { ...existingImplementation.receipt, idempotent: true };
      }
    } else {
      if (await existingFile(requestPath)) {
        throw new EditorError('revision-key-collision', 'Save revision filename already exists', 409);
      }
      await atomicWrite(eventPath, eventBytes);
      await atomicWrite(requestPath, requestBytes);
      await atomicWrite(
        path.join(captureOutput, `change-request${usePrimary ? '' : `.${key}`}.sha256`),
        `${requestHash}  ${requestName}\n`,
      );
    }

    let mapping;
    try {
      mapping = await mapSession(session);
    } catch (error) {
      const rejection = {
        schema_version: 1,
        request_hash: requestHash,
        decision: 'rejected',
        code: error.code ?? 'mapping-failed',
        message: error.message,
        source_written: false,
        checked_at: new Date().toISOString(),
      };
      const rejectionPath = await chooseReceiptPath(
        path.join(resolvedRecord, '04_agent_plan/output'),
        'mapping-decision.json',
        requestHash,
      );
      await writeJson(rejectionPath, rejection);
      throw error;
    }

    const plan = {
      schema_version: 1,
      request_hash: requestHash,
      baseline_commit: request.baseline.commit,
      isolated_worktree: resolvedRoot,
      owner: 'wbl-site',
      mappings: mapping.mapped,
      write_allowlist: [...new Set(mapping.mapped.map((edit) => edit.source))],
      decision: 'automatic-in-profile-pass',
      stop_condition: 'Write only mapped saved values, then prove same-route parity.',
    };
    const planPath = await chooseReceiptPath(
      path.join(resolvedRecord, '04_agent_plan/output'),
      'agent-plan.json',
      requestHash,
    );
    const decisionPath = await chooseReceiptPath(
      path.join(resolvedRecord, '04_agent_plan/output'),
      'mapping-decision.json',
      requestHash,
    );
    await writeJson(planPath, plan);
    await writeJson(decisionPath, {
      schema_version: 1,
      request_hash: requestHash,
      decision: 'automatic-in-profile-pass',
      mapped_edit_ids: mapping.mapped.map((edit) => edit.edit_id),
      source_written: false,
      checked_at: new Date().toISOString(),
    });

    const written = [];
    try {
      for (const [sourcePath, state] of mapping.sources) {
        await atomicWrite(sourcePath, state.afterContent);
        written.push({ sourcePath, state });
      }
    } catch (error) {
      for (const item of written.reverse()) {
        await atomicWrite(item.sourcePath, item.state.beforeContent);
      }
      throw new EditorError('atomic-apply-failed', `Source apply failed: ${error.message}`, 500);
    }

    const changedFiles = [];
    for (const [, state] of mapping.sources) {
      changedFiles.push({
        path: state.source,
        before_sha256: sha256(state.beforeContent),
        after_sha256: sha256(state.afterContent),
      });
    }
    const receipt = {
      schema_version: 1,
      status: 'applied',
      request_hash: requestHash,
      idempotence_key: requestHash,
      idempotent: false,
      page_route: session.page_route,
      worktree: resolvedRoot,
      baseline_commit: request.baseline.commit,
      applied_at: new Date().toISOString(),
      changed_files: changedFiles,
      edits: mapping.mapped,
      source_diff: sourceDiff(mapping.mapped),
      checks: {
        fixed_manifest_mapping: 'pass',
        original_value_match: 'pass',
        allowlist: 'pass',
        path_boundary: 'pass',
      },
    };
    const implementationPath = await chooseReceiptPath(
      path.join(resolvedRecord, '05_isolated_implementation/output'),
      'implementation.json',
      requestHash,
    );
    await writeJson(implementationPath, receipt);
    return receipt;
  }

  async function rollback(requestHash) {
    requireString(requestHash, 'request_hash');
    const rollbackPath = path.join(
      resolvedRecord,
      `07_site_handoff/output/rollback.${requestHash.slice(0, 12)}.json`,
    );
    if (await existingFile(rollbackPath)) {
      return { ...(await loadJson(rollbackPath)), idempotent: true };
    }
    const found = await readImplementation(resolvedRecord, requestHash);
    if (!found) {
      throw new EditorError('unknown-request', 'No applied batch matches this request hash', 404);
    }
    const routeMap = manifest.routes[found.receipt.page_route];
    const sources = new Map();
    for (const edit of found.receipt.edits) {
      const manifestEntry = routeMap?.[edit.edit_id];
      if (!manifestEntry) {
        throw new EditorError('unknown-mapping', `No rollback mapping exists for ${edit.edit_id}`, 422);
      }
      const mapping = { edit_id: edit.edit_id, ...manifestEntry };
      const sourcePath = await ensureWithin(
        path.resolve(resolvedRoot, mapping.source),
        resolvedRoot,
        mapping.source,
      );
      if (!sources.has(sourcePath)) {
        const beforeContent = await readFile(sourcePath, 'utf8');
        sources.set(sourcePath, { beforeContent, afterContent: beforeContent, source: mapping.source });
      }
      const state = sources.get(sourcePath);
      state.afterContent = restoreMarkerFragment(
        state.afterContent,
        mapping,
        edit.after_text,
        typeof edit.before_source_fragment === 'string'
          ? edit.before_source_fragment
          : escapeHtml(edit.before_text),
      );
    }
    const restoredFiles = [];
    for (const [sourcePath, state] of sources) {
      await atomicWrite(sourcePath, state.afterContent);
      restoredFiles.push({
        path: state.source,
        before_rollback_sha256: sha256(state.beforeContent),
        restored_sha256: sha256(state.afterContent),
      });
    }
    const receipt = {
      schema_version: 1,
      status: 'rolled-back',
      request_hash: requestHash,
      idempotent: false,
      rolled_back_at: new Date().toISOString(),
      restored_files: restoredFiles,
      restored_edit_ids: found.receipt.edits.map((edit) => edit.edit_id),
    };
    await writeJson(rollbackPath, receipt);
    return receipt;
  }

  return { captureSession, inspectSession, inspectReceipt, inspectRollback, save, rollback };
}
