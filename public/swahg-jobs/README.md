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
  "Customer Support": 19,
  "Content Specialist": 3,
  "SEO": 1,
  "Virtual Assistant": 3
}
```
