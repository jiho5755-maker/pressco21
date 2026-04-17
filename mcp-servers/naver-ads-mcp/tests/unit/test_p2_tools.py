from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.ab_test import ab_test_evaluate
from naver_ads_mcp.tools.bulk_auto import bulk_auto_prune, bulk_bid_optimizer
from naver_ads_mcp.tools.landing_audit import _classify_url


@pytest.fixture()
def sa_client():
    return AsyncMock()


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.bulk_auto.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.bulk_auto.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.bulk_auto.settings.naver_sa_customer_id", "1")
    monkeypatch.setattr("naver_ads_mcp.tools.bulk_auto.settings.mcp_write_enabled", True)
    monkeypatch.setattr("naver_ads_mcp.tools.bulk_auto.settings.max_bid_delta_pct", 20)
    monkeypatch.setattr("naver_ads_mcp.tools.ab_test.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.ab_test.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.ab_test.settings.naver_sa_customer_id", "1")
    monkeypatch.setattr("naver_ads_mcp.tools.ab_test.settings.mcp_write_enabled", True)


async def test_auto_prune_dry_run(sa_client):
    sa_client.get.side_effect = [
        [{"nccAdgroupId": "grp-1"}],
        [
            {"nccKeywordId": "kw-1", "keyword": "압화", "userStatus": "ENABLE", "bidAmt": 70},
            {"nccKeywordId": "kw-2", "keyword": "부케", "userStatus": "ENABLE", "bidAmt": 70},
        ],
        [
            {"id": "kw-1", "clkCnt": 10, "ccnt": 2, "convAmt": 5000, "salesAmt": 700},
            {"id": "kw-2", "clkCnt": 5, "ccnt": 0, "convAmt": 0, "salesAmt": 350},
        ],
    ]
    result = await bulk_auto_prune(sa_client, "cmp-1", "2026-03-01", "2026-04-01", dry_run=True)
    assert result["dry_run"] is True
    assert result["pruneCount"] == 1
    assert result["toPrune"][0]["keyword"] == "부케"


async def test_bid_optimizer_dry_run(sa_client):
    sa_client.get.side_effect = [
        [{"nccAdgroupId": "grp-1"}],
        [
            {"nccKeywordId": "kw-1", "keyword": "압화", "userStatus": "ENABLE", "bidAmt": 100},
            {"nccKeywordId": "kw-2", "keyword": "부케", "userStatus": "ENABLE", "bidAmt": 100},
        ],
        [
            {"id": "kw-1", "clkCnt": 10, "ccnt": 3, "convAmt": 9000, "salesAmt": 1000},
            {"id": "kw-2", "clkCnt": 8, "ccnt": 0, "convAmt": 0, "salesAmt": 560},
        ],
    ]
    result = await bulk_bid_optimizer(sa_client, "cmp-1", "2026-03-01", "2026-04-01", dry_run=True)
    assert result["dry_run"] is True
    assert result["changeCount"] == 2
    raise_change = [c for c in result["changes"] if c["action"] == "raise"][0]
    assert raise_change["newBid"] == 115
    lower_change = [c for c in result["changes"] if c["action"] == "lower"][0]
    assert lower_change["newBid"] == 70


async def test_ab_evaluate_winner(sa_client):
    sa_client.get.return_value = [
        {"id": "ad-a", "impCnt": 200, "clkCnt": 20, "ctr": 10.0, "ccnt": 2, "convAmt": 5000, "salesAmt": 2000},
        {"id": "ad-b", "impCnt": 200, "clkCnt": 10, "ctr": 5.0, "ccnt": 0, "convAmt": 0, "salesAmt": 1000},
    ]
    result = await ab_test_evaluate(sa_client, "ad-a", "ad-b", "2026-04-01", "2026-04-10", dry_run=True)
    assert result["winner"] == "ad-a"
    assert result["confident"] is True


async def test_ab_evaluate_not_confident(sa_client):
    sa_client.get.return_value = [
        {"id": "ad-a", "impCnt": 50, "clkCnt": 5, "ctr": 10.0, "ccnt": 0, "convAmt": 0, "salesAmt": 0},
        {"id": "ad-b", "impCnt": 50, "clkCnt": 3, "ctr": 6.0, "ccnt": 0, "convAmt": 0, "salesAmt": 0},
    ]
    result = await ab_test_evaluate(sa_client, "ad-a", "ad-b", "2026-04-01", "2026-04-10")
    assert result["confident"] is False


def test_classify_url_own():
    assert _classify_url("https://foreverlove.co.kr/product/123") == "자사몰"


def test_classify_url_marketplace():
    assert _classify_url("https://smartstore.naver.com/pressco21") == "오픈마켓"


def test_classify_url_other():
    assert _classify_url("https://blog.naver.com/something") == "기타"
