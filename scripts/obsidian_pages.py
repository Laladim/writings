#!/usr/bin/env python3
"""Build and sync Obsidian-editable page files for Writings by Lala."""

from __future__ import annotations

import argparse
import html
import re
import subprocess
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
OBSIDIAN_ROOT = ROOT / "Website Pages"
ASTRO_EXPORT_ROOT = OBSIDIAN_ROOT / "00 Site Shell Astro"
MARKDOWN_EXPORT_ROOT = OBSIDIAN_ROOT / "01 Published Markdown"
HTML_EXPORT_ROOT = OBSIDIAN_ROOT / "02 Standalone HTML"
DRAFT_EXPORT_ROOT = OBSIDIAN_ROOT / "03 Draft Markdown"

MANAGED_BEGIN = "<!-- WBL_OBSIDIAN_SYNC"
MANAGED_END = "WBL_OBSIDIAN_SYNC_END -->"
TEXT_MARKER_RE = re.compile(r"<!-- wbl-text:(\d{4}) -->\n(.*?)(?=\n<!-- wbl-text:\d{4} -->|\Z)", re.S)

TYPE_DIRS = {
    "guides": "guide",
    "stories": "story",
    "notes": "note",
    "reflections": "reflection",
    "tools": "tool",
}

ASTRO_SOURCES = [
    ROOT / "src/pages/index.astro",
    ROOT / "src/pages/about.astro",
    ROOT / "src/pages/library.astro",
    ROOT / "src/pages/topics/[topic].astro",
    ROOT / "src/pages/[type]/[...slug].astro",
    ROOT / "src/layouts/Base.astro",
    ROOT / "src/components/ContentCard.astro",
]

SKIP_TEXT_TAGS = {"script", "style", "svg", "noscript", "template"}


@dataclass
class TextToken:
    index: int
    text: str


class EditableHtmlParser(HTMLParser):
    def __init__(self, source: str = "") -> None:
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_offsets = self._line_offsets(source)
        self.tokens: list[tuple[str, str, int | None]] = []
        self.text_tokens: list[TextToken] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        raw = self.get_starttag_text() or self._format_starttag(tag, attrs)
        self.tokens.append(("raw", raw, None))
        if tag.lower() in SKIP_TEXT_TAGS:
            self.skip_depth += 1

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tokens.append(("raw", self.get_starttag_text() or self._format_starttag(tag, attrs, closed=True), None))

    def handle_endtag(self, tag: str) -> None:
        self.tokens.append(("raw", f"</{tag}>", None))
        if tag.lower() in SKIP_TEXT_TAGS and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data: str) -> None:
        editable_index: int | None = None
        if self.skip_depth == 0 and data.strip():
            editable_index = len(self.text_tokens)
            self.text_tokens.append(TextToken(editable_index, html.unescape(data.strip())))
        self.tokens.append(("data", data, editable_index))

    def handle_entityref(self, name: str) -> None:
        self.tokens.append(("raw", self._raw_entity(name, charref=False), None))

    def handle_charref(self, name: str) -> None:
        self.tokens.append(("raw", self._raw_entity(name, charref=True), None))

    def handle_comment(self, data: str) -> None:
        self.tokens.append(("raw", f"<!--{data}-->", None))

    def handle_decl(self, decl: str) -> None:
        self.tokens.append(("raw", f"<!{decl}>", None))

    def handle_pi(self, data: str) -> None:
        self.tokens.append(("raw", f"<?{data}>", None))

    @staticmethod
    def _format_starttag(tag: str, attrs: list[tuple[str, str | None]], closed: bool = False) -> str:
        parts = [tag]
        for name, value in attrs:
            if value is None:
                parts.append(name)
            else:
                parts.append(f'{name}="{html.escape(value, quote=True)}"')
        suffix = " /" if closed else ""
        return f"<{' '.join(parts)}{suffix}>"

    @staticmethod
    def _line_offsets(source: str) -> list[int]:
        offsets = [0]
        for match in re.finditer("\n", source):
            offsets.append(match.end())
        return offsets

    def _absolute_position(self) -> int:
        line, offset = self.getpos()
        if line - 1 >= len(self.line_offsets):
            return 0
        return self.line_offsets[line - 1] + offset

    def _raw_entity(self, name: str, charref: bool) -> str:
        prefix = "&#" if charref else "&"
        fallback = f"{prefix}{name};"
        if not self.source:
            return fallback
        start = self._absolute_position()
        candidate = f"{prefix}{name};"
        if self.source.startswith(candidate, start):
            return candidate
        candidate = f"{prefix}{name}"
        if self.source.startswith(candidate, start):
            return candidate
        return fallback


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "page"


def metadata_block(kind: str, source_path: Path, url: str) -> str:
    rel = source_path.relative_to(ROOT)
    return "\n".join(
        [
            MANAGED_BEGIN,
            f"kind: {kind}",
            f"sourcePath: {rel.as_posix()}",
            f"url: {url}",
            MANAGED_END,
            "",
        ]
    )


def parse_metadata(text: str) -> tuple[dict[str, str], str] | None:
    if not text.startswith(MANAGED_BEGIN):
        return None
    end_index = text.find(MANAGED_END)
    if end_index < 0:
        return None
    raw = text[len(MANAGED_BEGIN) : end_index].strip()
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    body = text[end_index + len(MANAGED_END) :].lstrip("\n")
    return meta, body


def frontmatter_value(text: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
    if not match:
        return ""
    return match.group(1).strip().strip('"').strip("'")


def markdown_url(source_path: Path) -> str:
    collection = source_path.parent.name
    entry_type = TYPE_DIRS.get(collection, collection.rstrip("s"))
    slug = source_path.stem
    return f"/{entry_type}/{slug}/"


def markdown_export_path(source_path: Path) -> Path:
    collection = source_path.parent.name
    title = frontmatter_value(source_path.read_text(), "title")
    filename = f"{slugify(title) or source_path.stem}.md"
    base = DRAFT_EXPORT_ROOT if "drafts" in source_path.parts else MARKDOWN_EXPORT_ROOT
    return base / collection / filename


def html_url(source_path: Path) -> str:
    rel = source_path.relative_to(ROOT / "public")
    if rel.as_posix() == "index.html":
        return "/"
    return "/" + rel.parent.as_posix().strip("/") + "/"


def html_export_path(source_path: Path) -> Path:
    rel = source_path.relative_to(ROOT / "public")
    page_slug = "home" if rel.as_posix() == "index.html" else rel.parent.as_posix().replace("/", "-")
    if page_slug.startswith("swahg-lesson-"):
        group = "SWAHG Lessons"
    elif page_slug.startswith("swahg"):
        group = "SWAHG Pages"
    else:
        group = "Other Pages"
    return HTML_EXPORT_ROOT / group / f"{page_slug}.md"


def html_title(source_path: Path, tokens: list[TextToken]) -> str:
    text = source_path.read_text(errors="replace")
    match = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    if match:
        return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip())
    for token in tokens:
        if len(token.text) > 3:
            return token.text[:80]
    return source_path.parent.name


def entity_adjacent_text_indexes(tokens: list[tuple[str, str, int | None]]) -> set[int]:
    blocked: set[int] = set()
    for index, (kind, value, text_index) in enumerate(tokens):
        if kind != "data" or text_index is None:
            continue
        previous_raw = tokens[index - 1][1] if index > 0 and tokens[index - 1][0] == "raw" else ""
        next_raw = tokens[index + 1][1] if index + 1 < len(tokens) and tokens[index + 1][0] == "raw" else ""
        if re.fullmatch(r"&[#A-Za-z0-9]+;", previous_raw) or re.fullmatch(r"&[#A-Za-z0-9]+;", next_raw):
            blocked.add(text_index)
    return blocked


def discover_markdown_sources() -> list[Path]:
    sources: list[Path] = []
    for directory in TYPE_DIRS:
        sources.extend((ROOT / "src/content" / directory).glob("*.md"))
    sources.extend((ROOT / "src/content/drafts").glob("**/*.md"))
    return sorted(path for path in sources if path.name != ".gitkeep")


def discover_astro_sources() -> list[Path]:
    return sorted(path for path in ASTRO_SOURCES if path.exists())


def discover_html_sources() -> list[Path]:
    return sorted((ROOT / "public").glob("**/index.html"))


def export_markdown_source(source_path: Path) -> Path:
    body = source_path.read_text()
    target = markdown_export_path(source_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    url = "" if "drafts" in source_path.parts else markdown_url(source_path)
    target.write_text(metadata_block("markdown", source_path, url) + body)
    return target


def astro_export_path(source_path: Path) -> Path:
    rel = source_path.relative_to(ROOT)
    filename = rel.as_posix().replace("/", "__").replace("[", "").replace("]", "")
    return ASTRO_EXPORT_ROOT / f"{filename}.md"


def export_source_copy(source_path: Path) -> Path:
    target = astro_export_path(source_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    rel = source_path.relative_to(ROOT).as_posix()
    body = source_path.read_text()
    intro = "\n".join(
        [
            metadata_block("source-copy", source_path, "").rstrip(),
            f"# {rel}",
            "",
            "This is an Astro source file. Edit text carefully and keep the Astro syntax intact.",
            "",
            "```astro",
            body.rstrip(),
            "```",
            "",
        ]
    )
    target.write_text(intro)
    return target


def export_html_source(source_path: Path) -> Path:
    source_text = source_path.read_text(errors="replace")
    parser = EditableHtmlParser(source_text)
    parser.feed(source_text)
    title = html_title(source_path, parser.text_tokens)
    url = html_url(source_path)
    blocked = entity_adjacent_text_indexes(parser.tokens)
    lines = [
        metadata_block("html-text-map", source_path, url).rstrip(),
        f"# {title}",
        "",
        f"Source: `{source_path.relative_to(ROOT).as_posix()}`",
        f"Live path: `{url}`",
        "",
        "Edit the text below each marker. Keep the markers in place.",
        "",
    ]
    for token in parser.text_tokens:
        if token.index in blocked:
            continue
        lines.append(f"<!-- wbl-text:{token.index:04d} -->")
        lines.append(token.text)
        lines.append("")
    target = html_export_path(source_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines).rstrip() + "\n")
    return target


def export_all() -> None:
    for source in discover_astro_sources():
        export_source_copy(source)
    for source in discover_markdown_sources():
        export_markdown_source(source)
    for source in discover_html_sources():
        export_html_source(source)
    write_index()


def managed_files() -> list[Path]:
    if not OBSIDIAN_ROOT.exists():
        return []
    return sorted(path for path in OBSIDIAN_ROOT.glob("**/*.md") if path.name != "README.md")


def managed_metadata() -> list[tuple[Path, dict[str, str], str]]:
    records: list[tuple[Path, dict[str, str], str]] = []
    for path in managed_files():
        parsed = parse_metadata(path.read_text())
        if not parsed:
            continue
        meta, body = parsed
        records.append((path, meta, body))
    return records


def sync_markdown(source_path: Path, body: str) -> None:
    source_path.parent.mkdir(parents=True, exist_ok=True)
    source_path.write_text(body)


def sync_source_copy(source_path: Path, body: str) -> None:
    match = re.search(r"```astro\n(.*?)\n```\s*$", body, re.S)
    if not match:
        raise SystemExit(f"Missing astro code fence in {source_path}")
    source_path.write_text(match.group(1).rstrip() + "\n")


def extract_text_updates(body: str) -> dict[int, str]:
    updates: dict[int, str] = {}
    for match in TEXT_MARKER_RE.finditer(body):
        updates[int(match.group(1))] = match.group(2).strip()
    return updates


def replace_data(old: str, new: str) -> str:
    leading = re.match(r"^\s*", old).group(0)
    trailing = re.search(r"\s*$", old).group(0)
    return leading + html.escape(new, quote=False) + trailing


def sync_html_text_map(source_path: Path, body: str) -> None:
    updates = extract_text_updates(body)
    source_text = source_path.read_text(errors="replace")
    parser = EditableHtmlParser(source_text)
    parser.feed(source_text)
    blocked = entity_adjacent_text_indexes(parser.tokens)
    output: list[str] = []
    for kind, value, text_index in parser.tokens:
        if kind == "data" and text_index is not None and text_index in updates and text_index not in blocked:
            current_text = html.unescape(value.strip())
            if updates[text_index] == current_text:
                output.append(value)
            else:
                output.append(replace_data(value, updates[text_index]))
        else:
            output.append(value)
    source_path.write_text("".join(output))


def sync_all() -> None:
    for path, meta, body in managed_metadata():
        source = ROOT / meta["sourcePath"]
        if meta.get("kind") == "markdown":
            sync_markdown(source, body)
        elif meta.get("kind") == "source-copy":
            sync_source_copy(source, body)
        elif meta.get("kind") == "html-text-map":
            sync_html_text_map(source, body)


def write_index() -> None:
    lines = [
        "# Website Pages",
        "",
        "This folder is the Obsidian editing layer for Writings by Lala.",
        "",
        "1. Edit a page file in this folder.",
        "2. Run `npm run obsidian:sync` from the Writings repo.",
        "3. Run `npm run build` to verify the site still builds.",
        "4. Push the Writings repo to publish through GitHub Pages.",
        "",
        "Do not delete the `WBL_OBSIDIAN_SYNC` block or `wbl-text` markers.",
        "",
        "## Sections",
        "",
        "- `00 Site Shell Astro`: homepage, About, layout, and listing templates.",
        "- `01 Published Markdown`: blog, story, guide, reflection, note, and tool source files.",
        "- `02 Standalone HTML`: SWAHG and other public HTML pages, broken into editable text blocks.",
        "- `03 Draft Markdown`: local drafts that are not published yet.",
        "",
    ]
    OBSIDIAN_ROOT.mkdir(parents=True, exist_ok=True)
    (OBSIDIAN_ROOT / "README.md").write_text("\n".join(lines))


def git_output(args: list[str]) -> str:
    result = subprocess.run(args, cwd=ROOT, check=True, text=True, capture_output=True)
    return result.stdout


def tracked_paths() -> set[str]:
    output = git_output(["git", "ls-files", "-z"])
    return {path for path in output.split("\0") if path}


def changed_tracked_paths() -> set[str]:
    output = git_output(["git", "status", "--porcelain", "-z"])
    changed: set[str] = set()
    parts = [part for part in output.split("\0") if part]
    for part in parts:
        if len(part) < 4:
            continue
        path = part[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        changed.add(path)
    return changed & tracked_paths()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def existing_paths(paths: Iterable[str]) -> list[str]:
    return sorted(path for path in set(paths) if (ROOT / path).exists())


def publish(message: str) -> None:
    sync_all()
    verify()

    tracked = tracked_paths()
    source_paths = {meta["sourcePath"] for _, meta, _ in managed_metadata() if meta.get("sourcePath")}
    changed_sources = sorted(source_paths & changed_tracked_paths())
    system_paths = [
        ".gitignore",
        "README.md",
        "package.json",
        "scripts/obsidian_pages.py",
        relative(OBSIDIAN_ROOT),
    ]
    stage_paths = existing_paths(system_paths + changed_sources)
    if not stage_paths:
        print("No publishable Obsidian paths found.")
        return

    subprocess.run(["git", "add", "--", *stage_paths], cwd=ROOT, check=True)
    staged = git_output(["git", "diff", "--cached", "--name-only"])
    if not staged.strip():
        print("No Obsidian changes to publish.")
        return

    subprocess.run(["git", "commit", "-m", message], cwd=ROOT, check=True)
    subprocess.run(["git", "fetch", "origin"], cwd=ROOT, check=True)
    subprocess.run(["git", "rebase", "origin/main"], cwd=ROOT, check=True)
    verify()
    subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=ROOT, check=True)
    print("Published Obsidian edits to origin/main.")


def verify() -> None:
    expected = len(discover_astro_sources()) + len(discover_markdown_sources()) + len(discover_html_sources())
    actual = len(managed_files())
    if expected != actual:
        raise SystemExit(f"Expected {expected} editable page files, found {actual}. Run npm run obsidian:export.")
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
    print(f"OK editable_pages={actual}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export and sync Obsidian-editable website pages.")
    parser.add_argument("command", choices=["export", "sync", "verify", "publish"])
    parser.add_argument(
        "-m",
        "--message",
        default="Update Writings Obsidian pages",
        help="Commit message used by the publish command.",
    )
    args = parser.parse_args()
    if args.command == "export":
        export_all()
    elif args.command == "sync":
        sync_all()
    elif args.command == "verify":
        verify()
    elif args.command == "publish":
        publish(args.message)


if __name__ == "__main__":
    main()
