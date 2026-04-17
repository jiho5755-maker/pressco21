from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.datalab import DataLabClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_datalab() -> None:
    if not settings.datalab_configured:
        raise AuthNotConfiguredError("datalab")


async def keyword_trend(
    client: DataLabClient,
    keyword_groups: list[dict[str, Any]],
    start_date: str,
    end_date: str,
    time_unit: str = "month",
) -> dict[str, Any]:
    """키워드 검색량 월별/주별/일별 추이 (네이버 데이터랩)."""
    _require_datalab()
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": time_unit,
        "keywordGroups": keyword_groups,
    }
    raw = await client.post("/v1/datalab/search", body)

    results: list[dict[str, Any]] = []
    for group in raw.get("results", []):
        results.append(
            {
                "title": group.get("title", ""),
                "keywords": group.get("keywords", []),
                "data": group.get("data", []),
            }
        )

    return {
        "ok": True,
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": time_unit,
        "note": "ratio는 0~100 상대값 (최대 검색량=100 기준).",
        "results": results,
    }
