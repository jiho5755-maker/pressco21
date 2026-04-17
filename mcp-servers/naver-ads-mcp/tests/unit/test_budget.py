from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.budget import budget_auto_pause, budget_pace_check


@pytest.fixture()
def sa_client():
    return AsyncMock()


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.budget.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.budget.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.budget.settings.naver_sa_customer_id", "1")
    monkeypatch.setattr("naver_ads_mcp.tools.budget.settings.mcp_write_enabled", True)


async def test_pace_check_no_active_campaigns(sa_client):
    sa_client.get.return_value = [
        {"nccCampaignId": "cmp-1", "userStatus": "PAUSED", "dailyBudget": 10000}
    ]
    result = await budget_pace_check(sa_client)
    assert result["alert_count"] == 0


async def test_pace_check_warning(sa_client):
    sa_client.get.side_effect = [
        [{"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"}],
        [{"id": "cmp-1", "salesAmt": 8500}],
    ]
    result = await budget_pace_check(sa_client)
    assert result["alert_count"] == 1
    assert result["alerts"][0]["alert"] == "WARNING"
    assert result["alerts"][0]["pacePercent"] == 85.0


async def test_pace_check_critical(sa_client):
    sa_client.get.side_effect = [
        [{"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"}],
        [{"id": "cmp-1", "salesAmt": 9600}],
    ]
    result = await budget_pace_check(sa_client)
    assert result["alerts"][0]["alert"] == "CRITICAL"


async def test_pace_check_ok(sa_client):
    sa_client.get.side_effect = [
        [{"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"}],
        [{"id": "cmp-1", "salesAmt": 3000}],
    ]
    result = await budget_pace_check(sa_client)
    assert result["alert_count"] == 0
    assert result["campaigns"][0]["alert"] == "OK"


async def test_auto_pause_dry_run(sa_client):
    sa_client.get.side_effect = [
        {"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"},
        [{"id": "cmp-1", "salesAmt": 9700}],
    ]
    result = await budget_auto_pause(sa_client, "cmp-1", dry_run=True)
    assert result["dry_run"] is True
    assert result["wouldPause"] is True
    sa_client.put.assert_not_called()


async def test_auto_pause_execute(sa_client):
    sa_client.get.side_effect = [
        {"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"},
        [{"id": "cmp-1", "salesAmt": 9700}],
    ]
    sa_client.put.return_value = {"userStatus": "PAUSED"}
    result = await budget_auto_pause(sa_client, "cmp-1", dry_run=False)
    assert result["action"] == "paused"
    sa_client.put.assert_called_once()


async def test_auto_pause_already_paused(sa_client):
    sa_client.get.return_value = {
        "nccCampaignId": "cmp-1",
        "userStatus": "PAUSED",
        "dailyBudget": 10000,
        "name": "test",
    }
    result = await budget_auto_pause(sa_client, "cmp-1", dry_run=False)
    assert result["action"] == "skip"


async def test_auto_pause_below_threshold(sa_client):
    sa_client.get.side_effect = [
        {"nccCampaignId": "cmp-1", "userStatus": "ENABLE", "dailyBudget": 10000, "name": "test"},
        [{"id": "cmp-1", "salesAmt": 5000}],
    ]
    result = await budget_auto_pause(sa_client, "cmp-1", dry_run=False)
    assert result["action"] == "keep"
    sa_client.put.assert_not_called()
