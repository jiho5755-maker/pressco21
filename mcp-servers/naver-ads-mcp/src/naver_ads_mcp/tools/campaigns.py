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


async def campaign_list(
    client: SearchAdClient, ids: str | None = None, campaign_type: str | None = None
) -> Any:
    _require_sa()
    params: dict[str, str] = {}
    if ids:
        params["ids"] = ids
    if campaign_type:
        params["campaignTp"] = campaign_type
    return await client.get("/ncc/campaigns", **params)


async def campaign_get(client: SearchAdClient, campaign_id: str) -> Any:
    _require_sa()
    return await client.get(f"/ncc/campaigns/{campaign_id}")


async def campaign_create(client: SearchAdClient, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    log_write_action("campaign_create", body)
    return await client.post("/ncc/campaigns", body)


async def campaign_update(client: SearchAdClient, campaign_id: str, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    if "userStatus" in body:
        body["userLock"] = body.pop("userStatus").upper() == "PAUSED"
    _FIELD_MAP = {"dailyBudget": "budget", "useDailyBudget": "budget", "userLock": "userLock"}
    fields = {_FIELD_MAP[k] for k in body if k in _FIELD_MAP} or {"userLock"}
    body["nccCampaignId"] = campaign_id
    log_write_action("campaign_update", {"id": campaign_id, **body})
    return await client.put(
        f"/ncc/campaigns/{campaign_id}?fields={','.join(fields)}", body
    )


async def campaign_delete(client: SearchAdClient, campaign_id: str) -> Any:
    _require_sa()
    _require_write()
    log_write_action("campaign_delete", {"id": campaign_id})
    return await client.delete(f"/ncc/campaigns/{campaign_id}")
