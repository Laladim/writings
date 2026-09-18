// WBL technical-production owner: keep the route safety regression tests with
// this resolver. Dots inside a filename are not parent-directory segments.
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

function contained(base, target) {
  const relative = path.relative(base, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function builtRouteExists(dist, route) {
  let pathname;
  try { pathname = decodeURIComponent(route.split(/[?#]/, 1)[0]); }
  catch { return false; }
  if (!pathname.startsWith('/') || pathname.startsWith('//') ||
      pathname.includes('\\') || pathname.includes('\0') ||
      pathname.split('/').includes('..')) return false;
  let base;
  try { base = await realpath(dist); } catch { return false; }
  const suffixes = /\.[a-z0-9]{2,6}$/i.test(pathname) ? [pathname]
    : pathname.endsWith('/') ? [`${pathname}index.html`]
      : [`${pathname}.html`, `${pathname}/index.html`];
  for (const suffix of suffixes) {
    const candidate = path.resolve(base, `.${suffix}`);
    if (!contained(base, candidate)) continue;
    try {
      const resolved = await realpath(candidate);
      if (contained(base, resolved) && (await stat(resolved)).isFile()) return true;
    } catch { /* Missing and inaccessible routes fail closed. */ }
  }
  return false;
}
