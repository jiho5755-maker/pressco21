#!/bin/bash
set -euo pipefail

OMX_TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OMX_REPO_ROOT="$(cd "$OMX_TOOL_DIR/.." && pwd)"
OMX_WORKSPACE_ROOT="$(cd "$OMX_REPO_ROOT/.." && pwd)"

OMX_SOURCE_ROOT_DEFAULT="$OMX_WORKSPACE_ROOT/OMX(오_마이_코덱스)/oh-my-codex"
OMX_SOURCE_ROOT="${OMX_SOURCE_ROOT:-$OMX_SOURCE_ROOT_DEFAULT}"

OMX_PROFILE_ROOT_DEFAULT="$HOME/.codex-profiles/omx-overlay"
OMX_PROFILE_ROOT="${OMX_PROFILE_ROOT:-$OMX_PROFILE_ROOT_DEFAULT}"
OMX_PROFILE_CODEX_HOME="$OMX_PROFILE_ROOT/codex-home"

OMX_BASE_CODEX_HOME_DEFAULT="$HOME/.codex"
OMX_BASE_CODEX_HOME="${OMX_BASE_CODEX_HOME:-$OMX_BASE_CODEX_HOME_DEFAULT}"

omx_require_source_root() {
  if [ ! -d "$OMX_SOURCE_ROOT" ]; then
    echo "OMX source repo not found: $OMX_SOURCE_ROOT" >&2
    exit 1
  fi

  if [ ! -f "$OMX_SOURCE_ROOT/bin/omx.js" ]; then
    echo "OMX CLI entrypoint missing: $OMX_SOURCE_ROOT/bin/omx.js" >&2
    exit 1
  fi
}

omx_ensure_dist() {
  omx_require_source_root

  if [ -f "$OMX_SOURCE_ROOT/dist/cli/index.js" ]; then
    return 0
  fi

  echo "OMX dist output missing. Building local oh-my-codex once..." >&2
  (cd "$OMX_SOURCE_ROOT" && npm run build) >&2
}

omx_profile_prepare() {
  omx_ensure_dist

  mkdir -p "$OMX_PROFILE_CODEX_HOME"

  if [ -f "$OMX_BASE_CODEX_HOME/auth.json" ]; then
    cp "$OMX_BASE_CODEX_HOME/auth.json" "$OMX_PROFILE_CODEX_HOME/auth.json"
  fi

  if [ -f "$OMX_BASE_CODEX_HOME/config.toml" ]; then
    cp "$OMX_BASE_CODEX_HOME/config.toml" "$OMX_PROFILE_CODEX_HOME/config.toml"
  fi

  for entry in plugins skills rules vendor_imports; do
    if [ -e "$OMX_BASE_CODEX_HOME/$entry" ] && [ ! -e "$OMX_PROFILE_CODEX_HOME/$entry" ]; then
      ln -s "$OMX_BASE_CODEX_HOME/$entry" "$OMX_PROFILE_CODEX_HOME/$entry"
    fi
  done

  mkdir -p "$OMX_PROFILE_CODEX_HOME/prompts"
  rsync -a --delete "$OMX_SOURCE_ROOT/prompts/" "$OMX_PROFILE_CODEX_HOME/prompts/"

  cat > "$OMX_PROFILE_ROOT/README.txt" <<EOF
This profile keeps the existing Codex setup intact and adds oh-my-codex prompts
for overlay-style launch and team orchestration.

Source OMX repo: $OMX_SOURCE_ROOT
Base Codex home: $OMX_BASE_CODEX_HOME
Overlay Codex home: $OMX_PROFILE_CODEX_HOME
EOF
}

omx_print_profile_summary() {
  printf 'OMX source: %s\n' "$OMX_SOURCE_ROOT"
  printf 'Base Codex home: %s\n' "$OMX_BASE_CODEX_HOME"
  printf 'Overlay Codex home: %s\n' "$OMX_PROFILE_CODEX_HOME"
  printf 'Prompt count: '
  find "$OMX_PROFILE_CODEX_HOME/prompts" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' '
  printf '\n'
}
