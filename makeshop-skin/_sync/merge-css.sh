#!/bin/bash
# merge-css.sh — CSS 3-way 병합 도구
#
# 디자이너(편집기)와 개발자(로컬) CSS 변경분을 안전하게 병합한다.
#
# 3-way merge 원리:
#   BASE  = 마지막 pull 시점의 CSS (git에서 가져옴)
#   OURS  = 로컬 CSS (개발자 수정)
#   THEIRS = 편집기 CSS (디자이너 수정)
#   → git merge-file로 3-way 병합
#
# 사용법:
#   bash makeshop-skin/_sync/merge-css.sh <로컬파일> <편집기추출파일>
#
# 예시:
#   bash makeshop-skin/_sync/merge-css.sh main/main.css /tmp/editor-main.css
#
# 내부적으로 Claude Code가 skin-push 시 충돌 감지되면 자동 호출한다.

set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(cd "$SKIN_DIR/.." && pwd)"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$#" -lt 2 ]; then
  echo "사용법: merge-css.sh <로컬_CSS_파일> <편집기_CSS_파일>"
  echo "예시:   merge-css.sh main/main.css /tmp/editor-main.css"
  exit 1
fi

LOCAL_FILE="$1"
EDITOR_FILE="$2"
FULL_LOCAL="$SKIN_DIR/$LOCAL_FILE"

if [ ! -f "$FULL_LOCAL" ]; then
  echo -e "${RED}[오류] 로컬 파일을 찾을 수 없습니다: $FULL_LOCAL${NC}"
  exit 1
fi

if [ ! -f "$EDITOR_FILE" ]; then
  echo -e "${RED}[오류] 편집기 파일을 찾을 수 없습니다: $EDITOR_FILE${NC}"
  exit 1
fi

echo "=== CSS 3-Way 병합 ==="
echo "  로컬 (OURS):  $LOCAL_FILE"
echo "  편집기 (THEIRS): $EDITOR_FILE"
echo ""

# BASE 추출: 마지막 커밋 시점의 파일
cd "$REPO_DIR"
BASE_FILE=$(mktemp /tmp/merge-base-XXXXXX.css)
MERGED_FILE=$(mktemp /tmp/merge-result-XXXXXX.css)

# git show로 마지막 커밋 시점의 파일 가져오기
if git show "HEAD:makeshop-skin/$LOCAL_FILE" > "$BASE_FILE" 2>/dev/null; then
  echo "  BASE (커밋):  git HEAD:makeshop-skin/$LOCAL_FILE"
else
  echo -e "${YELLOW}  BASE를 찾을 수 없어 현재 로컬 파일을 BASE로 사용합니다${NC}"
  cp "$FULL_LOCAL" "$BASE_FILE"
fi

echo ""

# 먼저 diff 확인
echo "[1/3] 변경 분석..."
DIFF_OURS=$(diff "$BASE_FILE" "$FULL_LOCAL" 2>/dev/null | wc -l | tr -d ' ')
DIFF_THEIRS=$(diff "$BASE_FILE" "$EDITOR_FILE" 2>/dev/null | wc -l | tr -d ' ')
DIFF_BOTH=$(diff "$FULL_LOCAL" "$EDITOR_FILE" 2>/dev/null | wc -l | tr -d ' ')

echo "  개발자 변경: ${DIFF_OURS}줄 diff"
echo "  디자이너 변경: ${DIFF_THEIRS}줄 diff"
echo "  양쪽 차이: ${DIFF_BOTH}줄 diff"

# 변경 없는 경우
if [ "$DIFF_BOTH" = "0" ]; then
  echo -e "${GREEN}  로컬과 편집기가 동일합니다. 병합 불필요.${NC}"
  rm -f "$BASE_FILE" "$MERGED_FILE"
  exit 0
fi

# 한쪽만 변경된 경우
if [ "$DIFF_OURS" = "0" ]; then
  echo -e "${CYAN}  개발자 변경 없음 → 편집기 코드를 그대로 적용합니다${NC}"
  cp "$EDITOR_FILE" "$FULL_LOCAL"
  echo -e "${GREEN}  완료: $LOCAL_FILE 업데이트됨${NC}"
  rm -f "$BASE_FILE" "$MERGED_FILE"
  exit 0
fi

if [ "$DIFF_THEIRS" = "0" ]; then
  echo -e "${CYAN}  디자이너 변경 없음 → 로컬 코드 유지${NC}"
  rm -f "$BASE_FILE" "$MERGED_FILE"
  exit 0
fi

# 양쪽 모두 변경 → 3-way merge
echo ""
echo "[2/3] 3-way 병합 실행..."
cp "$FULL_LOCAL" "$MERGED_FILE"

# git merge-file: OURS를 기준으로 BASE → THEIRS 변경분 적용
if git merge-file -p "$FULL_LOCAL" "$BASE_FILE" "$EDITOR_FILE" > "$MERGED_FILE" 2>/dev/null; then
  echo -e "${GREEN}  자동 병합 성공!${NC}"
  CONFLICTS=0
else
  CONFLICTS=$(grep -c '<<<<<<<' "$MERGED_FILE" 2>/dev/null || echo "0")
  echo -e "${YELLOW}  충돌 ${CONFLICTS}건 발생 — 수동 해결 필요${NC}"
fi

echo ""
echo "[3/3] 결과..."
if [ "$CONFLICTS" = "0" ]; then
  cp "$MERGED_FILE" "$FULL_LOCAL"
  echo -e "${GREEN}  $LOCAL_FILE 에 병합 결과 적용 완료${NC}"
  echo "  git diff로 결과를 확인하세요"
else
  CONFLICT_FILE="$FULL_LOCAL.conflict"
  cp "$MERGED_FILE" "$CONFLICT_FILE"
  echo -e "${YELLOW}  충돌 파일 저장: $CONFLICT_FILE${NC}"
  echo "  충돌 마커(<<<<<<<, =======, >>>>>>>)를 직접 해결하세요"
  echo "  해결 후: mv $CONFLICT_FILE $FULL_LOCAL"
fi

# 정리
rm -f "$BASE_FILE" "$MERGED_FILE"

echo ""
echo "=== 병합 완료 ==="
