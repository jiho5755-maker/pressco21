#!/usr/bin/env python3
"""
2026 회기 기준 미수금 재계산

공식:
- 시작값: 2026 거래처.xls 의 이월기초잔액
- 변화분: 2026 거래내역.xls 의 출고/입금/반입
- 결과: 기초미수 + 출고 - 입금 - 반입

용도:
- 전 고객의 회기 기준 미수 계산 결과를 확인
- 2026 거래처의 잔액(abs)과 일치하는지 검산
- 운영 DB 업데이트용 JSONL 생성
"""

from __future__ import annotations

import json
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import xlrd


BASE_DIR = Path("/Users/jangjiho/Downloads/얼마에요 백업파일")


def normalize_name(path: Path) -> str:
    return unicodedata.normalize("NFC", path.name)


def find_file(name: str) -> Path:
    normalized_target = unicodedata.normalize("NFC", name)
    for path in BASE_DIR.iterdir():
        if path.is_file() and normalize_name(path) == normalized_target:
            return path
    raise FileNotFoundError(name)


def find_tradebook_file_2026() -> Path:
    try:
        return find_file("2026 거래처 최신본.xls")
    except FileNotFoundError:
        return find_file("2026 거래처.xls")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFC", str(value)).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def parse_int(value: Any) -> int:
    text = normalize_text(value)
    if not text:
        return 0
    return int(float(text))


def parse_abs(value: Any) -> int:
    return abs(parse_int(value))


def load_accounts() -> dict[int, dict[str, Any]]:
    path = find_tradebook_file_2026()
    wb = xlrd.open_workbook(str(path))
    sh = wb.sheet_by_index(0)
    headers = [normalize_text(sh.cell_value(0, i)) for i in range(sh.ncols)]
    idx = {header: i for i, header in enumerate(headers)}

    accounts: dict[int, dict[str, Any]] = {}
    for row in range(1, sh.nrows):
        legacy_id = parse_int(sh.cell_value(row, idx["장부번호"]))
        if not legacy_id:
            continue
        accounts[legacy_id] = {
            "legacy_id": legacy_id,
            "book_name": normalize_text(sh.cell_value(row, idx["장부명"])),
            "report_print": normalize_text(sh.cell_value(row, idx["보고서출력여부"])),
            "opening_balance_signed": parse_int(sh.cell_value(row, idx["이월기초잔액"])),
            "opening_balance": parse_abs(sh.cell_value(row, idx["이월기초잔액"])),
            "ledger_balance": parse_abs(sh.cell_value(row, idx["잔액"])),
        }
    return accounts


def load_tx_summary() -> dict[int, dict[str, int]]:
    try:
        path = find_file("거래내역 2026.xls")
    except FileNotFoundError:
        path = find_file("거래내역 2026.xls")
    wb = xlrd.open_workbook(str(path))
    sh = wb.sheet_by_index(0)
    headers = [normalize_text(sh.cell_value(0, i)) for i in range(sh.ncols)]
    idx = {header: i for i, header in enumerate(headers)}

    summary: dict[int, dict[str, int]] = defaultdict(
        lambda: {"출고": 0, "입금": 0, "반입": 0, "receivable_sales": 0, "receivable_payments": 0}
    )
    for row in range(1, sh.nrows):
        legacy_id = parse_int(sh.cell_value(row, idx["장부번호"]))
        if not legacy_id:
            continue
        tx_type = normalize_text(sh.cell_value(row, idx["거래구분"]))
        amount = parse_int(sh.cell_value(row, idx["금액"]))
        debit_account = normalize_text(sh.cell_value(row, idx["차변계정"]))
        credit_account = normalize_text(sh.cell_value(row, idx["대변계정"]))
        if tx_type in summary[legacy_id]:
            summary[legacy_id][tx_type] += amount
        if debit_account == "외상매출":
            summary[legacy_id]["receivable_sales"] += amount
        if credit_account == "외상매출":
            summary[legacy_id]["receivable_payments"] += amount
    return summary


def build_updates() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    accounts = load_accounts()
    tx_summary = load_tx_summary()
    updates: list[dict[str, Any]] = []
    mismatches: list[dict[str, Any]] = []

    for legacy_id, account in sorted(accounts.items()):
        flow = tx_summary.get(
            legacy_id,
            {"출고": 0, "입금": 0, "반입": 0, "receivable_sales": 0, "receivable_payments": 0},
        )
        signed_opening = account["opening_balance_signed"]
        signed_balance = signed_opening - flow["receivable_sales"] + flow["receivable_payments"]
        computed = abs(signed_balance)
        ledger_balance = account["ledger_balance"]
        if computed != ledger_balance:
            mismatches.append(
                {
                    "legacy_id": legacy_id,
                    "book_name": account["book_name"],
                    "opening_balance": account["opening_balance"],
                    "sales": flow["출고"],
                    "payments": flow["입금"],
                    "returns": flow["반입"],
                    "receivable_sales": flow["receivable_sales"],
                    "receivable_payments": flow["receivable_payments"],
                    "computed": computed,
                    "ledger_balance": ledger_balance,
                    "diff": computed - ledger_balance,
                }
            )
        updates.append(
            {
                "legacy_id": legacy_id,
                "book_name": account["book_name"],
                "opening_balance": account["opening_balance"],
                "sales_2026": flow["출고"],
                "payments_2026": flow["입금"],
                "returns_2026": flow["반입"],
                "receivable_sales_2026": flow["receivable_sales"],
                "receivable_payments_2026": flow["receivable_payments"],
                "computed_outstanding_balance": computed,
                "ledger_balance": ledger_balance,
            }
        )

    summary = {
        "customers": len(updates),
        "mismatch_count": len(mismatches),
        "mismatch_samples": mismatches[:20],
        "computed_total": sum(row["computed_outstanding_balance"] for row in updates),
        "ledger_total": sum(row["ledger_balance"] for row in updates),
    }
    return updates, summary


def main() -> None:
    updates, summary = build_updates()
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if "--dump" in __import__("sys").argv:
        out = Path("/Users/jangjiho/workspace/pressco21/offline-crm-v2/output/eolmaeyo-rebuild/fiscal-2026-updates.jsonl")
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("w", encoding="utf-8") as handle:
            for row in updates:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(f"\ndumped: {out}")


if __name__ == "__main__":
    main()
