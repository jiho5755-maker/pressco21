"""HTTP API wrapper for n8n automation integration (Phase 3).

Exposes key automation endpoints that n8n calls via HTTP Request node.
Reuses the same tool functions as the MCP server — no logic duplication.
"""

from __future__ import annotations

import datetime
import secrets
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from naver_ads_mcp.auth.searchad import SearchAdAuth
from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import NaverApiError
from naver_ads_mcp.tools.budget import budget_pace_check
from naver_ads_mcp.tools.bulk_auto import bulk_auto_prune, bulk_bid_optimizer
from naver_ads_mcp.tools.bulk_ops import bulk_keyword_filter
from naver_ads_mcp.tools.keyword_discover import keyword_discover
from naver_ads_mcp.tools.quality import keyword_quality_check

_sa_client: SearchAdClient | None = None


def _get_sa() -> SearchAdClient:
    global _sa_client
    if _sa_client is None:
        auth = SearchAdAuth(
            settings.naver_sa_api_key,
            settings.naver_sa_secret_key,
            settings.naver_sa_customer_id,
        )
        _sa_client = SearchAdClient(auth, settings.sa_base_url)
    return _sa_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    global _sa_client
    if _sa_client and _sa_client._client:
        await _sa_client._client.aclose()
        _sa_client = None


app = FastAPI(
    title="Naver Ads Automation API",
    version="0.1.0",
    lifespan=lifespan,
)


# --- Auth ---


async def verify_api_key(x_api_key: str = Header(...)) -> None:
    if not settings.api_secret_key:
        raise HTTPException(503, "API_SECRET_KEY not configured on server")
    if not secrets.compare_digest(x_api_key, settings.api_secret_key):
        raise HTTPException(401, "Invalid API key")


# --- Request/Response models ---


class DailyCycleRequest(BaseModel):
    campaign_ids: list[str] | None = Field(
        None, description="Target campaign IDs. None = all campaigns."
    )
    hint_keywords: list[str] | None = Field(
        None, description="Seed keywords for discovery. None = skip harvest."
    )
    days_lookback: int = Field(30, ge=7, le=90)
    min_searches: int = Field(100, ge=0)
    max_cpc: int | None = Field(None, ge=0)
    bid_delta: int = Field(15, ge=1, le=100)
    dry_run: bool = True


class BudgetAlertRequest(BaseModel):
    campaign_ids: list[str] | None = None


# --- Endpoints ---


@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "naver-ads-api",
        "searchad_configured": settings.searchad_configured,
        "write_enabled": settings.mcp_write_enabled,
        "timestamp": datetime.datetime.now(tz=datetime.UTC).isoformat(),
    }


@app.post("/api/v1/daily-cycle", dependencies=[Depends(verify_api_key)])
async def daily_cycle(req: DailyCycleRequest) -> dict[str, Any]:
    """Daily bulk keyword cycle: discover → filter → prune → optimize → budget check."""
    client = _get_sa()
    today = datetime.date.today()
    start_date = (today - datetime.timedelta(days=req.days_lookback)).isoformat()
    end_date = today.isoformat()
    summary: dict[str, Any] = {
        "ok": True,
        "timestamp": datetime.datetime.now(tz=datetime.UTC).isoformat(),
        "period": f"{start_date} ~ {end_date}",
        "dry_run": req.dry_run,
    }

    # Step 1: Keyword discovery (optional)
    if req.hint_keywords:
        try:
            discovered = await keyword_discover(client, req.hint_keywords)
            filtered = await bulk_keyword_filter(
                discovered.get("keywords", []),
                req.min_searches,
                req.max_cpc,
            )
            summary["harvest"] = {
                "discovered": discovered.get("totalFound", 0),
                "filtered": filtered.get("passedCount", 0),
                "topKeywords": [kw["keyword"] for kw in filtered.get("passed", [])[:10]],
            }
        except NaverApiError as e:
            summary["harvest"] = {"error": e.message_ko}

    # Step 2: Get target campaigns
    campaigns: list[dict[str, Any]] = []
    try:
        if req.campaign_ids:
            for cid in req.campaign_ids:
                cmp = await client.get(f"/ncc/campaigns/{cid}")
                campaigns.append(cmp)
        else:
            campaigns = await client.get("/ncc/campaigns") or []
    except NaverApiError as e:
        return {**summary, "error": f"캠페인 조회 실패: {e.message_ko}"}

    active_campaigns = [c for c in campaigns if c.get("userStatus") == "ENABLE"]

    # Step 3: Prune + Optimize per campaign
    prune_results: list[dict[str, Any]] = []
    optimize_results: list[dict[str, Any]] = []

    for cmp in active_campaigns:
        cid = cmp["nccCampaignId"]
        cname = cmp.get("name", cid)

        try:
            prune = await bulk_auto_prune(
                client,
                cid,
                start_date,
                end_date,
                dry_run=req.dry_run,
            )
            prune_results.append(
                {
                    "campaign": cname,
                    "pruneCount": prune.get("pruneCount", prune.get("pruned", 0)),
                    "keywords": [kw.get("keyword", "") for kw in prune.get("toPrune", [])[:5]],
                }
            )
        except NaverApiError as e:
            prune_results.append({"campaign": cname, "error": e.message_ko})

        try:
            optimize = await bulk_bid_optimizer(
                client,
                cid,
                start_date,
                end_date,
                bid_delta=req.bid_delta,
                dry_run=req.dry_run,
            )
            changes = optimize.get("changes", [])
            optimize_results.append(
                {
                    "campaign": cname,
                    "changeCount": len(changes),
                    "raises": len([c for c in changes if c.get("action") == "raise"]),
                    "lowers": len([c for c in changes if c.get("action") == "lower"]),
                }
            )
        except NaverApiError as e:
            optimize_results.append({"campaign": cname, "error": e.message_ko})

    summary["prune"] = {
        "totalCampaigns": len(active_campaigns),
        "results": prune_results,
    }
    summary["optimize"] = {
        "totalCampaigns": len(active_campaigns),
        "results": optimize_results,
    }

    # Step 4: Budget pace check
    try:
        budget = await budget_pace_check(client)
        summary["budget"] = {
            "alertCount": budget.get("alert_count", 0),
            "alerts": budget.get("alerts", []),
        }
    except NaverApiError as e:
        summary["budget"] = {"error": e.message_ko}

    # Step 5: Quality index check
    try:
        qi = await keyword_quality_check(client)
        s = qi.get("summary", {})
        summary["quality"] = {
            "critical": s.get("critical_1_3", 0),
            "warning": s.get("warning_4_6", 0),
            "good": s.get("good_7_10", 0),
        }
    except NaverApiError as e:
        summary["quality"] = {"error": e.message_ko}

    return summary


@app.post("/api/v1/budget-alert", dependencies=[Depends(verify_api_key)])
async def budget_alert(req: BudgetAlertRequest) -> dict[str, Any]:
    """Budget pace check — returns campaigns nearing daily budget limit."""
    try:
        result = await budget_pace_check(_get_sa(), req.campaign_ids)
        return result
    except NaverApiError as e:
        raise HTTPException(502, e.to_dict()) from None


@app.post("/api/v1/quality-report", dependencies=[Depends(verify_api_key)])
async def quality_report() -> dict[str, Any]:
    """Quality index report for all keywords."""
    try:
        result = await keyword_quality_check(_get_sa())
        return result
    except NaverApiError as e:
        raise HTTPException(502, e.to_dict()) from None


def main() -> None:
    # 컨테이너 내부에서는 0.0.0.0으로 바인딩해야 호스트에서 접근 가능
    # 외부 노출 제한은 docker-compose의 "127.0.0.1:8400:8400" 포트 바인딩으로 처리
    uvicorn.run(
        "naver_ads_mcp.api:app",
        host="0.0.0.0",
        port=settings.api_port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
