from __future__ import annotations

import json
from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError, WriteDisabledError
from naver_ads_mcp.utils.audit_log import log_write_action

STAT_FIELDS = json.dumps(["clkCnt", "ccnt", "convAmt", "salesAmt"])


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


def _require_write() -> None:
    if not settings.mcp_write_enabled:
        raise WriteDisabledError()


async def _collect_keywords_with_stats(
    client: SearchAdClient,
    campaign_id: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    adgroups = await client.get("/ncc/adgroups", nccCampaignId=campaign_id)
    all_kws: list[dict[str, Any]] = []
    for grp in adgroups or []:
        kws = await client.get("/ncc/keywords", nccAdgroupId=grp["nccAdgroupId"])
        for kw in kws or []:
            if kw.get("userStatus") == "ENABLE":
                all_kws.append(kw)

    if not all_kws:
        return []

    ids = [kw["nccKeywordId"] for kw in all_kws]
    time_range = json.dumps({"since": start_date, "until": end_date})
    stats_raw = await client.get(
        "/stats",
        ids=",".join(ids),
        fields=STAT_FIELDS,
        timeRange=time_range,
        timeIncrement="allDays",
    )
    rows = stats_raw if isinstance(stats_raw, list) else (stats_raw or {}).get("data", [])
    stats_map = {r.get("id"): r for r in rows if r.get("id")}

    for kw in all_kws:
        stat = stats_map.get(kw["nccKeywordId"], {})
        kw["_clicks"] = stat.get("clkCnt", 0)
        kw["_conversions"] = stat.get("ccnt", 0)
        kw["_convRevenue"] = stat.get("convAmt", 0)
        kw["_cost"] = stat.get("salesAmt", 0)
    return all_kws


async def bulk_auto_prune(
    client: SearchAdClient,
    campaign_id: str,
    start_date: str,
    end_date: str,
    min_clicks: int = 0,
    dry_run: bool = True,
) -> dict[str, Any]:
    """30일간 전환 0 키워드 자동 OFF."""
    _require_sa()
    all_kws = await _collect_keywords_with_stats(client, campaign_id, start_date, end_date)
    if not all_kws:
        return {"ok": True, "pruned": [], "message": "활성 키워드 없음"}

    to_prune = [kw for kw in all_kws if kw["_conversions"] == 0 and kw["_clicks"] >= min_clicks]
    keep = [kw for kw in all_kws if kw not in to_prune]

    prune_list = [
        {
            "nccKeywordId": kw["nccKeywordId"],
            "keyword": kw.get("keyword"),
            "clicks": kw["_clicks"],
            "cost": kw["_cost"],
        }
        for kw in to_prune
    ]

    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "period": f"{start_date} ~ {end_date}",
            "totalActive": len(all_kws),
            "pruneCount": len(to_prune),
            "keepCount": len(keep),
            "toPrune": prune_list,
        }

    _require_write()
    paused: list[str] = []
    for kw in to_prune:
        kid = kw["nccKeywordId"]
        log_write_action("bulk_auto_prune", {"id": kid, "keyword": kw.get("keyword")})
        await client.put(f"/ncc/keywords/{kid}", {"userStatus": "PAUSED"})
        paused.append(kid)

    return {
        "ok": True,
        "dry_run": False,
        "pruned": len(paused),
        "pausedIds": paused,
    }


async def bulk_bid_optimizer(
    client: SearchAdClient,
    campaign_id: str,
    start_date: str,
    end_date: str,
    bid_delta: int = 15,
    min_bid: int = 70,
    dry_run: bool = True,
) -> dict[str, Any]:
    """전환 키워드 입찰가 인상, 비전환은 최저가 유지."""
    _require_sa()
    all_kws = await _collect_keywords_with_stats(client, campaign_id, start_date, end_date)
    if not all_kws:
        return {"ok": True, "changes": [], "message": "활성 키워드 없음"}

    max_delta_pct = settings.max_bid_delta_pct
    changes: list[dict[str, Any]] = []

    for kw in all_kws:
        kid = kw["nccKeywordId"]
        current_bid = kw.get("bidAmt", min_bid)

        if kw["_conversions"] > 0:
            max_increase = int(current_bid * max_delta_pct / 100)
            delta = min(bid_delta, max_increase)
            new_bid = current_bid + delta
            changes.append(
                {
                    "nccKeywordId": kid,
                    "keyword": kw.get("keyword"),
                    "action": "raise",
                    "currentBid": current_bid,
                    "newBid": new_bid,
                    "conversions": kw["_conversions"],
                }
            )
        elif kw["_clicks"] > 0 and current_bid > min_bid:
            changes.append(
                {
                    "nccKeywordId": kid,
                    "keyword": kw.get("keyword"),
                    "action": "lower",
                    "currentBid": current_bid,
                    "newBid": min_bid,
                    "clicks": kw["_clicks"],
                }
            )

    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "period": f"{start_date} ~ {end_date}",
            "totalActive": len(all_kws),
            "changeCount": len(changes),
            "changes": changes,
        }

    _require_write()
    applied = 0
    for ch in changes:
        kid = ch["nccKeywordId"]
        new_bid = ch["newBid"]
        log_write_action("bulk_bid_optimizer", {"id": kid, "bid": new_bid})
        await client.put(f"/ncc/keywords/{kid}", {"bidAmt": new_bid, "useGroupBidAmt": False})
        applied += 1

    return {"ok": True, "dry_run": False, "applied": applied, "changes": changes}
