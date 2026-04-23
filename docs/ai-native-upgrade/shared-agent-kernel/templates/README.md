# Shared Memory Templates

> 목적: Claude Code와 Codex/OMX가 같은 회사 에이전트 생태계를 운영할 때, 어떤 형식으로 기억을 저장해야 하는지 통일하기 위한 템플릿 모음.

## 원칙
- 템플릿은 **긴 회의록**이 아니라 **행동을 바꾸는 압축 기억**을 남기기 위한 것이다.
- 각 템플릿은 사람이 읽기 쉽고, 이후 런타임이 재사용하기 쉬운 형태를 우선한다.
- 저장 전 항상 다음 질문을 통과해야 한다:
  - **이게 다음 행동을 바꾸는가?**

## 포함 파일
- `playbook.template.md`
- `failures.template.md`
- `founder-preferences.template.md`
- `growth-log.template.md`
- `handoff.template.yaml`

## 권장 사용 위치
- agent-specific: `team/knowledge-base/<agent>/`
- shared: `team/knowledge-base/shared/`
- handoff: tool-specific output path 또는 shared handoff 저장소

## 사용 순서
1. 세션 종료 시 learning candidate 추출
2. 행동을 바꾸는 것만 선택
3. 알맞은 템플릿에 맞춰 압축 저장
4. 다음 세션 시작 시 핵심 1~3개만 로드
