#!/usr/bin/env python3
"""
CRM-003: 고객/거래처 병합 이전 스크립트
- 얼마에요 거래처.xls (13,298건): 이미 NocoDB에 이전됨 → customer_type 재분류
- 고객리스트 전체자료.xls (6,592건): 매칭 후 email/mobile 업데이트 + 신규 추가
- 결과: ~14,549건 (기존 13,282 + 신규 ~2,549)
"""

import os
import sys
import time
import json
import xlrd
import requests
from datetime import datetime

# ─── 설정 ─────────────────────────────────────────────
# NOCODB_TOKEN: .env.local 또는 시스템 환경변수에서 로드 (코드에 직접 기재 금지)
NOCODB_URL   = "https://nocodb.pressco21.com"
NOCODB_TOKEN = os.environ.get("NOCODB_TOKEN", "")
if not NOCODB_TOKEN:
    sys.exit("오류: NOCODB_TOKEN 환경변수가 설정되지 않았습니다.\n"
             "실행 방법: export NOCODB_TOKEN=<토큰값> && python3 migrate_customers.py")
PROJECT_ID   = "pu0mwk97kac8a5p"
TABLE_ID     = "mffgxkftaeppyk0"   # tbl_Customers
XLS_DIR      = "/Users/jangjiho/Downloads/얼마에요 백업파일"
BATCH_SIZE   = 500

HEADERS = {
    "xc-token": NOCODB_TOKEN,
    "Content-Type": "application/json",
}
BASE_URL = f"{NOCODB_URL}/api/v1/db/data/noco/{PROJECT_ID}/{TABLE_ID}"
BULK_URL = f"{NOCODB_URL}/api/v1/db/data/bulk/noco/{PROJECT_ID}/{TABLE_ID}"


# ─── customer_type 자동 분류 ───────────────────────────
def classify_customer_type(name, memo=""):
    """거래처명/메모 기반 고객 유형 자동 분류"""
    name = name or ""
    memo = memo or ""

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


# ─── NocoDB: 전체 customers 로드 ──────────────────────
def load_all_customers():
    """NocoDB customers 전체 데이터 로드 (name → {Id, memo} 매핑)"""
    print("NocoDB customers 전체 로드 중...")
    all_rows = []
    offset = 0
    limit = 1000

    while True:
        params = {
            "limit": limit,
            "offset": offset,
            "fields": "Id,legacy_id,name,memo,customer_type,email,mobile",
        }
        res = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=30)
        if res.status_code != 200:
            raise RuntimeError(f"customers 로드 실패: {res.status_code} {res.text[:200]}")

        data = res.json()
        batch = data.get("list", [])
        all_rows.extend(batch)

        total = data.get("pageInfo", {}).get("totalRows", 0)
        offset += len(batch)
        print(f"  {offset}/{total} 로드됨...", end="\r")

        if offset >= total or not batch:
            break

    print(f"\n  총 {len(all_rows):,}건 로드 완료")
    return all_rows


# ─── bulk PATCH (업데이트) ─────────────────────────────
def bulk_patch(records):
    """기존 레코드 업데이트 (각 레코드에 Id 필드 필수)"""
    res = requests.patch(BULK_URL, headers=HEADERS, json=records, timeout=60)
    if res.status_code not in (200, 201):
        raise RuntimeError(f"bulk PATCH 실패: {res.status_code} {res.text[:300]}")
    return len(records)


# ─── bulk POST (신규 추가) ─────────────────────────────
def bulk_post(records):
    """신규 레코드 추가"""
    res = requests.post(BULK_URL, headers=HEADERS, json=records, timeout=60)
    if res.status_code not in (200, 201):
        raise RuntimeError(f"bulk POST 실패: {res.status_code} {res.text[:300]}")
    return len(records)


# ─── 배치 실행 헬퍼 ───────────────────────────────────
def run_batches(records, fn, label):
    """레코드를 BATCH_SIZE씩 나눠 fn 실행"""
    total = len(records)
    done = 0
    for i in range(0, total, BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        done += fn(batch)
        print(f"  [{label}] {done:,}/{total:,} 완료", end="\r")
        time.sleep(0.3)
    print()
    return done


# ─── 메인 ─────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv
    skip_type = "--skip-type" in sys.argv
    skip_merge = "--skip-merge" in sys.argv

    print("=" * 60)
    print("CRM-003: 고객/거래처 병합 이전")
    print(f"  dry_run: {dry_run}")
    print(f"  skip_type(customer_type 분류 생략): {skip_type}")
    print(f"  skip_merge(고객리스트 병합 생략): {skip_merge}")
    print("=" * 60)

    # ── 1. NocoDB customers 전체 로드 ──────────────────
    all_customers = load_all_customers()

    # name → 레코드 매핑 (동명 있을 경우 Id 기준 첫 번째 사용)
    name_to_record = {}
    for row in all_customers:
        name = row.get("name", "").strip()
        if name and name not in name_to_record:
            name_to_record[name] = row

    print(f"  유니크 이름: {len(name_to_record):,}건")

    # ── 2. customer_type 재분류 ─────────────────────────
    if not skip_type:
        print("\n[STEP 1] customer_type 자동 분류...")
        type_updates = []
        type_stats = {}

        for row in all_customers:
            new_type = classify_customer_type(
                row.get("name", ""), row.get("memo", "")
            )
            type_stats[new_type] = type_stats.get(new_type, 0) + 1
            # 현재와 다를 경우에만 업데이트
            if row.get("customer_type") != new_type:
                type_updates.append({"Id": row["Id"], "customer_type": new_type})

        print(f"  분류 결과:")
        for k, v in sorted(type_stats.items(), key=lambda x: -x[1]):
            print(f"    {k}: {v:,}건")
        print(f"  변경 대상: {len(type_updates):,}건")

        if not dry_run and type_updates:
            done = run_batches(type_updates, bulk_patch, "customer_type PATCH")
            print(f"  customer_type 업데이트 완료: {done:,}건")
    else:
        print("\n[STEP 1] customer_type 분류 건너뜀 (--skip-type)")

    # ── 3. 고객리스트.xls 병합 ──────────────────────────
    if skip_merge:
        print("\n[STEP 2] 고객리스트 병합 건너뜀 (--skip-merge)")
        return

    print("\n[STEP 2] 고객리스트 전체자료.xls 처리...")
    xls_path = os.path.join(XLS_DIR, "고객리스트 전체자료.xls")
    if not os.path.exists(xls_path):
        print(f"  파일 없음: {xls_path}")
        return

    wb = xlrd.open_workbook(xls_path)
    sh = wb.sheet_by_index(0)
    total_rows = sh.nrows - 1
    print(f"  총 {total_rows:,}건 처리 시작")

    patch_records = []   # 기존 레코드 업데이트 (Id 포함)
    new_records   = []   # 신규 추가 레코드
    matched_count = 0
    skipped_count = 0

    for r in range(1, sh.nrows):
        row = sh.row_values(r)

        # 회사부서 → 거래처명 매칭 기준
        company = str(row[5]).strip()
        cust_name = str(row[4]).strip()   # 고객명 (개인)
        email  = str(row[14]).strip()
        mobile = str(row[13]).strip()
        phone_co  = str(row[11]).strip()
        phone_home = str(row[12]).strip()
        zip_code  = str(row[6]).strip()
        addr1 = str(row[7]).strip()
        addr2 = str(row[8]).strip()
        note  = str(row[9]).strip()       # 특기사항
        biz_no = str(row[1]).strip()      # 등록번호

        # 연락처 없으면 skip (업데이트할 정보 없음 + 신규 추가도 불필요)
        has_contact = bool(email or mobile or phone_co or phone_home)

        match_key = company if company else cust_name
        if not match_key:
            skipped_count += 1
            continue

        if match_key in name_to_record:
            # 기존 레코드 매칭 → 이메일/핸드폰 업데이트
            existing = name_to_record[match_key]
            patch = {"Id": existing["Id"]}

            # 기존 값이 없을 때만 업데이트
            if email and not existing.get("email"):
                patch["email"] = email
            if mobile and not existing.get("mobile"):
                patch["mobile"] = mobile
            if biz_no and not existing.get("business_no"):
                patch["business_no"] = biz_no

            if len(patch) > 1:  # Id 외 업데이트 필드가 있으면
                patch_records.append(patch)
            matched_count += 1

        else:
            # 신규 고객 추가
            name = company if company else cust_name
            new_rec = {
                "name":          name,
                "email":         email,
                "mobile":        mobile,
                "phone1":        phone_co or phone_home,
                "zip":           zip_code,
                "address1":      addr1,
                "address2":      addr2,
                "business_no":   biz_no,
                "memo":          note,
                "is_active":     1,
                "customer_type": classify_customer_type(name, note),
                "customer_status": "ACTIVE",
                "member_grade":  "MEMBER",
                "outstanding_balance": 0,
                "total_order_count":   0,
                "total_order_amount":  0,
            }
            new_records.append(new_rec)

    print(f"  매칭(기존 업데이트): {matched_count:,}건")
    print(f"  미매칭(신규 추가):  {len(new_records):,}건")
    print(f"  PATCH 대상(정보 추가): {len(patch_records):,}건")
    print(f"  건너뜀: {skipped_count}건")

    if dry_run:
        print("\n[DRY-RUN] 실제 반영 없음. --dry-run 제거 후 재실행하세요.")
        # 신규 샘플 5건 출력
        print("\n신규 추가 샘플:")
        for rec in new_records[:5]:
            print(f"  {rec['name']} ({rec['customer_type']}) email={rec['email']} mobile={rec['mobile']}")
        return

    # ── PATCH ──────────────────────────────────────────
    if patch_records:
        print(f"\n  기존 레코드 업데이트 ({len(patch_records):,}건)...")
        done = run_batches(patch_records, bulk_patch, "customers PATCH")
        print(f"  업데이트 완료: {done:,}건")

    # ── 신규 POST ──────────────────────────────────────
    if new_records:
        print(f"\n  신규 레코드 추가 ({len(new_records):,}건)...")
        done = run_batches(new_records, bulk_post, "customers POST")
        print(f"  신규 추가 완료: {done:,}건")

    # ── 최종 카운트 확인 ───────────────────────────────
    res = requests.get(BASE_URL, headers=HEADERS, params={"limit": 1}, timeout=15)
    final_count = res.json().get("pageInfo", {}).get("totalRows", 0)

    print()
    print("=" * 60)
    print("CRM-003 완료")
    print(f"  최종 customers 레코드: {final_count:,}건")
    print("=" * 60)


if __name__ == "__main__":
    main()
