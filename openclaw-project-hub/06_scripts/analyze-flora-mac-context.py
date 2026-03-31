#!/usr/bin/env python3
"""Analyze Flora Mac inventory and synthesize an assistant profile."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


THEME_RULES = [
    (
        "company-knowledge",
        [
            "financials",
            "history",
            "knowledge",
            "staff-profiles",
            "company-knowledge",
            "ceo",
            "ax-strategy",
        ],
    ),
    (
        "partnerclass-platform",
        [
            "partnerclass",
            "파트너클래스",
            "협회",
            "파트너신청",
            "강의",
            "brand-strategy",
            "roadmap",
            "wf-action-map",
        ],
    ),
    (
        "makeshop-storefront",
        [
            "makeshop",
            "shopdetail",
            "main.js",
            "main.css",
            "basket",
            "order_pay",
            "shopbrand",
            "partner-map",
        ],
    ),
    (
        "crm-operations",
        [
            "crm",
            "invoice",
            "invoices",
            "customer",
            "receivable",
            "payable",
            "print.ts",
        ],
    ),
    (
        "automation",
        [
            "n8n",
            "workflow",
            "deploy.sh",
            "webhook",
            "automation",
            "_tools",
            "docker-compose",
            "set-error-workflow",
        ],
    ),
    (
        "openclaw-ops",
        [
            "openclaw",
            "flora",
            "claw",
            "skill",
            "copilot",
            "workspace-owner",
            "meta-prompt",
        ],
    ),
    (
        "documentation",
        [
            "prd",
            "roadmap",
            "guide",
            "spec",
            "handoff",
            "proposal",
        ],
    ),
]

THEME_PRIORITY = {
    "crm-operations": 95,
    "makeshop-storefront": 93,
    "partnerclass-platform": 92,
    "automation": 91,
    "openclaw-ops": 89,
    "company-knowledge": 84,
    "documentation": 72,
    "general": 60,
}

THEME_LABELS = {
    "crm-operations": "내부 CRM 운영",
    "makeshop-storefront": "메이크샵 스토어프론트",
    "partnerclass-platform": "파트너클래스 플랫폼",
    "automation": "n8n 운영 자동화",
    "openclaw-ops": "OpenClaw/플로라 운영",
    "company-knowledge": "회사 지식 허브",
    "documentation": "기획/문서화",
    "general": "일반 작업공간",
}

ROLE_RULES = {
    "crm-operations": {
        "name": "운영 CRM 코파일럿",
        "priority": "high",
        "reason": "거래, 명세표, 수금/지급 흐름과 직접 연결된 내부툴을 빠르게 분석하고 개선해야 한다.",
    },
    "makeshop-storefront": {
        "name": "메이크샵 프론트엔드 비서",
        "priority": "high",
        "reason": "실매출과 직접 연결되는 스토어프론트 변경과 상세페이지 운영을 빠르게 지원해야 한다.",
    },
    "partnerclass-platform": {
        "name": "파트너클래스 제품 전략 비서",
        "priority": "high",
        "reason": "플랫폼/문서/운영 화면이 흩어져 있어 제품 방향과 실행 우선순위를 같이 정리해야 한다.",
    },
    "automation": {
        "name": "n8n 자동화 설계 비서",
        "priority": "high",
        "reason": "운영 자동화와 워크플로우 배포가 여러 프로젝트를 관통하므로 구조적 이해가 중요하다.",
    },
    "openclaw-ops": {
        "name": "플로라 업무 오케스트레이터",
        "priority": "high",
        "reason": "대표의 텔레그램 요청을 실제 회사 시스템과 연결하는 중심 하네스 역할이 필요하다.",
    },
    "company-knowledge": {
        "name": "회사 지식/전략 비서",
        "priority": "medium",
        "reason": "회사 히스토리, 전략, 재무 정보를 일관되게 끌어와 답변 품질을 높여야 한다.",
    },
}

RESPONSE_MODES = {
    "crm-operations": ["운영 이슈 진단", "인쇄/정산 흐름 점검", "배포 전 체크리스트"],
    "makeshop-storefront": ["UI 수정 제안", "메이크샵 제약 검토", "상세페이지 분석"],
    "partnerclass-platform": ["PRD 정리", "기능 우선순위 제안", "문서-구현 연결"],
    "automation": ["워크플로우 분해", "자동화 후보 발굴", "운영 리스크 경보"],
    "openclaw-ops": ["텔레그램 명령 설계", "코파일럿 운영정책", "에이전트 역할 분리"],
    "company-knowledge": ["회사 맥락 요약", "전략 일관성 검토", "대표 관점 의사결정 보조"],
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open() as handle:
        return json.load(handle)


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def combine_project_text(project: dict[str, Any]) -> str:
    parts: list[str] = [
        str(project.get("root", "")),
        str(project.get("name", "")),
        str(project.get("path", "")),
        " ".join(project.get("markers", [])),
        " ".join(project.get("topFiles", [])),
    ]
    for item in project.get("recentFiles", []):
        parts.append(str(item.get("path", "")))
    return " ".join(parts).lower()


def infer_themes(project: dict[str, Any]) -> list[str]:
    text = combine_project_text(project)
    detected: list[str] = []
    for theme, keywords in THEME_RULES:
        if any(keyword.lower() in text for keyword in keywords):
            detected.append(theme)
    return detected or ["general"]


def infer_activity(project: dict[str, Any]) -> tuple[str, int]:
    candidates = [parse_ts(project.get("modifiedAt"))]
    candidates.extend(parse_ts(item.get("modifiedAt")) for item in project.get("recentFiles", []))
    timestamps = [item for item in candidates if item]
    if not timestamps:
        return "unknown", 0

    newest = max(timestamps)
    delta_hours = (utcnow() - newest).total_seconds() / 3600
    if delta_hours <= 24:
        return "active-today", 14
    if delta_hours <= 24 * 7:
        return "active-week", 9
    if delta_hours <= 24 * 30:
        return "active-month", 5
    return "cooling-down", 1


def infer_stage(project: dict[str, Any]) -> str:
    text = combine_project_text(project)
    if "archive" in text or "bak" in text:
        return "archive-mixed"
    if project.get("recentFiles"):
        return "active"
    if project.get("markers"):
        return "maintained"
    return "unknown"


def infer_priority(project: dict[str, Any], themes: list[str], activity_bonus: int) -> int:
    base = max(THEME_PRIORITY.get(theme, THEME_PRIORITY["general"]) for theme in themes)
    risk_bonus = 4 if project.get("riskFlags") else 0
    return min(100, base + activity_bonus + risk_bonus)


def business_summary(project: dict[str, Any], primary_theme: str, activity_state: str) -> str:
    name = project.get("name", "unknown")
    theme_label = THEME_LABELS.get(primary_theme, THEME_LABELS["general"])
    activity_label = {
        "active-today": "오늘까지 변경 흔적이 있는",
        "active-week": "최근 일주일 내 흔적이 있는",
        "active-month": "최근 한 달 내 손댄",
        "cooling-down": "최근 활동이 줄어든",
        "unknown": "활동 신호가 약한",
    }[activity_state]
    return f"{name}는 {theme_label} 축으로 분류되는 프로젝트이며, {activity_label} 작업공간이다."


def recommended_tasks(themes: list[str]) -> list[str]:
    items: list[str] = []
    for theme in themes:
        items.extend(RESPONSE_MODES.get(theme, []))
    unique: list[str] = []
    for item in items:
        if item not in unique:
            unique.append(item)
    return unique[:6]


def build_project_analysis(project: dict[str, Any]) -> dict[str, Any]:
    themes = infer_themes(project)
    activity_state, activity_bonus = infer_activity(project)
    primary_theme = max(themes, key=lambda theme: THEME_PRIORITY.get(theme, 0))
    priority_score = infer_priority(project, themes, activity_bonus)
    return {
        "name": project.get("name"),
        "root": project.get("root"),
        "path": project.get("path"),
        "primaryTheme": primary_theme,
        "themes": themes,
        "themeLabels": [THEME_LABELS.get(theme, theme) for theme in themes],
        "activityState": activity_state,
        "stage": infer_stage(project),
        "priorityScore": priority_score,
        "riskFlags": project.get("riskFlags", []),
        "strategicLabel": (
            "core-system"
            if priority_score >= 92
            else "supporting-system"
            if priority_score >= 82
            else "knowledge-layer"
            if primary_theme in {"company-knowledge", "documentation"}
            else "reference-layer"
        ),
        "summary": business_summary(project, primary_theme, activity_state),
        "recommendedTasks": recommended_tasks(themes),
        "recentSignals": [item.get("path") for item in project.get("recentFiles", [])[:3]],
    }


def build_roles(projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    roles: list[dict[str, Any]] = []
    theme_counts = Counter(project["primaryTheme"] for project in projects)
    for theme, count in theme_counts.most_common():
        rule = ROLE_RULES.get(theme)
        if not rule or rule["name"] in seen:
            continue
        seen.add(rule["name"])
        roles.append(
            {
                "name": rule["name"],
                "priority": rule["priority"],
                "reason": rule["reason"],
                "projectCount": count,
                "responseModes": RESPONSE_MODES.get(theme, [])[:3],
            }
        )
    return roles


def build_insights(projects: list[dict[str, Any]]) -> dict[str, Any]:
    theme_counts = Counter()
    for project in projects:
        theme_counts.update(project["themes"])

    core_projects = [
        {"name": project["name"], "priorityScore": project["priorityScore"], "theme": project["primaryTheme"]}
        for project in sorted(projects, key=lambda item: item["priorityScore"], reverse=True)[:5]
    ]

    duplicate_themes = []
    for theme, count in theme_counts.items():
        if count >= 2:
            duplicate_themes.append(
                {
                    "theme": theme,
                    "label": THEME_LABELS.get(theme, theme),
                    "projectCount": count,
                }
            )

    recommendations: list[str] = []
    if theme_counts.get("partnerclass-platform", 0) and theme_counts.get("documentation", 0):
        recommendations.append("파트너클래스 구현 폴더와 문서 폴더를 함께 읽는 제품 전략 모드를 기본 응답 패턴으로 둔다.")
    if theme_counts.get("crm-operations", 0):
        recommendations.append("CRM 질문은 인쇄/정산/배포 리스크를 함께 체크하는 운영 점검형 응답을 기본으로 둔다.")
    if theme_counts.get("automation", 0):
        recommendations.append("자동화 관련 질문은 n8n 워크플로우, 배포 스크립트, 운영 경보를 묶어 설명하도록 유도한다.")
    if theme_counts.get("makeshop-storefront", 0):
        recommendations.append("메이크샵/프론트 질문은 D4 제약과 실운영 영향도를 먼저 말하는 응답으로 정렬한다.")
    if theme_counts.get("company-knowledge", 0):
        recommendations.append("회사/대표/전략 질문은 company-knowledge와 정책 문서를 우선 근거로 삼는다.")

    return {
        "coreProjects": core_projects,
        "duplicateThemes": duplicate_themes,
        "recommendations": recommendations,
    }


def build_company_profile(projects: list[dict[str, Any]]) -> dict[str, Any]:
    theme_counts = Counter(project["primaryTheme"] for project in projects)
    focus_areas = [
        {
            "theme": theme,
            "label": THEME_LABELS.get(theme, theme),
            "projectCount": count,
        }
        for theme, count in theme_counts.most_common()
    ]
    return {
        "operatingPattern": "PRESSCO21는 이커머스 운영, 내부 CRM, 파트너클래스 플랫폼, n8n 자동화, OpenClaw 업무 하네스가 함께 돌아가는 구조다.",
        "focusAreas": focus_areas,
        "recommendedAssistantRoles": build_roles(projects),
        "defaultWorkingStyle": [
            "먼저 회사 운영 영향도가 높은 시스템을 식별한다.",
            "문서와 구현이 함께 있는 경우 문서 의도와 실제 최근 변경 흔적을 같이 요약한다.",
            "실운영 질문은 우선순위, 리스크, 다음 액션을 항상 함께 제안한다.",
            "대표의 활동 패턴은 전략 문서화와 운영 자동화, 메이크샵 수정, CRM 점검이 교차하는 형태로 본다.",
        ],
    }


def render_brief(analysis: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Flora Specialist Assistant Brief")
    lines.append("")
    lines.append("## 목적")
    lines.append("플로라를 단순 텔레그램 응답기가 아니라 PRESSCO21 운영과 대표 활동 패턴에 맞춘 전문 비서로 동작시키기 위한 요약 브리프다.")
    lines.append("")
    profile = analysis["companyProfile"]
    lines.append("## 회사 운영 패턴")
    lines.append(f"- {profile['operatingPattern']}")
    lines.append("")
    lines.append("## 우선 전문 역할")
    for role in profile["recommendedAssistantRoles"]:
        lines.append(f"- {role['name']} ({role['priority']}): {role['reason']}")
    lines.append("")
    lines.append("## 핵심 프로젝트")
    for project in analysis["insights"]["coreProjects"]:
        lines.append(
            f"- {project['name']} | {THEME_LABELS.get(project['theme'], project['theme'])} | priority={project['priorityScore']}"
        )
    lines.append("")
    lines.append("## 추천 기본 응답 습관")
    for item in profile["defaultWorkingStyle"]:
        lines.append(f"- {item}")
    lines.append("")
    lines.append("## 프로젝트별 우선 처리 후보")
    for project in analysis["projects"][:5]:
        task_text = ", ".join(project["recommendedTasks"][:3])
        lines.append(f"- {project['name']}: {project['summary']} 다음 작업 예시: {task_text}")
    lines.append("")
    lines.append("## 교차 프로젝트 인사이트")
    for item in analysis["insights"]["recommendations"]:
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--analysis-output", required=True)
    parser.add_argument("--brief-output", required=True)
    args = parser.parse_args()

    inventory = load_json(Path(args.inventory).expanduser().resolve())
    summary = load_json(Path(args.summary).expanduser().resolve())
    projects = [build_project_analysis(project) for project in inventory.get("projects", [])]
    projects.sort(key=lambda item: item["priorityScore"], reverse=True)

    analysis = {
        "generatedAt": utcnow().isoformat(),
        "sourceSummary": summary,
        "companyProfile": build_company_profile(projects),
        "projects": projects,
        "insights": build_insights(projects),
    }

    analysis_path = Path(args.analysis_output).expanduser().resolve()
    brief_path = Path(args.brief_output).expanduser().resolve()
    analysis_path.parent.mkdir(parents=True, exist_ok=True)
    brief_path.parent.mkdir(parents=True, exist_ok=True)

    analysis_path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2) + "\n")
    brief_path.write_text(render_brief(analysis) + "\n")

    print(
        json.dumps(
            {
                "analysisPath": analysis_path.as_posix(),
                "briefPath": brief_path.as_posix(),
                "projectCount": len(projects),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
