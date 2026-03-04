#!/bin/bash
# CRM 미수금 관리 필드 추가 스크립트
# 대상: tbl_Invoices (paid_amount, previous_balance, current_balance, payment_status)
#       tbl_Customers (outstanding_balance)
#
# 실행 방법:
# ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 'bash -s' < scripts/add-crm-balance-fields.sh
#
# ✅ 2026-03-04 실행 완료 (production)
#    - invoices 컬럼 ID: cinv_paid_bc26e036, cinv_prev_bc26e036, cinv_curb_bc26e036, cinv_psta_bc26e036
#    - customers 컬럼 ID: cust_outs_bc26e036

DB="/home/ubuntu/nocodb/nocodb_data/noco.db"
SOURCE_ID="bife5m5mnnejeq8"
BASE_ID="pu0mwk97kac8a5p"
WS_ID="wm4qiudb"
INV_MODEL="ml81i9mcuw0pjzk"   # tbl_Invoices
CUST_MODEL="mffgxkftaeppyk0"  # tbl_Customers
INV_VIEW="vw1x2ao28gavam7g"
CUST_VIEW="vwdhfedtk4bh4sxo"

TS=$(date +%s | md5sum | head -c 12)
COL_PAID="cinv_paid_${TS:0:8}"
COL_PREV="cinv_prev_${TS:1:8}"
COL_CURB="cinv_curb_${TS:2:8}"
COL_PSTA="cinv_psta_${TS:3:8}"
COL_OUTS="cust_outs_${TS:4:8}"

echo "=== CRM 미수금 필드 추가 ==="

# [1] 실제 데이터 테이블 컬럼 추가
echo "[1/4] ALTER TABLE..."
sqlite3 "$DB" "
ALTER TABLE 'nc__w6f___tbl_Invoices' ADD COLUMN paid_amount REAL DEFAULT 0;
ALTER TABLE 'nc__w6f___tbl_Invoices' ADD COLUMN previous_balance REAL DEFAULT 0;
ALTER TABLE 'nc__w6f___tbl_Invoices' ADD COLUMN current_balance REAL DEFAULT 0;
ALTER TABLE 'nc__w6f___tbl_Invoices' ADD COLUMN payment_status TEXT;
ALTER TABLE 'nc__w6f___tbl_Customers' ADD COLUMN outstanding_balance REAL DEFAULT 0;
"
echo "  ✅ ALTER TABLE 완료"

# [2] NocoDB 컬럼 메타 등록
echo "[2/4] nc_columns_v2 등록..."
sqlite3 "$DB" "
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, [order], fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_PAID','$SOURCE_ID','$BASE_ID','$INV_MODEL','paid_amount','paid_amount','Number','float',0,NULL,0,0,0,'specificType','',NULL,0,17,'$WS_ID','{\"defaultViewColOrder\":17,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, [order], fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_PREV','$SOURCE_ID','$BASE_ID','$INV_MODEL','previous_balance','previous_balance','Number','float',0,NULL,0,0,0,'specificType','',NULL,0,18,'$WS_ID','{\"defaultViewColOrder\":18,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, [order], fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_CURB','$SOURCE_ID','$BASE_ID','$INV_MODEL','current_balance','current_balance','Number','float',0,NULL,0,0,0,'specificType','',NULL,0,19,'$WS_ID','{\"defaultViewColOrder\":19,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, [order], fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_PSTA','$SOURCE_ID','$BASE_ID','$INV_MODEL','payment_status','payment_status','SingleLineText','text',0,NULL,0,0,0,'specificType','',NULL,0,20,'$WS_ID','{\"defaultViewColOrder\":20,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
INSERT INTO nc_columns_v2 (id, source_id, base_id, fk_model_id, title, column_name, uidt, dt, pk, pv, rqd, un, ai, dtx, dtxp, dtxs, system, [order], fk_workspace_id, meta, readonly, created_at, updated_at)
VALUES ('$COL_OUTS','$SOURCE_ID','$BASE_ID','$CUST_MODEL','outstanding_balance','outstanding_balance','Number','float',0,NULL,0,0,0,'specificType','',NULL,0,29,'$WS_ID','{\"defaultViewColOrder\":29,\"defaultViewColVisibility\":1}',0,datetime('now'),datetime('now'));
"
echo "  ✅ nc_columns_v2 등록 완료"

# [3] 뷰 컬럼 등록
echo "[3/4] nc_grid_view_columns_v2 등록..."
VTS=$(date +%s | md5sum | head -c 12)
sqlite3 "$DB" "
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, [order], show, width, fk_workspace_id, created_at, updated_at)
VALUES ('ncinvpaid${VTS:0:11}','$INV_VIEW','$COL_PAID','$SOURCE_ID','$BASE_ID',17,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, [order], show, width, fk_workspace_id, created_at, updated_at)
VALUES ('ncinvprev${VTS:1:11}','$INV_VIEW','$COL_PREV','$SOURCE_ID','$BASE_ID',18,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, [order], show, width, fk_workspace_id, created_at, updated_at)
VALUES ('ncinvcurb${VTS:2:11}','$INV_VIEW','$COL_CURB','$SOURCE_ID','$BASE_ID',19,1,'120','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, [order], show, width, fk_workspace_id, created_at, updated_at)
VALUES ('ncinvpsta${VTS:3:11}','$INV_VIEW','$COL_PSTA','$SOURCE_ID','$BASE_ID',20,1,'100','$WS_ID',datetime('now'),datetime('now'));
INSERT INTO nc_grid_view_columns_v2 (id, fk_view_id, fk_column_id, source_id, base_id, [order], show, width, fk_workspace_id, created_at, updated_at)
VALUES ('nccustouts${VTS:4:10}','$CUST_VIEW','$COL_OUTS','$SOURCE_ID','$BASE_ID',29,1,'120','$WS_ID',datetime('now'),datetime('now'));
"
echo "  ✅ 뷰 컬럼 등록 완료"

# [4] NocoDB 재시작
echo "[4/4] NocoDB 재시작..."
docker restart nocodb
sleep 12
docker network connect n8n_n8n-network nocodb 2>/dev/null || true
echo "  ✅ 재시작 완료"

echo ""
echo "=== 완료 ==="
echo "invoices: paid_amount / previous_balance / current_balance / payment_status"
echo "customers: outstanding_balance"
