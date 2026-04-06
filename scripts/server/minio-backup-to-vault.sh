#!/bin/bash
# MinIO 업무 첨부파일 → 금고 서버 자동 백업
# 실행 위치: 본진 서버 (158.180.77.201)
# cron: 매일 04:00 (Oracle 백업 03:00 이후)
#
# 구조:
#   1) mc mirror로 MinIO → 본진 로컬 (/data/minio-backup/)
#   2) rsync로 본진 → 금고 서버 (Tailscale)
#   3) 텔레그램 알림 (성공/실패)

set -euo pipefail

# === 설정 ===
MC_BIN="/usr/local/bin/mc"
MC_ALIAS="pressco"
MINIO_BUCKET="images"
MINIO_PREFIX="tasks/"

LOCAL_BACKUP_DIR="/data/minio-backup/tasks"

VAULT_HOST="100.76.25.105"
VAULT_USER="pressbackup"
VAULT_DIR="/srv/pressco21-vault/minio-backup/tasks"
VAULT_SSH_KEY=""

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-7713811206}"

LOG_FILE="/var/log/minio-backup.log"

# === 함수 ===
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_telegram() {
  local msg="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" \
      -d text="$msg" \
      -d "parse_mode=HTML" >/dev/null 2>&1 || true
  fi
}

# === 1단계: MinIO → 본진 로컬 ===
log "=== MinIO 백업 시작 ==="

mkdir -p "$LOCAL_BACKUP_DIR"

# mc alias 확인 (없으면 설정)
if ! "$MC_BIN" alias list "$MC_ALIAS" >/dev/null 2>&1; then
  log "mc alias '$MC_ALIAS' 설정 필요. 먼저 실행: mc alias set pressco http://minio:9000 pressco21 <password>"
  exit 1
fi

# mirror: MinIO → 로컬 (변경분만 동기화, 삭제 안 함)
BEFORE_COUNT=$(find "$LOCAL_BACKUP_DIR" -type f 2>/dev/null | wc -l)

"$MC_BIN" mirror --overwrite --preserve \
  "${MC_ALIAS}/${MINIO_BUCKET}/${MINIO_PREFIX}" \
  "$LOCAL_BACKUP_DIR/" 2>&1 | tee -a "$LOG_FILE"

AFTER_COUNT=$(find "$LOCAL_BACKUP_DIR" -type f | wc -l)
NEW_FILES=$((AFTER_COUNT - BEFORE_COUNT))
TOTAL_SIZE=$(du -sh "$LOCAL_BACKUP_DIR" | cut -f1)

log "로컬 백업 완료: 파일 ${AFTER_COUNT}개, 신규 ${NEW_FILES}개, 총 ${TOTAL_SIZE}"

# === 2단계: 본진 → 금고 서버 (Tailscale) ===
VAULT_OK=false

if ssh -o ConnectTimeout=5 -o BatchMode=yes \
  "${VAULT_USER}@${VAULT_HOST}" "mkdir -p '$VAULT_DIR'" 2>/dev/null; then

  log "금고 서버 연결 OK → rsync 시작"

  rsync -az --delete \
    -e "ssh -o ConnectTimeout=10" \
    "$LOCAL_BACKUP_DIR/" \
    "${VAULT_USER}@${VAULT_HOST}:${VAULT_DIR}/" 2>&1 | tee -a "$LOG_FILE"

  VAULT_OK=true
  log "금고 백업 완료"
else
  log "금고 서버 접근 불가 — 로컬 백업만 유지"
fi

# === 3단계: 결과 알림 ===
if [ "$VAULT_OK" = true ]; then
  send_telegram "MinIO 백업 완료 - 파일 ${AFTER_COUNT}개, 신규 ${NEW_FILES}, 총 ${TOTAL_SIZE} - 본진+금고 동기화 OK"
else
  send_telegram "MinIO 백업 부분완료 - 파일 ${AFTER_COUNT}개, 신규 ${NEW_FILES}, 총 ${TOTAL_SIZE} - 본진만, 금고 접근불가"
fi

log "=== 백업 완료 ==="
