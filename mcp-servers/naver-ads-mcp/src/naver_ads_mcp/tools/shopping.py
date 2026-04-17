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


async def shopping_campaign_list(client: SearchAdClient) -> Any:
    _require_sa()
    return await client.get("/ncc/campaigns", campaignTp="SHOPPING")


async def shopping_product_list(client: SearchAdClient, adgroup_id: str | None = None) -> Any:
    _require_sa()
    params: dict[str, str] = {}
    if adgroup_id:
        params["nccAdgroupId"] = adgroup_id
    return await client.get("/ncc/ad-products", **params)


async def shopping_product_update_bid(
    client: SearchAdClient, product_id: str, bid_amt: int, dry_run: bool = True
) -> dict[str, Any]:
    _require_sa()
    if dry_run:
        return {"ok": True, "dry_run": True, "id": product_id, "newBidAmt": bid_amt}
    _require_write()
    log_write_action("shopping_product_update_bid", {"id": product_id, "bidAmt": bid_amt})
    result = await client.put(f"/ncc/ad-products/{product_id}", {"bidAmt": bid_amt})
    return {"ok": True, "dry_run": False, "result": result}


async def shopping_product_update_bid_bulk(
    client: SearchAdClient, updates: list[dict[str, Any]], dry_run: bool = True
) -> dict[str, Any]:
    _require_sa()
    if not dry_run:
        _require_write()

    results: list[dict[str, Any]] = []
    for item in updates:
        pid = item["id"]
        bid = item["bidAmt"]
        if dry_run:
            results.append({"id": pid, "newBidAmt": bid, "action": "dry_run"})
        else:
            log_write_action("shopping_product_update_bid", {"id": pid, "bidAmt": bid})
            resp = await client.put(f"/ncc/ad-products/{pid}", {"bidAmt": bid})
            results.append({"id": pid, "result": resp})

    return {"ok": True, "dry_run": dry_run, "count": len(results), "results": results}
