from __future__ import annotations

import json
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


async def ab_test_create(
    client: SearchAdClient,
    adgroup_id: str,
    ad_a_json: str,
    ad_b_json: str,
    dry_run: bool = True,
) -> dict[str, Any]:
    """같은 광고그룹에 소재 A/B 등록."""
    _require_sa()
    ad_a = json.loads(ad_a_json) if isinstance(ad_a_json, str) else ad_a_json
    ad_b = json.loads(ad_b_json) if isinstance(ad_b_json, str) else ad_b_json

    preview = {
        "adgroupId": adgroup_id,
        "adA": ad_a,
        "adB": ad_b,
    }

    if dry_run:
        return {"ok": True, "dry_run": True, "preview": preview}

    _require_write()
    body_a = {"nccAdgroupId": adgroup_id, "type": ad_a.get("type", "TEXT_45"), "ad": ad_a}
    body_b = {"nccAdgroupId": adgroup_id, "type": ad_b.get("type", "TEXT_45"), "ad": ad_b}
    log_write_action("ab_test_create", {"adgroup_id": adgroup_id})
    result_a = await client.post("/ncc/ads", body_a)
    result_b = await client.post("/ncc/ads", body_b)

    return {
        "ok": True,
        "dry_run": False,
        "adA": {"nccAdId": result_a.get("nccAdId"), "headline": ad_a.get("headline")},
        "adB": {"nccAdId": result_b.get("nccAdId"), "headline": ad_b.get("headline")},
        "message": "A/B 소재 등록 완료. 최소 7일 후 ab_test_evaluate로 평가하세요.",
    }


async def ab_test_evaluate(
    client: SearchAdClient,
    ad_id_a: str,
    ad_id_b: str,
    start_date: str,
    end_date: str,
    dry_run: bool = True,
) -> dict[str, Any]:
    """CTR/전환율 비교 → 패배 소재 OFF 제안."""
    _require_sa()

    ids = f"{ad_id_a},{ad_id_b}"
    time_range = json.dumps({"since": start_date, "until": end_date})
    stats_raw = await client.get(
        "/stats",
        ids=ids,
        fields=json.dumps(["impCnt", "clkCnt", "ctr", "ccnt", "convAmt", "salesAmt"]),
        timeRange=time_range,
        timeIncrement="allDays",
    )
    rows = stats_raw if isinstance(stats_raw, list) else (stats_raw or {}).get("data", [])
    stats_map = {r.get("id"): r for r in rows if r.get("id")}

    def _stat(ad_id: str) -> dict[str, Any]:
        s = stats_map.get(ad_id, {})
        imp = s.get("impCnt", 0)
        clk = s.get("clkCnt", 0)
        return {
            "adId": ad_id,
            "impressions": imp,
            "clicks": clk,
            "ctr": s.get("ctr", 0),
            "conversions": s.get("ccnt", 0),
            "convRevenue": s.get("convAmt", 0),
            "cost": s.get("salesAmt", 0),
        }

    stat_a = _stat(ad_id_a)
    stat_b = _stat(ad_id_b)

    winner_id = ad_id_a if stat_a["ctr"] >= stat_b["ctr"] else ad_id_b
    loser_id = ad_id_b if winner_id == ad_id_a else ad_id_a
    winner_stat = stat_a if winner_id == ad_id_a else stat_b
    loser_stat = stat_b if winner_id == ad_id_a else stat_a

    min_impressions = 100
    confident = (
        winner_stat["impressions"] >= min_impressions
        and loser_stat["impressions"] >= min_impressions
    )

    result: dict[str, Any] = {
        "ok": True,
        "period": f"{start_date} ~ {end_date}",
        "adA": stat_a,
        "adB": stat_b,
        "winner": winner_id,
        "loser": loser_id,
        "confident": confident,
    }

    if not confident:
        result["recommendation"] = "노출 수 부족 (100회 미만). 테스트 기간을 연장하세요."
        return result

    if dry_run:
        result["dry_run"] = True
        result["recommendation"] = f"패배 소재 {loser_id} OFF 권고 (dry_run)."
        return result

    _require_write()
    log_write_action("ab_test_evaluate_pause", {"loser": loser_id})
    await client.put(f"/ncc/ads/{loser_id}", {"userStatus": "PAUSED"})
    result["dry_run"] = False
    result["action"] = f"패배 소재 {loser_id} OFF 완료."
    return result
