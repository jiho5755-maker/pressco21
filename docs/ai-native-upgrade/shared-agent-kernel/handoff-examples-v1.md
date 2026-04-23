# Cross-Runtime Handoff Examples v1

> 목적: `handoff-contract-v1.md`가 실제로 어떻게 쓰이는지 예시를 보여준다.
> 원칙: 긴 로그가 아니라 **다음 작업을 바로 이어갈 수 있는 압축 브리프**여야 한다.

---

## Example A — Claude → Codex/OMX

### 상황
대표가 Claude 작업실에서 “유준호님이랑 같이 shared agent ecosystem 구조를 쉽게 설명해달라”고 요청했고, Claude 쪽에서는 founder-facing UX와 continuity 방향을 정리했다. 이제 OMX 실행실에서 shared kernel 문서와 adapter를 실제 구현해야 한다.

```yaml
handoff_id: HOFF-2026-04-21-claude-to-omx-001
created_at: 2026-04-21T13:30:00+09:00
runtime: claude
owner_agent_id: yoo-junho-paircoder
contributors:
  - han-jihoon-cso
  - yoon-haneul-pm
branch: work/workspace/claude-shared-agent-ecosystem
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem
summary: 대표가 같은 회사 직원이 Claude와 OMX에서 이어서 일하는 감각을 원한다는 점을 명확히 정리했고, founder-facing 핵심 roster와 continuity UX 방향을 Claude 쪽 기준으로 설계했다.
decision: 같은 agent 정체성은 유지하되, low-level runtime role은 공유하지 않는다. Claude는 frontdoor와 continuity를 담당하고, OMX는 execution과 verification을 담당한다.
changed_artifacts:
  - docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md
  - .claude/skills/pressco21-claude-ecosystem/SKILL.md
verification:
  - PRD와 Claude skill이 shared-agent 원칙을 일관되게 설명하는지 수동 리뷰
  - Claude-side 범위와 shared-kernel 범위가 구분되었는지 확인
open_risks:
  - canonical roster가 아직 shared registry 파일로 고정되지 않음
  - OMX 출력이 founder-facing 이름으로 얼마나 자연스럽게 래핑될지 미검증
next_step: OMX 쪽에서 shared kernel registry와 handoff contract를 실제 문서로 구현하고 founder-facing company output 형식을 잡는다.
learn_to_save:
  - founder는 tool보다 사람 이름 기준으로 시스템을 이해한다
  - session continuity는 “이전 세션 요약 + 다음 행동”이 자동 제시될 때 체감된다
```

### founder-facing 요약 버전
- **Summary**: Claude 쪽에서 회사형 AI 팀의 설명 방식과 continuity 방향을 먼저 정리했다.
- **Why it matters**: 이제 OMX가 실제 구현을 하더라도 대표 입장에서는 계속 같은 직원이 이어서 일하는 것처럼 느껴질 수 있다.
- **Verified**: PRD와 Claude skill 범위가 정리됐다.
- **Risk**: shared roster와 OMX output wrapper는 아직 고정 전이다.
- **Next**: OMX에서 shared kernel 문서를 실제로 만든다.

---

## Example B — Codex/OMX → Claude

### 상황
OMX 실행실에서 shared kernel 초안(registry / memory spine / handoff contract / divergence matrix)을 만들었다. 이제 Claude 작업실에서 official plugin / hook / continuity 설계를 할 때 이 계약을 읽고 움직여야 한다.

```yaml
handoff_id: HOFF-2026-04-21-omx-to-claude-001
created_at: 2026-04-21T14:05:00+09:00
runtime: codex-omx
owner_agent_id: choi-minseok-cto
contributors:
  - yoo-junho-paircoder
  - yoon-haneul-pm
branch: work/workspace/ai-team-pilot
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot
summary: Shared Agent Kernel 1차 초안을 workspace-safe 문서로 만들었고, canonical roster / memory spine / handoff schema / divergence matrix 기준을 문서화했다.
decision: founder-facing core agents는 6명으로 시작한다. shared kernel은 docs staging area에서 먼저 확정하고, runtime-specific adapter는 이후 별도 worktree에서 구현한다.
changed_artifacts:
  - docs/ai-native-upgrade/shared-agent-kernel/README.md
  - docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml
  - docs/ai-native-upgrade/shared-agent-kernel/memory-spine-spec-v1.md
  - docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md
  - docs/ai-native-upgrade/shared-agent-kernel/runtime-divergence-matrix-v1.md
verification:
  - YAML 파싱 확인
  - core agent count와 pseudo agent(team-meeting) 구조 확인
  - 문서 간 shared vs runtime-specific 원칙이 일관적인지 수동 점검
open_risks:
  - founder-facing roster 문서와 runtime 예시가 더 필요함
  - Claude plugin/hook 설계가 아직 official feature 기준으로 구체화되지 않음
next_step: Claude 쪽에서 이 shared-kernel 문서를 읽고, SessionStart/Stop continuity와 named-agent UX를 official plugin/hook 기준으로 설계한다.
learn_to_save:
  - shared contract는 docs staging area에서 먼저 고정하는 것이 안전하다
  - 같은 직원 정체성은 유지하되, runtime internal role은 공유하지 않는 것이 drift를 줄인다
```

### founder-facing 요약 버전
- **Summary**: OMX 쪽에서 같은 회사 에이전트를 위한 공통 계약 문서를 먼저 만들었다.
- **Why it matters**: 이제 Claude도, OMX도 같은 roster와 같은 memory 규칙을 읽고 움직일 수 있다.
- **Verified**: registry와 memory/handoff/divergence 문서가 실제 파일로 만들어지고 기본 검증까지 끝났다.
- **Risk**: Claude-side 실제 continuity 훅과 founder-facing roster 문서는 아직 후속 작업이다.
- **Next**: Claude 작업실에서 official plugin/hook 기준 continuity 설계를 시작한다.

---

## Example C — founder preference 승격 후보 포함

### 상황
유준호님이 대표와 pair-coding 대화를 진행한 뒤, “어려운 설명을 먼저 하지 말고, 작은 성공체험을 먼저 보여주는 방식이 더 잘 먹힌다”는 learning이 나왔다.

```yaml
handoff_id: HOFF-2026-04-21-claude-to-memory-001
created_at: 2026-04-21T15:00:00+09:00
runtime: claude
owner_agent_id: yoo-junho-paircoder
contributors: []
branch: work/workspace/claude-shared-agent-ecosystem
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem
summary: 대표와의 pair-coding 대화에서 개념 설명보다 작은 성공체험을 먼저 보여주는 방식이 더 높은 수용도를 보였고, 유준호님 playbook 후보로 적합하다고 판단했다.
decision: 비전공자 대응에서는 “개념 설명 우선”보다 “작은 실행 성공 → 쉬운 설명” 순서를 기본값으로 삼는다.
changed_artifacts: []
verification:
  - founder 반응 기반 수동 평가
  - 이전 설명 패턴 대비 체감 수용도 향상 기록
open_risks:
  - 아직 founder-preferences 또는 playbook에 정식 승격되지는 않음
next_step: 유준호님 playbook 또는 founder-preferences에 이 패턴을 compact learning으로 저장할지 결정한다.
learn_to_save:
  - 비전공자에게는 설명보다 작은 성공체험이 먼저다
```

### 이 예시의 핵심
이런 handoff가 있어야 “같은 유준호님이 다음 세션에서 더 좋아진 상태로 돌아오는 것”이 가능해진다.

---

## 작성 체크리스트

handoff를 만들 때 아래를 확인한다.

- [ ] owner는 회사 agent id로 적었는가
- [ ] runtime internal role을 노출하지 않았는가
- [ ] summary가 1~3문장으로 압축되었는가
- [ ] verification이 빠지지 않았는가
- [ ] next_step이 바로 행동 가능한 문장인가
- [ ] learn_to_save가 0~3개로 제한되었는가
