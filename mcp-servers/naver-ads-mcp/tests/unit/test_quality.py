from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.quality import keyword_quality_check


@pytest.fixture()
def sa_client():
    return AsyncMock()


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.quality.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.quality.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.quality.settings.naver_sa_customer_id", "1")


async def test_quality_check_categorizes_correctly(sa_client):
    sa_client.get.return_value = [
        {"nccKeywordId": "kw-1", "keyword": "압화", "qualityIndex": 9, "bidAmt": 100},
        {"nccKeywordId": "kw-2", "keyword": "부케", "qualityIndex": 5, "bidAmt": 80},
        {"nccKeywordId": "kw-3", "keyword": "레진", "qualityIndex": 2, "bidAmt": 70},
        {"nccKeywordId": "kw-4", "keyword": "프리저브드", "qualityIndex": None, "bidAmt": 90},
    ]
    result = await keyword_quality_check(sa_client, adgroup_id="grp-1")
    assert result["ok"] is True
    assert result["total"] == 4
    assert result["summary"]["good_7_10"] == 1
    assert result["summary"]["warning_4_6"] == 1
    assert result["summary"]["critical_1_3"] == 1
    assert result["summary"]["unknown"] == 1
    assert result["critical"][0]["keyword"] == "레진"
    assert "recommendation" in result["critical"][0]


async def test_quality_check_empty(sa_client):
    sa_client.get.return_value = []
    result = await keyword_quality_check(sa_client, adgroup_id="grp-1")
    assert result["total"] == 0


async def test_quality_check_all_good(sa_client):
    sa_client.get.return_value = [
        {"nccKeywordId": "kw-1", "keyword": "압화", "qualityIndex": 8, "bidAmt": 100},
        {"nccKeywordId": "kw-2", "keyword": "부케", "qualityIndex": 10, "bidAmt": 80},
    ]
    result = await keyword_quality_check(sa_client, adgroup_id="grp-1")
    assert result["summary"]["good_7_10"] == 2
    assert result["summary"]["critical_1_3"] == 0
    assert result["summary"]["warning_4_6"] == 0


async def test_quality_check_all_campaigns(sa_client):
    sa_client.get.side_effect = [
        [{"nccCampaignId": "cmp-1", "userStatus": "ENABLE"}],
        [{"nccAdgroupId": "grp-1"}],
        [
            {"nccKeywordId": "kw-1", "keyword": "압화", "qualityIndex": 9, "bidAmt": 70},
            {"nccKeywordId": "kw-2", "keyword": "부케", "qualityIndex": 3, "bidAmt": 70},
        ],
    ]
    result = await keyword_quality_check(sa_client)
    assert result["total"] == 2
    assert result["summary"]["good_7_10"] == 1
    assert result["summary"]["critical_1_3"] == 1
