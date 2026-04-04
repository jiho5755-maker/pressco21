#!/bin/bash
# vtag-lint.sh — 가상태그 쌍 검증 + ${} 이스케이프 체크
#
# 사용법:
#   bash makeshop-skin/_sync/vtag-lint.sh [파일경로...]
#   bash makeshop-skin/_sync/vtag-lint.sh              (전체 HTML/JS 검사)
#
# 검사 항목:
#   1. HTML 가상태그 열기/닫기 쌍 일치 (if↔end_if, loop↔end_loop, form↔end_form)
#   2. JS 파일 내 ${variable} 이스케이프 누락 (\${} 필수)
#   3. 중첩 가상태그 경고 (if_not_soldout 안에 if_login 등)

set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "=== 가상태그 + 이스케이프 검증 ==="
echo ""

# 대상 파일 결정
if [ $# -gt 0 ]; then
  FILES=("$@")
else
  HTML_FILES=()
  while IFS= read -r line; do [ -n "$line" ] && HTML_FILES+=("$line"); done < <(find "$SKIN_DIR" -name "*.html" -not -path "*/_sync/*" -not -path "*/기존*" -not -path "*/기본코드/*")
  JS_FILES=()
  while IFS= read -r line; do [ -n "$line" ] && JS_FILES+=("$line"); done < <(find "$SKIN_DIR" -name "*.js" -not -path "*/_sync/*" -not -path "*/기존*" -not -path "*/기본코드/*" -not -name "editor-map.json")
  FILES=("${HTML_FILES[@]}" "${JS_FILES[@]}")
fi

# --- 1. 가상태그 쌍 검증 (HTML만) ---
echo -e "${CYAN}[1/3] 가상태그 쌍 검증...${NC}"

for f in "${FILES[@]}"; do
  [[ "$f" != *.html ]] && continue
  REL="${f#$SKIN_DIR/}"

  # if 계열
  OPEN_IF=$(grep -c '<!--if_' "$f" 2>/dev/null || true)
  CLOSE_IF=$(grep -c '<!--/if_' "$f" 2>/dev/null || true)
  if [ "$OPEN_IF" != "$CLOSE_IF" ]; then
    echo -e "  ${RED}FAIL${NC} $REL: if 열기($OPEN_IF) != 닫기($CLOSE_IF)"
    ((ERRORS++))
  fi

  # loop 계열
  OPEN_LOOP=$(grep -c '<!--loop_' "$f" 2>/dev/null || true)
  CLOSE_LOOP=$(grep -c '<!--/loop_' "$f" 2>/dev/null || true)
  if [ "$OPEN_LOOP" != "$CLOSE_LOOP" ]; then
    echo -e "  ${RED}FAIL${NC} $REL: loop 열기($OPEN_LOOP) != 닫기($CLOSE_LOOP)"
    ((ERRORS++))
  fi

  # form 계열
  OPEN_FORM=$(grep -c '<!--form_' "$f" 2>/dev/null || true)
  CLOSE_FORM=$(grep -c '<!--/form_' "$f" 2>/dev/null || true)
  if [ "$OPEN_FORM" != "$CLOSE_FORM" ]; then
    echo -e "  ${RED}FAIL${NC} $REL: form 열기($OPEN_FORM) != 닫기($CLOSE_FORM)"
    ((ERRORS++))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}PASS${NC} 모든 가상태그 쌍 일치"
fi

# --- 2. ${} 이스케이프 체크 (JS만) ---
echo ""
echo -e "${CYAN}[2/3] \${} 이스케이프 검증 (JS 파일)...${NC}"

ESCAPE_ERRORS=0
for f in "${FILES[@]}"; do
  [[ "$f" != *.js ]] && continue
  REL="${f#$SKIN_DIR/}"

  # 이스케이프 안 된 ${...} 찾기 (앞에 \가 없는 것)
  # grep -P: 펄 정규식, (?<!\\) = 앞에 \가 아닌 경우
  UNESCAPED=$(grep -Pn '(?<!\\)\$\{' "$f" 2>/dev/null || true)
  if [ -n "$UNESCAPED" ]; then
    echo -e "  ${RED}FAIL${NC} $REL: 이스케이프 안 된 \${} 발견"
    echo "$UNESCAPED" | head -5 | while IFS= read -r line; do
      echo -e "    ${YELLOW}→${NC} $line"
    done
    ((ESCAPE_ERRORS++))
    ((ERRORS++))
  fi
done

if [ "$ESCAPE_ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}PASS${NC} 모든 JS 파일 이스케이프 정상"
fi

# --- 3. 중첩 가상태그 경고 ---
echo ""
echo -e "${CYAN}[3/3] 중첩 가상태그 경고...${NC}"

for f in "${FILES[@]}"; do
  [[ "$f" != *.html ]] && continue
  REL="${f#$SKIN_DIR/}"

  # if 블록 안에 또 다른 if 블록이 있는지 간이 체크
  NESTED=$(grep -n 'if_not_soldout\|if_soldout' "$f" 2>/dev/null || true)
  if [ -n "$NESTED" ]; then
    HAS_INNER=$(grep -c 'if_login\|if_member\|if_not_login' "$f" 2>/dev/null || true)
    if [ "$HAS_INNER" -gt 0 ]; then
      echo -e "  ${YELLOW}WARN${NC} $REL: soldout+login 중첩 가상태그 — 템플릿 깨짐 주의"
      ((WARNINGS++))
    fi
  fi
done

if [ "$WARNINGS" -eq 0 ]; then
  echo -e "  ${GREEN}PASS${NC} 위험 중첩 없음"
fi

# --- 결과 ---
echo ""
echo "=== 결과 ==="
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}오류 ${ERRORS}건${NC}, 경고 ${WARNINGS}건 — 수정 후 배포하세요"
  exit 1
else
  echo -e "${GREEN}통과${NC} (경고 ${WARNINGS}건)"
  exit 0
fi
