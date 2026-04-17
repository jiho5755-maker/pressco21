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


async def ad_list(client: SearchAdClient, adgroup_id: str | None = None) -> Any:
    _require_sa()
    params: dict[str, str] = {}
    if adgroup_id:
        params["nccAdgroupId"] = adgroup_id
    return await client.get("/ncc/ads", **params)


async def ad_get(client: SearchAdClient, ad_id: str) -> Any:
    _require_sa()
    return await client.get(f"/ncc/ads/{ad_id}")


async def ad_create(client: SearchAdClient, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    log_write_action("ad_create", body)
    return await client.post("/ncc/ads", body)


async def ad_update(client: SearchAdClient, ad_id: str, body: dict[str, Any]) -> Any:
    _require_sa()
    _require_write()
    log_write_action("ad_update", {"id": ad_id, **body})
    return await client.put(f"/ncc/ads/{ad_id}", body)


async def ad_delete(client: SearchAdClient, ad_id: str) -> Any:
    _require_sa()
    _require_write()
    log_write_action("ad_delete", {"id": ad_id})
    return await client.delete(f"/ncc/ads/{ad_id}")
