#!/bin/bash
# Git Hooks 설치 스크립트
# 사용법: bash pressco21/_tools/install-hooks.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOKS_SRC="$SCRIPT_DIR/git-hooks"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_COMMON_DIR="$(git -C "$REPO_ROOT" rev-parse --git-common-dir 2>/dev/null || true)"
if [ -z "$GIT_COMMON_DIR" ]; then
  echo "오류: $REPO_ROOT 는 git 저장소가 아닙니다."
  exit 1
fi
case "$GIT_COMMON_DIR" in
  /*) HOOKS_DEST="$GIT_COMMON_DIR/hooks" ;;
  *) HOOKS_DEST="$REPO_ROOT/$GIT_COMMON_DIR/hooks" ;;
esac

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
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

mkdir -p "$HOOKS_DEST"

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
echo "  pre-commit  — 프로젝트 scope guard + 메이크샵 \${var} 검증"
echo "  commit-msg  — 커밋 메시지 형식 검증 (한국어 필수)"
echo "  pre-push    — 인증키/환경 파일 변경 방지"
