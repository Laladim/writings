#!/usr/bin/env python3
"""Verify every internal link/anchor under a site root resolves on disk.

Usage: python3 bff-linkcheck.py [root]   (default: ~/writings/public)
Checks href=, src=, url(), and #fragment ids in cross-page anchors.
Filters known non-link patterns (JS identifiers, template strings,
hash-router fragments, runtime API endpoints, browser-internal URLs).
"""
import os
import re
import sys
from urllib.parse import unquote

PUB = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/writings/public")
PUB = os.path.abspath(PUB)
LINK_RE = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)""", re.I)
IDENT_RE = re.compile(r"^[A-Za-z_$][\w$]*(\.[\w$]+)*$")  # JS identifiers like a.href, l.url
ID_RE_CACHE = {}


def ids_in(path):
    if path not in ID_RE_CACHE:
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                ID_RE_CACHE[path] = set(re.findall(r"""(?:id|name)\s*=\s*["']([^"']+)["']""", fh.read()))
        except OSError:
            ID_RE_CACHE[path] = set()
    return ID_RE_CACHE[path]


def skip(link):
    if not link:
        return True
    if link.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:",
                        "//", "{", "${", "chrome://", "about:", "blob", "/api/")):
        return True
    if "${" in link or "{{" in link:
        return True  # JS/template interpolation
    if IDENT_RE.match(link):
        return True  # bare JS identifier captured from script code
    if link.startswith("#/"):
        return True  # SPA hash-router route, not a DOM id
    return False


def resolve(base_dir, link):
    link = unquote(link.split("?")[0])
    frag = None
    if "#" in link:
        link, frag = link.split("#", 1)
    if frag is not None and (frag.startswith("/") or "${" in frag):
        frag = None  # hash-route or template fragment, not a DOM id
    if not link:
        return "SELF", frag
    if link.startswith("/"):
        target = os.path.normpath(os.path.join(PUB, link.lstrip("/")))
    else:
        target = os.path.normpath(os.path.join(base_dir, link))
    return target, frag


def exists(target):
    if os.path.isfile(target):
        return target
    if os.path.isdir(target):
        idx = os.path.join(target, "index.html")
        return idx if os.path.isfile(idx) else target
    return None


broken = []
checked = 0
for dirpath, dirnames, filenames in os.walk(PUB):
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for fname in filenames:
        if not fname.endswith((".html", ".css", ".js")):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        for m in LINK_RE.finditer(text):
            link = (m.group(1) or m.group(2)).strip()
            if skip(link):
                continue
            checked += 1
            target, frag = resolve(dirpath, link)
            if target == "SELF":
                if frag and frag not in ids_in(fpath):
                    broken.append((os.path.relpath(fpath, PUB), link, "missing fragment id"))
                continue
            real = exists(target)
            if real is None:
                broken.append((os.path.relpath(fpath, PUB), link, "missing target"))
            elif frag and real.endswith(".html") and frag not in ids_in(real):
                broken.append((os.path.relpath(fpath, PUB), link, "missing fragment id"))

print(f"root: {PUB}")
print(f"checked {checked} internal links")
if broken:
    print(f"BROKEN: {len(broken)}")
    seen = {}
    for f, l, why in broken:
        seen.setdefault((l, why), []).append(f)
    for (l, why), files in sorted(seen.items(), key=lambda kv: -len(kv[1])):
        print(f"  [{len(files)}x] {l} ({why}) e.g. {files[0]}")
    sys.exit(1)
print("ZERO broken internal links")
