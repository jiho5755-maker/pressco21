#!/usr/bin/env bash
# Install AI continuity helper commands into ~/.local/bin for use in any local project.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

install_link() {
  local src="$1"
  local dest="$2"
  if [ ! -x "$src" ]; then
    echo "Missing executable: $src" >&2
    exit 1
  fi
  ln -sf "$src" "$dest"
  echo "installed: $dest -> $src"
}

install_link "$SCRIPT_DIR/ai-project-bootstrap.sh" "$BIN_DIR/ai-project-bootstrap"
install_link "$SCRIPT_DIR/ai-session-start.sh" "$BIN_DIR/ai-session-start"
install_link "$SCRIPT_DIR/ai-session-finish.sh" "$BIN_DIR/ai-session-finish"

cat <<EOF2

Done. Make sure ~/.local/bin is on PATH.
Current PATH check:
  command -v ai-project-bootstrap || true
  command -v ai-session-start || true
  command -v ai-session-finish || true
EOF2
