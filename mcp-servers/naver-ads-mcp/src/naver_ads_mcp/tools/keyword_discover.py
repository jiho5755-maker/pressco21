from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def keyword_discover(
    client: SearchAdClient,
    hint_keywords: list[str],
) -> dict[str, Any]:
    """시드 키워드 → 연관 키워드 추출 (검색량/경쟁도/CPC 포함)."""
    _require_sa()
    hint = ",".join(hint_keywords)
    raw = await client.get("/keywordstool", hintKeywords=hint, showDetail="1")

    keywords: list[dict[str, Any]] = []
    for item in raw.get("keywordList", []):
        pc = item.get("monthlyPcQcCnt", 0) or 0
        mo = item.get("monthlyMobileQcCnt", 0) or 0
        if isinstance(pc, str) and pc.startswith("<"):
            pc = 10
        if isinstance(mo, str) and mo.startswith("<"):
            mo = 10
        total = int(pc) + int(mo)

        keywords.append(
            {
                "keyword": item.get("relKeyword", ""),
                "monthlySearches": total,
                "monthlyPc": pc,
                "monthlyMobile": mo,
                "competitionIndex": item.get("compIdx", ""),
                "avgCpc": item.get("plAvgDepth"),
                "avgPcCtr": item.get("monthlyAvePcCtr"),
                "avgMobileCtr": item.get("monthlyAveMobileCtr"),
            }
        )

    keywords.sort(key=lambda x: x["monthlySearches"], reverse=True)

    return {
        "ok": True,
        "hintKeywords": hint_keywords,
        "totalFound": len(keywords),
        "keywords": keywords,
    }


async def keyword_competitor_gap(
    client: SearchAdClient,
    hint_keywords: list[str],
    adgroup_id: str | None = None,
) -> dict[str, Any]:
    """내 키워드 vs 연관키워드 비교 → 미사용 유망 키워드 발굴."""
    _require_sa()

    discover_result = await keyword_discover(client, hint_keywords)
    all_related = {kw["keyword"] for kw in discover_result["keywords"]}

    params: dict[str, str] = {}
    if adgroup_id:
        params["nccAdgroupId"] = adgroup_id
    my_keywords_raw = await client.get("/ncc/keywords", **params)
    my_keywords = {kw.get("keyword", "") for kw in (my_keywords_raw or [])}

    gap = all_related - my_keywords
    gap_details = [kw for kw in discover_result["keywords"] if kw["keyword"] in gap]

    return {
        "ok": True,
        "myKeywordCount": len(my_keywords),
        "relatedKeywordCount": len(all_related),
        "gapCount": len(gap_details),
        "gapKeywords": gap_details[:50],
    }
