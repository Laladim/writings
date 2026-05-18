#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
import json
from datetime import datetime
from pathlib import Path
import gspread
from google.oauth2.service_account import Credentials

ROOT = Path.home() / "writings/public/swahg-jobs"
SHEET_ID = "1HqBfHi017TQcN4RPOrajpiWAD55x1yl2ijALg0Lq5LE"
MAX_POSTED_AGE_DAYS = 30
ROLE_LABELS = ["Customer Support", "Digital Marketing Specialist", "Digital Marketing Manager", "Social Media Specialist", "Social Media Manager", "Content Specialist", "Community Manager", "SEO", "Virtual Assistant", "Executive Assistant", "Graphic Designer", "Video Editor", "Bookkeeping VA", "E-commerce VA"]
SHEET_KEYS = ["id", "date_added", "status", "title", "company", "posted", "role_lala_category", "seniority", "job_location", "remote_type", "timezone_required", "ph_eligible", "contract_type", "salary_range", "pay_type", "tools_required", "skill_match_count", "hard_knockouts", "fit_score", "newbie_score", "is_newbie_friendly", "newbie_friendly", "why_it_fits", "why_it_might_not", "apply_url", "ats_platform", "industry", "about_the_company", "position_overview", "key_responsibilities", "qualifications", "what_we_offer", "location_work_setup", "hours_schedule", "application_process", "archetype_labels", "quality_label", "quality_reasons", "rodge_notes", "days_old"]
STRUCTURED = ["about_the_company", "position_overview", "key_responsibilities", "qualifications", "what_we_offer", "location_work_setup", "hours_schedule", "application_process"]
NARRATIVE = ["about_the_company", "position_overview", "key_responsibilities", "qualifications", "what_we_offer", "hours_schedule"]
JUNK = ["function createScriptTag", "document.createElement", "sharedAssetPath", "myworkdaycdn", "window.workday", "US.Opportunity", "pendo.location", "fill-rule:evenodd"]

def posted_age_days(posted):
    assert posted, "missing posted date"
    posted_date = datetime.strptime(str(posted)[:10], "%Y-%m-%d").date()
    return (datetime.now().date() - posted_date).days

jobs = json.loads((ROOT / "data/jobs.json").read_text())
assert isinstance(jobs, list), "jobs.json is not an array"
assert len(jobs) >= 20, f"jobs.json has {len(jobs)} items, expected at least 20"
ids = [job["id"] for job in jobs]
assert len(ids) == len(set(ids)), "duplicate ids in jobs.json"
for job in jobs:
    age = posted_age_days(job.get("posted"))
    assert 0 <= age <= MAX_POSTED_AGE_DAYS, f"summary job {job['id']} posted {job.get('posted')} is {age} days old"
    detail_path = ROOT / "data" / f"{job['id']}.json"
    assert detail_path.exists(), f"missing detail JSON for {job['id']}"
details = [json.loads((ROOT / "data" / f"{job_id}.json").read_text()) for job_id in ids]
for detail in details:
    assert detail.get("title"), f"missing title for {detail.get('id')}"
    assert detail.get("company"), f"missing company for {detail.get('id')}"
    assert detail.get("apply_url"), f"missing apply URL for {detail.get('id')}"
    age = posted_age_days(detail.get("posted"))
    assert 0 <= age <= MAX_POSTED_AGE_DAYS, f"detail job {detail.get('id')} posted {detail.get('posted')} is {age} days old"
    for key in STRUCTURED:
        value = str(detail.get(key) or "")
        assert not any(marker in value for marker in JUNK), f"junk detail text in {detail.get('id')} {key}"
with_description = sum(1 for detail in details if any(detail.get(key) for key in NARRATIVE))
ratio = with_description / len(details)
assert ratio >= 0.60, f"only {with_description}/{len(details)} details have clean narrative sections"

html = (ROOT / "index.html").read_text()
assert "SWAHG · Jobs" in html, "index.html missing title string"
for label in ROLE_LABELS:
    count = sum(1 for job in jobs if job.get("role_lala_category") == label)
    if count:
        assert label in html, f"index.html missing role label {label}"
    else:
        assert f">{label}</button>" not in html, f"index.html shows empty role filter {label}"

creds = Credentials.from_service_account_file(str(Path.home() / ".config/gcloud/claude-sheets-key.json"), scopes=["https://www.googleapis.com/auth/spreadsheets"])
sh = gspread.authorize(creds).open_by_key(SHEET_ID)
expected_tabs = ["All Jobs", "🏆 Top Picks", "🌱 Newbie Friendly", "📱 Social Media", "✍️ Content", "🔍 SEO + Digital Marketing", "📋 VA + EA", "🎧 Customer Support", "🎨 Creative", "📊 Stats"]
actual_tabs = [ws.title for ws in sh.worksheets()]
assert actual_tabs == expected_tabs, f"tab list mismatch: {actual_tabs}"
ws = sh.worksheet("All Jobs")
values = ws.get_all_values()
assert values and values[0][:len(SHEET_KEYS)] == SHEET_KEYS, "All Jobs header mismatch"
sheet_rows = {row[0]: row for row in values[1:] if row and row[0]}
for detail in details:
    assert detail["id"] in sheet_rows, f"{detail['id']} missing from All Jobs"
    row = sheet_rows[detail["id"]]
    for index, key in enumerate(SHEET_KEYS[:len(SHEET_KEYS) - 2]):
        expected = detail.get(key)
        if isinstance(expected, bool):
            expected = "TRUE" if expected else "FALSE"
        if expected is None:
            expected = ""
        actual = row[index] if index < len(row) else ""
        assert str(expected) == str(actual), f"sheet mismatch {detail['id']} {key}: {actual!r} != {expected!r}"
print(f"OK jobs={len(jobs)} descriptions={with_description}/{len(details)} tabs={len(actual_tabs)}")
PY
