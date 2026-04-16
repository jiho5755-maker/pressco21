"""Unit tests for the flower-resin soldout operation guardrails.

These tests intentionally avoid SSH/API calls. They extract only the pure matcher
functions embedded in the remote script so the channel-write safety rules can be
verified locally before any dry-run/live run is attempted.
"""

from __future__ import annotations

import re
import types
import unittest

from tools.openmarket import flower_resin_10g_soldout as soldout_tool


def _remote_matchers() -> types.SimpleNamespace:
    """Load only compact/name-matcher functions from REMOTE_SCRIPT."""
    script = soldout_tool.build_remote_script(execute=False)
    match = re.search(r"def compact\(text\):.*?\n\ndef one_line_product", script, flags=re.S)
    if not match:  # pragma: no cover - makes a broken extraction fail loudly.
        raise AssertionError("remote matcher block not found")

    namespace: dict[str, object] = {"re": re}
    exec(match.group(0).rsplit("\n\ndef one_line_product", 1)[0], namespace)
    return types.SimpleNamespace(
        compact=namespace["compact"],
        is_exact_flower_resin_10g=namespace["is_exact_flower_resin_10g"],
        is_flower_resin_fallback=namespace["is_flower_resin_fallback"],
    )


class FlowerResinSoldoutMatcherTests(unittest.TestCase):
    def setUp(self) -> None:
        self.matchers = _remote_matchers()

    def test_exact_match_accepts_10g_variants(self) -> None:
        self.assertTrue(self.matchers.is_exact_flower_resin_10g("꽃레진/10g"))
        self.assertTrue(self.matchers.is_exact_flower_resin_10g("꽃 레진 10G"))
        self.assertTrue(self.matchers.is_exact_flower_resin_10g("꽃레진 10ｇ"))

    def test_exact_match_excludes_50g_and_unrelated_resin_products(self) -> None:
        self.assertFalse(self.matchers.is_exact_flower_resin_10g("꽃레진/50g"))
        self.assertFalse(self.matchers.is_exact_flower_resin_10g("꽃레진 50ｇ"))
        self.assertFalse(self.matchers.is_exact_flower_resin_10g("UV 레진 10g"))

    def test_fallback_requires_literal_flower_resin_keyword(self) -> None:
        self.assertTrue(self.matchers.is_flower_resin_fallback("꽃레진 샘플"))
        self.assertFalse(self.matchers.is_flower_resin_fallback("누름꽃 레진 샘플"))

    def test_remote_script_builds_dry_run_without_template_placeholders(self) -> None:
        script = soldout_tool.build_remote_script(execute=False)

        self.assertIn("EXECUTE = False", script)
        self.assertIn(soldout_tool.REMOTE_ENV, script)
        self.assertNotIn("__EXECUTE__", script)
        self.assertNotIn("__REMOTE_ENV__", script)


if __name__ == "__main__":
    unittest.main()
