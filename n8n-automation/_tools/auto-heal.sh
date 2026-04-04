#!/bin/bash
# auto-heal.sh — 서비스 다운 시 자동 재시작 + 텔레그램 알림
# cron: */5 * * * * /home/ubuntu/scripts/auto-heal.sh >> /home/ubuntu/logs/auto-heal.log 2>&1
#
# 감시 대상: n8n, NocoDB, flora-todo-mvp (본진 서버)
# 텔레그램 알림: @Pressco21_bot → 장지호 (7713811206)

set -uo pipefail

LOG_PREFIX="[auto-heal $(date '+%Y-%m-%d %H:%M:%S')]"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="7713811206"
ALERT_SENT_DIR="/tmp/auto-heal-alerts"
mkdir -p "$ALERT_SENT_DIR"

send_telegram() {
  local message="$1"
  if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "$LOG_PREFIX [WARN] TELEGRAM_BOT_TOKEN 미설정 — 알림 생략"
    return
  fi
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d text="$message" \
    -d parse_mode="HTML" \
    > /dev/null 2>&1
}

# 알림 중복 방지 (같은 서비스에 대해 1시간 내 중복 알림 방지)
should_alert() {
  local service="$1"
  local flag_file="${ALERT_SENT_DIR}/${service}.flag"
  if [ -f "$flag_file" ]; then
    local age=$(( $(date +%s) - $(stat -c %Y "$flag_file" 2>/dev/null || date -r "$flag_file" +%s 2>/dev/null || echo 0) ))
    if [ "$age" -lt 3600 ]; then
      return 1  # 1시간 이내 이미 알림함
    fi
  fi
  touch "$flag_file"
  return 0
}

check_and_heal() {
  local container_name="$1"
  local compose_dir="$2"
  local compose_file="${3:-docker-compose.yml}"
  local env_file="${4:-}"
  local display_name="${5:-$container_name}"

  # 컨테이너 존재 + 실행 여부 확인
  local status
  status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")

  if [ "$status" = "running" ]; then
    return 0
  fi

  echo "$LOG_PREFIX [DOWN] $display_name (status: $status)"

  # 재시작 시도
  local restart_cmd="cd $compose_dir && docker compose"
  if [ -n "$compose_file" ] && [ "$compose_file" != "docker-compose.yml" ]; then
    restart_cmd="$restart_cmd -f $compose_file"
  fi
  if [ -n "$env_file" ]; then
    restart_cmd="$restart_cmd --env-file $env_file"
  fi
  restart_cmd="$restart_cmd up -d"

  echo "$LOG_PREFIX [HEAL] $display_name 재시작 시도..."
  eval "$restart_cmd" 2>&1

  # 30초 대기 후 확인
  sleep 30
  local new_status
  new_status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")

  if [ "$new_status" = "running" ]; then
    echo "$LOG_PREFIX [OK] $display_name 복구 성공"
    if should_alert "$container_name"; then
      send_telegram "🔧 <b>자동 복구 완료</b>
서비스: $display_name
상태: $status → running
시각: $(date '+%m/%d %H:%M')"
    fi
  else
    echo "$LOG_PREFIX [FAIL] $display_name 복구 실패 (status: $new_status)"
    if should_alert "${container_name}_fail"; then
      send_telegram "🚨 <b>복구 실패 — 수동 확인 필요</b>
서비스: $display_name
상태: $new_status
시각: $(date '+%m/%d %H:%M')
서버: $(hostname)"
    fi
  fi
}

# === 감시 대상 ===

# n8n (본진)
check_and_heal "n8n" "/home/ubuntu/n8n" "docker-compose.yml" "" "n8n 운영"

# NocoDB (본진)
check_and_heal "nocodb" "/home/ubuntu/nocodb" "docker-compose.yml" "" "NocoDB"

# flora-todo-mvp (본진 — 플로라 이전 전까지)
check_and_heal "flora-todo-mvp" "/home/ubuntu/flora-todo-mvp" "docker-compose.oracle.yml" ".env.oracle" "Flora 업무허브"

echo "$LOG_PREFIX [DONE] 점검 완료"
