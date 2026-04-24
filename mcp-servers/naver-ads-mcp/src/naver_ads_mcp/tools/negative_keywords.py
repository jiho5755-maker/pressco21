from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError, NaverApiError, WriteDisabledError
from naver_ads_mcp.utils.audit_log import log_write_action


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


def _require_write() -> None:
    if not settings.mcp_write_enabled:
        raise WriteDisabledError()


async def negative_keyword_list(client: SearchAdClient, adgroup_id: str) -> Any:
    _require_sa()
    try:
        return await client.get("/ncc/negative-keywords", nccAdgroupId=adgroup_id)
    except NaverApiError as e:
        if e.http_status == 404:
            return []
        raise


async def negative_keyword_create_bulk(
    client: SearchAdClient,
    adgroup_id: str,
    keywords: list[dict[str, Any]],
    dry_run: bool = True,
) -> dict[str, Any]:
    _require_sa()
    body = [
        {
            "type": kw.get("type", "KEYWORD"),
            "keyword": kw["keyword"],
            "nccAdgroupId": adgroup_id,
        }
        for kw in keywords
    ]
    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "adgroup_id": adgroup_id,
            "count": len(body),
            "preview": body,
        }
    _require_write()
    log_write_action(
        "negative_keyword_create_bulk",
        {"adgroup_id": adgroup_id, "count": len(body)},
    )
    result = await client.post("/ncc/negative-keywords", body, nccAdgroupId=adgroup_id)
    return {"ok": True, "dry_run": False, "count": len(body), "results": result}


async def negative_keyword_delete_bulk(
    client: SearchAdClient,
    keyword_ids: list[str],
    dry_run: bool = True,
) -> dict[str, Any]:
    _require_sa()
    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "count": len(keyword_ids),
            "ids": keyword_ids,
        }
    _require_write()
    log_write_action(
        "negative_keyword_delete_bulk",
        {"count": len(keyword_ids), "ids": keyword_ids},
    )
    await client.delete("/ncc/negative-keywords", ids=",".join(keyword_ids))
    return {
        "ok": True,
        "dry_run": False,
        "count": len(keyword_ids),
        "deleted_ids": keyword_ids,
    }
