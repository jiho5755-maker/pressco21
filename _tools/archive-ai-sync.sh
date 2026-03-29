#!/bin/bash
# AI_SYNC.md 아카이빙 스크립트
# 활성 영역만 유지하고 과거 데이터를 archive/ai-sync/에 이동
# 사용법: bash pressco21/_tools/archive-ai-sync.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SYNC_FILE="$REPO_ROOT/AI_SYNC.md"
ARCHIVE_DIR="$REPO_ROOT/archive/ai-sync"
ARCHIVE_FILE="$ARCHIVE_DIR/$(date +%Y-%m).md"

if [ ! -f "$SYNC_FILE" ]; then
  echo "오류: AI_SYNC.md를 찾을 수 없습니다: $SYNC_FILE"
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

TOTAL_LINES=$(wc -l < "$SYNC_FILE" | tr -d ' ')
echo "=== AI_SYNC.md 아카이빙 ==="
echo "현재 행수: $TOTAL_LINES"

# 활성 영역 끝 찾기: "Known Risks" 섹션 다음의 첫 번째 빈 줄 블록 이후
# 패턴: 첫 번째 "## Known Risks" 이후의 내용까지가 활성 영역
# 두 번째 "## Last Changes"부터가 과거 데이터

# 두 번째 "## Last Changes" 행 번호 찾기
SECOND_LAST_CHANGES=$(grep -n "^## Last Changes" "$SYNC_FILE" | sed -n '2p' | cut -d: -f1)

if [ -z "$SECOND_LAST_CHANGES" ]; then
  echo "과거 데이터 영역을 찾을 수 없습니다. 아카이빙할 내용이 없습니다."
  exit 0
fi

ACTIVE_END=$((SECOND_LAST_CHANGES - 1))
ARCHIVE_START=$SECOND_LAST_CHANGES

echo "활성 영역: 1 ~ $ACTIVE_END 행"
echo "아카이브 대상: $ARCHIVE_START ~ $TOTAL_LINES 행"

# 아카이브 파일에 추가 (이미 존재하면 append)
ARCHIVE_LINES=$((TOTAL_LINES - ACTIVE_END))

if [ -f "$ARCHIVE_FILE" ]; then
  echo "" >> "$ARCHIVE_FILE"
  echo "---" >> "$ARCHIVE_FILE"
  echo "" >> "$ARCHIVE_FILE"
fi

echo "# AI_SYNC.md 아카이브 ($(date +%Y-%m-%d))" >> "$ARCHIVE_FILE"
echo "" >> "$ARCHIVE_FILE"
sed -n "${ARCHIVE_START},${TOTAL_LINES}p" "$SYNC_FILE" >> "$ARCHIVE_FILE"

# AI_SYNC.md를 활성 영역만으로 재작성
head -n "$ACTIVE_END" "$SYNC_FILE" > "${SYNC_FILE}.tmp"
mv "${SYNC_FILE}.tmp" "$SYNC_FILE"

NEW_LINES=$(wc -l < "$SYNC_FILE" | tr -d ' ')

echo ""
echo "=== 아카이빙 완료 ==="
echo "아카이브: ${ARCHIVE_LINES}행 → $ARCHIVE_FILE"
echo "AI_SYNC.md: ${TOTAL_LINES}행 → ${NEW_LINES}행"
