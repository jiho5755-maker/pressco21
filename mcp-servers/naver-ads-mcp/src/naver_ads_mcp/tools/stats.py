from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def stat_get_realtime(
    client: SearchAdClient,
    ids: list[str],
    fields: list[str] | None = None,
    time_range: dict[str, str] | None = None,
) -> Any:
    _require_sa()
    params: dict[str, str] = {"ids": ",".join(ids)}
    if fields:
        params["fields"] = json_fields(fields)
    if time_range:
        params.update(time_range)
    return await client.get("/stats", **params)


async def stat_get_by_date(
    client: SearchAdClient,
    ids: list[str],
    start_date: str,
    end_date: str,
    time_increment: str = "allDays",
) -> Any:
    _require_sa()
    params = {
        "ids": ",".join(ids),
        "fields": json_fields(DEFAULT_STAT_FIELDS),
        "timeRange": f'{{"since":"{start_date}","until":"{end_date}"}}',
        "timeIncrement": time_increment,
    }
    return await client.get("/stats", **params)


async def stat_get_by_hour(
    client: SearchAdClient,
    ids: list[str],
    date_str: str,
) -> Any:
    _require_sa()
    params = {
        "ids": ",".join(ids),
        "fields": json_fields(DEFAULT_STAT_FIELDS),
        "timeRange": f'{{"since":"{date_str}","until":"{date_str}"}}',
        "timeIncrement": "hourly",
    }
    return await client.get("/stats", **params)


DEFAULT_STAT_FIELDS = [
    "impCnt",
    "clkCnt",
    "salesAmt",
    "ctr",
    "cpc",
    "avgRnk",
    "ccnt",
    "convAmt",
    "viewCnt",
]


def json_fields(fields: list[str]) -> str:
    import json

    return json.dumps(fields)
