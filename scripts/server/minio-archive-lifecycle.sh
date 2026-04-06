#!/bin/bash
# MinIO 스토리지 라이프사이클 — 50GB 할당, 30GB 도달 시 자동 아카이브
# 실행: 본진 서버 cron, 매일 04:30 (백업 04:00 이후)
#
# 아카이브 대상: status=done/resolved + 90일 이상 경과 + 첨부파일 있는 태스크
# 동작: 금고 백업 확인 → detailsJson 업데이트 (archived 표시) → MinIO 삭제
set -euo pipefail

# === 설정 ===
MC_BIN="/usr/local/bin/mc"
MC_ALIAS="pressco"
MINIO_BUCKET="images"
MINIO_PREFIX="tasks/"

# 용량 임계값 (bytes)
ARCHIVE_THRESHOLD=$((30 * 1024 * 1024 * 1024))  # 30GB

# 아카이브 대상 기준: 완료 후 N일 이상
ARCHIVE_AGE_DAYS=90

# Flora API
FLORA_API="https://mini.pressco21.com/api"
FLORA_API_KEY="pressco21-admin-2026"

# 금고 백업 경로 (본진 로컬)
LOCAL_BACKUP_DIR="/data/minio-backup/tasks"

LOG_FILE="/var/log/minio-archive.log"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-7713811206}"

# === 함수 ===
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_telegram() {
  local msg="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=$TELEGRAM_CHAT_ID" \
      -d "text=$msg" \
      -d "parse_mode=HTML" >/dev/null 2>&1 || true
  fi
}

# === 1단계: 용량 체크 ===
log "=== 아카이브 라이프사이클 시작 ==="

CURRENT_USAGE_RAW=$("$MC_BIN" du "${MC_ALIAS}/${MINIO_BUCKET}/${MINIO_PREFIX}" 2>/dev/null | tail -1 | awk '{print $1}')

# mc du 출력: "12MiB" or "1.5GiB" 등 → bytes 변환
parse_size() {
  local raw="$1"
  local num unit
  num=$(echo "$raw" | sed 's/[^0-9.]//g')
  unit=$(echo "$raw" | sed 's/[0-9.]//g')
  case "$unit" in
    KiB) echo "$num * 1024" | bc | cut -d. -f1 ;;
    MiB) echo "$num * 1024 * 1024" | bc | cut -d. -f1 ;;
    GiB) echo "$num * 1024 * 1024 * 1024" | bc | cut -d. -f1 ;;
    *) echo "0" ;;
  esac
}

CURRENT_BYTES=$(parse_size "$CURRENT_USAGE_RAW")
CURRENT_GB=$(echo "scale=1; $CURRENT_BYTES / 1024 / 1024 / 1024" | bc)

log "현재 MinIO tasks/ 사용량: ${CURRENT_USAGE_RAW} (${CURRENT_GB}GB)"

if [ "$CURRENT_BYTES" -lt "$ARCHIVE_THRESHOLD" ]; then
  log "30GB 미만 — 아카이브 불필요. 종료."
  exit 0
fi

log "30GB 초과! 아카이브 프로세스 시작..."

# === 2단계: 완료+오래된 태스크 조회 ===
DONE_TASKS=$(curl -s -H "x-flora-automation-key: $FLORA_API_KEY" \
  "${FLORA_API}/dashboard?status=done&limit=200" | \
  jq -r '.explorer.items // []')

CUTOFF_DATE=$(date -d "-${ARCHIVE_AGE_DAYS} days" '+%Y-%m-%d' 2>/dev/null || \
  date -v-${ARCHIVE_AGE_DAYS}d '+%Y-%m-%d')

ARCHIVED_COUNT=0
FREED_BYTES=0

# === 3단계: 각 태스크 처리 ===
echo "$DONE_TASKS" | jq -c '.[]' | while read -r task; do
  TASK_ID=$(echo "$task" | jq -r '.id')
  UPDATED_AT=$(echo "$task" | jq -r '.updatedAt // ""' | cut -c1-10)
  ATTACHMENTS=$(echo "$task" | jq -r '.detailsJson.attachments // []')
  ATT_COUNT=$(echo "$ATTACHMENTS" | jq 'length')

  # 첨부 없으면 스킵
  if [ "$ATT_COUNT" = "0" ]; then
    continue
  fi

  # 이미 전부 아카이브됨이면 스킵
  ALL_ARCHIVED=$(echo "$ATTACHMENTS" | jq 'all(.archived == true)')
  if [ "$ALL_ARCHIVED" = "true" ]; then
    continue
  fi

  # 완료일이 기준일보다 오래되지 않으면 스킵
  if [ "$UPDATED_AT" \> "$CUTOFF_DATE" ] || [ "$UPDATED_AT" = "$CUTOFF_DATE" ]; then
    continue
  fi

  TASK_TITLE=$(echo "$task" | jq -r '.title' | head -c 30)
  log "아카이브 대상: $TASK_ID - $TASK_TITLE (완료: $UPDATED_AT)"

  # 각 첨부파일 처리
  UPDATED_ATTS="[]"
  for i in $(seq 0 $((ATT_COUNT - 1))); do
    ATT=$(echo "$ATTACHMENTS" | jq -c ".[$i]")
    ATT_URL=$(echo "$ATT" | jq -r '.url')
    ATT_NAME=$(echo "$ATT" | jq -r '.name')
    ATT_SIZE=$(echo "$ATT" | jq -r '.size // 0')
    IS_ARCHIVED=$(echo "$ATT" | jq -r '.archived // false')

    if [ "$IS_ARCHIVED" = "true" ]; then
      UPDATED_ATTS=$(echo "$UPDATED_ATTS" | jq -c ". + [$ATT]")
      continue
    fi

    # MinIO 키 추출 (URL에서 /images/ 이후)
    MINIO_KEY=$(echo "$ATT_URL" | sed 's|.*/images/||')
    LOCAL_FILE="${LOCAL_BACKUP_DIR}/${MINIO_KEY#tasks/}"

    # 로컬 백업에 존재하는지 확인
    if [ ! -f "$LOCAL_FILE" ]; then
      log "  경고: 백업 없음 $ATT_NAME — 아카이브 건너뜀"
      UPDATED_ATTS=$(echo "$UPDATED_ATTS" | jq -c ". + [$ATT]")
      continue
    fi

    # 유니크 파일명 (타임스탬프 포함이라 이미 유니크)
    BASENAME=$(basename "$ATT_URL")

    # archived 마킹
    ARCHIVED_ATT=$(echo "$ATT" | jq -c ". + {archived: true, archivedAt: \"$(date '+%Y-%m-%d')\", archivedFile: \"$BASENAME\"}")
    UPDATED_ATTS=$(echo "$UPDATED_ATTS" | jq -c ". + [$ARCHIVED_ATT]")

    # MinIO에서 삭제
    "$MC_BIN" rm "${MC_ALIAS}/${MINIO_BUCKET}/${MINIO_KEY}" >/dev/null 2>&1 || true
    FREED_BYTES=$((FREED_BYTES + ATT_SIZE))

    log "  삭제: $BASENAME (${ATT_SIZE} bytes)"
  done

  # detailsJson 업데이트 (API 호출)
  curl -s -X PATCH "${FLORA_API}/admin/tasks/${TASK_ID}" \
    -H "Content-Type: application/json" \
    -H "x-flora-automation-key: $FLORA_API_KEY" \
    -d "{\"attachments\": $UPDATED_ATTS}" >/dev/null 2>&1

  ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))

  # 용량 재확인 — 목표 달성 시 조기 종료
  NEW_USAGE_RAW=$("$MC_BIN" du "${MC_ALIAS}/${MINIO_BUCKET}/${MINIO_PREFIX}" 2>/dev/null | tail -1 | awk '{print $1}')
  NEW_BYTES=$(parse_size "$NEW_USAGE_RAW")
  if [ "$NEW_BYTES" -lt "$ARCHIVE_THRESHOLD" ]; then
    log "목표 용량 도달 — 아카이브 조기 종료"
    break
  fi
done

# === 4단계: 결과 보고 ===
FREED_MB=$((FREED_BYTES / 1024 / 1024))
FINAL_USAGE=$("$MC_BIN" du "${MC_ALIAS}/${MINIO_BUCKET}/${MINIO_PREFIX}" 2>/dev/null | tail -1 | awk '{print $1}')

log "아카이브 완료: ${ARCHIVED_COUNT}건 처리, ${FREED_MB}MB 확보, 현재 ${FINAL_USAGE}"

if [ "$ARCHIVED_COUNT" -gt 0 ]; then
  send_telegram "MinIO 아카이브 완료 - ${ARCHIVED_COUNT}건 보관 처리, ${FREED_MB}MB 확보, 현재 ${FINAL_USAGE}"
fi

log "=== 라이프사이클 종료 ==="
