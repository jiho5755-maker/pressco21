#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/omx-common.sh"

omx_shell_join() {
  local joined=""
  local token
  for token in "$@"; do
    joined+=$(printf '%q ' "$token")
  done
  printf '%s\n' "${joined% }"
}

omx_is_team_start() {
  if [ "${1:-}" != "team" ]; then
    return 1
  fi

  case "${2:-}" in
    ""|help|--help|-h|status|await|resume|shutdown|api)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

omx_launch_team_via_tmux() {
  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is required for automatic OMX team launch outside tmux." >&2
    exit 1
  fi

  local leader_session="omx-launch-$(date +%H%M%S)"
  local model_instructions="${OMX_MODEL_INSTRUCTIONS_FILE:-$PWD/AGENTS.md}"
  local launch_script
  local omx_args

  launch_script="$(mktemp "${TMPDIR:-/tmp}/omx-team-launch.XXXXXX.sh")"
  omx_args="$(omx_shell_join "$@")"
  cat > "$launch_script" <<EOF
#!/bin/bash
set -euo pipefail
rm -- "\$0"
cd "$PWD"
export CODEX_HOME="$OMX_PROFILE_CODEX_HOME"
export OMX_MODEL_INSTRUCTIONS_FILE="$model_instructions"
exec node "$OMX_SOURCE_ROOT/bin/omx.js" $omx_args
EOF
  chmod +x "$launch_script"

  tmux new-session -d -s "$leader_session" -c "$PWD"
  sleep 1
  tmux send-keys -t "$leader_session:0.0" "bash $launch_script" C-m
  sleep 4

  tmux capture-pane -t "$leader_session:0.0" -p | tail -n 20
  printf '\nLeader tmux session: %s\n' "$leader_session"
  printf 'Attach if needed: tmux attach -t %s\n' "$leader_session"
}

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

if omx_is_team_start "$@"; then
  if [ -z "${TMUX:-}" ] && [ -z "${OMX_TEAM_WORKER_LAUNCH_MODE:-}" ]; then
    omx_launch_team_via_tmux "$@"
    exit 0
  fi
fi

exec node "$OMX_SOURCE_ROOT/bin/omx.js" "$@"
