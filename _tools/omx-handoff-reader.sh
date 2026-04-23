#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROSTER_PATH="$REPO_ROOT/docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml"
DEFAULT_INPUT="$REPO_ROOT/team/handoffs/latest.md"
CLAUDE_LATEST_INPUT="$HOME/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/team/handoffs/latest.md"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-handoff-reader.sh
  bash _tools/omx-handoff-reader.sh --input <handoff.md>

Behavior:
  - Reads YAML frontmatter from a handoff markdown file
  - Resolves owner_agent_id to canonical display_name using agents.v1.yaml
  - Prints one compact continuity line for session-start review
USAGE
}

INPUT="$DEFAULT_INPUT"

case "${1:-}" in
  --input)
    INPUT="${2:-}"
    ;;
  -h|--help|"")
    if [ "${1:-}" = "" ]; then
      :
    else
      usage
      exit 0
    fi
    ;;
  *)
    echo "Unknown argument: ${1:-}" >&2
    usage
    exit 1
    ;;
esac

if [ ! -f "$INPUT" ] && [ "$INPUT" = "$DEFAULT_INPUT" ] && [ -f "$CLAUDE_LATEST_INPUT" ]; then
  INPUT="$CLAUDE_LATEST_INPUT"
fi

if [ ! -f "$INPUT" ]; then
  echo "Handoff file not found: $INPUT" >&2
  exit 1
fi

python3 - "$INPUT" "$ROSTER_PATH" <<'PY'
from __future__ import annotations

import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict

import yaml

handoff_path = Path(sys.argv[1])
roster_path = Path(sys.argv[2])


def parse_frontmatter(text: str) -> Dict[str, Any]:
    if not text.startswith("---\n"):
        return {}
    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        return {}
    return yaml.safe_load(parts[0][4:]) or {}


def load_roster(path: Path) -> Dict[str, Dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    roster: Dict[str, Dict[str, Any]] = {}
    for section in ("agents", "pseudo_agents"):
        for item in data.get(section, []):
            roster[item["agent_id"]] = item
    return roster


def collapse_text(value: Any, fallback: str) -> str:
    if value is None:
        return fallback
    if isinstance(value, list):
        raw = value[0] if value else ""
    else:
        raw = str(value)
    compact = re.sub(r"\s+", " ", raw).strip()
    if not compact:
        return fallback
    parts = re.split(r"(?<=[.!?])\s+", compact, maxsplit=1)
    compact = parts[0].strip() if parts else compact
    if len(compact) > 90:
        compact = compact[:87].rstrip() + "..."
    return compact


TITLE_MAP = {
    "Chief Strategy Officer": "CSO",
    "Chief Financial Officer": "CFO",
    "Chief Marketing Officer": "CMO",
    "Chief Operating Officer": "COO",
    "Chief Technology Officer": "CTO",
    "Project Manager": "PM",
    "Legal & Labor Advisor": "법무고문",
    "HR Coach": "HR코치",
    "Pair Coder": "페어코더",
}


def resolve_title(item: Dict[str, Any], display_name: str) -> str:
    full_name = str(item.get("full_name", "")).strip()
    base_name = display_name.replace("님", "")
    if full_name.startswith(base_name):
        remainder = full_name[len(base_name):].strip()
        if remainder:
            return remainder
    title = str(item.get("title", "")).strip()
    return TITLE_MAP.get(title, title)


def format_age(created_at: Any, fallback_path: Path) -> str:
    now = datetime.now(timezone.utc)
    created: datetime | None = None
    if isinstance(created_at, datetime):
        created = created_at
    elif created_at:
        normalized = str(created_at).replace("Z", "+00:00")
        try:
            created = datetime.fromisoformat(normalized)
        except ValueError:
            created = None
    if created is None:
        created = datetime.fromtimestamp(fallback_path.stat().st_mtime, tz=timezone.utc)

    delta = now - created.astimezone(timezone.utc)
    if delta < timedelta(minutes=1):
        return "방금 전"
    if delta < timedelta(hours=1):
        return f"{int(delta.total_seconds() // 60)}분 전"
    if delta < timedelta(days=1):
        return f"{int(delta.total_seconds() // 3600)}시간 전"
    return f"{delta.days}일 전"


frontmatter = parse_frontmatter(handoff_path.read_text(encoding="utf-8"))
roster = load_roster(roster_path)

owner_agent_id = str(frontmatter.get("owner_agent_id", "")).strip()
owner_item = roster.get(owner_agent_id, {})
display_name = str(owner_item.get("display_name", owner_agent_id or "담당 미정")).strip()
title = resolve_title(owner_item, display_name) if owner_item else ""

summary = collapse_text(frontmatter.get("summary"), "요약이 아직 정리되지 않았습니다.")
next_step = collapse_text(frontmatter.get("next_step"), "다음 단계가 아직 정리되지 않았습니다.")
open_risks = collapse_text(frontmatter.get("open_risks"), "남은 리스크 정리가 아직 없습니다.")

if next_step == "다음 단계가 아직 정리되지 않았습니다." and open_risks:
    next_step = open_risks

age = format_age(frontmatter.get("created_at"), handoff_path)
title_suffix = f"({title})" if title else ""
print(f"[{age}] {display_name}{title_suffix}: {summary} → 이어서: {next_step}")
PY
