#!/usr/bin/env python3
"""Refresh the public SWAHG job board from no-secret remote job feeds."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BOARD = ROOT / "public" / "swahg-jobs"
DATA = BOARD / "data"
MAX_POSTED_AGE_DAYS = 30
MAX_JOBS = 40
MIN_JOBS = 20
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

ROLE_LABELS = [
    "Customer Support",
    "Content Specialist",
    "Community Manager",
    "SEO",
    "Virtual Assistant",
    "Executive Assistant",
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
    r"account executive|account manager|sales representative|sales development|sdr|bdr|inside sales|cold call|telemarket|"
    r"business development|team lead|engineering manager|growth lead|tax reviewer|benefits representative|"
    r"horticulturalist|agronomist|cybersecurity|quality assurance engineer|dental lab technician)\b|(?<!community )\bmanager\b",
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
    r"german[- ]speaking|french[- ]speaking|spanish[- ]speaking|italian[- ]speaking)\b",
    re.I,
)
PH_OK = re.compile(r"\b(worldwide|anywhere in the world|work from anywhere in the world|global remote|philippines|filipino|apac|asia[- ]?pacific|southeast asia)\b", re.I)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


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


def normalize_job(title: str, company: str, description: str, location: str, tags: list[str], apply_url: str, source: str, posted: str, salary: str = "", job_type: str = "", industry: str = "") -> dict[str, Any] | None:
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


FETCHERS = {
    "RemoteOK": fetch_remoteok,
    "Remotive": fetch_remotive,
    "Himalayas": fetch_himalayas,
    "WeWorkRemotely": lambda: fetch_rss_source(
        "WeWorkRemotely",
        [
            "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
            "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
        ],
    ),
    "Jobicy": fetch_jobicy,
    "NoDesk": lambda: fetch_rss_source("NoDesk", ["https://nodesk.co/remote-jobs/rss/"]),
}


def role_category(title: str, text: str) -> str:
    blob = f"{title} {text}".lower()
    if re.search(r"customer (service|support|experience|care)|client support|technical support", blob):
        return "Customer Support"
    if re.search(r"executive assistant|administrative assistant|admin assistant|scheduler|operations coordinator", blob):
        return "Executive Assistant"
    if re.search(r"virtual assistant|\bva\b|data entry|back office", blob):
        return "Virtual Assistant"
    if re.search(r"community manager|community support|moderator", blob):
        return "Community Manager"
    if re.search(r"\bseo\b|search engine", blob):
        return "SEO"
    if re.search(r"content|copywriter|writer|editor|social media|marketing coordinator", blob):
        return "Content Specialist"
    return ""


def seniority(title: str) -> str:
    if re.search(r"\b(junior|jr|associate|coordinator|assistant|entry|intern)\b", title, re.I):
        return "Junior"
    if re.search(r"\b(senior|sr|lead|principal|staff)\b", title, re.I):
        return "Senior"
    return "Mid"


def ph_eligibility(location: str, text: str, source: str) -> tuple[str, str, int]:
    blob = f"{location} {text}"
    explicit_global = re.search(r"\b(worldwide|anywhere in the world|global remote|philippines|filipino|apac|asia[- ]?pacific|southeast asia)\b", blob, re.I)
    if (US_LOCATION.search(blob) or NON_PH_LOCATION.search(blob)) and not explicit_global:
        return "Maybe", "Non-PH location or language requirement", 0
    if PH_OK.search(blob):
        return "Yes", "PH-friendly remote", 20
    if source in {"Jobicy", "RemoteOK", "NoDesk", "Himalayas"} and not US_LOCATION.search(location):
        return "Likely", "Unspecified remote", 14
    if US_LOCATION.search(blob):
        return "Maybe", "Check US restriction", 4
    return "Likely", "Unspecified remote", 12


def contract_type(text: str, job_type: str) -> str:
    blob = f"{job_type} {text}".lower()
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
    if role in {"Virtual Assistant", "Executive Assistant"}:
        primary = "Generalist Admin"
        labels = "Generalist Admin, Corporate Transitioner, Fresh Starter"
    elif role == "Content Specialist":
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
    if ph_status == "Maybe" and (US_LOCATION.search(knockout_blob) or NON_PH_LOCATION.search(knockout_blob)):
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
        "ats_platform": job["source"],
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
        "source_mode": "automated",
        "source_url": job["apply_url"],
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
    summary_json = json.dumps(summaries, ensure_ascii=False)
    details_json = json.dumps(details, ensure_ascii=False)
    text = re.sub(r"const EMBEDDED_JOBS = .*?;\nconst EMBEDDED_DETAILS =", f"const EMBEDDED_JOBS = {summary_json};\nconst EMBEDDED_DETAILS =", text, flags=re.S)
    text = re.sub(r"const EMBEDDED_DETAILS = .*?;\nconst state =", f"const EMBEDDED_DETAILS = {details_json};\nconst state =", text, flags=re.S)
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
    (staging / "accepted-job.schema.json").write_text(json.dumps(schema("SWAHG Accepted Job Detail", DETAIL_KEYS), indent=2) + "\n")
    resume = {
        "profile_version": "1.0",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "job_count": len(details),
        "jobs": [resume_record(detail) for detail in details],
    }
    (staging / "resume-match-profiles.json").write_text(json.dumps(resume, ensure_ascii=False, indent=2) + "\n")
    (staging / "resume-match-profiles.schema.json").write_text(json.dumps(schema("SWAHG Resume Match Profiles Export", RESUME_KEYS), indent=2) + "\n")
    run_id = datetime.now().strftime("%Y%m%dT%H%M%S")
    manifest = {
        "manifest_version": "1.0",
        "run_id": run_id,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "job_count": len(details),
        "newest_posting": max(detail["posted"] for detail in details),
        "oldest_posting": min(detail["posted"] for detail in details),
        "source_counts": dict(Counter(detail["source"] for detail in details)),
        "role_counts": dict(Counter(detail["role_lala_category"] for detail in details)),
        "publish_status": "publishable",
        "refresh_mode": "github-actions-no-secret",
    }
    (staging / "run-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (staging / "run-manifest.schema.json").write_text(json.dumps(schema("SWAHG Job Board Run Manifest", list(manifest.keys())), indent=2) + "\n")
    source_health = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "sources": health_rows,
    }
    (staging / "source-health.json").write_text(json.dumps(source_health, ensure_ascii=False, indent=2) + "\n")
    (staging / "source-health.schema.json").write_text(json.dumps(schema("SWAHG Source Health Export", ["generated_at", "sources"]), indent=2) + "\n")
    previous = BOARD / "data.previous"
    if previous.exists():
        shutil.rmtree(previous)
    if DATA.exists():
        DATA.rename(previous)
    staging.rename(DATA)
    if previous.exists():
        shutil.rmtree(previous)
    replace_embedded_json(BOARD / "index.html", summaries, detail_map)


def verify() -> None:
    jobs = json.loads((DATA / "jobs.json").read_text())
    assert isinstance(jobs, list), "jobs.json must be an array"
    assert len(jobs) >= MIN_JOBS, f"expected at least {MIN_JOBS} jobs, found {len(jobs)}"
    ids = [job["id"] for job in jobs]
    assert len(ids) == len(set(ids)), "duplicate job ids"
    newest = max(job["posted"] for job in jobs)
    oldest = min(job["posted"] for job in jobs)
    for job in jobs:
        assert 0 <= age_days(job["posted"]) <= MAX_POSTED_AGE_DAYS, f"stale or future posting: {job['id']} {job['posted']}"
        detail_path = DATA / f"{job['id']}.json"
        assert detail_path.exists(), f"missing detail {job['id']}"
        detail = json.loads(detail_path.read_text())
        assert list(detail.keys()) == DETAIL_KEYS, f"detail keys mismatch for {job['id']}"
        assert detail["apply_url"], f"missing apply URL for {job['id']}"
        assert detail["archetype_primary"], f"missing archetype for {job['id']}"
    manifest = json.loads((DATA / "run-manifest.json").read_text())
    assert manifest["job_count"] == len(jobs), "manifest job count mismatch"
    assert manifest["newest_posting"] == newest, "manifest newest mismatch"
    assert manifest["oldest_posting"] == oldest, "manifest oldest mismatch"
    resume = json.loads((DATA / "resume-match-profiles.json").read_text())
    assert resume["job_count"] == len(jobs), "resume export count mismatch"
    index = (BOARD / "index.html").read_text()
    assert "const EMBEDDED_JOBS =" in index, "index missing embedded jobs"
    assert "Latest posting" in index, "index missing latest posting UI"
    print(f"OK jobs={len(jobs)} newest={newest} oldest={oldest}")


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
    accepted_by_key: dict[str, dict[str, Any]] = {}
    for job in raw_jobs:
        detail = detail_record(job)
        if not detail:
            continue
        previous = existing.get(detail["id"])
        if previous:
            for key in ("about_the_company", "key_responsibilities", "qualifications", "what_we_offer", "hours_schedule"):
                if previous.get(key) and not detail.get(key):
                    detail[key] = previous[key]
        dedupe_key = detail["apply_url"].lower() or f"{detail['title'].lower()}|{detail['company'].lower()}"
        if dedupe_key not in accepted_by_key or detail["fit_score"] > accepted_by_key[dedupe_key]["fit_score"]:
            accepted_by_key[dedupe_key] = detail
    details = list(accepted_by_key.values())
    details.sort(key=lambda row: (int(row["fit_score"]), row["posted"]), reverse=True)
    details = details[:MAX_JOBS]
    if len(details) < MIN_JOBS:
        raise SystemExit(f"Only {len(details)} publishable jobs found; refusing to overwrite board")
    accepted_counts = Counter(detail["source"] for detail in details)
    for row in health:
        row["accepted_count"] = accepted_counts.get(row["source"], 0)
    write_outputs(details, health)


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh or verify the SWAHG static job board.")
    parser.add_argument("--verify", action="store_true", help="Verify the current generated board and exit.")
    args = parser.parse_args()
    if args.verify:
        verify()
        return 0
    refresh()
    verify()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
