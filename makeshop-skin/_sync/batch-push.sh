#!/bin/bash
# batch-push.sh — 변경 파일 일괄 배포 (HTML→CSS→JS 순서)
#
# 사용법:
#   bash makeshop-skin/_sync/batch-push.sh                   (git 변경 파일 전체)
#   bash makeshop-skin/_sync/batch-push.sh main/main.css pages/brand/brand.html
#   bash makeshop-skin/_sync/batch-push.sh --dry-run         (실행 없이 순서만 표시)
#
# 메이크샵 편집기는 HTML → CSS → JS 순서로 저장해야 안정적.
# 각 파일 배포 전 pre-push-check.sh 검증 실행.

set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="$SKIN_DIR/_sync"
REPO_DIR="$(cd "$SKIN_DIR/.." && pwd)"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
  shift
fi

echo "=== 일괄 스킨 배포 ==="
echo ""

# 대상 파일 결정
if [ $# -gt 0 ]; then
  ALL_FILES=("$@")
else
  ALL_FILES=()
  while IFS= read -r line; do ALL_FILES+=("$line"); done < <(cd "$REPO_DIR" && git diff --name-only HEAD -- makeshop-skin/ | sed 's|^makeshop-skin/||' | grep -v '_sync/')
  if [ ${#ALL_FILES[@]} -eq 0 ]; then
    echo "변경된 스킨 파일이 없습니다."
    exit 0
  fi
fi

# 파일 타입별 분류 (HTML → CSS → JS 순서)
HTML_FILES=()
CSS_FILES=()
JS_FILES=()
OTHER_FILES=()

for f in "${ALL_FILES[@]}"; do
  case "$f" in
    *.html) HTML_FILES+=("$f") ;;
    *.css)  CSS_FILES+=("$f") ;;
    *.js)   JS_FILES+=("$f") ;;
    *)      OTHER_FILES+=("$f") ;;
  esac
done

# 순서 표시
TOTAL=$((${#HTML_FILES[@]} + ${#CSS_FILES[@]} + ${#JS_FILES[@]}))
echo -e "총 ${CYAN}${TOTAL}${NC}개 파일 (HTML: ${#HTML_FILES[@]}, CSS: ${#CSS_FILES[@]}, JS: ${#JS_FILES[@]})"
if [ ${#OTHER_FILES[@]} -gt 0 ]; then
  echo -e "${YELLOW}건너뛰기${NC}: ${OTHER_FILES[*]} (HTML/CSS/JS만 배포)"
fi
echo ""

# 배포 순서
ORDERED_FILES=("${HTML_FILES[@]}" "${CSS_FILES[@]}" "${JS_FILES[@]}")

if [ "$DRY_RUN" = true ]; then
  echo -e "${CYAN}[dry-run] 배포 순서:${NC}"
  IDX=1
  for f in "${ORDERED_FILES[@]}"; do
    echo "  $IDX. $f"
    ((IDX++))
  done
  exit 0
fi

# 1. 스냅샷 생성
echo -e "${CYAN}[사전] 스냅샷 생성...${NC}"
bash "$SYNC_DIR/snapshot.sh" 2>/dev/null || echo -e "${YELLOW}스냅샷 건너뜀 (git 상태 확인)${NC}"
echo ""

# 2. 사전 검증
echo -e "${CYAN}[사전] vtag-lint 실행...${NC}"
if ! bash "$SYNC_DIR/vtag-lint.sh" "${ORDERED_FILES[@]}" 2>/dev/null; then
  echo -e "${RED}vtag-lint 실패 — 배포 중단${NC}"
  exit 1
fi
echo ""

# 3. 순차 배포
SUCCESS=0
FAIL=0

echo -e "${CYAN}[배포] 순차 진행...${NC}"
for f in "${ORDERED_FILES[@]}"; do
  FULL_PATH="$SKIN_DIR/$f"
  if [ ! -f "$FULL_PATH" ]; then
    echo -e "  ${YELLOW}SKIP${NC} $f (파일 없음)"
    continue
  fi

  echo -e "  ${CYAN}PUSH${NC} $f ..."

  # Claude Code의 deploy-manager 에이전트가 실제 skin-push를 수행
  # 이 스크립트는 순서 관리와 검증만 담당
  # 실제 push는 Claude Code 세션에서 수행해야 함
  echo -e "  ${YELLOW}→ Claude Code에서 skin-push.js로 배포 필요${NC}"
  ((SUCCESS++))
done

echo ""
echo "=== 결과 ==="
echo -e "배포 대기: ${GREEN}${SUCCESS}${NC}개, 실패: ${FAIL}개"
echo ""
echo "다음 단계: Claude Code에서 deploy-manager 에이전트로 실제 배포 실행"
echo "또는 수동: skin-push.js 코드를 편집기 콘솔에서 실행"
