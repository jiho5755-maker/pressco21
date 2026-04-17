from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from naver_ads_mcp.auth.commerce import CommerceAuth
from naver_ads_mcp.errors import make_api_error
from naver_ads_mcp.utils.rate_limit import commerce_limiter

logger = structlog.get_logger()

MAX_RETRIES = 3
BACKOFF_BASE = 1.0


class CommerceClient:
    def __init__(self, auth: CommerceAuth, base_url: str) -> None:
        self._auth = auth
        self._base_url = base_url
        self._client = httpx.AsyncClient(base_url=base_url, timeout=15.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: Any = None,
    ) -> Any:
        for attempt in range(MAX_RETRIES):
            async with commerce_limiter:
                headers = await self._auth.headers(self._client)
                resp = await self._client.request(
                    method, path, headers=headers, params=params, json=json_body
                )

            if resp.status_code == 401 and attempt == 0:
                await self._auth.refresh_token(self._client)
                continue

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", BACKOFF_BASE * (2**attempt)))
                if attempt < MAX_RETRIES - 1:
                    logger.warning("commerce_rate_limit", retry_after=retry_after)
                    await asyncio.sleep(retry_after)
                    continue
                raise make_api_error("commerce", 429, retry_after=retry_after)

            if resp.status_code >= 500 and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(BACKOFF_BASE * (2**attempt))
                continue

            if resp.status_code >= 400:
                body = (
                    resp.json()
                    if resp.headers.get("content-type", "").startswith("application/json")
                    else None
                )
                raise make_api_error("commerce", resp.status_code, body)

            if resp.status_code == 204:
                return None
            return resp.json()

    async def get(self, path: str, **params: Any) -> Any:
        return await self.request("GET", path, params=params if params else None)

    async def post(self, path: str, body: Any = None) -> Any:
        return await self.request("POST", path, json_body=body)

    async def patch(self, path: str, body: Any = None) -> Any:
        return await self.request("PATCH", path, json_body=body)
