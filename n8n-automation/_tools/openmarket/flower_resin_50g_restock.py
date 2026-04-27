#!/usr/bin/env python3
"""꽃레진/50g 품절 해제/재고 1000 복구 일회성 운영 도구.

- 인증값은 Oracle 서버의 /home/ubuntu/n8n/.env에서만 읽고 로컬 산출물에 기록하지 않는다.
- 기본은 dry-run이며 --execute가 있을 때만 write API를 호출한다.
- MakeShop/SmartStore/Coupang은 API write를 지원한다.
- 11번가는 현재 상품 API 권한/계약이 확인될 때만 read probe를 수행하고, 권한 불가 시 write하지 않는다.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

REMOTE_HOST = "ubuntu@158.180.77.201"
SSH_KEY = str(Path.home() / ".ssh/oracle-n8n.key")
REMOTE_ENV = "/home/ubuntu/n8n/.env"

REMOTE_SCRIPT = r'''
import base64
import copy
import hashlib
import hmac
import json
import re
import time
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
import requests

REMOTE_ENV = "__REMOTE_ENV__"
EXECUTE = __EXECUTE__
TARGET_STOCK = __TARGET_STOCK__
SMARTSTORE_SLEEP = __SMARTSTORE_SLEEP__
TARGET_LABEL = "꽃레진/50g"
KNOWN_NAVER_ORIGIN_PRODUCTS = [11584792106]
ST11_SELLER_CODES = ["103885", "184", "12195529"]


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


def norm(text):
    return re.sub(r"\s+", "", str(text or "")).lower()


def is_flower_resin_50g(text):
    raw = str(text or "")
    value = norm(raw)
    return "꽃레진" in raw and ("50g" in value or "50ｇ" in value)


def normalize_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def parse_json_body(response):
    try:
        return response.json()
    except Exception:
        return {"raw": response.text[:1000]}


def compact_http_result(response):
    body = parse_json_body(response)
    return {"ok": response.ok, "status_code": response.status_code, "body": body}


# ---------------------------------------------------------------------------
# MakeShop
# ---------------------------------------------------------------------------

def load_makeshop_products(env):
    domain = env.get("MAKESHOP_DOMAIN") or "foreverlove.co.kr"
    headers = {"Shopkey": env.get("MAKESHOP_SHOPKEY", ""), "Licensekey": env.get("MAKESHOP_LICENSEKEY", "")}
    base = f"https://{domain}"
    products = []
    page = 1
    meta = {}
    while True:
        response = requests.get(
            base + "/list/open_api.html",
            headers=headers,
            params={"mode": "search", "type": "product", "page": page, "limit": 100},
            timeout=30,
        )
        data = response.json()
        if page == 1:
            meta = {
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
        time.sleep(0.35)
    return base, headers, meta, products


def read_makeshop_product(base, headers, uid):
    response = requests.get(
        base + "/list/open_api.html",
        headers=headers,
        params={
            "mode": "search",
            "type": "product",
            "uid": uid,
            "fields": "uid,product_name,category_name,cate1,cate2,cate3,display,sell_accept,quantity,sellprice,consumerprice,buyprice,reserve,options,add_composition",
        },
        timeout=30,
    )
    data = response.json()
    items = data.get("list") or []
    if isinstance(items, dict):
        items = list(items.values())
    return items[0] if items else None


def compact_makeshop_product(product):
    options = product.get("options") if isinstance(product.get("options"), dict) else {}
    basics = normalize_list(options.get("basic"))
    additions = normalize_list(options.get("addition"))
    option_defs = normalize_list(options.get("option"))
    return {
        "uid": product.get("uid"),
        "product_name": product.get("product_name"),
        "category_name": product.get("category_name"),
        "cate1": product.get("cate1"),
        "cate2": product.get("cate2"),
        "display": product.get("display"),
        "sell_accept": product.get("sell_accept"),
        "quantity": product.get("quantity"),
        "sellprice": product.get("sellprice"),
        "basic_stock_rows": [
            {
                "sto_id": row.get("sto_id"),
                "value": row.get("sto_opt_values"),
                "real_stock": row.get("sto_real_stock"),
                "unlimit": row.get("sto_unlimit"),
                "stop_use": row.get("sto_stop_use"),
                "state": row.get("sto_state_code"),
            }
            for row in basics
        ],
        "addition_stock_rows_count": len(additions),
        "option_defs_count": len(option_defs),
    }


def find_makeshop_main_targets(products):
    return [p for p in products if is_flower_resin_50g(p.get("product_name"))]


def find_makeshop_addition_targets(products):
    targets = []
    for product in products:
        options = product.get("options") if isinstance(product.get("options"), dict) else {}
        option_defs = normalize_list(options.get("option"))
        addition_stocks = normalize_list(options.get("addition"))
        target_option_defs = []
        target_option_ids = set()
        target_values = set()
        for opt in option_defs:
            if opt.get("opt_type") != "ADDITION":
                continue
            text = " ".join(str(opt.get(key, "")) for key in ["opt_name", "opt_value"])
            if not is_flower_resin_50g(text):
                continue
            target_option_defs.append(opt)
            if opt.get("opt_id"):
                target_option_ids.add(str(opt.get("opt_id")))
            for value in str(opt.get("opt_value", "")).split(","):
                if is_flower_resin_50g(value):
                    target_values.add(value.strip())
        if not target_option_defs:
            continue
        matched_stocks = []
        for stock in addition_stocks:
            stock_text = " ".join(str(stock.get(key, "")) for key in ["opt_ids", "sto_opt_values", "sto_option_code"])
            if str(stock.get("opt_ids")) in target_option_ids:
                stock_value = str(stock.get("sto_opt_values", "")).strip()
                if target_values:
                    if stock_value in target_values or is_flower_resin_50g(stock_value):
                        matched_stocks.append(stock)
                else:
                    matched_stocks.append(stock)
            elif is_flower_resin_50g(stock_text):
                matched_stocks.append(stock)
        for opt in target_option_defs:
            if is_flower_resin_50g(opt.get("opt_name")) and str(opt.get("opt_id")) in target_option_ids:
                for stock in addition_stocks:
                    if str(stock.get("opt_ids")) == str(opt.get("opt_id")) and stock not in matched_stocks:
                        matched_stocks.append(stock)
        targets.append({"uid": product.get("uid"), "product_name": product.get("product_name"), "category_name": product.get("category_name"), "target_options": target_option_defs, "target_stocks": matched_stocks})
    return targets


def summarize_makeshop_addition_targets(targets):
    return [
        {
            "uid": t.get("uid"),
            "product_name": t.get("product_name"),
            "category_name": t.get("category_name"),
            "target_options": [{"opt_id": o.get("opt_id"), "opt_name": o.get("opt_name"), "opt_value": o.get("opt_value"), "opt_use": o.get("opt_use")} for o in t.get("target_options", [])],
            "target_stocks": [
                {"sto_id": s.get("sto_id"), "opt_ids": s.get("opt_ids"), "value": s.get("sto_opt_values"), "real_stock": s.get("sto_real_stock"), "unlimit": s.get("sto_unlimit"), "stop_use": s.get("sto_stop_use"), "state": s.get("sto_state_code")}
                for s in t.get("target_stocks", [])
            ],
        }
        for t in targets
    ]


def update_makeshop_main_stock(base, headers, targets):
    stock_endpoint = base + "/list/open_api_process.html?mode=save&type=product&process=stock"
    update_endpoint = base + "/list/open_api_process.html?mode=save&type=product&process=update"
    stock_payload = {}
    stock_idx = 0
    display_payloads = []
    for product in targets:
        uid = str(product.get("uid"))
        detail = read_makeshop_product(base, headers, uid) or product
        basics = normalize_list(((detail.get("options") or {}).get("basic") if isinstance(detail.get("options"), dict) else []))
        if basics:
            for stock in basics:
                stock_id = str(stock.get("sto_id") or "").strip()
                if not stock_id:
                    continue
                stock_payload[f"datas[{stock_idx}][product_id]"] = uid
                stock_payload[f"datas[{stock_idx}][stock_id]"] = stock_id
                stock_payload[f"datas[{stock_idx}][stock]"] = str(TARGET_STOCK)
                stock_payload[f"datas[{stock_idx}][stop_use]"] = "N"
                stock_idx += 1
        # 사용자-facing 기존 row(display/sell_accept 중 하나라도 Y)만 명시적으로 라이브 상태를 보정한다.
        if str(detail.get("display")) == "Y" or str(detail.get("sell_accept")) == "Y":
            display_payloads.append({
                "product_id": uid,
                "product_name": str(detail.get("product_name") or product.get("product_name") or ""),
                "cate1": str(detail.get("cate1") or ""),
                "cate2": str(detail.get("cate2") or ""),
                "cate3": str(detail.get("cate3") or ""),
                "sell_accept": "Y",
                "display": "Y",
                "sellprice": str(detail.get("sellprice") or "0"),
                "consumerprice": str(detail.get("consumerprice") or "0"),
                "buyprice": str(detail.get("buyprice") or "0"),
                "reserve": str(detail.get("reserve") or "0"),
            })
    results = {"stock_endpoint": stock_endpoint, "stock_rows": stock_idx, "display_endpoint": update_endpoint, "display_products": len(display_payloads), "stock_result": None, "display_results": []}
    if not EXECUTE:
        results["dry_run"] = True
        return results
    # 상품 표시/판매 상태 보정 후 재고를 마지막에 적용한다.
    # MakeShop product update가 일부 단품 재고를 무제한으로 되돌릴 수 있어 stock write를 최종 write로 둔다.
    for payload in display_payloads:
        response = requests.post(update_endpoint, headers=headers, data=payload, timeout=30)
        results["display_results"].append({"product_id": payload.get("product_id"), **compact_http_result(response)})
        time.sleep(0.2)
    if stock_payload:
        response = requests.post(stock_endpoint, headers=headers, data=stock_payload, timeout=30)
        results["stock_result"] = compact_http_result(response)
    return results


def update_makeshop_addition_stock(base, headers, targets):
    endpoint = base + "/list/open_api_process.html?mode=save&type=product&process=stock"
    payload = {}
    idx = 0
    for target in targets:
        uid = str(target.get("uid"))
        for stock in target.get("target_stocks", []):
            stock_id = str(stock.get("sto_id") or "").strip()
            if not stock_id:
                continue
            payload[f"datas[{idx}][product_id]"] = uid
            payload[f"datas[{idx}][stock_id]"] = stock_id
            payload[f"datas[{idx}][stock]"] = str(TARGET_STOCK)
            payload[f"datas[{idx}][stop_use]"] = "N"
            idx += 1
    if not payload:
        return {"ok": True, "message": "no_makeshop_addition_stock_rows"}
    if not EXECUTE:
        return {"ok": True, "dry_run": True, "endpoint": endpoint, "items": idx}
    response = requests.post(endpoint, headers=headers, data=payload, timeout=30)
    return {"items": idx, **compact_http_result(response)}


# ---------------------------------------------------------------------------
# SmartStore
# ---------------------------------------------------------------------------

def naver_token(env):
    client_id = env.get("NAVER_COMMERCE_CLIENT_ID", "")
    client_secret = env.get("NAVER_COMMERCE_CLIENT_SECRET", "")
    base_url = env.get("NAVER_COMMERCE_API_BASE", "https://api.commerce.naver.com/external").rstrip("/")
    ts = str(int(time.time() * 1000))
    sig = base64.b64encode(bcrypt.hashpw(f"{client_id}_{ts}".encode(), client_secret.encode())).decode()
    form = urllib.parse.urlencode({"client_id": client_id, "timestamp": ts, "client_secret_sign": sig, "grant_type": "client_credentials", "type": "SELF"})
    response = requests.post(base_url + "/v1/oauth2/token", headers={"Content-Type": "application/x-www-form-urlencoded"}, data=form, timeout=20)
    data = response.json() if response.text else {}
    if not data.get("access_token"):
        raise RuntimeError(f"naver_token_failed:{response.status_code}:{data}")
    return base_url, data["access_token"]


def naver_headers(token):
    return {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}


def naver_summary(item):
    out = {}
    wanted = {"originProductNo", "channelProductNo", "name", "productName", "channelProductName", "originProductName", "statusType", "stockQuantity", "salePrice", "sellerManagementCode"}
    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in wanted and key not in out:
                    out[key] = value
                if isinstance(value, (dict, list)):
                    walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)
    walk(item)
    return out


def naver_name(summary):
    return str(summary.get("name") or summary.get("productName") or summary.get("channelProductName") or summary.get("originProductName") or "")


def list_naver_products(base_url, headers):
    products = []
    page = 1
    meta = {}
    while True:
        response = requests.post(base_url + "/v1/products/search", headers=headers, json={"page": page, "size": 500, "orderType": "NO"}, timeout=30)
        data = response.json() if response.text else {}
        if page == 1:
            meta = {"status_code": response.status_code, "totalElements": data.get("totalElements"), "totalPages": data.get("totalPages")}
        products.extend(data.get("contents") or [])
        total_pages = int(data.get("totalPages") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.12)
    return meta, products


def read_naver_origin(base_url, headers, origin_no):
    url = base_url + f"/v2/products/origin-products/{origin_no}"
    for attempt in range(5):
        response = requests.get(url, headers=headers, timeout=45)
        if response.status_code != 429:
            return response.status_code, response.json() if response.text else {}
        time.sleep(1.5 * (attempt + 1))
    return response.status_code, response.json() if response.text else {"message": "rate_limited"}


def iter_dicts(obj, path=""):
    if isinstance(obj, dict):
        yield path, obj
        for key, value in obj.items():
            next_path = f"{path}.{key}" if path else str(key)
            yield from iter_dicts(value, next_path)
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from iter_dicts(value, f"{path}[{idx}]")


def is_naver_mutation_row(row):
    text = json.dumps(row, ensure_ascii=False)
    if not is_flower_resin_50g(text):
        return False
    return "stockQuantity" in row or "usable" in row or "statusType" in row


def summarize_naver_row(path, row):
    keys = ["id", "groupName", "name", "optionName1", "optionName2", "optionName3", "optionName4", "sellerManagerCode", "stockQuantity", "usable", "statusType", "price"]
    item = {key: row.get(key) for key in keys if key in row}
    item["path"] = path
    return item


def find_naver_option_targets(payload):
    targets = []
    for path, row in iter_dicts(payload):
        if path == "originProduct":
            continue
        if is_naver_mutation_row(row):
            targets.append((path, row))
    return targets


def list_naver_origin_numbers(products):
    out = []
    seen = set()
    for item in products:
        summary = naver_summary(item)
        origin_no = summary.get("originProductNo")
        if origin_no and origin_no not in seen:
            seen.add(origin_no)
            out.append(origin_no)
    for origin_no in KNOWN_NAVER_ORIGIN_PRODUCTS:
        if origin_no not in seen:
            seen.add(origin_no)
            out.append(origin_no)
    return out


def update_naver_main_status(base_url, headers, targets):
    results = []
    for target in targets:
        origin_no = target.get("originProductNo")
        if not origin_no:
            results.append({"ok": False, "message": "missing_originProductNo", "target": target})
            continue
        url = f"{base_url}/v1/products/origin-products/{origin_no}/change-status"
        if not EXECUTE:
            results.append({"ok": True, "dry_run": True, "originProductNo": origin_no, "endpoint": url, "body": {"statusType": "SALE"}})
            continue
        response = requests.put(url, headers=headers, json={"statusType": "SALE"}, timeout=30)
        body = parse_json_body(response) if response.text else None
        results.append({"ok": response.status_code in (200, 204), "status_code": response.status_code, "originProductNo": origin_no, "body": body})
        time.sleep(0.25)
    return results


def scan_naver_option_targets(base_url, headers, products):
    targets = []
    errors = []
    origin_numbers = list_naver_origin_numbers(products)
    for origin_no in origin_numbers:
        try:
            status, payload = read_naver_origin(base_url, headers, origin_no)
            if status != 200:
                errors.append({"originProductNo": origin_no, "status_code": status, "body": payload})
                time.sleep(SMARTSTORE_SLEEP)
                continue
            origin = payload.get("originProduct") or {}
            option_targets = find_naver_option_targets(payload)
            if option_targets:
                targets.append({"originProductNo": origin_no, "productName": origin.get("name"), "statusType": origin.get("statusType"), "payload": payload, "matches": [{"path": path, "row": copy.deepcopy(row)} for path, row in option_targets]})
        except Exception as exc:
            errors.append({"originProductNo": origin_no, "error": str(exc)})
        time.sleep(SMARTSTORE_SLEEP)
    return {"origin_count": len(origin_numbers)}, targets, errors


def summarize_naver_option_targets(targets):
    return [{"originProductNo": target.get("originProductNo"), "productName": target.get("productName"), "statusType": target.get("statusType"), "matches": [summarize_naver_row(match["path"], match["row"]) for match in target.get("matches", [])]} for target in targets]


def remove_restricted_seller_tags(payload, invalid_inputs):
    removed = []
    tags = (((payload.get("originProduct") or {}).get("detailAttribute") or {}).get("sellerTags") or [])
    if not isinstance(tags, list):
        return removed
    bad_texts = set()
    for item in invalid_inputs or []:
        msg = str(item.get("message") or "")
        m = re.search(r"태그명:\s*([^\)]+)", msg)
        if m:
            bad_texts.add(m.group(1).strip().lower())
    if not bad_texts:
        return removed
    kept = []
    for tag in tags:
        text = str(tag.get("text") or "").strip()
        if text.lower() in bad_texts:
            removed.append(tag)
        else:
            kept.append(tag)
    (((payload.get("originProduct") or {}).get("detailAttribute") or {}))["sellerTags"] = kept
    return removed


def compact_naver_put_body(body):
    if not isinstance(body, dict):
        return body
    compact = {key: body.get(key) for key in ["originProductNo", "smartstoreChannelProductNo", "code", "message", "timestamp"] if key in body}
    if "invalidInputs" in body:
        compact["invalidInputs"] = body.get("invalidInputs")
    origin = body.get("originProduct") if isinstance(body.get("originProduct"), dict) else None
    if origin:
        detail = origin.get("detailAttribute") if isinstance(origin.get("detailAttribute"), dict) else {}
        supplements = ((detail.get("supplementProductInfo") or {}).get("supplementProducts") or []) if isinstance(detail, dict) else []
        compact["originProduct"] = {
            "name": origin.get("name"),
            "statusType": origin.get("statusType"),
            "targetSupplements": [
                {"id": item.get("id"), "groupName": item.get("groupName"), "name": item.get("name"), "price": item.get("price"), "stockQuantity": item.get("stockQuantity"), "usable": item.get("usable")}
                for item in supplements
                if is_flower_resin_50g(item.get("name"))
            ],
        }
    return compact


def put_naver_origin_with_retry(base_url, headers, origin_no, payload):
    removed_tags = []
    attempts = []
    for attempt in range(3):
        response = requests.put(base_url + f"/v2/products/origin-products/{origin_no}", headers=headers, json=payload, timeout=60)
        body = parse_json_body(response) if response.text else None
        compact_body = compact_naver_put_body(body)
        attempts.append({"status_code": response.status_code, "ok": response.status_code in (200, 204), "body": compact_body})
        if response.status_code in (200, 204):
            return {"ok": True, "status_code": response.status_code, "body": compact_body, "attempts": attempts, "removed_restricted_tags": removed_tags}
        invalids = body.get("invalidInputs") if isinstance(body, dict) else None
        removed = remove_restricted_seller_tags(payload, invalids)
        if not removed:
            return {"ok": False, "status_code": response.status_code, "body": compact_body, "attempts": attempts, "removed_restricted_tags": removed_tags}
        removed_tags.extend(removed)
        time.sleep(0.2)
    return {"ok": False, "status_code": attempts[-1]["status_code"], "body": attempts[-1].get("body"), "attempts": attempts, "removed_restricted_tags": removed_tags}


def update_naver_option_targets(base_url, headers, targets):
    results = []
    for target in targets:
        payload = copy.deepcopy(target["payload"])
        changed = 0
        changed_rows = []
        for path, row in iter_dicts(payload):
            if path == "originProduct":
                continue
            if not is_naver_mutation_row(row):
                continue
            before = summarize_naver_row(path, row)
            if "stockQuantity" in row:
                row["stockQuantity"] = TARGET_STOCK
            if "usable" in row:
                row["usable"] = True
            if "statusType" in row:
                row["statusType"] = "SALE"
            changed += 1
            changed_rows.append({"before": before, "after": summarize_naver_row(path, row)})
        origin_no = target["originProductNo"]
        if not EXECUTE:
            results.append({"originProductNo": origin_no, "dry_run": True, "changed": changed, "changed_rows": changed_rows})
            continue
        put_result = put_naver_origin_with_retry(base_url, headers, origin_no, payload)
        results.append({"originProductNo": origin_no, "changed": changed, "changed_rows": changed_rows, **put_result})
        time.sleep(0.4)
    return results


# ---------------------------------------------------------------------------
# Coupang
# ---------------------------------------------------------------------------

def coupang_config(env):
    access_key = env.get("COUPANG_ACCESS_KEY") or env.get("COUPANG_API_ACCESS_KEY")
    secret_key = env.get("COUPANG_SECRET_KEY") or env.get("COUPANG_API_SECRET_KEY")
    vendor_id = env.get("COUPANG_VENDOR_ID")
    base_url = (env.get("COUPANG_API_BASE_URL") or "https://api-gateway.coupang.com").rstrip("/")
    if not access_key or not secret_key or not vendor_id:
        return None
    return {"access_key": access_key, "secret_key": secret_key, "vendor_id": vendor_id, "base_url": base_url}


def coupang_auth_header(method, path, query, config):
    signed_date = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    message = signed_date + method.upper() + path + query
    signature = hmac.new(config["secret_key"].encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"CEA algorithm=HmacSHA256, access-key={config['access_key']}, signed-date={signed_date}, signature={signature}"


def coupang_request(config, method, path, params=None, json_body=None, timeout=30):
    params = params or {}
    query = urllib.parse.urlencode(params, doseq=True)
    headers = {"Authorization": coupang_auth_header(method, path, query, config), "Content-Type": "application/json;charset=UTF-8"}
    return requests.request(method, config["base_url"] + path, headers=headers, params=params if method.upper() == "GET" else None, json=json_body, timeout=timeout)


def compact_coupang_product_summary(item):
    return {key: item.get(key) for key in ["sellerProductId", "sellerProductName", "productId", "vendorId", "statusName", "saleStartedAt", "saleEndedAt", "brand", "createdAt"] if key in item}


def list_coupang_candidates(config):
    path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
    queries = ["꽃레진", "실리콘레진", "꽃레진/50g", "50g"]
    by_id = {}
    probes = []
    for query_text in queries:
        params = {"vendorId": config["vendor_id"], "maxPerPage": "100", "sellerProductName": query_text}
        next_token = "1"
        page_count = 0
        while next_token and page_count < 20:
            if next_token != "1":
                params["nextToken"] = next_token
            response = coupang_request(config, "GET", path, params=params)
            body = parse_json_body(response)
            probes.append({"query": query_text, "status_code": response.status_code, "code": body.get("code") if isinstance(body, dict) else None, "message": body.get("message") if isinstance(body, dict) else None, "count": len(body.get("data") or []) if isinstance(body, dict) else 0})
            if response.status_code != 200 or not isinstance(body, dict):
                break
            for item in body.get("data") or []:
                seller_id = item.get("sellerProductId")
                if seller_id:
                    by_id[str(seller_id)] = item
            next_token = str(body.get("nextToken") or "")
            page_count += 1
            if not next_token:
                break
            time.sleep(0.15)
    # Seller SKU 후보도 함께 확인한다.
    sku_probe_results = []
    for code in ["103885", "184", "12195529", "PC21-SKU-876F51C76E"]:
        sku_path = f"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/external-vendor-sku-codes/{urllib.parse.quote(code)}"
        response = coupang_request(config, "GET", sku_path)
        body = parse_json_body(response)
        data = body.get("data") if isinstance(body, dict) else []
        sku_probe_results.append({"externalVendorSku": code, "status_code": response.status_code, "code": body.get("code") if isinstance(body, dict) else None, "message": body.get("message") if isinstance(body, dict) else None, "count": len(data or []) if isinstance(data, list) else 0})
        if response.status_code == 200 and isinstance(data, list):
            for item in data:
                seller_id = item.get("sellerProductId")
                if seller_id:
                    by_id[str(seller_id)] = item
        time.sleep(0.1)
    return {"search_probes": probes, "sku_probes": sku_probe_results}, list(by_id.values())


def read_coupang_seller_product(config, seller_product_id):
    path = f"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{seller_product_id}"
    response = coupang_request(config, "GET", path)
    body = parse_json_body(response)
    return response.status_code, body


def compact_coupang_item(item):
    keys = ["sellerProductItemId", "vendorItemId", "itemName", "salePrice", "originalPrice", "maximumBuyCount", "maximumBuyForPerson", "externalVendorSku", "barcode", "emptyBarcode", "modelNo", "certifications", "notices"]
    out = {key: item.get(key) for key in keys if key in item}
    # 일부 응답은 inventory/status 필드 이름이 다를 수 있어 주요 후보를 추가한다.
    for key in ["quantity", "stockQuantity", "saleStatus", "status", "statusName"]:
        if key in item:
            out[key] = item.get(key)
    return out


def find_coupang_targets(config):
    probes, summaries = list_coupang_candidates(config)
    details = []
    targets = []
    errors = []
    for summary in summaries:
        seller_product_id = summary.get("sellerProductId")
        status, body = read_coupang_seller_product(config, seller_product_id)
        if status != 200 or not isinstance(body, dict) or body.get("code") not in ("SUCCESS", "SUCCES", None):
            errors.append({"sellerProductId": seller_product_id, "status_code": status, "body": body})
            continue
        data = body.get("data") or {}
        product_text = " ".join(str(data.get(k, "")) for k in ["sellerProductName", "displayProductName", "generalProductName"])
        items = normalize_list(data.get("items"))
        matched_items = []
        for item in items:
            item_text = " ".join(str(item.get(k, "")) for k in ["itemName", "externalVendorSku", "modelNo"])
            if is_flower_resin_50g(item_text) or is_flower_resin_50g(product_text):
                if item.get("vendorItemId"):
                    matched_items.append(item)
        detail_summary = {"sellerProduct": compact_coupang_product_summary(data), "productText": product_text, "items": [compact_coupang_item(item) for item in items[:20]], "matchedItems": [compact_coupang_item(item) for item in matched_items]}
        details.append(detail_summary)
        if matched_items:
            targets.append({"sellerProductId": seller_product_id, "sellerProductName": data.get("sellerProductName"), "displayProductName": data.get("displayProductName"), "matchedItems": matched_items})
        time.sleep(0.15)
    return probes, details, targets, errors


def read_coupang_inventory(config, vendor_item_id):
    path = f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/inventories"
    response = coupang_request(config, "GET", path)
    body = parse_json_body(response)
    return {"vendorItemId": vendor_item_id, "status_code": response.status_code, "body": body}


def update_coupang_targets(config, targets):
    results = []
    for target in targets:
        for item in target.get("matchedItems", []):
            vendor_item_id = item.get("vendorItemId")
            if not vendor_item_id:
                results.append({"ok": False, "message": "missing_vendorItemId", "item": compact_coupang_item(item)})
                continue
            quantity_path = f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/quantities/{TARGET_STOCK}"
            resume_path = f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/sales/resume"
            before_inventory = read_coupang_inventory(config, vendor_item_id)
            if not EXECUTE:
                results.append({"vendorItemId": vendor_item_id, "sellerProductId": target.get("sellerProductId"), "dry_run": True, "quantity_endpoint": quantity_path, "resume_endpoint": resume_path, "before_inventory": before_inventory, "item": compact_coupang_item(item)})
                continue
            q_response = coupang_request(config, "PUT", quantity_path)
            q_body = parse_json_body(q_response) if q_response.text else None
            time.sleep(0.2)
            r_response = coupang_request(config, "PUT", resume_path)
            r_body = parse_json_body(r_response) if r_response.text else None
            time.sleep(0.3)
            after_inventory = read_coupang_inventory(config, vendor_item_id)
            results.append({
                "vendorItemId": vendor_item_id,
                "sellerProductId": target.get("sellerProductId"),
                "item": compact_coupang_item(item),
                "before_inventory": before_inventory,
                "quantity_result": {"ok": q_response.status_code in (200, 204), "status_code": q_response.status_code, "body": q_body},
                "resume_result": {"ok": r_response.status_code in (200, 204), "status_code": r_response.status_code, "body": r_body},
                "after_inventory": after_inventory,
            })
    return results


# ---------------------------------------------------------------------------
# 11st
# ---------------------------------------------------------------------------

def parse_st11_error(text):
    out = {"raw_preview": text[:500]}
    try:
        root = ET.fromstring(text)
        for tag in ["resultCode", "resultMessage", "message", "code"]:
            node = root.find(".//" + tag)
            if node is not None:
                out[tag] = node.text
    except Exception:
        pass
    if "등록된 API 정보가 존재하지 않습니다" in text:
        out["permission_error"] = True
    return out


def probe_st11_product_api(env):
    api_key = env.get("ST11_API_KEY", "")
    base = "https://api.11st.co.kr"
    headers = {"openapikey": api_key}
    probes = []
    for endpoint in [
        "/rest/prodservices/product/list",
        "/rest/prodservices/product",
        "/rest/prodmarketservice/prodmarket",
    ]:
        try:
            response = requests.get(base + endpoint, headers=headers, params={"pageNo": "1", "pageSize": "10"}, timeout=12)
            parsed = parse_st11_error(response.text)
            probes.append({"endpoint": endpoint, "status_code": response.status_code, **{k: v for k, v in parsed.items() if k != "raw_preview"}})
        except Exception as exc:
            probes.append({"endpoint": endpoint, "error": str(exc)})
    seller_code_reads = []
    for code in ST11_SELLER_CODES:
        endpoint = f"/rest/prodmarketservice/sellerprodcode/{urllib.parse.quote(code)}"
        try:
            response = requests.get(base + endpoint, headers=headers, timeout=12)
            parsed = parse_st11_error(response.text)
            seller_code_reads.append({"sellerprdcd": code, "endpoint": endpoint, "status_code": response.status_code, **parsed})
        except Exception as exc:
            seller_code_reads.append({"sellerprdcd": code, "endpoint": endpoint, "error": str(exc)})
    permission_blocked = any(item.get("resultCode") == "-997" or item.get("permission_error") for item in probes + seller_code_reads)
    return {
        "attempted": True,
        "product_api_permission_blocked": permission_blocked,
        "probe_results": probes,
        "seller_code_reads": seller_code_reads,
        "write_attempted": False,
        "write_skip_reason": "11st product API permission/contract not available or stock write contract not safely confirmed" if permission_blocked else "11st write skipped: exact stock write payload contract not safely confirmed",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    env = load_env(REMOTE_ENV)
    report = {"operation": "flower_resin_50g_restock", "target_label": TARGET_LABEL, "target_stock": TARGET_STOCK, "execute": EXECUTE, "started_at": now_iso(), "channels": {}}

    # MakeShop
    ms_base, ms_headers, ms_meta, ms_products = load_makeshop_products(env)
    ms_main_matches = find_makeshop_main_targets(ms_products)
    ms_main_before = [compact_makeshop_product(read_makeshop_product(ms_base, ms_headers, p.get("uid")) or p) for p in ms_main_matches]
    ms_main_update = update_makeshop_main_stock(ms_base, ms_headers, ms_main_matches)
    ms_main_after = [compact_makeshop_product(read_makeshop_product(ms_base, ms_headers, p.get("uid")) or p) for p in ms_main_matches]

    ms_add_targets = find_makeshop_addition_targets(ms_products)
    ms_add_before = summarize_makeshop_addition_targets(ms_add_targets)
    ms_add_update = update_makeshop_addition_stock(ms_base, ms_headers, ms_add_targets)
    ms_add_after_targets = []
    for target in ms_add_targets:
        detail = read_makeshop_product(ms_base, ms_headers, target["uid"])
        ms_add_after_targets.extend(find_makeshop_addition_targets([detail] if detail else []))

    report["channels"]["makeshop"] = {
        "scan_meta": ms_meta,
        "main_match_rule": "product_name contains 꽃레진 and 50g",
        "main_matched_count": len(ms_main_matches),
        "main_before": ms_main_before,
        "main_update": ms_main_update,
        "main_after": ms_main_after,
        "addition_match_rule": "ADDITION option/stock contains 꽃레진 and 50g",
        "addition_matched_products": len(ms_add_targets),
        "addition_before": ms_add_before,
        "addition_update": ms_add_update,
        "addition_after": summarize_makeshop_addition_targets(ms_add_after_targets),
    }

    # SmartStore
    try:
        nv_base, nv_token = naver_token(env)
        nv_headers = naver_headers(nv_token)
        nv_meta, nv_products = list_naver_products(nv_base, nv_headers)
        nv_summaries = [naver_summary(item) for item in nv_products]
        nv_main_targets = [s for s in nv_summaries if is_flower_resin_50g(naver_name(s))]
        nv_main_before = nv_main_targets
        nv_main_update = update_naver_main_status(nv_base, nv_headers, nv_main_targets)
        nv_main_after = []
        for item in nv_main_targets:
            origin_no = item.get("originProductNo")
            if origin_no:
                status, payload = read_naver_origin(nv_base, nv_headers, origin_no)
                origin = payload.get("originProduct") or {}
                nv_main_after.append({"originProductNo": origin_no, "status_code": status, "name": origin.get("name"), "statusType": origin.get("statusType"), "stockQuantity": origin.get("stockQuantity")})
        nv_scan_meta, nv_option_targets, nv_errors = scan_naver_option_targets(nv_base, nv_headers, nv_products)
        nv_option_before = summarize_naver_option_targets(nv_option_targets)
        nv_option_update = update_naver_option_targets(nv_base, nv_headers, nv_option_targets)
        nv_option_after = []
        for target in nv_option_targets:
            status, payload = read_naver_origin(nv_base, nv_headers, target["originProductNo"])
            matches = find_naver_option_targets(payload) if status == 200 else []
            nv_option_after.append({"originProductNo": target["originProductNo"], "status_code": status, "matches": [summarize_naver_row(path, row) for path, row in matches]})
            time.sleep(0.2)
        report["channels"]["smartstore"] = {
            "scan_meta": nv_meta,
            "main_match_rule": "name contains 꽃레진 and 50g",
            "main_matched_count": len(nv_main_targets),
            "main_before": nv_main_before,
            "main_update": nv_main_update,
            "main_after": nv_main_after,
            "option_scan_meta": nv_scan_meta,
            "option_match_rule": "v2 origin payload sub-row contains 꽃레진 and 50g with stock/status fields",
            "option_matched_products": len(nv_option_targets),
            "option_before": nv_option_before,
            "option_update": nv_option_update,
            "option_after": nv_option_after,
            "errors": nv_errors[:20],
            "error_count": len(nv_errors),
        }
    except Exception as exc:
        report["channels"]["smartstore"] = {"error": str(exc)}

    # Coupang
    try:
        cp_config = coupang_config(env)
        if not cp_config:
            report["channels"]["coupang"] = {"attempted": False, "error": "missing_coupang_credentials"}
        else:
            cp_probes, cp_details, cp_targets, cp_errors = find_coupang_targets(cp_config)
            cp_before = []
            for target in cp_targets:
                for item in target.get("matchedItems", []):
                    if item.get("vendorItemId"):
                        cp_before.append(read_coupang_inventory(cp_config, item.get("vendorItemId")))
            cp_update = update_coupang_targets(cp_config, cp_targets)
            report["channels"]["coupang"] = {
                "scan_meta": cp_probes,
                "match_rule": "sellerProductName/displayProductName/itemName/externalVendorSku contains 꽃레진 and 50g",
                "candidate_details": cp_details,
                "matched_products": len(cp_targets),
                "matched_vendor_items": sum(len(t.get("matchedItems", [])) for t in cp_targets),
                "before_inventories": cp_before,
                "update": cp_update,
                "errors": cp_errors,
            }
    except Exception as exc:
        report["channels"]["coupang"] = {"error": str(exc)}

    # 11st
    report["channels"]["st11"] = probe_st11_product_api(env)
    report["finished_at"] = now_iso()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
'''


def build_remote_script(execute: bool, target_stock: int, smartstore_sleep: float) -> str:
    return (
        REMOTE_SCRIPT
        .replace("__REMOTE_ENV__", REMOTE_ENV)
        .replace("__EXECUTE__", "True" if execute else "False")
        .replace("__TARGET_STOCK__", str(int(target_stock)))
        .replace("__SMARTSTORE_SLEEP__", repr(float(smartstore_sleep)))
    )


def run_remote(script: str) -> dict:
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-i", SSH_KEY, REMOTE_HOST, "python3 -"]
    proc = subprocess.run(cmd, input=script, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise SystemExit(proc.stderr.strip() or proc.stdout.strip() or "remote command failed")
    return json.loads(proc.stdout)


def main() -> int:
    parser = argparse.ArgumentParser(description="꽃레진/50g 채널 재고 복구")
    parser.add_argument("--execute", action="store_true", help="실제 재고 복구 API를 호출한다")
    parser.add_argument("--stock", type=int, default=1000, help="목표 재고 수량")
    parser.add_argument("--output", required=True, help="결과 JSON 저장 경로")
    parser.add_argument("--smartstore-sleep", type=float, default=0.25, help="SmartStore v2 상세 조회 간격(초)")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = run_remote(build_remote_script(args.execute, args.stock, args.smartstore_sleep))
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    channels = payload.get("channels", {})
    print(json.dumps({
        "execute": args.execute,
        "stock": args.stock,
        "output": str(output_path),
        "makeshop_main_matched": channels.get("makeshop", {}).get("main_matched_count"),
        "makeshop_addition_matched_products": channels.get("makeshop", {}).get("addition_matched_products"),
        "smartstore_main_matched": channels.get("smartstore", {}).get("main_matched_count"),
        "smartstore_option_matched_products": channels.get("smartstore", {}).get("option_matched_products"),
        "smartstore_error_count": channels.get("smartstore", {}).get("error_count"),
        "coupang_matched_products": channels.get("coupang", {}).get("matched_products"),
        "coupang_matched_vendor_items": channels.get("coupang", {}).get("matched_vendor_items"),
        "st11_product_api_permission_blocked": channels.get("st11", {}).get("product_api_permission_blocked"),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
