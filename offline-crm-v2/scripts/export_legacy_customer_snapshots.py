#!/usr/bin/env python3
"""
얼마에요 고객 원본 스냅샷을 정적 JSON으로 내보낸다.

- 2026 거래처.xls → legacy_id 기준 최신 장부 원본 보존
- 2024~2026 고객리스트.xls → name 기준 연락처 원본 보존
"""

from __future__ import annotations

import json
import unicodedata
from datetime import datetime
from pathlib import Path

import xlrd


BASE_DIR = Path("/Users/jangjiho/Downloads/얼마에요 백업파일")
OUT_PATH = Path(__file__).resolve().parents[1] / "public" / "data" / "legacy-customer-snapshots.json"


def normalize_file_name(value: str) -> str:
    return unicodedata.normalize("NFC", value)


def find_file(target_name: str) -> Path:
    normalized_target = normalize_file_name(target_name)
    for path in BASE_DIR.iterdir():
        if path.is_file() and normalize_file_name(path.name) == normalized_target:
            return path
    raise FileNotFoundError(target_name)


def find_tradebook_file_2026() -> Path:
    preferred = "2026 거래처 최신본.xls"
    try:
        return find_file(preferred)
    except FileNotFoundError:
        return find_file("2026 거래처.xls")


def clean(value):
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def export_tradebook():
    wb = xlrd.open_workbook(str(find_tradebook_file_2026()))
    sh = wb.sheet_by_index(0)
    by_legacy_id = {}
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        legacy_id = clean(row[0])
        if not legacy_id:
            continue
        by_legacy_id[legacy_id] = {
            "legacy_id": legacy_id,
            "book_name": clean(row[1]),
            "name": clean(row[2]),
            "business_no": clean(row[3]),
            "branch_no": clean(row[4]),
            "corporation_no": clean(row[5]),
            "ceo_name": clean(row[6]),
            "business_address": clean(row[7]),
            "business_type": clean(row[8]),
            "business_item": clean(row[9]),
            "zip": clean(row[10]),
            "address1": clean(row[11]),
            "address2": clean(row[12]),
            "phone1": clean(row[13]),
            "phone2": clean(row[14]),
            "fax": clean(row[15]),
            "manager": clean(row[16]),
            "mobile": clean(row[17]),
            "email": clean(row[18]),
            "email2": clean(row[19]),
            "homepage": clean(row[20]),
            "trade_type": clean(row[21]),
            "tree_type": clean(row[22]),
            "memo": clean(row[23]),
            "related_account": clean(row[24]),
            "category_name": clean(row[25]),
            "sales_manager": clean(row[26]),
            "report_print": clean(row[27]),
            "balance": clean(row[28]),
            "price_tier": clean(row[29]),
            "sms_opt_in": clean(row[30]),
            "fax_opt_in": clean(row[31]),
            "vat_custom": clean(row[32]),
            "auto_category": clean(row[33]),
            "carry_over_balance": clean(row[34]),
            "bank_name": clean(row[35]),
            "bank_account": clean(row[36]),
            "bank_owner": clean(row[37]),
            "rate": clean(row[38]),
        }
    return by_legacy_id


def export_customer_list():
    by_name: dict[str, list[dict[str, str]]] = {}
    for year in (2024, 2025, 2026):
        wb = xlrd.open_workbook(str(find_file(f"{year} 고객리스트.xls")))
        sh = wb.sheet_by_index(0)
        for r in range(1, sh.nrows):
            row = sh.row_values(r)
            name = clean(row[5]) or clean(row[4])
            if not name:
                continue
            by_name.setdefault(name, []).append({
                "serial_no": clean(row[0]),
                "business_no": clean(row[1]),
                "customer_group": clean(row[2]),
                "registered_at": clean(row[3]),
                "customer_name": clean(row[4]),
                "company_department": clean(row[5]),
                "zip": clean(row[6]),
                "address1": clean(row[7]),
                "address2": clean(row[8]),
                "note": clean(row[9]),
                "reference": clean(row[10]),
                "phone_company": clean(row[11]),
                "phone_home": clean(row[12]),
                "mobile": clean(row[13]),
                "email": clean(row[14]),
            })
    return by_name


def main():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "tradebookByLegacyId": export_tradebook(),
        "customerListByName": export_customer_list(),
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False))
    print(OUT_PATH)


if __name__ == "__main__":
    main()
