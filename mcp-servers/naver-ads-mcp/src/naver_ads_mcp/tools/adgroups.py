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


async def adgroup_list(client: SearchAdClient, campaign_id: str | None = None) -> Any:
    _require_sa()
    params: dict[str, str] = {}
    if campaign_id:
        params["nccCampaignId"] = campaign_id
    return await client.get("/ncc/adgroups", **params)


async def adgroup_get(client: SearchAdClient, adgroup_id: str) -> Any:
    _require_sa()
    return await client.get(f"/ncc/adgroups/{adgroup_id}")


async def adgroup_create(client: SearchAdClient, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    log_write_action("adgroup_create", body)
    return await client.post("/ncc/adgroups", body)


async def adgroup_update(client: SearchAdClient, adgroup_id: str, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    if "userStatus" in body:
        body["userLock"] = body.pop("userStatus").upper() == "PAUSED"
    _FM = {"bidAmt": "bidAmt", "userLock": "userLock", "dailyBudget": "dailyBudget"}
    fields = {_FM[k] for k in body if k in _FM} or {"userLock"}
    body["nccAdgroupId"] = adgroup_id
    log_write_action("adgroup_update", {"id": adgroup_id, **body})
    return await client.put(
        f"/ncc/adgroups/{adgroup_id}?fields={','.join(fields)}", body
    )


async def adgroup_delete(client: SearchAdClient, adgroup_id: str) -> Any:
    _require_sa()
    _require_write()
    log_write_action("adgroup_delete", {"id": adgroup_id})
    return await client.delete(f"/ncc/adgroups/{adgroup_id}")
