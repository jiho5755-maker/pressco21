#!/bin/bash
# tbl_Schedules 테이블 생성 스크립트
# NocoDB v0.301.2 — SQLite 직접 수정 (3단계 패턴)
#
# 실행 방법:
# ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/create-tbl-schedules.sh
#
# 또는 서버에서 직접:
# bash create-tbl-schedules.sh

set -e

NOCODB_DB="/root/nocodb-data/noco.db"

echo "=== tbl_Schedules 테이블 생성 시작 ==="

# 1단계: 데이터 테이블 생성
echo "[1/4] ALTER TABLE — 데이터 테이블 생성..."
docker exec nocodb sqlite3 "$NOCODB_DB" "
CREATE TABLE IF NOT EXISTS 'nc_5za5___tbl_Schedules' (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT (datetime('now','utc')),
  updated_at DATETIME DEFAULT (datetime('now','utc')),
  schedule_id TEXT,
  class_id TEXT,
  schedule_date TEXT,
  schedule_time TEXT,
  capacity INTEGER DEFAULT 8,
  booked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);
"
echo "  ✅ 데이터 테이블 생성 완료"

# 2단계: nc_models_v2 INSERT — 테이블 메타데이터 등록
echo "[2/4] nc_models_v2 INSERT — 테이블 메타 등록..."

# 고유 ID 생성 (기존 패턴: m + 랜덤 15자)
TABLE_MODEL_ID="msch$(date +%s | md5sum | head -c 11)"
VIEW_ID="vwsch$(date +%s | md5sum | head -c 11)"

echo "  TABLE_MODEL_ID: $TABLE_MODEL_ID"
echo "  VIEW_ID: $VIEW_ID"

docker exec nocodb sqlite3 "$NOCODB_DB" "
INSERT INTO nc_models_v2 (
  id, source_id, base_id, table_name, title, type, meta, schema, enabled,
  mm, tags, pinned, deleted, 'order', description, synced,
  fk_workspace_id, created_by, owned_by, uuid, password,
  fk_custom_url_id, created_at, updated_at
) VALUES (
  '$TABLE_MODEL_ID', 'bdbbd0qepn9cnzw', 'poey1yrm1r6sthf',
  'nc_5za5___tbl_Schedules', 'tbl_Schedules', 'table',
  NULL, NULL, 1, 0, NULL, NULL, NULL, 19, NULL, 0,
  'wm4qiudb', NULL, NULL, NULL, NULL, NULL,
  datetime('now'), datetime('now')
);
"
echo "  ✅ 테이블 메타 등록 완료"

# 3단계: nc_columns_v2 INSERT — 컬럼 메타데이터 등록
echo "[3/4] nc_columns_v2 INSERT — 컬럼 메타 등록..."

# ID 컬럼 (자동생성, system)
COL_ID="csch_id_$(date +%s | md5sum | head -c 6)"
COL_CA="csch_ca_$(date +%s | md5sum | head -c 6)"
COL_UA="csch_ua_$(date +%s | md5sum | head -c 6)"
COL_SID="csch_sid$(date +%s | md5sum | head -c 6)"
COL_CID="csch_cid$(date +%s | md5sum | head -c 6)"
COL_DATE="csch_dt_$(date +%s | md5sum | head -c 6)"
COL_TIME="csch_tm_$(date +%s | md5sum | head -c 6)"
COL_CAP="csch_cp_$(date +%s | md5sum | head -c 6)"
COL_BK="csch_bk_$(date +%s | md5sum | head -c 6)"
COL_ST="csch_st_$(date +%s | md5sum | head -c 6)"

docker exec nocodb sqlite3 "$NOCODB_DB" "
-- Id (PK, auto-increment)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_ID','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','Id','id','ID','integer',1,NULL,1,1,1,'specificType','','',0,1,'wm4qiudb','{\"defaultViewColOrder\":1,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- CreatedAt (system)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_CA','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','CreatedAt','created_at','CreatedTime','datetime',0,NULL,0,0,0,'specificType','',NULL,1,2,'wm4qiudb','{\"defaultViewColOrder\":2,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- UpdatedAt (system)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_UA','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','UpdatedAt','updated_at','LastModifiedTime','datetime',0,NULL,0,0,0,'specificType','',NULL,1,3,'wm4qiudb','{\"defaultViewColOrder\":3,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- schedule_id (SingleLineText, PV=1)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_SID','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','schedule_id','schedule_id','SingleLineText','text',0,1,0,0,0,'specificType','',NULL,0,4,'wm4qiudb','{\"defaultViewColOrder\":4,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- class_id (SingleLineText)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_CID','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','class_id','class_id','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,5,'wm4qiudb','{\"defaultViewColOrder\":5,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- schedule_date (SingleLineText — YYYY-MM-DD)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_DATE','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','schedule_date','schedule_date','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,6,'wm4qiudb','{\"defaultViewColOrder\":6,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- schedule_time (SingleLineText — HH:MM)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TIME','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','schedule_time','schedule_time','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,7,'wm4qiudb','{\"defaultViewColOrder\":7,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- capacity (Number, default 8)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_CAP','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','capacity','capacity','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,8,'wm4qiudb','{\"defaultViewColOrder\":8,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- booked_count (Number, default 0)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_BK','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','booked_count','booked_count','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,9,'wm4qiudb','{\"defaultViewColOrder\":9,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- status (SingleLineText — active/cancelled/full)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_ST','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','status','status','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,10,'wm4qiudb','{\"defaultViewColOrder\":10,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
"
echo "  ✅ 컬럼 메타 등록 완료 (10개)"

# 4단계: nc_views_v2 + nc_grid_view_v2 + nc_grid_view_columns_v2 — 뷰 등록
echo "[4/4] 뷰 메타 등록..."

GRID_FKV_ID="$VIEW_ID"

docker exec nocodb sqlite3 "$NOCODB_DB" "
-- 뷰 등록
INSERT INTO nc_views_v2 (id, source_id, base_id, fk_model_id, title, type, is_default, show_system_fields, lock_type, show, 'order', fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','bdbbd0qepn9cnzw','poey1yrm1r6sthf','$TABLE_MODEL_ID','tbl_Schedules',3,NULL,NULL,'collaborative',1,1,'wm4qiudb',datetime('now'),datetime('now'));

-- 그리드 뷰 등록
INSERT INTO nc_grid_view_v2 (fk_view_id, source_id, base_id, uuid, meta, row_height, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','bdbbd0qepn9cnzw','poey1yrm1r6sthf',NULL,NULL,NULL,'wm4qiudb',datetime('now'),datetime('now'));

-- 그리드 뷰 컬럼 등록 (10개 컬럼)
INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_ID','bdbbd0qepn9cnzw','poey1yrm1r6sthf',1,1,'70','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_CA','bdbbd0qepn9cnzw','poey1yrm1r6sthf',2,0,'140','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_UA','bdbbd0qepn9cnzw','poey1yrm1r6sthf',3,0,'140','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_SID','bdbbd0qepn9cnzw','poey1yrm1r6sthf',4,1,'200','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_CID','bdbbd0qepn9cnzw','poey1yrm1r6sthf',5,1,'180','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_DATE','bdbbd0qepn9cnzw','poey1yrm1r6sthf',6,1,'120','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_TIME','bdbbd0qepn9cnzw','poey1yrm1r6sthf',7,1,'100','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_CAP','bdbbd0qepn9cnzw','poey1yrm1r6sthf',8,1,'80','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_BK','bdbbd0qepn9cnzw','poey1yrm1r6sthf',9,1,'80','wm4qiudb',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_columns_v2 (fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at)
VALUES ('$VIEW_ID','$COL_ST','bdbbd0qepn9cnzw','poey1yrm1r6sthf',10,1,'100','wm4qiudb',datetime('now'),datetime('now'));
"
echo "  ✅ 뷰 메타 등록 완료"

# 5단계: Docker restart + network reconnect
echo ""
echo "[5/5] Docker restart..."
docker restart nocodb
sleep 12
docker network connect n8n_n8n-network nocodb 2>/dev/null || true
echo "  ✅ NocoDB 재시작 완료"

echo ""
echo "=== 생성 완료 ==="
echo "TABLE_MODEL_ID: $TABLE_MODEL_ID"
echo "VIEW_ID: $VIEW_ID"
echo ""
echo "검증 명령어:"
echo "  curl -s -H 'xc-token: \$NOCODB_API_TOKEN' 'https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/$TABLE_MODEL_ID?limit=1'"
echo ""
echo "테스트 INSERT:"
echo "  curl -s -X POST -H 'xc-token: \$NOCODB_API_TOKEN' -H 'Content-Type: application/json' \\"
echo "    'https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/$TABLE_MODEL_ID' \\"
echo "    -d '{\"schedule_id\":\"SCH_20260310_01\",\"class_id\":\"CL_202602_001\",\"schedule_date\":\"2026-03-10\",\"schedule_time\":\"14:00\",\"capacity\":8,\"booked_count\":0,\"status\":\"active\"}'"
