#!/usr/bin/env python3
"""
CRM-004: 파생 필드 산출 및 customer_status 분류
- tbl_tx_history(출고 건)에서 고객별 집계:
    last_order_date, first_order_date, total_order_count, total_order_amount
- customer_status 자동 판정 (최종 거래일 기준):
    ACTIVE   : 12개월 이내
    DORMANT  : 12~36개월
    CHURNED  : 36개월 초과
- tbl_Customers 일괄 업데이트
"""

import sys
import time
import json
import requests
from datetime import date, datetime

# ─── 설정 ─────────────────────────────────────────────
NOCODB_URL  = "https://nocodb.pressco21.com"
NOCODB_TOKEN = "SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl"
PROJECT_ID  = "pu0mwk97kac8a5p"
CUSTOMERS_TBL = "mffgxkftaeppyk0"   # tbl_Customers
TX_TBL        = "mtxh72a1f4beeac"   # tbl_tx_history
BATCH_SIZE  = 500

HEADERS = {
    "xc-token": NOCODB_TOKEN,
    "Content-Type": "application/json",
}
CUSTOMERS_URL      = f"{NOCODB_URL}/api/v1/db/data/noco/{PROJECT_ID}/{CUSTOMERS_TBL}"
CUSTOMERS_BULK_URL = f"{NOCODB_URL}/api/v1/db/data/bulk/noco/{PROJECT_ID}/{CUSTOMERS_TBL}"
TX_URL             = f"{NOCODB_URL}/api/v1/db/data/noco/{PROJECT_ID}/{TX_TBL}"

TODAY = date.today()


# ─── customer_status 분류 ──────────────────────────────
def classify_status(last_order_date_str):
    """최종 거래일 기준으로 고객 상태 분류"""
    if not last_order_date_str:
        return "CHURNED"
    try:
        last_date = datetime.strptime(last_order_date_str[:10], "%Y-%m-%d").date()
        months = (TODAY.year - last_date.year) * 12 + (TODAY.month - last_date.month)
        if months <= 12:
            return "ACTIVE"
        elif months <= 36:
            return "DORMANT"
        else:
            return "CHURNED"
    except Exception:
        return "CHURNED"


# ─── tbl_tx_history 출고 건 집계 ──────────────────────
def aggregate_tx_history():
    """tx_type='출고' 건만 고객별 집계"""
    print("tbl_tx_history 출고 건 집계 중...")
    aggregated = {}   # customer_name → {last, first, count, amount}
    offset = 0
    limit  = 1000
    total_rows = None

    while True:
        params = {
            "where":  "(tx_type,eq,출고)",
            "fields": "customer_name,tx_date,amount",
            "limit":  limit,
            "offset": offset,
        }
        res = requests.get(TX_URL, headers=HEADERS, params=params, timeout=60)
        if res.status_code != 200:
            raise RuntimeError(f"tx_history 로드 실패: {res.status_code} {res.text[:200]}")

        data = res.json()
        batch = data.get("list", [])
        if total_rows is None:
            total_rows = data.get("pageInfo", {}).get("totalRows", 0)
            print(f"  출고 건 총 {total_rows:,}건 처리 예정")

        for row in batch:
            name    = (row.get("customer_name") or "").strip()
            tx_date = (row.get("tx_date") or "").strip()[:10]
            amount  = int(row.get("amount") or 0)

            if not name or not tx_date:
                continue

            if name not in aggregated:
                aggregated[name] = {
                    "last_order_date":   tx_date,
                    "first_order_date":  tx_date,
                    "total_order_count": 0,
                    "total_order_amount": 0,
                }

            agg = aggregated[name]
            if tx_date > agg["last_order_date"]:
                agg["last_order_date"] = tx_date
            if tx_date < agg["first_order_date"]:
                agg["first_order_date"] = tx_date
            agg["total_order_count"]  += 1
            agg["total_order_amount"] += amount

        offset += len(batch)
        print(f"  {offset:,}/{total_rows:,} 처리됨...", end="\r")

        if not batch or offset >= total_rows:
            break
        time.sleep(0.2)

    print(f"\n  집계 완료: {len(aggregated):,}개 유니크 거래처명")
    return aggregated


# ─── tbl_Customers 전체 로드 ──────────────────────────
def load_all_customers():
    """Id, name 필드만 로드"""
    print("tbl_Customers 로드 중...")
    all_rows = []
    offset = 0
    limit  = 1000

    while True:
        params = {
            "fields": "Id,name",
            "limit":  limit,
            "offset": offset,
        }
        res = requests.get(CUSTOMERS_URL, headers=HEADERS, params=params, timeout=60)
        if res.status_code != 200:
            raise RuntimeError(f"customers 로드 실패: {res.status_code} {res.text[:200]}")

        data = res.json()
        batch = data.get("list", [])
        total = data.get("pageInfo", {}).get("totalRows", 0)
        all_rows.extend(batch)
        offset += len(batch)
        print(f"  {offset:,}/{total:,} 로드됨...", end="\r")

        if not batch or offset >= total:
            break
        time.sleep(0.2)

    print(f"\n  총 {len(all_rows):,}건 로드 완료")
    return all_rows


# ─── bulk PATCH ───────────────────────────────────────
def bulk_patch(records):
    res = requests.patch(CUSTOMERS_BULK_URL, headers=HEADERS, json=records, timeout=60)
    if res.status_code not in (200, 201):
        raise RuntimeError(f"bulk PATCH 실패: {res.status_code} {res.text[:300]}")
    return len(records)


def run_batches(records, label="업데이트"):
    total = len(records)
    done  = 0
    for i in range(0, total, BATCH_SIZE):
        batch = records[i: i + BATCH_SIZE]
        done += bulk_patch(batch)
        print(f"  [{label}] {done:,}/{total:,} 완료", end="\r")
        time.sleep(0.3)
    print()
    return done


# ─── 메인 ────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("CRM-004: 파생 필드 산출 및 customer_status 분류")
    print(f"  기준일: {TODAY}  |  dry_run: {dry_run}")
    print("=" * 60)

    # 1. tx_history 집계
    aggregated = aggregate_tx_history()

    # 2. customers 전체 로드
    all_customers = load_all_customers()

    # 3. name 매칭 → 업데이트 레코드 생성
    updates  = []
    matched  = 0
    no_match = 0

    for customer in all_customers:
        cust_id = customer["Id"]
        name    = (customer.get("name") or "").strip()
        agg     = aggregated.get(name)

        if agg:
            matched += 1
            status   = classify_status(agg["last_order_date"])
            updates.append({
                "Id":                cust_id,
                "last_order_date":   agg["last_order_date"],
                "first_order_date":  agg["first_order_date"],
                "total_order_count": agg["total_order_count"],
                "total_order_amount":agg["total_order_amount"],
                "customer_status":   status,
            })
        else:
            no_match += 1
            updates.append({
                "Id":                cust_id,
                "customer_status":   "CHURNED",
                "total_order_count": 0,
                "total_order_amount":0,
            })

    print(f"\n매칭 결과: {matched:,}건 매칭 / {no_match:,}건 미매칭(거래 없음 → CHURNED)")

    # 4. tx_history에만 있는 거래처명 샘플 출력
    matched_names  = set((c.get("name") or "").strip() for c in all_customers)
    unmatched_tx   = set(aggregated.keys()) - matched_names
    if unmatched_tx:
        print(f"\n  ※ tx_history에만 있는 거래처 {len(unmatched_tx)}개 (customers 미등록):")
        for n in sorted(unmatched_tx)[:10]:
            agg = aggregated[n]
            print(f"     - {n}  (출고 {agg['total_order_count']}건, {agg['total_order_amount']:,}원)")

    # 5. customer_status 분포 미리보기
    status_dist = {}
    for u in updates:
        s = u.get("customer_status", "?")
        status_dist[s] = status_dist.get(s, 0) + 1

    print("\ncustomer_status 분포 (예상):")
    total_cust = len(updates)
    for s in ["ACTIVE", "DORMANT", "CHURNED"]:
        cnt = status_dist.get(s, 0)
        pct = cnt / total_cust * 100 if total_cust else 0
        print(f"  {s:10s}: {cnt:6,}건  ({pct:.1f}%)")

    # 6. 금액 합산 검증용 출력
    total_amount = sum(agg["total_order_amount"] for agg in aggregated.values())
    print(f"\n출고 총 금액 합계: {total_amount:,}원")

    if dry_run:
        print("\n[dry-run] 실제 업데이트는 수행하지 않습니다.")
        return

    # 7. tbl_Customers 일괄 업데이트
    print(f"\ntbl_Customers 업데이트 시작 ({len(updates):,}건)...")
    done = run_batches(updates, "업데이트")
    print(f"\n완료: {done:,}건 업데이트")


if __name__ == "__main__":
    main()
