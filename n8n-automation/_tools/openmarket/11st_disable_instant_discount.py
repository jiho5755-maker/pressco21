#!/usr/bin/env python3
"""11번가 기본즉시할인 제거 운영 도구.

원칙:
- 로컬에서는 API 키를 읽지 않는다.
- 원격 n8n 서버의 환경변수에서만 11번가 API 키를 읽는다.
- 기본은 dry-run이며, --execute가 있을 때만 11번가 쓰기 API를 호출한다.
- 할인 후 실판매가를 새 판매가로 낮추고 cuponcheck=N으로 전환한다.
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
from datetime import datetime
from pathlib import Path

REMOTE_HOST = "ubuntu@158.180.77.201"
SSH_KEY = str(Path.home() / ".ssh/oracle-n8n.key")
REMOTE_ENV = "/home/ubuntu/n8n/.env"
DEFAULT_AUDIT = "n8n-automation/backups/20260427-11st-instant-discount-audit/audit-readonly.json"
DEFAULT_OUTPUT_DIR = "n8n-automation/backups/20260427-11st-instant-discount-audit"

REMOTE_SCRIPT = r'''
import json
import re
import time
import base64
from pathlib import Path
from datetime import datetime, timezone
import xml.etree.ElementTree as ET

import requests

REMOTE_ENV = "__REMOTE_ENV__"
TARGETS = json.loads(base64.b64decode("__TARGETS_B64__").decode("utf-8"))
EXECUTE = __EXECUTE__
SLEEP_SECONDS = __SLEEP_SECONDS__


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def load_env(path):
    values = {}
    for raw in Path(path).read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"\'')
    return values


def is_valid_xml_char(code):
    return (
        code in (0x9, 0xA, 0xD)
        or 0x20 <= code <= 0xD7FF
        or 0xE000 <= code <= 0xFFFD
        or 0x10000 <= code <= 0x10FFFF
    )


def scrub_xml_text(text):
    def replace_ref(match):
        raw = match.group(1) or match.group(2)
        base = 16 if match.group(1) else 10
        try:
            code = int(raw, base)
        except Exception:
            return ""
        return match.group(0) if is_valid_xml_char(code) else ""

    text = re.sub(r"&#x([0-9A-Fa-f]+);|&#([0-9]+);", replace_ref, text)
    return "".join(ch for ch in text if is_valid_xml_char(ord(ch)))


def normalize_xml(content):
    text = content.decode("euc-kr", "replace")
    text = scrub_xml_text(text)
    text = text.replace('encoding="euc-kr"', 'encoding="utf-8"')
    return text.encode("utf-8")


def parse_xml(content):
    return ET.fromstring(normalize_xml(content))


def strip_ns(tag):
    return tag.split("}", 1)[-1].split(":")[-1]


def direct_children(root):
    out = {}
    for child in list(root):
        if len(list(child)) == 0:
            out[strip_ns(child.tag)] = child.text or ""
    return out


def first_text(root, name):
    for node in root.iter():
        if strip_ns(node.tag) == name:
            return node.text or ""
    return ""


def parse_int(value):
    try:
        return int(float(str(value or "0").replace(",", "").strip()))
    except Exception:
        return 0


def discounted_price(sel_prc, method, amount):
    price = parse_int(sel_prc)
    value = parse_int(amount)
    if price <= 0 or value <= 0:
        return None
    if method == "01":
        return max(0, price - value)
    if method == "02":
        return max(0, round(price * (100 - value) / 100))
    return None


def response_summary(response):
    info = {
        "status_code": response.status_code,
    }
    try:
        root = parse_xml(response.content)
        for key in ["resultCode", "message", "resultMessage", "productNo"]:
            value = first_text(root, key)
            if value:
                info[key] = value[:500]
    except Exception as exc:
        info["parse_error"] = str(exc)
        info["raw_preview"] = response.text[:500]
    return info


def get_detail(base, headers, prd_no):
    response = requests.get(
        base + f"/rest/prodmarketservice/prodmarket/{prd_no}",
        headers=headers,
        timeout=30,
    )
    info = response_summary(response)
    data = {}
    try:
        data = direct_children(parse_xml(response.content))
    except Exception as exc:
        info["detail_parse_error"] = str(exc)
    return info, data


def post_disable_discount(base, headers, prd_no, target_price):
    body = f"""<?xml version="1.0" encoding="euc-kr" standalone="yes"?>
<Product>
  <selPrc>{target_price}</selPrc>
  <cuponcheck>N</cuponcheck>
</Product>""".encode("euc-kr")
    response = requests.post(
        base + f"/rest/prodservices/product/priceCoupon/{prd_no}",
        headers=headers,
        data=body,
        timeout=40,
    )
    return response_summary(response)


def main():
    env = load_env(REMOTE_ENV)
    api_key = env.get("ST11_API_KEY", "")
    report = {
        "operation": "11st_disable_instant_discount",
        "execute": EXECUTE,
        "started_at": now_iso(),
        "target_count": len(TARGETS),
        "summary": {
            "would_update": 0,
            "success": 0,
            "failed": 0,
            "skipped": 0,
            "verified": 0,
        },
        "results": [],
    }

    if not api_key:
        report["fatal_error"] = "ST11_API_KEY missing on remote env"
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    base = "https://api.11st.co.kr"
    headers = {
        "openapikey": api_key,
        "Content-Type": "text/xml; charset=euc-kr",
        "Accept": "application/xml",
    }

    for target in TARGETS:
        prd_no = str(target.get("prdNo") or "").strip()
        item = {
            "prdNo": prd_no,
            "audit": target,
            "status": "pending",
            "before": {},
            "after": {},
        }
        if not prd_no:
            item["status"] = "skipped"
            item["skip_reason"] = "missing prdNo"
            report["summary"]["skipped"] += 1
            report["results"].append(item)
            continue

        before_info, before = get_detail(base, headers, prd_no)
        item["before_response"] = before_info
        item["before"] = {
            key: before.get(key, "")
            for key in [
                "prdNo",
                "prdNm",
                "sellerPrdCd",
                "selStatCd",
                "selStatNm",
                "selPrc",
                "cuponcheck",
                "dscAmtPercnt",
                "cupnDscMthdCd",
                "cupnUseLmtDyYn",
                "cupnIssEndDy",
            ]
        }

        if before.get("cuponcheck") != "Y":
            item["status"] = "skipped"
            item["skip_reason"] = "fresh detail is not cuponcheck=Y"
            report["summary"]["skipped"] += 1
            report["results"].append(item)
            continue

        target_price = discounted_price(
            before.get("selPrc"),
            before.get("cupnDscMthdCd"),
            before.get("dscAmtPercnt"),
        )
        item["target_price"] = target_price
        item["target_payload"] = {
            "selPrc": target_price,
            "cuponcheck": "N",
        }

        if target_price is None or target_price <= 0:
            item["status"] = "skipped"
            item["skip_reason"] = "cannot calculate positive discounted price"
            report["summary"]["skipped"] += 1
            report["results"].append(item)
            continue

        report["summary"]["would_update"] += 1
        if not EXECUTE:
            item["status"] = "would_update"
            report["results"].append(item)
            continue

        write_info = post_disable_discount(base, headers, prd_no, target_price)
        item["write_response"] = write_info
        write_ok = str(write_info.get("resultCode")) == "200"
        if not write_ok:
            item["status"] = "failed"
            report["summary"]["failed"] += 1
            report["results"].append(item)
            time.sleep(SLEEP_SECONDS)
            continue

        time.sleep(max(SLEEP_SECONDS, 0.2))
        after_info, after = get_detail(base, headers, prd_no)
        item["after_response"] = after_info
        item["after"] = {
            key: after.get(key, "")
            for key in [
                "prdNo",
                "prdNm",
                "sellerPrdCd",
                "selStatCd",
                "selStatNm",
                "selPrc",
                "cuponcheck",
                "dscAmtPercnt",
                "cupnDscMthdCd",
                "cupnUseLmtDyYn",
                "cupnIssEndDy",
            ]
        }
        verified = after.get("cuponcheck") == "N" and parse_int(after.get("selPrc")) == target_price
        item["verified"] = verified
        item["status"] = "success" if verified else "success_unverified"
        report["summary"]["success"] += 1
        if verified:
            report["summary"]["verified"] += 1
        report["results"].append(item)
        time.sleep(SLEEP_SECONDS)

    report["finished_at"] = now_iso()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="11번가 기본즉시할인을 제거한다.")
    parser.add_argument("--audit", default=DEFAULT_AUDIT, help="읽기 감사 JSON 경로")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help="결과 저장 디렉터리")
    parser.add_argument("--execute", action="store_true", help="실제 11번가 쓰기 API를 호출")
    parser.add_argument("--include-status", action="append", default=["103"], help="대상 판매상태 코드. 기본: 103 판매중")
    parser.add_argument("--prd-no", action="append", default=[], help="특정 상품번호만 실행")
    parser.add_argument("--limit", type=int, default=0, help="처리 개수 제한")
    parser.add_argument("--sleep", type=float, default=0.25, help="상품별 호출 간격")
    return parser.parse_args()


def parse_int(value: object) -> int:
    try:
        return int(float(str(value or "0").replace(",", "").strip()))
    except Exception:
        return 0


def build_targets(audit_path: Path, include_status: set[str], prd_nos: set[str], limit: int) -> list[dict]:
    data = json.loads(audit_path.read_text())
    targets = []
    for row in data.get("discount_products", []):
        prd_no = str(row.get("prdNo") or "").strip()
        if prd_nos and prd_no not in prd_nos:
            continue
        if not prd_nos and str(row.get("selStatCd") or "") not in include_status:
            continue
        if row.get("cuponcheck") != "Y":
            continue
        if not row.get("dscAmtPercnt") or not row.get("cupnDscMthdCd"):
            continue
        if parse_int(row.get("estimated_discounted_price")) <= 0:
            continue
        targets.append({
            "prdNo": prd_no,
            "prdNm": row.get("prdNm", ""),
            "sellerPrdCd": row.get("sellerPrdCd", ""),
            "selStatCd": row.get("selStatCd", ""),
            "selStatNm": row.get("selStatNm", ""),
            "audit_selPrc": row.get("selPrc", ""),
            "audit_dscAmtPercnt": row.get("dscAmtPercnt", ""),
            "audit_cupnDscMthdCd": row.get("cupnDscMthdCd", ""),
            "audit_estimated_discounted_price": row.get("estimated_discounted_price"),
        })
        if limit and len(targets) >= limit:
            break
    return targets


def main() -> None:
    args = parse_args()
    audit_path = Path(args.audit)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    targets = build_targets(
        audit_path,
        include_status=set(args.include_status),
        prd_nos=set(args.prd_no),
        limit=args.limit,
    )

    targets_b64 = base64.b64encode(json.dumps(targets, ensure_ascii=False).encode("utf-8")).decode("ascii")
    script = (
        REMOTE_SCRIPT.replace("__REMOTE_ENV__", REMOTE_ENV)
        .replace("__TARGETS_B64__", targets_b64)
        .replace("__EXECUTE__", "True" if args.execute else "False")
        .replace("__SLEEP_SECONDS__", repr(args.sleep))
    )

    proc = subprocess.run(
        ["ssh", "-i", SSH_KEY, "-o", "BatchMode=yes", REMOTE_HOST, "python3 -"],
        input=script,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"remote execution failed\nSTDERR:\n{proc.stderr}\nSTDOUT:\n{proc.stdout}")

    report = json.loads(proc.stdout)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    mode = "execute" if args.execute else "dry-run"
    report_path = output_dir / f"disable-instant-discount-{mode}-{stamp}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({
        "report_path": str(report_path),
        "execute": args.execute,
        "target_count": len(targets),
        "summary": report.get("summary", {}),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
