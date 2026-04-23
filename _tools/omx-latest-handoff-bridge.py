#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Read a handoff frontmatter markdown file and render a founder-facing summary.

This is an adapter-local bridge. It does NOT change the shared-kernel contract.
It normalizes known Claude/Codex adapter-local identifiers into canonical agent ids
before rendering with founder-facing wording.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
ROSTER_PATH = REPO_ROOT / "docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml"

ADAPTER_AGENT_MAP = {
    # Claude C-suite ids/files
    "chief-strategy-officer": "han-jihoon-cso",
    "chief-financial-officer": "park-seoyeon-cfo",
    "chief-marketing-officer": "jung-yuna-cmo",
    "chief-operating-officer": "kim-dohyun-coo",
    "chief-technology-officer": "choi-minseok-cto",
    "project-manager": "yoon-haneul-pm",
    "compliance-advisor": "cho-hyunwoo-legal",
    "hr-coach": "kang-yerin-hr",
    "staff-development-coach": "kang-yerin-hr",
    "vibe-coder-buddy": "yoo-junho-paircoder",
    "pair-coder": "yoo-junho-paircoder",
    # Known noisy labels
    "chief-operating-officer general-purpose": "kim-dohyun-coo",
    "Explore": "unknown",
    "explore": "unknown",
}


def load_roster() -> Dict[str, Dict[str, Any]]:
    data = yaml.safe_load(ROSTER_PATH.read_text(encoding="utf-8"))
    roster: Dict[str, Dict[str, Any]] = {}
    for item in data.get("agents", []):
        roster[item["agent_id"]] = item
    for item in data.get("pseudo_agents", []):
        roster[item["agent_id"]] = item
    return roster


def normalize_agent_id(raw: str) -> Tuple[str, bool]:
    raw = (raw or "").strip()
    if not raw:
        return "unknown", False
    if raw in ADAPTER_AGENT_MAP:
        val = ADAPTER_AGENT_MAP[raw]
        return val, val != raw
    return raw, False


def display_name(roster: Dict[str, Dict[str, Any]], agent_id: str) -> str:
    if agent_id == "unknown":
        return "세션 owner 미정"
    item = roster.get(agent_id)
    if not item:
        return agent_id
    return item.get("display_name") or item.get("full_name") or agent_id


def parse_frontmatter(text: str) -> Dict[str, Any]:
    if not text.startswith("---\n"):
        return {}
    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        return {}
    fm = parts[0][4:]
    return yaml.safe_load(fm) or {}


def stringify_value(value: Any) -> str:
    if isinstance(value, dict):
        if len(value) == 1:
            key, val = next(iter(value.items()))
            return f"{key}: {val}".strip()
        return "; ".join(f"{key}: {val}" for key, val in value.items()).strip()
    return str(value).strip()


def parse_people_list(raw: Any) -> List[str]:
    if isinstance(raw, list):
        return [stringify_value(x) for x in raw if stringify_value(x)]
    if isinstance(raw, str):
        s = raw.strip().strip('[]')
        if not s:
            return []
        return [x.strip() for x in re.split(r',\s*', s) if x.strip()]
    return []


def parse_text_list(raw: Any) -> List[str]:
    if isinstance(raw, list):
        return [stringify_value(x) for x in raw if stringify_value(x)]
    if isinstance(raw, str):
        value = raw.strip()
        return [value] if value else []
    if raw is None:
        return []
    value = stringify_value(raw)
    return [value] if value else []


def build_founder_summary(roster: Dict[str, Dict[str, Any]], fm: Dict[str, Any], source_path: Path) -> str:
    runtime = str(fm.get("runtime", "unknown")).strip()
    owner_raw = str(fm.get("owner_agent_id", "")).strip()
    owner_id, owner_was_mapped = normalize_agent_id(owner_raw)
    owner_disp = display_name(roster, owner_id)

    contrib_raw = parse_people_list(fm.get("contributors", []))
    norm_contrib = []
    mapped_any = False
    for c in contrib_raw:
        norm, mapped = normalize_agent_id(c)
        norm_contrib.append(display_name(roster, norm))
        mapped_any = mapped_any or mapped

    summary = str(fm.get("summary", "")).strip()
    next_step = str(fm.get("next_step", "")).strip()
    open_risks = parse_text_list(fm.get("open_risks", []))
    learn = parse_people_list(fm.get("learn_to_save", []))
    verification = parse_people_list(fm.get("verification", []))

    def clean_placeholder(v: str) -> str:
        if not v or v.startswith("(미정") or v.startswith("(자동 생성"):
            return "(아직 founder-facing handoff가 확정되지 않았습니다. Claude에서 /save를 한 번 더 실행하면 좋아집니다.)"
        return v

    summary = clean_placeholder(summary)
    next_step = clean_placeholder(next_step)
    open_risks = [clean_placeholder(v) for v in open_risks]
    if not open_risks:
        open_risks = [clean_placeholder("")]
    if not verification:
        verification = ["(아직 검증 메모가 확정되지 않았습니다.)"]
    if not learn:
        learn = ["(현재 승격 후보 없음 또는 /save 미실행 상태)"]

    runtime_label = "실행실에서 진행된 작업입니다" if runtime == "codex-omx" else "회의실에서 정리된 작업입니다" if runtime == "claude" else "다른 작업실에서 온 작업입니다"

    lines = [
        "## 세션 연속성 브리핑",
        "",
        f"- 담당: {owner_disp}",
        f"- 참여: {', '.join(norm_contrib) if norm_contrib else '(없음)'}",
        f"- 작업실: {runtime_label}",
        "",
        "### 요약",
        f"- {summary}",
        "",
        "### 다음",
        f"- {next_step}",
        "",
        "### 리스크",
        *[f"- {v}" for v in open_risks],
        "",
        "### 확인",
        *[f"- {v}" for v in verification],
        "",
        "### 승격 후보",
        *[f"- {v}" for v in learn],
    ]

    notes = []
    if owner_id == "unknown":
        notes.append("owner_agent_id가 canonical roster로 정규화되지 못했습니다")
    if owner_was_mapped or mapped_any:
        notes.append("adapter-local id를 canonical roster 이름으로 정규화했습니다")
    if notes:
        lines.extend(["", "### 주의", *[f"- {n}" for n in notes]])
    lines.extend(["", f"<!-- source: {source_path} -->"])
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--json", action="store_true", help="print parsed frontmatter json instead of rendered markdown")
    args = ap.parse_args()
    source = Path(args.input)
    text = source.read_text(encoding="utf-8")
    fm = parse_frontmatter(text)
    if args.json:
        print(json.dumps(fm, ensure_ascii=False, indent=2, default=str))
        return 0
    roster = load_roster()
    print(build_founder_summary(roster, fm, source), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
