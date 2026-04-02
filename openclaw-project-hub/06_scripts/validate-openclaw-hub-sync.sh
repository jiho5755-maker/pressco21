#!/usr/bin/env bash
set -euo pipefail

SERVER_ROOT="${SERVER_ROOT:-/home/ubuntu/.openclaw/workspace-flora-frontdoor}"
MACBOOK_ALIAS="${MACBOOK_ALIAS:-macbook}"
MACBOOK_ROOT="${MACBOOK_ROOT:-/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs}"

PAIRS=(
  "company-db-decision-guide.ko.md:company-db-decision-guide.md"
  "company-integrated-os-architecture.ko.md:company-integrated-os-architecture.md"
  "openclaw-project-hub-canonical-policy.ko.md:openclaw-project-hub-canonical-policy.md"
  "agent-common-reference-rules.ko.md:agent-common-reference-rules.md"
)

status=0

for pair in "${PAIRS[@]}"; do
  src="${pair%%:*}"
  dst="${pair##*:}"

  mac_sum=$(ssh "$MACBOOK_ALIAS" "sha256sum '$MACBOOK_ROOT/$src' | awk '{print \$1}'") || status=1
  srv_sum=$(sha256sum "$SERVER_ROOT/$dst" | awk '{print $1}') || status=1

  echo "$src"
  echo "  macbook: $mac_sum"
  echo "  server : $srv_sum"

  if [[ "$mac_sum" != "$srv_sum" ]]; then
    echo "  result : MISMATCH"
    status=1
  else
    echo "  result : OK"
  fi
  echo

done

exit $status
