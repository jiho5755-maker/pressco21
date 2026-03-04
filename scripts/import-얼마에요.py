#!/usr/bin/env python3
"""
얼마에요 백업 데이터 → NocoDB offline-crm 임포트 스크립트
"""
import xlrd
import requests
import json
import time
from datetime import datetime, date

# 설정
NOCODB_URL = "https://nocodb.pressco21.com"
TOKEN = "SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl"
BASE_ID = "pu0mwk97kac8a5p"

TABLE_IDS = {
    "customers":   "mffgxkftaeppyk0",
    "products":    "mioztktmluobmmo",
    "invoices":    "ml81i9mcuw0pjzk",
    "items":       "mxwgdlj56p9joxo",
    "tx_history":  "mqeg73wr7xzi1k3",
}

BACKUP_DIR = "/Users/jangjiho/Downloads/얼마에요 백업파일"

HEADERS = {
    "xc-token": TOKEN,
    "Content-Type": "application/json",
}

def bulk_insert(table_key, rows, batch_size=500):
    """NocoDB 배치 삽입"""
    table_id = TABLE_IDS[table_key]
    url = f"{NOCODB_URL}/api/v1/db/data/bulk/noco/{BASE_ID}/{table_id}"
    total = len(rows)
    success = 0
    for i in range(0, total, batch_size):
        batch = rows[i:i+batch_size]
        resp = requests.post(url, headers=HEADERS, json=batch)
        if resp.status_code in (200, 201):
            success += len(batch)
            print(f"  [{table_key}] {success}/{total} 삽입 완료")
        else:
            print(f"  [ERROR] {resp.status_code}: {resp.text[:200]}")
        time.sleep(0.5)
    return success

def excel_date_to_str(val):
    """엑셀 날짜 숫자 → YYYY-MM-DD 문자열"""
    try:
        if val and float(val) > 0:
            d = xlrd.xldate_as_datetime(float(val), 0)
            return d.strftime("%Y-%m-%d")
    except Exception:
        pass
    return None

def clean_str(val):
    """엑셀 값 → 깔끔한 문자열"""
    if val is None:
        return ""
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s

# ─────────────────────────────────────────
# 1. 고객 임포트 (거래처.xls)
# ─────────────────────────────────────────
def import_customers():
    print("\n=== 고객 임포트 시작 ===")
    wb = xlrd.open_workbook(f"{BACKUP_DIR}/얼마에요 거래처.xls")
    sh = wb.sheet_by_index(0)
    rows = []
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        # 거래처명 없으면 스킵
        name = clean_str(row[2])
        if not name:
            continue
        # 매출가격 컬럼(29) → price_tier (1~8)
        price_tier_raw = clean_str(row[29])
        try:
            price_tier = int(float(price_tier_raw)) if price_tier_raw else 1
            if price_tier < 1 or price_tier > 8:
                price_tier = 1
        except Exception:
            price_tier = 1

        rows.append({
            "legacy_id":        int(float(row[0])) if row[0] else None,
            "book_name":        clean_str(row[1]),
            "name":             name,
            "business_no":      clean_str(row[3]),
            "ceo_name":         clean_str(row[6]),
            "business_address": clean_str(row[7]),
            "address1":         clean_str(row[11]),
            "address2":         clean_str(row[12]),
            "zip":              clean_str(row[10]),
            "phone1":           clean_str(row[13]),
            "phone2":           clean_str(row[14]),
            "fax":              clean_str(row[15]),
            "manager":          clean_str(row[16]),
            "mobile":           clean_str(row[17]),
            "email":            clean_str(row[18]),
            "business_type":    clean_str(row[8]),
            "business_item":    clean_str(row[9]),
            "price_tier":       price_tier,
            "partner_grade":    "",
            "memo":             clean_str(row[23]),
            "is_active":        True,
        })

    print(f"  총 {len(rows)}명 고객 데이터 준비 완료")
    bulk_insert("customers", rows)

# ─────────────────────────────────────────
# 2. 상품 임포트 (품목대장.xls)
# ─────────────────────────────────────────
def import_products():
    print("\n=== 상품 임포트 시작 ===")
    wb = xlrd.open_workbook(f"{BACKUP_DIR}/품목대장 얼마에요.xls")
    sh = wb.sheet_by_index(0)
    rows = []
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        code = clean_str(row[0])
        name = clean_str(row[2])
        if not name or code.startswith("*"):
            continue

        def price(idx):
            try:
                v = float(row[idx])
                return int(v) if v > 0 else None
            except Exception:
                return None

        rows.append({
            "product_code":   code,
            "name":           name,
            "alias":          clean_str(row[3]),
            "category":       clean_str(row[5]),
            "unit":           clean_str(row[7]),
            "purchase_price": price(8),
            "price1":         price(10),
            "price2":         price(12),
            "price3":         price(14),
            "price4":         price(16),
            "price5":         price(18),
            "price6":         price(20),
            "price7":         price(22),
            "price8":         price(24),
            "is_taxable":     clean_str(row[30]),
            "is_active":      clean_str(row[31]) == "Y",
        })

    print(f"  총 {len(rows)}개 상품 데이터 준비 완료")
    bulk_insert("products", rows)

# ─────────────────────────────────────────
# 3. 거래내역 임포트 (2013~2026)
# ─────────────────────────────────────────
def import_tx_history():
    print("\n=== 거래내역 임포트 시작 ===")
    years = list(range(2013, 2027))
    all_rows = []

    for year in years:
        fname = f"{BACKUP_DIR}/거래내역 {year}.xls"
        try:
            wb = xlrd.open_workbook(fname)
            sh = wb.sheet_by_index(0)
            count = 0
            for r in range(1, sh.nrows):
                row = sh.row_values(r)
                if not row[0]:
                    continue
                tx_date = excel_date_to_str(row[0])
                legacy_id_raw = row[1]
                try:
                    legacy_id = int(float(legacy_id_raw)) if legacy_id_raw else None
                except Exception:
                    legacy_id = None
                try:
                    amount = int(float(row[4])) if row[4] else 0
                except Exception:
                    amount = 0
                try:
                    tax = int(float(row[5])) if row[5] else 0
                except Exception:
                    tax = 0

                all_rows.append({
                    "tx_year":            year,
                    "tx_date":            tx_date,
                    "legacy_customer_id": legacy_id,
                    "customer_name":      clean_str(row[13]) or clean_str(row[2]),
                    "tx_type":            clean_str(row[3]),
                    "amount":             amount,
                    "tax":                tax,
                    "memo":               clean_str(row[6]),
                    "invoice_no":         clean_str(row[7]),
                })
                count += 1
            print(f"  {year}년: {count}건")
        except FileNotFoundError:
            print(f"  {year}년: 파일 없음 (스킵)")

    print(f"  총 {len(all_rows)}건 거래내역 준비 완료")
    bulk_insert("tx_history", all_rows, batch_size=1000)

# ─────────────────────────────────────────
# 실행
# ─────────────────────────────────────────
if __name__ == "__main__":
    import_customers()
    import_products()
    import_tx_history()
    print("\n✅ 임포트 완료!")
