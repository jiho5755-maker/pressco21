#!/bin/bash
set -euo pipefail

OMX_TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OMX_REPO_ROOT="$(cd "$OMX_TOOL_DIR/.." && pwd)"
OMX_WORKSPACE_ROOT="$(cd "$OMX_REPO_ROOT/.." && pwd)"
OMX_NVM_NODE_BIN="$HOME/.nvm/versions/node/v22.21.1/bin"

# Codex App 안에서 PATH가 번들 Node를 먼저 보더라도, PRESSCO21 OMX는 NVM 전역 설치본을 기준으로 맞춘다.
if [ -d "$OMX_NVM_NODE_BIN" ]; then
  export PATH="$OMX_NVM_NODE_BIN:$PATH"
fi

omx_has_cli_entrypoint() {
  local root="$1"
  [ -f "$root/bin/omx.js" ] || [ -f "$root/dist/cli/omx.js" ]
}

omx_find_cli_entrypoint() {
  local root="$1"

  if [ -f "$root/bin/omx.js" ]; then
    printf '%s\n' "$root/bin/omx.js"
    return 0
  fi

  if [ -f "$root/dist/cli/omx.js" ]; then
    printf '%s\n' "$root/dist/cli/omx.js"
    return 0
  fi

  return 1
}

omx_find_local_source_root_default() {
  local search_dir="$OMX_REPO_ROOT"
  local parent_dir
  local candidate

  while [ -n "$search_dir" ] && [ "$search_dir" != "/" ]; do
    parent_dir="$(dirname "$search_dir")"
    candidate="$parent_dir/OMX(오_마이_코덱스)/oh-my-codex"

    if omx_has_cli_entrypoint "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi

    search_dir="$parent_dir"
  done

  printf '%s\n' "$OMX_WORKSPACE_ROOT/OMX(오_마이_코덱스)/oh-my-codex"
}

omx_find_global_source_root() {
  local candidate
  local npm_root

  # 안정판 npm 설치본을 우선 사용한다. 로컬 개발 클론은 P21_OMX_USE_LOCAL_DEV=1일 때만 기본값이 된다.
  for candidate in \
    "$HOME/.nvm/versions/node/v22.21.1/lib/node_modules/oh-my-codex" \
    "/Applications/Codex.app/Contents/lib/node_modules/oh-my-codex"
  do
    if omx_has_cli_entrypoint "$candidate" && [ -d "$candidate/prompts" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if npm_root="$(npm root -g 2>/dev/null)"; then
    candidate="$npm_root/oh-my-codex"
    if omx_has_cli_entrypoint "$candidate" && [ -d "$candidate/prompts" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  fi

  return 1
}

omx_find_source_root_default() {
  local global_root

  if [ "${P21_OMX_USE_LOCAL_DEV:-0}" != "1" ]; then
    if global_root="$(omx_find_global_source_root)"; then
      printf '%s\n' "$global_root"
      return 0
    fi
  fi

  omx_find_local_source_root_default
}

OMX_LOCAL_SOURCE_ROOT_DEFAULT="$(omx_find_local_source_root_default)"
OMX_SOURCE_ROOT_DEFAULT="$(omx_find_source_root_default)"
OMX_SOURCE_ROOT_REQUESTED="${OMX_SOURCE_ROOT:-}"

if [ "${P21_OMX_USE_LOCAL_DEV:-0}" = "1" ]; then
  OMX_SOURCE_ROOT="${OMX_SOURCE_ROOT_REQUESTED:-$OMX_LOCAL_SOURCE_ROOT_DEFAULT}"
elif [ -z "$OMX_SOURCE_ROOT_REQUESTED" ] || [ "$OMX_SOURCE_ROOT_REQUESTED" = "$OMX_LOCAL_SOURCE_ROOT_DEFAULT" ]; then
  # 이전 0.8.x 세션에서 상속된 로컬 개발본 경로는 최신 안정판으로 교정한다.
  OMX_SOURCE_ROOT="$OMX_SOURCE_ROOT_DEFAULT"
else
  OMX_SOURCE_ROOT="$OMX_SOURCE_ROOT_REQUESTED"
fi

OMX_CLI_ENTRYPOINT="$(omx_find_cli_entrypoint "$OMX_SOURCE_ROOT" 2>/dev/null || true)"

OMX_PROFILE_ROOT_DEFAULT="$HOME/.codex-profiles/omx-overlay"
OMX_PROFILE_ROOT="${OMX_PROFILE_ROOT:-$OMX_PROFILE_ROOT_DEFAULT}"
OMX_PROFILE_CODEX_HOME="$OMX_PROFILE_ROOT/codex-home"

OMX_BASE_CODEX_HOME_DEFAULT="$HOME/.codex"
OMX_BASE_CODEX_HOME="${OMX_BASE_CODEX_HOME:-$OMX_BASE_CODEX_HOME_DEFAULT}"

omx_sync_profile_runtime_files() {
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
}

omx_require_source_root() {
  if [ ! -d "$OMX_SOURCE_ROOT" ]; then
    echo "OMX source repo not found: $OMX_SOURCE_ROOT" >&2
    exit 1
  fi

  if [ -z "$OMX_CLI_ENTRYPOINT" ]; then
    echo "OMX CLI entrypoint missing under: $OMX_SOURCE_ROOT" >&2
    echo "Expected one of: bin/omx.js, dist/cli/omx.js" >&2
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

  omx_sync_profile_runtime_files

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
  printf 'OMX entrypoint: %s\n' "$OMX_CLI_ENTRYPOINT"
  printf 'Base Codex home: %s\n' "$OMX_BASE_CODEX_HOME"
  printf 'Overlay Codex home: %s\n' "$OMX_PROFILE_CODEX_HOME"
  printf 'Prompt count: '
  find "$OMX_PROFILE_CODEX_HOME/prompts" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' '
  printf '\n'
}
