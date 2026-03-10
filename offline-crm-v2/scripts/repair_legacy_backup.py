#!/usr/bin/env python3
"""
레거시 얼마에요 백업 보정 스크립트

목표:
- 거래처명 공란으로 누락된 고객 15건 복구
- 해당 legacy_id 거래내역의 blank customer_name 연결 복구
- 레거시 잔액 75건 + 누락 1건 반영
- 고객리스트 기반 연락처/주소 누락 보강
- 누락 품목 1건 복구

주의:
- CRM 명세표(invoices)는 수정하지 않는다.
- 운영 반영 전 현재 대상 레코드를 JSON으로 백업한다.
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import xlrd


BACKUP_DIR = Path("/Users/jangjiho/Downloads/얼마에요 백업파일")
ENV_PATH = Path(__file__).resolve().parents[1] / ".env.local"
PROXY_URL = "https://n8n.pressco21.com/webhook/crm-proxy"
NOCODB_URL = "https://nocodb.pressco21.com"
PROJECT_ID = "pu0mwk97kac8a5p"
TABLE_IDS = {
    "customers": "mffgxkftaeppyk0",
    "products": "mioztktmluobmmo",
    "txHistory": "mtxh72a1f4beeac",
}
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "legacy-backup-repair"
TODAY = date.today()


def load_env_value(key: str) -> str:
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError(f"{key} not found in .env.local")


CRM_KEY = load_env_value("VITE_CRM_API_KEY")
NOCODB_TOKEN = load_env_value("NOCODB_TOKEN")


def clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def to_int(value: Any) -> int:
    if value in ("", None):
        return 0
    try:
        return int(float(value))
    except Exception:
        return 0


def excel_date(value: Any, datemode: int) -> str:
    if value in ("", None):
        return ""
    if isinstance(value, float):
        try:
            return xlrd.xldate_as_datetime(value, datemode).strftime("%Y-%m-%d")
        except Exception:
            return ""
    return clean(value)[:10]


def is_valid_email(value: str) -> bool:
    return "@" in value and "." in value.split("@", 1)[-1]


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    return digits


def looks_like_phone(value: str) -> bool:
    digits = normalize_phone(value)
    return len(digits) >= 9


def classify_status(last_order_date: str) -> str:
    if not last_order_date:
        return "CHURNED"
    last = datetime.strptime(last_order_date[:10], "%Y-%m-%d").date()
    months = (TODAY.year - last.year) * 12 + (TODAY.month - last.month)
    if months <= 12:
        return "ACTIVE"
    if months <= 36:
        return "DORMANT"
    return "CHURNED"


def proxy(table: str, method: str = "GET", params: dict[str, Any] | None = None,
          payload: Any | None = None, record_id: int | None = None, bulk: bool = False) -> Any:
    body: dict[str, Any] = {"table": table, "method": method}
    if params is not None:
        body["params"] = params
    if payload is not None:
        body["payload"] = payload
    if record_id is not None:
        body["recordId"] = record_id
    if bulk:
        body["bulk"] = True

    req = urllib.request.Request(
        PROXY_URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-crm-key": CRM_KEY,
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        data = json.load(response)
    if not data.get("success"):
        raise RuntimeError(data)
    return data["data"]


def nocodb_write(table: str, method: str, payload: Any, record_id: int | None = None, bulk: bool = False) -> Any:
    table_id = TABLE_IDS[table]
    if bulk:
        url = f"{NOCODB_URL}/api/v1/db/data/bulk/noco/{PROJECT_ID}/{table_id}"
    elif record_id is not None:
        url = f"{NOCODB_URL}/api/v1/db/data/noco/{PROJECT_ID}/{table_id}/{record_id}"
    else:
        url = f"{NOCODB_URL}/api/v1/db/data/noco/{PROJECT_ID}/{table_id}"

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method=method,
        headers={
            "Content-Type": "application/json",
            "xc-token": NOCODB_TOKEN,
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        if response.status == 204:
            return None
        raw = response.read().decode()
        return json.loads(raw) if raw else None


def fetch_all(table: str, fields: str, where: str | None = None, limit: int = 1000) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        params: dict[str, Any] = {"limit": limit, "offset": offset, "fields": fields}
        if where:
            params["where"] = where
        data = proxy(table, params=params)
        batch = data.get("list", [])
        rows.extend(batch)
        page = data.get("pageInfo", {})
        if page.get("isLastPage") or len(batch) < limit:
            break
        offset += len(batch)
    return rows


def build_or_eq_where(field: str, values: list[str], chunk_size: int = 10) -> list[str]:
    normalized = [clean(value) for value in values if clean(value)]
    clauses: list[str] = []
    for start in range(0, len(normalized), chunk_size):
        chunk = normalized[start:start + chunk_size]
        clause = "~or".join(f"({field},eq,{value})" for value in chunk)
        if clause:
            clauses.append(clause)
    return clauses


def fetch_tx_for_legacy_ids(legacy_ids: set[str], fields: str) -> list[dict[str, Any]]:
    if not legacy_ids:
        return []
    rows: list[dict[str, Any]] = []
    for where in build_or_eq_where("legacy_book_id", sorted(legacy_ids)):
        rows.extend(fetch_all("txHistory", fields, where=where, limit=1000))
    return rows


def compact_customer_patch(current: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any] | None:
    compacted: dict[str, Any] = {"Id": int(patch["Id"])}
    for field, new_value in patch.items():
        if field == "Id":
            continue
        current_value = current.get(field)
        if isinstance(new_value, int):
            if to_int(current_value) == new_value:
                continue
        elif new_value in (None, ""):
            if clean(current_value) == "":
                continue
        else:
            if clean(current_value) == clean(new_value):
                continue
        compacted[field] = new_value
    if len(compacted) == 1:
        return None
    return compacted


def bulk_write(table: str, method: str, rows: list[dict[str, Any]], chunk_size: int = 200) -> None:
    for start in range(0, len(rows), chunk_size):
        chunk = rows[start:start + chunk_size]
        try:
            proxy(table, method=method, payload=chunk, bulk=True)
        except Exception:
            try:
                nocodb_write(table, method, chunk, bulk=True)
                continue
            except Exception:
                # 프록시/direct bulk 둘 다 막히면 개별 요청으로 fallback
                for row in chunk:
                    if method == "POST":
                        try:
                            proxy(table, method="POST", payload=row)
                        except Exception:
                            nocodb_write(table, "POST", row)
                    elif method == "PATCH":
                        record_id = int(row["Id"])
                        payload = dict(row)
                        payload.pop("Id", None)
                        try:
                            proxy(table, method="PATCH", record_id=record_id, payload=payload)
                        except Exception:
                            nocodb_write(table, "PATCH", payload, record_id=record_id)
                    else:
                        raise


@dataclass
class BackupCustomer:
    legacy_id: str
    book_name: str
    name: str
    business_no: str
    ceo_name: str
    business_address: str
    address1: str
    address2: str
    zip_code: str
    phone1: str
    phone2: str
    fax: str
    manager: str
    mobile: str
    email: str
    business_type: str
    business_item: str
    memo: str
    price_tier: int
    balance: int


def load_backup_customers() -> tuple[list[BackupCustomer], list[BackupCustomer]]:
    wb = xlrd.open_workbook(str(BACKUP_DIR / "얼마에요 거래처.xls"))
    sh = wb.sheet_by_index(0)
    named: list[BackupCustomer] = []
    blank_named: list[BackupCustomer] = []
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        record = BackupCustomer(
            legacy_id=clean(row[0]),
            book_name=clean(row[1]),
            name=clean(row[2]),
            business_no=clean(row[3]),
            ceo_name=clean(row[6]),
            business_address=clean(row[7]),
            address1=clean(row[11]),
            address2=clean(row[12]),
            zip_code=clean(row[10]),
            phone1=clean(row[13]),
            phone2=clean(row[14]),
            fax=clean(row[15]),
            manager=clean(row[16]),
            mobile=clean(row[17]),
            email=clean(row[18]),
            business_type=clean(row[8]),
            business_item=clean(row[9]),
            memo=clean(row[23]),
            price_tier=max(1, min(8, to_int(row[29]) or 1)),
            balance=to_int(row[28]),
        )
        if record.name:
            named.append(record)
        elif record.book_name:
            blank_named.append(record)
    return named, blank_named


def load_customer_list() -> list[dict[str, str]]:
    wb = xlrd.open_workbook(str(BACKUP_DIR / "고객리스트 전체자료.xls"))
    sh = wb.sheet_by_index(0)
    rows: list[dict[str, str]] = []
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        name = clean(row[5]) or clean(row[4])
        if not name:
            continue
        rows.append({
            "name": name,
            "business_no": clean(row[1]),
            "address1": clean(row[7]),
            "address2": clean(row[8]),
            "phone1": clean(row[11]) or clean(row[12]),
            "mobile": clean(row[13]),
            "email": clean(row[14]),
        })
    return rows


def load_products_backup() -> dict[str, dict[str, Any]]:
    wb = xlrd.open_workbook(str(BACKUP_DIR / "품목대장 얼마에요.xls"))
    sh = wb.sheet_by_index(0)
    products: dict[str, dict[str, Any]] = {}
    for r in range(1, sh.nrows):
        row = sh.row_values(r)
        code = clean(row[0])
        name = clean(row[2])
        if not name or code.startswith("*"):
            continue
        products[code] = {
            "product_code": code,
            "name": name,
            "alias": clean(row[3]),
            "category": clean(row[5]),
            "unit": clean(row[7]),
            "purchase_price": to_int(row[8]) or None,
            "price1": to_int(row[10]) or None,
            "price2": to_int(row[12]) or None,
            "price3": to_int(row[14]) or None,
            "price4": to_int(row[16]) or None,
            "price5": to_int(row[18]) or None,
            "price6": to_int(row[20]) or None,
            "price7": to_int(row[22]) or None,
            "price8": to_int(row[24]) or None,
            "is_taxable": clean(row[30]),
            "is_active": clean(row[31]) == "Y",
        }
    return products


def load_backup_tx(blank_customer_legacy_ids: set[str]) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    aggregates: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "count": 0,
        "amount": 0,
        "first": "",
        "last": "",
    })
    blank_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for year in range(2013, 2027):
        wb = xlrd.open_workbook(str(BACKUP_DIR / f"거래내역 {year}.xls"))
        sh = wb.sheet_by_index(0)
        for r in range(1, sh.nrows):
            row = sh.row_values(r)
            if not row[0]:
                continue
            legacy_id = clean(row[1])
            tx_date = excel_date(row[0], wb.datemode)
            tx_type = clean(row[3])
            customer_name = clean(row[13])
            amount = to_int(row[4])
            if tx_type == "출고" and legacy_id:
                agg = aggregates[legacy_id]
                agg["count"] += 1
                agg["amount"] += amount
                if tx_date and (not agg["first"] or tx_date < agg["first"]):
                    agg["first"] = tx_date
                if tx_date and (not agg["last"] or tx_date > agg["last"]):
                    agg["last"] = tx_date

            if legacy_id in blank_customer_legacy_ids and not customer_name:
                blank_rows[legacy_id].append({
                    "year": year,
                    "tx_date": tx_date,
                    "tx_type": tx_type,
                    "amount": amount,
                    "tax": to_int(row[5]),
                    "slip_no": clean(row[7]),
                })
    return aggregates, blank_rows


def backup_current_state(backup_path: Path, rows_by_table: dict[str, list[dict[str, Any]]]) -> None:
    backup_path.mkdir(parents=True, exist_ok=True)
    for table, rows in rows_by_table.items():
        (backup_path / f"{table}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2))


def main() -> None:
    apply_mode = "--apply" in sys.argv
    skip_tx = "--skip-tx" in sys.argv
    skip_products = "--skip-products" in sys.argv

    named_customers, blank_named_customers = load_backup_customers()
    customer_list_rows = load_customer_list()
    products_backup = load_products_backup()
    blank_legacy_ids = {row.legacy_id for row in blank_named_customers}
    backup_aggregates, blank_backup_rows = load_backup_tx(blank_legacy_ids)

    crm_customers = fetch_all(
        "customers",
        "Id,legacy_id,name,book_name,business_no,ceo_name,business_address,address1,address2,zip,phone1,phone2,fax,manager,mobile,email,business_type,business_item,memo,price_tier,outstanding_balance,total_order_count,total_order_amount,last_order_date,first_order_date,customer_status,is_active"
    )
    crm_tx = fetch_tx_for_legacy_ids(
        blank_legacy_ids,
        "Id,legacy_book_id,customer_name,tx_type,tx_date,amount,tax,slip_no,tx_year",
    )
    crm_products = fetch_all("products", "Id,product_code,name,unit,is_active")

    customers_by_id = {int(row["Id"]): row for row in crm_customers}
    customers_by_legacy = {clean(row.get("legacy_id")): row for row in crm_customers if clean(row.get("legacy_id"))}
    customers_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in crm_customers:
        customers_by_name[clean(row.get("name"))].append(row)

    product_codes = {clean(row.get("product_code")) for row in crm_products}

    customer_updates: dict[int, dict[str, Any]] = {}
    customer_creates: list[dict[str, Any]] = []
    tx_updates: list[dict[str, Any]] = []
    product_creates: list[dict[str, Any]] = []

    skipped_resolution: dict[str, str] = {}

    # 1) 거래처명 공란 15건 복구
    for backup in blank_named_customers:
        existing = customers_by_legacy.get(backup.legacy_id)
        exact_matches = customers_by_name.get(backup.book_name, [])
        if existing:
            pass
        elif len(exact_matches) == 1 and not clean(exact_matches[0].get("legacy_id")):
            existing = exact_matches[0]
        elif backup.legacy_id == "721":
            for candidate in customers_by_name.get("서상견 님", []):
                if normalize_phone(clean(candidate.get("mobile"))) == normalize_phone(backup.mobile):
                    existing = candidate
                    break

        canonical_name = clean(existing.get("name")) if existing else backup.book_name
        skipped_resolution[backup.legacy_id] = canonical_name

        agg = backup_aggregates.get(backup.legacy_id, {"count": 0, "amount": 0, "first": "", "last": ""})
        patch = {
            "legacy_id": backup.legacy_id,
            "book_name": backup.book_name,
            "business_no": backup.business_no or None,
            "ceo_name": backup.ceo_name or None,
            "business_address": backup.business_address or None,
            "address1": backup.address1 or None,
            "address2": backup.address2 or None,
            "zip": backup.zip_code or None,
            "phone1": backup.phone1 or None,
            "phone2": backup.phone2 or None,
            "fax": backup.fax or None,
            "manager": backup.manager or None,
            "mobile": backup.mobile or None,
            "business_type": backup.business_type or None,
            "business_item": backup.business_item or None,
            "price_tier": backup.price_tier,
            "memo": backup.memo or None,
            "first_order_date": agg["first"] or None,
            "last_order_date": agg["last"] or None,
            "total_order_count": agg["count"],
            "total_order_amount": agg["amount"],
            "outstanding_balance": backup.balance,
            "customer_status": classify_status(agg["last"]),
            "is_active": 1,
        }
        if is_valid_email(backup.email):
            patch["email"] = backup.email

        if existing:
            customer_updates[int(existing["Id"])] = {"Id": int(existing["Id"]), **patch}
        else:
            customer_creates.append({
                "name": canonical_name,
                **patch,
            })

    # 2) 레거시 잔액 75건 보정
    for backup in named_customers:
        crm = customers_by_legacy.get(backup.legacy_id)
        if not crm:
            continue
        crm_balance = to_int(crm.get("outstanding_balance"))
        if crm_balance != backup.balance:
            patch = customer_updates.setdefault(int(crm["Id"]), {"Id": int(crm["Id"])})
            patch["outstanding_balance"] = backup.balance

    # 3) 고객리스트 기반 연락처/주소 보강
    for row in customer_list_rows:
        matches = customers_by_name.get(row["name"], [])
        if len(matches) != 1:
            continue
        crm = matches[0]
        customer_id = int(crm["Id"])
        had_existing_patch = customer_id in customer_updates
        patch = customer_updates.setdefault(customer_id, {"Id": customer_id})
        before_len = len(patch)

        current_phone = clean(crm.get("phone1"))
        current_mobile = clean(crm.get("mobile"))
        current_email = clean(crm.get("email"))
        current_address1 = clean(crm.get("address1"))
        current_address2 = clean(crm.get("address2"))
        current_biz = clean(crm.get("business_no"))

        if row["phone1"] and not current_phone:
            patch["phone1"] = row["phone1"]
        if row["address1"] and not current_address1:
            patch["address1"] = row["address1"]
        if row["address2"] and not current_address2:
            patch["address2"] = row["address2"]
        if row["business_no"] and not current_biz:
            patch["business_no"] = row["business_no"]
        if row["mobile"] and looks_like_phone(row["mobile"]):
            if not current_mobile or not looks_like_phone(current_mobile):
                patch["mobile"] = row["mobile"]
        if row["email"] and is_valid_email(row["email"]):
            if not is_valid_email(current_email):
                patch["email"] = row["email"]

        if len(patch) == before_len and not had_existing_patch:
            customer_updates.pop(customer_id, None)

    # 4) txHistory blank customer_name 복구 (누락 고객 6명 관련 237건)
    skipped_id_set = set(skipped_resolution)
    for row in crm_tx:
        legacy_id = clean(row.get("legacy_book_id"))
        if legacy_id not in skipped_id_set:
            continue
        if clean(row.get("customer_name")):
            continue
        tx_updates.append({
            "Id": int(row["Id"]),
            "customer_name": skipped_resolution[legacy_id],
        })

    # 5) 누락 품목 1건 복구
    if "10226" in products_backup and "10226" not in product_codes:
        product_creates.append(products_backup["10226"])

    if skip_tx:
        tx_updates = []
    if skip_products:
        product_creates = []

    compacted_updates: dict[int, dict[str, Any]] = {}
    for customer_id, patch in customer_updates.items():
        compacted = compact_customer_patch(customers_by_id[customer_id], patch)
        if compacted:
            compacted_updates[customer_id] = compacted
    customer_updates = compacted_updates

    summary = {
        "customer_updates": len(customer_updates),
        "customer_creates": len(customer_creates),
        "tx_updates": len(tx_updates),
        "product_creates": len(product_creates),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if not apply_mode:
        print("dry-run complete")
        return

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = OUTPUT_DIR / timestamp

    existing_customer_ids = sorted(customer_updates.keys())
    existing_tx_ids = sorted(int(row["Id"]) for row in tx_updates)
    existing_customers_backup = [customers_by_id[row_id] for row_id in existing_customer_ids]
    existing_tx_backup = [row for row in crm_tx if int(row["Id"]) in set(existing_tx_ids)]
    existing_products_backup = [row for row in crm_products if clean(row.get("product_code")) == "10226"]

    backup_current_state(backup_path, {
        "customers-before": existing_customers_backup,
        "txHistory-before": existing_tx_backup,
        "products-before": existing_products_backup,
        "planned-customer-creates": customer_creates,
        "planned-customer-updates": list(customer_updates.values()),
        "planned-tx-updates": tx_updates,
        "planned-product-creates": product_creates,
    })

    if customer_updates:
        bulk_write("customers", "PATCH", list(customer_updates.values()))
    if customer_creates:
        bulk_write("customers", "POST", customer_creates)
    if tx_updates:
        bulk_write("txHistory", "PATCH", tx_updates)
    if product_creates:
        bulk_write("products", "POST", product_creates)

    # 후검증
    post_customers = fetch_all("customers", "Id,legacy_id,name,book_name,outstanding_balance,phone1,address1,address2,mobile,email")
    post_products = fetch_all("products", "Id,product_code,name")
    post_tx = fetch_tx_for_legacy_ids(blank_legacy_ids, "Id,legacy_book_id,customer_name")

    post_by_legacy = {clean(row.get("legacy_id")): row for row in post_customers if clean(row.get("legacy_id"))}
    unresolved_blank_customers = [row.legacy_id for row in blank_named_customers if row.legacy_id not in post_by_legacy]
    unresolved_balances = []
    for backup in named_customers:
        crm = post_by_legacy.get(backup.legacy_id)
        if not crm:
            continue
        if to_int(crm.get("outstanding_balance")) != backup.balance:
            unresolved_balances.append(backup.legacy_id)
    if "721" in post_by_legacy and to_int(post_by_legacy["721"].get("outstanding_balance")) != next(row.balance for row in blank_named_customers if row.legacy_id == "721"):
        unresolved_balances.append("721")

    post_blank_tx = [
        row for row in post_tx
        if clean(row.get("legacy_book_id")) in skipped_id_set and not clean(row.get("customer_name"))
    ]
    post_codes = {clean(row.get("product_code")) for row in post_products}

    verify = {
        "backup_dir": str(backup_path),
        "unresolved_blank_customers": unresolved_blank_customers,
        "unresolved_balance_legacy_ids": unresolved_balances,
        "remaining_blank_tx_for_skipped_customers": len(post_blank_tx),
        "product_10226_exists": "10226" in post_codes,
    }
    (backup_path / "verification.json").write_text(json.dumps(verify, ensure_ascii=False, indent=2))
    print(json.dumps(verify, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
