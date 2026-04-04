#!/bin/bash
# snapshot.sh — 배포 전 git 태그 스냅샷 생성
#
# 사용법:
#   bash makeshop-skin/_sync/snapshot.sh           (스냅샷 생성)
#   bash makeshop-skin/_sync/snapshot.sh --dry-run (실행 없이 확인만)
#   bash makeshop-skin/_sync/snapshot.sh --list    (기존 스냅샷 목록)
#
# 롤백:
#   git checkout skin-snapshot-YYYYMMDD-HHMM -- makeshop-skin/

set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(cd "$SKIN_DIR/.." && pwd)"
STATUS_FILE="$SKIN_DIR/_sync/SYNC-STATUS.md"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TAG_NAME="skin-snapshot-$(date +%Y%m%d-%H%M)"

# --list: 기존 스냅샷 표시
if [ "${1:-}" = "--list" ]; then
  echo "=== 기존 스킨 스냅샷 ==="
  git -C "$REPO_DIR" tag -l 'skin-snapshot-*' --sort=-creatordate | head -10
  exit 0
fi

# --dry-run: 확인만
if [ "${1:-}" = "--dry-run" ]; then
  echo -e "${CYAN}[dry-run]${NC} 태그명: $TAG_NAME"
  echo -e "${CYAN}[dry-run]${NC} 대상: makeshop-skin/ 전체"
  CHANGED=$(git -C "$REPO_DIR" diff --name-only HEAD -- makeshop-skin/ | wc -l | tr -d ' ')
  echo -e "${CYAN}[dry-run]${NC} 현재 미커밋 변경: ${CHANGED}개 파일"
  exit 0
fi

echo "=== 스킨 스냅샷 생성 ==="
echo ""

# 미커밋 변경 체크
CHANGED=$(git -C "$REPO_DIR" diff --name-only HEAD -- makeshop-skin/ | wc -l | tr -d ' ')
if [ "$CHANGED" -gt 0 ]; then
  echo -e "${YELLOW}경고: 미커밋 파일 ${CHANGED}개 — 스냅샷은 마지막 커밋 기준입니다${NC}"
fi

# 태그 생성
git -C "$REPO_DIR" tag "$TAG_NAME" -m "스킨 스냅샷 (배포 전)"
echo -e "${GREEN}태그 생성: $TAG_NAME${NC}"

# SYNC-STATUS.md에 기록
if [ -f "$STATUS_FILE" ]; then
  # "## 스냅샷" 섹션이 없으면 추가
  if ! grep -q '## 스냅샷' "$STATUS_FILE"; then
    echo "" >> "$STATUS_FILE"
    echo "## 스냅샷" >> "$STATUS_FILE"
    echo "" >> "$STATUS_FILE"
  fi
  echo "- $TAG_NAME ($(date +%Y-%m-%d\ %H:%M))" >> "$STATUS_FILE"
  echo -e "${GREEN}SYNC-STATUS.md에 기록 완료${NC}"
fi

echo ""
echo "롤백 명령: git checkout $TAG_NAME -- makeshop-skin/"
