from __future__ import annotations

import base64
import json
import time
from pathlib import Path

import bcrypt
import httpx


class CommerceAuth:
    """OAuth2 client_credentials + bcrypt 서명 (네이버 커머스 API)."""

    TOKEN_CACHE = Path.home() / ".naver-ads-mcp" / "commerce_token.json"
    REFRESH_MARGIN_SEC = 300

    def __init__(self, client_id: str, client_secret: str, base_url: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._base_url = base_url
        self._access_token: str | None = None
        self._expires_at: float = 0.0
        self._load_cache()

    def _make_sign(self) -> tuple[str, str]:
        ts = str(int(time.time() * 1000))
        password = f"{self._client_id}_{ts}"
        hashed = bcrypt.hashpw(password.encode("utf-8"), self._client_secret.encode("utf-8"))
        sign = base64.urlsafe_b64encode(hashed).decode("utf-8")
        return ts, sign

    def _load_cache(self) -> None:
        if not self.TOKEN_CACHE.exists():
            return
        try:
            data = json.loads(self.TOKEN_CACHE.read_text())
            if data.get("expires_at", 0) > time.time() + self.REFRESH_MARGIN_SEC:
                self._access_token = data["access_token"]
                self._expires_at = data["expires_at"]
        except (json.JSONDecodeError, KeyError):
            pass

    def _save_cache(self) -> None:
        self.TOKEN_CACHE.parent.mkdir(parents=True, exist_ok=True)
        self.TOKEN_CACHE.write_text(
            json.dumps({"access_token": self._access_token, "expires_at": self._expires_at})
        )
        self.TOKEN_CACHE.chmod(0o600)

    @property
    def _needs_refresh(self) -> bool:
        return (
            self._access_token is None or time.time() >= self._expires_at - self.REFRESH_MARGIN_SEC
        )

    async def refresh_token(self, client: httpx.AsyncClient | None = None) -> str:
        ts, sign = self._make_sign()
        payload = {
            "grant_type": "client_credentials",
            "type": "SELF",
            "client_id": self._client_id,
            "client_secret_sign": sign,
            "timestamp": ts,
        }
        should_close = False
        if client is None:
            client = httpx.AsyncClient()
            should_close = True
        try:
            resp = await client.post(f"{self._base_url}/external/v1/oauth2/token", data=payload)
            resp.raise_for_status()
            data = resp.json()
            self._access_token = data["access_token"]
            self._expires_at = time.time() + data.get("expires_in", 10800)
            self._save_cache()
            return self._access_token
        finally:
            if should_close:
                await client.aclose()

    async def get_token(self, client: httpx.AsyncClient | None = None) -> str:
        if self._needs_refresh:
            return await self.refresh_token(client)
        assert self._access_token is not None
        return self._access_token

    async def headers(self, client: httpx.AsyncClient | None = None) -> dict[str, str]:
        token = await self.get_token(client)
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
        }
