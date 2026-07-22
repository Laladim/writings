#!/usr/bin/env python3
"""Refresh the public BFF job board from vetted direct ATS job boards."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BOARD = ROOT / "public" / "bonafide-filipino-freelancers" / "jobs"
DATA = BOARD / "data"
MAX_POSTED_AGE_DAYS = 30
MAX_JOBS = 40
MIN_JOBS = 20
MIN_DISTINCT_SOURCES = 3
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Every accepted row must end at the employer or staffing firm's public ATS
# page. Aggregators are intentionally excluded because they hide or rewrite
# eligibility, dates, and application destinations.
ASHBY_BOARDS = (
    {"slug": "multiplymii", "source": "MultiplyMii", "cap": 8, "staffing": True},
    {"slug": "va4u", "source": "VA4U", "cap": 7, "staffing": True},
    {"slug": "EYT", "source": "Extend Your Team", "cap": 4, "staffing": True, "team_is_client": True},
    {"slug": "clickup", "source": "ClickUp", "cap": 2, "staffing": False},
    {"slug": "clipboard", "source": "Clipboard Health", "cap": 1, "staffing": False},
)
SOURCE_CAPS = {board["source"]: int(board["cap"]) for board in ASHBY_BOARDS}
ASHBY_BOARD_BY_SLUG = {
    str(board["slug"]).casefold(): board for board in ASHBY_BOARDS
}
ASHBY_API_PREFIX = "https://api.ashbyhq.com/posting-api/job-board/"
DIRECT_ATS_DOMAINS = {"jobs.ashbyhq.com"}
AGGREGATOR_DOMAINS = {
    "himalayas.app",
    "jobicy.com",
    "nodesk.co",
    "remoteok.com",
    "remotive.com",
    "weworkremotely.com",
}

ROLE_LABELS = [
    "Customer Support",
    "Content Specialist",
    "Community Manager",
    "SEO",
    "Virtual Assistant",
    "Executive Assistant",
    "Accounting & Bookkeeping",
    "E-commerce",
    "Operations & Admin",
]

SUMMARY_KEYS = [
    "id",
    "title",
    "company",
    "role_lala_category",
    "posted",
    "ph_eligible",
    "newbie_score",
    "is_newbie_friendly",
    "newbie_friendly",
    "fit_score",
    "job_location",
    "salary_range",
    "apply_url",
    "ats_platform",
    "contract_type",
    "tools_required",
    "why_it_fits",
    "why_it_might_not",
    "archetype_labels",
    "archetype_primary",
    "resume_keywords",
    "resume_angle",
    "match_confidence",
    "quality_label",
    "quality_reasons",
    "source",
    "source_mode",
    "tier",
]

DETAIL_KEYS = [
    "id",
    "date_added",
    "status",
    "title",
    "company",
    "posted",
    "role_lala_category",
    "seniority",
    "job_location",
    "remote_type",
    "timezone_required",
    "ph_eligible",
    "contract_type",
    "salary_range",
    "pay_type",
    "tools_required",
    "skill_match_count",
    "hard_knockouts",
    "fit_score",
    "newbie_score",
    "is_newbie_friendly",
    "newbie_friendly",
    "why_it_fits",
    "why_it_might_not",
    "apply_url",
    "ats_platform",
    "industry",
    "about_the_company",
    "position_overview",
    "key_responsibilities",
    "qualifications",
    "what_we_offer",
    "location_work_setup",
    "hours_schedule",
    "application_process",
    "archetype_labels",
    "archetype_primary",
    "archetype_reasons",
    "resume_keywords",
    "resume_angle",
    "missing_skill_suggestions",
    "match_confidence",
    "resume_match_profile",
    "quality_label",
    "quality_reasons",
    "job_id",
    "source",
    "source_mode",
    "source_url",
    "tier",
    "raw_description",
    "clean_description",
    "role_family",
    "ph_eligibility",
    "risk_flags",
    "quality_status",
    "reject_reasons",
    "description_hash",
    "duplicate_keys",
    "duplicate_sources",
]

RESUME_KEYS = [
    "profile_version",
    "job_id",
    "title",
    "company",
    "source",
    "source_mode",
    "tier",
    "source_url",
    "apply_url",
    "posted_at",
    "discovered_at",
    "role_family",
    "archetype_primary",
    "archetype_secondary",
    "resume_keywords",
    "resume_angle",
    "missing_skill_suggestions",
    "match_confidence",
    "risk_flags",
    "ph_eligibility",
    "tools",
    "quality_label",
    "quality_reasons",
    "resume_match_profile",
]

TOOLS = [
    "canva",
    "webflow",
    "linkedin",
    "facebook",
    "instagram",
    "tiktok",
    "youtube",
    "google workspace",
    "google sheets",
    "google docs",
    "google calendar",
    "gmail",
    "crm",
    "hubspot",
    "salesforce",
    "zendesk",
    "intercom",
    "freshdesk",
    "zoho",
    "microsoft office",
    "excel",
    "outlook",
    "word",
    "powerpoint",
    "email support",
    "chat support",
    "zoom",
    "slack",
    "customer service",
    "customer support",
    "saas",
    "social media",
    "content creation",
    "copywriting",
    "community management",
    "content calendar",
    "data entry",
    "admin",
]

TITLE_KNOCKOUT = re.compile(
    r"\b(vp|vice president|director|head of|chief|cto|cmo|ceo|cfo|"
    r"software engineer|backend|frontend|full[- ]?stack|devops|sre|developer|programmer|"
    r"account executive|sales representative|sales development|sdr|bdr|inside sales|cold call|telemarket|appointment setter|"
    r"business development|team lead|engineering manager|growth lead|tax reviewer|benefits representative|"
    r"horticulturalist|agronomist|cybersecurity|quality assurance engineer|dental lab technician)\b",
    re.I,
)
TEXT_KNOCKOUT = re.compile(
    r"\b(us work authorization|must be based in (the )?(us|usa|united states)|"
    r"resident of (the )?(us|usa|united states)|us citizen|green card|"
    r"no international candidates|phone[- ]based|cold[- ]?calling|sales quota)\b",
    re.I,
)
LOW_TRUST = re.compile(r"\b(nogigiddy|gigs\.nogigiddy\.com|no degree required|exclusive gig opportunities)\b", re.I)
SENSITIVE_INDUSTRY = re.compile(r"\b(casino|gambling|sportsbook|betting)\b", re.I)
US_LOCATION = re.compile(
    r"\b(united states|usa|u\.s\.|remote[- ,]+us|california|new york|texas|florida|"
    r"indiana|ohio|georgia|maryland|new jersey|pennsylvania|washington|colorado|illinois|michigan|virginia)\b",
    re.I,
)
NON_PH_LOCATION = re.compile(
    r"\b(europe|greece|canada|united kingdom|uk|australia|new zealand|india|hyderabad|"
    r"germany|italy|chile|mexico|colombia|brazil|argentina|costa rica|nicaragua|"
    r"german[- ]speaking|french[- ]speaking|spanish[- ]speaking|italian[- ]speaking)\b",
    re.I,
)
PH_LOCATION = re.compile(
    r"\b(philippines|filipino|metro manila|manila|national capital region|"
    r"cebu|davao|luzon|visayas|mindanao)\b",
    re.I,
)
PLACEHOLDER_COMPANY = re.compile(
    r"^(company|confidential|employer|name|not listed|unknown|n/?a|test(?: abc)?)$",
    re.I,
)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ASHBY_JOB_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)

DATA_EXPORT_NAMES = {
    "jobs.json",
    "accepted-job.schema.json",
    "resume-match-profiles.json",
    "resume-match-profiles.schema.json",
    "run-manifest.json",
    "run-manifest.schema.json",
    "source-health.json",
    "source-health.schema.json",
}


def request(url: str, accept: str = "application/json", retries: int = 2) -> bytes:
    headers = {"User-Agent": UA, "Accept": accept}
    last_error = ""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.read()
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            time.sleep(2 ** attempt)
    raise RuntimeError(last_error)


def fetch_json(url: str) -> Any:
    return json.loads(request(url).decode("utf-8", errors="ignore"))


def fetch_text(url: str) -> str:
    return request(url, "text/html,application/rss+xml,application/xml,*/*").decode("utf-8", errors="ignore")


def clean_text(value: str) -> str:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
    }
    text = str(value or "")
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("ascii", "ignore").decode("ascii")


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", clean_text(text)).strip()[:12000]


def parse_date(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000 if value > 1e12 else value, tz=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            return ""
    raw = str(value).strip()
    if not raw:
        return ""
    if DATE_RE.match(raw[:10]):
        return raw[:10]
    try:
        return parsedate_to_datetime(raw).strftime("%Y-%m-%d")
    except Exception:
        return ""


def age_days(posted: str) -> int:
    posted_date = datetime.strptime(posted, "%Y-%m-%d").date()
    return (datetime.now().date() - posted_date).days


def normalize_job(
    title: str,
    company: str,
    description: str,
    location: str,
    tags: list[str],
    apply_url: str,
    source: str,
    posted: str,
    salary: str = "",
    job_type: str = "",
    industry: str = "",
    *,
    source_url: str = "",
    source_mode: str = "automated",
    ats_platform: str = "",
    is_remote: bool | None = None,
    workplace_type: str = "",
) -> dict[str, Any] | None:
    title = str(title or "").strip()
    company = str(company or "").strip()
    if not title or not company:
        return None
    return {
        "title": clean_text(title),
        "company": clean_text(company),
        "description": strip_html(description),
        "location": clean_text(location).strip(),
        "tags": [clean_text(tag).strip() for tag in tags if str(tag).strip()],
        "apply_url": clean_text(apply_url).strip(),
        "source": source,
        "posted": parse_date(posted),
        "salary": clean_text(salary).strip(),
        "job_type": clean_text(job_type).strip(),
        "industry": clean_text(industry).strip(),
        "source_url": clean_text(source_url or apply_url).strip(),
        "source_mode": clean_text(source_mode).strip(),
        "ats_platform": clean_text(ats_platform or source).strip(),
        "is_remote": is_remote if isinstance(is_remote, bool) else None,
        "workplace_type": clean_text(workplace_type).strip(),
    }


def fetch_remoteok() -> tuple[list[dict[str, Any]], str]:
    rows = []
    data = fetch_json("https://remoteok.com/api")
    for item in data[1:] if isinstance(data, list) else []:
        row = normalize_job(
            item.get("position"),
            item.get("company"),
            item.get("description"),
            item.get("location"),
            item.get("tags") or [],
            item.get("url") or item.get("apply_url"),
            "RemoteOK",
            item.get("date"),
            "",
            "",
            "",
        )
        if row:
            rows.append(row)
    return rows, ""


def fetch_remotive() -> tuple[list[dict[str, Any]], str]:
    rows = []
    data = fetch_json("https://remotive.com/api/remote-jobs?limit=500")
    for item in (data or {}).get("jobs", []):
        row = normalize_job(
            item.get("title"),
            item.get("company_name"),
            item.get("description"),
            item.get("candidate_required_location"),
            item.get("tags") or [],
            item.get("url"),
            "Remotive",
            item.get("publication_date"),
            item.get("salary") or "",
            item.get("job_type") or "",
            item.get("category") or "",
        )
        if row:
            rows.append(row)
    return rows, ""


def fetch_himalayas() -> tuple[list[dict[str, Any]], str]:
    rows = []
    for page in range(3):
        data = fetch_json(f"https://himalayas.app/jobs/api?limit=100&offset={page * 100}")
        jobs = (data or {}).get("jobs") or []
        if not jobs:
            break
        for item in jobs:
            locations = item.get("locationRestrictions") or []
            row = normalize_job(
                item.get("title"),
                item.get("companyName"),
                item.get("description") or item.get("excerpt"),
                ", ".join(locations) if isinstance(locations, list) else str(locations),
                item.get("categories") or [],
                item.get("applicationLink") or "",
                "Himalayas",
                item.get("pubDate") or item.get("createdAt") or item.get("publishedAt"),
                "",
                item.get("employmentType") or "",
                "",
            )
            if row:
                rows.append(row)
        time.sleep(0.4)
    return rows, ""


def rss_field(item: str, name: str) -> str:
    match = re.search(rf"<{re.escape(name)}[^>]*>(?:<!\[CDATA\[)?(.+?)(?:\]\]>)?</{re.escape(name)}>", item, re.S | re.I)
    return html.unescape(match.group(1).strip()) if match else ""


def fetch_rss_source(source: str, urls: list[str]) -> tuple[list[dict[str, Any]], str]:
    rows = []
    errors = []
    for url in urls:
        try:
            body = fetch_text(url)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
            continue
        for item in re.findall(r"<item\b[^>]*>(.+?)</item>", body, re.S | re.I):
            title_raw = rss_field(item, "title")
            link = rss_field(item, "link") or rss_field(item, "guid")
            description = rss_field(item, "description") or rss_field(item, "content:encoded")
            region = rss_field(item, "region") or rss_field(item, "location") or "Remote"
            posted = rss_field(item, "pubDate") or rss_field(item, "dc:date")
            company = source
            title = title_raw
            if ": " in title_raw:
                company, title = title_raw.split(": ", 1)
            row = normalize_job(title, company, description, region, [], link, source, posted)
            if row:
                rows.append(row)
    return rows, "; ".join(errors)


def fetch_jobicy() -> tuple[list[dict[str, Any]], str]:
    rows = []
    data = fetch_json("https://jobicy.com/api/v2/remote-jobs?count=100")
    for item in (data or {}).get("jobs", []):
        tags = item.get("jobIndustry") or item.get("jobType") or []
        if isinstance(tags, str):
            tags = [tags]
        salary_bits = [item.get("annualSalaryMin"), item.get("annualSalaryMax")]
        salary = "-".join(str(bit) for bit in salary_bits if bit)
        row = normalize_job(
            item.get("jobTitle") or item.get("title"),
            item.get("companyName") or item.get("company"),
            item.get("jobDescription") or item.get("jobExcerpt"),
            item.get("jobGeo") or "Remote",
            tags,
            item.get("url") or item.get("jobUrl"),
            "Jobicy",
            item.get("pubDate") or item.get("datePosted"),
            salary,
            item.get("jobType") or "",
            ", ".join(tags[:3]),
        )
        if row:
            rows.append(row)
    return rows, ""


def fetch_ashby_board(board: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    """Fetch one employer's published jobs from Ashby's public posting API."""
    source = board["source"]
    api_url = f"{ASHBY_API_PREFIX}{urllib.parse.quote(board['slug'], safe='')}"
    board_url = f"https://jobs.ashbyhq.com/{urllib.parse.quote(board['slug'], safe='')}"
    payload = fetch_json(api_url)
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
    rows: list[dict[str, Any]] = []
    for item in jobs:
        if not isinstance(item, dict) or item.get("isListed") is False:
            continue
        tags = [
            value
            for value in (item.get("department"), item.get("team"))
            if isinstance(value, str) and value.strip()
        ]
        company = source
        if board.get("staffing"):
            team = clean_text(item.get("team") or "").strip()
            if board.get("team_is_client") and team:
                company = f"{team} via {source}"
            else:
                company = f"Undisclosed client via {source}"
        row = normalize_job(
            item.get("title"),
            company,
            item.get("descriptionPlain") or item.get("descriptionHtml") or "",
            item.get("location") or "",
            tags,
            item.get("jobUrl") or "",
            source,
            item.get("publishedAt"),
            "",
            item.get("employmentType") or "",
            item.get("department") or "",
            source_url=board_url,
            source_mode="direct_ats",
            ats_platform="Ashby",
            is_remote=item.get("isRemote"),
            workplace_type=item.get("workplaceType") or "",
        )
        if row:
            rows.append(row)
    return rows, ""


FETCHERS = {
    board["source"]: (lambda board=board: fetch_ashby_board(board))
    for board in ASHBY_BOARDS
}


def role_category(title: str, text: str = "") -> str:
    """Classify from the title only; descriptions may not invent a role."""
    del text
    value = clean_text(title).lower()
    if re.search(
        r"customer (service|support|experience|care|success)|client support|"
        r"technical support|support specialist|customer happiness|"
        r"technical account manager|technical implementation manager",
        value,
    ):
        return "Customer Support"
    if re.search(
        r"accountant|accounting|bookkeeper|bookkeeping|billing representative|"
        r"accounts? (?:receivable|payable)|\bap administrator\b|"
        r"assistant controller|\bcontroller\b|finance & admin support",
        value,
    ):
        return "Accounting & Bookkeeping"
    if re.search(
        r"e-?commerce|amazon (?:ppc|account|operations)|marketplace specialist",
        value,
    ):
        return "E-commerce"
    if re.search(
        r"executive assistant|administrative assistant|admin assistant|"
        r"personal assistant|project assistant|scheduler",
        value,
    ):
        return "Executive Assistant"
    if re.search(
        r"virtual assistant|\bva\b|data entry|back office|"
        r"\badmin(?:istrative)? support\b|\bsales admin\b|"
        r"\boperations assistant\b",
        value,
    ):
        return "Virtual Assistant"
    if re.search(
        r"operations (?:lead|coordinator|specialist)|administration support|"
        r"administrative coordinator|office coordinator|logistics administrator",
        value,
    ):
        return "Operations & Admin"
    if re.search(r"community manager|community support|moderator", value):
        return "Community Manager"
    if re.search(r"\bseo\b|search engine", value):
        return "SEO"
    if re.search(
        r"content|copywriter|writer|editor|social media|communications|"
        r"marketing(?: [a-z&-]+){0,2} (?:coordinator|manager|administrator)|"
        r"marketing specialist|ads creative strategist",
        value,
    ):
        return "Content Specialist"
    return ""


def seniority(title: str) -> str:
    if re.search(r"\b(junior|jr|associate|coordinator|assistant|entry|intern)\b", title, re.I):
        return "Junior"
    if re.search(r"\b(senior|sr|lead|principal|staff)\b", title, re.I):
        return "Senior"
    return "Mid"


def ph_eligibility(location: str, text: str, source: str) -> tuple[str, str, int]:
    """Return Yes only when the structured location explicitly names the PH."""
    del text, source
    location_value = clean_text(location).strip()
    if PH_LOCATION.search(location_value):
        return "Yes", "Philippines explicitly listed", 20
    if US_LOCATION.search(location_value) or NON_PH_LOCATION.search(location_value):
        return "No", "Structured location excludes the Philippines", 0
    return "Maybe", "Structured location does not prove Philippines eligibility", 0


def contract_type(text: str, job_type: str) -> str:
    structured = re.sub(r"[^a-z]", "", clean_text(job_type).lower())
    structured_types = {
        "fulltime": "Full-time",
        "parttime": "Part-time",
        "contract": "Contract",
        "contractor": "Contract",
        "freelance": "Contract",
        "temporary": "Temporary",
        "temp": "Temporary",
    }
    if structured in structured_types:
        return structured_types[structured]

    blob = clean_text(text).lower()
    if "part-time" in blob or "part time" in blob:
        return "Part-time"
    if "contract" in blob or "freelance" in blob:
        return "Contract"
    if "temporary" in blob:
        return "Temporary"
    if "full-time" in blob or "full time" in blob:
        return "Full-time"
    return "Unspecified"


def matched_tools(text: str, tags: list[str]) -> list[str]:
    blob = f"{text} {' '.join(tags)}".lower()
    return [tool for tool in TOOLS if tool in blob]


def archetype_for(role: str, newbie: bool) -> tuple[str, str]:
    if role in {
        "Virtual Assistant",
        "Executive Assistant",
        "Accounting & Bookkeeping",
        "Operations & Admin",
    }:
        primary = "Generalist Admin"
        labels = "Generalist Admin, Corporate Transitioner, Fresh Starter"
    elif role in {"Content Specialist", "E-commerce"}:
        primary = "Creative Specialist"
        labels = "Creative Specialist, Solo Entrepreneur, Polished Freelancer"
    elif role == "Community Manager":
        primary = "Creative Specialist"
        labels = "Creative Specialist, Corporate Transitioner, Fresh Starter"
    else:
        primary = "Corporate Transitioner"
        labels = "Corporate Transitioner, Fresh Starter, Generalist Admin"
    if newbie and "Fresh Starter" not in labels:
        labels = f"{labels}, Fresh Starter"
    return primary, labels


def stable_id(job: dict[str, Any]) -> str:
    key = "|".join([job["title"].lower(), job["company"].lower(), job.get("apply_url", "").lower()])
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]


def hostname(url: str) -> str:
    try:
        return (urllib.parse.urlsplit(str(url)).hostname or "").rstrip(".").lower()
    except ValueError:
        return ""


def domain_matches(host: str, domains: set[str]) -> bool:
    return any(host == domain or host.endswith(f".{domain}") for domain in domains)


def ashby_url_parts(url: str) -> list[str]:
    try:
        parsed = urllib.parse.urlsplit(str(url).strip())
        port = parsed.port
    except ValueError:
        return []
    host = (parsed.hostname or "").rstrip(".").lower()
    if (
        parsed.scheme.lower() != "https"
        or host != "jobs.ashbyhq.com"
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or parsed.query
        or parsed.fragment
    ):
        return []
    return [urllib.parse.unquote(part) for part in parsed.path.split("/") if part]


def vetted_ashby_slug(url: str, *, job_page: bool) -> str:
    parts = ashby_url_parts(url)
    expected_parts = 2 if job_page else 1
    if len(parts) != expected_parts:
        return ""
    slug = parts[0].casefold()
    if slug not in ASHBY_BOARD_BY_SLUG:
        return ""
    if job_page and not ASHBY_JOB_ID_RE.fullmatch(parts[1]):
        return ""
    return slug


def is_direct_application_url(url: str) -> bool:
    return bool(vetted_ashby_slug(url, job_page=True))


def is_direct_source_url(url: str) -> bool:
    return bool(vetted_ashby_slug(url, job_page=False))


def semantic_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", clean_text(value).lower()).strip()


def semantic_job_key(job: dict[str, Any]) -> str:
    return "|".join(
        semantic_text(str(job.get(field, "")))
        for field in ("company", "title", "job_location")
    )


def description_duplicate_key(job: dict[str, Any]) -> str:
    description_hash = str(job.get("description_hash", "")).strip().lower()
    if not description_hash:
        return ""
    return "|".join(
        (
            semantic_text(str(job.get("source", ""))),
            semantic_text(str(job.get("job_location", ""))),
            description_hash,
        )
    )


def has_structured_remote_evidence(job: dict[str, Any]) -> bool:
    """Require a positive ATS remote signal without a structured conflict."""
    is_remote = job.get("is_remote")
    workplace_type = re.sub(
        r"[^a-z]", "", clean_text(job.get("workplace_type", "")).lower()
    )
    if is_remote is False or workplace_type in {"hybrid", "onsite"}:
        return False
    return is_remote is True or workplace_type == "remote"


def detail_quality_key(job: dict[str, Any]) -> tuple[int, str, str]:
    return (
        int(job.get("fit_score", 0) or 0),
        str(job.get("posted", "")),
        str(job.get("title", "")).casefold(),
    )


def deduplicate_details(details: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse title variants and identical same-source job descriptions."""
    kept: list[dict[str, Any]] = []
    for detail in details:
        duplicates = [
            existing
            for existing in kept
            if semantic_job_key(existing) == semantic_job_key(detail)
            or (
                description_duplicate_key(existing)
                and description_duplicate_key(existing)
                == description_duplicate_key(detail)
            )
        ]
        if not duplicates:
            kept.append(detail)
            continue
        winner = max([detail, *duplicates], key=detail_quality_key)
        kept = [existing for existing in kept if existing not in duplicates]
        kept.append(winner)
    return kept


def detail_record(job: dict[str, Any]) -> dict[str, Any] | None:
    if not job.get("posted") or not DATE_RE.match(job["posted"]):
        return None
    try:
        age = age_days(job["posted"])
    except ValueError:
        return None
    if age < 0 or age > MAX_POSTED_AGE_DAYS:
        return None
    text = job["description"]
    knockout_blob = f"{job['title']} {job['company']} {job['location']} {job['apply_url']} {text}"
    if PLACEHOLDER_COMPANY.fullmatch(str(job.get("company", "")).strip()):
        return None
    if job.get("source_mode") != "direct_ats":
        return None
    if not is_direct_application_url(job.get("apply_url", "")):
        return None
    if not has_structured_remote_evidence(job):
        return None
    if LOW_TRUST.search(knockout_blob):
        return None
    if SENSITIVE_INDUSTRY.search(knockout_blob):
        return None
    if TITLE_KNOCKOUT.search(job["title"]) or TEXT_KNOCKOUT.search(knockout_blob):
        return None
    role = role_category(job["title"], text)
    if not role:
        return None
    tools = matched_tools(text, job["tags"])
    skill_count = len(tools)
    ph_status, timezone_required, geo_points = ph_eligibility(job["location"], text, job["source"])
    if ph_status != "Yes":
        return None
    contract = contract_type(text, job["job_type"])
    senior = seniority(job["title"])
    senior_points = {"Junior": 10, "Mid": 8, "Senior": 4}.get(senior, 8)
    role_points = 35
    skill_points = min(skill_count * 5, 30)
    fit_score = role_points + skill_points + geo_points + senior_points
    newbie_score = 25 + (20 if senior == "Junior" else 0) + (15 if contract in {"Part-time", "Contract", "Unspecified"} else 0) + (10 if role in {"Virtual Assistant", "Executive Assistant", "Customer Support"} else 0)
    newbie = newbie_score >= 60
    primary, labels = archetype_for(role, newbie)
    why = [f"{role} match"]
    if tools:
        why.append(f"{skill_count} skills: {', '.join(tools[:5])}")
    why.append(f"{ph_status} PH eligibility signal")
    why_not = []
    if ph_status != "Yes":
        why_not.append("Confirm Philippines eligibility before applying")
    if senior == "Senior":
        why_not.append("Senior level may require stronger proof")
    if not job["salary"]:
        why_not.append("Salary not disclosed")
    job_id = stable_id(job)
    description_hash = hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    resume_keywords = ", ".join([role, *tools[:6], job["source"]])
    resume_angle = f"Position your resume around {role.lower()} reliability, written remote work, and proof with {', '.join(tools[:3]) if tools else 'relevant tools'}."
    profile = {
        "profile_version": "1.0",
        "best_archetypes": labels.split(", "),
        "primary_archetype": primary,
        "resume_keywords": resume_keywords,
        "resume_angle": resume_angle,
        "missing_skill_suggestions": ["Prepare one relevant work sample", "Mirror the job title and tools in the resume"],
    }
    raw = {
        "id": job_id,
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "status": "New",
        "title": job["title"],
        "company": job["company"],
        "posted": job["posted"],
        "role_lala_category": role,
        "seniority": senior,
        "job_location": job["location"][:140],
        "remote_type": "Remote",
        "timezone_required": timezone_required,
        "ph_eligible": ph_status,
        "contract_type": contract,
        "salary_range": job["salary"],
        "pay_type": "Listed" if job["salary"] else "",
        "tools_required": "; ".join(tools[:8]),
        "skill_match_count": skill_count,
        "hard_knockouts": "",
        "fit_score": fit_score,
        "newbie_score": newbie_score,
        "is_newbie_friendly": newbie,
        "newbie_friendly": newbie,
        "why_it_fits": ". ".join(why)[:300],
        "why_it_might_not": ". ".join(why_not)[:300],
        "apply_url": job["apply_url"],
        "ats_platform": job["ats_platform"],
        "industry": job["industry"][:80],
        "about_the_company": "",
        "position_overview": text[:2400],
        "key_responsibilities": "",
        "qualifications": "",
        "what_we_offer": "",
        "location_work_setup": job["location"],
        "hours_schedule": "",
        "application_process": "",
        "archetype_labels": labels,
        "archetype_primary": primary,
        "archetype_reasons": f"{primary} is the closest fit based on role category and tools.",
        "resume_keywords": resume_keywords,
        "resume_angle": resume_angle,
        "missing_skill_suggestions": json.dumps(profile["missing_skill_suggestions"]),
        "match_confidence": "Medium",
        "resume_match_profile": json.dumps(profile, ensure_ascii=False),
        "quality_label": "Good match" if fit_score >= 75 else "Review carefully",
        "quality_reasons": "; ".join([ph_status.lower() + " PH signal", "clear posting details"]),
        "job_id": job_id,
        "source": job["source"],
        "source_mode": job["source_mode"],
        "source_url": job["source_url"],
        "tier": "Tier 1",
        "raw_description": text,
        "clean_description": text,
        "role_family": role,
        "ph_eligibility": ph_status,
        "risk_flags": "",
        "quality_status": "accepted",
        "reject_reasons": "",
        "description_hash": description_hash,
        "duplicate_keys": json.dumps([job_id]),
        "duplicate_sources": json.dumps([{"source": job["source"], "url": job["apply_url"]}], ensure_ascii=False),
    }
    return {key: raw.get(key, "") for key in DETAIL_KEYS}


def read_existing_details() -> dict[str, dict[str, Any]]:
    details = {}
    if not DATA.exists():
        return details
    for path in DATA.glob("*.json"):
        if path.name in {"jobs.json", "accepted-job.schema.json", "resume-match-profiles.json", "resume-match-profiles.schema.json", "run-manifest.json", "run-manifest.schema.json", "source-health.json", "source-health.schema.json"}:
            continue
        try:
            payload = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and payload.get("id"):
            details[payload["id"]] = payload
    return details


def summary_record(detail: dict[str, Any]) -> dict[str, Any]:
    return {key: detail.get(key, "") for key in SUMMARY_KEYS}


def resume_record(detail: dict[str, Any]) -> dict[str, Any]:
    raw = {
        "profile_version": "1.0",
        "job_id": detail["id"],
        "title": detail["title"],
        "company": detail["company"],
        "source": detail["source"],
        "source_mode": detail["source_mode"],
        "tier": detail["tier"],
        "source_url": detail["source_url"],
        "apply_url": detail["apply_url"],
        "posted_at": detail["posted"],
        "discovered_at": detail["date_added"],
        "role_family": detail["role_family"],
        "archetype_primary": detail["archetype_primary"],
        "archetype_secondary": detail["archetype_labels"],
        "resume_keywords": detail["resume_keywords"],
        "resume_angle": detail["resume_angle"],
        "missing_skill_suggestions": detail["missing_skill_suggestions"],
        "match_confidence": detail["match_confidence"],
        "risk_flags": detail["risk_flags"],
        "ph_eligibility": detail["ph_eligibility"],
        "tools": detail["tools_required"],
        "quality_label": detail["quality_label"],
        "quality_reasons": detail["quality_reasons"],
        "resume_match_profile": json.loads(detail["resume_match_profile"] or "{}"),
    }
    return {key: raw.get(key, "") for key in RESUME_KEYS}


def select_diverse_jobs(details: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Round-robin accepted roles so one staffing source cannot own the board."""
    source_order = [board["source"] for board in ASHBY_BOARDS]
    grouped: dict[str, list[dict[str, Any]]] = {
        source: [] for source in source_order
    }
    for detail in details:
        grouped.setdefault(detail["source"], []).append(detail)
    for source, rows in list(grouped.items()):
        by_role: dict[str, list[dict[str, Any]]] = {
            role: [] for role in ROLE_LABELS
        }
        for row in rows:
            by_role.setdefault(row["role_lala_category"], []).append(row)
        for role_rows in by_role.values():
            role_rows.sort(
                key=lambda row: (
                    int(row["fit_score"]),
                    row["posted"],
                    row["title"].casefold(),
                ),
                reverse=True,
            )
        balanced: list[dict[str, Any]] = []
        while True:
            added_role = False
            for role in ROLE_LABELS:
                if by_role.get(role):
                    balanced.append(by_role[role].pop(0))
                    added_role = True
            if not added_role:
                break
        grouped[source] = balanced
    selected: list[dict[str, Any]] = []
    selected_counts: Counter[str] = Counter()
    while len(selected) < MAX_JOBS:
        added = False
        for source in source_order:
            rows = grouped.get(source, [])
            if not rows or selected_counts[source] >= SOURCE_CAPS[source]:
                continue
            selected.append(rows.pop(0))
            selected_counts[source] += 1
            added = True
            if len(selected) >= MAX_JOBS:
                break
        if not added:
            break
    return selected


def schema(title: str, required: list[str]) -> dict[str, Any]:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": title,
        "type": "object",
        "required": required,
        "additionalProperties": True,
    }


def replace_embedded_json(index_path: Path, summaries: list[dict[str, Any]], details: dict[str, dict[str, Any]]) -> None:
    text = index_path.read_text()
    role_json = json.dumps(ROLE_LABELS, ensure_ascii=False)
    summary_json = json.dumps(summaries, ensure_ascii=False)
    details_json = json.dumps(details, ensure_ascii=False)
    text, role_count = re.subn(
        r"const ROLE_LABELS = .*?;",
        f"const ROLE_LABELS = {role_json};",
        text,
        count=1,
    )
    text, jobs_count = re.subn(
        r"const EMBEDDED_JOBS = .*?;\nconst EMBEDDED_DETAILS =",
        f"const EMBEDDED_JOBS = {summary_json};\nconst EMBEDDED_DETAILS =",
        text,
        count=1,
        flags=re.S,
    )
    text, details_count = re.subn(
        r"const EMBEDDED_DETAILS = .*?;\nconst state =",
        f"const EMBEDDED_DETAILS = {details_json};\nconst state =",
        text,
        count=1,
        flags=re.S,
    )
    assert (role_count, jobs_count, details_count) == (1, 1, 1), (
        "index embedded payload replacements did not each occur exactly once"
    )
    index_path.write_text(text)


def write_outputs(details: list[dict[str, Any]], health_rows: list[dict[str, Any]]) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    staging = BOARD / "data.next"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    summaries = [summary_record(detail) for detail in details]
    detail_map = {detail["id"]: detail for detail in details}
    for detail in details:
        (staging / f"{detail['id']}.json").write_text(json.dumps(detail, ensure_ascii=False, indent=2) + "\n")
    (staging / "jobs.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2) + "\n")
    (staging / "accepted-job.schema.json").write_text(json.dumps(schema("BFF Accepted Job Detail", DETAIL_KEYS), indent=2) + "\n")
    resume = {
        "profile_version": "1.0",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "job_count": len(details),
        "jobs": [resume_record(detail) for detail in details],
    }
    (staging / "resume-match-profiles.json").write_text(json.dumps(resume, ensure_ascii=False, indent=2) + "\n")
    (staging / "resume-match-profiles.schema.json").write_text(json.dumps(schema("BFF Resume Match Profiles Export", RESUME_KEYS), indent=2) + "\n")
    run_id = datetime.now().strftime("%Y%m%dT%H%M%S")
    manifest = {
        "manifest_version": "2.0",
        "run_id": run_id,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "job_count": len(details),
        "direct_application_count": len(details),
        "distinct_sources": len({detail["source"] for detail in details}),
        "source_caps": SOURCE_CAPS,
        "newest_posting": max(detail["posted"] for detail in details),
        "oldest_posting": min(detail["posted"] for detail in details),
        "source_counts": dict(Counter(detail["source"] for detail in details)),
        "role_counts": dict(Counter(detail["role_lala_category"] for detail in details)),
        "publish_status": "publishable",
        "refresh_mode": "github-actions-direct-ats-no-secret",
        "eligibility_policy": "explicit-ph-structured-location-v1",
    }
    (staging / "run-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (staging / "run-manifest.schema.json").write_text(json.dumps(schema("BFF Job Board Run Manifest", list(manifest.keys())), indent=2) + "\n")
    source_health = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "sources": health_rows,
    }
    (staging / "source-health.json").write_text(json.dumps(source_health, ensure_ascii=False, indent=2) + "\n")
    (staging / "source-health.schema.json").write_text(json.dumps(schema("BFF Source Health Export", ["generated_at", "sources"]), indent=2) + "\n")
    staged_index = BOARD / "index.next.html"
    if staged_index.exists():
        staged_index.unlink()
    staged_index.write_text((BOARD / "index.html").read_text())
    replace_embedded_json(staged_index, summaries, detail_map)
    verify_generated_data(staging)
    verify_embedded_board(staged_index, staging)
    previous = BOARD / "data.previous"
    if previous.exists():
        shutil.rmtree(previous)
    had_previous = DATA.exists()
    try:
        if had_previous:
            DATA.rename(previous)
        staging.rename(DATA)
        staged_index.replace(BOARD / "index.html")
    except Exception:
        if previous.exists():
            if DATA.exists():
                shutil.rmtree(DATA)
            previous.rename(DATA)
        elif not had_previous and DATA.exists():
            shutil.rmtree(DATA)
        if staged_index.exists():
            staged_index.unlink()
        raise
    if previous.exists():
        shutil.rmtree(previous)


def verify_generated_data(data_dir: Path) -> None:
    jobs = json.loads((data_dir / "jobs.json").read_text())
    assert isinstance(jobs, list), "jobs.json must be an array"
    assert len(jobs) >= MIN_JOBS, f"expected at least {MIN_JOBS} jobs, found {len(jobs)}"
    ids = [job["id"] for job in jobs]
    assert len(ids) == len(set(ids)), "duplicate job ids"
    newest = max(job["posted"] for job in jobs)
    oldest = min(job["posted"] for job in jobs)
    source_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    semantic_keys: dict[str, str] = {}
    description_keys: dict[str, str] = {}
    details_by_id: dict[str, dict[str, Any]] = {}
    for job in jobs:
        assert list(job.keys()) == SUMMARY_KEYS, f"summary keys mismatch for {job['id']}"
        assert 0 <= age_days(job["posted"]) <= MAX_POSTED_AGE_DAYS, f"stale or future posting: {job['id']} {job['posted']}"
        detail_path = data_dir / f"{job['id']}.json"
        assert detail_path.exists(), f"missing detail {job['id']}"
        detail = json.loads(detail_path.read_text())
        assert list(detail.keys()) == DETAIL_KEYS, f"detail keys mismatch for {job['id']}"
        for field in SUMMARY_KEYS:
            assert detail.get(field) == job.get(field), f"summary/detail {field} mismatch for {job['id']}"
        apply_slug = vetted_ashby_slug(detail["apply_url"], job_page=True)
        source_slug = vetted_ashby_slug(detail["source_url"], job_page=False)
        assert apply_slug, f"non-vetted application URL for {job['id']}"
        assert source_slug, f"non-vetted source URL for {job['id']}"
        assert apply_slug == source_slug, f"application/source board mismatch for {job['id']}"
        expected_source = ASHBY_BOARD_BY_SLUG[apply_slug]["source"]
        assert detail["source"] == expected_source, f"source/board mismatch for {job['id']}"
        expected_id = stable_id(
            {
                "title": detail["title"],
                "company": detail["company"],
                "apply_url": detail["apply_url"],
            }
        )
        assert job["id"] == expected_id, f"job id does not reproduce for {job['id']}"
        assert detail["job_id"] == job["id"], f"detail job_id mismatch for {job['id']}"
        assert not domain_matches(hostname(detail["apply_url"]), AGGREGATOR_DOMAINS), f"aggregator application URL for {job['id']}"
        assert detail["source_mode"] == "direct_ats", f"non-direct source mode for {job['id']}"
        assert detail["ats_platform"] == "Ashby", f"unexpected ATS for {job['id']}"
        assert detail["ph_eligible"] == "Yes", f"unproven PH eligibility for {job['id']}"
        assert detail["remote_type"] == "Remote", f"unproven remote type for {job['id']}"
        assert detail["contract_type"] in {
            "Full-time", "Part-time", "Contract", "Temporary", "Unspecified"
        }, f"unexpected contract type for {job['id']}"
        expected_ph, _, _ = ph_eligibility(detail["job_location"], "", detail["source"])
        assert expected_ph == "Yes", f"PH eligibility does not reproduce for {job['id']}"
        expected_role = role_category(detail["title"])
        assert expected_role and expected_role == detail["role_lala_category"], f"role does not reproduce for {job['id']}"
        assert not PLACEHOLDER_COMPANY.fullmatch(str(detail["company"]).strip()), f"placeholder company for {job['id']}"
        assert detail["archetype_primary"], f"missing archetype for {job['id']}"
        semantic_key = semantic_job_key(detail)
        assert semantic_key not in semantic_keys, f"semantic duplicate {job['id']} and {semantic_keys.get(semantic_key)}"
        semantic_keys[semantic_key] = job["id"]
        description_hash = hashlib.sha1(
            str(detail["clean_description"]).encode("utf-8")
        ).hexdigest()[:16]
        assert detail["description_hash"] == description_hash, f"description hash mismatch for {job['id']}"
        duplicate_key = description_duplicate_key(detail)
        assert duplicate_key not in description_keys, (
            f"description duplicate {job['id']} and {description_keys.get(duplicate_key)}"
        )
        description_keys[duplicate_key] = job["id"]
        source_counts[detail["source"]] += 1
        role_counts[detail["role_lala_category"]] += 1
        details_by_id[job["id"]] = detail
    detail_file_ids = {
        path.stem
        for path in data_dir.glob("*.json")
        if path.name not in DATA_EXPORT_NAMES
    }
    assert detail_file_ids == set(ids), "detail file set does not match jobs export"
    assert len(source_counts) >= MIN_DISTINCT_SOURCES, f"expected at least {MIN_DISTINCT_SOURCES} distinct sources"
    for source, count in source_counts.items():
        assert count <= SOURCE_CAPS[source], f"source concentration cap exceeded for {source}"
    manifest = json.loads((data_dir / "run-manifest.json").read_text())
    assert manifest["manifest_version"] == "2.0", "manifest version mismatch"
    assert manifest["job_count"] == len(jobs), "manifest job count mismatch"
    assert manifest["direct_application_count"] == len(jobs), "manifest direct count mismatch"
    assert manifest["distinct_sources"] == len(source_counts), "manifest source diversity mismatch"
    assert manifest["source_caps"] == SOURCE_CAPS, "manifest source caps mismatch"
    assert manifest["newest_posting"] == newest, "manifest newest mismatch"
    assert manifest["oldest_posting"] == oldest, "manifest oldest mismatch"
    assert manifest["source_counts"] == dict(source_counts), "manifest source counts mismatch"
    assert manifest["role_counts"] == dict(role_counts), "manifest role counts mismatch"
    assert manifest["publish_status"] == "publishable", "manifest is not publishable"
    assert manifest["refresh_mode"] == "github-actions-direct-ats-no-secret", "manifest refresh mode mismatch"
    assert manifest["eligibility_policy"] == "explicit-ph-structured-location-v1", "manifest eligibility policy mismatch"
    resume = json.loads((data_dir / "resume-match-profiles.json").read_text())
    assert list(resume.keys()) == ["profile_version", "generated_at", "job_count", "jobs"], "resume export keys mismatch"
    assert resume["job_count"] == len(jobs), "resume export count mismatch"
    assert [item["job_id"] for item in resume["jobs"]] == ids, "resume export job ids mismatch"
    expected_resume_jobs = [resume_record(details_by_id[job_id]) for job_id in ids]
    assert resume["jobs"] == expected_resume_jobs, "resume export differs from detail records"
    source_health = json.loads((data_dir / "source-health.json").read_text())
    assert list(source_health.keys()) == ["generated_at", "sources"], "source health keys mismatch"
    health_rows = source_health["sources"]
    assert isinstance(health_rows, list), "source health rows must be a list"
    assert len(health_rows) == len(ASHBY_BOARDS), "source health board count mismatch"
    for board, row in zip(ASHBY_BOARDS, health_rows, strict=True):
        assert list(row.keys()) == [
            "source", "status", "fetched_count", "accepted_count", "last_error"
        ], f"source health keys mismatch for {board['source']}"
        assert row["source"] == board["source"], "source health board order mismatch"
        assert row["status"] == "ok" and not row["last_error"], f"source health failure for {board['source']}"
        assert isinstance(row["fetched_count"], int), f"source fetched count invalid for {board['source']}"
        assert row["fetched_count"] >= source_counts[board["source"]], f"source fetched count too small for {board['source']}"
        assert row["accepted_count"] == source_counts[board["source"]], f"source accepted count mismatch for {board['source']}"


def embedded_board_payloads(index_path: Path) -> tuple[list[str], list[dict[str, Any]], dict[str, dict[str, Any]]]:
    text = index_path.read_text()
    patterns = (
        r"const ROLE_LABELS = (.*?);\nconst ARCHETYPES =",
        r"const EMBEDDED_JOBS = (.*?);\nconst EMBEDDED_DETAILS =",
        r"const EMBEDDED_DETAILS = (.*?);\nconst state =",
    )
    values = []
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.S)
        assert match, f"index missing embedded payload matching {pattern}"
        values.append(json.loads(match.group(1)))
    return values[0], values[1], values[2]


def verify_embedded_board(index_path: Path, data_dir: Path) -> None:
    roles, jobs, details = embedded_board_payloads(index_path)
    expected_jobs = json.loads((data_dir / "jobs.json").read_text())
    expected_details = {
        job["id"]: json.loads((data_dir / f"{job['id']}.json").read_text())
        for job in expected_jobs
    }
    assert roles == ROLE_LABELS, "embedded role labels differ from generator"
    assert jobs == expected_jobs, "embedded jobs differ from jobs export"
    assert details == expected_details, "embedded details differ from detail exports"


def verify() -> None:
    verify_generated_data(DATA)
    verify_embedded_board(BOARD / "index.html", DATA)
    jobs = json.loads((DATA / "jobs.json").read_text())
    newest = max(job["posted"] for job in jobs)
    oldest = min(job["posted"] for job in jobs)
    index = (BOARD / "index.html").read_text()
    assert "const EMBEDDED_JOBS =" in index, "index missing embedded jobs"
    assert "Latest posting" in index, "index missing latest posting UI"
    print(f"OK jobs={len(jobs)} newest={newest} oldest={oldest}")


def verify_live(base_url: str, attempts: int = 18, delay_seconds: int = 10) -> None:
    """Wait for the deployed board to expose the exact locally generated run."""
    expected_manifest = json.loads((DATA / "run-manifest.json").read_text())
    expected_jobs = json.loads((DATA / "jobs.json").read_text())
    expected_run_id = expected_manifest["run_id"]
    base = str(base_url).rstrip("/")
    last_error = ""
    for attempt in range(attempts):
        cache_key = urllib.parse.urlencode({"run": expected_run_id, "attempt": attempt})
        try:
            live_manifest = fetch_json(f"{base}/run-manifest.json?{cache_key}")
            live_jobs = fetch_json(f"{base}/jobs.json?{cache_key}")
            if live_manifest.get("run_id") != expected_run_id:
                raise AssertionError(
                    f"live run_id={live_manifest.get('run_id')} expected={expected_run_id}"
                )
            if live_jobs != expected_jobs:
                raise AssertionError("live jobs.json does not match the generated board")
            if live_manifest != expected_manifest:
                raise AssertionError("live run-manifest.json does not match the generated board")
            print(f"OK live run_id={expected_run_id} jobs={len(live_jobs)}")
            return
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            if attempt + 1 < attempts:
                time.sleep(delay_seconds)
    raise SystemExit(f"Live board did not reach run_id={expected_run_id}: {last_error}")


def refresh() -> None:
    raw_jobs: list[dict[str, Any]] = []
    health = []
    for source, fetcher in FETCHERS.items():
        fetched = []
        error = ""
        try:
            fetched, error = fetcher()
        except Exception as exc:  # noqa: BLE001
            error = str(exc)
        raw_jobs.extend(fetched)
        health.append(
            {
                "source": source,
                "status": "ok" if fetched else "error",
                "fetched_count": len(fetched),
                "accepted_count": 0,
                "last_error": error,
            }
        )
    existing = read_existing_details()
    accepted_details: list[dict[str, Any]] = []
    for job in raw_jobs:
        detail = detail_record(job)
        if not detail:
            continue
        previous = existing.get(detail["id"])
        if previous:
            for key in ("about_the_company", "key_responsibilities", "qualifications", "what_we_offer", "hours_schedule"):
                if previous.get(key) and not detail.get(key):
                    detail[key] = previous[key]
        accepted_details.append(detail)
    details = select_diverse_jobs(deduplicate_details(accepted_details))
    if len(details) < MIN_JOBS:
        raise SystemExit(f"Only {len(details)} publishable jobs found; refusing to overwrite board")
    if len({detail["source"] for detail in details}) < MIN_DISTINCT_SOURCES:
        raise SystemExit(
            f"Only {len({detail['source'] for detail in details})} distinct sources found; "
            "refusing to overwrite board"
        )
    accepted_counts = Counter(detail["source"] for detail in details)
    for row in health:
        row["accepted_count"] = accepted_counts.get(row["source"], 0)
    write_outputs(details, health)


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh or verify the BFF static job board.")
    parser.add_argument("--verify", action="store_true", help="Verify the current generated board and exit.")
    parser.add_argument(
        "--verify-live",
        metavar="DATA_URL",
        help="Verify that a deployed data directory matches the current local run.",
    )
    args = parser.parse_args()
    if args.verify and args.verify_live:
        parser.error("--verify and --verify-live are mutually exclusive")
    if args.verify:
        verify()
        return 0
    if args.verify_live:
        verify_live(args.verify_live)
        return 0
    refresh()
    verify()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
