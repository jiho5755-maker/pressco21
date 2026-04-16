#!/usr/bin/env python3
"""
미팅용 상세 매트릭스 빌드:
- 채널 × SKU 매트릭스 (수량/금액)
- SKU × 월 매트릭스
- 채널 × 월 매트릭스 (이미 data_for_slides에 있지만 더 자세히)

소스: reginus_sales_results.json
출력: 미팅자료_20260414/sales_matrices.md, sales_matrices.json
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

INPUT = Path("/Users/jangjiho/workspace/pressco21/tools/openmarket/reginus_sales_results.json")
OUT_MD = Path("/Users/jangjiho/Desktop/프레스코21/레지너스/미팅자료_20260414/sales_matrices.md")
OUT_JSON = Path("/Users/jangjiho/Desktop/프레스코21/레지너스/미팅자료_20260414/sales_matrices.json")

# ===== SKU 표준화 =====
PRO_KEYS = ["프로", "Pro", "PRO"]
STD_KEYS = ["일반", "Standard", "Std"]


def std_sku(name: str) -> str:
    n = name or ""
    is_pro = any(k in n for k in PRO_KEYS)
    is_std = any(k in n for k in STD_KEYS)
    if "탈포" in n or "Bubble Removal" in n:
        if is_pro:
            return "탈포기 프로"
        if is_std:
            return "탈포기 일반"
        return "탈포기"
    if "듀얼" in n or "믹서" in n or "Mix" in n:
        return "듀얼 헤드 믹서"
    if "UV" in n.upper() or "uv" in n:
        return "UV 램프"
    if "유해가스" in n or "청정기" in n or "Air purifier" in n or "Air Purifier" in n:
        if "필터" in n or "filter" in n.lower():
            return "청정기 필터"
        return "유해가스 청정기"
    if "큐어링" in n or "Curing" in n:
        return "큐어링 머신"
    if "필터" in n:
        return "청정기 필터"
    return n[:25]


SKU_ORDER = [
    "유해가스 청정기",
    "큐어링 머신",
    "탈포기 프로",
    "탈포기 일반",
    "듀얼 헤드 믹서",
    "UV 램프",
    "청정기 필터",
]

CHANNEL_ORDER = [
    "직거래(B2B)",
    "네이버스마트스토어",
    "메이크샵",
    "쿠팡",
    "11번가",
]


def main():
    data = json.loads(INPUT.read_text())

    # ===== 1. 모든 sales 라인을 (채널, SKU, 월, 수량, 금액) 형식으로 평탄화 =====
    flat = []  # {channel, sku, month, qty, amount}

    # 메이크샵
    for s in data.get("makeshop", []):
        if s.get("cancelled"):
            continue
        flat.append({
            "channel": "메이크샵",
            "sku": std_sku(s.get("product_name", "")),
            "month": (s.get("date") or "")[:7],
            "qty": int(s.get("qty", 0) or 0),
            "amount": int(s.get("amount", 0) or 0),
        })

    # 네이버
    for s in data.get("naver", []):
        if s.get("cancelled"):
            continue
        flat.append({
            "channel": "네이버스마트스토어",
            "sku": std_sku(s.get("product_name", "")),
            "month": (s.get("date") or "")[:7],
            "qty": int(s.get("qty", 0) or 0),
            "amount": int(s.get("amount", 0) or 0),
        })

    # 11번가
    for s in data.get("st11", []):
        flat.append({
            "channel": "11번가",
            "sku": std_sku(s.get("product_name", "")),
            "month": (s.get("date") or "")[:7],
            "qty": int(s.get("qty", 0) or 0),
            "amount": int(s.get("amount", 0) or 0),
        })

    # 쿠팡 (사용자 스크린샷)
    for s in data.get("coupang", []):
        flat.append({
            "channel": "쿠팡",
            "sku": std_sku(s.get("product_name", "")),
            "month": (s.get("date") or "")[:7],
            "qty": int(s.get("qty", 0) or 0),
            "amount": int(s.get("amount", 0) or 0),
        })

    # 직거래 = CRM 정산 + 마니랜드 견적서
    for s in data.get("crm", []):
        flat.append({
            "channel": "직거래(B2B)",
            "sku": std_sku(s.get("product_name", "")),
            "month": (s.get("date") or "")[:7],
            "qty": int(s.get("qty", 0) or 0),
            "amount": int(s.get("total_amount", 0) or s.get("amount", 0) or 0),
        })

    # 마니랜드 견적서 → 직거래로
    for q in data.get("manilad_quotes", []):
        m = re.search(r"\((\d{2})\.(\d{2})\.(\d{2})\)", q.get("file", ""))
        if not m:
            continue
        ym = f"20{m.group(1)}-{m.group(2)}"
        for it in q.get("items", []):
            if not it.get("is_reginus"):
                continue
            flat.append({
                "channel": "직거래(B2B)",
                "sku": std_sku(it.get("name", "")),
                "month": ym,
                "qty": int(it.get("qty", 0) or 0),
                "amount": int(it.get("amount", 0) or 0),
            })

    # ===== 2. 매트릭스 빌드 =====
    # (a) 채널 × SKU 매트릭스
    ch_sku_qty = defaultdict(lambda: defaultdict(int))
    ch_sku_amt = defaultdict(lambda: defaultdict(int))
    for r in flat:
        ch_sku_qty[r["channel"]][r["sku"]] += r["qty"]
        ch_sku_amt[r["channel"]][r["sku"]] += r["amount"]

    # (b) 채널 × 월 매트릭스
    ch_month_qty = defaultdict(lambda: defaultdict(int))
    ch_month_amt = defaultdict(lambda: defaultdict(int))
    for r in flat:
        if r["month"]:
            ch_month_qty[r["channel"]][r["month"]] += r["qty"]
            ch_month_amt[r["channel"]][r["month"]] += r["amount"]

    # (c) SKU × 월 매트릭스
    sku_month_qty = defaultdict(lambda: defaultdict(int))
    sku_month_amt = defaultdict(lambda: defaultdict(int))
    for r in flat:
        if r["month"]:
            sku_month_qty[r["sku"]][r["month"]] += r["qty"]
            sku_month_amt[r["sku"]][r["month"]] += r["amount"]

    all_months = sorted({r["month"] for r in flat if r["month"] and r["month"] >= "2025-08"})
    all_skus = SKU_ORDER + [s for s in {r["sku"] for r in flat} if s not in SKU_ORDER]
    all_channels = CHANNEL_ORDER

    # ===== 3. JSON 저장 =====
    out_json = {
        "channel_x_sku_qty": {ch: dict(ch_sku_qty[ch]) for ch in all_channels},
        "channel_x_sku_amount": {ch: dict(ch_sku_amt[ch]) for ch in all_channels},
        "channel_x_month_amount": {ch: dict(ch_month_amt[ch]) for ch in all_channels},
        "sku_x_month_qty": {sku: dict(sku_month_qty[sku]) for sku in all_skus if sku in sku_month_qty},
        "sku_x_month_amount": {sku: dict(sku_month_amt[sku]) for sku in all_skus if sku in sku_month_amt},
        "all_months": all_months,
        "raw_lines_count": len(flat),
    }
    OUT_JSON.write_text(json.dumps(out_json, ensure_ascii=False, indent=2))

    # ===== 4. Markdown 출력 =====
    md = []
    md.append("# 레지너스 매출 상세 매트릭스 (2026-04-14)")
    md.append("")
    md.append("> 채널 × SKU × 월 3차원 분해 데이터")
    md.append("> 소스: 5채널 API 추출 + 마니랜드 견적서 6건 (2025-08-01 ~ 2026-04-14)")
    md.append("")
    md.append("---")
    md.append("")

    # === A. 채널 × SKU (수량) ===
    md.append("## A. 채널 × SKU 매트릭스 — **수량(개)**")
    md.append("")
    header = "| 채널 | " + " | ".join(SKU_ORDER) + " | 합계 |"
    sep = "|---" * (len(SKU_ORDER) + 2) + "|"
    md.append(header)
    md.append(sep)
    sku_total_qty = defaultdict(int)
    grand_qty = 0
    for ch in all_channels:
        row = [ch]
        ch_total = 0
        for sku in SKU_ORDER:
            q = ch_sku_qty[ch].get(sku, 0)
            row.append(str(q) if q else "—")
            ch_total += q
            sku_total_qty[sku] += q
        row.append(f"**{ch_total}**")
        grand_qty += ch_total
        md.append("| " + " | ".join(row) + " |")
    # 합계 행
    total_row = ["**합계**"]
    for sku in SKU_ORDER:
        total_row.append(f"**{sku_total_qty[sku]}**")
    total_row.append(f"**{grand_qty}**")
    md.append("| " + " | ".join(total_row) + " |")
    md.append("")

    # === B. 채널 × SKU (매출) ===
    md.append("## B. 채널 × SKU 매트릭스 — **매출(원)**")
    md.append("")
    md.append(header)
    md.append(sep)
    sku_total_amt = defaultdict(int)
    grand_amt = 0
    for ch in all_channels:
        row = [ch]
        ch_total = 0
        for sku in SKU_ORDER:
            a = ch_sku_amt[ch].get(sku, 0)
            row.append(f"{a:,}" if a else "—")
            ch_total += a
            sku_total_amt[sku] += a
        row.append(f"**{ch_total:,}**")
        grand_amt += ch_total
        md.append("| " + " | ".join(row) + " |")
    total_row = ["**합계**"]
    for sku in SKU_ORDER:
        total_row.append(f"**{sku_total_amt[sku]:,}**")
    total_row.append(f"**{grand_amt:,}**")
    md.append("| " + " | ".join(total_row) + " |")
    md.append("")
    md.append("---")
    md.append("")

    # === C. 채널 × 월 (매출) ===
    md.append("## C. 채널 × 월 매트릭스 — **매출(원)**")
    md.append("")
    md.append("| 채널 | " + " | ".join(all_months) + " | 합계 |")
    md.append("|---" * (len(all_months) + 2) + "|")
    for ch in all_channels:
        row = [ch]
        ch_total = 0
        for m in all_months:
            a = ch_month_amt[ch].get(m, 0)
            row.append(f"{a:,}" if a else "—")
            ch_total += a
        row.append(f"**{ch_total:,}**")
        md.append("| " + " | ".join(row) + " |")
    # 월 합계 행
    total_row = ["**합계**"]
    grand_total = 0
    for m in all_months:
        m_total = sum(ch_month_amt[ch].get(m, 0) for ch in all_channels)
        total_row.append(f"**{m_total:,}**")
        grand_total += m_total
    total_row.append(f"**{grand_total:,}**")
    md.append("| " + " | ".join(total_row) + " |")
    md.append("")
    md.append("---")
    md.append("")

    # === D. SKU × 월 (수량) ===
    md.append("## D. SKU × 월 매트릭스 — **수량(개)**")
    md.append("")
    md.append("| SKU | " + " | ".join(all_months) + " | 합계 |")
    md.append("|---" * (len(all_months) + 2) + "|")
    for sku in SKU_ORDER:
        if sku not in sku_month_qty:
            continue
        row = [sku]
        sku_total = 0
        for m in all_months:
            q = sku_month_qty[sku].get(m, 0)
            row.append(str(q) if q else "—")
            sku_total += q
        row.append(f"**{sku_total}**")
        md.append("| " + " | ".join(row) + " |")
    md.append("")

    # === E. SKU × 월 (매출) ===
    md.append("## E. SKU × 월 매트릭스 — **매출(원)**")
    md.append("")
    md.append("| SKU | " + " | ".join(all_months) + " | 합계 |")
    md.append("|---" * (len(all_months) + 2) + "|")
    for sku in SKU_ORDER:
        if sku not in sku_month_amt:
            continue
        row = [sku]
        sku_total = 0
        for m in all_months:
            a = sku_month_amt[sku].get(m, 0)
            row.append(f"{a:,}" if a else "—")
            sku_total += a
        row.append(f"**{sku_total:,}**")
        md.append("| " + " | ".join(row) + " |")
    md.append("")
    md.append("---")
    md.append("")

    md.append("## F. 핵심 인사이트")
    md.append("")
    # 채널별 베스트 SKU
    md.append("### 채널별 베스트셀러 SKU")
    md.append("")
    md.append("| 채널 | 1위 SKU | 매출 |")
    md.append("|---|---|---:|")
    for ch in all_channels:
        if not ch_sku_amt[ch]:
            continue
        best = max(ch_sku_amt[ch].items(), key=lambda x: x[1])
        if best[1] > 0:
            md.append(f"| {ch} | {best[0]} | {best[1]:,}원 |")
    md.append("")

    md.append("### SKU별 베스트 채널")
    md.append("")
    md.append("| SKU | 1위 채널 | 매출 | 채널 비중 |")
    md.append("|---|---|---:|---:|")
    for sku in SKU_ORDER:
        if sku not in sku_total_amt or sku_total_amt[sku] == 0:
            continue
        ch_amounts = [(ch, ch_sku_amt[ch].get(sku, 0)) for ch in all_channels]
        ch_amounts.sort(key=lambda x: -x[1])
        if ch_amounts and ch_amounts[0][1] > 0:
            ch, amt = ch_amounts[0]
            pct = amt / sku_total_amt[sku] * 100
            md.append(f"| {sku} | {ch} | {amt:,}원 | {pct:.0f}% |")
    md.append("")

    OUT_MD.write_text("\n".join(md))
    print(f"저장 완료:")
    print(f"  {OUT_MD}")
    print(f"  {OUT_JSON}")
    print(f"\n총 라인 수: {len(flat)}, 총 매출: {grand_amt:,}원, 총 수량: {grand_qty}개")


if __name__ == "__main__":
    main()
