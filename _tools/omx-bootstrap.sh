#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/omx-common.sh"

printf '== OMX Overlay Bootstrap ==\n'
omx_profile_prepare
omx_print_profile_summary

printf '\nNext commands:\n'
printf '  cd %s\n' "$OMX_REPO_ROOT"
printf '  bash _tools/omx-run.sh help\n'
printf '  bash _tools/omx-run.sh team 3:executor "offline-crm-v2 regression sweep"\n'
