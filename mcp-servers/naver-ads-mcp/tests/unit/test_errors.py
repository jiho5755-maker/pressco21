"""에러 처리 테스트."""

from naver_ads_mcp.errors import (
    AuthNotConfiguredError,
    NaverApiError,
    WriteDisabledError,
    make_api_error,
)


def test_naver_api_error_to_dict():
    e = NaverApiError("TEST_ERR", 400, "테스트 오류")
    d = e.to_dict()
    assert d["ok"] is False
    assert d["error"]["code"] == "TEST_ERR"
    assert d["error"]["http_status"] == 400


def test_auth_not_configured_error():
    e = AuthNotConfiguredError("searchad")
    assert "SEARCHAD_NOT_CONFIGURED" in e.code
    assert ".env" in e.message_ko


def test_write_disabled_error():
    e = WriteDisabledError()
    assert "WRITE_DISABLED" in e.code


def test_make_api_error_429():
    e = make_api_error("searchad", 429, retry_after=5)
    assert e.code == "NAVER_SA_TOO_MANY_REQUESTS"
    assert e.retry_after_sec == 5
    assert e.hint is not None


def test_make_api_error_500():
    e = make_api_error("commerce", 500)
    assert e.code == "NAVER_COMMERCE_SERVER_ERROR"


def test_make_api_error_unknown_status():
    e = make_api_error("searchad", 418)
    assert "SERVER_ERROR" in e.code
