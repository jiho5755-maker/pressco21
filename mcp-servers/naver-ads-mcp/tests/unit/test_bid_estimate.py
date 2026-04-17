from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.bid_estimate import (
    bid_estimate_median,
    bid_estimate_position,
    bid_simulate,
)


@pytest.fixture()
def sa_client():
    return AsyncMock()


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.bid_estimate.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.bid_estimate.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.bid_estimate.settings.naver_sa_customer_id", "1")


async def test_bid_simulate(sa_client):
    sa_client.post.return_value = {
        "device": "PC",
        "keyword": "압화",
        "estimate": [
            {"bid": 100, "clicks": 5, "impressions": 100, "cost": 500},
            {"bid": 200, "clicks": 10, "impressions": 200, "cost": 1500},
        ],
    }
    result = await bid_simulate(sa_client, "압화", [100, 200])
    assert result["ok"] is True
    assert len(result["estimates"]) == 2
    assert result["estimates"][0]["bid"] == 100


async def test_bid_estimate_position(sa_client):
    sa_client.post.return_value = {
        "estimate": [{"bid": 150, "keyword": "압화", "position": 1}]
    }
    result = await bid_estimate_position(sa_client, "압화", position_target=1)
    assert result["estimatedBid"] == 150


async def test_bid_estimate_median(sa_client):
    sa_client.post.return_value = {
        "estimate": [
            {"bid": 200, "keyword": "압화", "position": 1},
            {"bid": 120, "keyword": "압화", "position": 3},
            {"bid": 70, "keyword": "압화", "position": 5},
        ]
    }
    result = await bid_estimate_median(sa_client, "압화")
    assert result["medianBid"] == 120
    assert result["bidByPosition"] == {1: 200, 3: 120, 5: 70}
