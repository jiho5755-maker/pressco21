#!/usr/bin/env python3
"""
회기 PDF 기준 미수금/미지급금 스냅샷을 정적 JSON으로 내보낸다.

- 2025, 2026 미수금 미지급급 현황표 PDF를 기준으로 고객별 금액을 추출
- 각 회기 거래처.xls와 legacy_id를 매칭
- 앱에서는 이 스냅샷을 현재 회기 기준 미수/미지급금 진실원본으로 사용
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber
import xlrd


BASE_DIR = Path("/Users/jangjiho/Downloads/얼마에요 백업파일")
OUT_PATH = Path(__file__).resolve().parents[1] / "public" / "data" / "fiscal-balance-snapshots.json"


def normalize_file_name(value: str) -> str:
    return unicodedata.normalize("NFC", value)


def find_file(target_name: str) -> Path:
    normalized_target = normalize_file_name(target_name)
    for path in BASE_DIR.iterdir():
        if path.is_file() and normalize_file_name(path.name) == normalized_target:
            return path
    raise FileNotFoundError(target_name)


def find_tradebook_file(year: int) -> Path:
    if year == 2026:
        try:
            return find_file("2026 거래처 최신본.xls")
        except FileNotFoundError:
            pass
    return find_file(f"{year} 거래처.xls")


def find_fiscal_pdf_file(year: int) -> Path:
    if year == 2026:
        for candidate in ("미수금 미지급금 현황표 2026.pdf", "미수금 미지급급 현황표 2026년 회기년도.pdf"):
            try:
                return find_file(candidate)
            except FileNotFoundError:
                continue
    return find_file(f"미수금 미지급급 현황표 {year}년 회기년도.pdf")


def clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def normalize_name(value: str) -> str:
    return re.sub(r"[^가-힣a-z0-9]", "", (value or "").lower())


MANUAL_ROW_MATCH_BY_PREFIX: dict[tuple[str, str], int] = {
    ("receivable", normalize_name("동궁원")): 30250,
}


def parse_pdf_rows(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            grouped: list[dict[str, Any]] = []
            for word in sorted(page.extract_words(use_text_flow=False), key=lambda item: (item["top"], item["x0"])):
                placed = False
                for row in grouped:
                    if abs(row["y"] - word["top"]) < 3:
                        row["words"].append(word)
                        placed = True
                        break
                if not placed:
                    grouped.append({"y": word["top"], "words": [word]})

            for row in grouped:
                words = sorted(row["words"], key=lambda item: item["x0"])
                text = " ".join(word["text"] for word in words)
                if any(
                    token in text
                    for token in (
                        "프레스코21",
                        "출력일자",
                        "페이지:",
                        "거 래 처 정 보",
                        "미수금(외상매출금)",
                        "미지급금(외상매입금)",
                        "거래처명 대표자 연락번호 담당자",
                        "합 계",
                    )
                ):
                    continue

                left_numbers = [word for word in words if word["x0"] < 120 and re.fullmatch(r"[\d,]+", word["text"])]
                right_numbers = [word for word in words if word["x0"] > 500 and re.fullmatch(r"[\d,]+", word["text"])]
                middle_text = " ".join(word["text"] for word in words if 120 <= word["x0"] <= 500).strip()
                if not middle_text:
                    continue

                if left_numbers:
                    rows.append({
                        "kind": "receivable",
                        "amount": int(left_numbers[0]["text"].replace(",", "")),
                        "name_raw": middle_text,
                    })
                if right_numbers:
                    rows.append({
                        "kind": "payable",
                        "amount": int(right_numbers[0]["text"].replace(",", "")),
                        "name_raw": middle_text,
                    })
    return rows


def load_tradebook(year: int) -> list[dict[str, Any]]:
    path = find_tradebook_file(year)
    workbook = xlrd.open_workbook(str(path))
    sheet = workbook.sheet_by_index(0)
    headers = [clean(sheet.cell_value(0, idx)) for idx in range(sheet.ncols)]
    idx = {header: pos for pos, header in enumerate(headers)}
    rows: list[dict[str, Any]] = []
    for row_idx in range(1, sheet.nrows):
        try:
            legacy_id = int(float(sheet.cell_value(row_idx, idx["장부번호"])))
            balance = int(float(sheet.cell_value(row_idx, idx["잔액"])))
        except Exception:
            continue
        rows.append({
            "legacy_id": legacy_id,
            "book_name": clean(sheet.cell_value(row_idx, idx["장부명"])),
            "name": clean(sheet.cell_value(row_idx, idx["거래처명"])),
            "balance": balance,
            "report_print": clean(sheet.cell_value(row_idx, idx["보고서출력여부"])),
        })
    return rows


def match_pdf_rows_to_tradebook(pdf_rows: list[dict[str, Any]], ledger_rows: list[dict[str, Any]]) -> tuple[dict[str, int], dict[str, int], list[dict[str, Any]]]:
    receivables: dict[str, int] = {}
    payables: dict[str, int] = {}
    unmatched: list[dict[str, Any]] = []

    for row in pdf_rows:
        name_prefix = normalize_name(re.split(r"\d", row["name_raw"])[0])
        amount = row["amount"]
        manual_match = next(
            (
                legacy_id
                for (kind, prefix), legacy_id in MANUAL_ROW_MATCH_BY_PREFIX.items()
                if row["kind"] == kind and name_prefix.startswith(prefix)
            ),
            None,
        )
        if manual_match is not None:
            legacy_id = manual_match
            if row["kind"] == "receivable":
                receivables[str(legacy_id)] = amount
            else:
                payables[str(legacy_id)] = amount
            continue
        exact_candidates: list[tuple[int, dict[str, Any]]] = []
        fallback_candidates: list[tuple[int, dict[str, Any]]] = []
        for item in ledger_rows:
            if row["kind"] == "receivable" and item["balance"] >= 0:
                continue
            if row["kind"] == "payable" and item["balance"] <= 0:
                continue
            item_book = normalize_name(item["book_name"])
            item_name = normalize_name(item["name"])
            same_amount = abs(item["balance"]) == amount
            prefix_match = bool(
                name_prefix and (
                    item_book.startswith(name_prefix) or
                    name_prefix.startswith(item_book) or
                    item_name.startswith(name_prefix) or
                    name_prefix.startswith(item_name)
                )
            )
            partial_match = bool(name_prefix and (name_prefix in item_book or name_prefix in item_name))
            if same_amount and prefix_match:
                exact_candidates.append((100, item))
            elif same_amount and partial_match:
                exact_candidates.append((80, item))
            elif same_amount:
                exact_candidates.append((50, item))
            elif prefix_match:
                fallback_candidates.append((30, item))
            elif partial_match:
                fallback_candidates.append((10, item))

        candidates = exact_candidates if exact_candidates else fallback_candidates
        if not candidates:
            unmatched.append(row)
            continue

        candidates.sort(key=lambda item: (-item[0], item[1]["legacy_id"]))
        best_score = candidates[0][0]
        best_candidates = [item for item in candidates if item[0] == best_score]
        if not exact_candidates and len(best_candidates) != 1:
          unmatched.append(row)
          continue
        chosen = best_candidates[0][1]

        if row["kind"] == "receivable":
            receivables[str(chosen["legacy_id"])] = amount
        else:
            payables[str(chosen["legacy_id"])] = amount

    return receivables, payables, unmatched


def export_year(year: int) -> dict[str, Any]:
    ledger_rows = load_tradebook(year)
    pdf_rows = parse_pdf_rows(find_fiscal_pdf_file(year))
    receivables, payables, unmatched = match_pdf_rows_to_tradebook(pdf_rows, ledger_rows)
    return {
        "receivablesByLegacyId": receivables,
        "payablesByLegacyId": payables,
        "unmatchedRows": unmatched,
        "receivableTotal": sum(receivables.values()),
        "payableTotal": sum(payables.values()),
    }


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "currentFiscalYear": 2026,
        "years": {
            "2025": export_year(2025),
            "2026": export_year(2026),
        },
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False))
    print(OUT_PATH)


if __name__ == "__main__":
    main()
