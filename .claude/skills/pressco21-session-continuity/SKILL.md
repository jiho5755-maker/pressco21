---
name: pressco21-session-continuity
description: Session continuity for PRESSCO21 shared agent ecosystem. SessionStart auto-loads latest handoff via UserPromptSubmit hook. SessionEnd records structured handoff via Stop hook. /save enriches handoff with Claude judgment. /resume explicitly restores context. Trigger when discussing session start/stop design, handoff format, or continuity flow.
---

# PRESSCO21 Session Continuity

세션 간 연속성을 보장하는 Claude-side adapter 스킬.

## 아키텍처

```
SessionStart (UserPromptSubmit hook)
  └─ session-start.sh → latest handoff 읽기 → stdout 컨텍스트 주입

SessionEnd (Stop hook)
  └─ session-handoff.sh → handoff-contract YAML 자동 기록
  └─ notify-telegram.sh → 텔레그램 알림
  └─ levelup-auto.sh → 에이전트 growth-log 마커

/save (수동)
  └─ Claude 판단으로 summary, decision, next_step, learn_to_save 채움
  └─ team/handoffs/latest.md 갱신 (Stop 훅의 골격을 덮어씀)

/resume (수동)
  └─ latest handoff + growth-log + MEMORY 로드 → founder-facing 요약
```

## 관련 파일

| 파일 | 역할 |
|------|------|
| `~/.claude/hooks/session-start.sh` | UserPromptSubmit — handoff 자동 로딩 |
| `~/.claude/hooks/session-handoff.sh` | Stop — handoff YAML 자동 기록 |
| `~/.claude/commands/save.md` | 수동 체크포인트 + handoff 생성 |
| `~/.claude/commands/resume.md` | 명시적 세션 복원 |
| `team/handoffs/latest.md` | 최신 handoff (cross-runtime 공유) |

## Shared Kernel 계약 참조

- handoff 스키마: `handoff-contract-v1.md`
- 세션 시작 로드 셋: `memory-spine-spec-v1.md` "세션 시작 시 최소 로드 셋"
- 세션 종료 추출: `memory-spine-spec-v1.md` "세션 종료 시 추출 항목"
- handoff 템플릿: `templates/handoff.template.yaml`

## SessionStart Output Spec

세션 시작 시 아래 4개 요소가 한 줄에 compact하게 보인다:

```
[{경과시간}] {사람이름}({직책}){작업실}: {요약} → 이어서: {다음행동} | 주의: {리스크} | 승격 후보: {learn_to_save}
```

예시:
```
[3시간 전] 최민석님(CTO): adapter 구현 완료 → 이어서: smoke test | 주의: async handoff | 승격 후보: cross-runtime 출력 정렬 패턴
```

**4개 요소**: 지난 세션 요약 + 다음 행동 + 열린 리스크 + 승격 후보
**사람 이름 우선**: tool/runtime 설명 대신 canonical display_name
**OMX 작성 handoff**: `(실행실에서)` 레이블 추가

## 설계 원칙

1. Stop 훅은 기계적으로 추출 가능한 것만 기록 (branch, commits, agents)
2. 판단이 필요한 필드는 `/save`에서 Claude가 채움
3. `UserPromptSubmit` 훅은 세션당 1회만 실행 (debounce)
4. handoff는 7일 이상 오래되면 무시
5. learn_to_save가 비어있거나 `[]`이면 승격 후보 표시 생략
