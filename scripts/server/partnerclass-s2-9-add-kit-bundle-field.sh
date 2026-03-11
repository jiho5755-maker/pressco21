#!/bin/bash
# Partnerclass Phase 3 S2-9
# - tbl_Classes.kit_bundle_branduid 물리 컬럼 + NocoDB 메타 추가
#
# 실행 예시:
#   ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/server/partnerclass-s2-9-add-kit-bundle-field.sh

set -euo pipefail

NOCODB_CONTAINER="${NOCODB_CONTAINER:-nocodb}"
MODEL_CLASSES="mpvsno4or6asbxk"

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

    sqlite3 -cmd ".timeout 5000" "${HOST_DB_PATH}" "$1"
    return
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
TABLE_CLASSES="$(run_sql "SELECT table_name FROM nc_models_v2 WHERE id='${MODEL_CLASSES}' LIMIT 1;")"
SOURCE_ID="$(run_sql "SELECT source_id FROM nc_models_v2 WHERE id='${MODEL_CLASSES}' LIMIT 1;")"
BASE_ID="$(run_sql "SELECT base_id FROM nc_models_v2 WHERE id='${MODEL_CLASSES}' LIMIT 1;")"
WORKSPACE_ID="$(run_sql "SELECT fk_workspace_id FROM nc_models_v2 WHERE id='${MODEL_CLASSES}' LIMIT 1;")"
VIEW_CLASSES="$(run_sql "SELECT id FROM nc_views_v2 WHERE fk_model_id='${MODEL_CLASSES}' ORDER BY created_at, id LIMIT 1;")"
TS_HASH="$(date +%s | md5sum | head -c 12)"
FIELD_NAME="kit_bundle_branduid"
COLUMN_ID="ckitbund${TS_HASH:0:8}"
VIEW_COLUMN_ID="cvkitbun${TS_HASH:0:9}"

if [ -z "${TABLE_CLASSES}" ] || [ -z "${SOURCE_ID}" ] || [ -z "${BASE_ID}" ] || [ -z "${WORKSPACE_ID}" ] || [ -z "${VIEW_CLASSES}" ]; then
  echo "tbl_Classes 메타 정보를 찾지 못했습니다." >&2
  exit 1
fi

echo "=== Partnerclass S2-9 kit_bundle_branduid 추가 시작 ==="
echo "container: ${NOCODB_CONTAINER}"
echo "db_path: ${DB_PATH}"
echo "host_db_path: ${HOST_DB_PATH:-N/A}"
echo "table_classes: ${TABLE_CLASSES}"
echo "view_classes: ${VIEW_CLASSES}"

COLUMN_EXISTS="$(run_sql "PRAGMA table_info('${TABLE_CLASSES}');" | awk -F'|' '$2=="'"${FIELD_NAME}"'" { print $2 }')"
META_ID="$(run_sql "SELECT id FROM nc_columns_v2 WHERE fk_model_id='${MODEL_CLASSES}' AND column_name='${FIELD_NAME}' LIMIT 1;")"
VIEW_EXISTS="$(run_sql "SELECT COUNT(1) FROM nc_grid_view_columns_v2 WHERE fk_view_id='${VIEW_CLASSES}' AND fk_column_id='${META_ID}';")"

if [ -z "${COLUMN_EXISTS}" ] || [ -z "${META_ID}" ] || [ "${VIEW_EXISTS}" = "0" ]; then
  echo "[prep] NocoDB 쓰기 유지보수 모드 진입"
  FORCE_HOST_SQLITE=1
  docker stop "${NOCODB_CONTAINER}" >/dev/null
  sleep 3
fi

if [ -z "${COLUMN_EXISTS}" ]; then
  echo "[1/4] tbl_Classes.${FIELD_NAME} 물리 컬럼 추가"
  run_sql "ALTER TABLE '${TABLE_CLASSES}' ADD COLUMN ${FIELD_NAME} TEXT;"
else
  echo "[1/4] tbl_Classes.${FIELD_NAME} 물리 컬럼 이미 존재"
fi

if [ -z "${META_ID}" ]; then
  echo "[2/4] nc_columns_v2 ${FIELD_NAME} 메타 등록"
  run_sql "
INSERT INTO nc_columns_v2 (
  id, source_id, base_id, fk_model_id, title, column_name, uidt, dt,
  pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order',
  fk_workspace_id, meta, readonly, created_at, updated_at
) VALUES (
  '${COLUMN_ID}', '${SOURCE_ID}', '${BASE_ID}', '${MODEL_CLASSES}',
  '${FIELD_NAME}', '${FIELD_NAME}', 'SingleLineText', 'text',
  0, NULL, 0, 0, 0, 'specificType', '', NULL, 0, 37,
  '${WORKSPACE_ID}', '{\"defaultViewColOrder\":37,\"defaultViewColVisibility\":1}', 0,
  datetime('now'), datetime('now')
);
"
  META_ID="${COLUMN_ID}"
else
  echo "[2/4] nc_columns_v2 ${FIELD_NAME} 메타 이미 존재: ${META_ID}"
fi

VIEW_EXISTS="$(run_sql "SELECT COUNT(1) FROM nc_grid_view_columns_v2 WHERE fk_view_id='${VIEW_CLASSES}' AND fk_column_id='${META_ID}';")"
if [ "${VIEW_EXISTS}" = "0" ]; then
  echo "[3/4] 기본 그리드 뷰에 ${FIELD_NAME} 컬럼 추가"
  run_sql "
INSERT INTO nc_grid_view_columns_v2 (
  id, fk_view_id, fk_column_id, source_id, base_id, width, show, 'order',
  aggregation, fk_workspace_id, created_at, updated_at
) VALUES (
  '${VIEW_COLUMN_ID}', '${VIEW_CLASSES}', '${META_ID}', '${SOURCE_ID}', '${BASE_ID}',
  '180px', 1, 37, 'none', '${WORKSPACE_ID}', datetime('now'), datetime('now')
);
"
else
  echo "[3/4] 기본 그리드 뷰 ${FIELD_NAME} 컬럼 이미 등록"
fi

echo "[4/4] NocoDB 재시작"
if [ "${FORCE_HOST_SQLITE:-0}" = "1" ]; then
  docker start "${NOCODB_CONTAINER}" >/dev/null
else
  docker restart "${NOCODB_CONTAINER}" >/dev/null
fi
sleep 12

print_rows "PRAGMA table_info('${TABLE_CLASSES}');" "tbl_Classes 컬럼 확인"
print_rows "SELECT id, title, column_name FROM nc_columns_v2 WHERE fk_model_id='${MODEL_CLASSES}' AND column_name='${FIELD_NAME}';" "NocoDB 메타 확인"

echo ""
echo "=== 완료 ==="
