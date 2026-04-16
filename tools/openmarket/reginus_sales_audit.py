#!/usr/bin/env python3
"""
레지너스(RESINERS) 상품 매출 분석 도구.

목적: 5채널(메이크샵/CRM/11번가/쿠팡/스마트스토어)에서 "레지너스" 키워드 6개 상품의
2025-08-01 ~ 2026-04-14 매출을 추출.

Step 1: 메이크샵 상품 검색 → 6개 product_no 확정
Step 2~5: 채널별 매출 추출 (별도 함수)
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


SECRETS_PATH = Path("/Users/jangjiho/workspace/pressco21/.secrets.env")


def load_secrets() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in SECRETS_PATH.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def makeshop_call(secrets: dict[str, str], params: dict[str, str]) -> dict:
    domain = secrets.get("MAKESHOP_DOMAIN", "foreverlove.co.kr")
    url = f"http://{domain}/list/open_api.html"
    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{query}")
    req.add_header("Shopkey", secrets["MAKESHOP_SHOPKEY"])
    req.add_header("Licensekey", secrets["MAKESHOP_LICENSEKEY"])
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def step1_makeshop_search_reginus(secrets: dict[str, str]) -> list[dict]:
    """메이크샵에서 '레지너스' 또는 'RESINERS' 키워드 상품 검색."""
    keywords = ["레지너스", "RESINERS", "Resiners", "리지너스"]
    matches_by_uid: dict[str, dict] = {}

    # 시도 1: keyword 파라미터로 빠른 검색
    print("=" * 60)
    print("Step 1: 메이크샵에서 레지너스 상품 검색")
    print("=" * 60)
    for kw in keywords:
        try:
            data = makeshop_call(secrets, {
                "mode": "search",
                "type": "product",
                "limit": "100",
                "page": "1",
                "keyword": kw,
            })
            if data.get("return_code") == "0000":
                items = data.get("list") or []
                if isinstance(items, dict):
                    items = list(items.values())
                total = data.get("totalCount", "0")
                print(f"  keyword='{kw}' totalCount={total}, page1={len(items)}개")
                for p in items:
                    uid = str(p.get("product_no") or p.get("uid") or "")
                    if uid and uid not in matches_by_uid:
                        matches_by_uid[uid] = p
        except Exception as e:
            print(f"  keyword='{kw}' 실패: {e}")
        time.sleep(0.8)

    # keyword 검색이 결과 없으면 전수 검색 폴백
    if not matches_by_uid:
        print("\n  → keyword 검색 실패, 전수 검색 폴백 시작...")
        page = 1
        all_products = []
        while True:
            try:
                data = makeshop_call(secrets, {
                    "mode": "search",
                    "type": "product",
                    "limit": "100",
                    "page": str(page),
                })
                if data.get("return_code") != "0000":
                    print(f"  page {page} 실패: {data.get('return_message')}")
                    break
                items = data.get("list") or []
                if isinstance(items, dict):
                    items = list(items.values())
                if not items:
                    break
                all_products.extend(items)
                total_page = int(data.get("totalPage", 0) or 0)
                if page % 5 == 0 or page == total_page:
                    print(f"  page {page}/{total_page} → 누적 {len(all_products)}개")
                if total_page and page >= total_page:
                    break
                page += 1
                time.sleep(0.8)
            except Exception as e:
                print(f"  page {page} 예외: {e}")
                break

        # 클라이언트 필터링
        for p in all_products:
            name = (p.get("product_name") or "").upper()
            if "레지너스" in name or "RESINERS" in name or "RESINERS" in name or "리지너스" in name:
                uid = str(p.get("product_no") or p.get("uid") or "")
                if uid and uid not in matches_by_uid:
                    matches_by_uid[uid] = p

    # 결과 출력
    matches = list(matches_by_uid.values())
    print(f"\n[결과] 매칭된 상품: {len(matches)}개")
    print("-" * 60)
    for p in matches:
        uid = p.get("product_no") or p.get("uid") or ""
        name = p.get("product_name") or ""
        price = p.get("sellprice") or "0"
        display = p.get("display") or "?"
        print(f"  uid={uid}  display={display}  price={price}원")
        print(f"    name: {name}")
    return matches


def get_naver_token(client_id: str, client_secret: str) -> str:
    """네이버 커머스 API 토큰 발급 (bcrypt 서명)."""
    import base64
    import bcrypt
    import requests

    timestamp = str(int(time.time() * 1000))
    password = f"{client_id}_{timestamp}".encode()
    hashed = bcrypt.hashpw(password, client_secret.encode())
    signature = base64.b64encode(hashed).decode()

    resp = requests.post(
        "https://api.commerce.naver.com/external/v1/oauth2/token",
        data={
            "client_id": client_id,
            "timestamp": timestamp,
            "client_secret_sign": signature,
            "grant_type": "client_credentials",
            "type": "SELF",
        },
        timeout=30,
    )
    body = resp.json()
    if "access_token" not in body:
        raise RuntimeError(f"네이버 토큰 발급 실패: {body}")
    return body["access_token"]


def step4_naver_sales(secrets: dict[str, str]) -> list[dict]:
    """네이버스마트스토어 발주확인내역 → 레지너스 키워드 필터.

    네이버 last-changed-statuses API: 한 호출당 24시간 한도.
    pay-order 검색은 제약이 있어 last-changed로 하면 정확.
    여기선 product-orders 일별 호출 (8.5개월 = 257일).
    """
    import requests
    from datetime import datetime, timedelta

    print("\n" + "=" * 60)
    print("Step 4: 네이버스마트스토어 매출 추출")
    print("=" * 60)

    cid = secrets.get("NAVER_COMMERCE_CLIENT_ID", "")
    csec = secrets.get("NAVER_COMMERCE_CLIENT_SECRET", "")
    if not cid or not csec:
        print("  NAVER_COMMERCE_CLIENT_ID/SECRET 미설정 → 스킵")
        return []

    print("  토큰 발급...")
    try:
        token = get_naver_token(cid, csec)
        print(f"  토큰 OK ({token[:20]}...)")
    except Exception as e:
        print(f"  토큰 발급 실패: {e}")
        return []

    sales = []
    sample_dumped = False
    cancel_statuses = {"CANCELED", "RETURNED", "EXCHANGED", "CANCEL_REQUEST", "RETURN_REQUEST", "CANCEL_DONE"}

    # 일별 호출 (안전)
    start = datetime(2025, 8, 1)
    end = datetime(2026, 4, 14)
    cur = start
    day_idx = 0
    fail_count = 0

    while cur <= end:
        day_idx += 1
        from_ts = cur.strftime("%Y-%m-%dT00:00:00.000+09:00")
        to_ts = cur.strftime("%Y-%m-%dT23:59:59.999+09:00")

        try:
            url = "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders"
            params = {"from": from_ts, "to": to_ts}
            resp = requests.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if resp.status_code != 200:
                if resp.status_code == 401:
                    print(f"  토큰 만료, 재발급...")
                    token = get_naver_token(cid, csec)
                    continue
                fail_count += 1
                if fail_count <= 3:
                    print(f"  {cur.date()} HTTP {resp.status_code}: {resp.text[:200]}")
                cur += timedelta(days=1)
                time.sleep(0.3)
                continue

            data = resp.json()
            contents = (data.get("data", {}) or {}).get("contents", []) or []

            if contents and not sample_dumped:
                print(f"\n  [샘플] 첫 contents[0]:")
                print(json.dumps(contents[0], ensure_ascii=False, indent=2)[:2000])
                sample_dumped = True

            day_match = 0
            for item in contents:
                content = item.get("content", {}) or {}
                po = content.get("productOrder", {}) or {}
                if not po:
                    continue
                status = po.get("productOrderStatus", "")
                product_name = po.get("productName", "")
                if not product_name:
                    continue
                pn_upper = product_name.upper()
                if "레지너스" in product_name or "RESINERS" in pn_upper:
                    is_cancel = status in cancel_statuses
                    sales.append({
                        "channel": "naver",
                        "date": str(cur.date()),
                        "ordernum": po.get("productOrderId", ""),
                        "product_name": product_name,
                        "qty": int(po.get("quantity") or 0),
                        "amount": int(po.get("totalPaymentAmount") or 0),
                        "status": status,
                        "cancelled": is_cancel,
                    })
                    if not is_cancel:
                        day_match += 1

            if day_idx % 30 == 0 or day_match > 0:
                print(f"  day {day_idx} {cur.date()}: contents={len(contents)} 매칭+{day_match}", flush=True)
        except Exception as e:
            fail_count += 1
            if fail_count <= 3:
                print(f"  {cur.date()} 예외: {e}")

        cur += timedelta(days=1)
        time.sleep(0.25)

    # 집계
    print("\n" + "-" * 60)
    print(f"[네이버 매출 결과] 총 매칭 라인: {len(sales)}")
    print("-" * 60)
    by_name: dict[str, dict] = {}
    for s in sales:
        if s.get("cancelled"):
            continue
        key = s["product_name"]
        agg = by_name.setdefault(key, {"qty": 0, "amount": 0, "lines": 0})
        agg["qty"] += s["qty"]
        agg["amount"] += s["amount"]
        agg["lines"] += 1

    grand_total = 0
    grand_qty = 0
    for name, agg in sorted(by_name.items(), key=lambda x: -x[1]["amount"]):
        print(f"  {name[:42]:42}  {agg['lines']:>4}건  {agg['qty']:>4}개  {agg['amount']:>14,}원")
        grand_total += agg["amount"]
        grand_qty += agg["qty"]
    print("-" * 60)
    cancelled_count = sum(1 for s in sales if s.get("cancelled"))
    print(f"  {'네이버 합계':42}  {len([s for s in sales if not s.get('cancelled')]):>4}건  {grand_qty:>4}개  {grand_total:>14,}원")
    if cancelled_count:
        print(f"  (취소 라인 {cancelled_count}건 별도 제외됨)")
    return sales


def st11_call(secrets: dict[str, str], start: str, end: str) -> str:
    """11번가 발주확인내역 호출 (최대 7일)."""
    url = f"https://api.11st.co.kr/rest/ordservices/complete/{start}/{end}"
    req = urllib.request.Request(url)
    req.add_header("openapikey", secrets["ST11_API_KEY"])
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("euc-kr", errors="replace")


def step3_st11_sales(secrets: dict[str, str]) -> list[dict]:
    """11번가 발주확인내역(기간별 결제완료) → 레지너스 키워드 필터."""
    import re
    from datetime import datetime, timedelta

    print("\n" + "=" * 60)
    print("Step 3: 11번가 매출 추출 (발주확인내역, 7일 청크)")
    print("=" * 60)

    sales = []
    start = datetime(2025, 8, 1)
    end = datetime(2026, 4, 14)

    chunk_start = start
    chunk_idx = 0
    sample_dumped = False
    total_calls = 0

    while chunk_start < end:
        chunk_idx += 1
        chunk_end = min(chunk_start + timedelta(days=6), end)
        s = chunk_start.strftime("%Y%m%d") + "0000"
        e = chunk_end.strftime("%Y%m%d") + "2359"

        try:
            xml = st11_call(secrets, s, e)
            total_calls += 1
        except Exception as ex:
            print(f"  [{chunk_idx}] {s[:8]}~{e[:8]} 예외: {ex}")
            chunk_start = chunk_end + timedelta(days=1)
            continue

        # 에러 체크
        code_m = re.search(r"<(?:ns2:)?result_code>([^<]*)</(?:ns2:)?result_code>", xml)
        text_m = re.search(r"<(?:ns2:)?result_text>([^<]*)</(?:ns2:)?result_text>", xml)
        if code_m and code_m.group(1) not in ("0",):
            print(f"  [{chunk_idx}] {s[:8]}~{e[:8]} 에러: {code_m.group(1)} {text_m.group(1) if text_m else ''}")
            chunk_start = chunk_end + timedelta(days=1)
            continue

        orders = re.findall(r"<(?:ns2:)?order>[\s\S]*?</(?:ns2:)?order>", xml)

        # 첫 hit 시 응답 dump
        if orders and not sample_dumped:
            print(f"\n  [샘플] 첫 주문 dump:")
            print(orders[0][:1500])
            print()
            sample_dumped = True

        chunk_match = 0
        for chunk in orders:
            def g(field):
                m = re.search(rf"<(?:ns2:)?{field}>([^<]*)</(?:ns2:)?{field}>", chunk)
                return m.group(1) if m else ""

            prd_nm = g("prdNm") or g("prdName") or g("productName")
            prd_no = g("prdNo") or g("productNo")
            pay_amt = g("ordPayAmt") or g("ordPrdAmt")
            ord_dt = g("ordDt") or g("orderDate") or g("ordOrgDt")
            ord_no = g("ordNo") or g("orderNo")
            qty = g("ordQty") or g("orderQty")

            if not prd_nm:
                continue
            name_upper = prd_nm.upper()
            if "레지너스" in prd_nm or "RESINERS" in name_upper:
                sales.append({
                    "channel": "11st",
                    "date": ord_dt[:10] if ord_dt else "",
                    "ordernum": ord_no,
                    "prd_no": prd_no,
                    "product_name": prd_nm,
                    "qty": int(qty or 0),
                    "amount": int(pay_amt or 0),
                })
                chunk_match += 1

        if orders or chunk_idx % 5 == 0:
            print(f"  [{chunk_idx}] {s[:8]}~{e[:8]} orders={len(orders)} 매칭={chunk_match}", flush=True)

        chunk_start = chunk_end + timedelta(days=1)
        time.sleep(0.5)

    # 집계
    print("\n" + "-" * 60)
    print(f"[11번가 매출 결과] 총 호출 {total_calls}, 매칭 라인 {len(sales)}")
    print("-" * 60)
    by_name: dict[str, dict] = {}
    for s in sales:
        key = s["product_name"]
        agg = by_name.setdefault(key, {"qty": 0, "amount": 0, "lines": 0})
        agg["qty"] += s["qty"]
        agg["amount"] += s["amount"]
        agg["lines"] += 1

    grand_total = 0
    grand_qty = 0
    for name, agg in sorted(by_name.items(), key=lambda x: -x[1]["amount"]):
        print(f"  {name[:42]:42}  {agg['lines']:>4}건  {agg['qty']:>4}개  {agg['amount']:>14,}원")
        grand_total += agg["amount"]
        grand_qty += agg["qty"]
    print("-" * 60)
    print(f"  {'11번가 합계':42}  {len(sales):>4}건  {grand_qty:>4}개  {grand_total:>14,}원")
    return sales


def step2_makeshop_sales(secrets: dict[str, str]) -> list[dict]:
    """메이크샵 status_cd=5(배송완료) + 30일 청크로 레지너스 매출 추출."""
    from datetime import datetime, timedelta

    print("\n" + "=" * 60)
    print("Step 2: 메이크샵 매출 추출 (status_cd=5, 30일 청크)")
    print("=" * 60)

    sales = []
    start = datetime(2025, 8, 1)
    end = datetime(2026, 4, 14)

    chunk_start = start
    chunk_idx = 0
    total_calls = 0

    while chunk_start < end:
        chunk_idx += 1
        chunk_end = min(chunk_start + timedelta(days=29), end)
        sf = chunk_start.strftime("%Y-%m-%d 00:00:00")
        ef = chunk_end.strftime("%Y-%m-%d 23:59:59")
        print(f"\n[청크 {chunk_idx}] {sf[:10]} ~ {ef[:10]}", flush=True)

        page = 1
        chunk_orders = 0
        chunk_matches = 0
        while True:
            try:
                data = makeshop_call(secrets, {
                    "mode": "search",
                    "type": "order",
                    "status_cd": "5",
                    "InquiryTimeFrom": sf,
                    "InquiryTimeTo": ef,
                    "limit": "500",
                    "page": str(page),
                })
                total_calls += 1
            except Exception as e:
                print(f"  page {page} 예외: {e}")
                break

            if data.get("return_code") != "0000":
                if data.get("return_code") not in ("0000", None):
                    print(f"  page {page}: code={data.get('return_code')} msg={data.get('return_message')}")
                break

            entries = data.get("list") or []
            if isinstance(entries, dict):
                entries = list(entries.values())
            if not entries:
                break

            for entry in entries:
                order_info = entry.get("order") or {}
                if not isinstance(order_info, dict):
                    continue
                order_status = order_info.get("order_status", "")
                if order_status != "Y":
                    continue
                order_date = (order_info.get("order_date") or "")[:10]
                products = entry.get("product") or {}
                if isinstance(products, dict):
                    products = list(products.values())
                chunk_orders += 1
                for p in products:
                    if not isinstance(p, dict):
                        continue
                    name = p.get("product_name") or ""
                    if "레지너스" in name or "RESINERS" in name.upper():
                        qty = int(p.get("basket_stock") or 0)
                        price = int(p.get("product_price") or p.get("sell_price") or 0)
                        sales.append({
                            "channel": "makeshop",
                            "date": order_date,
                            "ordernum": order_info.get("ordernum", ""),
                            "product_name": name,
                            "product_uid": p.get("product_uid", ""),
                            "qty": qty,
                            "price": price,
                            "amount": qty * price,
                        })
                        chunk_matches += 1

            total_page = int(data.get("totalPage", 0) or 0)
            count_in_page = len(entries)
            if page == 1 or page % 3 == 0 or page == total_page:
                print(f"  page {page}/{total_page} entries={count_in_page} (청크 누적 주문={chunk_orders}, 매칭={chunk_matches})", flush=True)
            if total_page and page >= total_page:
                break
            page += 1
            time.sleep(0.8)

        chunk_start = chunk_end + timedelta(days=1)

    # 집계
    print("\n" + "-" * 60)
    print(f"[메이크샵 매출 결과] 총 매칭 라인: {len(sales)}, 총 호출: {total_calls}")
    print("-" * 60)
    by_name: dict[str, dict] = {}
    for s in sales:
        key = s["product_name"]
        agg = by_name.setdefault(key, {"qty": 0, "amount": 0, "lines": 0})
        agg["qty"] += s["qty"]
        agg["amount"] += s["amount"]
        agg["lines"] += 1

    grand_total = 0
    grand_qty = 0
    for name, agg in sorted(by_name.items(), key=lambda x: -x[1]["amount"]):
        print(f"  {name[:42]:42}  {agg['lines']:>4}건  {agg['qty']:>4}개  {agg['amount']:>14,}원")
        grand_total += agg["amount"]
        grand_qty += agg["qty"]
    print("-" * 60)
    print(f"  {'메이크샵 합계':42}  {len(sales):>4}건  {grand_qty:>4}개  {grand_total:>14,}원")

    return sales


def main():
    secrets = load_secrets()

    # Step 1: 상품 검색 (이미 완료, 캐시 활용)
    cache_path = Path("/Users/jangjiho/workspace/pressco21/tools/openmarket/reginus_products.json")
    if cache_path.exists():
        cached = json.loads(cache_path.read_text())
        matches = cached.get("matches", [])
        reginus_only = [p for p in matches if "레지너스" in (p.get("product_name") or "")]
        print(f"[캐시] 메이크샵 레지너스 상품 {len(reginus_only)}개 (캐시 사용)")
    else:
        matches = step1_makeshop_search_reginus(secrets)
        cache_path.write_text(json.dumps({"matches": matches}, ensure_ascii=False, indent=2))

    out_path = Path("/Users/jangjiho/workspace/pressco21/tools/openmarket/reginus_sales_results.json")
    existing = json.loads(out_path.read_text()) if out_path.exists() else {}

    # Step 2: 메이크샵 매출 추출 (캐시 있으면 스킵)
    if "makeshop" not in existing or not existing["makeshop"]:
        makeshop_sales = step2_makeshop_sales(secrets)
        existing["makeshop"] = makeshop_sales
    else:
        print(f"[캐시] 메이크샵 매출 {len(existing['makeshop'])}건 (캐시 사용)")

    # Step 3: 11번가 매출 추출 (캐시 가능)
    if "st11" not in existing:
        st11_sales = step3_st11_sales(secrets)
        existing["st11"] = st11_sales
    else:
        print(f"[캐시] 11번가 매출 {len(existing['st11'])}건 (캐시 사용)")

    # Step 4: 네이버 매출 추출
    if "naver" not in existing:
        naver_sales = step4_naver_sales(secrets)
        existing["naver"] = naver_sales
    else:
        print(f"[캐시] 네이버 매출 {len(existing['naver'])}건 (캐시 사용)")

    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
    print(f"\n저장: {out_path}")


if __name__ == "__main__":
    main()
