# Runtime Divergence Matrix v1

> 목적: Claude Code와 Codex/OMX를 같은 회사 에이전트 생태계로 운영하되, 무엇을 공유하고 무엇을 런타임별로 다르게 둘지 명시한다.

| Topic | Shared Principle | Claude Implementation | Codex/OMX Implementation |
|---|---|---|---|
| Agent identity | founder-facing 에이전트 이름과 역할은 canonical roster를 따른다 | named agent / plugin / skill UX로 노출 | company-style wrapper / formatted outputs로 노출 |
| Safety rules | secret 금지, force push 금지, worktree-first, single writer | CLAUDE.md / hooks / plugin guard | AGENTS.md / skills / OMX runtime checks |
| Domain truth | company-profile, partnerclass identity, MakeShop constraints, OPS rules 공유 | relevant prompt injection / plugin load | relevant prompt injection / shared docs read |
| Verification bar | verify before claiming complete | Claude-side validation + official-doc check | OMX-side validation + test/evidence loop |
| Handoff schema | same compact handoff contract | founder-facing continuity brief 생성 | execution-facing handoff + export/import |
| Memory spine | same persona / growth log / playbook / failures / preferences | SessionStart에서 compact load, SessionEnd에서 승격 후보 추출 | session wrap-up에서 learnings 추출, shared artifact 반영 |
| Runtime roles | 공유하지 않음 | Claude-native subagent / hook / plugin behavior 유지 | architect/critic/analyst/executor/verifier 등 generic runtime role 유지 |
| Session continuity | 이전 세션 요약과 다음 행동을 자동 제시 | SessionStart / Stop hooks 중심 | `.omx/state` + continuity summary 중심 |
| Team meeting UX | 같은 회사 회의처럼 보여야 함 | named employees + meeting narrative | internal generic roles -> company employee summary mapping |
| Prompt/skill surface | 개념은 호환되되 문법은 같을 필요 없음 | Claude skill / plugin / slash command | Codex prompt / skill / OMX command |
| Ownership posture | 명시적으로 분리 | Claude-side adapter 전담 | OMX-side adapter 전담 |

---

## 강한 규칙

### 반드시 공유
- canonical roster
- agent ids
- shared terminology
- domain truth
- handoff schema
- memory spine 저장 원칙
- safety / git / deploy / scope rules

### 일부러 공유하지 않음
- runtime internal role names
- tmux/team/session state internals
- hook execution mechanics
- slash command 문법 세부
- prompt body 전체 복제

---

## drift 경고 신호
- agent 수가 문서마다 다름
- founder-facing 이름이 runtime마다 다름
- shared memory를 한쪽만 업데이트함
- handoff 필드 이름이 runtime마다 달라짐
- 같은 회사 agent인데 tone이 달라짐

---

## 결정 규칙
아래 3개가 모두 참일 때만 “완전 동일화”를 강제한다.
1. repo correctness 또는 company truth를 보호한다.
2. divergence가 founder 경험에 실제 피해를 준다.
3. runtime-specific mechanic을 복제하지 않고 표현 가능하다.
