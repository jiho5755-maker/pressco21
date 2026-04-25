"""MasterReport API — 비동기 리포트 생성/다운로드.

네이버 검색광고 MasterReport API를 통해 검색어(query) 리포트 등
상세 성과 데이터를 추출합니다.
"""

from __future__ import annotations

import asyncio
import csv
import io
from typing import Any

import httpx
import structlog

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError, NaverApiError

logger = structlog.get_logger()

REPORT_TYPES = [
    "AD",
    "AD_CONVERSION",
    "AD_DETAIL",
    "ADEXTENSION",
    "CAMPAIGN_BUDGET",
    "KEYWORD",
    "KEYWORD_QUERY",
    "NAVERPAY_CONVERSION",
    "PERFORMANCE_NETWORK",
    "SHOPPING_BRAND_QUERY",
    "SHOPPING_MALL_QUERY",
]

MAX_POLL_ATTEMPTS = 30
POLL_INTERVAL = 2.0


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def create_master_report(
    client: SearchAdClient,
    report_tp: str,
    start_date: str,
    end_date: str,
    *,
    entity_id: str | None = None,
) -> dict[str, Any]:
    """리포트 생성을 요청하고 완료될 때까지 폴링합니다."""
    _require_sa()

    if report_tp not in REPORT_TYPES:
        return {"ok": False, "error": f"지원하지 않는 리포트 타입: {report_tp}. 가능: {REPORT_TYPES}"}

    body: dict[str, Any] = {
        "reportTp": report_tp,
        "statDt": start_date.replace("-", ""),
        "endDt": end_date.replace("-", ""),
    }
    if entity_id:
        body["item"] = entity_id

    job = await client.post("/master-reports", body)
    job_id = job.get("reportJobId") or job.get("id")
    if not job_id:
        return {"ok": False, "error": "리포트 생성 실패", "response": job}

    logger.info("master_report_created", job_id=job_id, report_tp=report_tp)

    download_url = None
    for attempt in range(MAX_POLL_ATTEMPTS):
        await asyncio.sleep(POLL_INTERVAL)
        status = await client.get(f"/master-reports/{job_id}")
        state = status.get("status")

        if state == "BUILT":
            download_url = status.get("downloadUrl")
            break
        elif state == "REGIST" or state == "RUNNING":
            continue
        else:
            return {"ok": False, "error": f"리포트 실패: {state}", "detail": status}

    if not download_url:
        return {"ok": False, "error": "리포트 생성 타임아웃 (60초 초과)"}

    tsv_data = await _download_report(download_url)
    rows = _parse_tsv(tsv_data)

    return {
        "ok": True,
        "reportType": report_tp,
        "period": f"{start_date} ~ {end_date}",
        "totalRows": len(rows),
        "rows": rows,
    }


async def _download_report(url: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.get(url)
        resp.raise_for_status()
        return resp.text


def _parse_tsv(tsv_text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(tsv_text), delimiter="\t")
    return list(reader)


async def search_query_report(
    client: SearchAdClient,
    start_date: str,
    end_date: str,
    *,
    campaign_id: str | None = None,
    min_clicks: int = 0,
    zero_conversion_only: bool = False,
) -> dict[str, Any]:
    """검색어(query) 리포트를 생성하고 분석 결과를 반환합니다.

    KEYWORD_QUERY 리포트에서 실제 유입 검색어별 노출/클릭/전환을 추출하여
    제외 키워드 후보를 식별합니다.
    """
    result = await create_master_report(
        client,
        "KEYWORD_QUERY",
        start_date,
        end_date,
        entity_id=campaign_id,
    )

    if not result.get("ok"):
        return result

    rows = result["rows"]
    analyzed = _analyze_query_rows(rows, min_clicks, zero_conversion_only)
    analyzed["period"] = result["period"]
    analyzed["totalRows"] = result["totalRows"]
    return analyzed


def _analyze_query_rows(
    rows: list[dict[str, str]],
    min_clicks: int,
    zero_conversion_only: bool,
) -> dict[str, Any]:
    queries: dict[str, dict[str, Any]] = {}

    for row in rows:
        query = row.get("검색어", row.get("query", row.get("Query", "")))
        if not query:
            continue

        impressions = _int(row.get("노출수", row.get("impCnt", "0")))
        clicks = _int(row.get("클릭수", row.get("clkCnt", "0")))
        cost = _int(row.get("총비용", row.get("salesAmt", "0")))
        conversions = _int(row.get("전환수", row.get("ccnt", "0")))
        conv_revenue = _int(row.get("전환매출", row.get("convAmt", "0")))

        if query in queries:
            q = queries[query]
            q["impressions"] += impressions
            q["clicks"] += clicks
            q["cost"] += cost
            q["conversions"] += conversions
            q["convRevenue"] += conv_revenue
        else:
            queries[query] = {
                "query": query,
                "impressions": impressions,
                "clicks": clicks,
                "cost": cost,
                "conversions": conversions,
                "convRevenue": conv_revenue,
            }

    all_queries = sorted(queries.values(), key=lambda x: x["cost"], reverse=True)

    waste_candidates = [
        q for q in all_queries
        if q["clicks"] >= min_clicks and q["conversions"] == 0
    ]

    converting = [q for q in all_queries if q["conversions"] > 0]

    total_cost = sum(q["cost"] for q in all_queries)
    waste_cost = sum(q["cost"] for q in waste_candidates)

    return {
        "ok": True,
        "summary": {
            "totalQueries": len(all_queries),
            "convertingQueries": len(converting),
            "wasteQueries": len(waste_candidates),
            "totalCost": total_cost,
            "wasteCost": waste_cost,
            "wastePct": round(waste_cost / total_cost * 100, 1) if total_cost else 0,
        },
        "wasteTopN": waste_candidates[:30],
        "convertingTopN": converting[:10],
    }


def _int(val: str) -> int:
    try:
        return int(val.replace(",", ""))
    except (ValueError, AttributeError):
        return 0
