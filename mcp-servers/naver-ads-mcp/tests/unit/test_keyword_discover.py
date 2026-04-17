from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.keyword_discover import keyword_competitor_gap, keyword_discover


@pytest.fixture()
def sa_client():
    return AsyncMock()


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.keyword_discover.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.keyword_discover.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.keyword_discover.settings.naver_sa_customer_id", "1")


async def test_discover_parses_keywords(sa_client):
    sa_client.get.return_value = {
        "keywordList": [
            {
                "relKeyword": "압화",
                "monthlyPcQcCnt": 1000,
                "monthlyMobileQcCnt": 5000,
                "compIdx": "중간",
                "plAvgDepth": 8,
                "monthlyAvePcCtr": 0.8,
                "monthlyAveMobileCtr": 1.5,
            },
            {
                "relKeyword": "압화 만들기",
                "monthlyPcQcCnt": 500,
                "monthlyMobileQcCnt": 3000,
                "compIdx": "낮음",
                "plAvgDepth": 5,
            },
        ]
    }
    result = await keyword_discover(sa_client, ["압화"])
    assert result["ok"] is True
    assert result["totalFound"] == 2
    assert result["keywords"][0]["monthlySearches"] == 6000
    assert result["keywords"][0]["competitionIndex"] == "중간"


async def test_discover_handles_less_than_values(sa_client):
    sa_client.get.return_value = {
        "keywordList": [
            {"relKeyword": "test", "monthlyPcQcCnt": "<10", "monthlyMobileQcCnt": "<10"}
        ]
    }
    result = await keyword_discover(sa_client, ["test"])
    assert result["keywords"][0]["monthlySearches"] == 20


async def test_competitor_gap(sa_client):
    sa_client.get.side_effect = [
        {
            "keywordList": [
                {"relKeyword": "압화", "monthlyPcQcCnt": 1000, "monthlyMobileQcCnt": 5000},
                {"relKeyword": "압화 키트", "monthlyPcQcCnt": 500, "monthlyMobileQcCnt": 2000},
                {"relKeyword": "압화 도안", "monthlyPcQcCnt": 300, "monthlyMobileQcCnt": 1000},
            ]
        },
        [{"keyword": "압화"}],
    ]
    result = await keyword_competitor_gap(sa_client, ["압화"])
    assert result["myKeywordCount"] == 1
    assert result["gapCount"] == 2
