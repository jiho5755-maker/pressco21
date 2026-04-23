# Shared-Kernel Change Proposals from Claude Adapter (2026-04-21)

> 작성자: Claude-side adapter 구현 과정에서 발견
> 상태: 제안 (OMX custodian 검토 필요)
> 원칙: shared-kernel은 직접 수정하지 않고 별도 proposal로 분리

---

## Proposal 1: agents.v1.yaml에 Claude agent file 매핑 추가

**현재**: `claude_adapter_profile`에 `primary_modes`와 `likely_support_roles`만 있음
**제안**: `claude_agent_file` 필드 추가

```yaml
claude_adapter_profile:
  claude_agent_file: chief-strategy-officer.md   # ~/.claude/agents/ 내 파일명
  primary_modes: [conversation, strategy, synthesis]
  likely_support_roles: [analyst, critic]
```

**이유**: Claude adapter가 canonical roster와 실제 agent 파일을 자동 매핑할 때 이 필드가 있으면 하드코딩을 줄일 수 있음.

**긴급도**: 낮음 (현재 수동 매핑으로 동작 중)

---

## Proposal 2: handoff-contract에 founder_display 필드 추가

**현재**: `owner_agent_id`는 `han-jihoon-cso` 같은 영문 ID
**제안**: `owner_display` 필드 추가 (선택적)

```yaml
owner_agent_id: han-jihoon-cso
owner_display: 한지훈님(CSO)     # 선택적 — founder-facing 출력용
```

**이유**: session-start.sh에서 founder-facing 출력을 만들 때 현재 bash 연관배열로 매핑 중. 이 필드가 handoff 자체에 있으면 runtime 무관하게 founder-facing 이름을 바로 사용 가능.

**긴급도**: 낮음 (현재 훅 내 매핑으로 동작 중)

---

## Proposal 3: memory-spine-spec에 실제 파일 경로 확정

**현재**: "권장 위치" 수준으로 기술
```
Layer 4 — Playbook → 권장 위치: team/knowledge-base/<agent>/playbook.md
Layer 5 — Failure Library → 권장 위치: team/knowledge-base/<agent>/failures.md
Layer 6 — Founder Preferences → 권장 위치: team/knowledge-base/shared/founder-preferences.md
```

**제안**: "권장"을 "확정"으로 승격하여 양 런타임이 같은 경로를 사용

**이유**: /save의 승격 경로가 이 경로를 기준으로 구현됨. "권장"이면 OMX가 다른 경로를 쓸 수 있어 drift 발생 가능.

**긴급도**: 중간 (현재 Claude는 이 경로 사용 중)

---

## 제안 없음 (현재 계약으로 충분한 것)

- canonical roster (agents.v1.yaml) — Core 6 + Extended 4 구성 적절
- handoff-contract 최소 필드 — changed_artifacts, verification 포함 후 완전
- runtime-divergence-matrix — shared vs Claude-only 경계 명확
- 저장 원칙 "save only if it changes future behavior" — 그대로 유지
