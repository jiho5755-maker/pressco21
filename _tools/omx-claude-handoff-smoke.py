#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smoke-parse Claude narrative handoff markdown for OMX follow-up readiness."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List

SECTION_RE = re.compile(r'^##\s+(.*)$', re.MULTILINE)
BULLET_RE = re.compile(r'^-\s+(.*)$', re.MULTILINE)
NUMBERED_RE = re.compile(r'^\d+\.\s+(.*)$', re.MULTILINE)


def extract_sections(text: str) -> Dict[str, str]:
    matches = list(SECTION_RE.finditer(text))
    sections: Dict[str, str] = {}
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        title = m.group(1).strip()
        sections[title] = text[start:end].strip()
    return sections


def first_bullet(block: str) -> str:
    m = BULLET_RE.search(block or "")
    return m.group(1).strip() if m else ""


def bullets(block: str) -> List[str]:
    items = [m.group(1).strip() for m in BULLET_RE.finditer(block or "")]
    if items:
        return items
    return [m.group(1).strip() for m in NUMBERED_RE.finditer(block or "")]


def parse_handoff(path: Path) -> Dict[str, object]:
    text = path.read_text(encoding='utf-8')
    sections = extract_sections(text)
    summary = sections.get('한 줄 요약', '').splitlines()[0].strip() if sections.get('한 줄 요약') else ''
    omx_todo = bullets(sections.get('OMX가 이어서 할 일', ''))
    learnings = bullets(sections.get('Learn to Save', ''))
    xreview = 'Cross-Runtime Review 결과' in sections or 'Cross-Runtime 정렬 현황' in sections
    return {
        'file': str(path),
        'has_runtime_header': '> runtime:' in text,
        'has_summary_section': '한 줄 요약' in sections,
        'summary': summary,
        'has_omx_followup': 'OMX가 이어서 할 일' in sections,
        'omx_followup_count': len(omx_todo),
        'omx_followup': omx_todo,
        'has_cross_runtime': xreview,
        'has_learnings': 'Learn to Save' in sections,
        'learn_to_save_count': len(learnings),
        'learn_to_save': learnings,
        'line_count': len(text.splitlines()),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('paths', nargs='+')
    args = ap.parse_args()
    results = [parse_handoff(Path(p)) for p in args.paths]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    # smoke success if all have runtime header, summary, omx followup, cross-runtime context
    ok = all(r['has_runtime_header'] and r['has_summary_section'] and r['has_omx_followup'] and r['has_cross_runtime'] for r in results)
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
