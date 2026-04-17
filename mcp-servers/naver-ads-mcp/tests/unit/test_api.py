from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.config.settings.api_secret_key", "test-key-123")
    monkeypatch.setattr("naver_ads_mcp.config.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.config.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.config.settings.naver_sa_customer_id", "1")
    monkeypatch.setattr("naver_ads_mcp.config.settings.mcp_write_enabled", True)
    monkeypatch.setattr("naver_ads_mcp.config.settings.max_bid_delta_pct", 20)


@pytest.fixture()
def client():
    from naver_ads_mcp.api import app

    return TestClient(app)


HEADERS = {"X-Api-Key": "test-key-123"}
_API = "naver_ads_mcp.api"


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["service"] == "naver-ads-api"


def test_unauthorized(client):
    resp = client.post("/api/v1/budget-alert", json={}, headers={"X-Api-Key": "wrong"})
    assert resp.status_code == 401


def test_budget_alert_ok(client):
    mock_result = {
        "ok": True,
        "alert_count": 0,
        "alerts": [],
        "campaigns": [],
    }
    with (
        patch(f"{_API}.budget_pace_check", new_callable=AsyncMock, return_value=mock_result),
        patch(f"{_API}._get_sa"),
    ):
        resp = client.post("/api/v1/budget-alert", json={}, headers=HEADERS)
    assert resp.status_code == 200
    assert resp.json()["alert_count"] == 0


def test_quality_report_ok(client):
    mock_result = {
        "ok": True,
        "totalKeywords": 10,
        "goodCount": 8,
        "warningCount": 1,
        "criticalCount": 1,
        "unknownCount": 0,
    }
    with (
        patch(
            f"{_API}.keyword_quality_check",
            new_callable=AsyncMock,
            return_value=mock_result,
        ),
        patch(f"{_API}._get_sa"),
    ):
        resp = client.post("/api/v1/quality-report", json={}, headers=HEADERS)
    assert resp.status_code == 200
    assert resp.json()["goodCount"] == 8


def test_daily_cycle_dry_run(client):
    mock_campaigns = [
        {
            "nccCampaignId": "cmp-1",
            "name": "테스트",
            "userStatus": "ENABLE",
            "dailyBudget": 10000,
        }
    ]
    mock_prune = {
        "ok": True,
        "dry_run": True,
        "pruneCount": 2,
        "toPrune": [{"keyword": "압화 무료"}, {"keyword": "압화 수리"}],
        "totalActive": 10,
        "keepCount": 8,
    }
    mock_optimize = {
        "ok": True,
        "dry_run": True,
        "changeCount": 1,
        "changes": [{"action": "raise", "keyword": "압화"}],
    }
    mock_budget = {
        "ok": True,
        "alert_count": 0,
        "alerts": [],
        "campaigns": [],
    }
    mock_qi = {
        "ok": True,
        "goodCount": 8,
        "warningCount": 1,
        "criticalCount": 0,
        "unknownCount": 1,
    }

    sa_mock = AsyncMock()
    sa_mock.get = AsyncMock(return_value=mock_campaigns)

    with (
        patch(f"{_API}._get_sa", return_value=sa_mock),
        patch(
            f"{_API}.bulk_auto_prune",
            new_callable=AsyncMock,
            return_value=mock_prune,
        ),
        patch(
            f"{_API}.bulk_bid_optimizer",
            new_callable=AsyncMock,
            return_value=mock_optimize,
        ),
        patch(
            f"{_API}.budget_pace_check",
            new_callable=AsyncMock,
            return_value=mock_budget,
        ),
        patch(
            f"{_API}.keyword_quality_check",
            new_callable=AsyncMock,
            return_value=mock_qi,
        ),
    ):
        resp = client.post(
            "/api/v1/daily-cycle",
            json={"dry_run": True},
            headers=HEADERS,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["dry_run"] is True
    assert data["prune"]["results"][0]["pruneCount"] == 2
    assert data["optimize"]["results"][0]["changeCount"] == 1
