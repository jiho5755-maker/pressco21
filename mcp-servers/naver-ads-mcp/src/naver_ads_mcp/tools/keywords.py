from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError, WriteDisabledError
from naver_ads_mcp.utils.audit_log import log_write_action


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


def _require_write() -> None:
    if not settings.mcp_write_enabled:
        raise WriteDisabledError()


async def keyword_list(client: SearchAdClient, adgroup_id: str | None = None) -> Any:
    _require_sa()
    params: dict[str, str] = {}
    if adgroup_id:
        params["nccAdgroupId"] = adgroup_id
    return await client.get("/ncc/keywords", **params)


async def keyword_get(client: SearchAdClient, keyword_id: str) -> Any:
    _require_sa()
    return await client.get(f"/ncc/keywords/{keyword_id}")


async def keyword_create_bulk(
    client: SearchAdClient, adgroup_id: str, keywords: list[dict[str, Any]]
) -> Any:
    _require_sa()
    _require_write()
    log_write_action("keyword_create_bulk", {"adgroup_id": adgroup_id, "count": len(keywords)})
    return await client.post(f"/ncc/keywords?nccAdgroupId={adgroup_id}", keywords)


async def keyword_update_bid_bulk(
    client: SearchAdClient, updates: list[dict[str, Any]], dry_run: bool = True
) -> dict[str, Any]:
    _require_sa()
    if not dry_run:
        _require_write()

    results: list[dict[str, Any]] = []
    for item in updates:
        kid = item["nccKeywordId"]
        bid = item["bidAmt"]
        agid = item.get("nccAdgroupId")
        if dry_run:
            results.append({"nccKeywordId": kid, "newBidAmt": bid, "action": "dry_run"})
        else:
            if not agid:
                kw = await client.get(f"/ncc/keywords/{kid}")
                agid = kw["nccAdgroupId"]
            log_write_action("keyword_update_bid", {"id": kid, "bidAmt": bid})
            resp = await client.put(
                f"/ncc/keywords/{kid}?fields=bidAmt",
                {"nccKeywordId": kid, "nccAdgroupId": agid, "bidAmt": bid, "useGroupBidAmt": False},
            )
            results.append({"nccKeywordId": kid, "result": resp})

    return {"ok": True, "dry_run": dry_run, "count": len(results), "results": results}


async def keyword_update_status_bulk(
    client: SearchAdClient, updates: list[dict[str, Any]], dry_run: bool = True
) -> dict[str, Any]:
    _require_sa()
    if not dry_run:
        _require_write()

    results: list[dict[str, Any]] = []
    for item in updates:
        kid = item["nccKeywordId"]
        status = item["userStatus"]
        if dry_run:
            results.append({"nccKeywordId": kid, "newStatus": status, "action": "dry_run"})
        else:
            agid = item.get("nccAdgroupId")
            if not agid:
                kw = await client.get(f"/ncc/keywords/{kid}")
                agid = kw["nccAdgroupId"]
            lock = status.upper() == "PAUSED"
            log_write_action("keyword_update_status", {"id": kid, "status": status})
            resp = await client.put(
                f"/ncc/keywords/{kid}?fields=userLock",
                {"nccKeywordId": kid, "nccAdgroupId": agid, "userLock": lock},
            )
            results.append({"nccKeywordId": kid, "result": resp})

    return {"ok": True, "dry_run": dry_run, "count": len(results), "results": results}
