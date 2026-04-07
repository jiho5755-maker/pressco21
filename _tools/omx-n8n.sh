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

base_prompt=$'Workspace rules:\n- Current working repo is /Users/jangjiho/workspace/pressco21.\n- Treat /Users/jangjiho/Desktop/n8n-main as a read-only reference library.\n- Do not modify Desktop/n8n-main.\n- Keep changes path-scoped to pressco21/n8n-automation, docs, and helper scripts unless the task explicitly widens scope.\n- Respect existing AGENTS.md, AI_SYNC.md, and Codex close-out helpers.\n- Prefer exact file-path findings, regression risks, and validation steps over general advice.\n'

case "$preset" in
  migration-check)
    task_prompt=$'Task:\nCompare /Users/jangjiho/Desktop/n8n-main/pressco21 against /Users/jangjiho/workspace/pressco21/n8n-automation.\nFocus on workflow JSON, supporting docs, and helper scripts.\nClassify findings into migrated, drifted, and missing.\nCall out exact paths that still need manual migration or should stay reference-only.\nDo not make destructive changes. Produce a migration checklist first.'
    ;;
  accounting-audit)
    task_prompt=$'Task:\nAudit pressco21/n8n-automation/workflows/accounting for parser, ledger, alerting, and replay regression risks.\nLook for node wiring mistakes, shared-code drift, missing fixtures, and deploy-safety gaps.\nPrefer concrete file-level findings and suggested tests.'
    ;;
  govt-support-audit)
    task_prompt=$'Task:\nAudit pressco21/n8n-automation/workflows/govt-support for migration drift, broken references, and workflow boundary issues.\nCheck whether related docs and helper assets inside workspace still match the active workflow structure.\nPrefer findings that reduce live-edit risk before any redeploy.'
    ;;
  homepage-audit)
    task_prompt=$'Task:\nAudit pressco21/n8n-automation/workflows/homepage for form-routing, footer/contact drift, and stale asset references.\nCompare current workspace structure against read-only reference material when useful.\nHighlight anything that would break vibe-coded homepage automations or handoff clarity.'
    ;;
  verify-preflight)
    task_prompt=$'Task:\nRun a preflight-style review for pending n8n-automation work.\nLook for dirty-tree contamination, missing backups, likely deploy blockers, and paths that should not be committed together.\nReturn a go/no-go style checklist with exact affected paths.'
    ;;
  implement)
    if [ -z "$extra_task" ]; then
      echo "implement preset requires extra task text." >&2
      usage
      exit 1
    fi
    task_prompt=$'Task:\nImplement the requested n8n-automation change inside pressco21.\nKeep Desktop/n8n-main read-only, preserve path-scoped commits, and include the validation plan.\nRequested change: '"$extra_task"
    ;;
  *)
    echo "Unknown preset: $preset" >&2
    usage
    exit 1
    ;;
esac

full_prompt="$base_prompt
$task_prompt"

if [ $print_only -eq 1 ]; then
  printf '%s\n' "$full_prompt"
  exit 0
fi

cd "$REPO_ROOT"
exec bash "$OMX_RUN_SCRIPT" team "$lanes" "$full_prompt"
