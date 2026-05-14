# SWAHG Jobs

Static job board for Filipino remote-work roles.

## Regenerate

From `~/Life-Dashboard`:

```bash
python3 cobalt-skills/scripts/rodge-job-scraper.py
python3 cobalt-skills/scripts/rodge-publish-html.py
bash ~/writings/public/swahg-jobs/verify.sh
```

The publisher reads `/tmp/rodge-jobs.jsonl`, merges with the canonical Google Sheet, keeps jobs posted in the last 30 days, writes `data/jobs.json`, writes one `data/<id>.json` per job, and refreshes the `All Jobs` sheet plus QUERY tabs.

## Current counts

```json
{
  "Customer Support": 29,
  "Digital Marketing Specialist": 1,
  "Social Media Specialist": 3,
  "Social Media Manager": 7,
  "Content Specialist": 12,
  "Community Manager": 4,
  "SEO": 2,
  "Virtual Assistant": 16,
  "Executive Assistant": 4
}
```
