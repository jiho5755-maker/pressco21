"""HMAC-SHA256 서명 검증 테스트."""

import base64
import hashlib
import hmac

from naver_ads_mcp.auth.searchad import SearchAdAuth


def test_sign_produces_valid_hmac():
    auth = SearchAdAuth(
        api_key="test-api-key",
        secret_key="test-secret-key",
        customer_id="1234567",
    )
    ts, sig = auth.sign("GET", "/ncc/campaigns")

    assert ts.isdigit()
    assert len(ts) == 13

    msg = f"{ts}.GET./ncc/campaigns".encode()
    expected = base64.b64encode(hmac.new(b"test-secret-key", msg, hashlib.sha256).digest()).decode()
    assert sig == expected


def test_headers_includes_all_required_fields():
    auth = SearchAdAuth(
        api_key="my-key",
        secret_key="my-secret",
        customer_id="9999999",
    )
    headers = auth.headers("POST", "/ncc/keywords")

    assert headers["X-API-KEY"] == "my-key"
    assert headers["X-Customer"] == "9999999"
    assert "X-Timestamp" in headers
    assert "X-Signature" in headers
    assert headers["Content-Type"] == "application/json; charset=UTF-8"


def test_sign_different_methods_produce_different_sigs():
    auth = SearchAdAuth("k", "s", "1")
    _, sig_get = auth.sign("GET", "/ncc/campaigns")
    _, sig_post = auth.sign("POST", "/ncc/campaigns")
    assert sig_get != sig_post


def test_sign_different_paths_produce_different_sigs():
    auth = SearchAdAuth("k", "s", "1")
    _, sig_a = auth.sign("GET", "/ncc/campaigns")
    _, sig_b = auth.sign("GET", "/ncc/adgroups")
    assert sig_a != sig_b
