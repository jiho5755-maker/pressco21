#!/usr/bin/env python3
"""
얼마에요 원본 기준 CRM 데이터셋 재적재 스크립트

목적:
- 2026 거래처를 기준으로 고객 마스터를 재생성
- 2026 고객리스트로 연락처/주소를 보강
- 품목대장과 2013~2026 거래내역을 다시 적재

주의:
- 운영 DB의 truncate/delete는 이 스크립트가 하지 않는다.
- 실행 전 DB 백업 + Customers / Products / tx_history 정리가 끝난 상태를 전제로 한다.
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
import xlrd


BASE_DIR = Path("/Users/jangjiho/Downloads/얼마에요 백업파일")
ENV_PATH = Path(__file__).resolve().parents[1] / ".env.local"
NOCODB_URL = "https://nocodb.pressco21.com"
PROXY_URL = "https://n8n.pressco21.com/webhook/crm-proxy"
PROJECT_ID = "pu0mwk97kac8a5p"
TABLE_IDS = {
    "customers": "mffgxkftaeppyk0",
    "products": "mioztktmluobmmo",
    "tx_history": "mtxh72a1f4beeac",
}
PROXY_TABLES = {
    "customers": "customers",
    "products": "products",
    "tx_history": "txHistory",
}
BATCH_SIZE = 400
TX_YEARS = list(range(2013, 2027))


def load_env_value(key: str) -> str:
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError(f"{key} not found in {ENV_PATH}")


NOCODB_TOKEN = load_env_value("NOCODB_TOKEN")
CRM_KEY = load_env_value("VITE_CRM_API_KEY")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFC", str(value)).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return re.sub(r"\s+", " ", text).strip()


def normalize_key(value: Any) -> str:
    text = normalize_text(value)
    return re.sub(r"\s+", "", text).lower()


def normalize_digits(value: Any) -> str:
    return re.sub(r"\D", "", normalize_text(value))


def parse_int(value: Any) -> int:
    text = normalize_text(value)
    if not text:
        return 0
    try:
        return int(float(text))
    except Exception:
        return 0


def parse_abs_amount(value: Any) -> int:
    return abs(parse_int(value))


def parse_excel_date(value: Any, datemode: int) -> str:
    if value in ("", None):
        return ""
    if isinstance(value, float):
        try:
            return xlrd.xldate_as_datetime(value, datemode).strftime("%Y-%m-%d")
        except Exception:
            return ""
    return normalize_text(value)[:10]


def looks_like_email(value: str) -> bool:
    return "@" in value and "." in value.split("@", 1)[-1]


def looks_like_business_no(value: str) -> bool:
    digits = normalize_digits(value)
    return len(digits) == 10


def classify_customer_type(name: str, memo: str = "") -> str:
    if "비회원" in memo:
        return "ONLINE"
    if "초등학교" in name:
        return "SCHOOL_ELEM"
    if "중학교" in name:
        return "SCHOOL_MID"
    if "고등학교" in name:
        return "SCHOOL_HIGH"
    if "대학교" in name:
        return "SCHOOL_UNIV"
    if "센터" in name or "복지관" in name:
        return "CENTER"
    if "협회" in name or "연합회" in name or "연합" in name:
        return "ASSOC"
    if "공방" in name or "학원" in name or "아카데미" in name:
        return "ACADEMY"
    if "님" in name:
        return "INDIVIDUAL"
    return "OTHER"


def normalize_file_name(path: Path) -> str:
    return unicodedata.normalize("NFC", path.name)


def find_file(target_name: str) -> Path:
    normalized_target = unicodedata.normalize("NFC", target_name)
    for path in BASE_DIR.iterdir():
        if path.is_file() and normalize_file_name(path) == normalized_target:
            return path
    raise FileNotFoundError(target_name)


def find_tradebook_file_2026() -> Path:
    try:
        return find_file("2026 거래처 최신본.xls")
    except FileNotFoundError:
        return find_file("2026 거래처.xls")


def open_sheet(path: Path) -> tuple[xlrd.book.Book, xlrd.sheet.Sheet]:
    workbook = xlrd.open_workbook(str(path))
    return workbook, workbook.sheet_by_index(0)


@dataclass
class AccountRow:
    legacy_id: int
    name: str
    book_name: str
    business_no: str
    ceo_name: str
    business_address: str
    address1: str
    address2: str
    zip_code: str
    phone1: str
    phone2: str
    fax: str
    mobile: str
    email: str
    manager: str
    business_type: str
    business_item: str
    price_tier: int
    memo: str
    report_print: str
    outstanding_balance: int


@dataclass
class CustomerListRow:
    company_dept: str
    customer_name: str
    business_no: str
    zip_code: str
    address1: str
    address2: str
    phone_company: str
    phone_home: str
    mobile: str
    email: str
    note: str
    year: int


def derive_customer_name(book_name: str, customer_name: str) -> str:
    candidate = normalize_text(customer_name)
    compact = re.sub(r"\s+", "", candidate)
    if candidate and compact not in {"", "님"}:
        return candidate
    book = normalize_text(book_name)
    if not book:
        return candidate
    stripped = re.split(r"[\(\（]", book, maxsplit=1)[0].strip()
    return stripped or book


def load_accounts_2026() -> list[AccountRow]:
    path = find_tradebook_file_2026()
    workbook, sheet = open_sheet(path)
    headers = [normalize_text(sheet.cell_value(0, idx)) for idx in range(sheet.ncols)]
    idx = {header: pos for pos, header in enumerate(headers)}

    def cell(row_idx: int, name: str) -> Any:
        return sheet.cell_value(row_idx, idx[name]) if name in idx else ""

    rows: list[AccountRow] = []
    for row_idx in range(1, sheet.nrows):
        legacy_id = parse_int(cell(row_idx, "장부번호"))
        book_name = normalize_text(cell(row_idx, "장부명"))
        raw_name = normalize_text(cell(row_idx, "거래처명"))
        if not legacy_id or not book_name:
            continue
        price_tier = parse_int(cell(row_idx, "매출가격"))
        if price_tier < 1 or price_tier > 8:
            price_tier = 1
        email = normalize_text(cell(row_idx, "이메일"))
        if not looks_like_email(email):
            email = ""
        signed_balance = parse_int(cell(row_idx, "잔액"))
        report_print = normalize_text(cell(row_idx, "보고서출력여부"))
        rows.append(
            AccountRow(
                legacy_id=legacy_id,
                name=derive_customer_name(book_name, raw_name),
                book_name=book_name,
                business_no=normalize_digits(cell(row_idx, "사업번호")),
                ceo_name=normalize_text(cell(row_idx, "대표자")),
                business_address=normalize_text(cell(row_idx, "사업주소")),
                address1=normalize_text(cell(row_idx, "실제주소1")),
                address2=normalize_text(cell(row_idx, "실제주소2")),
                zip_code=normalize_text(cell(row_idx, "우편번호")),
                phone1=normalize_text(cell(row_idx, "전화1")),
                phone2=normalize_text(cell(row_idx, "전화2")),
                fax=normalize_text(cell(row_idx, "팩스")),
                mobile=normalize_text(cell(row_idx, "핸드폰")),
                email=email,
                manager=normalize_text(cell(row_idx, "담당자")),
                business_type=normalize_text(cell(row_idx, "업태")),
                business_item=normalize_text(cell(row_idx, "종목")),
                price_tier=price_tier,
                memo=normalize_text(cell(row_idx, "비고")),
                report_print=report_print,
                outstanding_balance=abs(signed_balance) if signed_balance < 0 and report_print != "거래종료" else 0,
            )
        )
    return rows


def load_customer_lists() -> list[CustomerListRow]:
    rows: list[CustomerListRow] = []
    for year in (2024, 2025, 2026):
        path = find_file(f"{year} 고객리스트.xls")
        _, sheet = open_sheet(path)
        headers = [normalize_text(sheet.cell_value(0, idx)) for idx in range(sheet.ncols)]
        idx = {header: pos for pos, header in enumerate(headers)}

        def cell(row_idx: int, name: str) -> Any:
            return sheet.cell_value(row_idx, idx[name]) if name in idx else ""

        for row_idx in range(1, sheet.nrows):
            rows.append(
                CustomerListRow(
                    company_dept=normalize_text(cell(row_idx, "회사부서")),
                    customer_name=normalize_text(cell(row_idx, "고객명")),
                    business_no=normalize_digits(cell(row_idx, "등록번호")),
                    zip_code=normalize_text(cell(row_idx, "우편번호")),
                    address1=normalize_text(cell(row_idx, "주소1")),
                    address2=normalize_text(cell(row_idx, "주소2")),
                    phone_company=normalize_text(cell(row_idx, "전화번호(회사)")),
                    phone_home=normalize_text(cell(row_idx, "전화번호(집)")),
                    mobile=normalize_text(cell(row_idx, "핸드폰")),
                    email=normalize_text(cell(row_idx, "이메일")),
                    note=normalize_text(cell(row_idx, "특기사항")),
                    year=year,
                )
            )
    return rows


def choose_unique_match(entries: list[CustomerListRow]) -> CustomerListRow | None:
    unique: dict[str, CustomerListRow] = {}
    for entry in sorted(entries, key=lambda item: item.year, reverse=True):
        signature = "|".join(
            [
                normalize_key(entry.company_dept),
                normalize_key(entry.customer_name),
                normalize_digits(entry.business_no),
                normalize_digits(entry.mobile),
                normalize_key(entry.address1),
                normalize_key(entry.address2),
            ]
        )
        if signature not in unique:
            unique[signature] = entry
    values = list(unique.values())
    if len(values) == 1:
        return values[0]
    return values[0] if values else None


def build_customer_list_indices(rows: list[CustomerListRow]) -> dict[str, dict[str, list[CustomerListRow]]]:
    indices: dict[str, dict[str, list[CustomerListRow]]] = {
        "business_no": {},
        "mobile": {},
        "company_dept": {},
        "customer_name": {},
    }
    for row in rows:
        if looks_like_business_no(row.business_no):
            indices["business_no"].setdefault(row.business_no, []).append(row)
        mobile = normalize_digits(row.mobile)
        if mobile:
            indices["mobile"].setdefault(mobile, []).append(row)
        company_key = normalize_key(row.company_dept)
        if company_key:
            indices["company_dept"].setdefault(company_key, []).append(row)
        customer_key = normalize_key(row.customer_name)
        if customer_key:
            indices["customer_name"].setdefault(customer_key, []).append(row)
    return indices


def merge_customer_record(account: AccountRow, indices: dict[str, dict[str, list[CustomerListRow]]]) -> dict[str, Any]:
    match: CustomerListRow | None = None
    if looks_like_business_no(account.business_no):
        match = choose_unique_match(indices["business_no"].get(account.business_no, []))
    if match is None:
        mobile = normalize_digits(account.mobile)
        if mobile:
            match = choose_unique_match(indices["mobile"].get(mobile, []))
    if match is None:
        match = choose_unique_match(indices["company_dept"].get(normalize_key(account.book_name), []))
    if match is None:
        match = choose_unique_match(indices["company_dept"].get(normalize_key(account.name), []))
    if match is None:
        match = choose_unique_match(indices["customer_name"].get(normalize_key(account.name), []))

    email = account.email
    if match and looks_like_email(match.email) and not email:
        email = match.email

    address1 = account.address1 or (match.address1 if match else "")
    address2 = account.address2 or (match.address2 if match else "")
    zip_code = account.zip_code or (match.zip_code if match else "")
    phone1 = account.phone1 or (match.phone_company if match else "")
    phone2 = account.phone2 or (match.phone_home if match else "")
    mobile = account.mobile or (match.mobile if match else "")

    memo_parts = [account.memo]
    if match and match.note and match.note not in memo_parts:
        memo_parts.append(match.note)
    memo = "\n".join(part for part in memo_parts if part)

    return {
        "legacy_id": account.legacy_id,
        "name": account.name,
        "book_name": account.book_name,
        "business_no": account.business_no or (match.business_no if match else ""),
        "ceo_name": account.ceo_name or (match.customer_name if match else ""),
        "business_address": account.business_address,
        "address1": address1,
        "address2": address2,
        "zip": zip_code,
        "phone1": phone1,
        "phone2": phone2,
        "mobile": mobile,
        "fax": account.fax,
        "email": email if looks_like_email(email) else "",
        "manager": account.manager,
        "business_type": account.business_type,
        "business_item": account.business_item,
        "price_tier": account.price_tier,
        "partner_grade": "",
        "memo": memo,
        "is_active": True,
        "outstanding_balance": account.outstanding_balance,
        "customer_type": classify_customer_type(account.name or account.book_name, memo),
        "customer_status": "ACTIVE",
        "member_grade": "MEMBER",
        "total_order_count": 0,
        "total_order_amount": 0,
        "discount_rate": 0,
        "is_ambassador": 0,
    }


def load_products() -> list[dict[str, Any]]:
    path = find_file("품목대장 얼마에요.xls")
    _, sheet = open_sheet(path)
    headers = [normalize_text(sheet.cell_value(0, idx)) for idx in range(sheet.ncols)]
    idx = {header: pos for pos, header in enumerate(headers)}

    def cell(row_idx: int, name: str) -> Any:
        return sheet.cell_value(row_idx, idx[name]) if name in idx else ""

    products: list[dict[str, Any]] = []
    for row_idx in range(1, sheet.nrows):
        name = normalize_text(cell(row_idx, "품목명"))
        if not name:
            continue
        tax_flag = normalize_text(cell(row_idx, "과세여부"))
        is_taxable = "면세" not in tax_flag and tax_flag not in {"0", "N", "n", "False", "false"}
        products.append(
            {
                "product_code": normalize_text(cell(row_idx, "품목코드")),
                "name": name,
                "alias": normalize_text(cell(row_idx, "품목별칭")),
                "category": normalize_text(cell(row_idx, "품목분류")),
                "unit": normalize_text(cell(row_idx, "단위")),
                "purchase_price": parse_int(cell(row_idx, "매입단가")),
                "price1": parse_int(cell(row_idx, "매출단가1")),
                "price2": parse_int(cell(row_idx, "매출단가2")),
                "price3": parse_int(cell(row_idx, "매출단가3")),
                "price4": parse_int(cell(row_idx, "매출단가4")),
                "price5": parse_int(cell(row_idx, "매출단가5")),
                "price6": parse_int(cell(row_idx, "매출단가6")),
                "price7": parse_int(cell(row_idx, "매출단가7")),
                "price8": parse_int(cell(row_idx, "매출단가8")),
                "is_taxable": is_taxable,
                "is_active": True,
            }
        )
    return products


def build_account_lookup(accounts: list[AccountRow]) -> dict[int, AccountRow]:
    return {row.legacy_id: row for row in accounts}


def load_transactions(account_lookup: dict[int, AccountRow]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for year in TX_YEARS:
        try:
            path = find_file(f"거래내역 {year}.xls")
        except FileNotFoundError:
            path = find_file(f"거래내역 {year}.xls")
        workbook, sheet = open_sheet(path)
        headers = [normalize_text(sheet.cell_value(0, idx)) for idx in range(sheet.ncols)]
        idx = {header: pos for pos, header in enumerate(headers)}

        def cell(row_idx: int, name: str) -> Any:
            return sheet.cell_value(row_idx, idx[name]) if name in idx else ""

        for row_idx in range(1, sheet.nrows):
            tx_date = parse_excel_date(cell(row_idx, "거래일"), workbook.datemode)
            if not tx_date:
                continue
            legacy_id = parse_int(cell(row_idx, "장부번호"))
            row_book_name = normalize_text(cell(row_idx, "장부명"))
            row_customer_name = normalize_text(cell(row_idx, "거래처명"))
            account = account_lookup.get(legacy_id)
            display_name = row_book_name or (account.book_name if account else "") or row_customer_name
            if not display_name and account:
                display_name = account.name
            if not display_name:
                display_name = derive_customer_name(row_book_name, row_customer_name)
            records.append(
                {
                    "tx_date": tx_date,
                    "legacy_book_id": str(legacy_id) if legacy_id else "",
                    "customer_name": display_name,
                    "tx_type": normalize_text(cell(row_idx, "거래구분")),
                    "amount": parse_int(cell(row_idx, "금액")),
                    "tax": parse_int(cell(row_idx, "세액")),
                    "memo": normalize_text(cell(row_idx, "적요")),
                    "slip_no": normalize_text(cell(row_idx, "전표번호")),
                    "debit_account": normalize_text(cell(row_idx, "차변계정")),
                    "credit_account": normalize_text(cell(row_idx, "대변계정")),
                    "ledger": normalize_text(cell(row_idx, "거래장부")),
                    "tx_year": year,
                }
            )
    return records


def post_bulk(table_key: str, records: list[dict[str, Any]]) -> int:
    if not records:
        return 0
    payload = {
        "table": PROXY_TABLES[table_key],
        "method": "POST",
        "payload": records,
        "bulk": True,
    }
    response = requests.post(
        PROXY_URL,
        headers={"x-crm-key": CRM_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=120,
    )
    if response.status_code != 200:
        raise RuntimeError(f"{table_key} proxy bulk insert failed: {response.status_code} {response.text[:400]}")
    data = response.json()
    if not data.get("success"):
        raise RuntimeError(f"{table_key} proxy bulk insert failed: {json.dumps(data, ensure_ascii=False)[:400]}")
    return len(records)


def run_bulk_insert(table_key: str, records: list[dict[str, Any]], label: str) -> None:
    total = len(records)
    inserted = 0
    started_at = time.time()
    for start in range(0, total, BATCH_SIZE):
        batch = records[start:start + BATCH_SIZE]
        inserted += post_bulk(table_key, batch)
        elapsed = time.time() - started_at
        print(f"[{label}] {inserted:,}/{total:,} inserted ({elapsed:.1f}s)", end="\r")
        time.sleep(0.15)
    print(f"[{label}] {inserted:,}/{total:,} inserted")


def build_payloads() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    accounts = load_accounts_2026()
    customer_list_rows = load_customer_lists()
    customer_indices = build_customer_list_indices(customer_list_rows)
    customers = [merge_customer_record(account, customer_indices) for account in accounts]
    products = load_products()
    transactions = load_transactions(build_account_lookup(accounts))
    return customers, products, transactions


def print_summary(customers: list[dict[str, Any]], products: list[dict[str, Any]], tx_rows: list[dict[str, Any]]) -> None:
    positive_balances = sum(1 for row in customers if (row.get("outstanding_balance") or 0) > 0)
    total_outstanding = sum(int(row.get("outstanding_balance") or 0) for row in customers)
    print(json.dumps(
        {
            "customers": len(customers),
            "products": len(products),
            "tx_history": len(tx_rows),
            "positive_balance_customers": positive_balances,
            "total_outstanding_balance": total_outstanding,
            "sample_customers": [
                {
                    "legacy_id": row["legacy_id"],
                    "name": row["name"],
                    "book_name": row["book_name"],
                    "outstanding_balance": row["outstanding_balance"],
                }
                for row in customers[:5]
            ],
        },
        ensure_ascii=False,
        indent=2,
    ))


def dump_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    execute = "--execute" in sys.argv
    dump_dir_arg = None
    for idx, arg in enumerate(sys.argv):
        if arg == "--dump-dir" and idx + 1 < len(sys.argv):
            dump_dir_arg = sys.argv[idx + 1]
    customers, products, tx_rows = build_payloads()
    print_summary(customers, products, tx_rows)
    if dump_dir_arg:
        dump_dir = Path(dump_dir_arg).expanduser()
        dump_jsonl(dump_dir / "customers.jsonl", customers)
        dump_jsonl(dump_dir / "products.jsonl", products)
        dump_jsonl(dump_dir / "tx_history.jsonl", tx_rows)
        print(f"\njsonl dump completed: {dump_dir}")
    if not execute:
        print("\n[dry-run] 실제 적재는 수행하지 않습니다. --execute 옵션으로 진행하세요.")
        return

    run_bulk_insert("customers", customers, "customers")
    run_bulk_insert("products", products, "products")
    run_bulk_insert("tx_history", tx_rows, "tx_history")
    print("\n재적재가 완료되었습니다.")


if __name__ == "__main__":
    main()
