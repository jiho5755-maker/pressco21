"""PII 마스킹 테스트."""

from naver_ads_mcp.utils.pii import mask_name, mask_phone


def test_mask_name_3chars():
    assert mask_name("홍길동") == "홍*동"


def test_mask_name_2chars():
    assert mask_name("홍길") == "홍*"


def test_mask_name_4chars():
    assert mask_name("제갈공명") == "제**명"


def test_mask_name_1char():
    assert mask_name("홍") == "홍"


def test_mask_phone_standard():
    assert mask_phone("01012345678") == "010-****-5678"


def test_mask_phone_with_dashes():
    assert mask_phone("010-1234-5678") == "010-****-5678"


def test_mask_phone_short():
    assert mask_phone("1234") == "1234"
