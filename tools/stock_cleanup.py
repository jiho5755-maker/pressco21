#!/usr/bin/env python3
"""
품절 정리용 리스트 생성
- 재고 숫자 무시 (수기 관리 체계)
- 판매상태(SALE/SOLDOUT)만 기준
- 대표가 훑으면서 처리할 수 있게 액션별 분류
"""

import json
import csv
import os
import time
import urllib.request

SHOP_URL = "http://foreverlove.co.kr/list/open_api.html"
SHOPKEY = "1fe4eece82d00e245aff322522fb3aec"
LICENSEKEY = "YWQ0ZTQwNWVhOGIzN2E3ZWVkZDdiMTIwOGZhNmQ3MDI="
OUTPUT_DIR = "/Users/jangjiho/workspace/pressco21/tools/stock_cleanup"
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
            print(f"  {page}/{total_pages}")

    return all_products


def analyze(products):
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

    # ===== 3가지 액션 리스트 =====

    # 1. 진열 중 + 전체 품절 → "미진열로 내릴지, 입고해서 품절 해제할지"
    action1_전체품절_진열중 = []

    # 2. 부분 품절 → "이 옵션 입고됐으면 품절 해제"
    action2_부분품절 = []

    # 3. 미진열 + 판매가능 → "진열할지 말지"
    action3_미진열_판매가능 = []

    for p in actual:
        uid = p.get("uid", "")
        name = p.get("product_name", "")
        display = p.get("display", "N")
        cate1 = p.get("_cate1", "")
        sellprice = p.get("sellprice", "0")
        url = f"https://www.foreverlove.co.kr/shop/shopdetail.html?branduid={uid}"

        options = p.get("options", {})
        basic_stocks = options.get("basic") or []
        if isinstance(basic_stocks, dict):
            basic_stocks = [basic_stocks]
        option_list = options.get("option") or []
        if isinstance(option_list, dict):
            option_list = [option_list]

        # 옵션 조합별 상태
        sale = []
        soldout = []
        for s in basic_stocks:
            state = s.get("sto_state_code", "")
            combo = s.get("sto_opt_values", "(기본)")
            if state == "SALE":
                sale.append(combo)
            elif state in ["SOLDOUT", "STOP", "HIDDEN"]:
                soldout.append({"combo": combo, "state": state})

        total = len(basic_stocks)

        # SELECT 옵션 이름
        select_names = [o.get("opt_name", "") for o in option_list
                        if o.get("opt_type") == "SELECT" and o.get("opt_use") == "Y"]
        addition_names = [o.get("opt_name", "") for o in option_list
                          if o.get("opt_type") == "ADDITION" and o.get("opt_use") == "Y"]

        base = {
            "상품명": name,
            "카테고리": cate1,
            "판매가": sellprice,
            "옵션구조": " × ".join(select_names) if select_names else "(단품)",
            "추가상품": " / ".join(addition_names) if addition_names else "",
            "총조합수": total,
            "링크": url,
        }

        # 1. 진열 중 + 전체 품절
        if display == "Y" and total > 0 and len(soldout) == total and len(sale) == 0:
            action1_전체품절_진열중.append({
                **base,
                "품절조합": "; ".join(s["combo"] for s in soldout[:5]) + ("..." if total > 5 else ""),
                "판단": "→ 입고 예정이면 품절해제, 아니면 미진열 처리",
            })

        # 2. 부분 품절
        elif len(soldout) > 0 and len(sale) > 0:
            action2_부분품절.append({
                **base,
                "진열상태": "진열" if display == "Y" else "미진열",
                "판매중": f"{len(sale)}개",
                "품절": f"{len(soldout)}개",
                "품절옵션": "; ".join(s["combo"] for s in soldout),
                "판매중옵션": "; ".join(sale[:5]) + ("..." if len(sale) > 5 else ""),
                "판단": "→ 입고된 옵션은 품절해제",
            })

        # 3. 미진열 + 판매가능 상태 존재
        elif display != "Y" and len(sale) > 0:
            action3_미진열_판매가능.append({
                **base,
                "판매가능조합": f"{len(sale)}개",
                "품절조합": f"{len(soldout)}개",
                "판단": "→ 팔 거면 진열, 안 팔 거면 그대로",
            })

    return action1_전체품절_진열중, action2_부분품절, action3_미진열_판매가능


def write_csv(filepath, rows):
    if not rows:
        return
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("품절 정리용 리스트 생성")
    print("=" * 50)

    print("\nAPI 수집...")
    raw = fetch_all()
    print(f"→ {len(raw)}개")

    print("\n분석...")
    a1, a2, a3 = analyze(raw)

    # CSV 저장
    write_csv(f"{OUTPUT_DIR}/1_전체품절_진열중_{len(a1)}건.csv", a1)
    write_csv(f"{OUTPUT_DIR}/2_부분품절_{len(a2)}건.csv", a2)
    write_csv(f"{OUTPUT_DIR}/3_미진열_판매가능_{len(a3)}건.csv", a3)

    # 출력
    print(f"\n{'='*50}")
    print(f"정리 대상 총 {len(a1)+len(a2)+len(a3)}건")
    print(f"{'='*50}")

    print(f"\n■ 1. 전체 품절인데 진열 중: {len(a1)}건")
    print(f"  → 입고 예정이면 품절해제, 아니면 미진열 처리")
    print(f"  CSV: 1_전체품절_진열중_{len(a1)}건.csv")

    print(f"\n■ 2. 부분 품절 (일부 옵션만): {len(a2)}건")
    print(f"  → 입고된 옵션만 품절해제")
    print(f"  CSV: 2_부분품절_{len(a2)}건.csv")
    for r in a2:
        print(f"  [{r['상품명'][:35]}] 품절 {r['품절']} / 판매 {r['판매중']}")
        print(f"    품절옵션: {r['품절옵션'][:80]}")

    print(f"\n■ 3. 미진열인데 판매 가능: {len(a3)}건")
    print(f"  → 팔 거면 진열, 안 팔 거면 그대로")
    print(f"  CSV: 3_미진열_판매가능_{len(a3)}건.csv")

    print(f"\n✅ 저장: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
