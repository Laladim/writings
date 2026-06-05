#!/usr/bin/env python3
"""SWAHG -> Bonafide Filipino Freelancers URL migration for ~/writings.

Phase A (this script): build manifest, git mv dirs, rewrite anchors.
Run with --dry-run to preview; --apply to execute.
"""
import json
import os
import re
import subprocess
import sys

REPO = "/Users/laladimalanta/writings"
PUB = os.path.join(REPO, "public")
PARENT_NAME = "bonafide-filipino-freelancers"
PARENT = os.path.join(PUB, PARENT_NAME)

SECTION_MAP = {
    "swahg-archetype": "archetype",
    "swahg-blueprint": "blueprint",
    "swahg-curriculum": "curriculum",
    "swahg-events": "events",
    "swahg-jobs": "jobs",
    "swahg-resume-builder": "resume-builder",
    "swahg-start": "start",
    "swahg-stories": "stories",
}
FILE_MAP = {
    "swahg-lesson-shared.css": "lesson-shared.css",
    "swahg-lessons.js": "lessons.js",
}

TEXT_EXT = {".html", ".css", ".js", ".json", ".xml", ".txt", ".md", ".astro", ".ts"}


def build_mapping():
    """old dir/file name (relative to public/) -> new path relative to public/."""
    mapping = {}
    for entry in sorted(os.listdir(PUB)):
        full = os.path.join(PUB, entry)
        if entry == "swahg" and os.path.isdir(full):
            mapping["swahg"] = PARENT_NAME  # hub becomes parent root
        elif entry in SECTION_MAP:
            mapping[entry] = f"{PARENT_NAME}/{SECTION_MAP[entry]}"
        elif entry.startswith("swahg-lesson-") and os.path.isdir(full):
            slug = entry[len("swahg-lesson-"):]
            mapping[entry] = f"{PARENT_NAME}/lesson-{slug}"
        elif entry in FILE_MAP:
            mapping[entry] = f"{PARENT_NAME}/{FILE_MAP[entry]}"
        elif entry.startswith("swahg"):
            raise SystemExit(f"UNMAPPED swahg entry in public/: {entry}")
    return mapping


def old_name_to_new_relative_sibling(old):
    """For links written from INSIDE a moved subdir (depth 2): ../swahg-X/ -> ../X/"""
    if old == "swahg":
        return ""  # hub is now the parent dir itself -> ../
    if old in SECTION_MAP:
        return SECTION_MAP[old]
    if old in FILE_MAP:
        return FILE_MAP[old]
    if old.startswith("swahg-lesson-"):
        return "lesson-" + old[len("swahg-lesson-"):]
    return None


def rewrite_inside_subdir(text):
    """File lives at public/bff/<sub>/...  Old siblings referenced as ../swahg-X."""
    n = 0
    def sub(pattern, repl, t):
        nonlocal n
        new, c = re.subn(pattern, repl, t)
        n += c
        return new
    text = sub(r"\.\./swahg-lesson-shared\.css", "../lesson-shared.css", text)
    text = sub(r"\.\./swahg-lessons\.js", "../lessons.js", text)
    text = sub(r"\.\./swahg-lesson-", "../lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"\.\./" + re.escape(old) + r"(?![\w-])", "../" + new, text)
    text = sub(r"\.\./swahg/", "../", text)
    # absolute paths
    text = sub(r"/swahg-lesson-shared\.css", f"/{PARENT_NAME}/lesson-shared.css", text)
    text = sub(r"/swahg-lessons\.js", f"/{PARENT_NAME}/lessons.js", text)
    text = sub(r"/swahg-lesson-", f"/{PARENT_NAME}/lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"/" + re.escape(old) + r"(?![\w-])", f"/{PARENT_NAME}/{new}", text)
    text = sub(r"/swahg/", f"/{PARENT_NAME}/", text)
    return text, n


def rewrite_parent_root(text):
    """File lives at public/bff/index.html (old hub). Old siblings are now children."""
    n = 0
    def sub(pattern, repl, t):
        nonlocal n
        new, c = re.subn(pattern, repl, t)
        n += c
        return new
    text = sub(r"\.\./swahg-lesson-shared\.css", "lesson-shared.css", text)
    text = sub(r"\.\./swahg-lessons\.js", "lessons.js", text)
    text = sub(r"\.\./swahg-lesson-", "lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"\.\./" + re.escape(old) + r"(?![\w-])", new, text)
    text = sub(r"\.\./swahg/", "./", text)
    text = sub(r"/swahg-lesson-", f"/{PARENT_NAME}/lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"/" + re.escape(old) + r"(?![\w-])", f"/{PARENT_NAME}/{new}", text)
    text = sub(r"/swahg/", f"/{PARENT_NAME}/", text)
    return text, n


def rewrite_outside(text):
    """Files outside the moved tree (src/, other public dirs at depth 1)."""
    n = 0
    def sub(pattern, repl, t):
        nonlocal n
        new, c = re.subn(pattern, repl, t)
        n += c
        return new
    # full URLs first
    text = sub(r"https://writingsbylala\.com/swahg-start/?",
               f"https://writingsbylala.com/{PARENT_NAME}/start/", text)
    # relative from a depth-1 dir
    text = sub(r"\.\./swahg-lesson-shared\.css", f"../{PARENT_NAME}/lesson-shared.css", text)
    text = sub(r"\.\./swahg-lessons\.js", f"../{PARENT_NAME}/lessons.js", text)
    text = sub(r"\.\./swahg-lesson-", f"../{PARENT_NAME}/lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"\.\./" + re.escape(old) + r"(?![\w-])", f"../{PARENT_NAME}/{new}", text)
    text = sub(r"\.\./swahg/", f"../{PARENT_NAME}/", text)
    # absolute
    text = sub(r"/swahg-lesson-shared\.css", f"/{PARENT_NAME}/lesson-shared.css", text)
    text = sub(r"/swahg-lessons\.js", f"/{PARENT_NAME}/lessons.js", text)
    text = sub(r"/swahg-lesson-", f"/{PARENT_NAME}/lesson-", text)
    for old, new in SECTION_MAP.items():
        text = sub(r"/" + re.escape(old) + r"(?![\w-])", f"/{PARENT_NAME}/{new}", text)
    text = sub(r"/swahg/", f"/{PARENT_NAME}/", text)
    return text, n


def iter_text_files(root, skip_dirs=()):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "dist", ".obsidian") and os.path.join(dirpath, d) not in skip_dirs]
        for f in filenames:
            if os.path.splitext(f)[1].lower() in TEXT_EXT:
                yield os.path.join(dirpath, f)


def main():
    apply = "--apply" in sys.argv
    mapping = build_mapping()
    manifest = {
        "date": "2026-06-06",
        "parent": PARENT_NAME,
        "moves": {old: new for old, new in mapping.items()},
        "urls": {f"https://writingsbylala.com/{old}/": f"https://writingsbylala.com/{new}/"
                 for old, new in mapping.items() if not old.endswith((".css", ".js"))},
        "rewrites": {},
    }
    print(f"Mapped {len(mapping)} entries "
          f"({sum(1 for k in mapping if k.startswith('swahg-lesson-') and not k.endswith(('.css','.js')))} lessons)")

    if apply:
        os.makedirs(PARENT, exist_ok=True)
        # hub first: its CONTENTS go to parent root
        hub = os.path.join(PUB, "swahg")
        for item in sorted(os.listdir(hub)):
            subprocess.run(["git", "mv", os.path.join(hub, item), os.path.join(PARENT, item)],
                           cwd=REPO, check=True)
        # leftover empty dir removed by git mv automatically; ensure:
        if os.path.isdir(hub):
            os.rmdir(hub)
        for old, new in mapping.items():
            if old == "swahg":
                continue
            subprocess.run(["git", "mv", os.path.join(PUB, old), os.path.join(PUB, new)],
                           cwd=REPO, check=True)
        print("git mv complete")

    # rewrite pass
    targets = []
    if apply:
        # parent root files (old hub)
        for f in os.listdir(PARENT):
            p = os.path.join(PARENT, f)
            if os.path.isfile(p) and os.path.splitext(f)[1].lower() in TEXT_EXT:
                targets.append((p, "parent_root"))
        for d in os.listdir(PARENT):
            p = os.path.join(PARENT, d)
            if os.path.isdir(p):
                for f in iter_text_files(p):
                    targets.append((f, "subdir"))
        # outside: rest of public + src + .github
        for f in iter_text_files(PUB, skip_dirs=(PARENT,)):
            if not f.startswith(PARENT):
                targets.append((f, "outside"))
        for f in iter_text_files(os.path.join(REPO, "src")):
            targets.append((f, "outside"))
    else:
        # dry run: count matches in current layout
        total = 0
        for f in iter_text_files(PUB):
            with open(f, encoding="utf-8", errors="ignore") as fh:
                total += len(re.findall(r"swahg", fh.read(), re.I))
        print(f"DRY RUN: {total} case-insensitive 'swahg' occurrences in public/")
        with open(os.path.join(REPO, "bff-migration-manifest.json"), "w") as fh:
            json.dump(manifest, fh, indent=2)
        print("Manifest written (dry).")
        return

    funcs = {"parent_root": rewrite_parent_root, "subdir": rewrite_inside_subdir,
             "outside": rewrite_outside}
    total = 0
    for path, kind in targets:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
        new_text, n = funcs[kind](text)
        if n:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new_text)
            rel = os.path.relpath(path, REPO)
            manifest["rewrites"][rel] = n
            total += n
    print(f"Rewrote {total} references across {len(manifest['rewrites'])} files")
    with open(os.path.join(REPO, "bff-migration-manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print("Manifest written.")


if __name__ == "__main__":
    main()
