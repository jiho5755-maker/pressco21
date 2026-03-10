#!/bin/bash
# Partnerclass Phase 3 S0-2
# - tbl_Classes: region 컬럼 추가 + level/status/region 정규화
# - tbl_Applications / tbl_Settlements: status 대문자 정규화
#
# 실행 예시:
#   ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/server/partnerclass-s0-2-normalize-nocodb.sh

set -euo pipefail

NOCODB_CONTAINER="${NOCODB_CONTAINER:-nocodb}"
TABLE_CLASSES="nc_5za5___tbl_Classes"
TABLE_APPLICATIONS="nc_5za5___tbl_Applications"
TABLE_SETTLEMENTS="nc_5za5___tbl_Settlements"

MODEL_CLASSES="mpvsno4or6asbxk"
VIEW_CLASSES="vwz9jqlit4rlzltd"
SOURCE_ID="bdbbd0qepn9cnzw"
BASE_ID="poey1yrm1r6sthf"
WORKSPACE_ID="wm4qiudb"

detect_db_path() {
  var_path=""
  for candidate in /usr/app/data/noco.db /root/nocodb-data/noco.db; do
    if docker exec "${NOCODB_CONTAINER}" test -f "${candidate}" 2>/dev/null; then
      var_path="${candidate}"
      break
    fi
  done

  if [ -z "${var_path}" ]; then
    echo "NocoDB DB 파일 경로를 찾지 못했습니다." >&2
    exit 1
  fi

  echo "${var_path}"
}

detect_host_db_path() {
  container_dir="$(dirname "${DB_PATH}")"
  mount_source="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "'"${container_dir}"'"}}{{println .Source}}{{end}}{{end}}' "${NOCODB_CONTAINER}" | head -n 1)"

  if [ -z "${mount_source}" ]; then
    echo ""
    return
  fi

  echo "${mount_source}/$(basename "${DB_PATH}")"
}

DB_PATH="${DB_PATH:-$(detect_db_path)}"
HOST_DB_PATH="${HOST_DB_PATH:-$(detect_host_db_path)}"
TS_HASH="$(date +%s | md5sum | head -c 12)"
REGION_COLUMN_ID="cclsrgn${TS_HASH:0:8}"
REGION_VIEW_COLUMN_ID="cvrgn${TS_HASH:0:10}"

run_sql() {
  if docker exec "${NOCODB_CONTAINER}" sh -lc "command -v sqlite3 >/dev/null 2>&1" >/dev/null 2>&1; then
    docker exec "${NOCODB_CONTAINER}" sqlite3 "${DB_PATH}" "$1"
    return
  fi

  if [ -n "${HOST_DB_PATH}" ] && command -v sqlite3 >/dev/null 2>&1 && [ -f "${HOST_DB_PATH}" ]; then
    sqlite3 "${HOST_DB_PATH}" "$1"
    return
  fi

  echo "sqlite3 실행 경로를 찾지 못했습니다. host_db_path=${HOST_DB_PATH}" >&2
  exit 1
}

print_grouped() {
  sql="$1"
  label="$2"
  echo ""
  echo "=== ${label} ==="
  run_sql "${sql}"
}

echo "=== Partnerclass S0-2 NocoDB 정규화 시작 ==="
echo "container: ${NOCODB_CONTAINER}"
echo "db_path: ${DB_PATH}"
echo "host_db_path: ${HOST_DB_PATH:-N/A}"

REGION_EXISTS="$(run_sql "PRAGMA table_info('${TABLE_CLASSES}');" | awk -F'|' '$2=="region" { print $2 }')"

if [ -z "${REGION_EXISTS}" ]; then
  echo "[1/5] tbl_Classes.region 물리 컬럼 추가"
  run_sql "ALTER TABLE '${TABLE_CLASSES}' ADD COLUMN region TEXT;"
else
  echo "[1/5] tbl_Classes.region 물리 컬럼 이미 존재"
fi

REGION_META_ID="$(run_sql "SELECT id FROM nc_columns_v2 WHERE fk_model_id='${MODEL_CLASSES}' AND column_name='region' LIMIT 1;")"
if [ -z "${REGION_META_ID}" ]; then
  echo "[2/5] nc_columns_v2 region 메타 등록"
  run_sql "
INSERT INTO nc_columns_v2 (
  id, source_id, base_id, fk_model_id, title, column_name, uidt, dt,
  pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order',
  fk_workspace_id, meta, readonly, created_at, updated_at
) VALUES (
  '${REGION_COLUMN_ID}', '${SOURCE_ID}', '${BASE_ID}', '${MODEL_CLASSES}',
  'region', 'region', 'SingleSelect', 'text',
  0, NULL, 0, 0, 0, 'specificType', '', NULL, 0, 38,
  '${WORKSPACE_ID}', '{\"defaultViewColOrder\":38,\"defaultViewColVisibility\":1}', 0,
  datetime('now'), datetime('now')
);
"
  REGION_META_ID="${REGION_COLUMN_ID}"
else
  echo "[2/5] nc_columns_v2 region 메타 이미 존재: ${REGION_META_ID}"
fi

REGION_VIEW_EXISTS="$(run_sql "SELECT COUNT(1) FROM nc_grid_view_columns_v2 WHERE fk_view_id='${VIEW_CLASSES}' AND fk_column_id='${REGION_META_ID}';")"
if [ "${REGION_VIEW_EXISTS}" = "0" ]; then
  echo "[3/5] 기본 그리드 뷰에 region 컬럼 추가"
  run_sql "
INSERT INTO nc_grid_view_columns_v2 (
  id, fk_view_id, fk_column_id, source_id, base_id, width, show, 'order',
  aggregation, fk_workspace_id, created_at, updated_at
) VALUES (
  '${REGION_VIEW_COLUMN_ID}', '${VIEW_CLASSES}', '${REGION_META_ID}', '${SOURCE_ID}', '${BASE_ID}',
  '120px', 1, 38, 'none', '${WORKSPACE_ID}', datetime('now'), datetime('now')
);
"
else
  echo "[3/5] 기본 그리드 뷰 region 컬럼 이미 등록"
fi

echo "[4/5] 데이터 정규화 실행"
run_sql "
BEGIN TRANSACTION;

UPDATE '${TABLE_CLASSES}'
SET level = CASE
  WHEN level IS NULL OR trim(level) = '' THEN level
  WHEN lower(trim(level)) IN ('beginner', 'basic') THEN 'BEGINNER'
  WHEN lower(trim(level)) = 'intermediate' THEN 'INTERMEDIATE'
  WHEN lower(trim(level)) IN ('advanced', 'expert') THEN 'ADVANCED'
  WHEN upper(trim(level)) IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS') THEN upper(trim(level))
  WHEN level LIKE '%입문%' OR level LIKE '%초급%' THEN 'BEGINNER'
  WHEN level LIKE '%중급%' THEN 'INTERMEDIATE'
  WHEN level LIKE '%심화%' OR level LIKE '%고급%' THEN 'ADVANCED'
  WHEN level LIKE '%전체%' THEN 'ALL_LEVELS'
  ELSE upper(trim(level))
END;

UPDATE '${TABLE_CLASSES}'
SET status = CASE
  WHEN status IS NULL OR trim(status) = '' THEN 'DRAFT'
  WHEN upper(trim(status)) = 'ACTIVE' THEN 'ACTIVE'
  WHEN upper(trim(status)) = 'PAUSED' THEN 'PAUSED'
  WHEN upper(trim(status)) = 'ARCHIVED' THEN 'ARCHIVED'
  WHEN upper(trim(status)) = 'REJECTED' THEN 'REJECTED'
  WHEN upper(trim(status)) = 'PENDING_REVIEW' THEN 'PENDING_REVIEW'
  WHEN upper(trim(status)) = 'DRAFT' THEN 'DRAFT'
  WHEN upper(trim(status)) IN ('INACTIVE', 'PENDING') THEN 'PENDING_REVIEW'
  WHEN lower(trim(status)) = 'closed' THEN 'REJECTED'
  ELSE upper(trim(status))
END;

UPDATE '${TABLE_CLASSES}'
SET region = CASE
  WHEN (type LIKE '%온라인%' OR location LIKE '%온라인%' OR location LIKE '%online%') THEN 'ONLINE'
  WHEN location LIKE '서울%' OR location LIKE '% 서울%' THEN 'SEOUL'
  WHEN location LIKE '경기%' OR location LIKE '경기도%' OR location LIKE '% 경기%' THEN 'GYEONGGI'
  WHEN location LIKE '인천%' OR location LIKE '% 인천%' THEN 'INCHEON'
  WHEN location LIKE '부산%' OR location LIKE '% 부산%' THEN 'BUSAN'
  WHEN location LIKE '대구%' OR location LIKE '% 대구%' THEN 'DAEGU'
  WHEN location LIKE '대전%' OR location LIKE '% 대전%' THEN 'DAEJEON'
  WHEN location LIKE '광주%' OR location LIKE '% 광주%' THEN 'GWANGJU'
  WHEN location LIKE '울산%' OR location LIKE '% 울산%' THEN 'ULSAN'
  WHEN location LIKE '세종%' OR location LIKE '% 세종%' THEN 'SEJONG'
  WHEN location LIKE '강원%' OR location LIKE '강원도%' OR location LIKE '% 강원%' THEN 'GANGWON'
  WHEN location LIKE '충북%' OR location LIKE '충청북도%' OR location LIKE '% 충북%' THEN 'CHUNGBUK'
  WHEN location LIKE '충남%' OR location LIKE '충청남도%' OR location LIKE '% 충남%' THEN 'CHUNGNAM'
  WHEN location LIKE '전북%' OR location LIKE '전라북도%' OR location LIKE '% 전북%' THEN 'JEONBUK'
  WHEN location LIKE '전남%' OR location LIKE '전라남도%' OR location LIKE '% 전남%' THEN 'JEONNAM'
  WHEN location LIKE '경북%' OR location LIKE '경상북도%' OR location LIKE '% 경북%' THEN 'GYEONGBUK'
  WHEN location LIKE '경남%' OR location LIKE '경상남도%' OR location LIKE '% 경남%' THEN 'GYEONGNAM'
  WHEN location LIKE '제주%' OR location LIKE '제주도%' OR location LIKE '% 제주%' THEN 'JEJU'
  ELSE COALESCE(NULLIF(trim(region), ''), '')
END;

UPDATE '${TABLE_APPLICATIONS}'
SET status = upper(trim(status))
WHERE status IS NOT NULL AND trim(status) <> '';

UPDATE '${TABLE_SETTLEMENTS}'
SET status = upper(trim(status))
WHERE status IS NOT NULL AND trim(status) <> '';

COMMIT;
"

echo "[5/5] NocoDB 재시작"
docker restart "${NOCODB_CONTAINER}" >/dev/null
sleep 12

print_grouped "SELECT level, COUNT(*) FROM '${TABLE_CLASSES}' GROUP BY level ORDER BY level;" "tbl_Classes.level"
print_grouped "SELECT status, COUNT(*) FROM '${TABLE_CLASSES}' GROUP BY status ORDER BY status;" "tbl_Classes.status"
print_grouped "SELECT region, COUNT(*) FROM '${TABLE_CLASSES}' GROUP BY region ORDER BY region;" "tbl_Classes.region"
print_grouped "SELECT status, COUNT(*) FROM '${TABLE_APPLICATIONS}' GROUP BY status ORDER BY status;" "tbl_Applications.status"
print_grouped "SELECT status, COUNT(*) FROM '${TABLE_SETTLEMENTS}' GROUP BY status ORDER BY status;" "tbl_Settlements.status"

echo ""
echo "=== 완료 ==="
