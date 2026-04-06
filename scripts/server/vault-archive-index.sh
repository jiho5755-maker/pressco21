#!/bin/bash
# 금고 서버 파일 인덱스 자동 생성
# 실행: 금고 서버 cron, 매일 05:00 (백업+아카이브 이후)
#
# 모든 백업 파일을 스캔하여 filename→path 매핑 JSON 생성
# MinIO에 업로드하여 앱에서 조회 가능하게 함
set -euo pipefail

SCAN_DIRS=(
  "/srv/pressco21-vault/minio-backup/tasks"
  "/srv/pressco21-vault"
)

INDEX_FILE="/tmp/archive-index.json"
MC_BIN="/usr/local/bin/mc"
MC_ALIAS="pressco21"
MINIO_BUCKET="images"

LOG_FILE="/var/log/vault-archive-index.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== 인덱스 생성 시작 ==="

# JSON 인덱스 생성
echo "{" > "$INDEX_FILE"
echo "  \"generatedAt\": \"$(date -Iseconds)\"," >> "$INDEX_FILE"
echo "  \"files\": {" >> "$INDEX_FILE"

FIRST=true
TOTAL=0

for DIR in "${SCAN_DIRS[@]}"; do
  if [ ! -d "$DIR" ]; then
    continue
  fi

  while IFS= read -r filepath; do
    filename=$(basename "$filepath")
    # 타임스탬프 파일만 인덱싱 (업무 첨부파일 패턴)
    if [[ ! "$filename" =~ ^[0-9]{10,} ]]; then
      continue
    fi

    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$INDEX_FILE"
    fi

    # JSON escape
    escaped_path=$(echo "$filepath" | sed 's/"/\\"/g')
    printf "    \"%s\": \"%s\"" "$filename" "$escaped_path" >> "$INDEX_FILE"
    TOTAL=$((TOTAL + 1))
  done < <(find "$DIR" -type f 2>/dev/null)
done

echo "" >> "$INDEX_FILE"
echo "  }" >> "$INDEX_FILE"
echo "}" >> "$INDEX_FILE"

log "인덱스 생성 완료: ${TOTAL}개 파일"

# MinIO에 업로드 (앱에서 조회용)
if "$MC_BIN" cp "$INDEX_FILE" "${MC_ALIAS}/${MINIO_BUCKET}/archive-index.json" >/dev/null 2>&1; then
  log "MinIO 업로드 완료: ${MC_ALIAS}/${MINIO_BUCKET}/archive-index.json"
else
  log "경고: MinIO 업로드 실패 — 로컬 인덱스만 유지"
fi

log "=== 인덱스 생성 종료 ==="
