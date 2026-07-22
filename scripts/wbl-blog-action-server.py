#!/usr/bin/env python3
"""Local action server for the WBL SWAHG blog database."""

from __future__ import annotations

import json
import re
from datetime import datetime
from datetime import date
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import gspread
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "src/data/swahgBlogInventory.json"
DRAFT_ROOT = ROOT / "src/content/drafts/swahg"
IMAGE_ROOT = ROOT / "public/blog-images"
HOST = "127.0.0.1"
PORT = 8792
SHEET_ID = "1u-R_VoDOseCXQzrRay9nRmkbSJRB4Z4POZcqm5Ydo58"
SERVICE_ACCOUNT = "/Users/laladimalanta/.config/gcloud/claude-sheets-key.json"
IMAGE_SHEET = "WBL Blog Images"
IMAGE_BASE_URL = "https://writingsbylala.com"
IMAGE_MAX_WIDTH = 1600
IMAGE_QUALITY = 78
TYPE_DIRS = {
    "guide": "guides",
    "story": "stories",
    "note": "notes",
    "reflection": "reflections",
    "tool": "tools",
}

TOPIC_MAP = {
    "beginner-freelancing": "freelancing",
    "client-acquisition": "freelancing",
    "portfolio-and-brand": "content-strategy",
    "communication": "freelancing",
    "tools-and-systems": "automation",
    "social-media": "content-strategy",
    "content-creation": "content-strategy",
    "career-paths": "freelancing",
    "community-and-leadership": "community",
    "mindset-and-faith": "faith-theology",
    "program-design": "community",
}

TARGET_AUDIENCE_QUESTION = "Who is the target audience of this blog post?"
PERSONA_CONTEXT_PATH = "personal-skills/writings-by-lala/personas/wbl-six-freelancer-brand-personas.md"
PERSONA_USAGE_RULE = "hidden-context-not-public-label"


def clean_space(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def content_text(value: object) -> str:
    text = clean_space(value)
    return text.replace("\u2014", ",").replace("\u2013", "-")


def markdown_text(value: object) -> str:
    text = str(value or "")
    text = text.replace("\u2014", ",").replace("\u2013", "-")
    lines = [re.sub(r"[ \t]+$", "", line) for line in text.splitlines()]
    return "\n".join(lines).strip()


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "draft"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    for index in range(2, 1000):
        candidate = path.with_name(f"{path.stem}-{index}{path.suffix}")
        if not candidate.exists():
            return candidate
    raise ValueError("Could not create a unique image filename.")


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---"):
        return {}, text
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.DOTALL)
    if not match:
        return {}, text
    frontmatter: dict[str, object] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, raw_value = line.split(":", 1)
        key = clean_space(key)
        value = clean_space(raw_value)
        if value.startswith("[") and value.endswith("]"):
            try:
                frontmatter[key] = json.loads(value)
            except json.JSONDecodeError:
                frontmatter[key] = []
        else:
            frontmatter[key] = value.strip("\"'")
    return frontmatter, match.group(2).strip()


def markdown_from_fields(fields: dict[str, object], body: str, include_draft_fields: bool) -> str:
    entry_type = clean_space(fields.get("type")) or "guide"
    topics = fields.get("topics")
    if not isinstance(topics, list):
        topics = ["freelancing"]
    title = content_text(fields.get("title"))
    description = content_text(fields.get("description"))
    entry_date = clean_space(fields.get("date")) or date.today().isoformat()
    lines = [
        "---",
        f"title: {yaml_quote(title)}",
        f'type: "{entry_type}"',
        f"topics: {json.dumps(topics, ensure_ascii=False)}",
        f"date: {entry_date}",
        f"description: {yaml_quote(description)}",
    ]
    if include_draft_fields:
        for key in ["swahgSourceId", "swahgSourceTitle", "swahgSourceSlug"]:
            if fields.get(key):
                lines.append(f"{key}: {yaml_quote(content_text(fields.get(key)))}")
        lines.append(f"targetAudienceQuestion: {yaml_quote(TARGET_AUDIENCE_QUESTION)}")
        lines.append(f"primaryPersona: {yaml_quote(content_text(fields.get('primaryPersona')))}")
        lines.append(f"personaArchetype: {yaml_quote(content_text(fields.get('personaArchetype')))}")
        lines.append(f"personaContextPath: {yaml_quote(PERSONA_CONTEXT_PATH)}")
        lines.append(f"personaUsageRule: {yaml_quote(PERSONA_USAGE_RULE)}")
        lines.append('draftStatus: "started"')
    lines.extend(["---", "", markdown_text(body), ""])
    return "\n".join(lines)


def site_topics(item: dict[str, object]) -> list[str]:
    mapped: list[str] = []
    if item.get("blogCategory") == "SWAHG Stories":
        mapped.append("swahg-stories")
    for topic in item.get("topics", []):
        site_topic = TOPIC_MAP.get(str(topic))
        if site_topic and site_topic not in mapped:
            mapped.append(site_topic)
    if "freelancing" not in mapped:
        mapped.append("freelancing")
    return mapped[:3]


def draft_body(item: dict[str, object]) -> str:
    source_title = content_text(item.get("sourceTitle"))
    angle = content_text(item.get("angle"))
    excerpt = content_text(item.get("excerpt"))
    category = content_text(item.get("blogCategory"))
    source_category = content_text(item.get("sourceCategory"))
    topics = ", ".join(item.get("topicLabels", []))
    topic_ids = set(item.get("topics", []))

    if "content-creation" in topic_ids or "curation" in source_title.lower():
        focus = "turning other people's lessons into useful, credited, reader-first notes"
        sections = [
            (
                "Curation is not copying",
                f"{source_title} is a good reminder that content work is not only about producing new ideas from scratch. A beginner can also learn how to gather helpful material, understand it, and explain why it matters to a specific reader.\n\nThat is different from copying. Copying tries to borrow authority without doing the work. Curation does the work of selection. You read with care, choose what is actually useful, give credit, and add context so the reader knows what to do next.",
            ),
            (
                "What a beginner should practice first",
                "A new freelancer can practice article curation with a simple process.\n\n1. Choose one topic your audience already cares about.\n2. Read three credible sources on that topic.\n3. Save the original links and author names.\n4. Write a short note explaining the main idea in your own words.\n5. Add one practical takeaway for the reader.\n\nThis turns reading into a useful work sample. It also trains you to think like an assistant, marketer, researcher, or content writer, because clients do not only need words. They need judgment.",
            ),
            (
                "How to add your own value",
                "The value of curation is not the link. The value is the reason you chose the link.\n\nInstead of saying, here are five articles about freelancing, explain what each one helps the reader understand. One article might explain a tool. Another might show a mistake to avoid. Another might give language a beginner can borrow for a client update.\n\nYour job is to reduce confusion. A reader should leave your curated post feeling more prepared, not more overloaded.",
            ),
            (
                "A small portfolio project",
                "If you want to turn this lesson into proof of skill, create one curated resource page.\n\nPick a beginner-friendly topic, such as how to prepare for a virtual assistant application or how to organize client files. Then collect five resources, write a two-sentence summary for each one, and add one paragraph at the end explaining the best first step.\n\nThat sample can show research, writing, organization, and reader empathy in one piece.",
            ),
        ]
    elif "tools-and-systems" in topic_ids:
        focus = "removing daily friction before paid work begins"
        sections = [
            (
                "Systems make beginners easier to trust",
                f"{source_title} points to a practical truth: clients notice when your work setup is orderly. A strong system helps you find files, follow instructions, and avoid preventable mistakes.\n\nFor a beginner, this is not about expensive software. It is about building habits that make work easier to repeat.",
            ),
            (
                "Start with the work environment",
                "Before learning another advanced tool, clean up the place where work happens. Organize bookmarks, folders, passwords, notes, and templates. Make sure you know where client instructions live and where finished work should go.\n\nA simple setup can protect your focus when the work becomes busy.",
            ),
            (
                "Turn setup into proof",
                "You can create a portfolio sample from a system. Show a sample folder structure, a checklist, or a simple workflow document. This proves that you do not only understand tools, you understand order.",
            ),
        ]
    elif "social-media" in topic_ids:
        focus = "understanding the client goal behind every post"
        sections = [
            (
                "Social media work starts with listening",
                f"{source_title} can help a beginner see that social media is not only posting graphics. It is learning what the audience needs, what the client sells, and what kind of trust the page should build.",
            ),
            (
                "Look for the job behind the post",
                "A post may need to educate, answer a common question, invite a reply, or move someone toward a service. When you understand that purpose, your captions and content ideas become more useful.",
            ),
            (
                "Practice with one page",
                "Choose one small business page and audit the last ten posts. Write down what each post is trying to do. Then suggest three clearer content ideas. That is a practical beginner sample.",
            ),
        ]
    else:
        focus = "choosing one useful next step and practicing it faithfully"
        sections = [
            (
                "Start with one skill, not every skill",
                f"{source_title} is a reminder that beginners do not need to learn the whole freelancing world at once. They need one honest next step that makes them more prepared for real work.",
            ),
            (
                "Practice before selling the skill",
                "A beginner can make progress by creating small samples, rewriting instructions, organizing a mock project, or documenting a simple process. Practice gives you evidence before you ask someone to trust you.",
            ),
            (
                "Build confidence from proof",
                "Confidence becomes steadier when it has proof underneath it. One finished sample, one clear checklist, or one thoughtful note is better than a long list of skills you have not practiced yet.",
            ),
        ]

    section_text = "\n\n".join(f"## {heading}\n\n{body}" for heading, body in sections)

    return f"""A beginner does not need another vague reminder to work hard. A beginner needs a way to turn a lesson into practice.

That is how I would use {source_title}.

The original SWAHG source says:

> {excerpt}

This draft is not trying to repeat the source word for word. It is using the source as a starting point for a WBL blog post about {focus}.

{section_text}

## What to do this week

Use this lesson as a seven-day practice assignment.

1. Choose one small topic connected to {source_title}.
2. Study the source material slowly.
3. Write down what a beginner would misunderstand.
4. Create one sample that makes the lesson easier to apply.
5. Save the sample as proof of practice.

The goal is not to look impressive immediately. The goal is to become more useful, more careful, and more ready for the kind of work you want to do.

## Source note

Source lesson: {source_title}

Source category: {source_category}

WBL blog category: {category}

Topic filters: {topics}

Draft focus: {focus}.

Original angle: {angle}
"""


def build_markdown(item: dict[str, object]) -> str:
    title = content_text(item.get("draftTitle"))
    description = content_text(item.get("angle"))
    topics = site_topics(item)
    entry_type = "story" if item.get("blogCategory") == "SWAHG Stories" else "guide"
    today = date.today().isoformat()
    topic_json = json.dumps(topics, ensure_ascii=False)
    return f"""---
title: {yaml_quote(title)}
type: "{entry_type}"
topics: {topic_json}
date: {today}
description: {yaml_quote(description)}
swahgSourceId: "{clean_space(item.get("id"))}"
swahgSourceTitle: {yaml_quote(content_text(item.get("sourceTitle")))}
swahgSourceSlug: "{clean_space(item.get("sourceSlug"))}"
targetAudienceQuestion: {yaml_quote(TARGET_AUDIENCE_QUESTION)}
primaryPersona: ""
personaArchetype: ""
personaContextPath: {yaml_quote(PERSONA_CONTEXT_PATH)}
personaUsageRule: {yaml_quote(PERSONA_USAGE_RULE)}
draftStatus: "started"
---

{draft_body(item)}
"""


def load_inventory() -> dict[str, object]:
    return json.loads(INVENTORY_PATH.read_text())


def save_inventory(data: dict[str, object]) -> None:
    INVENTORY_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def image_sheet():
    gc = gspread.service_account(filename=SERVICE_ACCOUNT)
    sh = gc.open_by_key(SHEET_ID)
    try:
        ws = sh.worksheet(IMAGE_SHEET)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=IMAGE_SHEET, rows=1000, cols=12)
        ws.append_row([
            "uploaded_at",
            "item_id",
            "draft_title",
            "alt_text",
            "filename",
            "public_path",
            "image_url",
            "width",
            "height",
            "bytes",
            "source_filename",
            "local_path",
        ], value_input_option="USER_ENTERED")
    return ws


def append_image_row(row: list[object]) -> None:
    image_sheet().append_row(row, value_input_option="USER_ENTERED")


def parse_multipart(headers, body: bytes) -> tuple[dict[str, str], dict[str, object]]:
    content_type = headers.get("Content-Type", "")
    message_bytes = (
        f"Content-Type: {content_type}\nMIME-Version: 1.0\n\n".encode("utf-8") + body
    )
    message = BytesParser(policy=default).parsebytes(message_bytes)
    fields: dict[str, str] = {}
    files: dict[str, object] = {}
    for part in message.iter_parts():
        disposition = part.get_content_disposition()
        if disposition != "form-data":
            continue
        name = part.get_param("name", header="content-disposition")
        filename = part.get_filename()
        payload = part.get_payload(decode=True) or b""
        if filename:
            files[name] = {"filename": filename, "content": payload}
        elif name:
            fields[name] = payload.decode(part.get_content_charset() or "utf-8")
    return fields, files


def inventory_item(data: dict[str, object], item_id: str) -> dict[str, object]:
    item = next((entry for entry in data.get("items", []) if clean_space(entry.get("id")) == item_id), None)
    if item is None:
        raise ValueError("Inventory item not found.")
    return item


def update_status_counts(data: dict[str, object]) -> None:
    items = data.get("items", [])
    for status in data.get("metadata", {}).get("statuses", []):
        status["count"] = sum(1 for entry in items if entry.get("publication", {}).get("status") == status["slug"])


def draft_path_for(item: dict[str, object]) -> Path:
    publication = item.get("publication", {})
    path = clean_space(publication.get("path"))
    if path:
        return ROOT / path
    return DRAFT_ROOT / f"{slugify(clean_space(item.get('draftTitle')))}.md"


def editable_path_for(item: dict[str, object]) -> Path:
    publication = item.get("publication", {})
    path = clean_space(publication.get("path"))
    if path:
        return ROOT / path
    return draft_path_for(item)


def public_url_for(entry_type: str, slug: str) -> str:
    return f"/{entry_type}/{slug}/"


def create_blog(item_id: str) -> dict[str, object]:
    data = load_inventory()
    item = inventory_item(data, item_id)

    publication = item.get("publication", {})
    if publication.get("status") == "published":
        return {
            "status": "published",
            "path": publication.get("path", ""),
            "message": "This blog is already published.",
        }

    DRAFT_ROOT.mkdir(parents=True, exist_ok=True)
    slug = slugify(clean_space(item.get("draftTitle")))
    path = DRAFT_ROOT / f"{slug}.md"
    if not path.exists():
        path.write_text(build_markdown(item))

    item["publication"] = {
        "status": "draft-started",
        "statusLabel": "Draft started",
        "path": str(path.relative_to(ROOT)),
        "title": clean_space(item.get("draftTitle")),
        "slug": path.stem,
    }
    update_status_counts(data)
    save_inventory(data)

    return {
        "status": "draft-started",
        "path": str(path),
        "relativePath": str(path.relative_to(ROOT)),
        "message": "Draft created.",
    }


def get_draft(item_id: str) -> dict[str, object]:
    data = load_inventory()
    item = inventory_item(data, item_id)
    publication = item.get("publication", {})
    path = editable_path_for(item)
    if not path.exists():
        raise ValueError("Draft file does not exist yet. Create the blog first.")
    frontmatter, body = parse_frontmatter(path.read_text())
    entry_type = clean_space(frontmatter.get("type")) or "guide"
    return {
        "item": item,
        "path": str(path.relative_to(ROOT)),
        "published": publication.get("status") == "published",
        "url": public_url_for(entry_type, path.stem) if publication.get("status") == "published" else "",
        "frontmatter": frontmatter,
        "body": body,
        "brief": {
            "targetAudienceQuestion": TARGET_AUDIENCE_QUESTION,
            "personaContextPath": PERSONA_CONTEXT_PATH,
            "personaUsageRule": PERSONA_USAGE_RULE,
            "sourceTitle": item.get("sourceTitle", ""),
            "sourceCategory": item.get("sourceCategory", ""),
            "blogCategory": item.get("blogCategory", ""),
            "topicLabels": item.get("topicLabels", []),
            "angle": item.get("angle", ""),
            "excerpt": item.get("excerpt", ""),
        },
    }


def save_draft(item_id: str, payload: dict[str, object]) -> dict[str, object]:
    data = load_inventory()
    item = inventory_item(data, item_id)
    publication = item.get("publication", {})
    is_published = publication.get("status") == "published"
    path = editable_path_for(item)
    if not path.exists():
        raise ValueError("Draft file does not exist yet.")
    current_frontmatter, _ = parse_frontmatter(path.read_text())
    fields = {
        **current_frontmatter,
        "title": payload.get("title") or current_frontmatter.get("title") or item.get("draftTitle"),
        "type": payload.get("type") or current_frontmatter.get("type") or "guide",
        "topics": payload.get("topics") or current_frontmatter.get("topics") or ["freelancing"],
        "date": payload.get("date") or current_frontmatter.get("date") or date.today().isoformat(),
        "description": payload.get("description") or current_frontmatter.get("description") or item.get("angle"),
        "swahgSourceId": item_id,
        "swahgSourceTitle": item.get("sourceTitle", ""),
        "swahgSourceSlug": item.get("sourceSlug", ""),
        "targetAudienceQuestion": TARGET_AUDIENCE_QUESTION,
        "primaryPersona": current_frontmatter.get("primaryPersona", ""),
        "personaArchetype": current_frontmatter.get("personaArchetype", ""),
        "personaContextPath": PERSONA_CONTEXT_PATH,
        "personaUsageRule": PERSONA_USAGE_RULE,
    }
    body = markdown_text(payload.get("body"))
    path.write_text(markdown_from_fields(fields, body, include_draft_fields=not is_published))
    if is_published:
        item["publication"] = {
            "status": "published",
            "statusLabel": "Published",
            "path": str(path.relative_to(ROOT)),
            "title": content_text(fields.get("title")),
            "slug": path.stem,
        }
    else:
        item["publication"] = {
            "status": "draft-started",
            "statusLabel": "Draft started",
            "path": str(path.relative_to(ROOT)),
            "title": content_text(fields.get("title")),
            "slug": path.stem,
        }
    update_status_counts(data)
    save_inventory(data)
    entry_type = clean_space(fields.get("type")) or "guide"
    return {
        "status": "published" if is_published else "draft-started",
        "path": str(path.relative_to(ROOT)),
        "url": public_url_for(entry_type, path.stem) if is_published else "",
        "message": "Saved.",
    }


def publish_draft(item_id: str, payload: dict[str, object]) -> dict[str, object]:
    data = load_inventory()
    item = inventory_item(data, item_id)
    if item.get("publication", {}).get("status") == "published":
        return save_draft(item_id, payload)
    save_draft(item_id, payload)
    data = load_inventory()
    item = inventory_item(data, item_id)
    draft_path = draft_path_for(item)
    frontmatter, body = parse_frontmatter(draft_path.read_text())
    entry_type = clean_space(frontmatter.get("type")) or "guide"
    directory = TYPE_DIRS.get(entry_type)
    if directory is None:
        raise ValueError(f"Unsupported publish type: {entry_type}")
    title = content_text(frontmatter.get("title"))
    target = ROOT / "src/content" / directory / f"{slugify(title)}.md"
    if target.exists():
        raise ValueError(f"Published file already exists: {target.relative_to(ROOT)}")
    target.write_text(markdown_from_fields(frontmatter, body, include_draft_fields=False))
    draft_path.unlink(missing_ok=True)
    item["publication"] = {
        "status": "published",
        "statusLabel": "Published",
        "path": str(target.relative_to(ROOT)),
        "title": title,
        "slug": target.stem,
    }
    update_status_counts(data)
    save_inventory(data)
    url = f"/{entry_type}/{target.stem}/"
    return {
        "status": "published",
        "path": str(target.relative_to(ROOT)),
        "url": url,
        "message": "Draft published.",
    }


def upload_image(fields: dict[str, str], files: dict[str, object]) -> dict[str, object]:
    item_id = clean_space(fields.get("id"))
    alt_text = content_text(fields.get("alt"))
    if not item_id:
        raise ValueError("Missing inventory item id.")
    if not alt_text:
        raise ValueError("Alt text is required.")
    upload = files.get("image")
    if not upload:
        raise ValueError("Image file is required.")

    data = load_inventory()
    item = inventory_item(data, item_id)
    source_filename = clean_space(upload["filename"])
    content = upload["content"]
    now = datetime.now()
    folder = IMAGE_ROOT / f"{now:%Y}" / f"{now:%m}"
    folder.mkdir(parents=True, exist_ok=True)
    base_name = slugify(f"{item.get('sourceSlug')}-{alt_text}")[:90]
    target = unique_path(folder / f"{base_name}.webp")

    temp = target.with_suffix(".upload")
    temp.write_bytes(content)
    try:
        with Image.open(temp) as image:
            image = image.convert("RGB")
            if image.width > IMAGE_MAX_WIDTH:
                ratio = IMAGE_MAX_WIDTH / image.width
                image = image.resize((IMAGE_MAX_WIDTH, max(1, round(image.height * ratio))), Image.LANCZOS)
            image.save(target, "WEBP", quality=IMAGE_QUALITY, method=6)
    finally:
        temp.unlink(missing_ok=True)

    with Image.open(target) as optimized:
        width, height = optimized.size
    size = target.stat().st_size
    public_path = "/" + str(target.relative_to(ROOT / "public"))
    image_url = f"{IMAGE_BASE_URL}{public_path}"
    markdown = f"![{alt_text}]({image_url})"
    append_image_row([
        now.isoformat(timespec="seconds"),
        item_id,
        item.get("draftTitle", ""),
        alt_text,
        target.name,
        public_path,
        image_url,
        width,
        height,
        size,
        source_filename,
        str(target.relative_to(ROOT)),
    ])
    return {
        "path": str(target.relative_to(ROOT)),
        "publicPath": public_path,
        "url": image_url,
        "alt": alt_text,
        "markdown": markdown,
        "width": width,
        "height": height,
        "bytes": size,
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload: dict[str, object], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_json({"ok": True})
            return
        if parsed.path == "/draft":
            try:
                item_id = clean_space(parse_qs(parsed.query).get("id", [""])[0])
                if not item_id:
                    raise ValueError("Missing inventory item id.")
                self.send_json(get_draft(item_id))
            except Exception as exc:
                self.send_json({"error": str(exc)}, 400)
            return
        self.send_json({"error": "Not found."}, 404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in {"/create-blog", "/save-draft", "/publish-draft", "/upload-image"}:
            self.send_json({"error": "Not found."}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length)
            if parsed.path == "/upload-image":
                fields, files = parse_multipart(self.headers, raw_body)
                self.send_json(upload_image(fields, files))
                return
            payload = json.loads(raw_body.decode("utf-8") or "{}")
            item_id = clean_space(payload.get("id"))
            if not item_id:
                raise ValueError("Missing inventory item id.")
            if parsed.path == "/create-blog":
                self.send_json(create_blog(item_id))
            elif parsed.path == "/save-draft":
                self.send_json(save_draft(item_id, payload))
            else:
                self.send_json(publish_draft(item_id, payload))
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")


def main() -> None:
    server = HTTPServer((HOST, PORT), Handler)
    print(f"WBL blog action server running at http://{HOST}:{PORT}")
    print("Endpoints: POST /create-blog, GET /draft, POST /save-draft, POST /publish-draft, POST /upload-image")
    server.serve_forever()


if __name__ == "__main__":
    main()
