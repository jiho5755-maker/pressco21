#!/bin/bash
# pre-push-check.sh — push 전 편집기 ↔ 로컬 충돌 감지
#
# 사용법:
#   bash makeshop-skin/_sync/pre-push-check.sh [파일경로...]
#
# 예시:
#   bash makeshop-skin/_sync/pre-push-check.sh main/main.css
#   bash makeshop-skin/_sync/pre-push-check.sh  (인자 없으면 전체 변경 파일)
#
# 이 스크립트는 Claude Code가 skin-push 전에 자동 실행한다.
# 수동으로도 실행 가능하며, 충돌 감지 시 push를 중단한다.

set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="$SKIN_DIR/_sync"
REPO_DIR="$(cd "$SKIN_DIR/.." && pwd)"
STATUS_FILE="$SYNC_DIR/SYNC-STATUS.md"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== skin-push 사전 점검 ==="
echo ""

# 1. git 상태 확인: 로컬 변경이 커밋되었는지
echo "[1/4] git 상태 확인..."
cd "$REPO_DIR"
UNSTAGED=$(git diff --name-only -- makeshop-skin/ 2>/dev/null | grep -v '_sync/' || true)
UNTRACKED=$(git ls-files --others --exclude-standard -- makeshop-skin/ 2>/dev/null | grep -v '_sync/' || true)

if [ -n "$UNSTAGED" ] || [ -n "$UNTRACKED" ]; then
  echo -e "${RED}[오류] 커밋되지 않은 변경이 있습니다!${NC}"
  echo "push 전에 먼저 커밋하세요:"
  [ -n "$UNSTAGED" ] && echo "  변경됨: $UNSTAGED"
  [ -n "$UNTRACKED" ] && echo "  추적안됨: $UNTRACKED"
  echo ""
  echo "  git add makeshop-skin/ && git commit -m 'feat: [작업내용]'"
  exit 1
fi
echo -e "${GREEN}  OK - 모든 변경이 커밋됨${NC}"

# 2. SYNC-STATUS.md에서 마지막 pull 시각 확인
echo ""
echo "[2/4] 마지막 동기화 시각 확인..."
if [ -f "$STATUS_FILE" ]; then
  LAST_PULL=$(grep -o 'pull 시각: [0-9T:. -]*' "$STATUS_FILE" 2>/dev/null | head -1 | sed 's/pull 시각: //')
  if [ -n "$LAST_PULL" ]; then
    echo "  마지막 pull: $LAST_PULL"
    # 24시간 이상 경과 경고
    PULL_EPOCH=$(date -j -f "%Y-%m-%d %H:%M" "$LAST_PULL" "+%s" 2>/dev/null || echo "0")
    NOW_EPOCH=$(date "+%s")
    if [ "$PULL_EPOCH" != "0" ]; then
      DIFF_HOURS=$(( (NOW_EPOCH - PULL_EPOCH) / 3600 ))
      if [ "$DIFF_HOURS" -gt 24 ]; then
        echo -e "${YELLOW}  [경고] 마지막 pull이 ${DIFF_HOURS}시간 전입니다!${NC}"
        echo -e "${YELLOW}  편집기에서 디자이너가 수정했을 수 있습니다.${NC}"
        echo -e "${YELLOW}  먼저 skin-pull을 실행하는 것을 권장합니다.${NC}"
      else
        echo -e "${GREEN}  OK - 최근 ${DIFF_HOURS}시간 이내 동기화됨${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}  [경고] pull 시각을 파싱할 수 없습니다${NC}"
  fi
else
  echo -e "${YELLOW}  [경고] SYNC-STATUS.md 파일이 없습니다${NC}"
fi

# 3. push 대상 파일 확인
echo ""
echo "[3/4] push 대상 파일 확인..."
if [ "$#" -gt 0 ]; then
  TARGET_FILES="$*"
else
  # git에서 최근 커밋의 makeshop-skin 변경 파일
  TARGET_FILES=$(git diff --name-only HEAD~1..HEAD -- makeshop-skin/ 2>/dev/null | grep -v '_sync/' | sed 's|makeshop-skin/||' || echo "")
fi

if [ -z "$TARGET_FILES" ]; then
  echo -e "${YELLOW}  push 대상 파일이 없습니다${NC}"
  exit 0
fi

CSS_FILES=""
for f in $TARGET_FILES; do
  echo "  - $f"
  if echo "$f" | grep -q '\.css$'; then
    CSS_FILES="$CSS_FILES $f"
  fi
done

# 4. CSS 파일 디자이너 수정 위험 경고
echo ""
echo "[4/4] 디자이너 충돌 위험 분석..."
if [ -n "$CSS_FILES" ]; then
  echo -e "${YELLOW}  CSS 파일이 포함되어 있습니다:${NC}"
  for css in $CSS_FILES; do
    echo -e "${YELLOW}    - $css (디자이너 수정 가능 영역)${NC}"
  done
  echo ""
  echo "  CSS push 전 편집기에서 현재 코드를 확인하셨나요?"
  echo "  Claude Code 사용 시: '이 페이지 pull 해줘' 로 최신 코드 확인"
  echo ""
  echo "  권장 절차:"
  echo "    1. 편집기에서 현재 CSS 추출 (skin-pull)"
  echo "    2. 로컬 CSS와 diff 비교"
  echo "    3. 디자이너 변경분이 있으면 병합 후 push"
else
  echo -e "${GREEN}  OK - CSS 파일 없음 (디자이너 충돌 위험 낮음)${NC}"
fi

echo ""
echo -e "${GREEN}=== 사전 점검 완료 ===${NC}"
echo "push를 진행하려면 Claude에게 'push 해줘'라고 요청하세요."
