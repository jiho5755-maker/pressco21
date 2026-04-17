from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def keyword_quality_check(
    client: SearchAdClient,
    adgroup_id: str | None = None,
) -> dict[str, Any]:
    _require_sa()
    if adgroup_id:
        keywords = await client.get("/ncc/keywords", nccAdgroupId=adgroup_id)
    else:
        campaigns = await client.get("/ncc/campaigns") or []
        keywords = []
        for cmp in campaigns:
            if cmp.get("userStatus") != "ENABLE":
                continue
            adgroups = await client.get(
                "/ncc/adgroups", nccCampaignId=cmp["nccCampaignId"]
            )
            for grp in adgroups or []:
                kws = await client.get("/ncc/keywords", nccAdgroupId=grp["nccAdgroupId"])
                keywords.extend(kws or [])

    if not keywords:
        return {"ok": True, "total": 0, "summary": {}, "critical": [], "warning": [], "good": []}

    good: list[dict[str, Any]] = []
    warning: list[dict[str, Any]] = []
    critical: list[dict[str, Any]] = []
    unknown: list[dict[str, Any]] = []

    for kw in keywords:
        qi = kw.get("qualityIndex")
        entry: dict[str, Any] = {
            "nccKeywordId": kw.get("nccKeywordId"),
            "keyword": kw.get("keyword"),
            "qualityIndex": qi,
            "bidAmt": kw.get("bidAmt"),
            "userStatus": kw.get("userStatus"),
            "nccAdgroupId": kw.get("nccAdgroupId"),
        }
        if qi is None:
            unknown.append(entry)
        elif qi >= 7:
            good.append(entry)
        elif qi >= 4:
            entry["recommendation"] = "소재/랜딩페이지 점검 권고"
            warning.append(entry)
        else:
            entry["recommendation"] = "소재 교체 또는 키워드 제거 권고"
            critical.append(entry)

    return {
        "ok": True,
        "total": len(keywords),
        "summary": {
            "good_7_10": len(good),
            "warning_4_6": len(warning),
            "critical_1_3": len(critical),
            "unknown": len(unknown),
        },
        "critical": critical,
        "warning": warning,
        "good": good,
        "unknown": unknown,
    }
