from __future__ import annotations

from typing import Any

import httpx
import structlog

from naver_ads_mcp.errors import make_api_error

logger = structlog.get_logger()


class DataLabClient:
    """Naver DataLab API client (X-Naver-Client-Id/Secret header auth)."""

    def __init__(self, client_id: str, client_secret: str, base_url: str) -> None:
        self._headers = {
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
            "Content-Type": "application/json",
        }
        self._client = httpx.AsyncClient(base_url=base_url, timeout=15.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def post(self, path: str, body: Any = None) -> Any:
        resp = await self._client.post(path, headers=self._headers, json=body)
        if resp.status_code >= 400:
            raw = (
                resp.json()
                if resp.headers.get("content-type", "").startswith("application/json")
                else None
            )
            raise make_api_error("datalab", resp.status_code, raw)
        return resp.json()
