from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from naver_ads_mcp.tools.negative_keywords import (
    negative_keyword_create_bulk,
    negative_keyword_delete_bulk,
    negative_keyword_list,
)


@pytest.fixture()
def sa_client():
    client = AsyncMock()
    return client


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr("naver_ads_mcp.tools.negative_keywords.settings.naver_sa_api_key", "k")
    monkeypatch.setattr("naver_ads_mcp.tools.negative_keywords.settings.naver_sa_secret_key", "s")
    monkeypatch.setattr("naver_ads_mcp.tools.negative_keywords.settings.naver_sa_customer_id", "1")
    monkeypatch.setattr("naver_ads_mcp.tools.negative_keywords.settings.mcp_write_enabled", True)


async def test_negative_keyword_list(sa_client):
    sa_client.get.return_value = [
        {"nccNegativeKeywordId": "nkw-1", "keyword": "무료", "type": "KEYWORD"}
    ]
    result = await negative_keyword_list(sa_client, "grp-abc")
    sa_client.get.assert_called_once_with("/ncc/negative-keywords", nccAdgroupId="grp-abc")
    assert result[0]["keyword"] == "무료"


async def test_create_bulk_dry_run(sa_client):
    result = await negative_keyword_create_bulk(
        sa_client, "grp-abc", [{"keyword": "무료"}, {"keyword": "수리"}], dry_run=True
    )
    assert result["dry_run"] is True
    assert result["count"] == 2
    sa_client.post.assert_not_called()


async def test_create_bulk_execute(sa_client):
    sa_client.post.return_value = [{"nccNegativeKeywordId": "nkw-1"}]
    result = await negative_keyword_create_bulk(
        sa_client, "grp-abc", [{"keyword": "무료"}], dry_run=False
    )
    assert result["dry_run"] is False
    assert result["count"] == 1
    sa_client.post.assert_called_once()


async def test_delete_bulk_dry_run(sa_client):
    result = await negative_keyword_delete_bulk(sa_client, ["nkw-1", "nkw-2"], dry_run=True)
    assert result["dry_run"] is True
    assert result["count"] == 2
    sa_client.delete.assert_not_called()


async def test_delete_bulk_execute(sa_client):
    sa_client.delete.return_value = None
    result = await negative_keyword_delete_bulk(sa_client, ["nkw-1"], dry_run=False)
    assert result["dry_run"] is False
    assert result["deleted_ids"] == ["nkw-1"]
    sa_client.delete.assert_called_once_with("/ncc/negative-keywords", ids="nkw-1")
