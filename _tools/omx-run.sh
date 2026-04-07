#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/omx-common.sh"

refresh_profile=0

while [ $# -gt 0 ]; do
  case "$1" in
    --refresh-profile)
      refresh_profile=1
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [ $refresh_profile -eq 1 ] || [ ! -d "$OMX_PROFILE_CODEX_HOME/prompts" ]; then
  omx_profile_prepare
fi

export CODEX_HOME="$OMX_PROFILE_CODEX_HOME"
export OMX_MODEL_INSTRUCTIONS_FILE="${OMX_MODEL_INSTRUCTIONS_FILE:-$PWD/AGENTS.md}"

exec node "$OMX_SOURCE_ROOT/bin/omx.js" "$@"
