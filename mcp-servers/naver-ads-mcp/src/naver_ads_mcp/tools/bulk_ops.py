from __future__ import annotations

import json
from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def bulk_keyword_filter(
    keywords: list[dict[str, Any]],
    min_searches: int = 100,
    max_cpc: int | None = None,
    competition: list[str] | None = None,
) -> dict[str, Any]:
    """수확된 키워드를 검색량/경쟁도/CPC 기준으로 필터링. API 불필요."""
    allowed_comp = set(competition) if competition else None
    passed: list[dict[str, Any]] = []
    filtered_out: list[dict[str, Any]] = []

    for kw in keywords:
        searches = kw.get("monthlySearches", 0)
        cpc = kw.get("avgCpc") or 0
        comp = kw.get("competitionIndex", "")
        reasons: list[str] = []

        if searches < min_searches:
            reasons.append(f"검색량 {searches} < {min_searches}")
        if max_cpc is not None and cpc > max_cpc:
            reasons.append(f"CPC {cpc} > {max_cpc}")
        if allowed_comp and comp not in allowed_comp:
            reasons.append(f"경쟁도 {comp} 허용 외")

        if reasons:
            kw_copy = {**kw, "filterReasons": reasons}
            filtered_out.append(kw_copy)
        else:
            passed.append(kw)

    return {
        "ok": True,
        "criteria": {
            "min_searches": min_searches,
            "max_cpc": max_cpc,
            "competition": competition,
        },
        "passedCount": len(passed),
        "filteredOutCount": len(filtered_out),
        "passed": passed,
        "filteredOut": filtered_out[:20],
    }


DEFAULT_STAT_FIELDS = json.dumps(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "ccnt", "convAmt"])


async def bulk_performance_audit(
    client: SearchAdClient,
    campaign_id: str,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    """벌크 캠페인 키워드별 성과 분석 (전환/비전환 분류)."""
    _require_sa()

    adgroups = await client.get("/ncc/adgroups", nccCampaignId=campaign_id)
    if not adgroups:
        return {"ok": True, "keywords": [], "message": "광고그룹 없음"}

    all_keywords: list[dict[str, Any]] = []
    for grp in adgroups:
        gid = grp["nccAdgroupId"]
        kws = await client.get("/ncc/keywords", nccAdgroupId=gid)
        for kw in kws or []:
            all_keywords.append(
                {
                    "nccKeywordId": kw.get("nccKeywordId"),
                    "keyword": kw.get("keyword"),
                    "bidAmt": kw.get("bidAmt"),
                    "userStatus": kw.get("userStatus"),
                    "adgroupName": grp.get("name"),
                }
            )

    if not all_keywords:
        return {"ok": True, "keywords": [], "message": "키워드 없음"}

    kw_ids = [kw["nccKeywordId"] for kw in all_keywords]
    time_range = json.dumps({"since": start_date, "until": end_date})
    stats_raw = await client.get(
        "/stats",
        ids=",".join(kw_ids),
        fields=DEFAULT_STAT_FIELDS,
        timeRange=time_range,
        timeIncrement="allDays",
    )

    stats_map: dict[str, dict[str, Any]] = {}
    rows = stats_raw if isinstance(stats_raw, list) else stats_raw.get("data", [])
    for row in rows:
        stats_map[row.get("id", "")] = row

    converting: list[dict[str, Any]] = []
    non_converting: list[dict[str, Any]] = []
    no_data: list[dict[str, Any]] = []

    for kw in all_keywords:
        kid = kw["nccKeywordId"]
        stat = stats_map.get(kid, {})
        kw["stats"] = {
            "impressions": stat.get("impCnt", 0),
            "clicks": stat.get("clkCnt", 0),
            "cost": stat.get("salesAmt", 0),
            "conversions": stat.get("ccnt", 0),
            "convRevenue": stat.get("convAmt", 0),
        }
        conversions = stat.get("ccnt", 0)
        clicks = stat.get("clkCnt", 0)

        if conversions > 0:
            converting.append(kw)
        elif clicks > 0:
            non_converting.append(kw)
        else:
            no_data.append(kw)

    return {
        "ok": True,
        "period": f"{start_date} ~ {end_date}",
        "totalKeywords": len(all_keywords),
        "summary": {
            "converting": len(converting),
            "nonConverting": len(non_converting),
            "noData": len(no_data),
        },
        "converting": converting,
        "nonConverting": non_converting[:30],
        "noData": no_data[:20],
    }
