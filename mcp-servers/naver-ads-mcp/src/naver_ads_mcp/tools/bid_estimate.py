from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError


def _require_sa() -> None:
    if not settings.searchad_configured:
        raise AuthNotConfiguredError("searchad")


async def bid_simulate(
    client: SearchAdClient,
    keyword: str,
    bids: list[int],
    device: str = "PC",
) -> dict[str, Any]:
    """키워드+입찰가 목록 → 예상 노출/클릭/비용 시뮬레이션."""
    _require_sa()
    body = {
        "device": device,
        "keywordplus": False,
        "key": keyword,
        "bids": bids,
    }
    raw = await client.post("/estimate/performance/keyword", body)
    return {
        "ok": True,
        "keyword": keyword,
        "device": device,
        "estimates": raw.get("estimate", []),
    }


async def bid_estimate_position(
    client: SearchAdClient,
    keyword: str,
    position_target: int = 1,
    device: str = "PC",
    period: int = 1,
) -> dict[str, Any]:
    """목표 순위(1~5위) 달성에 필요한 입찰가 추정."""
    _require_sa()
    body = {
        "device": device,
        "items": [{"period": period, "position": position_target, "key": keyword}],
    }
    raw = await client.post("/estimate/average-position-bid/keyword", body)
    estimates = raw.get("estimate", [])
    bid = estimates[0].get("bid") if estimates else None
    return {
        "ok": True,
        "keyword": keyword,
        "positionTarget": position_target,
        "device": device,
        "estimatedBid": bid,
        "raw": estimates,
    }


async def bid_estimate_median(
    client: SearchAdClient,
    keyword: str,
    device: str = "PC",
) -> dict[str, Any]:
    """경쟁사 중간 입찰가 추정 (3위 입찰가를 시장 중간선으로 사용)."""
    _require_sa()
    body = {
        "device": device,
        "items": [
            {"period": 1, "position": 1, "key": keyword},
            {"period": 1, "position": 3, "key": keyword},
            {"period": 1, "position": 5, "key": keyword},
        ],
    }
    raw = await client.post("/estimate/average-position-bid/keyword", body)
    estimates = raw.get("estimate", [])
    bids_by_pos: dict[int, int] = {}
    for est in estimates:
        bids_by_pos[est.get("position", 0)] = est.get("bid", 0)

    return {
        "ok": True,
        "keyword": keyword,
        "device": device,
        "medianBid": bids_by_pos.get(3),
        "bidByPosition": bids_by_pos,
        "note": "3위 입찰가를 시장 중간선으로 사용합니다.",
    }
