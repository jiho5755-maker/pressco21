from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from naver_ads_mcp.auth.searchad import SearchAdAuth
from naver_ads_mcp.errors import make_api_error
from naver_ads_mcp.utils.rate_limit import sa_limiter

logger = structlog.get_logger()

MAX_RETRIES = 3
BACKOFF_BASE = 1.0


class SearchAdClient:
    def __init__(self, auth: SearchAdAuth, base_url: str) -> None:
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
            async with sa_limiter:
                headers = self._auth.headers(method.upper(), path)
                resp = await self._client.request(
                    method, path, headers=headers, params=params, json=json_body
                )

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", BACKOFF_BASE * (2**attempt)))
                if attempt < MAX_RETRIES - 1:
                    logger.warning("sa_rate_limit", retry_after=retry_after, attempt=attempt)
                    await asyncio.sleep(retry_after)
                    continue
                raise make_api_error("searchad", 429, retry_after=retry_after)

            if resp.status_code >= 500 and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(BACKOFF_BASE * (2**attempt))
                continue

            if resp.status_code >= 400:
                body = (
                    resp.json()
                    if resp.headers.get("content-type", "").startswith("application/json")
                    else None
                )
                raise make_api_error("searchad", resp.status_code, body)

            if resp.status_code == 204:
                return None
            return resp.json()

    async def get(self, path: str, **params: Any) -> Any:
        return await self.request("GET", path, params=params if params else None)

    async def post(self, path: str, body: Any = None) -> Any:
        return await self.request("POST", path, json_body=body)

    async def put(self, path: str, body: Any = None) -> Any:
        return await self.request("PUT", path, json_body=body)

    async def delete(self, path: str) -> Any:
        return await self.request("DELETE", path)
