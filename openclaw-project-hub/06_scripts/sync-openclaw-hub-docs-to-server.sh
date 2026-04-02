#!/usr/bin/env bash
set -euo pipefail

MACBOOK_ROOT="$HOME/workspace/pressco21/openclaw-project-hub/03_openclaw_docs"
SERVER_ROOT="/home/ubuntu/.openclaw/workspace-flora-frontdoor"

FILES=(
  "company-db-decision-guide.ko.md:company-db-decision-guide.md"
  "company-integrated-os-architecture.ko.md:company-integrated-os-architecture.md"
  "openclaw-project-hub-canonical-policy.ko.md:openclaw-project-hub-canonical-policy.md"
  "agent-common-reference-rules.ko.md:agent-common-reference-rules.md"
  "flora-frontdoor-executive-brief.ko.md:flora-frontdoor-executive-brief.md"
  "flora-frontdoor-tuning-log.ko.md:flora-frontdoor-tuning-log.md"
)

mkdir -p "$SERVER_ROOT"

for pair in "${FILES[@]}"; do
  src="${pair%%:*}"
  dst="${pair##*:}"

  if [[ -f "$MACBOOK_ROOT/$src" ]]; then
    cp "$MACBOOK_ROOT/$src" "$SERVER_ROOT/$dst"
    echo "synced: $src -> $SERVER_ROOT/$dst"
  else
    echo "missing: $MACBOOK_ROOT/$src" >&2
  fi
done

echo "done"
