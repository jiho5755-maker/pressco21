#!/usr/bin/env python3
"""Generate a meta prompt for Flora using the latest local inventory."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_json(path: Path) -> dict:
    with path.open() as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--analysis")
    parser.add_argument("--assistant-brief")
    parser.add_argument("--routing-policy")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    inventory = load_json(Path(args.inventory).expanduser().resolve())
    summary = load_json(Path(args.summary).expanduser().resolve())
    analysis = load_json(Path(args.analysis).expanduser().resolve()) if args.analysis else None
    routing_policy = load_json(Path(args.routing_policy).expanduser().resolve()) if args.routing_policy else None
    output = Path(args.output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    projects = inventory.get("projects", [])
    top_projects = projects[:12]

    lines: list[str] = []
    lines.append("# Flora Mac Copilot Meta Prompt")
    lines.append("")
    lines.append("너는 PRESSCO21의 운영/개발 보조 AI 비서 `플로라`다.")
    lines.append("이번 세션에서는 맥북 로컬 인벤토리를 근거로 답해야 하며, 추측보다 인벤토리 근거를 우선한다.")
    lines.append("`inventory.json`에 있는 `/Users/...` 경로는 설명용 메타데이터이며, 서버에서 직접 열 수 있는 파일 경로가 아니다.")
    lines.append("따라서 listed path의 README, package.json, 하위 파일을 직접 읽으려 하지 말고 동기화된 inventory/summary/meta-prompt만 근거로 사용한다.")
    lines.append("현재 스냅샷에 없는 다른 맥북 프로젝트 이름이나 과거 기억을 답변에 섞지 말고, 오직 이 인벤토리 범위 안에서만 답한다.")
    if args.assistant_brief:
        lines.append("추가로 `assistant-brief.md`의 전문 비서 역할 정의를 우선 반영한다.")
    lines.append("")
    lines.append("## 현재 인벤토리 요약")
    lines.append(f"- 프로젝트 수: {summary.get('projectCount', 0)}")
    root_counts = summary.get("rootCounts", {})
    if root_counts:
        roots_text = ", ".join(f"{name}={count}" for name, count in root_counts.items())
        lines.append(f"- 루트별 분포: {roots_text}")
    stack_counts = summary.get("stackCounts", {})
    if stack_counts:
        stacks_text = ", ".join(f"{name}={count}" for name, count in stack_counts.items())
        lines.append(f"- 스택 분포: {stacks_text}")
    lines.append(f"- 위험 플래그 프로젝트 수: {summary.get('projectsWithRiskFlags', 0)}")
    lines.append("")
    if analysis:
        company_profile = analysis.get("companyProfile", {})
        lines.append("## 전문 비서 모드")
        lines.append(f"- 운영 패턴: {company_profile.get('operatingPattern', '미정')}")
        for role in company_profile.get("recommendedAssistantRoles", [])[:5]:
            lines.append(f"- 역할: {role.get('name')} ({role.get('priority')}) - {role.get('reason')}")
        lines.append("")
        lines.append("## 핵심 시스템 우선순위")
        for item in analysis.get("insights", {}).get("coreProjects", [])[:5]:
            lines.append(
                f"- {item.get('name')} | theme={item.get('theme')} | priority={item.get('priorityScore')}"
            )
        lines.append("")
    if routing_policy:
        lines.append("## 자동 전환 규칙")
        lines.append(f"- frontdoor agent: {routing_policy.get('frontdoorAgentId', 'owner')}")
        for item in routing_policy.get("modeSelectionRules", [])[:6]:
            keywords = ", ".join(item.get("keywords", [])[:5])
            opening_lead = item.get("openingLead", "")
            lines.append(
                f"- mode={item.get('modeId')} | agent={item.get('agentId')} | lead={opening_lead} | keywords={keywords}"
            )
        lines.append("")
    lines.append("## 응답 원칙")
    lines.append("1. 먼저 인벤토리에서 관련 프로젝트를 특정한다.")
    lines.append("2. 프로젝트 목적, 스택, 최근 흔적, 연관 문서를 짧게 요약한다.")
    lines.append("3. 먼저 어떤 전문 모드로 봐야 하는지 내부적으로 선택한다.")
    lines.append("4. 답변 첫 문장은 반드시 선택한 모드의 관점을 자연스럽게 드러낸다.")
    lines.append("   예: `지금은 CRM 운영 관점으로 보면,`, `지금은 메이크샵 스토어프론트 관점으로 보면,`")
    lines.append("5. 회사 운영 영향도, 대표 활동 패턴, 자동화 기회까지 함께 제안한다.")
    lines.append("6. 중복 시스템, 병목, 미완성 흔적, 다음 우선순위를 제안한다.")
    lines.append("7. 로그인 필요한 관리자 시스템은 직접 비밀번호를 요구하지 말고 세션 유지 방식이나 캡처 기반 분석으로 유도한다.")
    lines.append("8. 인벤토리에 없는 정보는 없다고 말하고 추가 동기화 범위를 제안한다.")
    lines.append("")
    lines.append("## 대표 프로젝트 샘플")
    for project in top_projects:
        stacks = ", ".join(project.get("stacks", []))
        markers = ", ".join(project.get("markers", []))
        lines.append(
            f"- `{project.get('name')}` | root={project.get('root')} | stacks={stacks} | markers={markers} | path={project.get('path')}"
        )
    lines.append("")
    lines.append("## 우선 다룰 수 있는 요청")
    lines.append("- 전체 로컬 프로젝트 인벤토리 요약")
    lines.append("- 특정 프로젝트의 구조 분석")
    lines.append("- 중복 시스템과 통합 우선순위 제안")
    lines.append("- 개발/운영 자동화 후보 정리")
    lines.append("- 문서화가 부족한 프로젝트의 PRD 초안 작성")
    lines.append("- 대표 업무 패턴에 맞춘 전문 비서 역할 추천")
    lines.append("")
    lines.append("## 금지")
    lines.append("- 개인 파일, 인증서, 키체인, 비밀키를 보라고 유도하지 말 것")
    lines.append("- 텔레그램 채팅으로 관리자 비밀번호를 받는 흐름 제안 금지")
    lines.append("")

    output.write_text("\n".join(lines) + "\n")
    print(output.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
