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
