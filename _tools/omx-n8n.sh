#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OMX_RUN_SCRIPT="$SCRIPT_DIR/omx-run.sh"

usage() {
  cat <<'EOF'
Usage:
  bash _tools/omx-n8n.sh [--lanes <spec>] [--print] <preset> [extra task text]

Presets:
  migration-check
  accounting-audit
  govt-support-audit
  homepage-audit
  verify-preflight
  implement "<task>"

Examples:
  bash _tools/omx-n8n.sh migration-check
  bash _tools/omx-n8n.sh accounting-audit
  bash _tools/omx-n8n.sh implement "add rollback-safe parser guard to accounting workflows"
  bash _tools/omx-n8n.sh --lanes 4:executor --print govt-support-audit
EOF
}

lanes="3:executor"
print_only=0

while [ $# -gt 0 ]; do
  case "$1" in
    --lanes)
      lanes="${2:-}"
      shift 2
      ;;
    --print)
      print_only=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

preset="$1"
shift
extra_task="$*"

case "$preset" in
  migration-check)
    task_prompt=$'1. Compare Desktop/n8n-main/pressco21 workflow JSON against workspace/pressco21/n8n-automation and list missing or drifted paths.\n2. Compare supporting docs and helper scripts while keeping Desktop/n8n-main read-only and mark what should stay reference-only.\n3. Produce a migrated, drifted, missing checklist with exact paths and next migration actions.'
    ;;
  accounting-audit)
    task_prompt=$'1. Audit accounting workflow wiring for parser, ledger, alerting, and replay regressions.\n2. Audit shared code, fixtures, and deploy helpers connected to accounting workflows.\n3. Report concrete risks, exact file paths, and the smallest useful validation tests.'
    ;;
  govt-support-audit)
    task_prompt=$'1. Audit govt-support workflow files for migration drift and broken references.\n2. Compare related workspace docs and helper assets against the active workflow structure.\n3. Report exact paths and live-edit risks that should be resolved before any redeploy.'
    ;;
  homepage-audit)
    task_prompt=$'1. Audit homepage workflows for form routing, footer contact drift, and stale asset references.\n2. Compare current workspace files with read-only reference material where that helps explain drift.\n3. Report exact breakpoints that would hurt vibe-coded homepage automations or handoff clarity.'
    ;;
  verify-preflight)
    task_prompt=$'1. Check dirty-tree contamination and paths that should not be committed together.\n2. Check for missing checkpoints, missing backups, and likely deploy blockers around n8n-automation.\n3. Produce a go or no-go checklist with exact affected paths and next actions.'
    ;;
  implement)
    if [ -z "$extra_task" ]; then
      echo "implement preset requires extra task text." >&2
      usage
      exit 1
    fi
    task_prompt="$extra_task"
    ;;
  *)
    echo "Unknown preset: $preset" >&2
    usage
    exit 1
    ;;
esac

if [ $print_only -eq 1 ]; then
  printf '%s\n' "$task_prompt"
  exit 0
fi

cd "$REPO_ROOT"
exec bash "$OMX_RUN_SCRIPT" team "$lanes" "$task_prompt"
