"""naver-ads-mcp: Naver Search Ads + Commerce MCP Server (Phase 2)."""

from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from naver_ads_mcp.auth.commerce import CommerceAuth
from naver_ads_mcp.auth.searchad import SearchAdAuth
from naver_ads_mcp.clients.commerce import CommerceClient
from naver_ads_mcp.clients.searchad import SearchAdClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import NaverApiError
from naver_ads_mcp.tools import adgroups as ag_ops
from naver_ads_mcp.tools import ads as ads_ops
from naver_ads_mcp.tools import budget as budget_ops
from naver_ads_mcp.tools import campaigns as cmp_ops
from naver_ads_mcp.tools import commerce as com_ops
from naver_ads_mcp.tools import keywords as kw_ops
from naver_ads_mcp.tools import negative_keywords as nkw_ops
from naver_ads_mcp.tools import quality as qi_ops
from naver_ads_mcp.tools import shopping as shop_ops
from naver_ads_mcp.tools import stats as stat_ops

mcp = FastMCP(
    "naver-ads",
    instructions=(
        "네이버 검색광고 + 쇼핑검색광고 + 커머스(스마트스토어) API 통합 MCP 서버. "
        "광고 캠페인 조회·생성·수정, 키워드 입찰가 일괄 변경, "
        "쇼핑검색광고 관리, 통계 리포트 조회를 지원합니다."
    ),
)

# --- Lazy-init clients ---

_sa_client: SearchAdClient | None = None
_com_client: CommerceClient | None = None


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


def _get_com() -> CommerceClient:
    global _com_client
    if _com_client is None:
        auth = CommerceAuth(
            settings.naver_commerce_client_id,
            settings.naver_commerce_client_secret,
            settings.commerce_base_url,
        )
        _com_client = CommerceClient(auth, settings.commerce_base_url)
    return _com_client


def _wrap(result: Any) -> str:
    if isinstance(result, str):
        return result
    return json.dumps(result, ensure_ascii=False, default=str)


def _err(e: NaverApiError) -> str:
    return json.dumps(e.to_dict(), ensure_ascii=False)


# ─── 인증/시스템 (2) ───


@mcp.tool()
async def auth_status() -> str:
    """현재 네이버 API 인증 상태를 확인합니다."""
    return _wrap(
        {
            "ok": True,
            "searchad": {
                "configured": settings.searchad_configured,
                "customer_id": settings.naver_sa_customer_id or "(미설정)",
            },
            "commerce": {
                "configured": settings.commerce_configured,
                "client_id": settings.naver_commerce_client_id or "(미설정)",
            },
            "write_enabled": settings.mcp_write_enabled,
        }
    )


@mcp.tool()
async def auth_refresh_commerce_token() -> str:
    """커머스 API OAuth 토큰을 수동으로 갱신합니다."""
    try:
        client = _get_com()
        token = await client._auth.refresh_token(client._client)
        return _wrap(
            {"ok": True, "message": "토큰이 갱신되었습니다.", "token_prefix": token[:8] + "..."}
        )
    except NaverApiError as e:
        return _err(e)
    except Exception as e:
        return _wrap({"ok": False, "error": str(e)})


# ─── 캠페인 (5) ───


@mcp.tool()
async def campaign_list(ids: str | None = None, campaign_type: str | None = None) -> str:
    """캠페인 전체 목록을 조회합니다. campaign_type: WEB_SITE, SHOPPING, POWER_CONTENTS 등."""
    try:
        return _wrap(await cmp_ops.campaign_list(_get_sa(), ids, campaign_type))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def campaign_get(campaign_id: str) -> str:
    """캠페인 단건을 상세 조회합니다."""
    try:
        return _wrap(await cmp_ops.campaign_get(_get_sa(), campaign_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def campaign_create(
    name: str,
    campaign_type: str = "WEB_SITE",
    daily_budget: int = 0,
    delivery_method: str = "STANDARD",
) -> str:
    """새 캠페인을 생성합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        body = {
            "name": name,
            "campaignTp": campaign_type,
            "dailyBudget": daily_budget,
            "deliveryMethod": delivery_method,
            "customerId": int(settings.naver_sa_customer_id)
            if settings.naver_sa_customer_id
            else None,
        }
        return _wrap(await cmp_ops.campaign_create(_get_sa(), body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def campaign_update(
    campaign_id: str,
    name: str | None = None,
    daily_budget: int | None = None,
    user_status: str | None = None,
) -> str:
    """캠페인을 수정합니다 (이름/예산/상태). MCP_WRITE_ENABLED=true 필요."""
    try:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if daily_budget is not None:
            body["dailyBudget"] = daily_budget
        if user_status is not None:
            body["userStatus"] = user_status
        return _wrap(await cmp_ops.campaign_update(_get_sa(), campaign_id, body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def campaign_delete(campaign_id: str) -> str:
    """캠페인을 삭제합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        await cmp_ops.campaign_delete(_get_sa(), campaign_id)
        return _wrap({"ok": True, "message": f"캠페인 {campaign_id} 삭제 완료"})
    except NaverApiError as e:
        return _err(e)


# ─── 광고그룹 (5) ───


@mcp.tool()
async def adgroup_list(campaign_id: str | None = None) -> str:
    """광고그룹 목록을 조회합니다. campaign_id로 필터링 가능."""
    try:
        return _wrap(await ag_ops.adgroup_list(_get_sa(), campaign_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def adgroup_get(adgroup_id: str) -> str:
    """광고그룹 단건을 상세 조회합니다."""
    try:
        return _wrap(await ag_ops.adgroup_get(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def adgroup_create(
    campaign_id: str,
    name: str,
    bid_amt: int = 70,
) -> str:
    """광고그룹을 생성합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        body = {"nccCampaignId": campaign_id, "name": name, "bidAmt": bid_amt}
        return _wrap(await ag_ops.adgroup_create(_get_sa(), body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def adgroup_update(
    adgroup_id: str,
    name: str | None = None,
    bid_amt: int | None = None,
    user_status: str | None = None,
) -> str:
    """광고그룹을 수정합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if bid_amt is not None:
            body["bidAmt"] = bid_amt
        if user_status is not None:
            body["userStatus"] = user_status
        return _wrap(await ag_ops.adgroup_update(_get_sa(), adgroup_id, body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def adgroup_delete(adgroup_id: str) -> str:
    """광고그룹을 삭제합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        await ag_ops.adgroup_delete(_get_sa(), adgroup_id)
        return _wrap({"ok": True, "message": f"광고그룹 {adgroup_id} 삭제 완료"})
    except NaverApiError as e:
        return _err(e)


# ─── 키워드 (5) ───


@mcp.tool()
async def keyword_list(adgroup_id: str | None = None) -> str:
    """키워드 목록을 조회합니다. adgroup_id로 필터링 가능."""
    try:
        return _wrap(await kw_ops.keyword_list(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def keyword_get(keyword_id: str) -> str:
    """키워드 단건을 조회합니다."""
    try:
        return _wrap(await kw_ops.keyword_get(_get_sa(), keyword_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def keyword_create_bulk(adgroup_id: str, keywords_json: str) -> str:
    """키워드를 대량 등록합니다. keywords_json: [{"keyword":"...", "bidAmt":70},...] JSON 문자열."""
    try:
        keywords = json.loads(keywords_json)
        return _wrap(await kw_ops.keyword_create_bulk(_get_sa(), adgroup_id, keywords))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def keyword_update_bid_bulk(updates_json: str, dry_run: bool = True) -> str:
    """키워드 입찰가를 일괄 변경합니다. dry_run=true면 미리보기만.

    updates_json: [{"nccKeywordId":"...","bidAmt":100},...]
    """
    try:
        updates = json.loads(updates_json)
        return _wrap(await kw_ops.keyword_update_bid_bulk(_get_sa(), updates, dry_run))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def keyword_update_status_bulk(updates_json: str, dry_run: bool = True) -> str:
    """키워드 상태(ON/OFF)를 일괄 변경합니다. dry_run=true면 미리보기만.

    updates_json: [{"nccKeywordId":"...","userStatus":"PAUSED"},...]
    """
    try:
        updates = json.loads(updates_json)
        return _wrap(await kw_ops.keyword_update_status_bulk(_get_sa(), updates, dry_run))
    except NaverApiError as e:
        return _err(e)


# ─── 제외 키워드 (3) — Phase 2 P0 ───


@mcp.tool()
async def negative_keyword_list(adgroup_id: str) -> str:
    """광고그룹의 제외 키워드 목록을 조회합니다."""
    try:
        return _wrap(await nkw_ops.negative_keyword_list(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def negative_keyword_create_bulk(
    adgroup_id: str,
    keywords_json: str,
    dry_run: bool = True,
) -> str:
    """제외 키워드를 대량 등록합니다. dry_run=true면 미리보기만.

    keywords_json: [{"keyword":"압화 무료"},{"keyword":"압화 수리"},...] JSON 문자열.
    """
    try:
        keywords = json.loads(keywords_json)
        return _wrap(
            await nkw_ops.negative_keyword_create_bulk(_get_sa(), adgroup_id, keywords, dry_run)
        )
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def negative_keyword_delete_bulk(
    ids_json: str,
    dry_run: bool = True,
) -> str:
    """제외 키워드를 대량 삭제합니다. dry_run=true면 미리보기만.

    ids_json: ["nkw-id-1","nkw-id-2",...] JSON 문자열.
    """
    try:
        keyword_ids = json.loads(ids_json)
        return _wrap(await nkw_ops.negative_keyword_delete_bulk(_get_sa(), keyword_ids, dry_run))
    except NaverApiError as e:
        return _err(e)


# ─── 품질지수 (1) — Phase 2 P0 ───


@mcp.tool()
async def keyword_quality_check(adgroup_id: str | None = None) -> str:
    """키워드별 품질지수(QI)를 조회하고 저품질 경고를 표시합니다.

    QI 7~10: 효율 좋음 / QI 4~6: 개선 필요 / QI 1~3: 비효율 (교체 권고).
    """
    try:
        return _wrap(await qi_ops.keyword_quality_check(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


# ─── 소예산 방어 (2) — Phase 2 P0 ───


@mcp.tool()
async def budget_pace_check(campaign_ids_csv: str | None = None) -> str:
    """캠페인별 예산 소진 속도를 체크합니다. 80%+ 경고, 95%+ 일시정지 권고.

    campaign_ids_csv: 쉼표 구분 캠페인 ID (생략 시 전체). stat 데이터 1~3시간 지연 주의.
    """
    try:
        ids = [x.strip() for x in campaign_ids_csv.split(",")] if campaign_ids_csv else None
        return _wrap(await budget_ops.budget_pace_check(_get_sa(), ids))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def budget_auto_pause(campaign_id: str, dry_run: bool = True) -> str:
    """예산 95% 이상 소진 캠페인을 일시정지합니다. dry_run=true면 미리보기만.

    MCP_WRITE_ENABLED=true 필요 (실행 시).
    """
    try:
        return _wrap(await budget_ops.budget_auto_pause(_get_sa(), campaign_id, dry_run))
    except NaverApiError as e:
        return _err(e)


# ─── 광고 소재 (5) ───


@mcp.tool()
async def ad_list(adgroup_id: str | None = None) -> str:
    """광고 소재 목록을 조회합니다."""
    try:
        return _wrap(await ads_ops.ad_list(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def ad_get(ad_id: str) -> str:
    """광고 소재 단건을 조회합니다."""
    try:
        return _wrap(await ads_ops.ad_get(_get_sa(), ad_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def ad_create(adgroup_id: str, ad_type: str, ad_json: str) -> str:
    """광고 소재를 생성합니다. ad_json: 소재 속성 JSON. MCP_WRITE_ENABLED=true 필요."""
    try:
        ad_data = json.loads(ad_json)
        body = {"nccAdgroupId": adgroup_id, "type": ad_type, "ad": ad_data}
        return _wrap(await ads_ops.ad_create(_get_sa(), body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def ad_update(ad_id: str, ad_json: str | None = None, user_status: str | None = None) -> str:
    """광고 소재를 수정합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        body: dict[str, Any] = {}
        if ad_json is not None:
            body["ad"] = json.loads(ad_json)
        if user_status is not None:
            body["userStatus"] = user_status
        return _wrap(await ads_ops.ad_update(_get_sa(), ad_id, body))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def ad_delete(ad_id: str) -> str:
    """광고 소재를 삭제합니다. MCP_WRITE_ENABLED=true 필요."""
    try:
        await ads_ops.ad_delete(_get_sa(), ad_id)
        return _wrap({"ok": True, "message": f"소재 {ad_id} 삭제 완료"})
    except NaverApiError as e:
        return _err(e)


# ─── 비즈니스 채널 (1) ───


@mcp.tool()
async def business_channel_list() -> str:
    """비즈니스 채널(쇼핑, 플레이스 등) 목록을 조회합니다."""
    try:
        if not settings.searchad_configured:
            from naver_ads_mcp.errors import AuthNotConfiguredError

            raise AuthNotConfiguredError("searchad")
        return _wrap(await _get_sa().get("/ncc/channels"))
    except NaverApiError as e:
        return _err(e)


# ─── 통계 (3) ───


@mcp.tool()
async def stat_get_realtime(
    ids_csv: str,
    fields_csv: str | None = None,
) -> str:
    """실시간 통계 요약을 조회합니다. ids_csv: 쉼표 구분 엔티티 ID, fields_csv: 쉼표 구분 필드명."""
    try:
        ids = [x.strip() for x in ids_csv.split(",")]
        fields = [x.strip() for x in fields_csv.split(",")] if fields_csv else None
        return _wrap(await stat_ops.stat_get_realtime(_get_sa(), ids, fields))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def stat_get_by_date(
    ids_csv: str,
    start_date: str,
    end_date: str,
) -> str:
    """일자별 통계를 조회합니다. 날짜 형식: YYYY-MM-DD."""
    try:
        ids = [x.strip() for x in ids_csv.split(",")]
        return _wrap(await stat_ops.stat_get_by_date(_get_sa(), ids, start_date, end_date))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def stat_get_by_hour(ids_csv: str, date: str) -> str:
    """시간대별 통계를 조회합니다. date: YYYY-MM-DD."""
    try:
        ids = [x.strip() for x in ids_csv.split(",")]
        return _wrap(await stat_ops.stat_get_by_hour(_get_sa(), ids, date))
    except NaverApiError as e:
        return _err(e)


# ─── 쇼핑검색광고 (4) ───


@mcp.tool()
async def shopping_campaign_list() -> str:
    """쇼핑검색광고 캠페인 목록을 조회합니다."""
    try:
        return _wrap(await shop_ops.shopping_campaign_list(_get_sa()))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def shopping_product_list(adgroup_id: str | None = None) -> str:
    """쇼핑검색광고 상품(소재) 목록을 조회합니다."""
    try:
        return _wrap(await shop_ops.shopping_product_list(_get_sa(), adgroup_id))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def shopping_product_update_bid(product_id: str, bid_amt: int, dry_run: bool = True) -> str:
    """쇼핑 상품 입찰가를 변경합니다. dry_run=true면 미리보기만."""
    try:
        return _wrap(
            await shop_ops.shopping_product_update_bid(_get_sa(), product_id, bid_amt, dry_run)
        )
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def shopping_product_update_bid_bulk(updates_json: str, dry_run: bool = True) -> str:
    """쇼핑 상품 입찰가를 일괄 변경합니다. dry_run=true면 미리보기만.

    updates_json: [{"id":"...","bidAmt":100},...]
    """
    try:
        updates = json.loads(updates_json)
        return _wrap(await shop_ops.shopping_product_update_bid_bulk(_get_sa(), updates, dry_run))
    except NaverApiError as e:
        return _err(e)


# ─── 커머스 (3) ───


@mcp.tool()
async def commerce_product_list(
    page: int = 1,
    size: int = 100,
    product_name: str | None = None,
) -> str:
    """스마트스토어 상품 목록을 조회합니다."""
    try:
        return _wrap(await com_ops.commerce_product_list(_get_com(), page, size, product_name))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def commerce_product_get(product_no: int) -> str:
    """스마트스토어 상품 단건을 조회합니다."""
    try:
        return _wrap(await com_ops.commerce_product_get(_get_com(), product_no))
    except NaverApiError as e:
        return _err(e)


@mcp.tool()
async def commerce_order_list(
    start_date: str,
    end_date: str,
    order_status: str | None = None,
    unmask: bool = False,
) -> str:
    """스마트스토어 주문 목록을 조회합니다.

    날짜 형식: YYYY-MM-ddTHH:mm:ss. unmask=true면 PII 노출.
    """
    try:
        return _wrap(
            await com_ops.commerce_order_list(
                _get_com(), start_date, end_date, order_status, unmask
            )
        )
    except NaverApiError as e:
        return _err(e)


# ─── Entry point ───


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
