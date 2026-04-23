#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render founder-facing markdown from OMX-side structured output.

Usage:
  python3 _tools/omx-founder-facing-render.py --input path/to/input.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
ROSTER_PATH = REPO_ROOT / "docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml"


def load_roster() -> Dict[str, Dict[str, Any]]:
    data = yaml.safe_load(ROSTER_PATH.read_text(encoding="utf-8"))
    roster: Dict[str, Dict[str, Any]] = {}
    for item in data.get("agents", []):
        roster[item["agent_id"]] = item
    for item in data.get("pseudo_agents", []):
        roster[item["agent_id"]] = item
    return roster


def display_name(roster: Dict[str, Dict[str, Any]], agent_id: str) -> str:
    item = roster.get(agent_id)
    if not item:
        return agent_id
    return item.get("display_name") or item.get("full_name") or agent_id


def bullet_list(items: List[str]) -> str:
    if not items:
        return "- (없음)"
    return "\n".join(f"- {item}" for item in items)


def render_team_meeting(roster: Dict[str, Dict[str, Any]], payload: Dict[str, Any]) -> str:
    lines = ["## 팀 회의 종합", "", "### 결론", bullet_list([payload.get("summary", "(요약 없음)")]), ""]
    findings = payload.get("findings") or []
    if findings:
        for finding in findings[:3]:
            agent = display_name(roster, finding.get("agent_id", payload.get("owner_agent_id", "team-meeting")))
            heading = finding.get("heading") or f"{agent} 관점"
            text = finding.get("text") or "(내용 없음)"
            lines.extend([f"### {heading}", f"- {text}", ""])
    else:
        owner = display_name(roster, payload.get("owner_agent_id", "team-meeting"))
        lines.extend([f"### {owner} 종합", f"- {payload.get('summary', '(요약 없음)')}", ""])
    lines.extend(["### 다음 단계", bullet_list(payload.get("next_steps") or [])])
    return "\n".join(lines).strip() + "\n"


def render_verification(roster: Dict[str, Dict[str, Any]], payload: Dict[str, Any]) -> str:
    owner = display_name(roster, payload.get("owner_agent_id", "choi-minseok-cto"))
    lines = [f"## {owner} 검증 메모", "", "### 결론", bullet_list([payload.get("summary", "(결론 없음)")]), "", "### 확인한 것", bullet_list(payload.get("verification") or payload.get("findings") or []), "", "### 남은 리스크", bullet_list(payload.get("risks") or []), "", "### 다음 단계", bullet_list(payload.get("next_steps") or [])]
    return "\n".join(lines).strip() + "\n"


def render_handoff(roster: Dict[str, Dict[str, Any]], payload: Dict[str, Any]) -> str:
    owner = display_name(roster, payload.get("owner_agent_id", "unknown"))
    contributors = [display_name(roster, cid) for cid in payload.get("contributors") or []]
    lines = ["## OMX 실행실 handoff", "", f"- 담당: {owner}", f"- 참여: {', '.join(contributors) if contributors else '(없음)'}", f"- 요약: {payload.get('summary', '(요약 없음)')}", f"- 확인: {('; '.join(payload.get('verification') or [])) if (payload.get('verification') or []) else '(없음)'}", f"- 리스크: {('; '.join(payload.get('risks') or [])) if (payload.get('risks') or []) else '(없음)'}", f"- 다음: {('; '.join(payload.get('next_steps') or [])) if (payload.get('next_steps') or []) else '(없음)'}"]
    return "\n".join(lines).strip() + "\n"


def render_execution_report(roster: Dict[str, Dict[str, Any]], payload: Dict[str, Any]) -> str:
    owner = display_name(roster, payload.get("owner_agent_id", "yoo-junho-paircoder"))
    lines = [f"## {owner} 실행 보고", "", "### 무엇을 했는가", bullet_list([payload.get("summary", "(요약 없음)")]), "", "### 확인한 것", bullet_list(payload.get("verification") or []), "", "### 남은 위험", bullet_list(payload.get("risks") or []), "", "### 다음 행동", bullet_list(payload.get("next_steps") or [])]
    return "\n".join(lines).strip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to structured input JSON")
    args = parser.parse_args()

    roster = load_roster()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    context_type = payload.get("context_type")

    if context_type == "team_meeting":
        out = render_team_meeting(roster, payload)
    elif context_type == "verification":
        out = render_verification(roster, payload)
    elif context_type == "handoff":
        out = render_handoff(roster, payload)
    elif context_type == "execution_report":
        out = render_execution_report(roster, payload)
    else:
        raise SystemExit(f"Unsupported context_type: {context_type}")

    print(out, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
