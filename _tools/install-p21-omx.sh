#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
TARGET_PATH="$TARGET_DIR/p21-omx"
DEFAULT_REPO_ROOT="$REPO_ROOT"

mkdir -p "$TARGET_DIR"

cat > "$TARGET_PATH" <<EOF
#!/bin/bash
set -euo pipefail

DEFAULT_REPO_ROOT="$DEFAULT_REPO_ROOT"
OMX_NVM_NODE_BIN="\$HOME/.nvm/versions/node/v22.21.1/bin"
OMX_GLOBAL_ROOT="\$HOME/.nvm/versions/node/v22.21.1/lib/node_modules/oh-my-codex"
OMX_LOCAL_DEV_ROOT="\$HOME/workspace/OMX(오_마이_코덱스)/oh-my-codex"

if [ -d "\$OMX_NVM_NODE_BIN" ]; then
  export PATH="\$OMX_NVM_NODE_BIN:\$PATH"
fi

# 기본 실행은 npm으로 설치된 최신 안정판을 사용한다.
# 이전 세션에서 상속된 로컬 개발본 경로는 자동 교정한다.
# 로컬 개발본을 의도적으로 쓰려면 P21_OMX_USE_LOCAL_DEV=1 p21-omx ... 를 사용한다.
if [ "\${P21_OMX_USE_LOCAL_DEV:-0}" = "1" ]; then
  export OMX_SOURCE_ROOT="\${OMX_SOURCE_ROOT:-\$OMX_LOCAL_DEV_ROOT}"
elif [ -f "\$OMX_GLOBAL_ROOT/dist/cli/omx.js" ]; then
  case "\${OMX_SOURCE_ROOT:-}" in
    ""|"\$OMX_LOCAL_DEV_ROOT") export OMX_SOURCE_ROOT="\$OMX_GLOBAL_ROOT" ;;
  esac
fi

search_dir="\$PWD"

while [ -n "\$search_dir" ] && [ "\$search_dir" != "/" ]; do
  if [ -f "\$search_dir/_tools/omx-easy.sh" ]; then
    exec bash "\$search_dir/_tools/omx-easy.sh" "\$@"
  fi
  search_dir="\$(dirname "\$search_dir")"
done

if [ -f "\$DEFAULT_REPO_ROOT/_tools/omx-easy.sh" ]; then
  exec bash "\$DEFAULT_REPO_ROOT/_tools/omx-easy.sh" "\$@"
fi

echo "p21-omx 실행기를 찾을 수 없습니다. pressco21 worktree 안에서 다시 시도하세요." >&2
exit 1
EOF

chmod +x "$TARGET_PATH"

printf 'Installed: %s\n' "$TARGET_PATH"
printf 'Try: p21-omx help\n'
