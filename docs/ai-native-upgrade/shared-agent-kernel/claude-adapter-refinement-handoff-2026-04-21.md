# Claude Adapter Refinement Handoff (2026-04-21 Round 2)

> runtime: claude
> 대상: Codex/OMX 작업실
> 선행 문서: `claude-adapter-complete-handoff-2026-04-21.md` (Round 1)
> 상태: OMX review 피드백 반영 + 리파인먼트 완료

---

## 한 줄 요약

OMX review(proposal 판정 + drift audit + output formatter spec)를 받아서, Claude adapter의 세션 훅/출력 포맷/메모리 경로를 리파인했다. Proposal 1·2 보류 수용, Proposal 3(canonical path) 채택 반영. shared-kernel 직접 수정 0건.

---

## OMX 피드백 반영 내역

| OMX 판정 | Claude 대응 |
|----------|------------|
| Proposal 1 (`claude_agent_file`) 보류 | 수용. adapter 내부 bash 매핑으로 유지. |
| Proposal 2 (`owner_display`) 보류 | 수용. `agent_id` + roster lookup으로 계산. |
| Proposal 3 (canonical path) 채택 | 반영 완료. memory-sync 스킬 + /save 경로 모두 canonical path 확정 표기. |
| OMX output formatter spec (4 context_type) | Claude wording 규칙에 동일 섹션 구조 추가. |

---

## 이번 라운드 변경 내역

### 1. SessionStart — OMX handoff 호환

**파일**: `~/.claude/hooks/session-start.sh`

OMX가 쓴 handoff(`runtime: codex-omx`)일 때 "(실행실에서)" 레이블 추가.

출력 예시 비교:
```
Claude가 쓴 handoff:  [방금 전] 최민석님(CTO): 세션 연속성 훅을 구현했습니다
OMX가 쓴 handoff:     [3시간 전] 최민석님(CTO) (실행실에서): shared kernel 초안을 만들었습니다
```

"같은 직원이 다른 작업실에서 일한 결과"가 자연스럽게 보임.

### 2. 출력 포맷 — OMX formatter와 cross-runtime 정렬

**파일**: `.claude/skills/pressco21-core-personas/founder-facing-wording-rules.md`

OMX formatter spec의 4가지 context_type과 같은 섹션 이름을 쓰도록 정렬:

| context_type | Claude 출력 | OMX 출력 | 공통 섹션 |
|---|---|---|---|
| verification | `{이름} 의견` | `{이름} 검증 메모` | 결론 / 확인한 것 / 남은 리스크 / 다음 단계 |
| team_meeting | `팀 회의 종합` | `팀 회의 종합` | 결론 / {이름} 관점 / 다음 단계 |
| handoff | `저장 완료` | `OMX 실행실 handoff` | 요약 / 확인 / 리스크 / 다음 |
| execution_report | `{이름} 실행 보고` | `{이름} 실행 보고` | 무엇을 했는가 / 확인한 것 / 남은 위험 / 다음 행동 |

대표가 어느 작업실 출력을 봐도 같은 구조로 읽을 수 있음.

### 3. Memory path — Proposal 3 채택 반영

**파일**: `.claude/skills/pressco21-memory-sync/SKILL.md`

Layer 4~6 경로를 "Canonical path"로 확정 표기 + 주석 추가:

| Layer | Canonical path |
|-------|---------------|
| 4. Playbook | `team/knowledge-base/<agent>/playbook.md` |
| 5. Failures | `team/knowledge-base/<agent>/failures.md` |
| 6. Founder Prefs | `team/knowledge-base/shared/founder-preferences.md` |

`/save` Step 4의 승격 경로도 동일 canonical path 사용 확인됨.

---

## 현재 Claude Adapter 전체 상태

### 훅 (7개, 5개 이벤트)
| 이벤트 | 훅 | 상태 |
|--------|-----|------|
| UserPromptSubmit | session-start.sh | 실동작 + OMX 호환 |
| PreToolUse(Bash) | bash-guard.sh | 기존 유지 |
| PreToolUse(Edit) | makeshop-edit-guard.sh | 기존 유지 |
| PostToolUse(Agent) | agent-logger.sh | 기존 유지 |
| Notification | notify-telegram.sh | 기존 유지 |
| Stop | notify-telegram.sh + levelup-auto.sh + session-handoff.sh | 기존 2 + 신규 1 |

### 스킬 (5개 유닛 + 2개 커맨드)
| 스킬 | 상태 |
|------|------|
| pressco21-claude-ecosystem (메타) | 완료 |
| pressco21-session-continuity | 완료 |
| pressco21-core-personas + wording rules | 완료 + OMX formatter 정렬 |
| pressco21-team-meeting | 완료 |
| pressco21-memory-sync | 완료 + canonical path 확정 |
| /save | 강화 완료 (handoff-contract + 승격 판단) |
| /resume | 신설 완료 |

### 에이전트 (9개 C-Suite)
전부 shared kernel 참조 + 출력 표준 적용. hardcoded=0.

---

## Cross-Runtime 정렬 현황

| 항목 | Claude | OMX | 정렬 상태 |
|------|--------|-----|----------|
| Canonical roster 참조 | agents.v1.yaml | agents.v1.yaml | 일치 |
| Handoff 스키마 | handoff-contract-v1 | handoff-contract-v1 | 일치 |
| Memory path | canonical path 사용 | canonical path 사용 | 일치 (Proposal 3) |
| 출력 섹션 이름 | 결론/확인한 것/리스크/다음 | 결론/확인한 것/리스크/다음 | 일치 |
| 사람 이름 우선 | 훅 + wording rules | output formatter spec | 일치 (구현은 OMX 미완) |
| SessionStart | UserPromptSubmit 실동작 | 해당 없음 (OMX는 별도 방식) | 런타임별 분리 OK |
| SessionEnd | Stop hook 자동 | `.omx/state` 기반 예정 | 런타임별 분리 OK |

---

## OMX가 이어서 할 일

### 이번 라운드 기준
1. **실제 output wrapper 구현** — formatter spec은 있으나 runtime wrapper 미구현
2. **smoke test** — Claude handoff를 OMX가 읽고 정상 파싱하는지 실제 테스트
3. **Drift 패치 계속** — founder-facing 문서 5개 중 team worktree에서 진행 중인 것 완료

### 재제안 판단 불필요
Proposal 1·2는 현재 adapter 내부 매핑으로 동작 중이며 drift가 발생하지 않았으므로 재제안하지 않음.

---

## Shared-kernel 직접 수정: 0건

---

## Learn to Save

1. cross-runtime 출력 정렬은 **섹션 이름 통일**이 핵심 — 양쪽 adapter가 같은 heading을 쓰면 founder에게 일관되게 보인다
2. shared-kernel 제안이 보류되더라도 adapter 내부 매핑으로 충분하면 kernel은 얇게 유지하는 것이 안전하다
3. OMX handoff 호환은 `runtime` 필드 하나로 "실행실에서" 레이블을 붙이는 것만으로 충분 — 과도한 분기 불필요
