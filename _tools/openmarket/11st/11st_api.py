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


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CATALOG = REPO_ROOT / "docs/openmarket-ops/11st-openapi-url-catalog.json"
DEFAULT_BASE_URL = "https://api.11st.co.kr"


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


def normalize_xml(content: bytes) -> bytes:
    text = content.decode("euc-kr", "replace")
    text = scrub_xml_text(text)
    text = text.replace('encoding="euc-kr"', 'encoding="utf-8"')
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


def direct_children(node: ET.Element) -> dict[str, str]:
    out: dict[str, str] = {}
    for child in list(node):
        if len(list(child)) == 0:
            out[strip_ns(child.tag)] = child.text or ""
    return out


def xml_response_to_json(response: dict[str, Any]) -> dict[str, Any]:
    info: dict[str, Any] = {"status_code": response["status_code"]}
    try:
        root = parse_xml(response["content"])
        info["root"] = strip_ns(root.tag)
        for key in ["resultCode", "resultMessage", "message", "productNo"]:
            value = node_text(root, key)
            if value:
                info[key] = value
        products = []
        for node in root.iter():
            if strip_ns(node.tag) in {"product", "Product"}:
                row = direct_children(node)
                if row:
                    products.append(row)
        if products:
            info["products"] = products
        elif direct_children(root):
            info["data"] = direct_children(root)
    except Exception as exc:  # noqa: BLE001 - 운영 도구이므로 원문 preview 제공
        info["parse_error"] = str(exc)
        info["raw_preview"] = response.get("text", "")[:1000]
    return info


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


def request_xml(args: argparse.Namespace, method: str, path: str, body: str | None = None) -> dict[str, Any]:
    api_key = resolve_api_key(args)
    headers = build_headers(api_key)
    url = args.base_url.rstrip("/") + path
    payload = body.encode("euc-kr") if body is not None else None
    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            content = response.read()
            response_data = {
                "status_code": response.status,
                "content": content,
                "text": content.decode("euc-kr", "replace"),
            }
    except urllib.error.HTTPError as exc:
        content = exc.read()
        response_data = {
            "status_code": exc.code,
            "content": content,
            "text": content.decode("euc-kr", "replace"),
        }
    out = xml_response_to_json(response_data)
    out["request"] = {"method": method, "url": url.replace(api_key, "***REDACTED***")}
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
            lines.append(f"  <{key}>{value}</{key}>")
    lines.append("</SearchProduct>")
    return "\n".join(lines)


def command_product_search(args: argparse.Namespace) -> None:
    body = search_product_body(args)
    out = request_xml(args, "POST", "/rest/prodmarketservice/prodmarket", body)
    out["request"]["body"] = body
    print_json(out)


def command_product_detail(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/prodmarket/{urllib.parse.quote(args.prd_no)}"
    print_json(request_xml(args, "GET", path))


def command_seller_product(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/sellerprodcode/{urllib.parse.quote(args.seller_prd_cd)}"
    print_json(request_xml(args, "GET", path))


def command_stock_detail(args: argparse.Namespace) -> None:
    path = f"/rest/prodmarketservice/prodmarket/stck/{urllib.parse.quote(args.prd_no)}"
    print_json(request_xml(args, "GET", path))


def command_stock_update(args: argparse.Namespace) -> None:
    path = f"/rest/prodservices/stockqty/{urllib.parse.quote(args.prd_stck_no)}"
    body = "\n".join([
        '<?xml version="1.0" encoding="euc-kr" standalone="yes"?>',
        "<ProductStock>",
        f"  <prdNo>{args.prd_no}</prdNo>",
        f"  <prdStckNo>{args.prd_stck_no}</prdStckNo>",
        f"  <stckQty>{args.quantity}</stckQty>",
        f"  <optWght>{args.opt_wght}</optWght>",
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
    path = f"/rest/prodservices/product/priceCoupon/{urllib.parse.quote(args.prd_no)}"
    body = "\n".join([
        '<?xml version="1.0" encoding="euc-kr" standalone="yes"?>',
        "<Product>",
        f"  <selPrc>{args.sel_prc}</selPrc>",
        "  <cuponcheck>N</cuponcheck>",
        "</Product>",
    ])
    result: dict[str, Any] = {
        "execute": args.execute,
        "request": {
            "method": "POST",
            "path": path,
            "body": body,
        },
    }
    if not args.execute:
        print_json(result)
        return
    result["before"] = request_xml(args, "GET", f"/rest/prodmarketservice/prodmarket/{urllib.parse.quote(args.prd_no)}")
    result["write"] = request_xml(args, "POST", path, body)
    result["after"] = request_xml(args, "GET", f"/rest/prodmarketservice/prodmarket/{urllib.parse.quote(args.prd_no)}")
    print_json(result)


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--api-key", default="", help="11번가 Open API key. 출력하지 않는다.")
    parser.add_argument("--env-file", default="", help="ST11_API_KEY를 읽을 env 파일")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--timeout", type=int, default=30)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="11번가 Open API 공용 CLI")
    add_common(parser)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("catalog-search", help="로컬 URL 카탈로그 검색")
    p.add_argument("keyword", nargs="*")
    p.add_argument("--catalog", default=str(DEFAULT_CATALOG))
    p.add_argument("--limit", type=int, default=50)
    p.set_defaults(func=command_catalog_search)

    p = sub.add_parser("product-search", help="다중상품조회 POST/XML")
    p.add_argument("--prd-no", default="")
    p.add_argument("--prd-name", default="")
    p.add_argument("--seller-prd-cd", default="")
    p.add_argument("--status", default="")
    p.add_argument("--date-type", default="")
    p.add_argument("--start-date", default="")
    p.add_argument("--end-date", default="")
    p.add_argument("--limit", type=int, default=100)
    p.add_argument("--start", type=int, default=1)
    p.add_argument("--end", type=int, default=100)
    p.set_defaults(func=command_product_search)

    p = sub.add_parser("product-detail", help="신규상품조회")
    p.add_argument("prd_no")
    p.set_defaults(func=command_product_detail)

    p = sub.add_parser("seller-product", help="셀러상품조회")
    p.add_argument("seller_prd_cd")
    p.set_defaults(func=command_seller_product)

    p = sub.add_parser("stock-detail", help="신규상품재고정보조회")
    p.add_argument("prd_no")
    p.set_defaults(func=command_stock_detail)

    p = sub.add_parser("stock-update", help="상품재고수량변경처리")
    p.add_argument("prd_stck_no")
    p.add_argument("quantity", type=int)
    p.add_argument("--prd-no", required=True)
    p.add_argument("--opt-wght", default="0")
    p.add_argument("--execute", action="store_true")
    p.set_defaults(func=command_stock_update)

    p = sub.add_parser("price-coupon-disable", help="상품가격/즉시할인 수정: cuponcheck=N")
    p.add_argument("prd_no")
    p.add_argument("--sel-prc", required=True, type=int)
    p.add_argument("--execute", action="store_true")
    p.set_defaults(func=command_price_coupon_disable)

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        args.func(args)
    except (urllib.error.URLError, TimeoutError) as exc:
        print_json({"error": str(exc)})
        sys.exit(1)


if __name__ == "__main__":
    main()
