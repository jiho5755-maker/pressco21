#!/usr/bin/env python3
"""꽃레진 소용량(10g/기존 9g) 추가상품 노출을 정리하는 운영 도구.

- 50g은 신상품이므로 절대 대상에서 제외한다.
- MakeShop은 개별 ADDITION 옵션 삭제 전용 Open API가 없어 대상 추가옵션 stock row를 0으로 만든다.
- SmartStore는 supplementProducts의 대상 항목을 usable=false, stockQuantity=0으로 갱신한다.
- 기본은 dry-run이며 --execute일 때만 write API를 호출한다.
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


def is_forbidden_50g(text):
    value = norm(text)
    return "50g" in value or "50ｇ" in value


def is_flower_resin_small(text):
    raw = str(text or "")
    value = norm(raw)
    if is_forbidden_50g(value):
        return False
    # 원문 기준 꽃레진만 잡는다. '누름꽃 레진' 같은 문장 결합 오탐 방지.
    if "꽃레진" not in raw:
        return False
    # 10g 정식명과 기존 추가상품명 9g를 같은 소용량 꽃레진으로 취급한다.
    return any(token in value for token in ["10g", "10ｇ", "9g", "9ｇ", "꽃레진"])


def normalize_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []


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
            meta = {"status_code": response.status_code, "return_code": data.get("return_code"), "totalCount": data.get("totalCount"), "totalPage": data.get("totalPage")}
        items = data.get("list") or []
        if isinstance(items, dict):
            items = list(items.values())
        products.extend([item for item in items if isinstance(item, dict)])
        total_pages = int(data.get("totalPage") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.75)
    return base, headers, meta, products


def read_makeshop_product(base, headers, uid):
    response = requests.get(
        base + "/list/open_api.html",
        headers=headers,
        params={"mode": "search", "type": "product", "uid": uid, "fields": "uid,product_name,category_name,options"},
        timeout=30,
    )
    data = response.json()
    items = data.get("list") or []
    if isinstance(items, dict):
        items = list(items.values())
    return items[0] if items else None


def find_makeshop_addition_targets(products):
    targets = []
    for product in products:
        options = product.get("options") if isinstance(product.get("options"), dict) else {}
        option_defs = normalize_list(options.get("option"))
        addition_stocks = normalize_list(options.get("addition"))
        target_option_ids = set()
        target_values = set()
        target_option_defs = []
        for opt in option_defs:
            if opt.get("opt_type") != "ADDITION":
                continue
            text = " ".join(str(opt.get(key, "")) for key in ["opt_name", "opt_value"])
            if not is_flower_resin_small(text):
                continue
            target_option_defs.append(opt)
            if opt.get("opt_id"):
                target_option_ids.add(str(opt.get("opt_id")))
            for value in str(opt.get("opt_value", "")).split(","):
                if is_flower_resin_small(value) or is_flower_resin_small(opt.get("opt_name")):
                    target_values.add(value.strip())
        if not target_option_defs:
            continue
        matched_stocks = []
        for stock in addition_stocks:
            stock_text = " ".join(str(stock.get(key, "")) for key in ["opt_ids", "sto_opt_values", "sto_option_code"])
            if str(stock.get("opt_ids")) in target_option_ids:
                if target_values:
                    if str(stock.get("sto_opt_values", "")).strip() in target_values or len(target_values) == len(addition_stocks):
                        matched_stocks.append(stock)
                else:
                    matched_stocks.append(stock)
            elif is_flower_resin_small(stock_text):
                matched_stocks.append(stock)
        # opt_name 자체가 꽃레진인 경우 해당 addition option의 모든 value가 대상이다.
        for opt in target_option_defs:
            if is_flower_resin_small(opt.get("opt_name")) and str(opt.get("opt_id")) in target_option_ids:
                for stock in addition_stocks:
                    if str(stock.get("opt_ids")) == str(opt.get("opt_id")) and stock not in matched_stocks:
                        matched_stocks.append(stock)
        targets.append(
            {
                "uid": product.get("uid"),
                "product_name": product.get("product_name"),
                "category_name": product.get("category_name"),
                "target_options": target_option_defs,
                "target_stocks": matched_stocks,
            }
        )
    return targets


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
            payload[f"datas[{idx}][stock]"] = "0"
            payload[f"datas[{idx}][stop_use]"] = "Y"
            idx += 1
    if not payload:
        return {"ok": True, "message": "no_makeshop_addition_stock_rows"}
    if not EXECUTE:
        return {"ok": True, "dry_run": True, "endpoint": endpoint, "items": idx}
    response = requests.post(endpoint, headers=headers, data=payload, timeout=30)
    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text[:1000]}
    return {"ok": response.ok, "status_code": response.status_code, "items": idx, "body": body}


def summarize_makeshop_targets(targets):
    return [
        {
            "uid": t.get("uid"),
            "product_name": t.get("product_name"),
            "category_name": t.get("category_name"),
            "target_options": [
                {"opt_id": o.get("opt_id"), "opt_name": o.get("opt_name"), "opt_value": o.get("opt_value"), "opt_use": o.get("opt_use")}
                for o in t.get("target_options", [])
            ],
            "target_stocks": [
                {"sto_id": s.get("sto_id"), "value": s.get("sto_opt_values"), "real_stock": s.get("sto_real_stock"), "state": s.get("sto_state_code")}
                for s in t.get("target_stocks", [])
            ],
        }
        for t in targets
    ]


def naver_token(env):
    client_id = env.get("NAVER_COMMERCE_CLIENT_ID", "")
    client_secret = env.get("NAVER_COMMERCE_CLIENT_SECRET", "")
    base_url = env.get("NAVER_COMMERCE_API_BASE", "https://api.commerce.naver.com/external").rstrip("/")
    ts = str(int(time.time() * 1000))
    sig = base64.b64encode(bcrypt.hashpw(f"{client_id}_{ts}".encode(), client_secret.encode())).decode()
    form = urllib.parse.urlencode({"client_id": client_id, "timestamp": ts, "client_secret_sign": sig, "grant_type": "client_credentials", "type": "SELF"})
    response = requests.post(base_url + "/v1/oauth2/token", headers={"Content-Type": "application/x-www-form-urlencoded"}, data=form, timeout=20)
    data = response.json()
    if not data.get("access_token"):
        raise RuntimeError(f"naver_token_failed:{response.status_code}:{data}")
    return base_url, data["access_token"]


def naver_headers(token):
    return {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}


def list_naver_origin_numbers(base_url, headers):
    origin_numbers = []
    page = 1
    meta = {}
    while True:
        response = requests.post(base_url + "/v1/products/search", headers=headers, json={"page": page, "size": 500, "orderType": "NO"}, timeout=30)
        data = response.json()
        if page == 1:
            meta = {"status_code": response.status_code, "totalElements": data.get("totalElements"), "totalPages": data.get("totalPages")}
        for item in data.get("contents") or []:
            if item.get("originProductNo"):
                origin_numbers.append(item["originProductNo"])
        total_pages = int(data.get("totalPages") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.15)
    return meta, origin_numbers


def read_naver_origin(base_url, headers, origin_no):
    response = requests.get(base_url + f"/v2/products/origin-products/{origin_no}", headers=headers, timeout=30)
    return response.status_code, response.json()


def get_supplement_info(payload):
    origin = payload.get("originProduct") or {}
    detail = origin.get("detailAttribute") or {}
    return detail.get("supplementProductInfo") if isinstance(detail.get("supplementProductInfo"), dict) else None


def find_naver_supplement_targets(base_url, headers):
    meta, origin_numbers = list_naver_origin_numbers(base_url, headers)
    targets = []
    errors = []
    for origin_no in origin_numbers:
        try:
            status, payload = read_naver_origin(base_url, headers, origin_no)
            if status != 200:
                errors.append({"originProductNo": origin_no, "status_code": status, "body": payload})
                continue
            origin = payload.get("originProduct") or {}
            supp = get_supplement_info(payload)
            if not supp:
                continue
            products = supp.get("supplementProducts") or []
            matches = []
            for item in products:
                if is_flower_resin_small(json.dumps(item, ensure_ascii=False)):
                    matches.append(item)
            if matches:
                targets.append({"originProductNo": origin_no, "productName": origin.get("name"), "statusType": origin.get("statusType"), "payload": payload, "matches": matches, "allSupplementCount": len(products)})
        except Exception as exc:
            errors.append({"originProductNo": origin_no, "error": str(exc)})
        time.sleep(0.08)
    return meta, targets, errors


def summarize_naver_targets(targets):
    return [
        {
            "originProductNo": t.get("originProductNo"),
            "productName": t.get("productName"),
            "statusType": t.get("statusType"),
            "allSupplementCount": t.get("allSupplementCount"),
            "matches": [
                {"id": m.get("id"), "groupName": m.get("groupName"), "name": m.get("name"), "price": m.get("price"), "stockQuantity": m.get("stockQuantity"), "usable": m.get("usable")}
                for m in t.get("matches", [])
            ],
        }
        for t in targets
    ]


def update_naver_supplements(base_url, headers, targets):
    results = []
    for target in targets:
        payload = json.loads(json.dumps(target["payload"], ensure_ascii=False))
        supp = get_supplement_info(payload)
        changed = 0
        for item in supp.get("supplementProducts") or []:
            if is_flower_resin_small(json.dumps(item, ensure_ascii=False)):
                item["usable"] = False
                item["stockQuantity"] = 0
                changed += 1
        origin_no = target["originProductNo"]
        if not EXECUTE:
            results.append({"originProductNo": origin_no, "dry_run": True, "changed": changed})
            continue
        response = requests.put(base_url + f"/v2/products/origin-products/{origin_no}", headers=headers, json=payload, timeout=60)
        body = None
        if response.text:
            try:
                body = response.json()
            except Exception:
                body = response.text[:1000]
        results.append({"originProductNo": origin_no, "status_code": response.status_code, "ok": response.status_code in (200, 204), "changed": changed, "body": body})
        time.sleep(0.3)
    return results


def main():
    env = load_env(REMOTE_ENV)
    report = {"operation": "flower_resin_addon_cleanup", "execute": EXECUTE, "started_at": now_iso(), "note": "50g excluded", "channels": {}}

    ms_base, ms_headers, ms_meta, ms_products = load_makeshop_products(env)
    ms_targets = find_makeshop_addition_targets(ms_products)
    ms_before = summarize_makeshop_targets(ms_targets)
    ms_update = update_makeshop_addition_stock(ms_base, ms_headers, ms_targets)
    ms_after_targets = []
    for target in ms_targets:
        detail = read_makeshop_product(ms_base, ms_headers, target["uid"])
        ms_after_targets.extend(find_makeshop_addition_targets([detail] if detail else []))
    report["channels"]["makeshop"] = {"scan_meta": ms_meta, "matched_products": len(ms_targets), "before": ms_before, "update": ms_update, "after": summarize_makeshop_targets(ms_after_targets)}

    nv_base, nv_tok = naver_token(env)
    nv_h = naver_headers(nv_tok)
    nv_meta, nv_targets, nv_errors = find_naver_supplement_targets(nv_base, nv_h)
    nv_before = summarize_naver_targets(nv_targets)
    nv_update = update_naver_supplements(nv_base, nv_h, nv_targets)
    nv_after = []
    for target in nv_targets:
        status, payload = read_naver_origin(nv_base, nv_h, target["originProductNo"])
        supp = get_supplement_info(payload) if status == 200 else None
        matches = []
        if supp:
            for item in supp.get("supplementProducts") or []:
                if is_flower_resin_small(json.dumps(item, ensure_ascii=False)):
                    matches.append(item)
        nv_after.append({"originProductNo": target["originProductNo"], "status_code": status, "matches": matches})
    report["channels"]["smartstore"] = {"scan_meta": nv_meta, "matched_products": len(nv_targets), "before": nv_before, "update": nv_update, "after": nv_after, "errors": nv_errors[:20], "error_count": len(nv_errors)}
    report["finished_at"] = now_iso()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
'''


def build_remote_script(execute: bool) -> str:
    return REMOTE_SCRIPT.replace("__REMOTE_ENV__", REMOTE_ENV).replace("__EXECUTE__", "True" if execute else "False")


def run_remote(script: str) -> dict:
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-i", SSH_KEY, REMOTE_HOST, "python3 -"]
    proc = subprocess.run(cmd, input=script, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise SystemExit(proc.stderr.strip() or proc.stdout.strip() or "remote command failed")
    return json.loads(proc.stdout)


def main() -> int:
    parser = argparse.ArgumentParser(description="꽃레진 추가상품 정리")
    parser.add_argument("--execute", action="store_true", help="실제 write API 호출")
    parser.add_argument("--output", required=True, help="결과 JSON 저장 경로")
    args = parser.parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = run_remote(build_remote_script(args.execute))
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "execute": args.execute,
        "output": str(output_path),
        "makeshop_matched_products": payload.get("channels", {}).get("makeshop", {}).get("matched_products"),
        "smartstore_matched_products": payload.get("channels", {}).get("smartstore", {}).get("matched_products"),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
