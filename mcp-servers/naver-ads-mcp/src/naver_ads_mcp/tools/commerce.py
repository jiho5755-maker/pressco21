from __future__ import annotations

from typing import Any

from naver_ads_mcp.clients.commerce import CommerceClient
from naver_ads_mcp.config import settings
from naver_ads_mcp.errors import AuthNotConfiguredError
from naver_ads_mcp.utils.pii import mask_name, mask_phone


def _require_commerce() -> None:
    if not settings.commerce_configured:
        raise AuthNotConfiguredError("commerce")


async def commerce_product_list(
    client: CommerceClient,
    page: int = 1,
    size: int = 100,
    product_name: str | None = None,
) -> Any:
    _require_commerce()
    body: dict[str, Any] = {"page": page, "size": size}
    if product_name:
        body["productName"] = product_name
    raw = await client.post("/external/v1/products/search", body)
    if not isinstance(raw, dict):
        return raw
    products = []
    for item in raw.get("contents", []):
        for cp in item.get("channelProducts", []):
            products.append(cp)
    return {
        "totalElements": raw.get("totalElements", len(products)),
        "page": page,
        "size": size,
        "products": products,
    }


async def commerce_product_get(client: CommerceClient, product_no: int) -> Any:
    _require_commerce()
    return await client.get(f"/external/v1/products/{product_no}")


async def commerce_order_list(
    client: CommerceClient,
    start_date: str,
    end_date: str,
    order_status: str | None = None,
    unmask: bool = False,
) -> Any:
    _require_commerce()
    body: dict[str, Any] = {
        "searchStartDate": start_date,
        "searchEndDate": end_date,
    }
    if order_status:
        body["productOrderStatuses"] = [order_status]

    result = await client.post("/external/v1/pay-order/seller/product-orders/query", body)

    if not unmask and isinstance(result, dict):
        for order in result.get("data", result.get("contents", [])):
            if "ordererName" in order:
                order["ordererName"] = mask_name(order["ordererName"])
            if "ordererTel" in order:
                order["ordererTel"] = mask_phone(order["ordererTel"])

    return result
