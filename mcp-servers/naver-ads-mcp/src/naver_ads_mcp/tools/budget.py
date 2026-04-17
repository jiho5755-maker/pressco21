from __future__ import annotations

import datetime
import json
from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError, WriteDisabledError
from naver_ads_mcp.utils.audit_log import log_write_action

STAT_FIELDS_SPEND = json.dumps(["salesAmt", "impCnt", "clkCnt"])


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


def _require_write() -> None:
    if not settings.mcp_write_enabled:
        raise WriteDisabledError()


def _today_range() -> str:
    today = datetime.date.today().isoformat()
    return json.dumps({"since": today, "until": today})


def _parse_stat_map(stats_raw: Any) -> dict[str, dict[str, Any]]:
    stats_map: dict[str, dict[str, Any]] = {}
    if not stats_raw:
        return stats_map
    rows = stats_raw.get("data", stats_raw) if isinstance(stats_raw, dict) else stats_raw
    if isinstance(rows, list):
        for row in rows:
            rid = row.get("id")
            if rid:
                stats_map[rid] = row
    return stats_map


async def budget_pace_check(
    client: SearchAdClient,
    campaign_ids: list[str] | None = None,
) -> dict[str, Any]:
    _require_sa()
    params: dict[str, str] = {}
    if campaign_ids:
        params["ids"] = ",".join(campaign_ids)
    campaigns = await client.get("/ncc/campaigns", **params)

    if not campaigns:
        return {"ok": True, "campaigns": [], "alert_count": 0}

    active = [
        c for c in campaigns if c.get("userStatus") == "ENABLE" and c.get("dailyBudget", 0) > 0
    ]
    if not active:
        return {
            "ok": True,
            "campaigns": [],
            "alert_count": 0,
            "message": "일예산이 설정된 활성 캠페인이 없습니다.",
        }

    active_ids = [c["nccCampaignId"] for c in active]
    stats_raw = await client.get(
        "/stats",
        ids=",".join(active_ids),
        fields=STAT_FIELDS_SPEND,
        timeRange=_today_range(),
        timeIncrement="allDays",
    )
    stats_map = _parse_stat_map(stats_raw)

    results: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []
    for campaign in active:
        cid = campaign["nccCampaignId"]
        budget = campaign["dailyBudget"]
        stat = stats_map.get(cid, {})
        spent = stat.get("salesAmt", 0)
        pace = round(spent / budget * 100, 1) if budget > 0 else 0

        entry: dict[str, Any] = {
            "campaignId": cid,
            "name": campaign.get("name", ""),
            "dailyBudget": budget,
            "spentToday": spent,
            "pacePercent": pace,
        }
        if pace >= 95:
            entry["alert"] = "CRITICAL"
            entry["message"] = "예산 95% 이상 소진. 일시정지 권고."
            alerts.append(entry)
        elif pace >= 80:
            entry["alert"] = "WARNING"
            entry["message"] = "예산 80% 이상 소진. 주의 필요."
            alerts.append(entry)
        else:
            entry["alert"] = "OK"
        results.append(entry)

    return {
        "ok": True,
        "checked_at": datetime.datetime.now(tz=datetime.UTC).isoformat(),
        "note": "stat API 데이터는 1~3시간 지연됩니다.",
        "total_campaigns": len(results),
        "alert_count": len(alerts),
        "alerts": alerts,
        "campaigns": results,
    }


async def budget_auto_pause(
    client: SearchAdClient,
    campaign_id: str,
    dry_run: bool = True,
) -> dict[str, Any]:
    _require_sa()
    campaign = await client.get(f"/ncc/campaigns/{campaign_id}")
    name = campaign.get("name", "")
    status = campaign.get("userStatus", "")
    budget = campaign.get("dailyBudget", 0)

    if status == "PAUSED":
        return {
            "ok": True,
            "action": "skip",
            "message": f"캠페인 '{name}'은 이미 일시정지 상태입니다.",
        }

    stats_raw = await client.get(
        "/stats",
        ids=campaign_id,
        fields=json.dumps(["salesAmt"]),
        timeRange=_today_range(),
        timeIncrement="allDays",
    )
    stats_map = _parse_stat_map(stats_raw)
    spent = stats_map.get(campaign_id, {}).get("salesAmt", 0)
    pace = round(spent / budget * 100, 1) if budget > 0 else 0

    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "campaign": name,
            "campaignId": campaign_id,
            "dailyBudget": budget,
            "spentToday": spent,
            "pacePercent": pace,
            "wouldPause": pace >= 95,
            "message": (
                "일시정지 실행 예정 (dry_run)"
                if pace >= 95
                else "소진율 95% 미만으로 유지 (dry_run)"
            ),
        }

    if pace < 95:
        return {
            "ok": True,
            "action": "keep",
            "pacePercent": pace,
            "message": f"소진율 {pace}%로 95% 미만. 유지합니다.",
        }

    _require_write()
    log_write_action("budget_auto_pause", {"campaign_id": campaign_id, "pace": pace})
    await client.put(f"/ncc/campaigns/{campaign_id}", {"userStatus": "PAUSED"})
    return {
        "ok": True,
        "action": "paused",
        "campaign": name,
        "pacePercent": pace,
        "message": f"캠페인 '{name}' 일시정지 완료 (소진율 {pace}%)",
    }
