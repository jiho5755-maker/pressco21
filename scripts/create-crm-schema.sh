#!/bin/bash
# CRM 스키마 확장 스크립트 (CRM-001)
# 1) tbl_tx_history 신규 테이블 생성 (거래내역 10만건용)
# 2) tbl_Customers 필드 12개 추가 (customer_type, customer_status 등)
#    ※ outstanding_balance는 add-crm-balance-fields.sh에서 이미 추가됨
# 3) 인덱스 3개 생성
#
# 실행 방법:
# ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/create-crm-schema.sh

set -e

DB="/home/ubuntu/nocodb/nocodb_data/noco.db"
SOURCE_ID="bife5m5mnnejeq8"
BASE_ID="pu0mwk97kac8a5p"
WS_ID="wm4qiudb"
CUST_MODEL="mffgxkftaeppyk0"
CUST_VIEW="vwdhfedtk4bh4sxo"
TABLE_PREFIX="nc__w6f___"

echo "=== CRM 스키마 확장 시작 ==="

# ────────────────────────────────────────────
# [1] tbl_tx_history 데이터 테이블 생성
# ────────────────────────────────────────────
echo "[1/5] tbl_tx_history 데이터 테이블 생성..."
sqlite3 "$DB" "
CREATE TABLE IF NOT EXISTS '${TABLE_PREFIX}tbl_tx_history' (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT (datetime('now','utc')),
  updated_at DATETIME DEFAULT (datetime('now','utc')),
  tx_date TEXT,
  legacy_book_id TEXT,
  customer_name TEXT,
  tx_type TEXT,
  amount INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  memo TEXT,
  slip_no TEXT,
  debit_account TEXT,
  credit_account TEXT,
  ledger TEXT,
  tx_year INTEGER
);
"
echo "  ✅ 데이터 테이블 생성 완료"

# ────────────────────────────────────────────
# [2] tbl_tx_history NocoDB 메타 등록
# ────────────────────────────────────────────
echo "[2/5] tbl_tx_history 메타 등록..."

TS=$(date +%s | md5sum | head -c 12)
TX_MODEL_ID="mtxh${TS:0:11}"
TX_VIEW_ID="vwtxh${TS:1:11}"

# 컬럼 ID 생성
COL_TX_ID="ctx_id_${TS:0:7}"
COL_TX_CA="ctx_ca_${TS:1:7}"
COL_TX_UA="ctx_ua_${TS:2:7}"
COL_TX_DATE="ctx_dt_${TS:3:7}"
COL_TX_BOOK="ctx_bk_${TS:4:7}"
COL_TX_CNAME="ctx_cn_${TS:5:7}"
COL_TX_TYPE="ctx_tp_${TS:0:6}${TS:6:1}"
COL_TX_AMT="ctx_am_${TS:1:6}${TS:7:1}"
COL_TX_TAX="ctx_tx_${TS:2:6}${TS:8:1}"
COL_TX_MEMO="ctx_mm_${TS:3:6}${TS:9:1}"
COL_TX_SLIP="ctx_sl_${TS:4:6}${TS:10:1}"
COL_TX_DEBT="ctx_db_${TS:5:6}${TS:11:1}"
COL_TX_CRED="ctx_cr_${TS:0:5}${TS:7:2}"
COL_TX_LEDG="ctx_lg_${TS:1:5}${TS:8:2}"
COL_TX_YEAR="ctx_yr_${TS:2:5}${TS:9:2}"

sqlite3 "$DB" "
-- 테이블 메타 등록
INSERT INTO nc_models_v2 (
  id, source_id, base_id, table_name, title, type, meta, schema, enabled,
  mm, tags, pinned, deleted, 'order', description, synced,
  fk_workspace_id, created_by, owned_by, uuid, password,
  fk_custom_url_id, created_at, updated_at
) VALUES (
  '$TX_MODEL_ID', '$SOURCE_ID', '$BASE_ID',
  '${TABLE_PREFIX}tbl_tx_history', 'tbl_tx_history', 'table',
  NULL, NULL, 1, 0, NULL, NULL, NULL, 10, NULL, 0,
  '$WS_ID', NULL, NULL, NULL, NULL, NULL,
  datetime('now'), datetime('now')
);

-- 컬럼 메타 등록 (시스템 3개 + 데이터 12개)
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_ID','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','Id','id','ID','integer',1,NULL,1,1,1,'specificType','','',0,1,'$WS_ID','{\"defaultViewColOrder\":1,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_CA','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','CreatedAt','created_at','CreatedTime','datetime',0,NULL,0,0,0,'specificType','',NULL,1,2,'$WS_ID','{\"defaultViewColOrder\":2,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_UA','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','UpdatedAt','updated_at','LastModifiedTime','datetime',0,NULL,0,0,0,'specificType','',NULL,1,3,'$WS_ID','{\"defaultViewColOrder\":3,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_DATE','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','tx_date','tx_date','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,4,'$WS_ID','{\"defaultViewColOrder\":4,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_BOOK','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','legacy_book_id','legacy_book_id','SingleLineText','text',0,1,0,0,0,'specificType','',NULL,0,5,'$WS_ID','{\"defaultViewColOrder\":5,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_CNAME','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','customer_name','customer_name','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,6,'$WS_ID','{\"defaultViewColOrder\":6,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_TYPE','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','tx_type','tx_type','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,7,'$WS_ID','{\"defaultViewColOrder\":7,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_AMT','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','amount','amount','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,8,'$WS_ID','{\"defaultViewColOrder\":8,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_TAX','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','tax','tax','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,9,'$WS_ID','{\"defaultViewColOrder\":9,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_MEMO','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','memo','memo','LongText','text',0,NULL,0,0,0,'specificType','',NULL,0,10,'$WS_ID','{\"defaultViewColOrder\":10,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_SLIP','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','slip_no','slip_no','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,11,'$WS_ID','{\"defaultViewColOrder\":11,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_DEBT','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','debit_account','debit_account','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,12,'$WS_ID','{\"defaultViewColOrder\":12,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_CRED','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','credit_account','credit_account','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,13,'$WS_ID','{\"defaultViewColOrder\":13,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_LEDG','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','ledger','ledger','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,14,'$WS_ID','{\"defaultViewColOrder\":14,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_TX_YEAR','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','tx_year','tx_year','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,15,'$WS_ID','{\"defaultViewColOrder\":15,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

-- 뷰 등록
INSERT INTO nc_views_v2 (id, source_id, base_id, fk_model_id, title, type, is_default, show_system_fields, lock_type, show, 'order', fk_workspace_id, created_at, updated_at)
VALUES ('$TX_VIEW_ID','$SOURCE_ID','$BASE_ID','$TX_MODEL_ID','tbl_tx_history',3,NULL,NULL,'collaborative',1,1,'$WS_ID',datetime('now'),datetime('now'));

INSERT INTO nc_grid_view_v2 (fk_view_id, source_id, base_id, uuid, meta, row_height, fk_workspace_id, created_at, updated_at)
VALUES ('$TX_VIEW_ID','$SOURCE_ID','$BASE_ID',NULL,NULL,NULL,'$WS_ID',datetime('now'),datetime('now'));

-- 뷰 컬럼 등록 (id 필드 필수 — nc_grid_view_columns_v2.id NOT NULL varchar(20))
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh01','$TX_VIEW_ID','$COL_TX_ID','$SOURCE_ID','$BASE_ID',1,1,'70','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh02','$TX_VIEW_ID','$COL_TX_CA','$SOURCE_ID','$BASE_ID',2,0,'140','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh03','$TX_VIEW_ID','$COL_TX_UA','$SOURCE_ID','$BASE_ID',3,0,'140','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh04','$TX_VIEW_ID','$COL_TX_DATE','$SOURCE_ID','$BASE_ID',4,1,'110','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh05','$TX_VIEW_ID','$COL_TX_BOOK','$SOURCE_ID','$BASE_ID',5,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh06','$TX_VIEW_ID','$COL_TX_CNAME','$SOURCE_ID','$BASE_ID',6,1,'160','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh07','$TX_VIEW_ID','$COL_TX_TYPE','$SOURCE_ID','$BASE_ID',7,1,'80','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh08','$TX_VIEW_ID','$COL_TX_AMT','$SOURCE_ID','$BASE_ID',8,1,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh09','$TX_VIEW_ID','$COL_TX_TAX','$SOURCE_ID','$BASE_ID',9,1,'80','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh10','$TX_VIEW_ID','$COL_TX_MEMO','$SOURCE_ID','$BASE_ID',10,1,'200','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh11','$TX_VIEW_ID','$COL_TX_SLIP','$SOURCE_ID','$BASE_ID',11,0,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh12','$TX_VIEW_ID','$COL_TX_DEBT','$SOURCE_ID','$BASE_ID',12,0,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh13','$TX_VIEW_ID','$COL_TX_CRED','$SOURCE_ID','$BASE_ID',13,0,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh14','$TX_VIEW_ID','$COL_TX_LEDG','$SOURCE_ID','$BASE_ID',14,0,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvtxh15','$TX_VIEW_ID','$COL_TX_YEAR','$SOURCE_ID','$BASE_ID',15,1,'70','$WS_ID',datetime('now'),datetime('now'));
"
echo "  ✅ tbl_tx_history 메타 등록 완료 (TX_MODEL_ID: $TX_MODEL_ID)"

# ────────────────────────────────────────────
# [3] tbl_Customers 12개 필드 추가
# (outstanding_balance는 이미 존재 — 제외)
# ────────────────────────────────────────────
echo "[3/5] tbl_Customers 필드 12개 추가..."

TS2=$(date +%s | md5sum | head -c 12)
C01="cust_ctp_${TS2:0:8}"
C02="cust_cst_${TS2:1:8}"
C03="cust_lod_${TS2:2:8}"
C04="cust_fod_${TS2:3:8}"
C05="cust_toc_${TS2:4:8}"
C06="cust_toa_${TS2:5:8}"
C07="cust_mgr_${TS2:0:7}x"
C08="cust_amb_${TS2:1:7}x"
C09="cust_acd_${TS2:2:7}x"
C10="cust_drt_${TS2:3:7}x"
C11="cust_gql_${TS2:4:7}x"
C12="cust_gat_${TS2:5:7}x"

sqlite3 "$DB" "
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN customer_type TEXT DEFAULT 'OTHER';
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN customer_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN last_order_date TEXT;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN first_order_date TEXT;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN total_order_count INTEGER DEFAULT 0;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN total_order_amount INTEGER DEFAULT 0;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN member_grade TEXT DEFAULT 'MEMBER';
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN is_ambassador INTEGER DEFAULT 0;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN ambassador_code TEXT;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN discount_rate REAL DEFAULT 0;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN grade_qualification TEXT;
ALTER TABLE '${TABLE_PREFIX}tbl_Customers' ADD COLUMN grade_approved_at TEXT;
"
echo "  ✅ ALTER TABLE 완료"

# NocoDB 컬럼 메타 등록 (order 30부터, outstanding_balance가 29)
sqlite3 "$DB" "
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C01','$SOURCE_ID','$BASE_ID','$CUST_MODEL','customer_type','customer_type','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,30,'$WS_ID','{\"defaultViewColOrder\":30,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C02','$SOURCE_ID','$BASE_ID','$CUST_MODEL','customer_status','customer_status','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,31,'$WS_ID','{\"defaultViewColOrder\":31,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C03','$SOURCE_ID','$BASE_ID','$CUST_MODEL','last_order_date','last_order_date','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,32,'$WS_ID','{\"defaultViewColOrder\":32,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C04','$SOURCE_ID','$BASE_ID','$CUST_MODEL','first_order_date','first_order_date','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,33,'$WS_ID','{\"defaultViewColOrder\":33,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C05','$SOURCE_ID','$BASE_ID','$CUST_MODEL','total_order_count','total_order_count','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,34,'$WS_ID','{\"defaultViewColOrder\":34,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C06','$SOURCE_ID','$BASE_ID','$CUST_MODEL','total_order_amount','total_order_amount','Number','integer',0,NULL,0,0,0,'specificType','',NULL,0,35,'$WS_ID','{\"defaultViewColOrder\":35,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C07','$SOURCE_ID','$BASE_ID','$CUST_MODEL','member_grade','member_grade','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,36,'$WS_ID','{\"defaultViewColOrder\":36,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C08','$SOURCE_ID','$BASE_ID','$CUST_MODEL','is_ambassador','is_ambassador','Checkbox','integer',0,NULL,0,0,0,'specificType','',NULL,0,37,'$WS_ID','{\"defaultViewColOrder\":37,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C09','$SOURCE_ID','$BASE_ID','$CUST_MODEL','ambassador_code','ambassador_code','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,38,'$WS_ID','{\"defaultViewColOrder\":38,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C10','$SOURCE_ID','$BASE_ID','$CUST_MODEL','discount_rate','discount_rate','Number','float',0,NULL,0,0,0,'specificType','',NULL,0,39,'$WS_ID','{\"defaultViewColOrder\":39,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C11','$SOURCE_ID','$BASE_ID','$CUST_MODEL','grade_qualification','grade_qualification','LongText','text',0,NULL,0,0,0,'specificType','',NULL,0,40,'$WS_ID','{\"defaultViewColOrder\":40,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));

INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, 'order', fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$C12','$SOURCE_ID','$BASE_ID','$CUST_MODEL','grade_approved_at','grade_approved_at','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,41,'$WS_ID','{\"defaultViewColOrder\":41,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
"

# 뷰 컬럼 등록 (id 필드 필수 — nc_grid_view_columns_v2.id NOT NULL varchar(20))
sqlite3 "$DB" "
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust01','$CUST_VIEW','$C01','$SOURCE_ID','$BASE_ID',30,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust02','$CUST_VIEW','$C02','$SOURCE_ID','$BASE_ID',31,1,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust03','$CUST_VIEW','$C03','$SOURCE_ID','$BASE_ID',32,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust04','$CUST_VIEW','$C04','$SOURCE_ID','$BASE_ID',33,0,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust05','$CUST_VIEW','$C05','$SOURCE_ID','$BASE_ID',34,0,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust06','$CUST_VIEW','$C06','$SOURCE_ID','$BASE_ID',35,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust07','$CUST_VIEW','$C07','$SOURCE_ID','$BASE_ID',36,1,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust08','$CUST_VIEW','$C08','$SOURCE_ID','$BASE_ID',37,1,'80','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust09','$CUST_VIEW','$C09','$SOURCE_ID','$BASE_ID',38,0,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust10','$CUST_VIEW','$C10','$SOURCE_ID','$BASE_ID',39,0,'80','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust11','$CUST_VIEW','$C11','$SOURCE_ID','$BASE_ID',40,0,'180','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, 'order', show, width, fk_workspace_id, created_at, updated_at) VALUES ('gvcust12','$CUST_VIEW','$C12','$SOURCE_ID','$BASE_ID',41,0,'120','$WS_ID',datetime('now'),datetime('now'));
"
echo "  ✅ customers 12개 필드 등록 완료"

# ────────────────────────────────────────────
# [4] 인덱스 생성
# ────────────────────────────────────────────
echo "[4/5] 인덱스 생성..."
sqlite3 "$DB" "
CREATE INDEX IF NOT EXISTS idx_tx_date ON '${TABLE_PREFIX}tbl_tx_history'(tx_date);
CREATE INDEX IF NOT EXISTS idx_tx_book ON '${TABLE_PREFIX}tbl_tx_history'(legacy_book_id);
CREATE INDEX IF NOT EXISTS idx_tx_year ON '${TABLE_PREFIX}tbl_tx_history'(tx_year);
CREATE INDEX IF NOT EXISTS idx_cust_status ON '${TABLE_PREFIX}tbl_Customers'(customer_status);
CREATE INDEX IF NOT EXISTS idx_cust_grade ON '${TABLE_PREFIX}tbl_Customers'(member_grade);
"
echo "  ✅ 인덱스 5개 생성 완료"

# ────────────────────────────────────────────
# [5] NocoDB 재시작
# ────────────────────────────────────────────
echo "[5/5] NocoDB 재시작..."
docker restart nocodb
sleep 12
docker network connect n8n_n8n-network nocodb 2>/dev/null || true
echo "  ✅ NocoDB 재시작 완료"

echo ""
echo "=== 완료 ==="
echo "TX_MODEL_ID: $TX_MODEL_ID"
echo "TX_VIEW_ID: $TX_VIEW_ID"
echo ""
echo "검증 명령어:"
echo "  sqlite3 $DB \"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_tx_%';\""
echo "  sqlite3 $DB \"PRAGMA table_info('${TABLE_PREFIX}tbl_Customers');\""
