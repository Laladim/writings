import { timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EditorError, createActionLayer } from './action-layer.mjs';
import { createPublisher } from './publisher.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(folder, 'editor-map.json');

function json(res, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

function isLoopback(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '');
}

function tokenMatches(submitted, expected) {
  if (typeof submitted !== 'string') return false;
  const left = Buffer.from(submitted);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorize(req, token, { mutation = false } = {}) {
  if (!isLoopback(req.socket.remoteAddress)) {
    throw new EditorError('loopback-required', 'Editor actions accept loopback requests only', 403);
  }
  if (!tokenMatches(req.headers['x-wbl-editor-token'], token)) {
    throw new EditorError('invalid-token', 'The editor session token is missing or invalid', 401);
  }
  if (mutation) {
    const host = req.headers.host;
    const origin = req.headers.origin;
    if (!host || (origin !== `http://${host}` && origin !== `https://${host}`)) {
      throw new EditorError('origin-mismatch', 'Mutation origin does not match the editor page', 403);
    }
  }
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new EditorError('body-too-large', 'Editor request exceeds 1 MB', 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new EditorError('invalid-json', 'Editor request body must be valid JSON');
  }
}

export function wblEditorPlugin() {
  return {
    name: 'wbl-interface-editor',
    apply: 'serve',
    async configureServer(server) {
      if (process.env.WBL_EDITOR_ENABLED !== '1') return;
      const token = process.env.WBL_EDITOR_TOKEN;
      const recordRoot = process.env.WBL_EDITOR_RECORD_ROOT;
      if (!token || token.length < 32 || !recordRoot) {
        throw new Error('WBL Editor requires a 32-character token and an absolute record root');
      }
      const root = process.cwd();
      const currentCommit = () => execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: root,
          encoding: 'utf8',
        }).trim();
      const baselineCommit = currentCommit();
      const layer = await createActionLayer({
        root,
        recordRoot,
        manifestPath,
        baselineCommit: currentCommit,
      });
      const publisher = await createPublisher({
        root,
        recordRoot,
        manifestPath,
        baselineCommit,
      });

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
        if (!requestUrl.pathname.startsWith('/__wbl-editor/')) return next();
        try {
          if (requestUrl.pathname === '/__wbl-editor/health' && req.method === 'GET') {
            authorize(req, token);
            return json(res, 200, {
              status: 'ready',
              source_root: root,
              record_root: recordRoot,
              source_written: false,
              publication_enabled: true,
            });
          }
          if (requestUrl.pathname === '/__wbl-editor/session' && req.method === 'GET') {
            authorize(req, token);
            const sessionId = requestUrl.searchParams.get('session_id');
            return json(res, 200, {
              status: 'ok',
              session: layer.inspectSession(sessionId || undefined),
            });
          }
          if (requestUrl.pathname === '/__wbl-editor/receipt' && req.method === 'GET') {
            authorize(req, token);
            const sessionId = requestUrl.searchParams.get('session_id');
            if (!sessionId) {
              throw new EditorError('invalid-session', 'session_id is required');
            }
            return json(res, 200, await layer.inspectReceipt(sessionId));
          }
          if (requestUrl.pathname === '/__wbl-editor/rollback' && req.method === 'GET') {
            authorize(req, token);
            const requestHash = requestUrl.searchParams.get('request_hash');
            if (!requestHash) {
              throw new EditorError('unknown-request', 'request_hash is required');
            }
            return json(res, 200, await layer.inspectRollback(requestHash));
          }
          if (requestUrl.pathname === '/__wbl-editor/publish-status' && req.method === 'GET') {
            authorize(req, token);
            return json(res, 200, await publisher.status());
          }
          if (requestUrl.pathname === '/__wbl-editor/session' && req.method === 'POST') {
            authorize(req, token, { mutation: true });
            const payload = await body(req);
            return json(res, 200, await layer.captureSession(payload.session));
          }
          if (requestUrl.pathname === '/__wbl-editor/save' && req.method === 'POST') {
            authorize(req, token, { mutation: true });
            const payload = await body(req);
            return json(res, 200, await layer.save(payload.session));
          }
          if (requestUrl.pathname === '/__wbl-editor/rollback' && req.method === 'POST') {
            authorize(req, token, { mutation: true });
            const payload = await body(req);
            return json(res, 200, await layer.rollback(payload.request_hash));
          }
          if (requestUrl.pathname === '/__wbl-editor/publish' && req.method === 'POST') {
            authorize(req, token, { mutation: true });
            const payload = await body(req);
            return json(res, 200, await publisher.publish(payload));
          }
          return json(res, 404, { code: 'not-found', message: 'Unknown editor endpoint' });
        } catch (error) {
          const status = error instanceof EditorError ? error.status : 500;
          return json(res, status, {
            code: error.code ?? 'internal-error',
            message: error.message,
            details: error.details ?? {},
          });
        }
      });
    },
  };
}
