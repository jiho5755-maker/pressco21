from __future__ import annotations

import base64
import hashlib
import hmac
import time


class SearchAdAuth:
    """HMAC-SHA256 서명 생성기 (네이버 검색광고 API)."""

    def __init__(self, api_key: str, secret_key: str, customer_id: str) -> None:
        self._api_key = api_key
        self._secret_key = secret_key
        self._customer_id = customer_id

    def sign(self, method: str, uri: str) -> tuple[str, str]:
        timestamp = str(int(time.time() * 1000))
        msg = f"{timestamp}.{method}.{uri}".encode()
        sig = base64.b64encode(
            hmac.new(self._secret_key.encode("utf-8"), msg, hashlib.sha256).digest()
        ).decode("utf-8")
        return timestamp, sig

    def headers(self, method: str, uri: str) -> dict[str, str]:
        timestamp, signature = self.sign(method, uri)
        return {
            "X-Timestamp": timestamp,
            "X-API-KEY": self._api_key,
            "X-Customer": self._customer_id,
            "X-Signature": signature,
            "Content-Type": "application/json; charset=UTF-8",
        }
