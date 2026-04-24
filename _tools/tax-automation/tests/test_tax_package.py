import csv
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
import unittest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "_tools" / "tax-automation" / "tax_package.py"
ITEMS = REPO_ROOT / "docs" / "tax-automation" / "templates" / "tax_collection_items_2025_execution_board.csv"


def load_items_rows() -> list[dict[str, str]]:
    with ITEMS.open("r", encoding="utf-8", newline="") as file_obj:
        return list(csv.DictReader(file_obj))


class TaxPackageCliTest(unittest.TestCase):
    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

    def test_init_scan_and_zip_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base_dir = Path(tmp) / "2025_종합소득세_세무사전달"
            init_result = self.run_cli(
                "init",
                "--base-dir", str(base_dir),
                "--items-csv", str(ITEMS),
                "--tax-year", "2025",
                "--company", "PRESSCO21",
            )
            init_payload = json.loads(init_result.stdout)
            self.assertEqual(init_payload["item_count"], 61)
            expected_file = base_dir / "01_기본정보" / "2025_정부24_사업자등록증명_연간.pdf"
            expected_file.write_bytes(b"sample evidence")
            duplicate_file = base_dir / "01_기본정보" / "copy_of_certificate.pdf"
            duplicate_file.write_bytes(b"sample evidence")
            sensitive_file = base_dir / "01_기본정보" / "123456-1234567.pdf"
            sensitive_file.write_bytes(b"sensitive filename")

            scan_result = self.run_cli("scan", "--base-dir", str(base_dir))
            scan_payload = json.loads(scan_result.stdout)
            self.assertEqual(scan_payload["evidence_file_count"], 3)
            self.assertGreaterEqual(scan_payload["duplicate_candidate_count"], 1)
            self.assertGreaterEqual(scan_payload["filename_rule_issue_count"], 1)

            status_path = base_dir / "00_manifest" / "collection_status.csv"
            with status_path.open("r", encoding="utf-8", newline="") as file_obj:
                rows = list(csv.DictReader(file_obj))
            first = next(row for row in rows if row["item_id"] == "TAX-2025-001")
            self.assertEqual(first["scan_status"], "COLLECTED")
            evidence_path = base_dir / "00_manifest" / "tax_evidence_files.csv"
            with evidence_path.open("r", encoding="utf-8", newline="") as file_obj:
                evidence_rows = list(csv.DictReader(file_obj))
            matched_evidence = next(row for row in evidence_rows if row["stored_path"] == "01_기본정보/2025_정부24_사업자등록증명_연간.pdf")
            self.assertEqual(matched_evidence["item_id"], "TAX-2025-001")
            self.assertEqual(matched_evidence["review_status"], "COLLECTED")
            monthly_path = base_dir / "00_manifest" / "monthly_coverage.csv"
            with monthly_path.open("r", encoding="utf-8", newline="") as file_obj:
                monthly_rows = list(csv.DictReader(file_obj))
            first_monthly = next(row for row in monthly_rows if row["item_id"] == "TAX-2025-001")
            self.assertEqual(first_monthly["m01"], "COLLECTED")
            self.assertEqual(first_monthly["m12"], "COLLECTED")

            dry_run = self.run_cli("zip", "--base-dir", str(base_dir), "--tax-year", "2025", "--dry-run")
            dry_payload, _ = json.JSONDecoder().raw_decode(dry_run.stdout)
            self.assertTrue(dry_payload["dry_run"])
            self.assertGreaterEqual(dry_payload["file_count"], 3)

    def test_repo_inside_base_dir_is_blocked_by_default(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "scan", "--base-dir", str(REPO_ROOT), "--items-csv", str(ITEMS)],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Git 저장소 내부 base-dir", result.stderr + result.stdout)

    def test_zip_blocks_symlink_after_scan(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base_dir = Path(tmp) / "tax"
            outside_file = Path(tmp) / "outside-secret.txt"
            outside_file.write_text("outside-secret-proof", encoding="utf-8")
            self.run_cli("init", "--base-dir", str(base_dir), "--items-csv", str(ITEMS))
            target = base_dir / "01_기본정보" / "2025_정부24_사업자등록증명_연간.pdf"
            target.write_bytes(b"original")
            self.run_cli("scan", "--base-dir", str(base_dir))
            target.unlink()
            os.symlink(outside_file, target)

            result = subprocess.run(
                [sys.executable, str(SCRIPT), "zip", "--base-dir", str(base_dir), "--tax-year", "2025"],
                cwd=REPO_ROOT,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("symlink", result.stderr + result.stdout)

    def test_zip_blocks_file_changed_after_scan(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base_dir = Path(tmp) / "tax"
            self.run_cli("init", "--base-dir", str(base_dir), "--items-csv", str(ITEMS))
            target = base_dir / "01_기본정보" / "2025_정부24_사업자등록증명_연간.pdf"
            target.write_bytes(b"before")
            self.run_cli("scan", "--base-dir", str(base_dir))
            target.write_bytes(b"after")

            result = subprocess.run(
                [sys.executable, str(SCRIPT), "zip", "--base-dir", str(base_dir), "--tax-year", "2025"],
                cwd=REPO_ROOT,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("scan 이후 파일이 변경", result.stderr + result.stdout)

    def test_csv_formula_cells_are_escaped_in_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base_dir = Path(tmp) / "tax"
            items_csv = Path(tmp) / "items.csv"
            rows = load_items_rows()
            rows[0]["source_name"] = "=HYPERLINK(\"http://example.invalid\")"
            with items_csv.open("w", encoding="utf-8", newline="") as file_obj:
                writer = csv.DictWriter(file_obj, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            self.run_cli("init", "--base-dir", str(base_dir), "--items-csv", str(items_csv))
            self.run_cli("scan", "--base-dir", str(base_dir))
            status_text = (base_dir / "00_manifest" / "collection_status.csv").read_text(encoding="utf-8")
            self.assertIn("'=HYPERLINK", status_text)

    def test_path_traversal_in_items_csv_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base_dir = Path(tmp) / "tax"
            items_csv = Path(tmp) / "items.csv"
            rows = load_items_rows()
            rows[0]["folder_path"] = "../escape"
            with items_csv.open("w", encoding="utf-8", newline="") as file_obj:
                writer = csv.DictWriter(file_obj, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "init", "--base-dir", str(base_dir), "--items-csv", str(items_csv)],
                cwd=REPO_ROOT,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("위험한 folder_path", result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
