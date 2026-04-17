from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError

OWN_DOMAINS = {"foreverlove.co.kr", "www.foreverlove.co.kr"}
MARKETPLACE_DOMAINS = {
    "smartstore.naver.com",
    "shopping.naver.com",
    "www.coupang.com",
    "www.11st.co.kr",
    "www.gmarket.co.kr",
    "www.auction.co.kr",
}


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


def _classify_url(url: str) -> str:
    if not url:
        return "empty"
    host = urlparse(url).hostname or ""
    if host in OWN_DOMAINS:
        return "자사몰"
    if any(host.endswith(mp) for mp in MARKETPLACE_DOMAINS):
        return "오픈마켓"
    return "기타"


async def landing_url_audit(
    client: SearchAdClient,
    campaign_id: str | None = None,
) -> dict[str, Any]:
    """모든 활성 광고소재 랜딩 URL의 자사몰 vs 오픈마켓 비중 리포트."""
    _require_sa()

    if campaign_id:
        campaigns = [await client.get(f"/ncc/campaigns/{campaign_id}")]
    else:
        campaigns = await client.get("/ncc/campaigns")

    all_ads: list[dict[str, Any]] = []
    for cmp in campaigns or []:
        cid = cmp.get("nccCampaignId", campaign_id)
        adgroups = await client.get("/ncc/adgroups", nccCampaignId=cid)
        for grp in adgroups or []:
            ads = await client.get("/ncc/ads", nccAdgroupId=grp["nccAdgroupId"])
            for ad in ads or []:
                if ad.get("userStatus") != "ENABLE":
                    continue
                ad_data = ad.get("ad", {})
                url = (
                    ad_data.get("pc", {}).get("final")
                    or ad_data.get("mobile", {}).get("final")
                    or ad_data.get("displayUrl", "")
                )
                classification = _classify_url(url)
                all_ads.append(
                    {
                        "nccAdId": ad.get("nccAdId"),
                        "campaign": cmp.get("name"),
                        "adgroup": grp.get("name"),
                        "headline": ad_data.get("headline") or ad_data.get("subject"),
                        "landingUrl": url,
                        "classification": classification,
                    }
                )

    counts = {"자사몰": 0, "오픈마켓": 0, "기타": 0, "empty": 0}
    for ad in all_ads:
        counts[ad["classification"]] = counts.get(ad["classification"], 0) + 1

    total = len(all_ads)
    own_pct = round(counts["자사몰"] / total * 100, 1) if total > 0 else 0

    return {
        "ok": True,
        "totalActiveAds": total,
        "summary": counts,
        "ownSitePercent": own_pct,
        "recommendation": ("자사몰 비중 확대 권고" if own_pct < 50 else "자사몰 비중 양호"),
        "ads": all_ads,
    }
