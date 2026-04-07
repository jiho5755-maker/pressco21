#!/usr/bin/env python3
"""
메이크샵 품절 이슈 정밀 진단
- 재고 있는데 품절 표시
- 재고 없는데 판매 중
- 전체 품절인데 진열 중
- 부분 품절 (일부 옵션만)
- 미진열인데 재고 있음
"""

import json
import csv
import os
import time
import urllib.request
from collections import Counter

SHOP_URL = "http://foreverlove.co.kr/list/open_api.html"
SHOPKEY = "1fe4eece82d00e245aff322522fb3aec"
LICENSEKEY = "YWQ0ZTQwNWVhOGIzN2E3ZWVkZDdiMTIwOGZhNmQ3MDI="
OUTPUT_DIR = "/Users/jangjiho/workspace/pressco21/tools/stock_audit"
PAGE_SIZE = 100
RATE_DELAY = 0.8


def api_call(params):
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{SHOP_URL}?{query}"
    req = urllib.request.Request(url)
    req.add_header("Shopkey", SHOPKEY)
    req.add_header("Licensekey", LICENSEKEY)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [오류] {e}")
        return None


def fetch_all():
    all_products = []
    data = api_call({"mode": "search", "type": "product", "limit": PAGE_SIZE, "page": 1})
    if not data:
        return []
    total_pages = int(data.get("totalPage", 0))
    products = data.get("list", [])
    if isinstance(products, dict):
        products = list(products.values())
    all_products.extend(products)
    print(f"  페이지 1/{total_pages}")

    for page in range(2, total_pages + 1):
        time.sleep(RATE_DELAY)
        data = api_call({"mode": "search", "type": "product", "limit": PAGE_SIZE, "page": page})
        if not data:
            continue
        products = data.get("list", [])
        if isinstance(products, dict):
            products = list(products.values())
        all_products.extend(products)
        if page % 10 == 0 or page == total_pages:
            print(f"  페이지 {page}/{total_pages} → {len(all_products)}개")

    return all_products


def analyze_stock_issues(products):
    """품절 이슈 분석"""
    # 강사공간/개인결제 제외
    actual = []
    for p in products:
        cat = p.get("category_name", "")
        cate1 = cat.split(" < ")[0] if " < " in cat else cat
        name = p.get("product_name", "")
        if cate1 == "강사공간":
            continue
        if cate1 in ["개인결제창", "개인결제"] or "개인결제" in name:
            continue
        p["_cate1"] = cate1
        actual.append(p)

    issues = {
        "A_재고있는데품절": [],      # 재고>0 or 무제한인데 SOLDOUT/STOP
        "B_재고없는데판매중": [],    # 재고0이고 유한인데 SALE
        "C_전체품절_진열중": [],     # 모든조합 품절인데 display=Y
        "D_부분품절": [],            # 일부 조합만 품절
        "E_미진열_재고있음": [],     # display=N인데 판매 가능 재고 있음
    }

    for p in actual:
        uid = p.get("uid", "")
        name = p.get("product_name", "")
        display = p.get("display", "N")
        quantity = p.get("quantity", "Unlimited")
        cate1 = p.get("_cate1", "")
        sellprice = p.get("sellprice", "0")
        url = f"https://www.foreverlove.co.kr/shop/shopdetail.html?branduid={uid}"

        options = p.get("options", {})
        basic_stocks = options.get("basic") or []
        if isinstance(basic_stocks, dict):
            basic_stocks = [basic_stocks]

        # 각 옵션 조합별 분석
        sale_combos = []
        soldout_combos = []
        stock_but_soldout = []  # 재고 있는데 품절
        nosock_but_sale = []    # 재고 없는데 판매

        for s in basic_stocks:
            state = s.get("sto_state_code", "")
            unlimit = s.get("sto_unlimit", "N")
            real_stock = int(s.get("sto_real_stock", "0") or "0")
            opt_values = s.get("sto_opt_values", "(기본)")
            has_stock = unlimit == "Y" or real_stock > 0

            if state == "SALE":
                sale_combos.append(opt_values)
                if not has_stock:
                    nosock_but_sale.append({
                        "combo": opt_values,
                        "real_stock": real_stock,
                        "unlimit": unlimit,
                        "state": state,
                    })
            elif state in ["SOLDOUT", "STOP", "HIDDEN"]:
                soldout_combos.append(opt_values)
                if has_stock:
                    stock_but_soldout.append({
                        "combo": opt_values,
                        "real_stock": real_stock if unlimit != "Y" else "무제한",
                        "unlimit": unlimit,
                        "state": state,
                    })

        total = len(basic_stocks)
        base = {
            "uid": uid,
            "product_name": name,
            "category": cate1,
            "display": display,
            "sellprice": sellprice,
            "quantity": quantity,
            "total_combos": total,
            "sale_combos": len(sale_combos),
            "soldout_combos": len(soldout_combos),
            "url": url,
        }

        # A. 재고 있는데 품절
        if stock_but_soldout:
            row = {**base,
                   "issue_count": len(stock_but_soldout),
                   "issue_detail": "; ".join(
                       f"{d['combo']} (재고:{d['real_stock']}, 상태:{d['state']})"
                       for d in stock_but_soldout
                   )}
            issues["A_재고있는데품절"].append(row)

        # B. 재고 없는데 판매 중
        if nosock_but_sale:
            row = {**base,
                   "issue_count": len(nosock_but_sale),
                   "issue_detail": "; ".join(
                       f"{d['combo']} (재고:{d['real_stock']}, 무제한:{d['unlimit']})"
                       for d in nosock_but_sale
                   )}
            issues["B_재고없는데판매중"].append(row)

        # C. 전체 품절인데 진열 중
        if display == "Y" and total > 0 and len(soldout_combos) == total:
            row = {**base,
                   "issue_detail": "; ".join(soldout_combos[:5]) + ("..." if total > 5 else "")}
            issues["C_전체품절_진열중"].append(row)

        # D. 부분 품절
        if len(soldout_combos) > 0 and len(sale_combos) > 0:
            row = {**base,
                   "soldout_list": "; ".join(soldout_combos[:10]),
                   "soldout_pct": f"{len(soldout_combos)/total*100:.0f}%"}
            issues["D_부분품절"].append(row)

        # E. 미진열인데 재고 있음 (판매 가능 조합 존재)
        if display != "Y" and len(sale_combos) > 0:
            has_real_stock = any(
                (s.get("sto_unlimit") == "Y" or int(s.get("sto_real_stock", "0") or "0") > 0)
                and s.get("sto_state_code") == "SALE"
                for s in basic_stocks
            )
            if has_real_stock:
                row = {**base,
                       "issue_detail": f"판매가능 조합 {len(sale_combos)}개 있음"}
                issues["E_미진열_재고있음"].append(row)

    return actual, issues


def write_csv(filepath, rows):
    if not rows:
        return
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("품절 이슈 정밀 진단")
    print("=" * 60)

    print("\n[1/2] API 전체 수집...")
    raw = fetch_all()
    print(f"  → {len(raw)}개")

    print("\n[2/2] 품절 이슈 분석...")
    actual, issues = analyze_stock_issues(raw)

    print("\n" + "=" * 60)
    print("품절 이슈 진단 결과")
    print("=" * 60)
    print(f"분석 대상: {len(actual)}개 (강사공간/개인결제 제외)")

    # A. 재고 있는데 품절
    a = issues["A_재고있는데품절"]
    print(f"\n🔴 A. 재고 있는데 품절 표시: {len(a)}개")
    print("   (입고 되었는데 품절 해제 안 된 상품)")
    for r in a:
        print(f"   [{r['product_name'][:40]}] {r['issue_count']}개 조합")
        detail = r['issue_detail'][:100]
        print(f"     → {detail}")

    # B. 재고 없는데 판매 중
    b = issues["B_재고없는데판매중"]
    print(f"\n🟡 B. 재고 없는데 판매 중: {len(b)}개")
    print("   (주문 들어오면 출고 못하는 상품)")
    for r in b[:20]:
        print(f"   [{r['product_name'][:40]}] {r['issue_count']}개 조합")
        detail = r['issue_detail'][:100]
        print(f"     → {detail}")
    if len(b) > 20:
        print(f"   ... 외 {len(b)-20}개")

    # C. 전체 품절인데 진열 중
    c = issues["C_전체품절_진열중"]
    print(f"\n🟠 C. 전체 품절인데 진열 중: {len(c)}개")
    print("   (고객이 보는데 구매 불가)")
    for r in c:
        print(f"   [{r['product_name'][:40]}] {r['total_combos']}개 조합 전부 품절")

    # D. 부분 품절
    d = issues["D_부분품절"]
    print(f"\n🔵 D. 부분 품절 (일부 옵션만): {len(d)}개")
    for r in d:
        print(f"   [{r['product_name'][:40]}] {r['soldout_combos']}/{r['total_combos']} 품절 ({r['soldout_pct']})")

    # E. 미진열인데 재고 있음
    e = issues["E_미진열_재고있음"]
    print(f"\n⚪ E. 미진열인데 재고+판매가능: {len(e)}개")
    print("   (팔 수 있는데 숨겨진 상품)")
    for r in e[:20]:
        print(f"   [{r['product_name'][:40]}] {r['issue_detail']}")
    if len(e) > 20:
        print(f"   ... 외 {len(e)-20}개")

    # CSV 저장
    for key, rows in issues.items():
        write_csv(f"{OUTPUT_DIR}/{key}.csv", rows)

    # 교차 분석: A와 C 겹치는 것 (입고됐는데 품절+진열 = 가장 시급)
    a_uids = {r["uid"] for r in a}
    c_uids = {r["uid"] for r in c}
    ac_overlap = a_uids & c_uids
    if ac_overlap:
        print(f"\n🚨 가장 시급: 재고 있 + 전체품절 + 진열 중 = {len(ac_overlap)}개")
        for r in a:
            if r["uid"] in ac_overlap:
                print(f"   [{r['product_name'][:40]}] → 바로 품절 해제 필요!")

    total_issues = len(a) + len(b) + len(c) + len(d) + len(e)
    unique_uids = set()
    for rows in issues.values():
        for r in rows:
            unique_uids.add(r["uid"])
    print(f"\n━━━ 요약 ━━━")
    print(f"이슈 있는 상품: {len(unique_uids)}개 / {len(actual)}개")
    print(f"CSV 저장: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
