---
name: pressco21-memory-sync
description: Memory spine read/write patterns for PRESSCO21 shared agent ecosystem. Governs how Claude safely reads from and writes to the shared memory spine (growth-log, playbook, failures, founder-preferences, handoffs). Trigger when discussing memory storage rules, learning promotion, or shared memory architecture.
---

# PRESSCO21 Memory Sync (Claude Adapter)

Shared Memory Spine에 대한 Claude-side 읽기/쓰기 규칙.

## Memory Spine 7-Layer 구조 (memory-spine-spec-v1 참조)

| Layer | 내용 | Canonical path | 변경 빈도 |
|-------|------|---------------|----------|
| 1. Persona | 정체성, 말투, 미션 | `team/personas/*.md` | 거의 안 바뀜 |
| 2. Knowledge Base | 도메인 지식 | `.claude/agent-memory/*/MEMORY.md` | 프로젝트별 |
| 3. Growth Log | 경험 누적 | `team/knowledge-base/<agent>/growth-log.md` | 세션마다 |
| 4. Playbook | 반복 대응법 | `team/knowledge-base/<agent>/playbook.md` | 주 단위 |
| 5. Failure Library | 실패 기록 | `team/knowledge-base/<agent>/failures.md` | 이벤트 시 |
| 6. Founder Preferences | 대표 선호 | `team/knowledge-base/shared/founder-preferences.md` | 관찰 시 |
| 7. Reusable Handoffs | 작업 인수인계 | `team/handoffs/latest.md` | 매 세션 |

> Layer 4~6 경로는 Proposal 3 채택(2026-04-21)으로 "권장"에서 **canonical path로 확정**됨.
> 양 런타임(Claude + OMX)이 동일 경로를 사용해야 cross-runtime learning이 drift하지 않는다.

## 저장 원칙

**Save only if it changes future behavior.**

### 저장해야 하는 것
- 같은 요청이 반복될 가능성이 높은 패턴
- 대표가 반복적으로 보인 선호
- 역할별 판단 기준을 바꿀 새 사실
- 같은 실수를 막아줄 failure

### 저장하면 안 되는 것
- 일회성 잡담
- 원본 대화 전문 (raw transcript)
- 검증되지 않은 추정치
- runtime internal noise

## Claude가 쓰는 경로 (허용)

| 경로 | 트리거 | 내용 |
|------|--------|------|
| `team/handoffs/latest.md` | Stop hook + /save | 세션 handoff |
| `team/knowledge-base/*/growth-log.md` | Stop hook (levelup-auto) | 세션 마커 |
| `team/meeting-logs/*.md` | /team-meeting | 회의록 |

## Claude가 읽는 경로 (참조)

| 경로 | 시점 |
|------|------|
| `team/handoffs/latest.md` | SessionStart (자동) + /resume (수동) |
| `team/knowledge-base/*/growth-log.md` | 에이전트 spawn 시 |
| `team/personas/*.md` | 에이전트 spawn 시 |
| `team/protocols/*.md` | 회의/에스컬레이션 시 |
| `company-profile.md` | 회사 정보 필요 시 |

## 승격 경로

```
세션 중 learning 발견
  ↓ /save 시 learn_to_save에 기록
  ↓ 반복 확인되면
  ↓
growth-log → playbook 승격 (reusable pattern)
growth-log → failures 승격 (반복 실패)
growth-log → founder-preferences 승격 (대표 선호)
```

## 템플릿 참조

- `templates/growth-log.template.md`
- `templates/playbook.template.md`
- `templates/failures.template.md`
- `templates/founder-preferences.template.md`
- `templates/handoff.template.yaml`
