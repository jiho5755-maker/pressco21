"""Regression checks for the PRESSCO21 Product OS recommendation brief.

The task is a meeting recommendation, so these tests verify that the committed
brief keeps the required decision coverage instead of drifting into a generic
architecture note.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path


REPORT = Path("docs/openmarket-ops/pressco-product-os-recommendations-2026-04-17.md")


class ProductOsRecommendationBriefTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.text = REPORT.read_text(encoding="utf-8")

    def test_required_meeting_sections_are_present(self) -> None:
        for heading in [
            "## 1. 회의 결론",
            "## 2. Fresh exports 체크리스트",
            "## 3. 더 좋은 샘플 상품",
            "## 5. 상품등록/재고관리 실현 가능성",
            "## 6. 주요 리스크와 방지책",
            "## 7. 비개발자 운영 로드맵",
        ]:
            with self.subTest(heading=heading):
                self.assertIn(heading, self.text)

    def test_all_required_channels_have_fresh_export_checklists(self) -> None:
        for channel in ["MakeShop", "Coupang", "11st", "SmartStore", "CRM", "Sabanet"]:
            with self.subTest(channel=channel):
                pattern = rf"### 2\.\d+ .*{re.escape(channel)}"
                self.assertRegex(self.text, pattern)

    def test_sample_products_do_not_reuse_flower_resin_case(self) -> None:
        sample_section = self.text.split("## 3. 더 좋은 샘플 상품", 1)[1].split("## 4.", 1)[0]
        self.assertNotIn("꽃 레진 10g |", sample_section)
        for sample in ["압화건조매트", "압화 입문 세트", "UV레진+몰드+데코", "레지너스 장비류"]:
            with self.subTest(sample=sample):
                self.assertIn(sample, sample_section)

    def test_data_model_includes_mapping_tables_needed_for_mismatches(self) -> None:
        for table in [
            "product_master",
            "sku_master",
            "product_component",
            "channel_listing",
            "channel_listing_part",
            "inventory_balance",
            "stock_policy",
            "channel_publish_plan",
            "sync_log",
        ]:
            with self.subTest(table=table):
                self.assertIn(f"`{table}`", self.text)

    def test_feasibility_and_roadmap_are_actionable(self) -> None:
        for phrase in [
            "실행 순서는 재고/매핑 → 채널 수정 → 신규 등록",
            "fresh export",
            "dry-run diff",
            "manual queue",
            "MakeShop → SmartStore → Coupang → 11st",
        ]:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.text)


if __name__ == "__main__":
    unittest.main()
