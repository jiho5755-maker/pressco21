#!/usr/bin/env python3
"""꽃레진/10g 상품을 채널별로 조회하고 품절 처리하는 일회성 운영 도구.

- 실제 인증값은 Oracle 서버의 /home/ubuntu/n8n/.env에서만 읽는다.
- 기본은 dry-run이다. --execute를 붙일 때만 MakeShop/SmartStore write API를 호출한다.
- 11번가는 현재 키로 상품 API 권한을 확인만 하고, 권한이 없으면 write를 시도하지 않는다.
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import textwrap
from datetime import datetime, timezone
from pathlib import Path

REMOTE_HOST = "ubuntu@158.180.77.201"
SSH_KEY = str(Path.home() / ".ssh/oracle-n8n.key")
REMOTE_ENV = "/home/ubuntu/n8n/.env"

REMOTE_SCRIPT = r'''
import base64
import json
import re
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
import requests

REMOTE_ENV = "__REMOTE_ENV__"
EXECUTE = __EXECUTE__
TARGET_LABEL = "꽃레진/10g"


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def load_env(path):
    values = {}
    for raw in Path(path).read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"\'')
    return values


def compact(text):
    return re.sub(r"\s+", "", str(text or "")).lower()


def is_exact_flower_resin_10g(name):
    value = compact(name)
    return "꽃레진" in value and ("10g" in value or "10ｇ" in value)


def is_flower_resin_fallback(name):
    # "누름꽃 레진" 같은 일반 문구가 공백 제거 과정에서 꽃레진으로 오탐되는 것을 막기 위해
    # fallback은 원문에 붙은 표현 "꽃레진"이 들어간 경우만 허용한다.
    return "꽃레진" in str(name or "")


def one_line_product(product):
    return {
        "uid": product.get("uid"),
        "product_name": product.get("product_name"),
        "category_name": product.get("category_name"),
        "display": product.get("display"),
        "sell_accept": product.get("sell_accept"),
        "quantity": product.get("quantity"),
        "sellprice": product.get("sellprice"),
        "options": [
            {
                "sto_id": row.get("sto_id"),
                "stock_id": row.get("sto_id"),
                "value": row.get("sto_opt_values"),
                "real_stock": row.get("sto_real_stock"),
                "state": row.get("sto_state_code"),
            }
            for row in normalize_list(((product.get("options") or {}).get("basic") if isinstance(product.get("options"), dict) else []))
        ],
    }


def normalize_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def extract_naver_summary(item):
    summary = {}
    wanted = {
        "originProductNo",
        "channelProductNo",
        "name",
        "productName",
        "channelProductName",
        "originProductName",
        "statusType",
        "salePrice",
        "stockQuantity",
        "sellerManagementCode",
    }

    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in wanted and key not in summary:
                    summary[key] = value
                if isinstance(value, (dict, list)):
                    walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    walk(item)
    return summary


def naver_name(summary):
    return str(summary.get("name") or summary.get("productName") or summary.get("channelProductName") or summary.get("originProductName") or "")


def load_makeshop_products(env):
    domain = env.get("MAKESHOP_DOMAIN") or "foreverlove.co.kr"
    headers = {"Shopkey": env.get("MAKESHOP_SHOPKEY", ""), "Licensekey": env.get("MAKESHOP_LICENSEKEY", "")}
    base = f"https://{domain}"
    products = []
    page = 1
    first_meta = {}
    while True:
        response = requests.get(
            base + "/list/open_api.html",
            headers=headers,
            params={"mode": "search", "type": "product", "page": page, "limit": 100},
            timeout=30,
        )
        data = response.json()
        if page == 1:
            first_meta = {
                "status_code": response.status_code,
                "return_code": data.get("return_code"),
                "totalCount": data.get("totalCount"),
                "totalPage": data.get("totalPage"),
            }
        items = data.get("list") or []
        if isinstance(items, dict):
            items = list(items.values())
        products.extend([item for item in items if isinstance(item, dict)])
        total_pages = int(data.get("totalPage") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.75)
    return base, headers, first_meta, products


def read_makeshop_product(base, headers, uid):
    response = requests.get(
        base + "/list/open_api.html",
        headers=headers,
        params={"mode": "search", "type": "product", "uid": uid, "fields": "uid,product_name,category_name,display,sell_accept,quantity,sellprice,options"},
        timeout=30,
    )
    data = response.json()
    items = data.get("list") or []
    if isinstance(items, dict):
        items = list(items.values())
    return items[0] if items else None


def update_makeshop_stock(base, headers, targets):
    endpoint = base + "/list/open_api_process.html?mode=save&type=product&process=stock"
    payload = {}
    idx = 0
    for product in targets:
        uid = str(product.get("uid"))
        detail = read_makeshop_product(base, headers, uid) or product
        basics = normalize_list(((detail.get("options") or {}).get("basic") if isinstance(detail.get("options"), dict) else []))
        for stock in basics:
            stock_id = str(stock.get("sto_id") or "").strip()
            if not stock_id:
                continue
            payload[f"datas[{idx}][product_id]"] = uid
            payload[f"datas[{idx}][stock_id]"] = stock_id
            payload[f"datas[{idx}][stock]"] = "0"
            idx += 1
    if not payload:
        return {"ok": False, "message": "no_stock_payload"}
    if not EXECUTE:
        return {"ok": True, "dry_run": True, "endpoint": endpoint, "items": idx}
    response = requests.post(endpoint, headers=headers, data=payload, timeout=30)
    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text[:1000]}
    return {"ok": response.ok, "status_code": response.status_code, "items": idx, "body": body}


def get_naver_token(env):
    client_id = env.get("NAVER_COMMERCE_CLIENT_ID", "")
    client_secret = env.get("NAVER_COMMERCE_CLIENT_SECRET", "")
    base_url = env.get("NAVER_COMMERCE_API_BASE", "https://api.commerce.naver.com/external").rstrip("/")
    timestamp = str(int(time.time() * 1000))
    signature = base64.b64encode(bcrypt.hashpw(f"{client_id}_{timestamp}".encode(), client_secret.encode())).decode()
    form = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "timestamp": timestamp,
            "client_secret_sign": signature,
            "grant_type": "client_credentials",
            "type": "SELF",
        }
    )
    response = requests.post(
        base_url + "/v1/oauth2/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=form,
        timeout=20,
    )
    data = response.json() if response.text else {}
    token = data.get("access_token")
    if not token:
        raise RuntimeError(f"naver_token_failed:{response.status_code}:{data}")
    return base_url, token


def load_naver_products(env):
    base_url, token = get_naver_token(env)
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}
    products = []
    first_meta = {}
    page = 1
    while True:
        response = requests.post(
            base_url + "/v1/products/search",
            headers=headers,
            json={"page": page, "size": 500, "orderType": "NO"},
            timeout=30,
        )
        data = response.json()
        if page == 1:
            first_meta = {
                "status_code": response.status_code,
                "totalElements": data.get("totalElements"),
                "totalPages": data.get("totalPages"),
            }
        products.extend(data.get("contents") or [])
        total_pages = int(data.get("totalPages") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.15)
    return base_url, token, first_meta, products


def read_naver_by_origin(base_url, token, origin_product_no):
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}
    response = requests.post(
        base_url + "/v1/products/search",
        headers=headers,
        json={"searchKeywordType": "PRODUCT_NO", "originProductNos": [int(origin_product_no)], "page": 1, "size": 10},
        timeout=30,
    )
    data = response.json() if response.text else {}
    items = data.get("contents") or []
    return extract_naver_summary(items[0]) if items else {"originProductNo": origin_product_no, "read_status": response.status_code, "body": data}


def update_naver_status(base_url, token, targets):
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}
    results = []
    for target in targets:
        origin_no = target.get("originProductNo")
        if not origin_no:
            results.append({"ok": False, "message": "missing_originProductNo", "target": target})
            continue
        url = f"{base_url}/v1/products/origin-products/{origin_no}/change-status"
        if not EXECUTE:
            results.append({"ok": True, "dry_run": True, "originProductNo": origin_no, "endpoint": url, "body": {"statusType": "OUTOFSTOCK"}})
            continue
        response = requests.put(url, headers=headers, json={"statusType": "OUTOFSTOCK"}, timeout=30)
        body = None
        if response.text:
            try:
                body = response.json()
            except Exception:
                body = response.text[:1000]
        results.append({"ok": response.status_code in (200, 204), "status_code": response.status_code, "originProductNo": origin_no, "body": body})
        time.sleep(0.2)
    return results


def probe_st11_product_api(env):
    api_key = env.get("ST11_API_KEY", "")
    base = "https://api.11st.co.kr"
    candidates = [
        "/rest/prodservices/product/list",
        "/rest/prodservices/product",
        "/rest/prodservices/products",
        "/rest/prodmarketservice/product/list",
        "/rest/prodmarketservice/product",
        "/rest/prodmarketservice/products",
    ]
    results = []
    for endpoint in candidates:
        try:
            response = requests.get(base + endpoint, headers={"openapikey": api_key}, params={"pageNo": "1", "pageSize": "10"}, timeout=12)
            text = response.text[:500]
            result_code = None
            result_message = None
            code_match = re.search(r"<resultCode>([^<]+)</resultCode>", text)
            msg_match = re.search(r"<resultMessage>([^<]+)</resultMessage>", text)
            if code_match:
                result_code = code_match.group(1)
            if msg_match:
                result_message = msg_match.group(1)
            results.append({"endpoint": endpoint, "status_code": response.status_code, "resultCode": result_code, "resultMessage": result_message})
        except Exception as exc:
            results.append({"endpoint": endpoint, "error": str(exc)})
    can_write = any(item.get("status_code") and item.get("resultCode") not in {"-997", None} for item in results)
    return {"attempted": True, "can_use_product_api": can_write, "probe_results": results, "write_attempted": False}


def main():
    env = load_env(REMOTE_ENV)
    report = {
        "operation": "flower_resin_10g_soldout",
        "target_label": TARGET_LABEL,
        "execute": EXECUTE,
        "started_at": now_iso(),
        "channels": {},
    }

    # MakeShop
    ms_base, ms_headers, ms_meta, ms_products = load_makeshop_products(env)
    ms_matches = [p for p in ms_products if is_exact_flower_resin_10g(p.get("product_name"))]
    ms_before = [one_line_product(read_makeshop_product(ms_base, ms_headers, p.get("uid")) or p) for p in ms_matches]
    ms_update = update_makeshop_stock(ms_base, ms_headers, ms_matches)
    ms_after = [one_line_product(read_makeshop_product(ms_base, ms_headers, p.get("uid")) or p) for p in ms_matches]
    report["channels"]["makeshop"] = {
        "scan_meta": ms_meta,
        "match_rule": "product_name contains 꽃레진 and 10g",
        "matched_count": len(ms_matches),
        "before": ms_before,
        "update": ms_update,
        "after": ms_after,
    }

    # SmartStore/Naver
    nv_base, nv_token, nv_meta, nv_products = load_naver_products(env)
    nv_summaries = [extract_naver_summary(item) for item in nv_products]
    exact = [s for s in nv_summaries if is_exact_flower_resin_10g(naver_name(s))]
    fallback = [s for s in nv_summaries if is_flower_resin_fallback(naver_name(s))]
    if exact:
        nv_targets = exact
        nv_rule = "name contains 꽃레진 and 10g"
    elif len(fallback) == 1:
        nv_targets = fallback
        nv_rule = "fallback: no 10g exact match; single name containing 꽃레진"
    else:
        nv_targets = []
        nv_rule = f"fallback skipped: exact={len(exact)}, flower_resin={len(fallback)}"
    nv_before = [read_naver_by_origin(nv_base, nv_token, s.get("originProductNo")) for s in nv_targets]
    nv_update = update_naver_status(nv_base, nv_token, nv_targets)
    nv_after = [read_naver_by_origin(nv_base, nv_token, s.get("originProductNo")) for s in nv_targets]
    report["channels"]["smartstore"] = {
        "scan_meta": nv_meta,
        "match_rule": nv_rule,
        "matched_count": len(nv_targets),
        "before": nv_before,
        "update": nv_update,
        "after": nv_after,
    }

    # 11st
    report["channels"]["st11"] = probe_st11_product_api(env)
    report["finished_at"] = now_iso()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
'''


def build_remote_script(execute: bool) -> str:
    return (
        REMOTE_SCRIPT
        .replace("__REMOTE_ENV__", REMOTE_ENV)
        .replace("__EXECUTE__", "True" if execute else "False")
    )


def run_remote(script: str) -> dict:
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-i", SSH_KEY, REMOTE_HOST, "python3 -"]
    proc = subprocess.run(cmd, input=script, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise SystemExit(proc.stderr.strip() or proc.stdout.strip() or "remote command failed")
    return json.loads(proc.stdout)


def main() -> int:
    parser = argparse.ArgumentParser(description="꽃레진/10g 채널 품절 처리")
    parser.add_argument("--execute", action="store_true", help="실제 품절 처리 API를 호출한다")
    parser.add_argument("--output", required=True, help="결과 JSON 저장 경로")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = run_remote(build_remote_script(args.execute))
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "execute": args.execute,
        "output": str(output_path),
        "makeshop_matched": payload.get("channels", {}).get("makeshop", {}).get("matched_count"),
        "smartstore_matched": payload.get("channels", {}).get("smartstore", {}).get("matched_count"),
        "st11_product_api": payload.get("channels", {}).get("st11", {}).get("can_use_product_api"),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
