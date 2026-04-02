#!/usr/bin/env bash
# 데이터 백업 검증 자동화
# pg_dump 복원 테스트, SQLite 무결성, docker-compose 존재 확인
# 미니PC systemd timer로 매주 일요일 05:00 실행
set -Eeuo pipefail

# --- 설정 ---
BACKUP_ROOT="${BACKUP_ROOT:-/srv/pressco21-backup-node/oracle}"
PG_DUMP_DIR="${BACKUP_ROOT}/pgdump"
NOCODB_DIR="${BACKUP_ROOT}/nocodb"
DOCKER_BACKUP_DIR="${BACKUP_ROOT}/docker-config"

TEMP_PG_CONTAINER="backup-verify-pg-temp"
TEMP_PG_PORT=5433
TEMP_PG_PASSWORD="verify_temp_$(date +%s)"

WEBHOOK_URL="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"

LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_DIR}/backup-verify.log"
ALERT_STATE_DIR="${ALERT_STATE_DIR:-/var/lib/pressco21}"
ALERT_STATE_FILE="${ALERT_STATE_DIR}/backup-verify.state"
ALERT_REPEAT_HOURS="${ALERT_REPEAT_HOURS:-24}"

# --- 유틸 함수 (healthcheck 패턴 재사용) ---
log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

notify_webhook() {
  local status="$1"
  local message="$2"
  [ -z "$WEBHOOK_URL" ] && return 0

  curl -fsS -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"backup-verify\"}" >/dev/null 2>&1 || true
}

load_alert_state() {
  LAST_ALERT_KEY=""
  LAST_ALERT_EPOCH="0"
  [ -f "$ALERT_STATE_FILE" ] && . "$ALERT_STATE_FILE"
}

save_alert_state() {
  mkdir -p "$ALERT_STATE_DIR"
  {
    echo "LAST_ALERT_KEY='${LAST_ALERT_KEY}'"
    echo "LAST_ALERT_EPOCH='${LAST_ALERT_EPOCH}'"
  } >"$ALERT_STATE_FILE"
}

alert_with_dedup() {
  local issue_key="$1"
  local message="$2"
  local now_epoch
  now_epoch="$(date +%s)"
  local repeat_seconds="$((ALERT_REPEAT_HOURS * 3600))"

  load_alert_state
  if [ "$issue_key" = "$LAST_ALERT_KEY" ] && [ $((now_epoch - LAST_ALERT_EPOCH)) -lt "$repeat_seconds" ]; then
    log "중복 알림 생략: $issue_key"
    return 0
  fi

  log "ALERT: $message"
  notify_webhook "error" "$message"
  LAST_ALERT_KEY="$issue_key"
  LAST_ALERT_EPOCH="$now_epoch"
  save_alert_state
}

cleanup() {
  log "임시 컨테이너 정리..."
  docker rm -f "$TEMP_PG_CONTAINER" 2>/dev/null || true
}
trap cleanup EXIT

# --- 검증 함수 ---
CHECKS_PASSED=0
CHECKS_FAILED=0
RESULTS=()

check_pass() {
  local name="$1"
  ((CHECKS_PASSED++))
  RESULTS+=("✅ $name")
  log "PASS: $name"
}

check_fail() {
  local name="$1"
  local detail="${2:-}"
  ((CHECKS_FAILED++))
  RESULTS+=("❌ $name: $detail")
  log "FAIL: $name — $detail"
}

# 1) pg_dump 파일 존재 + 크기 확인
verify_pgdump() {
  log "=== pg_dump 검증 ==="

  if [ ! -d "$PG_DUMP_DIR" ]; then
    check_fail "pg_dump 디렉토리" "경로 없음: $PG_DUMP_DIR"
    return 1
  fi

  # 가장 최근 덤프 파일 찾기
  local latest_dump
  latest_dump=$(find "$PG_DUMP_DIR" -name "*.sql" -o -name "*.sql.gz" -o -name "*.dump" 2>/dev/null | sort -t/ -k"$(echo "$PG_DUMP_DIR" | tr '/' '\n' | wc -l)" -r | head -1)

  if [ -z "$latest_dump" ]; then
    check_fail "pg_dump 파일" "덤프 파일 없음"
    return 1
  fi

  local file_size
  file_size=$(stat -c%s "$latest_dump" 2>/dev/null || stat -f%z "$latest_dump" 2>/dev/null || echo 0)
  local file_age_hours
  local file_mtime
  file_mtime=$(stat -c%Y "$latest_dump" 2>/dev/null || date -r "$latest_dump" +%s 2>/dev/null || echo 0)
  file_age_hours=$(( ($(date +%s) - file_mtime) / 3600 ))

  local file_size_mb=$((file_size / 1048576))
  log "최신 덤프: $(basename "$latest_dump") (${file_size_mb}MB, ${file_age_hours}시간 전)"

  if [ "$file_size" -lt 1048576 ]; then  # 1MB 미만 → 경고 (빈 DB일 수도)
    check_fail "pg_dump 크기" "${file_size_mb}MB (최소 1MB 예상)"
    return 1
  fi

  check_pass "pg_dump 파일 (${file_size_mb}MB, ${file_age_hours}h 전)"

  # 2) 임시 Postgres 컨테이너로 복원 테스트
  log "=== pg_dump 복원 테스트 ==="

  docker rm -f "$TEMP_PG_CONTAINER" 2>/dev/null || true
  docker run -d --name "$TEMP_PG_CONTAINER" \
    -e POSTGRES_PASSWORD="$TEMP_PG_PASSWORD" \
    -e POSTGRES_DB=verify_test \
    -p "$TEMP_PG_PORT:5432" \
    postgres:16-alpine >/dev/null 2>&1

  # Postgres 기동 대기 (최대 30초)
  local wait_count=0
  while ! docker exec "$TEMP_PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
    sleep 2
    ((wait_count++))
    if [ "$wait_count" -ge 15 ]; then
      check_fail "pg 임시 컨테이너" "기동 타임아웃 (30초)"
      return 1
    fi
  done

  # 복원 시도
  local restore_result=0
  if [[ "$latest_dump" == *.gz ]]; then
    gunzip -c "$latest_dump" | docker exec -i "$TEMP_PG_CONTAINER" psql -U postgres -d verify_test >/dev/null 2>&1 || restore_result=$?
  elif [[ "$latest_dump" == *.dump ]]; then
    docker exec -i "$TEMP_PG_CONTAINER" pg_restore -U postgres -d verify_test < "$latest_dump" >/dev/null 2>&1 || restore_result=$?
  else
    docker exec -i "$TEMP_PG_CONTAINER" psql -U postgres -d verify_test < "$latest_dump" >/dev/null 2>&1 || restore_result=$?
  fi

  if [ "$restore_result" -ne 0 ]; then
    # pg_restore는 경고로 비정상 종료할 수 있어 테이블 수로 재확인
    log "복원 명령 반환 코드: $restore_result (경고일 수 있음, 테이블 수 확인)"
  fi

  # 테이블 수 확인
  local table_count
  table_count=$(docker exec "$TEMP_PG_CONTAINER" psql -U postgres -d verify_test -t \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

  if [ -z "$table_count" ] || [ "$table_count" -le 0 ]; then
    check_fail "pg_dump 복원" "테이블 0개 (복원 실패)"
    return 1
  fi

  check_pass "pg_dump 복원 (${table_count}개 테이블)"
}

# 3) NocoDB SQLite 검증
verify_nocodb_sqlite() {
  log "=== NocoDB SQLite 검증 ==="

  if [ ! -d "$NOCODB_DIR" ]; then
    log "NocoDB 디렉토리 없음 ($NOCODB_DIR) — 스킵"
    return 0
  fi

  local sqlite_files
  sqlite_files=$(find "$NOCODB_DIR" -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null)

  if [ -z "$sqlite_files" ]; then
    log "SQLite 파일 없음 — 스킵 (Postgres만 사용 중일 수 있음)"
    return 0
  fi

  local sqlite_ok=0
  local sqlite_fail=0

  while IFS= read -r db_file; do
    local fname
    fname=$(basename "$db_file")

    if ! command -v sqlite3 &>/dev/null; then
      log "sqlite3 미설치 — SQLite 검증 스킵"
      return 0
    fi

    local tables
    tables=$(sqlite3 "$db_file" ".tables" 2>/dev/null || echo "FAIL")

    if [ "$tables" = "FAIL" ] || [ -z "$tables" ]; then
      check_fail "SQLite $fname" "테이블 조회 실패"
      ((sqlite_fail++))
    else
      local tbl_count
      tbl_count=$(echo "$tables" | wc -w | tr -d ' ')
      check_pass "SQLite $fname (${tbl_count}개 테이블)"
      ((sqlite_ok++))
    fi
  done <<< "$sqlite_files"
}

# 4) Docker 설정 파일 존재 확인
verify_docker_config() {
  log "=== Docker 설정 파일 확인 ==="

  if [ ! -d "$DOCKER_BACKUP_DIR" ]; then
    # docker-config 없으면 backup root에서 찾기
    local compose_found=false
    if find "$BACKUP_ROOT" -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null | head -1 | grep -q .; then
      compose_found=true
    fi

    if [ "$compose_found" = false ]; then
      log "Docker 설정 백업 없음 — 스킵 (선택 사항)"
      return 0
    fi
  fi

  local compose_files
  compose_files=$(find "${DOCKER_BACKUP_DIR:-$BACKUP_ROOT}" -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null)

  if [ -n "$compose_files" ]; then
    check_pass "docker-compose.yml 존재"
  else
    log "docker-compose.yml 없음 — 스킵"
  fi

  local env_files
  env_files=$(find "${DOCKER_BACKUP_DIR:-$BACKUP_ROOT}" -name ".env" 2>/dev/null)

  if [ -n "$env_files" ]; then
    check_pass ".env 파일 존재"
  fi
}

# --- 메인 ---
main() {
  log "=========================================="
  log "백업 검증 시작 ($(date '+%Y-%m-%d %H:%M'))"
  log "=========================================="

  verify_pgdump
  verify_nocodb_sqlite
  verify_docker_config

  echo ""
  log "=========================================="
  log "검증 결과: ${CHECKS_PASSED}개 통과 / ${CHECKS_FAILED}개 실패"
  log "=========================================="

  # 결과 메시지 생성
  local summary=""
  for r in "${RESULTS[@]}"; do
    summary+="$r\n"
  done

  if [ "$CHECKS_FAILED" -eq 0 ]; then
    local msg="✅ [PRESSCO21] 백업 검증 통과 (${CHECKS_PASSED}건)\n\n${summary}\n시각: $(date '+%Y-%m-%d %H:%M')"
    notify_webhook "success" "$msg"

    # 성공 시 이전 알림 상태 초기화
    load_alert_state
    if [ -n "${LAST_ALERT_KEY:-}" ]; then
      LAST_ALERT_KEY=""
      LAST_ALERT_EPOCH="0"
      save_alert_state
    fi
  else
    alert_with_dedup "backup_verify_fail_${CHECKS_FAILED}" "❌ [PRESSCO21] 백업 검증 실패 (${CHECKS_FAILED}건)\n\n${summary}"
    exit 1
  fi
}

main "$@"
