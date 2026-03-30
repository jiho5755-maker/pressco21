#!/bin/bash
# add-page-mapping.sh — 새 개별 페이지를 editor-map.json에 추가
#
# 사용법:
#   bash _sync/add-page-mapping.sh <design_id> <page_name>
#
# 예시:
#   bash _sync/add-page-mapping.sh 8020 review
#   -> pages/review/ 폴더 생성 + editor-map.json에 매핑 추가
#
# 새 페이지를 편집기에서 만든 후 이 스크립트로 로컬 매핑을 추가한다.

set -euo pipefail

SYNC_DIR="$(cd "$(dirname "$0")" && pwd)"
SKIN_DIR="$(cd "$SYNC_DIR/.." && pwd)"
MAP_FILE="$SYNC_DIR/editor-map.json"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$#" -lt 2 ]; then
  echo "사용법: bash _sync/add-page-mapping.sh <design_id> <page_name>"
  echo "예시:   bash _sync/add-page-mapping.sh 8020 review"
  exit 1
fi

DESIGN_ID="$1"
PAGE_NAME="$2"
PAGE_DIR="$SKIN_DIR/pages/$PAGE_NAME"

# 1. 폴더 존재 확인
if [ -d "$PAGE_DIR" ]; then
  echo -e "${YELLOW}[경고] pages/$PAGE_NAME/ 폴더가 이미 존재합니다${NC}"
else
  mkdir -p "$PAGE_DIR"
  echo -e "${GREEN}[생성] pages/$PAGE_NAME/ 폴더 생성${NC}"
fi

# 2. 빈 파일 생성 (없는 경우에만)
for ext in html css js; do
  FILE="$PAGE_DIR/$PAGE_NAME.$ext"
  if [ ! -f "$FILE" ]; then
    touch "$FILE"
    echo -e "${GREEN}  + $PAGE_NAME.$ext (빈 파일)${NC}"
  fi
done

# 3. editor-map.json에 매핑 추가
# JSON 파일 마지막 } 앞에 새 항목 삽입
for ext in html css js; do
  KEY="pages/$PAGE_NAME/$PAGE_NAME.$ext"
  TAB_NAME=$(echo "$ext" | tr '[:lower:]' '[:upper:]')

  case "$ext" in
    html) TAB_IDX=0 ;;
    css)  TAB_IDX=1 ;;
    js)   TAB_IDX=2 ;;
  esac

  # 이미 존재하는지 확인
  if grep -q "\"$KEY\"" "$MAP_FILE" 2>/dev/null; then
    echo -e "${YELLOW}  [건너뜀] $KEY — 이미 매핑 존재${NC}"
  else
    # 마지막 } 직전에 삽입 (간단한 sed 방식)
    # 주의: jq가 없으므로 sed로 처리
    ENTRY="  \"$KEY\": { \"editorSection\": \"개별페이지\", \"tabIndex\": $TAB_IDX, \"tabName\": \"$TAB_NAME\", \"designId\": $DESIGN_ID },"
    # 파일 끝의 } 앞에 삽입
    sed -i '' "\$i\\
$ENTRY
" "$MAP_FILE"
    echo -e "${GREEN}  + $KEY -> design_id=$DESIGN_ID${NC}"
  fi
done

# 4. editor-sync.md 참조 안내
echo ""
echo -e "${GREEN}=== 매핑 추가 완료 ===${NC}"
echo "편집기 URL: page_type=page&design_id=$DESIGN_ID"
echo "로컬 경로:  pages/$PAGE_NAME/"
echo ""
echo "스킨 풀:  'pages/$PAGE_NAME 스킨 풀 해줘'"
echo "스킨 푸시: 'pages/$PAGE_NAME 스킨 푸시 해줘'"
