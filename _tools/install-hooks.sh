#!/bin/bash
# Git Hooks 설치 스크립트
# 사용법: bash pressco21/_tools/install-hooks.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOKS_SRC="$SCRIPT_DIR/git-hooks"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DEST="$REPO_ROOT/.git/hooks"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "오류: $REPO_ROOT 는 git 저장소가 아닙니다."
  exit 1
fi

if [ ! -d "$HOOKS_SRC" ]; then
  echo "오류: $HOOKS_SRC 디렉토리를 찾을 수 없습니다."
  exit 1
fi

echo "=== Git Hooks 설치 ==="
echo "소스: $HOOKS_SRC"
echo "대상: $HOOKS_DEST"
echo ""

INSTALLED=0
for HOOK in pre-commit commit-msg pre-push; do
  if [ -f "$HOOKS_SRC/$HOOK" ]; then
    cp "$HOOKS_SRC/$HOOK" "$HOOKS_DEST/$HOOK"
    chmod +x "$HOOKS_DEST/$HOOK"
    echo "✅ $HOOK 설치 완료"
    INSTALLED=$((INSTALLED + 1))
  fi
done

echo ""
echo "=== 설치 완료: ${INSTALLED}개 훅 활성화 ==="
echo ""
echo "설치된 훅:"
echo "  pre-commit  — 메이크샵 \${var} 이스케이프 검증 + CSS 전역 셀렉터 경고"
echo "  commit-msg  — 커밋 메시지 형식 검증 (한국어 필수)"
echo "  pre-push    — AI_SYNC.md 충돌 경고"
