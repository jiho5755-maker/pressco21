---
name: pressco21-claude-ecosystem
description: Build or review the Claude Code side of PRESSCO21's shared agent ecosystem. Use when implementing Claude-facing plugins, skills, hooks, session continuity, named-agent UX, or founder-facing team-meeting behavior aligned to the shared-agent PRD.
---

# PRESSCO21 Claude Ecosystem Builder

Claude Code 작업실의 **shared agent ecosystem adapter** 전담 빌더.

## Shared Kernel 계약 (읽기 전용)

이 순서로 읽고 기준으로 삼는다:
1. `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml` — canonical roster
2. `docs/ai-native-upgrade/shared-agent-kernel/memory-spine-spec-v1.md` — 기억 구조
3. `docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md` — handoff 스키마
4. `docs/ai-native-upgrade/shared-agent-kernel/runtime-divergence-matrix-v1.md` — shared vs Claude-only
5. `docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md` — Core 6 roster

## 4개 스킬 유닛 — 책임 경계

| 유닛 | 경로 | 담당 | 쓰는 파일 | 안 다루는 것 |
|------|------|------|----------|------------|
| **session-continuity** | `.claude/skills/pressco21-session-continuity/` | SessionStart/End 훅, /save, /resume, handoff 생성/로드 | `team/handoffs/latest.md` | 에이전트 정의, 회의 진행 |
| **core-personas** | `.claude/skills/pressco21-core-personas/` | 에이전트 정체성, 컨텍스트 로딩, **모든 출력의 wording 규칙** | 에이전트 정의 파일 | handoff 기록, memory 승격 |
| **team-meeting** | `.claude/skills/pressco21-team-meeting/` | 팀 미팅 진행 UX, 참석자 선정, 회의 프로토콜 | `team/meeting-logs/*.md` | 개별 에이전트 응답 포맷 |
| **memory-sync** | `.claude/skills/pressco21-memory-sync/` | Memory spine 7-Layer 읽기/쓰기, 승격 판단 기준 | `team/knowledge-base/**` | handoff 생성, 에이전트 정의 |

**교차점 규칙**:
- `/save`는 session-continuity가 주관하되, 승격 판단은 memory-sync 규칙을 따른다
- 팀 미팅 출력 포맷은 core-personas의 wording 규칙(context_type=team_meeting)을 따른다
- 에이전트가 growth-log를 읽는 것은 core-personas의 컨텍스트 로딩, 쓰는 것은 memory-sync 관할

## Claude-side 구현 파일 전체 맵

### Hooks (실행 파일)
| 파일 | 이벤트 | 역할 |
|------|--------|------|
| `~/.claude/hooks/session-start.sh` | UserPromptSubmit | handoff 자동 로딩 (사람 이름 중심) |
| `~/.claude/hooks/session-handoff.sh` | Stop | handoff-contract YAML 자동 기록 |
| `~/.claude/hooks/agent-logger.sh` | PostToolUse(Agent) | 에이전트 사용 로깅 |
| `~/.claude/hooks/levelup-auto.sh` | Stop | growth-log 세션 마커 |
| `~/.claude/hooks/notify-telegram.sh` | Stop + Notification | 텔레그램 알림 |

### Skills (명시적 호출)
| 파일 | 커맨드 | 역할 |
|------|--------|------|
| `~/.claude/commands/save.md` | /save | 체크포인트 + handoff 생성 |
| `~/.claude/commands/resume.md` | /resume | 명시적 세션 복원 |
| `~/.claude/commands/team-meeting.md` | /team-meeting | 팀 미팅 진행 |

### Agent Definitions (9개 C-Suite)
모두 `~/.claude/agents/`에 위치. 공통 패턴 적용:
- 세션 컨텍스트 로딩 (growth-log → handoff → meeting-logs → company-profile)
- 출력 표준 (판단 → 근거 → 리스크 → 다음 단계)
- canonical roster 참조 (agents.v1.yaml agent_id)

### Shared Write Path (계약상 허용)
| 경로 | 트리거 |
|------|--------|
| `team/handoffs/latest.md` | Stop 훅 + /save |
| `team/knowledge-base/*/growth-log.md` | Stop 훅 (levelup-auto) |
| `team/meeting-logs/*.md` | /team-meeting |

## 핵심 규칙

1. **사람 이름이 먼저** — `founder-facing-wording-rules.md` 참조
2. **shared kernel은 읽기만** — 변경 필요 시 별도 proposal
3. **Save only if it changes future behavior**
4. **같은 직원, 다른 작업실** — OMX mechanic 복제 금지

## 작업 체크리스트

- [ ] 이번 작업이 Claude-side adapter 범위인지 확인
- [ ] founder-facing naming이 canonical roster와 일치하는지 확인
- [ ] wording 규칙(도구 이름 < 사람 이름) 준수
- [ ] continuity flow 설계 또는 검증
- [ ] shared kernel 변경이 있다면 drift risk 명시 + 별도 proposal
- [ ] cross-runtime review checklist 통과
