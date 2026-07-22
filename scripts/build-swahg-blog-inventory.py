#!/usr/bin/env python3
"""Build the WBL SWAHG blog inventory JSON from the live Google Sheet."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import gspread


SHEET_ID = "1u-R_VoDOseCXQzrRay9nRmkbSJRB4Z4POZcqm5Ydo58"
SERVICE_ACCOUNT = "/Users/laladimalanta/.config/gcloud/claude-sheets-key.json"
OUT = Path("src/data/swahgBlogInventory.json")
CONTENT_ROOT = Path("src/content")
DRAFT_ROOT = Path("src/content/drafts/swahg")
TYPE_DIRS = {
    "guide": "guides",
    "story": "stories",
    "note": "notes",
    "reflection": "reflections",
    "tool": "tools",
}

TOPIC_LABELS = {
    "beginner-freelancing": "Beginner freelancing",
    "client-acquisition": "Client acquisition",
    "portfolio-and-brand": "Portfolio and brand",
    "communication": "Communication",
    "tools-and-systems": "Tools and systems",
    "social-media": "Social media",
    "content-creation": "Content creation",
    "career-paths": "Career paths",
    "community-and-leadership": "Community and leadership",
    "mindset-and-faith": "Mindset and faith",
    "program-design": "Program design",
}

CATEGORY_ORDER = [
    "Freelancing Foundations",
    "Skill Paths and Tools",
    "Social Media and Marketing",
    "Personal Brand and Content",
    "SWAHG Stories",
    "Program and Community",
    "Published WBL Library",
]

SITE_TOPIC_LABELS = {
    "ai-content-systems": "AI Content Systems",
    "prompt-engineering": "Prompt Engineering",
    "automation": "Automation and Workflows",
    "content-strategy": "Content Strategy and SEO",
    "data-architecture": "Data Architecture",
    "freelancing": "Freelancing and Remote Work",
    "swahg-stories": "SWAHG Stories",
    "newsletter-craft": "Newsletter Craft",
    "b2b-saas": "B2B SaaS Marketing",
    "faith-theology": "Faith and Theology",
    "health": "Health and Chronic Illness",
    "filipino-professionals": "Filipino Professionals",
    "community": "Community Building",
    "marriage-family": "Marriage and Family",
    "learning-in-public": "Learning in Public",
    "workstation-setup": "My Workstation and Tools",
}

TYPE_LABELS = {
    "guide": "Guide",
    "story": "Story",
    "note": "Field Note",
    "reflection": "Reflection",
    "tool": "Tool",
}


def slugify(value: str) -> str:
    value = (value or "").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "item"


def clean_space(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def content_text(value: object) -> str:
    return clean_space(value).replace("\u2014", ",").replace("\u2013", "-")


def excerpt(text: object, limit: int = 260) -> str:
    text = content_text(text)
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(".,;:")
    return cut + "..."


def blog_category(row: dict[str, object]) -> str:
    cat = clean_space(row.get("category"))
    section = clean_space(row.get("section"))
    title = clean_space(row.get("title"))
    blob = f"{cat} {section} {title}".lower()
    if "stories" in blob:
        return "SWAHG Stories"
    if "fresh starter" in blob or "freelancer essentials" in blob or "freelancing journey" in blob:
        return "Freelancing Foundations"
    if "smm" in blob or "prismm" in blob or "traffic" in blob or "tutorial" in blob:
        return "Social Media and Marketing"
    if "career path" in blob or "enhancement" in blob or "business skills" in blob or "technical skills" in blob:
        return "Skill Paths and Tools"
    if "personal brand" in blob or "online presence" in blob or "writing" in blob:
        return "Personal Brand and Content"
    return "Program and Community"


def topics_for(row: dict[str, object], category: str) -> list[str]:
    text = " ".join(clean_space(row.get(k)) for k in ["title", "category", "section", "body_text"]).lower()
    rules = [
        ("beginner-freelancing", ["fresh starter", "where to start", "freelancer essentials", "freelancing journey", "freelancer or va", "common mistakes"]),
        ("client-acquisition", ["client", "outreach", "onlinejobs", "getting hired", "interview", "platforms", "sdr", "sales"]),
        ("portfolio-and-brand", ["portfolio", "brand", "online presence", "personal branding", "profile", "resume"]),
        ("communication", ["english", "email address", "communication", "interview", "customer support"]),
        ("tools-and-systems", ["trello", "browser", "storage", "computer", "time tracking", "crm", "project management", "pm tool", "work files"]),
        ("social-media", ["social media", "smm", "instagram", "facebook", "pinterest", "youtube", "chatbot"]),
        ("content-creation", ["content", "writing", "article", "video editing", "creative", "artistic"]),
        ("career-paths", ["career path", "technical skills", "business skills", "specialized", "agency", "account management"]),
        ("community-and-leadership", ["community", "leadership", "mentorship", "internship", "accountability"]),
        ("mindset-and-faith", ["story", "comfort zone", "better plans", "chance", "race to run", "bloom", "god", "plans"]),
    ]
    found = [slug for slug, needles in rules if any(needle in text for needle in needles)]
    if not found:
        found = ["program-design"]
    if category == "SWAHG Stories" and "mindset-and-faith" not in found:
        found.append("mindset-and-faith")
    return found[:4]


def format_title(title: object) -> str:
    title = clean_space(title)
    replacements = {
        "SMM": "Social Media Management",
        "VA": "Virtual Assistant",
        "CRM": "CRM",
        "FB": "Facebook",
    }
    for source, target in replacements.items():
        title = re.sub(rf"\b{source}\b", target, title, flags=re.I)
    return title


def draft_title(row: dict[str, object], category: str, topics: list[str]) -> str:
    title = format_title(row.get("title"))
    if category == "SWAHG Stories":
        return f"What {title} teaches about starting again"
    if "client-acquisition" in topics:
        return f"How to use {title} to find better freelance opportunities"
    if "tools-and-systems" in topics:
        return f"The beginner freelancer guide to {title}"
    if "social-media" in topics:
        return f"What new freelancers should understand about {title}"
    if "portfolio-and-brand" in topics:
        return f"How to turn {title} into a visible online proof of work"
    if "communication" in topics:
        return f"Why {title} matters before your first client call"
    return f"What beginners can learn from {title}"


def angle(row: dict[str, object], category: str, topics: list[str]) -> str:
    title = clean_space(row.get("title"))
    if category == "SWAHG Stories":
        return "Turn this story into a personal essay about courage, provision, and the quiet decisions behind remote work growth."
    if "client-acquisition" in topics:
        return "Frame the post around practical steps a beginner can take before applying, pitching, or interviewing."
    if "tools-and-systems" in topics:
        return "Use this as a setup checklist that helps a new freelancer remove friction before paid work begins."
    if "social-media" in topics:
        return "Translate the lesson into a beginner-friendly explanation of what clients actually need from social media help."
    if "portfolio-and-brand" in topics:
        return "Make the post about visible proof: what to show, how to explain it, and why trust comes before confidence."
    if "communication" in topics:
        return "Use this topic to explain the communication habits that make remote work feel safer for clients and freelancers."
    if "career-paths" in topics:
        return "Compare possible paths and help readers choose one next skill instead of trying to learn everything at once."
    return f"Use {title} as a source note for a practical WBL blog post aimed at beginners building a freelance life from home."


def normalized_source_category(row: dict[str, object]) -> str:
    return clean_space(row.get("category")).replace(" \u2192 ", " / ")


def frontmatter_value(text: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*[\"']?(.*?)[\"']?\s*$", text, re.MULTILINE)
    return clean_space(match.group(1)) if match else ""


def frontmatter_array(text: str, key: str) -> list[str]:
    match = re.search(rf"^{re.escape(key)}:\s*\[(.*?)\]\s*$", text, re.MULTILINE)
    if not match:
        return []
    return [clean_space(value).strip("\"'") for value in match.group(1).split(",") if clean_space(value)]


def body_excerpt(text: str) -> str:
    body = re.sub(r"^---.*?---", "", text, count=1, flags=re.DOTALL).strip()
    body = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", body)
    body = re.sub(r"\[[^\]]+\]\([^)]+\)", lambda match: match.group(0).split("](")[0].lstrip("["), body)
    body = re.sub(r"^#+\s*", "", body, flags=re.MULTILINE)
    body = body.replace("\u2014", ",").replace("\u2013", "-")
    return excerpt(body, 260)


def existing_content_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for entry_type, directory in TYPE_DIRS.items():
        for path in sorted((CONTENT_ROOT / directory).glob("*.md")):
            text = path.read_text()
            title = content_text(frontmatter_value(text, "title"))
            description = content_text(frontmatter_value(text, "description"))
            topics = frontmatter_array(text, "topics")
            entries.append({
                "id": f"wbl-{path.stem}",
                "sourceTitle": title,
                "sourceCategory": f"WBL Site / {TYPE_LABELS.get(entry_type, entry_type.title())}",
                "sourceSection": f"src/content/{directory}",
                "sourceSlug": path.stem,
                "wordCount": len(re.findall(r"\b\w+\b", re.sub(r"^---.*?---", "", text, count=1, flags=re.DOTALL))),
                "imageCount": 1 if frontmatter_value(text, "image") else 0,
                "blogCategory": "Published WBL Library",
                "topics": topics[:4],
                "topicLabels": [SITE_TOPIC_LABELS.get(topic, topic.replace("-", " ").title()) for topic in topics[:4]],
                "draftTitle": title,
                "angle": description,
                "excerpt": body_excerpt(text),
                "publication": {
                    "status": "published",
                    "statusLabel": "Published",
                    "path": str(path),
                    "title": title,
                    "slug": path.stem,
                },
            })
    return entries


def published_index() -> dict[str, dict[str, str]]:
    index: dict[str, dict[str, str]] = {}
    for path in CONTENT_ROOT.glob("*/*.md"):
        if "drafts" in path.parts:
            continue
        text = path.read_text()
        title = frontmatter_value(text, "title")
        entry = {
            "status": "published",
            "statusLabel": "Published",
            "path": str(path),
            "title": title,
            "slug": path.stem,
        }
        index[path.stem] = entry
        if title:
            index[slugify(title)] = entry
    return index


def draft_index() -> dict[str, dict[str, str]]:
    index: dict[str, dict[str, str]] = {}
    if not DRAFT_ROOT.exists():
        return index
    for path in DRAFT_ROOT.glob("*.md"):
        text = path.read_text()
        source_id = frontmatter_value(text, "swahgSourceId")
        title = frontmatter_value(text, "title")
        entry = {
            "status": "draft-started",
            "statusLabel": "Draft started",
            "path": str(path),
            "title": title,
            "slug": path.stem,
        }
        index[path.stem] = entry
        if source_id:
            index[source_id] = entry
        if title:
            index[slugify(title)] = entry
    return index


def publication_status(item: dict[str, object], published: dict[str, dict[str, str]], drafts: dict[str, dict[str, str]]) -> dict[str, str]:
    candidates = [
        clean_space(item.get("sourceSlug")),
        slugify(clean_space(item.get("sourceTitle"))),
        slugify(clean_space(item.get("draftTitle"))),
        clean_space(item.get("id")),
    ]
    for candidate in candidates:
        if candidate in published:
            return published[candidate]
    for candidate in candidates:
        if candidate in drafts:
            return drafts[candidate]
    return {"status": "pending", "statusLabel": "Not yet published", "path": "", "title": "", "slug": ""}


def build() -> dict[str, object]:
    gc = gspread.service_account(filename=SERVICE_ACCOUNT)
    sh = gc.open_by_key(SHEET_ID)
    rows = sh.worksheet("Content Library").get_all_records()
    published = published_index()
    drafts = draft_index()

    items = []
    for index, row in enumerate(rows, start=1):
        category = blog_category(row)
        topics = topics_for(row, category)
        source_title = clean_space(row.get("title"))
        item = {
            "id": clean_space(row.get("page_id")) or f"item-{index}",
            "sourceTitle": source_title,
            "sourceCategory": normalized_source_category(row),
            "sourceSection": clean_space(row.get("section")),
            "sourceSlug": clean_space(row.get("slug")),
            "wordCount": int(row.get("word_count") or 0),
            "imageCount": int(row.get("image_count") or 0),
            "blogCategory": category,
            "topics": topics,
            "topicLabels": [TOPIC_LABELS[t] for t in topics],
            "draftTitle": draft_title(row, category, topics),
            "angle": angle(row, category, topics),
            "excerpt": excerpt(row.get("body_text") or source_title),
        }
        item["publication"] = publication_status(item, published, drafts)
        items.append(item)

    covered_slugs = {
        clean_space(item.get("publication", {}).get("slug"))
        for item in items
        if item.get("publication", {}).get("status") == "published"
    }
    covered_slugs.update(slugify(clean_space(item.get("sourceTitle"))) for item in items)
    for entry in existing_content_entries():
        entry_slug = clean_space(entry.get("sourceSlug"))
        entry_title_slug = slugify(clean_space(entry.get("sourceTitle")))
        if entry_slug not in covered_slugs and entry_title_slug not in covered_slugs:
            items.append(entry)

    items.sort(key=lambda item: (
        CATEGORY_ORDER.index(item["blogCategory"]) if item["blogCategory"] in CATEGORY_ORDER else 99,
        item["sourceTitle"].lower(),
    ))

    return {
        "metadata": {
            "title": "WBL SWAHG Blog Content Database",
            "source": "SWAHG Open University Inventory",
            "sheetId": SHEET_ID,
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "itemCount": len(items),
            "categories": [
                {"slug": slugify(category), "label": category, "count": sum(1 for item in items if item["blogCategory"] == category)}
                for category in CATEGORY_ORDER
                if any(item["blogCategory"] == category for item in items)
            ],
            "topics": [
                {
                    "slug": slug,
                    "label": {**TOPIC_LABELS, **SITE_TOPIC_LABELS}.get(slug, slug.replace("-", " ").title()),
                    "count": sum(1 for item in items if slug in item["topics"]),
                }
                for slug in sorted({topic for item in items for topic in item["topics"]})
            ],
            "statuses": [
                {"slug": status, "label": label, "count": sum(1 for item in items if item["publication"]["status"] == status)}
                for status, label in [
                    ("pending", "Not yet published"),
                    ("draft-started", "Draft started"),
                    ("published", "Published"),
                ]
            ],
        },
        "items": items,
    }


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(build(), indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
