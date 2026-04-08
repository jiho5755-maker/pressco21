#!/usr/bin/env python3
"""
재고 정리용 리스트 생성기

- 판매 상태만 기준으로 대표가 훑어볼 액션 리스트를 만든다.
- 실제 API 호출과 로컬 JSON 입력을 둘 다 지원한다.
- 출력은 CSV 3종 + 요약 manifest.json 이다.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_SHOP_URL = "http://foreverlove.co.kr/list/open_api.html"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "stock_cleanup"
DEFAULT_PAGE_SIZE = 100
DEFAULT_RATE_DELAY = 0.8
EXCLUDED_TOP_CATEGORIES = {"강사공간", "개인결제창", "개인결제"}


@dataclass
class CleanupBuckets:
    fully_soldout_displayed: list[dict[str, Any]]
    partially_soldout: list[dict[str, Any]]
    hidden_but_sellable: list[dict[str, Any]]

    @property
    def total_count(self) -> int:
        return (
            len(self.fully_soldout_displayed)
            + len(self.partially_soldout)
            + len(self.hidden_but_sellable)
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="재고 정리용 CSV 생성")
    parser.add_argument(
        "--input-json",
        help="API 대신 사용할 로컬 JSON 파일 경로. list 또는 {list:[...]} 형식 지원",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"출력 디렉토리. 기본값: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--shop-url",
        default=os.getenv("FOREVERLOVE_SHOP_URL", DEFAULT_SHOP_URL),
        help="메이크샵 Open API URL",
    )
    parser.add_argument(
        "--shopkey",
        default=os.getenv("FOREVERLOVE_SHOPKEY"),
        help="메이크샵 Shopkey. 미지정 시 환경변수 FOREVERLOVE_SHOPKEY 사용",
    )
    parser.add_argument(
        "--licensekey",
        default=os.getenv("FOREVERLOVE_LICENSEKEY"),
        help="메이크샵 Licensekey. 미지정 시 환경변수 FOREVERLOVE_LICENSEKEY 사용",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"API 페이지 크기. 기본값: {DEFAULT_PAGE_SIZE}",
    )
    parser.add_argument(
        "--rate-delay",
        type=float,
        default=DEFAULT_RATE_DELAY,
        help=f"API 페이지 호출 간 대기 시간(초). 기본값: {DEFAULT_RATE_DELAY}",
    )
    return parser.parse_args()


def normalize_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [item for item in value.values() if isinstance(item, dict)]
    return []


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def build_product_url(uid: str) -> str:
    return f"https://www.foreverlove.co.kr/shop/shopdetail.html?branduid={uid}"


def category_level_one(category_name: str) -> str:
    if " < " in category_name:
        return category_name.split(" < ", 1)[0].strip()
    return category_name.strip()


def is_excluded_product(product: dict[str, Any]) -> bool:
    name = str(product.get("product_name", "")).strip()
    cate1 = category_level_one(str(product.get("category_name", "")))
    if cate1 in EXCLUDED_TOP_CATEGORIES:
        return True
    return "개인결제" in name


def collect_option_names(options: list[dict[str, Any]], target_type: str) -> list[str]:
    names: list[str] = []
    for option in options:
        if option.get("opt_type") != target_type:
            continue
        if option.get("opt_use") != "Y":
            continue
        name = str(option.get("opt_name", "")).strip()
        if name:
            names.append(name)
    return names


def product_base_row(product: dict[str, Any], basic_stocks: list[dict[str, Any]], option_defs: list[dict[str, Any]]) -> dict[str, Any]:
    select_names = collect_option_names(option_defs, "SELECT")
    addition_names = collect_option_names(option_defs, "ADDITION")
    uid = str(product.get("uid", "")).strip()
    return {
        "상품명": str(product.get("product_name", "")).strip(),
        "카테고리": category_level_one(str(product.get("category_name", ""))),
        "판매가": str(product.get("sellprice", "0")).strip(),
        "옵션구조": " × ".join(select_names) if select_names else "(단품)",
        "추가상품": " / ".join(addition_names),
        "총조합수": len(basic_stocks),
        "링크": build_product_url(uid),
    }


def summarize_product(product: dict[str, Any]) -> tuple[list[str], list[dict[str, str]], list[dict[str, Any]]]:
    options = product.get("options", {}) if isinstance(product.get("options"), dict) else {}
    basic_stocks = normalize_list(options.get("basic"))
    sale_combos: list[str] = []
    soldout_rows: list[dict[str, str]] = []

    for stock in basic_stocks:
        state = str(stock.get("sto_state_code", "")).strip()
        combo = str(stock.get("sto_opt_values", "(기본)")).strip() or "(기본)"
        if state == "SALE":
            sale_combos.append(combo)
            continue
        if state in {"SOLDOUT", "STOP", "HIDDEN"}:
            soldout_rows.append({"combo": combo, "state": state})

    return sale_combos, soldout_rows, basic_stocks


def analyze_products(products: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], CleanupBuckets]:
    filtered: list[dict[str, Any]] = []
    action1: list[dict[str, Any]] = []
    action2: list[dict[str, Any]] = []
    action3: list[dict[str, Any]] = []

    for product in products:
        if is_excluded_product(product):
            continue

        options = product.get("options", {}) if isinstance(product.get("options"), dict) else {}
        option_defs = normalize_list(options.get("option"))
        sale_combos, soldout_rows, basic_stocks = summarize_product(product)
        filtered.append(product)

        base = product_base_row(product, basic_stocks, option_defs)
        display = str(product.get("display", "N")).strip()
        soldout_combos = [row["combo"] for row in soldout_rows]
        total = len(basic_stocks)

        if display == "Y" and total > 0 and len(soldout_combos) == total and not sale_combos:
            action1.append(
                {
                    **base,
                    "품절조합": "; ".join(soldout_combos[:5]) + ("..." if total > 5 else ""),
                    "판단": "입고 예정이면 품절 해제, 아니면 미진열 처리",
                }
            )
            continue

        if soldout_combos and sale_combos:
            action2.append(
                {
                    **base,
                    "진열상태": "진열" if display == "Y" else "미진열",
                    "판매중": f"{len(sale_combos)}개",
                    "품절": f"{len(soldout_combos)}개",
                    "품절옵션": "; ".join(soldout_combos),
                    "판매중옵션": "; ".join(sale_combos[:5]) + ("..." if len(sale_combos) > 5 else ""),
                    "판단": "입고된 옵션만 품절 해제",
                }
            )
            continue

        if display != "Y" and sale_combos:
            action3.append(
                {
                    **base,
                    "판매가능조합": f"{len(sale_combos)}개",
                    "품절조합": f"{len(soldout_combos)}개",
                    "판단": "팔 거면 진열, 안 팔 거면 그대로",
                }
            )

    return filtered, CleanupBuckets(
        fully_soldout_displayed=action1,
        partially_soldout=action2,
        hidden_but_sellable=action3,
    )


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def make_output_paths(output_dir: Path, buckets: CleanupBuckets) -> dict[str, Path]:
    return {
        "action1": output_dir / f"1_전체품절_진열중_{len(buckets.fully_soldout_displayed)}건.csv",
        "action2": output_dir / f"2_부분품절_{len(buckets.partially_soldout)}건.csv",
        "action3": output_dir / f"3_미진열_판매가능_{len(buckets.hidden_but_sellable)}건.csv",
        "manifest": output_dir / "manifest.json",
    }


def print_summary(filtered_count: int, buckets: CleanupBuckets, output_paths: dict[str, Path]) -> None:
    print("=" * 52)
    print(f"분석 대상: {filtered_count}개")
    print(f"정리 대상 총 {buckets.total_count}건")
    print("=" * 52)
    print(f"1. 전체 품절인데 진열 중: {len(buckets.fully_soldout_displayed)}건")
    print(f"   CSV: {output_paths['action1'].name}")
    print(f"2. 부분 품절: {len(buckets.partially_soldout)}건")
    print(f"   CSV: {output_paths['action2'].name}")
    print(f"3. 미진열인데 판매 가능: {len(buckets.hidden_but_sellable)}건")
    print(f"   CSV: {output_paths['action3'].name}")


def require_api_credentials(args: argparse.Namespace) -> None:
    if args.input_json:
        return
    if args.shopkey and args.licensekey:
        return
    raise SystemExit(
        "API 호출에는 --shopkey/--licensekey 또는 FOREVERLOVE_SHOPKEY/FOREVERLOVE_LICENSEKEY 환경변수가 필요합니다."
    )


def api_call(shop_url: str, shopkey: str, licensekey: str, params: dict[str, Any]) -> dict[str, Any] | None:
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(f"{shop_url}?{query}")
    request.add_header("Shopkey", shopkey)
    request.add_header("Licensekey", licensekey)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - 네트워크 예외는 실행 시 확인
        print(f"[오류] API 호출 실패: {exc}", file=sys.stderr)
        return None


def fetch_all_products(args: argparse.Namespace) -> list[dict[str, Any]]:
    first_page = api_call(
        args.shop_url,
        args.shopkey,
        args.licensekey,
        {"mode": "search", "type": "product", "limit": args.page_size, "page": 1},
    )
    if not first_page:
        return []

    products = normalize_list(first_page.get("list"))
    total_pages = int(first_page.get("totalPage", 1) or 1)
    print(f"API 수집: 1/{total_pages}")

    for page in range(2, total_pages + 1):
        time.sleep(args.rate_delay)
        page_data = api_call(
            args.shop_url,
            args.shopkey,
            args.licensekey,
            {"mode": "search", "type": "product", "limit": args.page_size, "page": page},
        )
        if not page_data:
            continue
        products.extend(normalize_list(page_data.get("list")))
        if page % 10 == 0 or page == total_pages:
            print(f"API 수집: {page}/{total_pages} -> {len(products)}개")

    return products


def load_products(args: argparse.Namespace) -> list[dict[str, Any]]:
    if args.input_json:
        raw = read_json(Path(args.input_json))
        if isinstance(raw, dict) and "list" in raw:
            return normalize_list(raw.get("list"))
        return normalize_list(raw)
    return fetch_all_products(args)


def build_manifest(filtered_count: int, buckets: CleanupBuckets, output_paths: dict[str, Path]) -> dict[str, Any]:
    return {
        "filteredProductCount": filtered_count,
        "totalActionCount": buckets.total_count,
        "files": {
            "fullySoldoutDisplayed": output_paths["action1"].name,
            "partiallySoldout": output_paths["action2"].name,
            "hiddenButSellable": output_paths["action3"].name,
        },
        "counts": {
            "fullySoldoutDisplayed": len(buckets.fully_soldout_displayed),
            "partiallySoldout": len(buckets.partially_soldout),
            "hiddenButSellable": len(buckets.hidden_but_sellable),
        },
    }


def main() -> int:
    args = parse_args()
    require_api_credentials(args)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    products = load_products(args)
    print(f"원본 상품 수: {len(products)}개")

    filtered, buckets = analyze_products(products)
    output_paths = make_output_paths(output_dir, buckets)

    write_csv(output_paths["action1"], buckets.fully_soldout_displayed)
    write_csv(output_paths["action2"], buckets.partially_soldout)
    write_csv(output_paths["action3"], buckets.hidden_but_sellable)
    write_json(output_paths["manifest"], build_manifest(len(filtered), buckets, output_paths))

    print_summary(len(filtered), buckets, output_paths)
    print(f"저장 위치: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
