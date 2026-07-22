# BFF Jobs

Static job board for Filipino remote-work roles.

## Automatic Refresh

`.github/workflows/swahg-jobs-refresh.yml` refreshes this board every day at
23:17 UTC, which is 7:17 AM Philippine time. It also supports manual runs from
GitHub Actions.

The workflow runs the focused job-board tests, refreshes and verifies the data,
builds the Astro site, commits only verified generated files, deploys GitHub
Pages, and confirms that the exact generated run ID is live. The script uses
vetted public Ashby job-board APIs, so it does not require a secret or the
Google Sheets service-account key.

## Regenerate Locally

From `~/writings`:

```bash
python3 scripts/refresh-swahg-jobs.py
bash public/bonafide-filipino-freelancers/jobs/verify.sh
```

The refresher fetches direct public ATS boards, keeps jobs last published by
Ashby in the last 30 days,
writes `data/jobs.json`, writes one `data/<id>.json` per job, writes
`data/accepted-job.schema.json`, writes `data/resume-match-profiles.json`,
writes `data/run-manifest.json`, writes `data/run-manifest.schema.json`, writes
`data/source-health.json`, and writes `data/source-health.schema.json`.

`posted` is the date portion of Ashby's `publishedAt` field. Ashby defines it
as the time the job was last published. It is not a claim about when the job
was first created.

The publish gate requires all of the following:

- At least 20 current roles across at least three source families.
- An explicit Philippines value in the structured ATS location.
- A positive Ashby `isRemote` or `workplaceType` signal with no structured
  onsite or hybrid conflict.
- A title that independently reproduces the stored role category.
- A public HTTPS application page on the vetted ATS, never an aggregator.
- No placeholder companies or semantic employer, title, and location duplicates.
- The configured per-source cap, applied after every safety filter.

If the gate does not pass, the refresher exits before replacing the last good
board.

## Accepted Job Detail Contract

`data/accepted-job.schema.json` is the machine-readable contract for every `data/<id>.json` detail record.

Each accepted job detail has these fields in order:

```json
[
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
  "duplicate_sources"
]
```

## Resume Match Maker Export

`data/resume-match-profiles.json` is the stable integration file for the Resume Job Match Maker.
`data/resume-match-profiles.schema.json` is the machine-readable contract for that export.

Top-level shape:

```json
{
  "profile_version": "1.0",
  "generated_at": "2026-05-20T01:00:00",
  "job_count": 32,
  "jobs": []
}
```

Each item in `jobs` has these fields in order:

```json
[
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
  "resume_match_profile"
]
```

Consumer rule: use `job_id` as the stable lookup key, read `archetype_primary`, `resume_keywords`, `resume_angle`, `missing_skill_suggestions`, and `resume_match_profile` to generate tailored resume guidance. Treat new fields as additive when `profile_version` stays within `1.x`.

## Run Manifest

`data/run-manifest.json` is the public machine-readable status file for the
latest board run. It records the exact run ID, direct application count,
distinct source count, source caps, source and role counts, publication date
range, eligibility policy, and publish status.

`data/run-manifest.schema.json` is the machine-readable contract for the run manifest.

## Source Health Export

`data/source-health.json` is the public machine-readable source status file for the latest board run.

`data/source-health.schema.json` is the machine-readable contract for the source health export.

## Current counts

```json
{
  "Customer Support": 6,
  "Content Specialist": 3,
  "Accounting & Bookkeeping": 4,
  "Virtual Assistant": 2,
  "Operations & Admin": 2,
  "Executive Assistant": 2,
  "E-commerce": 1
}
```
