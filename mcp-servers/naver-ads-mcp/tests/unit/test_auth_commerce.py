"""커머스 OAuth bcrypt 서명 검증 테스트."""

import base64

import bcrypt

from naver_ads_mcp.auth.commerce import CommerceAuth


def _make_test_secret() -> str:
    return bcrypt.gensalt(rounds=4).decode("utf-8")


def test_make_sign_produces_valid_bcrypt():
    secret = _make_test_secret()
    auth = CommerceAuth(
        client_id="test-client-id",
        client_secret=secret,
        base_url="https://api.commerce.naver.com",
    )
    ts, sign = auth._make_sign()

    assert ts.isdigit()
    assert len(ts) == 13

    decoded = base64.urlsafe_b64decode(sign)
    password = f"test-client-id_{ts}"
    assert bcrypt.checkpw(password.encode("utf-8"), decoded)


def test_needs_refresh_initially_true(tmp_path, monkeypatch):
    monkeypatch.setattr(CommerceAuth, "TOKEN_CACHE", tmp_path / "token.json")
    secret = _make_test_secret()
    auth = CommerceAuth("cid", secret, "https://example.com")
    assert auth._needs_refresh is True


def test_different_timestamps_produce_different_signs():
    secret = _make_test_secret()
    auth = CommerceAuth("cid", secret, "https://example.com")
    _, sign1 = auth._make_sign()
    _, sign2 = auth._make_sign()
    assert sign1 != sign2
