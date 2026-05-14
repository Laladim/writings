# SWAHG Jobs

Static job board for Filipino remote-work roles.

## Regenerate

From `~/Life-Dashboard`:

```bash
python3 cobalt-skills/scripts/rodge-job-scraper.py
python3 cobalt-skills/scripts/rodge-publish-html.py
bash ~/writings/public/swahg-jobs/verify.sh
```

The publisher reads `/tmp/rodge-jobs.jsonl`, merges with the canonical Google Sheet, writes `data/jobs.json`, writes one `data/<id>.json` per job, and refreshes the `All Jobs` sheet plus QUERY tabs.

## Current counts

```json
{
  "Digital Marketing Specialist": 2,
  "Digital Marketing Manager": 0,
  "Social Media Specialist": 8,
  "Social Media Manager": 24,
  "Content Specialist": 20,
  "Community Manager": 5,
  "SEO": 2,
  "Virtual Assistant": 24,
  "Executive Assistant": 8
}
```
