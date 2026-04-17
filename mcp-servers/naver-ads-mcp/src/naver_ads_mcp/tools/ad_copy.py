from __future__ import annotations

import json
from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def ad_copy_context(
    client: SearchAdClient,
    adgroup_id: str,
) -> dict[str, Any]:
    """키워드+상품명+경쟁소재 데이터 수집 → 구조화된 프롬프트 반환."""
    _require_sa()

    adgroup = await client.get(f"/ncc/adgroups/{adgroup_id}")
    keywords_raw = await client.get("/ncc/keywords", nccAdgroupId=adgroup_id)
    ads_raw = await client.get("/ncc/ads", nccAdgroupId=adgroup_id)

    keywords = [
        {"keyword": kw.get("keyword"), "bidAmt": kw.get("bidAmt")}
        for kw in (keywords_raw or [])
        if kw.get("userStatus") == "ENABLE"
    ]

    existing_ads = []
    for ad in ads_raw or []:
        ad_data = ad.get("ad", {})
        existing_ads.append(
            {
                "type": ad.get("type"),
                "headline": ad_data.get("headline") or ad_data.get("subject"),
                "description": ad_data.get("description"),
                "userStatus": ad.get("userStatus"),
            }
        )

    hint_kws = [kw["keyword"] for kw in keywords[:5]]
    related: list[dict[str, Any]] = []
    if hint_kws:
        raw = await client.get("/keywordstool", hintKeywords=",".join(hint_kws), showDetail="1")
        for item in (raw.get("keywordList", []))[:20]:
            related.append(
                {
                    "keyword": item.get("relKeyword"),
                    "monthlySearches": (item.get("monthlyPcQcCnt", 0) or 0)
                    + (item.get("monthlyMobileQcCnt", 0) or 0),
                    "competition": item.get("compIdx"),
                }
            )

    return {
        "ok": True,
        "adgroupName": adgroup.get("name"),
        "keywords": keywords,
        "existingAds": existing_ads,
        "relatedKeywords": related,
        "promptHint": (
            "위 데이터를 참고하여 네이버 검색광고 소재를 작성하세요. "
            "제목 15자, 설명 45자 이내. "
            "PRESSCO21 브랜드 톤: 전문적이면서 따뜻한, 30년 꽃공예 전문."
        ),
    }


async def ad_copy_best_patterns(
    client: SearchAdClient,
    campaign_id: str,
    start_date: str,
    end_date: str,
    top_n: int = 5,
) -> dict[str, Any]:
    """CTR 상위 소재의 제목/설명문 패턴 추출."""
    _require_sa()

    adgroups = await client.get("/ncc/adgroups", nccCampaignId=campaign_id)
    all_ads: list[dict[str, Any]] = []
    for grp in adgroups or []:
        ads = await client.get("/ncc/ads", nccAdgroupId=grp["nccAdgroupId"])
        for ad in ads or []:
            if ad.get("userStatus") == "ENABLE":
                all_ads.append(
                    {
                        "nccAdId": ad.get("nccAdId"),
                        "adgroupName": grp.get("name"),
                        "type": ad.get("type"),
                        "ad": ad.get("ad", {}),
                    }
                )

    if not all_ads:
        return {"ok": True, "patterns": [], "message": "활성 소재 없음"}

    ad_ids = [a["nccAdId"] for a in all_ads]
    time_range = json.dumps({"since": start_date, "until": end_date})
    stats_raw = await client.get(
        "/stats",
        ids=",".join(ad_ids),
        fields=json.dumps(["impCnt", "clkCnt", "ctr", "ccnt"]),
        timeRange=time_range,
        timeIncrement="allDays",
    )
    rows = stats_raw if isinstance(stats_raw, list) else (stats_raw or {}).get("data", [])
    stats_map = {r.get("id"): r for r in rows if r.get("id")}

    for ad in all_ads:
        stat = stats_map.get(ad["nccAdId"], {})
        ad["impressions"] = stat.get("impCnt", 0)
        ad["clicks"] = stat.get("clkCnt", 0)
        ad["ctr"] = stat.get("ctr", 0)
        ad["conversions"] = stat.get("ccnt", 0)

    sorted_ads = sorted(all_ads, key=lambda x: x["ctr"], reverse=True)

    patterns = []
    for ad in sorted_ads[:top_n]:
        ad_data = ad["ad"]
        patterns.append(
            {
                "headline": ad_data.get("headline") or ad_data.get("subject"),
                "description": ad_data.get("description"),
                "adgroupName": ad["adgroupName"],
                "ctr": ad["ctr"],
                "impressions": ad["impressions"],
                "clicks": ad["clicks"],
                "conversions": ad["conversions"],
            }
        )

    return {
        "ok": True,
        "period": f"{start_date} ~ {end_date}",
        "totalAds": len(all_ads),
        "topN": top_n,
        "patterns": patterns,
    }
