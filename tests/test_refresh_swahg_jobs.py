from __future__ import annotations

from collections import Counter
import datetime
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "refresh-swahg-jobs.py"
SPEC = importlib.util.spec_from_file_location("refresh_swahg_jobs", SCRIPT)
assert SPEC and SPEC.loader
jobs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(jobs)


class ClassificationTests(unittest.TestCase):
    def test_description_sections_are_standardized(self):
        text = (
            "Position Type: Full Time Location: Philippines (Remote) "
            "Schedule: Monday to Friday, 9 AM to 5 PM Sydney time "
            "Total Monthly Cost: Php 55,000 - 80,000 per month "
            "ABOUT THE COMPANY A healthcare software company. "
            "ABOUT THE ROLE Support clinicians using its AI tools. "
            "RESPONSIBILITIES - Answer questions. - Improve templates. "
            "COMPETENCIES AND QUALIFICATIONS - Clinical background. - Clear writing. "
            "WHAT WE OFFER - Remote training. - Comprehensive Fringe Benefits package. "
            "APPLICATION PROCESS Two interviews."
        )

        sections = jobs.extract_description_sections(text)

        self.assertEqual(sections["hours_schedule"], "Monday to Friday, 9 AM to 5 PM Sydney time")
        self.assertEqual(sections["salary_range"], "Php 55,000 - 80,000 per month")
        self.assertEqual(sections["about_the_company"], "A healthcare software company.")
        self.assertTrue(sections["key_responsibilities"].startswith("- Answer questions."))
        self.assertIn("Clinical background", sections["qualifications"])
        self.assertIn("Comprehensive Fringe Benefits package.", sections["what_we_offer"])
        self.assertEqual(sections["application_process"], "Two interviews.")

    def test_role_classification_uses_title_not_description(self):
        self.assertEqual(
            jobs.role_category("Plumber", "customer support executive assistant"),
            "",
        )

    def test_candidate_role_titles_are_classified(self):
        cases = {
            "Customer Service Specialist": "Customer Support",
            "Virtual Administrative Assistant": "Executive Assistant",
            "AUSTRALIAN ACCOUNTING VA": "Accounting & Bookkeeping",
            "Email Marketing Administrator": "Content Specialist",
            "Marketing Campaign Coordinator": "Content Specialist",
            "Executive Assistant & Community Manager": "Executive Assistant",
            "eCommerce Coordinator": "E-commerce",
            "Operations Lead (Card Services)": "Operations & Admin",
            "Technical Account Manager": "Customer Support",
        }
        for title, expected in cases.items():
            with self.subTest(title=title):
                self.assertEqual(jobs.role_category(title), expected)

    def test_specific_location_cannot_be_overridden_by_generic_body_text(self):
        self.assertEqual(
            jobs.ph_eligibility(
                "Denver, Colorado, United States",
                "Our team operates worldwide and across APAC.",
                "Example",
            )[0],
            "No",
        )
        self.assertEqual(
            jobs.ph_eligibility(
                "Europe only",
                "Work from anywhere in the world.",
                "Example",
            )[0],
            "No",
        )

    def test_only_explicit_ph_structured_location_is_accepted(self):
        self.assertEqual(
            jobs.ph_eligibility("Remote Philippines", "", "Example")[0],
            "Yes",
        )
        self.assertEqual(
            jobs.ph_eligibility("APAC Remote", "Philippines welcome", "Example")[0],
            "Maybe",
        )
        self.assertEqual(
            jobs.ph_eligibility("Remote", "Philippines welcome", "Example")[0],
            "Maybe",
        )

    def test_structured_employment_type_wins_over_description_text(self):
        self.assertEqual(
            jobs.contract_type("The benefits include an employment contract.", "FullTime"),
            "Full-time",
        )
        self.assertEqual(jobs.contract_type("", "PartTime"), "Part-time")
        self.assertEqual(jobs.contract_type("", "Contract"), "Contract")
        self.assertEqual(jobs.contract_type("", "Temporary"), "Temporary")
        self.assertEqual(
            jobs.contract_type("This is a full-time role.", ""),
            "Full-time",
        )


class DirectSourceTests(unittest.TestCase):
    def test_only_https_direct_ats_urls_are_accepted(self):
        job_id = "11111111-1111-4111-8111-111111111111"
        self.assertTrue(
            jobs.is_direct_application_url(
                f"https://jobs.ashbyhq.com/multiplymii/{job_id}"
            )
        )
        for url in (
            "https://remoteok.com/remote-jobs/1234",
            "https://remotive.com/remote-jobs/1234",
            f"http://jobs.ashbyhq.com/multiplymii/{job_id}",
            f"https://jobs.ashbyhq.com/not-vetted/{job_id}",
            "https://jobs.ashbyhq.com/multiplymii/1234",
            f"https://jobs.ashbyhq.com/multiplymii/{job_id}?ref=aggregator",
            f"https://jobs.ashbyhq.com:not-a-port/multiplymii/{job_id}",
            "https://example.com/jobs/1234",
            "",
        ):
            with self.subTest(url=url):
                self.assertFalse(jobs.is_direct_application_url(url))

    def test_ashby_adapter_preserves_direct_provenance(self):
        payload = {
            "jobs": [{
                "title": "Executive Assistant",
                "location": "Remote Philippines",
                "descriptionPlain": "Manage calendars and Google Workspace.",
                "publishedAt": "2026-07-21T01:02:03+00:00",
                "employmentType": "FullTime",
                "jobUrl": "https://jobs.ashbyhq.com/example/abc",
                "department": "Operations",
                "team": "Support",
                "isListed": True,
                "isRemote": True,
                "workplaceType": "Remote",
            }]
        }
        board = {"slug": "example", "source": "Example Company"}
        with patch.object(jobs, "fetch_json", return_value=payload):
            rows, error = jobs.fetch_ashby_board(board)
        self.assertEqual(error, "")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["source_mode"], "direct_ats")
        self.assertEqual(rows[0]["ats_platform"], "Ashby")
        self.assertIs(rows[0]["is_remote"], True)
        self.assertEqual(rows[0]["workplace_type"], "Remote")
        self.assertEqual(
            rows[0]["source_url"],
            "https://jobs.ashbyhq.com/example",
        )
        self.assertEqual(
            rows[0]["apply_url"],
            "https://jobs.ashbyhq.com/example/abc",
        )

    def test_detail_gate_rejects_aggregator_placeholder_and_non_ph_rows(self):
        job_id = "11111111-1111-4111-8111-111111111111"
        base = {
            "title": "Executive Assistant",
            "company": "Example Company",
            "description": "Manage calendars and documents.",
            "location": "Philippines",
            "tags": [],
            "apply_url": f"https://jobs.ashbyhq.com/multiplymii/{job_id}",
            "source": "MultiplyMii",
            "posted": datetime.date.today().isoformat(),
            "salary": "",
            "job_type": "FullTime",
            "industry": "Operations",
            "source_url": "https://jobs.ashbyhq.com/multiplymii",
            "source_mode": "direct_ats",
            "ats_platform": "Ashby",
            "is_remote": True,
            "workplace_type": "Remote",
        }
        accepted = jobs.detail_record(dict(base))
        self.assertIsNotNone(accepted)
        self.assertEqual(accepted["remote_type"], "Remote")
        self.assertEqual(accepted["contract_type"], "Full-time")
        unsafe = dict(base, apply_url="https://remoteok.com/remote-jobs/abc")
        self.assertIsNone(jobs.detail_record(unsafe))
        placeholder = dict(base, company="Unknown")
        self.assertIsNone(jobs.detail_record(placeholder))
        non_ph = dict(base, location="United States")
        self.assertIsNone(jobs.detail_record(non_ph))
        boundary = dict(
            base,
            posted=(datetime.date.today() - datetime.timedelta(days=5)).isoformat(),
        )
        self.assertIsNotNone(jobs.detail_record(boundary))
        stale = dict(
            base,
            posted=(datetime.date.today() - datetime.timedelta(days=6)).isoformat(),
        )
        self.assertIsNone(jobs.detail_record(stale))

    def test_detail_gate_requires_positive_structured_remote_evidence(self):
        job_id = "11111111-1111-4111-8111-111111111111"
        base = {
            "title": "Executive Assistant",
            "company": "Undisclosed client via MultiplyMii",
            "description": "Manage calendars and documents.",
            "location": "Philippines",
            "tags": [],
            "apply_url": f"https://jobs.ashbyhq.com/multiplymii/{job_id}",
            "source": "MultiplyMii",
            "posted": datetime.date.today().isoformat(),
            "salary": "",
            "job_type": "FullTime",
            "industry": "Operations",
            "source_url": "https://jobs.ashbyhq.com/multiplymii",
            "source_mode": "direct_ats",
            "ats_platform": "Ashby",
        }
        self.assertIsNone(
            jobs.detail_record(dict(base, is_remote=None, workplace_type=""))
        )
        self.assertIsNone(
            jobs.detail_record(dict(base, is_remote=True, workplace_type="Hybrid"))
        )
        self.assertIsNone(
            jobs.detail_record(dict(base, is_remote=False, workplace_type="Remote"))
        )
        self.assertIsNotNone(
            jobs.detail_record(dict(base, is_remote=None, workplace_type="Remote"))
        )


class DiversityAndDedupeTests(unittest.TestCase):
    def test_semantic_key_collapses_punctuation_variants(self):
        first = {
            "company": "Example, Inc.",
            "title": "Customer-Support Specialist",
            "job_location": "Remote Philippines",
        }
        second = {
            "company": "Example Inc",
            "title": "Customer Support Specialist",
            "job_location": "Remote, Philippines",
        }
        self.assertEqual(jobs.semantic_job_key(first), jobs.semantic_job_key(second))

    def test_identical_same_source_descriptions_collapse_title_variants(self):
        base = {
            "company": "Aven via Extend Your Team",
            "job_location": "Metro Manila",
            "source": "Extend Your Team",
            "description_hash": "7ab39468754407a6",
            "fit_score": 83,
            "posted": "2026-06-25",
        }
        first = dict(base, title="Credit Card Customer Support Specialist")
        second = dict(base, title="Credit Card Customer Support")
        selected = jobs.deduplicate_details([first, second])
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["title"], first["title"])

    def test_diverse_selection_caps_each_source(self):
        details = []
        sources = [board["source"] for board in jobs.ASHBY_BOARDS[:3]]
        for source in sources:
            for index in range(20):
                details.append({
                    "source": source,
                    "fit_score": 90 - index,
                    "posted": "2026-07-21",
                    "title": f"Role {index}",
                    "role_lala_category": jobs.ROLE_LABELS[index % len(jobs.ROLE_LABELS)],
                })
        selected = jobs.select_diverse_jobs(details)
        counts = {}
        for row in selected:
            counts[row["source"]] = counts.get(row["source"], 0) + 1
        expected = sum(jobs.SOURCE_CAPS[source] for source in sources)
        self.assertEqual(len(selected), expected)
        self.assertEqual(counts, {source: jobs.SOURCE_CAPS[source] for source in sources})

    def test_current_four_source_mix_can_meet_release_floor(self):
        available = {
            "MultiplyMii": 30,
            "VA4U": 9,
            "Extend Your Team": 1,
            "ClickUp": 3,
        }
        details = []
        for source, count in available.items():
            for index in range(count):
                details.append({
                    "source": source,
                    "fit_score": 90 - index,
                    "posted": "2026-08-12",
                    "title": f"{source} Role {index}",
                    "role_lala_category": jobs.ROLE_LABELS[index % len(jobs.ROLE_LABELS)],
                })

        selected = jobs.select_diverse_jobs(details)
        counts = Counter(row["source"] for row in selected)

        self.assertEqual(
            len(selected),
            sum(min(count, jobs.SOURCE_CAPS[source]) for source, count in available.items()),
        )
        self.assertEqual(
            counts,
            {
                "MultiplyMii": 9,
                "VA4U": 7,
                "ClickUp": 3,
                "Extend Your Team": 1,
            },
        )


class VerifierRegressionTests(unittest.TestCase):
    def copy_generated_data(self, temp_root: str) -> Path:
        copied = Path(temp_root) / "data"
        shutil.copytree(jobs.DATA, copied)
        return copied

    def assert_generated_rejected(self, data_dir: Path, message: str) -> None:
        with patch.object(jobs, "age_days", return_value=0):
            with self.assertRaisesRegex(AssertionError, message):
                jobs.verify_generated_data(data_dir)

    def test_verifier_rejects_unvetted_ashby_application_url(self):
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = self.copy_generated_data(temp_root)
            summaries_path = data_dir / "jobs.json"
            summaries = json.loads(summaries_path.read_text())
            job_id = summaries[0]["id"]
            fake_url = (
                "https://jobs.ashbyhq.com/not-vetted/"
                "11111111-1111-4111-8111-111111111111"
            )
            summaries[0]["apply_url"] = fake_url
            summaries_path.write_text(json.dumps(summaries))
            detail_path = data_dir / f"{job_id}.json"
            detail = json.loads(detail_path.read_text())
            detail["apply_url"] = fake_url
            detail_path.write_text(json.dumps(detail))
            resume_path = data_dir / "resume-match-profiles.json"
            resume = json.loads(resume_path.read_text())
            resume["jobs"][0]["apply_url"] = fake_url
            resume_path.write_text(json.dumps(resume))
            self.assert_generated_rejected(
                data_dir, "non-vetted application URL"
            )

    def test_verifier_rejects_corrupt_resume_row(self):
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = self.copy_generated_data(temp_root)
            resume_path = data_dir / "resume-match-profiles.json"
            resume = json.loads(resume_path.read_text())
            resume["jobs"][0]["title"] = "Plumber"
            resume_path.write_text(json.dumps(resume))
            self.assert_generated_rejected(
                data_dir, "resume export differs from detail records"
            )

    def test_verifier_rejects_manifest_role_count_tampering(self):
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = self.copy_generated_data(temp_root)
            manifest_path = data_dir / "run-manifest.json"
            manifest = json.loads(manifest_path.read_text())
            manifest["role_counts"] = {"Plumber": 999}
            manifest_path.write_text(json.dumps(manifest))
            self.assert_generated_rejected(data_dir, "manifest role counts mismatch")

    def test_verifier_rejects_source_health_tampering(self):
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = self.copy_generated_data(temp_root)
            health_path = data_dir / "source-health.json"
            health = json.loads(health_path.read_text())
            health["sources"] = []
            health_path.write_text(json.dumps(health))
            self.assert_generated_rejected(
                data_dir, "source health board count mismatch"
            )

    def test_verifier_rejects_orphan_detail_file(self):
        with tempfile.TemporaryDirectory() as temp_root:
            data_dir = self.copy_generated_data(temp_root)
            (data_dir / "orphan.json").write_text("{}")
            self.assert_generated_rejected(
                data_dir, "detail file set does not match jobs export"
            )

    def test_verifier_rejects_stale_embedded_payload(self):
        with tempfile.TemporaryDirectory() as temp_root:
            index_path = Path(temp_root) / "index.html"
            text = (jobs.BOARD / "index.html").read_text()
            start = text.index("const EMBEDDED_JOBS =")
            end = text.index(";\nconst EMBEDDED_DETAILS =", start)
            index_path.write_text(
                text[:start] + "const EMBEDDED_JOBS = []" + text[end:]
            )
            with self.assertRaisesRegex(
                AssertionError, "embedded jobs differ from jobs export"
            ):
                jobs.verify_embedded_board(index_path, jobs.DATA)

    def test_embedded_replacement_preserves_structured_newlines(self):
        with tempfile.TemporaryDirectory() as temp_root:
            index_path = Path(temp_root) / "index.html"
            shutil.copy2(jobs.BOARD / "index.html", index_path)
            summaries = [{"id": "example"}]
            details = {
                "example": {
                    "id": "example",
                    "key_responsibilities": "- First task\n- Second task",
                }
            }

            jobs.replace_embedded_json(index_path, summaries, details)
            _, embedded_jobs, embedded_details = jobs.embedded_board_payloads(index_path)

            self.assertEqual(embedded_jobs, summaries)
            self.assertEqual(embedded_details, details)


if __name__ == "__main__":
    unittest.main()
