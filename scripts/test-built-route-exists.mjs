import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { builtRouteExists } from './built-route-exists.mjs';

// Keep these harmless isolated fixtures for recovery diagnosis. Never use a
// real source/output folder as the writable test tree.
const fixture = await mkdtemp(path.join(tmpdir(), 'wbl-route-test-'));
const dist = path.join(fixture, 'dist');
await mkdir(path.join(dist, '_astro'), { recursive: true });
await mkdir(path.join(dist, 'guide', 'example'), { recursive: true });
await writeFile(path.join(dist, '_astro', '_..Df_NlsbW.css'), 'body{}');
await writeFile(path.join(dist, 'guide', 'example', 'index.html'), '<p>fixture</p>');
await writeFile(path.join(dist, 'flat.html'), '<p>flat</p>');
await writeFile(path.join(fixture, 'outside.html'), 'outside canary');
await symlink(path.join(fixture, 'outside.html'), path.join(dist, 'escaped.html'));
await symlink(path.join(dist, 'flat.html'), path.join(dist, 'inside.html'));

for (const [name, route, expected] of [
  ['hashed filename with two dots', '/_astro/_..Df_NlsbW.css', true],
  ['asset query and fragment', '/_astro/_..Df_NlsbW.css?v=1#x', true],
  ['directory route', '/guide/example/', true],
  ['extensionless flat route', '/flat', true],
  ['missing asset', '/_astro/missing.css', false],
  ['parent traversal', '/../outside.html', false],
  ['nested parent traversal', '/guide/../../outside.html', false],
  ['encoded traversal', '/%2e%2e/outside.html', false],
  ['encoded slash traversal', '/guide%2f..%2f..%2foutside.html', false],
  ['malformed encoding', '/%ZZ.html', false],
  ['protocol-relative path', '//outside.html', false],
  ['backslash traversal', '/..\\outside.html', false],
  ['encoded NUL', '/flat%00.html', false],
  ['escaping symbolic link', '/escaped.html', false],
  ['contained symbolic link', '/inside.html', true],
]) {
  test(name, async () => assert.equal(await builtRouteExists(dist, route), expected));
}
