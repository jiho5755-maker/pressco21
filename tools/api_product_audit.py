#!/usr/bin/env python3
"""
메이크샵 오픈 API 전수조사 스크립트
- 상품 목록 API로 전체 상품 수집 (페이지네이션)
- 옵션 있는 상품은 상세 API로 정확한 옵션 구조 파악
- 강사공간/개인결제 제외 후 분류
"""

import json
import csv
import os
import time
import urllib.request
from collections import Counter, defaultdict

# === 설정 ===
SHOP_URL = "http://foreverlove.co.kr/list/open_api.html"
SHOPKEY = "1fe4eece82d00e245aff322522fb3aec"
LICENSEKEY = "YWQ0ZTQwNWVhOGIzN2E3ZWVkZDdiMTIwOGZhNmQ3MDI="
OUTPUT_DIR = "/Users/jangjiho/workspace/pressco21/tools/product_analysis_api"
PAGE_SIZE = 100  # 최대 100
RATE_DELAY = 0.8  # 초 (500/hour = 0.72초 간격 → 여유 두고 0.8초)


def api_call(params):
    """메이크샵 API 호출"""
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{SHOP_URL}?{query}"
    req = urllib.request.Request(url)
    req.add_header("Shopkey", SHOPKEY)
    req.add_header("Licensekey", LICENSEKEY)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except Exception as e:
        print(f"  [오류] API 호출 실패: {e}")
        return None


def fetch_all_products():
    """전체 상품 목록 수집 (페이지네이션)"""
    all_products = []
    page = 1

    # 첫 호출로 총 개수 확인
    data = api_call({"mode": "search", "type": "product", "limit": PAGE_SIZE, "page": 1})
    if not data or data.get("return_code") != "0000":
        print("API 호출 실패!")
        return []

    total = int(data.get("totalCount", 0))
    total_pages = int(data.get("totalPage", 0))
    print(f"  총 상품: {total}개, 총 페이지: {total_pages}")

    # 첫 페이지 처리
    products = data.get("list", [])
    if isinstance(products, dict):
        products = list(products.values())
    all_products.extend(products)
    print(f"  페이지 1/{total_pages} → {len(products)}개")

    # 나머지 페이지
    for page in range(2, total_pages + 1):
        time.sleep(RATE_DELAY)
        data = api_call({"mode": "search", "type": "product", "limit": PAGE_SIZE, "page": page})
        if not data:
            print(f"  [경고] 페이지 {page} 실패, 건너뜀")
            continue

        products = data.get("list", [])
        if isinstance(products, dict):
            products = list(products.values())
        all_products.extend(products)

        if page % 10 == 0 or page == total_pages:
            print(f"  페이지 {page}/{total_pages} → 누적 {len(all_products)}개")

    return all_products


def analyze_product(p):
    """개별 상품 분석"""
    uid = p.get("uid", "")
    name = p.get("product_name", "")
    category = p.get("category_name", "")
    cate1 = category.split(" < ")[0] if " < " in category else category
    sellprice = int(p.get("sellprice", "0") or "0")
    display = p.get("display", "N")
    quantity = p.get("quantity", "Unlimited")
    sell_accept = p.get("sell_accept", "N")
    is_add_comp = p.get("is_add_composition", "N")

    # 옵션 분석
    options = p.get("options", {})
    option_list = options.get("option") or []
    if isinstance(option_list, dict):
        option_list = [option_list]

    select_options = [o for o in option_list if o.get("opt_type") == "SELECT" and o.get("opt_use") == "Y"]
    addition_options = [o for o in option_list if o.get("opt_type") == "ADDITION" and o.get("opt_use") == "Y"]
    individual_options = [o for o in option_list if o.get("opt_type") == "INDIVIDUAL" and o.get("opt_use") == "Y"]
    hybrid_options = [o for o in option_list if o.get("opt_type") == "HYBRID" and o.get("opt_use") == "Y"]

    # 옵션 조합 (basic stocks)
    basic_stocks = options.get("basic") or []
    if isinstance(basic_stocks, dict):
        basic_stocks = [basic_stocks]

    # 추가구성상품
    add_comp = p.get("add_composition") or []
    if isinstance(add_comp, dict):
        add_comp = [add_comp]

    # 품절 판단 + 부분 품절 감지
    is_soldout = False
    partial_soldout = False
    total_combos = len(basic_stocks)
    soldout_combos = 0
    soldout_combo_names = []

    if quantity == "0":
        is_soldout = True
    elif basic_stocks:
        for s in basic_stocks:
            if s.get("sto_state_code") in ["SOLDOUT", "STOP", "HIDDEN"]:
                soldout_combos += 1
                soldout_combo_names.append(
                    f"{s.get('sto_opt_values', '')}({s.get('sto_state_code', '')})"
                )
        if soldout_combos == total_combos and total_combos > 0:
            is_soldout = True
        elif soldout_combos > 0:
            partial_soldout = True

    # 이미지 호스트 (API는 상대경로 /shopimages/ 반환, http면 외부)
    image_hosts = set()
    for field in ["maximage", "minimage", "tinyimage", "mobile_image"]:
        img = p.get(field, "") or ""
        if img.startswith("http"):
            host = img.split("/")[2] if len(img.split("/")) > 2 else ""
            if host:
                image_hosts.add(host)
        elif img.startswith("/shopimages/"):
            image_hosts.add("foreverlove.co.kr(자사몰)")

    return {
        "uid": uid,
        "product_name": name,
        "category": category,
        "cate1": cate1,
        "sellprice": sellprice,
        "display": display,
        "quantity": quantity,
        "sell_accept": sell_accept,
        "is_soldout": is_soldout,
        "partial_soldout": partial_soldout,
        "total_combos": total_combos,
        "soldout_combos": soldout_combos,
        "soldout_combo_detail": "; ".join(soldout_combo_names[:10]),  # 최대 10개
        # 옵션 상세
        "select_count": len(select_options),
        "addition_count": len(addition_options),
        "individual_count": len(individual_options),
        "hybrid_count": len(hybrid_options),
        "total_option_count": len(option_list),
        "select_names": " | ".join(o.get("opt_name", "") for o in select_options),
        "addition_names": " | ".join(o.get("opt_name", "") for o in addition_options),
        "select_details": "; ".join(
            f"{o.get('opt_name','')}: {o.get('opt_value','')}"
            for o in select_options
        ),
        "addition_details": "; ".join(
            f"{o.get('opt_name','')}: {o.get('opt_value','')}"
            for o in addition_options
        ),
        "combo_count": len(basic_stocks),
        # 추가구성상품
        "is_add_composition": is_add_comp,
        "add_composition_count": len(add_comp),
        "add_composition_names": ", ".join(
            c.get("composition_name", "") for c in add_comp
        ) if add_comp else "",
        # 이미지
        "image_hosts": ", ".join(image_hosts),
        "maximage": p.get("maximage", ""),
        # 기타
        "regdate": p.get("regdate", ""),
        "moddate": p.get("moddate", ""),
        "sellcount": p.get("sellcount", ""),
        "view_count": p.get("view_count", ""),
    }


def classify(products):
    """상품 분류"""
    excluded_instructor = []
    excluded_personal = []
    actual = []

    for p in products:
        cate1 = p["cate1"]
        name = p["product_name"]

        if cate1 == "강사공간":
            excluded_instructor.append(p)
        elif cate1 == "개인결제창" or cate1 == "개인결제" or "개인결제" in name:
            excluded_personal.append(p)
        else:
            actual.append(p)

    # 실제 상품 세분류
    cat_simple_live = []      # 1. 단품
    cat_not_displayed = []    # 2. 미진열
    cat_soldout = []          # 3. 품절
    cat_select_1 = []         # 4a. SELECT 옵션 1단
    cat_select_2 = []         # 4b. SELECT 옵션 2단
    cat_select_3plus = []     # 4c. SELECT 옵션 3단 이상
    cat_addition_only = []    # 4d. ADDITION만 있는 상품
    cat_has_addition = []     # 5. ADDITION 있는 상품 (중복)
    cat_add_composition = []  # 6. 추가구성상품 (중복)
    cat_other = []

    for p in actual:
        # 추가상품/ADDITION 플래그 (중복 분류)
        if p["addition_count"] > 0:
            cat_has_addition.append(p)
        if p["is_add_composition"] == "Y" or p["add_composition_count"] > 0:
            cat_add_composition.append(p)

        # 메인 분류 (배타적)
        if p["display"] != "Y":
            cat_not_displayed.append(p)
        elif p["is_soldout"]:
            cat_soldout.append(p)
        elif p["select_count"] >= 3:
            cat_select_3plus.append(p)
        elif p["select_count"] == 2:
            cat_select_2.append(p)
        elif p["select_count"] == 1:
            cat_select_1.append(p)
        elif p["addition_count"] > 0 and p["select_count"] == 0:
            cat_addition_only.append(p)
        else:
            # 단품 (옵션 없음)
            cat_simple_live.append(p)

    return {
        "excluded_instructor": excluded_instructor,
        "excluded_personal": excluded_personal,
        "actual": actual,
        "cat_simple_live": cat_simple_live,
        "cat_not_displayed": cat_not_displayed,
        "cat_soldout": cat_soldout,
        "cat_select_1": cat_select_1,
        "cat_select_2": cat_select_2,
        "cat_select_3plus": cat_select_3plus,
        "cat_addition_only": cat_addition_only,
        "cat_has_addition": cat_has_addition,
        "cat_add_composition": cat_add_composition,
        "cat_other": cat_other,
    }


def write_csv(filepath, products):
    if not products:
        return
    fieldnames = list(products[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(products)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("메이크샵 오픈 API 전수조사")
    print("=" * 60)

    # 1단계: 전체 상품 수집
    print("\n[1/3] 상품 목록 API 전체 수집 (페이지네이션)...")
    raw_products = fetch_all_products()
    print(f"  → 총 {len(raw_products)}개 수집 완료")

    # 2단계: 분석
    print("\n[2/3] 상품 분석 중...")
    analyzed = [analyze_product(p) for p in raw_products]

    # 3단계: 분류
    print("\n[3/3] 분류 및 저장...")
    result = classify(analyzed)

    # === 요약 출력 ===
    print("\n" + "=" * 60)
    print("API 전수조사 결과")
    print("=" * 60)

    print(f"\n■ 전체: {len(analyzed)}개")
    print(f"  ├─ 제외: 강사공간 {len(result['excluded_instructor'])}개")
    print(f"  ├─ 제외: 개인결제 {len(result['excluded_personal'])}개")
    print(f"  └─ 실제 상품: {len(result['actual'])}개")

    print(f"\n■ 실제 상품 분류 (배타적):")
    print(f"  1.  단품 (진열+라이브+옵션없음): {len(result['cat_simple_live'])}개")
    print(f"  2.  미진열:                      {len(result['cat_not_displayed'])}개")
    print(f"  3.  품절:                        {len(result['cat_soldout'])}개")
    print(f"  4a. SELECT 옵션 1단:             {len(result['cat_select_1'])}개")
    print(f"  4b. SELECT 옵션 2단:             {len(result['cat_select_2'])}개")
    print(f"  4c. SELECT 옵션 3단+:            {len(result['cat_select_3plus'])}개")
    print(f"  4d. ADDITION만 (SELECT 없음):    {len(result['cat_addition_only'])}개")

    print(f"\n■ 중복 분류 (다른 분류와 겹칠 수 있음):")
    print(f"  5. ADDITION 있는 상품:  {len(result['cat_has_addition'])}개")
    print(f"  6. 추가구성상품:        {len(result['cat_add_composition'])}개")

    # 이미지 호스팅 분석
    host_counter = Counter()
    for p in result["actual"]:
        for h in p["image_hosts"].split(", "):
            if h:
                host_counter[h] += 1
    print(f"\n■ 이미지 호스팅 서버:")
    for h, c in host_counter.most_common():
        print(f"  - {h}: {c}개")

    # 카테고리 분포
    cate_counter = Counter()
    for p in result["actual"]:
        cate_counter[p["cate1"]] += 1
    print(f"\n■ 카테고리(대분류) 분포:")
    for c, n in cate_counter.most_common():
        print(f"  - {c or '(미지정)'}: {n}개")

    # 옵션 상세 통계
    print(f"\n■ SELECT 옵션 단 수 분포 (전체 실제 상품):")
    sel_counter = Counter()
    for p in result["actual"]:
        sel_counter[p["select_count"]] += 1
    for k, v in sorted(sel_counter.items()):
        print(f"  - {k}단: {v}개")

    print(f"\n■ ADDITION 옵션 개수 분포:")
    add_counter = Counter()
    for p in result["actual"]:
        add_counter[p["addition_count"]] += 1
    for k, v in sorted(add_counter.items()):
        if k > 0:
            print(f"  - {k}개: {v}개 상품")

    # 부분 품절
    partial_soldout = [p for p in result["actual"] if p["partial_soldout"]]
    print(f"\n■ 부분 품절 (일부 옵션만 품절):")
    print(f"  - 총 {len(partial_soldout)}개 상품")
    for p in partial_soldout:
        print(f"    [{p['product_name'][:40]}] {p['soldout_combos']}/{p['total_combos']}개 조합 품절")
        if p['soldout_combo_detail']:
            details = p['soldout_combo_detail'][:80]
            print(f"      → {details}")

    # 추가 이슈
    no_price = [p for p in result["actual"] if p["sellprice"] == 0]
    no_image = [p for p in result["actual"] if not p["maximage"]]
    print(f"\n■ 추가 이슈:")
    print(f"  - 가격 0원: {len(no_price)}개")
    print(f"  - 이미지 없음: {len(no_image)}개")
    print(f"  - 부분 품절: {len(partial_soldout)}개")

    # === CSV 저장 ===
    write_csv(f"{OUTPUT_DIR}/1_단품_라이브.csv", result["cat_simple_live"])
    write_csv(f"{OUTPUT_DIR}/2_미진열.csv", result["cat_not_displayed"])
    write_csv(f"{OUTPUT_DIR}/3_품절.csv", result["cat_soldout"])
    write_csv(f"{OUTPUT_DIR}/4a_SELECT_1단.csv", result["cat_select_1"])
    write_csv(f"{OUTPUT_DIR}/4b_SELECT_2단.csv", result["cat_select_2"])
    write_csv(f"{OUTPUT_DIR}/4c_SELECT_3단이상.csv", result["cat_select_3plus"])
    write_csv(f"{OUTPUT_DIR}/4d_ADDITION만.csv", result["cat_addition_only"])
    write_csv(f"{OUTPUT_DIR}/5_ADDITION있는상품.csv", result["cat_has_addition"])
    write_csv(f"{OUTPUT_DIR}/6_추가구성상품.csv", result["cat_add_composition"])
    write_csv(f"{OUTPUT_DIR}/이슈_부분품절.csv", partial_soldout)
    write_csv(f"{OUTPUT_DIR}/이슈_가격0원.csv", no_price)
    write_csv(f"{OUTPUT_DIR}/이슈_이미지없음.csv", no_image)
    write_csv(f"{OUTPUT_DIR}/제외_강사공간.csv", result["excluded_instructor"])
    write_csv(f"{OUTPUT_DIR}/제외_개인결제.csv", result["excluded_personal"])

    # 전체 데이터 JSON 저장
    with open(f"{OUTPUT_DIR}/전체_API_데이터.json", "w", encoding="utf-8") as f:
        json.dump(analyzed, f, ensure_ascii=False, indent=2)

    files = os.listdir(OUTPUT_DIR)
    print(f"\n✅ 저장 완료: {OUTPUT_DIR}/")
    print(f"   {len(files)}개 파일 생성")


if __name__ == "__main__":
    main()
