#!/usr/bin/env bash
# 메이크샵 스킨 배포 후 스크린샷 비교
# Playwright로 5개 페이지 캡처 → ImageMagick diff → 결과 요약
#
# 사용법:
#   bash pressco21/scripts/skin-screenshot-diff.sh             # 전체 비교
#   bash pressco21/scripts/skin-screenshot-diff.sh --capture    # 캡처만 (첫 실행용)
#   bash pressco21/scripts/skin-screenshot-diff.sh --compare    # 비교만

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCREENSHOTS_DIR="$PROJECT_ROOT/pressco21/makeshop-skin/_sync/screenshots"
BEFORE_DIR="$SCREENSHOTS_DIR/before"
AFTER_DIR="$SCREENSHOTS_DIR/after"
DIFF_DIR="$SCREENSHOTS_DIR/diff"
LOG_PREFIX="[skin-diff]"

# 텔레그램 설정
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID="7713811206"

# .secrets에서 텔레그램 토큰 로드
SECRETS_FILE="$PROJECT_ROOT/pressco21/.secrets"
if [ -f "$SECRETS_FILE" ]; then
  TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$SECRETS_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi

# --- 플래그 파싱 ---
MODE="full"  # full, capture, compare
for arg in "$@"; do
  case "$arg" in
    --capture)  MODE="capture" ;;
    --compare)  MODE="compare" ;;
    --help|-h)
      echo "사용법: bash skin-screenshot-diff.sh [--capture|--compare]"
      echo ""
      echo "  (기본)     캡처 + 비교 + 알림"
      echo "  --capture  캡처만 (첫 실행 또는 before 세팅용)"
      echo "  --compare  기존 before/after 비교만"
      exit 0
      ;;
  esac
done

log() { echo "$LOG_PREFIX $*"; }
err() { echo "$LOG_PREFIX ERROR: $*" >&2; }

# --- 의존성 확인 ---
if ! command -v compare &>/dev/null; then
  err "ImageMagick이 필요합니다."
  echo "설치: brew install imagemagick"
  exit 1
fi

# --- 대상 페이지 ---
declare -A PAGES=(
  ["main"]="https://foreverlove.co.kr/"
  ["category"]="https://foreverlove.co.kr/shop/shopbrand.html?type=Y&xcode=001"
  ["detail"]="https://foreverlove.co.kr/shop/shopdetail.html?branduid=2600266"
  ["basket"]="https://foreverlove.co.kr/shop/basket.html"
  ["partnerclass"]="https://foreverlove.co.kr/shop/page.html?id=8014"
)

# --- 캡처 함수 (Playwright) ---
capture_pages() {
  local target_dir="$1"
  mkdir -p "$target_dir"

  log "페이지 캡처 시작 → $target_dir"

  for name in "${!PAGES[@]}"; do
    local url="${PAGES[$name]}"
    local file="$target_dir/${name}.png"

    log "  캡처: $name ($url)"
    npx -y playwright screenshot \
      --browser chromium \
      --viewport-size "1440,900" \
      --full-page \
      --wait-for-timeout 3000 \
      "$url" "$file" 2>/dev/null || {
      err "  $name 캡처 실패, 빈 이미지 생성"
      # 실패 시 빈 이미지 생성하여 비교 가능하도록
      convert -size 1440x900 xc:gray "$file" 2>/dev/null || true
    }
  done

  log "캡처 완료: $(ls "$target_dir"/*.png 2>/dev/null | wc -l | tr -d ' ')개"
}

# --- 비교 함수 ---
compare_pages() {
  mkdir -p "$DIFF_DIR"
  local results=()
  local has_significant_diff=false

  log "스크린샷 비교 시작"

  for name in "${!PAGES[@]}"; do
    local before="$BEFORE_DIR/${name}.png"
    local after="$AFTER_DIR/${name}.png"
    local diff_file="$DIFF_DIR/${name}-diff.png"

    if [ ! -f "$before" ]; then
      log "  $name: before 이미지 없음 (스킵)"
      results+=("$name: before 없음 ⏭️")
      continue
    fi

    if [ ! -f "$after" ]; then
      log "  $name: after 이미지 없음 (스킵)"
      results+=("$name: after 없음 ⏭️")
      continue
    fi

    # ImageMagick compare로 픽셀 차이 계산
    local diff_output
    diff_output=$(compare -metric AE "$before" "$after" "$diff_file" 2>&1 || true)
    local diff_pixels="${diff_output##*$'\n'}"
    diff_pixels="${diff_pixels//[^0-9]/}"

    # 전체 픽셀 수 기준 퍼센트 계산
    local total_pixels
    total_pixels=$(identify -format "%w %h" "$before" 2>/dev/null | awk '{print $1*$2}')
    total_pixels="${total_pixels:-1}"

    local pct=0
    if [ "$total_pixels" -gt 0 ] && [ -n "$diff_pixels" ] && [ "$diff_pixels" -gt 0 ]; then
      pct=$(echo "scale=1; $diff_pixels * 100 / $total_pixels" | bc 2>/dev/null || echo "0")
    fi

    if [ "$(echo "$pct > 5" | bc 2>/dev/null)" = "1" ]; then
      log "  $name: ${pct}% 변경 ⚠️"
      results+=("$name: ${pct}% 변경 ⚠️")
      has_significant_diff=true
    else
      log "  $name: ${pct}% 변경 ✅"
      results+=("$name: ${pct}% ✅")
      # 미미한 차이는 diff 이미지 삭제
      rm -f "$diff_file"
    fi
  done

  # 결과 출력
  echo ""
  echo "=== 비교 결과 ==="
  for r in "${results[@]}"; do
    echo "  $r"
  done

  # 텔레그램 알림
  if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    local msg="🖼️ 스킨 스크린샷 비교 결과\n\n"
    for r in "${results[@]}"; do
      msg+="  $r\n"
    done
    msg+="\n시각: $(date '+%Y-%m-%d %H:%M')"

    curl -sf "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${msg}" \
      -d "parse_mode=" >/dev/null 2>&1 || log "텔레그램 발송 실패 (토큰 확인 필요)"
  else
    log "텔레그램 토큰 미설정 (pressco21/.secrets에 TELEGRAM_BOT_TOKEN 추가)"
  fi

  # after → before 교체 (다음 비교 기준)
  if [ "$has_significant_diff" = true ]; then
    log ""
    log "⚠️ 유의미한 변경이 있습니다. diff 이미지: $DIFF_DIR/"
  fi
}

# --- 실행 ---
case "$MODE" in
  capture)
    capture_pages "$BEFORE_DIR"
    log "before 이미지 세팅 완료. 다음번 실행 시 비교됩니다."
    ;;
  compare)
    compare_pages
    ;;
  full)
    # 기존 after가 있으면 before으로 이동
    if [ -d "$AFTER_DIR" ] && ls "$AFTER_DIR"/*.png &>/dev/null 2>&1; then
      log "이전 after → before 교체"
      rm -f "$BEFORE_DIR"/*.png 2>/dev/null || true
      cp "$AFTER_DIR"/*.png "$BEFORE_DIR/" 2>/dev/null || true
    fi

    # 새 캡처
    capture_pages "$AFTER_DIR"

    # before가 있으면 비교
    if ls "$BEFORE_DIR"/*.png &>/dev/null 2>&1; then
      compare_pages
    else
      log "before 이미지가 없어 비교를 건너뜁니다."
      log "다음번 실행 시 비교됩니다."
    fi
    ;;
esac

echo ""
echo "=== 완료 ==="
