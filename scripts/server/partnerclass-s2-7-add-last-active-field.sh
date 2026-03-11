#!/bin/bash
# Partnerclass Phase 3 S2-7
# - tbl_Partners.last_active_at 물리 컬럼 + NocoDB 메타 추가
# - 기존 파트너는 UpdatedAt / CreatedAt 기준으로 초기값 세팅
#
# 실행 예시:
#   ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/server/partnerclass-s2-7-add-last-active-field.sh

set -euo pipefail

NOCODB_CONTAINER="${NOCODB_CONTAINER:-nocodb}"
MODEL_PARTNERS="mp8t0yq15cabmj4"
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

run_sql() {
  if [ "${FORCE_HOST_SQLITE:-0}" = "1" ]; then
    if [ -z "${HOST_DB_PATH}" ] || [ ! -f "${HOST_DB_PATH}" ]; then
      echo "host sqlite3 실행 경로를 찾지 못했습니다. host_db_path=${HOST_DB_PATH}" >&2
      exit 1
    fi

    if echo "$1" | grep -Eiq '^[[:space:]]*(ALTER|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|CREATE|DROP)'; then
      python3 - "${HOST_DB_PATH}" "$1" <<'PY'
import sqlite3
import sys

db_path = sys.argv[1]
sql = sys.argv[2]
con = sqlite3.connect(db_path, timeout=10)
try:
    con.executescript(sql)
    con.commit()
finally:
    con.close()
PY
      return
    fi

    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 -cmd ".timeout 5000" "${HOST_DB_PATH}" "$1"
      return
    fi

    echo "host sqlite3 명령을 찾지 못했습니다." >&2
    exit 1
  fi

  if docker exec "${NOCODB_CONTAINER}" sh -lc "command -v sqlite3 >/dev/null 2>&1" >/dev/null 2>&1; then
    docker exec "${NOCODB_CONTAINER}" sqlite3 -cmd ".timeout 5000" "${DB_PATH}" "$1"
    return
  fi

  if [ -n "${HOST_DB_PATH}" ] && command -v sqlite3 >/dev/null 2>&1 && [ -f "${HOST_DB_PATH}" ]; then
    sqlite3 -cmd ".timeout 5000" "${HOST_DB_PATH}" "$1"
    return
  fi

  echo "sqlite3 실행 경로를 찾지 못했습니다. host_db_path=${HOST_DB_PATH}" >&2
  exit 1
}

print_rows() {
  sql="$1"
  label="$2"
  echo ""
  echo "=== ${label} ==="
  run_sql "${sql}"
}

DB_PATH="${DB_PATH:-$(detect_db_path)}"
HOST_DB_PATH="${HOST_DB_PATH:-$(detect_host_db_path)}"
TABLE_PARTNERS="$(run_sql "SELECT table_name FROM nc_models_v2 WHERE id='${MODEL_PARTNERS}' LIMIT 1;")"
VIEW_PARTNERS="$(run_sql "SELECT id FROM nc_views_v2 WHERE fk_model_id='${MODEL_PARTNERS}' ORDER BY created_at, id LIMIT 1;")"
TS_HASH="$(date +%s | md5sum | head -c 12)"
LAST_ACTIVE_COLUMN_ID="clastact${TS_HASH:0:8}"
LAST_ACTIVE_VIEW_ID="cvlastact${TS_HASH:0:9}"

if [ -z "${TABLE_PARTNERS}" ]; then
  echo "tbl_Partners 물리 테이블명을 찾지 못했습니다." >&2
  exit 1
fi

if [ -z "${VIEW_PARTNERS}" ]; then
  echo "tbl_Partners 기본 뷰를 찾지 못했습니다." >&2
  exit 1
fi

echo "=== Partnerclass S2-7 last_active_at 추가 시작 ==="
echo "container: ${NOCODB_CONTAINER}"
echo "db_path: ${DB_PATH}"
echo "host_db_path: ${HOST_DB_PATH:-N/A}"
echo "table_partners: ${TABLE_PARTNERS}"
echo "view_partners: ${VIEW_PARTNERS}"

COLUMN_EXISTS="$(run_sql "PRAGMA table_info('${TABLE_PARTNERS}');" | awk -F'|' '$2=="last_active_at" { print $2 }')"
META_ID="$(run_sql "SELECT id FROM nc_columns_v2 WHERE fk_model_id='${MODEL_PARTNERS}' AND column_name='last_active_at' LIMIT 1;")"
VIEW_EXISTS="$(run_sql "SELECT COUNT(1) FROM nc_grid_view_columns_v2 WHERE fk_view_id='${VIEW_PARTNERS}' AND fk_column_id='${META_ID}';")"

if [ -z "${COLUMN_EXISTS}" ] || [ -z "${META_ID}" ] || [ "${VIEW_EXISTS}" = "0" ]; then
  echo "[prep] NocoDB 쓰기 유지보수 모드 진입"
  FORCE_HOST_SQLITE=1
  docker stop "${NOCODB_CONTAINER}" >/dev/null
  sleep 3
fi

if [ -z "${COLUMN_EXISTS}" ]; then
  echo "[1/5] tbl_Partners.last_active_at 물리 컬럼 추가"
  run_sql "ALTER TABLE '${TABLE_PARTNERS}' ADD COLUMN last_active_at TEXT;"
else
  echo "[1/5] tbl_Partners.last_active_at 물리 컬럼 이미 존재"
fi

if [ -z "${META_ID}" ]; then
  echo "[2/5] nc_columns_v2 last_active_at 메타 등록"
  run_sql "
INSERT INTO nc_columns_v2 (
  id, source_id, base_id, fk_model_id, title, column_name, uidt, dt,
  pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order',
  fk_workspace_id, meta, readonly, created_at, updated_at
) VALUES (
  '${LAST_ACTIVE_COLUMN_ID}', '${SOURCE_ID}', '${BASE_ID}', '${MODEL_PARTNERS}',
  'last_active_at', 'last_active_at', 'SingleLineText', 'text',
  0, NULL, 0, 0, 0, 'specificType', '', NULL, 0, 40,
  '${WORKSPACE_ID}', '{\"defaultViewColOrder\":40,\"defaultViewColVisibility\":1}', 0,
  datetime('now'), datetime('now')
);
"
  META_ID="${LAST_ACTIVE_COLUMN_ID}"
else
  echo "[2/5] nc_columns_v2 last_active_at 메타 이미 존재: ${META_ID}"
fi

VIEW_EXISTS="$(run_sql "SELECT COUNT(1) FROM nc_grid_view_columns_v2 WHERE fk_view_id='${VIEW_PARTNERS}' AND fk_column_id='${META_ID}';")"
if [ "${VIEW_EXISTS}" = "0" ]; then
  echo "[3/5] 기본 그리드 뷰에 last_active_at 컬럼 추가"
  run_sql "
INSERT INTO nc_grid_view_columns_v2 (
  id, fk_view_id, fk_column_id, source_id, base_id, width, show, 'order',
  aggregation, fk_workspace_id, created_at, updated_at
) VALUES (
  '${LAST_ACTIVE_VIEW_ID}', '${VIEW_PARTNERS}', '${META_ID}', '${SOURCE_ID}', '${BASE_ID}',
  '180px', 1, 40, 'none', '${WORKSPACE_ID}', datetime('now'), datetime('now')
);
"
else
  echo "[3/5] 기본 그리드 뷰 last_active_at 컬럼 이미 등록"
fi

echo "[4/5] 기존 파트너 초기값 세팅"
run_sql "
UPDATE '${TABLE_PARTNERS}'
SET last_active_at = COALESCE(NULLIF(trim(last_active_at), ''), updated_at, created_at)
WHERE last_active_at IS NULL OR trim(last_active_at) = '';
"

echo "[5/5] NocoDB 재시작"
if [ "${FORCE_HOST_SQLITE:-0}" = "1" ]; then
  docker start "${NOCODB_CONTAINER}" >/dev/null
else
  docker restart "${NOCODB_CONTAINER}" >/dev/null
fi
sleep 12

print_rows "SELECT partner_code, status, substr(last_active_at, 1, 19) FROM '${TABLE_PARTNERS}' ORDER BY partner_code LIMIT 10;" "tbl_Partners.last_active_at 샘플"
print_rows "SELECT COUNT(1) FROM '${TABLE_PARTNERS}' WHERE last_active_at IS NOT NULL AND trim(last_active_at) <> '';" "last_active_at 채워진 파트너 수"

echo ""
echo "=== 완료 ==="
