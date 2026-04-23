#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Normalize OMX-side structured payloads into the canonical renderer input model.

This helper is intentionally adapter-local. It does not modify shared-kernel contracts.
It allows future live call sites to pass slightly different field names while still reusing
one founder-facing renderer.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


ALIASES = {
    "type": "context_type",
    "kind": "context_type",
    "owner": "owner_agent_id",
    "owner_id": "owner_agent_id",
    "participants": "contributors",
    "participant_ids": "contributors",
    "next": "next_steps",
    "next_step": "next_steps",
    "risk": "risks",
    "open_risk": "risks",
    "checks": "verification",
    "evidence": "verification",
    "details": "findings",
    "items": "findings",
}


DEFAULTS = {
    "team_meeting": {"owner_agent_id": "han-jihoon-cso", "contributors": []},
    "verification": {"owner_agent_id": "choi-minseok-cto", "contributors": []},
    "handoff": {"owner_agent_id": "yoo-junho-paircoder", "contributors": []},
    "execution_report": {"owner_agent_id": "yoo-junho-paircoder", "contributors": []},
}


def ensure_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize(payload: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in payload.items():
        target = ALIASES.get(key, key)
        out[target] = value

    context_type = out.get("context_type")
    if not context_type:
        raise ValueError("context_type is required (or alias type/kind)")

    # defaults per context
    for k, v in DEFAULTS.get(context_type, {}).items():
        out.setdefault(k, v)

    # normalize list-like fields
    for k in ["contributors", "verification", "risks", "next_steps"]:
        out[k] = ensure_list(out.get(k))

    # findings normalization
    findings = out.get("findings")
    if findings is None:
        out["findings"] = []
    elif isinstance(findings, list):
        normalized = []
        for item in findings:
            if isinstance(item, str):
                normalized.append({"text": item})
            else:
                normalized.append(item)
        out["findings"] = normalized
    else:
        out["findings"] = [{"text": str(findings)}]

    # summary is required-ish for useful founder-facing output
    out.setdefault("summary", "(요약 없음)")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Path to source JSON")
    args = ap.parse_args()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    print(json.dumps(normalize(payload), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
