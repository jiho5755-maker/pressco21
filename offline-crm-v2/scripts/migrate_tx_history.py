#!/usr/bin/env python3
"""
CRM-002: 얼마에요 거래내역 엑셀 → NocoDB tbl_tx_history 마이그레이션
- 연도별 .xls 파일 (2013~2026) 처리
- 총 약 102,000건 bulk insert
- 배치 크기: 500건 / 중복 방지: tx_year 기준 기존 데이터 확인
"""

import os
import sys
import time
import json
import xlrd
import requests
from datetime import datetime

# ─── 설정 ───────────────────────────────────────────
# NOCODB_TOKEN: .env.local 또는 시스템 환경변수에서 로드 (코드에 직접 기재 금지)
NOCODB_URL   = "https://nocodb.pressco21.com"
NOCODB_TOKEN = os.environ.get("NOCODB_TOKEN", "")
if not NOCODB_TOKEN:
    sys.exit("오류: NOCODB_TOKEN 환경변수가 설정되지 않았습니다.\n"
             "실행 방법: export NOCODB_TOKEN=<토큰값> && python3 migrate_tx_history.py")
TABLE_ID     = "mtxh72a1f4beeac"
XLS_DIR      = "/Users/jangjiho/Downloads/얼마에요 백업파일"
BATCH_SIZE   = 500
YEARS        = list(range(2013, 2027))

HEADERS = {
    "xc-token": NOCODB_TOKEN,
    "Content-Type": "application/json",
}
BASE_URL      = f"{NOCODB_URL}/api/v1/db/data/noco/pu0mwk97kac8a5p/{TABLE_ID}"
BULK_URL      = f"{NOCODB_URL}/api/v1/db/data/bulk/noco/pu0mwk97kac8a5p/{TABLE_ID}"


# ─── 날짜 변환 ─────────────────────────────────────
def xldate_to_str(xldate, wb_datemode):
    """엑셀 날짜 숫자 → 'YYYY-MM-DD' 문자열"""
    try:
        dt = xlrd.xldate_as_datetime(xldate, wb_datemode)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return ""


# ─── 이미 마이그레이션된 연도 확인 ─────────────────
def get_existing_years():
    """NocoDB에 이미 입력된 tx_year 목록 반환"""
    url = f"{BASE_URL}"
    params = {
        "fields": "tx_year",
        "groupBy": "tx_year",
        "limit": 50,
    }
    try:
        res = requests.get(url, headers=HEADERS, params=params, timeout=30)
        if res.status_code == 200:
            data = res.json()
            years = set()
            for row in data.get("list", []):
                y = row.get("tx_year")
                if y:
                    years.add(int(y))
            return years
    except Exception:
        pass
    return set()


def count_by_year(year):
    """특정 연도 기존 레코드 수 확인"""
    params = {
        "where": f"(tx_year,eq,{year})",
        "limit": 1,
        "offset": 0,
    }
    try:
        res = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=30)
        if res.status_code == 200:
            return res.json().get("pageInfo", {}).get("totalRows", 0)
    except Exception:
        pass
    return 0


# ─── 엑셀 행 → dict 변환 ───────────────────────────
def row_to_dict(sh, row_idx, wb_datemode, year):
    """엑셀 한 행을 NocoDB 컬럼 매핑으로 변환"""
    def cell(col):
        return sh.cell_value(row_idx, col)

    # 거래일 변환
    raw_date = cell(0)
    if isinstance(raw_date, float) and raw_date > 0:
        tx_date = xldate_to_str(raw_date, wb_datemode)
    elif isinstance(raw_date, str) and raw_date.strip():
        tx_date = raw_date.strip()
    else:
        tx_date = ""

    # 장부번호 (float → int → str)
    raw_book = cell(1)
    if isinstance(raw_book, float):
        legacy_book_id = str(int(raw_book)) if raw_book > 0 else ""
    else:
        legacy_book_id = str(raw_book).strip()

    # 금액/세액 정수화
    amount = int(cell(4)) if cell(4) else 0
    tax    = int(cell(5)) if cell(5) else 0

    # 전표번호
    raw_slip = cell(7)
    if isinstance(raw_slip, float):
        slip_no = str(int(raw_slip)) if raw_slip > 0 else ""
    else:
        slip_no = str(raw_slip).strip()

    return {
        "tx_date":       tx_date,
        "legacy_book_id": legacy_book_id,
        "customer_name": str(cell(13)).strip(),   # 거래처명 (col 13)
        "tx_type":       str(cell(3)).strip(),    # 거래구분
        "amount":        amount,
        "tax":           tax,
        "memo":          str(cell(6)).strip(),    # 적요
        "slip_no":       slip_no,
        "debit_account": str(cell(8)).strip(),    # 차변계정
        "credit_account":str(cell(10)).strip(),   # 대변계정
        "ledger":        str(cell(12)).strip(),   # 거래장부
        "tx_year":       year,
    }


# ─── 배치 bulk insert ──────────────────────────────
def bulk_insert(records):
    """NocoDB bulk POST (최대 BATCH_SIZE건)"""
    res = requests.post(BULK_URL, headers=HEADERS, json=records, timeout=60)
    if res.status_code not in (200, 201):
        raise RuntimeError(f"bulk insert 실패: {res.status_code} {res.text[:300]}")
    return len(records)


# ─── 연도별 마이그레이션 ───────────────────────────
def migrate_year(year, skip_existing=True):
    xls_path = os.path.join(XLS_DIR, f"거래내역 {year}.xls")
    if not os.path.exists(xls_path):
        print(f"  [{year}] 파일 없음, 건너뜀")
        return 0

    if skip_existing:
        existing = count_by_year(year)
        if existing > 0:
            print(f"  [{year}] 이미 {existing:,}건 존재 — 건너뜀 (--force 옵션으로 덮어쓰기 가능)")
            return 0

    wb = xlrd.open_workbook(xls_path)
    sh = wb.sheet_by_index(0)
    total_rows = sh.nrows - 1  # 헤더 제외

    print(f"  [{year}] {total_rows:,}건 마이그레이션 시작...")

    records = []
    inserted = 0
    skipped  = 0

    for r in range(1, sh.nrows):
        try:
            rec = row_to_dict(sh, r, wb.datemode, year)
            # 거래일 없으면 건너뜀
            if not rec["tx_date"]:
                skipped += 1
                continue
            records.append(rec)

            if len(records) >= BATCH_SIZE:
                inserted += bulk_insert(records)
                records = []
                print(f"    → {inserted:,}/{total_rows:,} 완료", end="\r")
                time.sleep(0.3)  # 서버 부하 방지

        except Exception as e:
            print(f"\n    ⚠ row {r} 오류: {e}")
            skipped += 1

    # 나머지 flush
    if records:
        inserted += bulk_insert(records)

    print(f"  [{year}] 완료: {inserted:,}건 입력, {skipped}건 건너뜀")
    return inserted


# ─── 메인 ──────────────────────────────────────────
def main():
    force = "--force" in sys.argv
    year_filter = None
    for arg in sys.argv[1:]:
        if arg.isdigit() and 2013 <= int(arg) <= 2026:
            year_filter = int(arg)

    print("=" * 55)
    print("CRM-002 마이그레이션 시작")
    print(f"  대상 테이블: tbl_tx_history ({TABLE_ID})")
    print(f"  force 모드: {force}")
    if year_filter:
        print(f"  특정 연도만: {year_filter}")
    print("=" * 55)

    total_inserted = 0
    start_time = time.time()

    target_years = [year_filter] if year_filter else YEARS
    for year in target_years:
        n = migrate_year(year, skip_existing=not force)
        total_inserted += n

    elapsed = time.time() - start_time
    print()
    print("=" * 55)
    print(f"마이그레이션 완료: 총 {total_inserted:,}건 입력")
    print(f"소요 시간: {elapsed:.1f}초")
    print("=" * 55)


if __name__ == "__main__":
    main()
