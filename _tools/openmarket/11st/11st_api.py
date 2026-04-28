#!/usr/bin/env python3
"""11번가 Open API 공용 CLI.

쓰기 API는 기본 dry-run이며 --execute를 명시해야 호출한다.
API 키는 출력하지 않는다.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape as xml_escape


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CATALOG = REPO_ROOT / "docs/openmarket-ops/11st-openapi-url-catalog.json"
DEFAULT_BASE_URL = "https://api.11st.co.kr"
ALLOWED_HOSTS = {"api.11st.co.kr"}
SUCCESS_RESULT_CODES = {"", "0", "00", "000", "200", "SUCCESS", "OK", "Y"}


class ApiCallError(Exception):
    """API 호출 실패를 JSON payload와 함께 전달한다."""

    def __init__(self, payload: dict[str, Any]) -> None:
        super().__init__(payload.get("error") or payload.get("resultMessage") or "11번가 API 호출 실패")
        self.payload = payload


def load_env_file(path: str | None) -> dict[str, str]:
    if not path:
        return {}
    env_path = Path(path).expanduser()
    values: dict[str, str] = {}
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"\'')
    return values


def resolve_api_key(args: argparse.Namespace) -> str:
    env_values = load_env_file(args.env_file)
    return str(args.api_key or os.environ.get("ST11_API_KEY") or env_values.get("ST11_API_KEY") or "").strip()


def validate_base_url(args: argparse.Namespace) -> str:
    base_url = str(args.base_url or DEFAULT_BASE_URL).rstrip("/")
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme != "https":
        raise SystemExit("11번가 API base-url은 기본적으로 https만 허용합니다.")
    if parsed.hostname not in ALLOWED_HOSTS and not args.allow_non_11st_base_url:
        raise SystemExit("API 키 외부 전송 방지를 위해 api.11st.co.kr 외 host는 차단합니다. 테스트가 꼭 필요하면 --allow-non-11st-base-url을 명시하세요.")
    return base_url


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("1 이상의 정수여야 합니다.")
    return parsed


def non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("0 이상의 정수여야 합니다.")
    return parsed


def numeric_id(value: str) -> str:
    text = str(value).strip()
    if not re.fullmatch(r"\d+", text):
        raise argparse.ArgumentTypeError("숫자 ID만 허용합니다.")
    return text


def xml_value(value: Any) -> str:
    return xml_escape(str(value), {"'": "&apos;", '"': "&quot;"})


def xml_tag(name: str, value: Any) -> str:
    return f"  <{name}>{xml_value(value)}</{name}>"


def path_quote(value: Any) -> str:
    return urllib.parse.quote(str(value), safe="")


def mask_sensitive_text(text: str) -> str:
    text = re.sub(r"(?i)(openapikey\s*[:=]\s*)[^\s&<]+", r"\1***REDACTED***", text)
    text = re.sub(r"(?i)(ST11_API_KEY\s*[:=]\s*)[^\s&<]+", r"\1***REDACTED***", text)
    text = re.sub(r"(?i)(JSESSIONID=)[^;\s]+", r"\1***REDACTED***", text)
    return text


def is_valid_xml_char(code: int) -> bool:
    return code in (0x9, 0xA, 0xD) or 0x20 <= code <= 0xD7FF or 0xE000 <= code <= 0xFFFD or 0x10000 <= code <= 0x10FFFF


def scrub_xml_text(text: str) -> str:
    def replace_ref(match: re.Match[str]) -> str:
        raw = match.group(1) or match.group(2)
        base = 16 if match.group(1) else 10
        try:
            code = int(raw, base)
        except ValueError:
            return ""
        return match.group(0) if is_valid_xml_char(code) else ""

    text = re.sub(r"&#x([0-9A-Fa-f]+);|&#([0-9]+);", replace_ref, text)
    return "".join(ch for ch in text if is_valid_xml_char(ord(ch)))


def decode_xml_bytes(content: bytes) -> str:
    head = content[:200].decode("ascii", "ignore")
    match = re.search(r"encoding\s*=\s*['\"]([^'\"]+)", head, re.IGNORECASE)
    candidates = []
    if match:
        candidates.append(match.group(1))
    candidates.extend(["euc-kr", "utf-8", "cp949"])
    tried: set[str] = set()
    for encoding in candidates:
        normalized = encoding.lower().replace("_", "-")
        if normalized in tried:
            continue
        tried.add(normalized)
        try:
            return content.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return content.decode("euc-kr", "replace")


def normalize_xml(content: bytes) -> bytes:
    text = scrub_xml_text(decode_xml_bytes(content))
    text = re.sub(r"encoding\s*=\s*(['\"])[^'\"]+\1", 'encoding="utf-8"', text, flags=re.IGNORECASE)
    return text.encode("utf-8")


def strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1].split(":")[-1]


def parse_xml(content: bytes) -> ET.Element:
    return ET.fromstring(normalize_xml(content))


def node_text(root: ET.Element, name: str) -> str:
    for node in root.iter():
        if strip_ns(node.tag) == name:
            return node.text or ""
    return ""


def direct_children(node: ET.Element) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for child in list(node):
        if len(list(child)) != 0:
            continue
        key = strip_ns(child.tag)
        value = child.text or ""
        if key in out:
            existing = out[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                out[key] = [existing, value]
        else:
            out[key] = value
    return out


def xml_response_to_json(response: dict[str, Any]) -> dict[str, Any]:
    info: dict[str, Any] = {"status_code": response["status_code"]}
    try:
        root = parse_xml(response["content"])
        info["root"] = strip_ns(root.tag)
        for key in ["resultCode", "ResultCode", "resultMessage", "ResultMessage", "message", "Message", "productNo"]:
            value = node_text(root, key)
            if value:
                info[key] = value
        products = []
        stocks = []
        for node in root.iter():
            tag = strip_ns(node.tag)
            if tag in {"product", "Product"}:
                row = direct_children(node)
                if row:
                    products.append(row)
            if tag in {"ProductStock", "productStock", "Stock", "stock"}:
                row = direct_children(node)
                if row:
                    stocks.append(row)
        if products:
            info["products"] = products
        if stocks:
            info["stocks"] = stocks
        if not products and not stocks and direct_children(root):
            info["data"] = direct_children(root)
    except Exception as exc:  # noqa: BLE001 - 운영 도구이므로 짧은 preview 제공
        info["parse_error"] = str(exc)
        info["raw_preview"] = mask_sensitive_text(response.get("text", ""))[:500]
    return info


def result_code(payload: dict[str, Any]) -> str:
    raw = payload.get("resultCode") or payload.get("ResultCode") or ""
    return str(raw).strip()


def is_api_failure(payload: dict[str, Any]) -> bool:
    if int(payload.get("status_code") or 0) >= 400:
        return True
    code = result_code(payload)
    if code and code.upper() not in SUCCESS_RESULT_CODES:
        return True
    message = str(payload.get("message") or payload.get("Message") or payload.get("resultMessage") or "")
    return any(token in message for token in ["오류", "찾을 수 없습니다", "존재하지 않습니다", "실패"])


def print_json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def build_headers(api_key: str) -> dict[str, str]:
    if not api_key:
        raise SystemExit("ST11_API_KEY가 필요합니다. --api-key, ST11_API_KEY, --env-file 중 하나를 사용하세요.")
    return {
        "openapikey": api_key,
        "Content-Type": "text/xml; charset=euc-kr",
        "Accept": "application/xml",
    }


def read_limited(response: Any, limit: int) -> bytes:
    content = response.read(limit + 1)
    if len(content) > limit:
        raise ApiCallError({"error": "응답 크기 제한 초과", "max_response_bytes": limit})
    return content


def request_xml(args: argparse.Namespace, method: str, path: str, body: str | None = None, *, fail_on_api_error: bool = True) -> dict[str, Any]:
    api_key = resolve_api_key(args)
    headers = build_headers(api_key)
    base_url = validate_base_url(args)
    url = base_url + path
    payload = body.encode("euc-kr") if body is not None else None
    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            content = read_limited(response, args.max_response_bytes)
            response_data = {
                "status_code": response.status,
                "content": content,
                "text": decode_xml_bytes(content),
            }
    except urllib.error.HTTPError as exc:
        content = exc.read(args.max_response_bytes + 1)
        if len(content) > args.max_response_bytes:
            content = content[: args.max_response_bytes]
        response_data = {
            "status_code": exc.code,
            "content": content,
            "text": decode_xml_bytes(content),
        }
    out = xml_response_to_json(response_data)
    out["request"] = {"method": method, "url": url}
    if fail_on_api_error and is_api_failure(out):
        raise ApiCallError(out)
    return out


def command_catalog_search(args: argparse.Namespace) -> None:
    data = json.loads(Path(args.catalog).read_text(encoding="utf-8"))
    keyword = " ".join(args.keyword).strip().lower()
    results = []
    for entry in data.get("entries", []):
        haystack = json.dumps(entry, ensure_ascii=False).lower()
        if not keyword or keyword in haystack:
            results.append(entry)
    print_json({"count": len(results), "entries": results[: args.limit]})


def command_catalog_show(args: argparse.Namespace) -> None:
    data = json.loads(Path(args.catalog).read_text(encoding="utf-8"))
    key = str(args.key).strip().lower()
    matches = []
    for entry in data.get("entries", []):
        candidates = [
            str(entry.get("api_seq", "")),
            str(entry.get("label", "")),
            str(entry.get("url", "")),
            str(entry.get("operation_id", "")),
        ]
        if any(key == value.lower() or key in value.lower() for value in candidates):
            matches.append(entry)
    print_json({"count": len(matches), "entries": matches[: args.limit]})


def search_product_body(args: argparse.Namespace) -> str:
    fields = {
        "prdNo": args.prd_no,
        "prdNm": args.prd_name,
        "sellerPrdCd": args.seller_prd_cd,
        "selStatCd": args.status,
        "schDateType": args.date_type,
        "schBgnDt": args.start_date,
        "schEndDt": args.end_date,
        "limit": str(args.limit),
        "start": str(args.start),
        "end": str(args.end),
    }
    lines = ['<?xml version="1.0" encoding="euc-kr" standalone="yes"?>', "<SearchProduct>"]
    for key, value in fields.items():
        if value:
            lines.append(xml_tag(key, value))
    lines.append("</SearchProduct>")
    return "\n".join(lines)


def command_product_search_dry(args: argparse.Namespace) -> None:
    body = search_product_body(args)
    print_json({
        "execute": False,
        "request": {
            "method": "POST",
            "path": "/rest/prodmarketservice/prodmarket",
            "body": body,
        },
    })


def command_auth_check(args: argparse.Namespace) -> None:
    # 상품조회 권한/IP/키 상태를 가장 작게 확인한다. 쓰기 없음.
    args.limit = 1
    args.start = 1
    args.end = 1
    args.prd_no = ""
    args.prd_name = ""
    args.seller_prd_cd = ""
    args.status = ""
    args.date_type = ""
    args.start_date = ""
    args.end_date = ""
    out = request_xml(args, "POST", "/rest/prodmarketservice/prodmarket", search_product_body(args), fail_on_api_error=False)
    ok = not is_api_failure(out)
    print_json({
        "ok": ok,
        "message": "11번가 상품조회 API 호출 가능" if ok else "11번가 상품조회 API 확인 필요",
        "response": out,
    })
    if not ok:
        sys.exit(1)


def command_product_search(args: argparse.Namespace) -> None:
    body = search_product_body(args)
    out = request_xml(args, "POST", "/rest/prodmarketservice/prodmarket", body)
    out["request"]["body"] = body
    print_json(out)


def command_product_detail(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/prodmarket/{path_quote(args.prd_no)}"
    print_json(request_xml(args, "GET", path))


def command_seller_product(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/sellerprodcode/{path_quote(args.seller_prd_cd)}"
    print_json(request_xml(args, "GET", path))


def command_stock_detail(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/prodmarket/stck/{path_quote(args.prd_no)}"
    print_json(request_xml(args, "GET", path))


def command_stock_update(args: argparse.Namespace) -> None:
    path = f"/rest/prodservices/stockqty/{path_quote(args.prd_stck_no)}"
    body = "\n".join([
        '<?xml version="1.0" encoding="euc-kr" standalone="yes"?>',
        "<ProductStock>",
        xml_tag("prdNo", args.prd_no),
        xml_tag("prdStckNo", args.prd_stck_no),
        xml_tag("stckQty", args.quantity),
        xml_tag("optWght", args.opt_wght),
        "</ProductStock>",
    ])
    result = {
        "execute": args.execute,
        "request": {
            "method": "PUT",
            "path": path,
            "body": body,
        },
    }
    if not args.execute:
        print_json(result)
        return
    result["response"] = request_xml(args, "PUT", path, body)
    print_json(result)


def command_price_coupon_disable(args: argparse.Namespace) -> None:
    path = f"/rest/prodservices/product/priceCoupon/{path_quote(args.prd_no)}"
    detail_path = f"/rest/prodmarketservice/prodmarket/{path_quote(args.prd_no)}"
    body = "\n".join([
        '<?xml version="1.0" encoding="euc-kr" standalone="yes"?>',
        "<Product>",
        xml_tag("selPrc", args.sel_prc),
        xml_tag("cuponcheck", "N"),
        "</Product>",
    ])
    result: dict[str, Any] = {
        "execute": args.execute,
        "request": {
            "method": "POST",
            "path": path,
            "body": body,
        },
        "safety": "실행 전 고객 노출가 상승 여부와 옵션가 한도를 별도로 확인하세요.",
    }
    if not args.execute:
        print_json(result)
        return
    result["before"] = request_xml(args, "GET", detail_path)
    result["write"] = request_xml(args, "POST", path, body)
    result["after"] = request_xml(args, "GET", detail_path)
    print_json(result)


COMMON_DEFAULTS = {
    "api_key": "",
    "env_file": "",
    "base_url": DEFAULT_BASE_URL,
    "timeout": 30,
    "max_response_bytes": 5_000_000,
    "allow_non_11st_base_url": False,
}


def add_common(parser: argparse.ArgumentParser, *, suppress_defaults: bool = False) -> None:
    default = argparse.SUPPRESS if suppress_defaults else None
    parser.add_argument("--api-key", default=default if suppress_defaults else "", help="11번가 Open API key. 출력하지 않는다.")
    parser.add_argument("--env-file", default=default if suppress_defaults else "", help="ST11_API_KEY를 읽을 env 파일")
    parser.add_argument("--base-url", default=default if suppress_defaults else DEFAULT_BASE_URL, help="기본값: https://api.11st.co.kr")
    parser.add_argument("--timeout", type=positive_int, default=default if suppress_defaults else 30)
    parser.add_argument("--max-response-bytes", type=positive_int, default=default if suppress_defaults else 5_000_000)
    parser.add_argument("--allow-non-11st-base-url", action="store_true", default=default if suppress_defaults else False, help=argparse.SUPPRESS)


def apply_common_defaults(args: argparse.Namespace) -> argparse.Namespace:
    for key, value in COMMON_DEFAULTS.items():
        if not hasattr(args, key):
            setattr(args, key, value)
    return args


def add_product_search_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--prd-no", default="")
    parser.add_argument("--prd-name", default="")
    parser.add_argument("--seller-prd-cd", default="")
    parser.add_argument("--status", default="")
    parser.add_argument("--date-type", default="")
    parser.add_argument("--start-date", default="")
    parser.add_argument("--end-date", default="")
    parser.add_argument("--limit", type=positive_int, default=100)
    parser.add_argument("--start", type=positive_int, default=1)
    parser.add_argument("--end", type=positive_int, default=100)


def parse_args() -> argparse.Namespace:
    root_common = argparse.ArgumentParser(add_help=False)
    add_common(root_common)
    sub_common = argparse.ArgumentParser(add_help=False)
    add_common(sub_common, suppress_defaults=True)
    parser = argparse.ArgumentParser(description="11번가 Open API 공용 CLI", parents=[root_common])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("catalog-search", parents=[sub_common], help="로컬 URL 카탈로그 검색")
    p.add_argument("keyword", nargs="*")
    p.add_argument("--catalog", default=str(DEFAULT_CATALOG))
    p.add_argument("--limit", type=positive_int, default=50)
    p.set_defaults(func=command_catalog_search)

    p = sub.add_parser("catalog-show", parents=[sub_common], help="apiSeq/라벨/URL/operation_id로 카탈로그 상세 표시")
    p.add_argument("key")
    p.add_argument("--catalog", default=str(DEFAULT_CATALOG))
    p.add_argument("--limit", type=positive_int, default=10)
    p.set_defaults(func=command_catalog_show)

    p = sub.add_parser("auth-check", parents=[sub_common], help="상품조회 API 키/IP/권한 읽기 점검")
    p.set_defaults(func=command_auth_check)

    p = sub.add_parser("product-search-dry", parents=[sub_common], help="다중상품조회 XML payload만 생성")
    add_product_search_args(p)
    p.set_defaults(func=command_product_search_dry)

    p = sub.add_parser("product-search", parents=[sub_common], help="다중상품조회 POST/XML")
    add_product_search_args(p)
    p.set_defaults(func=command_product_search)

    p = sub.add_parser("product-detail", parents=[sub_common], help="신규상품조회")
    p.add_argument("prd_no", type=numeric_id)
    p.set_defaults(func=command_product_detail)

    p = sub.add_parser("seller-product", parents=[sub_common], help="셀러상품조회")
    p.add_argument("seller_prd_cd")
    p.set_defaults(func=command_seller_product)

    p = sub.add_parser("stock-detail", parents=[sub_common], help="신규상품재고정보조회")
    p.add_argument("prd_no", type=numeric_id)
    p.set_defaults(func=command_stock_detail)

    p = sub.add_parser("stock-update", parents=[sub_common], help="상품재고수량변경처리")
    p.add_argument("prd_stck_no", type=numeric_id)
    p.add_argument("quantity", type=non_negative_int)
    p.add_argument("--prd-no", required=True, type=numeric_id)
    p.add_argument("--opt-wght", default="0")
    p.add_argument("--execute", action="store_true")
    p.set_defaults(func=command_stock_update)

    p = sub.add_parser("price-coupon-disable", parents=[sub_common], help="상품가격/즉시할인 수정: cuponcheck=N")
    p.add_argument("prd_no", type=numeric_id)
    p.add_argument("--sel-prc", required=True, type=positive_int)
    p.add_argument("--execute", action="store_true")
    p.set_defaults(func=command_price_coupon_disable)

    return apply_common_defaults(parser.parse_args())


def main() -> None:
    args = parse_args()
    try:
        args.func(args)
    except ApiCallError as exc:
        print_json(exc.payload)
        sys.exit(1)
    except (urllib.error.URLError, TimeoutError) as exc:
        print_json({"error": str(exc)})
        sys.exit(1)


if __name__ == "__main__":
    main()
