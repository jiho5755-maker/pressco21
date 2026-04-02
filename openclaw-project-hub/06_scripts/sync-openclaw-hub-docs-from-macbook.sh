#!/usr/bin/env bash
set -euo pipefail

REMOTE_ALIAS="${REMOTE_ALIAS:-macbook}"
REMOTE_ROOT="${REMOTE_ROOT:-~/workspace/pressco21/openclaw-project-hub/03_openclaw_docs}"
LOCAL_ROOT="${LOCAL_ROOT:-/home/ubuntu/.openclaw/workspace-flora-frontdoor}"

FILES=(
  "company-db-decision-guide.ko.md:company-db-decision-guide.md"
  "company-integrated-os-architecture.ko.md:company-integrated-os-architecture.md"
  "openclaw-project-hub-canonical-policy.ko.md:openclaw-project-hub-canonical-policy.md"
  "agent-common-reference-rules.ko.md:agent-common-reference-rules.md"
)

mkdir -p "$LOCAL_ROOT"

for pair in "${FILES[@]}"; do
  src="${pair%%:*}"
  dst="${pair##*:}"
  echo "pulling: $REMOTE_ALIAS:$REMOTE_ROOT/$src -> $LOCAL_ROOT/$dst"
  scp "$REMOTE_ALIAS:$REMOTE_ROOT/$src" "$LOCAL_ROOT/$dst"
done

echo "done"
