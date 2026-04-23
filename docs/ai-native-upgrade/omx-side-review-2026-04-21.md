# OMX-Side Review — Shared Agent Ecosystem (2026-04-21)

> 목적: Claude-side adapter 구현 완료 보고를 shared-kernel 기준으로 검토하고, 현재 OMX-side의 상태와 후속 실행 포인트를 정리한다.

## Summary
Claude 작업실은 SessionStart/Stop continuity, /save-/resume handoff 흐름, named-agent UX를 구현했다. 현재 OMX-side는 아직 **실제 runtime adapter 구현 전** 상태지만, founder-facing output spec / examples / smoke tests / dedicated prompt까지 준비되었다. 따라서 지금 단계의 핵심은 **Claude 완료 결과와 제안서를 canonical roster 기준으로 흡수하고, OMX-side 구현이 founder-facing 이름으로 출력되도록 실제 wrapper 작업을 이어가는 것**이다.

---

## 현재 판정

### 1. Claude-side handoff 수신
- `docs/ai-native-upgrade/shared-agent-kernel/claude-adapter-handoff-to-omx-2026-04-21.md`를 현재 worktree에 반영했다.
- 이제 OMX-side도 같은 문서를 기준으로 follow-up 작업을 진행할 수 있다.

### 2. OMX-side canonical roster 참조 여부
- **실제 OMX runtime adapter 구현물은 아직 없음**
- 다만 실행 진입점인 `.codex/prompts/omx-company-adapter.md`와 `.codex/prompts/omx-founder-facing-output.md`는 now `agents.v1.yaml`, `founder-facing-roster-v1.md`, Claude handoff, output spec, smoke tests, review checklist를 읽도록 강화되었다.
- 즉, **prompt/spec-level alignment는 확보**, runtime-level implementation은 아직 TODO.

### 3. OMX founder-facing 이름 출력 여부
- **실제 wrapper 미구현**이므로 아직 보장되지 않는다.
- 대신 prompt-level guardrail에 “meeting / verification / handoff 출력은 한지훈님, 박서연님, 최민석님, 유준호님 같은 canonical founder-facing 이름을 우선 사용”하도록 명시했다.

### 4. Proposal review 결과
- Proposal 1 (`claude_agent_file`) → **보류**
- Proposal 2 (`owner_display`) → **보류**
- Proposal 3 (memory path canonical화) → **채택** 및 `memory-spine-spec-v1.md` 반영 완료

### 5. Cross-runtime review checklist 판정
- A. Canonical roster 일치 여부 → **Partial Pass**
  - prompt-level read contract는 정렬됨
  - 실제 runtime output은 아직 미검증
- B. Shared memory 규칙 → **Pass**
  - shared-kernel의 memory spine / templates를 기준으로 follow-up 가능
- C. Handoff contract → **Pass**
  - Claude handoff를 현재 worktree에 반영했고 YAML contract 기반 이해 가능
- D. Founder-facing UX → **Partial Pass**
  - 문서와 prompt는 정렬됨
  - 실제 OMX 출력 wrapper는 아직 없음
- E. Runtime-specific mechanic 격리 → **Pass**
  - OMX prompt는 Claude low-level mechanic을 복제하려 하지 않음
- F. Verification quality → **Partial Pass**
  - 현재는 문서/프롬프트 기준 검토만 완료
  - 실제 runtime smoke test 필요
- G. Ownership boundary → **Pass**
  - shared-kernel 계약 수정 없이 adapter-side prompt와 review 문서만 보강함

---

### 6. Claude handoff narrative parsing smoke test
- `_tools/omx-claude-handoff-smoke.py`를 numbered list까지 파싱하도록 보강하고, Claude handoff 3종을 구조적으로 파싱했다.
- 확인 항목:
  - runtime header 존재
  - 한 줄 요약 섹션 존재
  - `OMX가 이어서 할 일` 섹션 존재
  - Cross-Runtime 관련 섹션 존재
- 판정: **Pass** — narrative handoff 문서를 OMX가 follow-up payload로 읽을 수 있음

### 7. Current latest.md quality status
- Claude worktree의 `team/handoffs/latest.md`는 이제 `/save`를 통해 의미 있는 founder-facing handoff로 갱신되었다.
- 현재 확인된 상태:
  - `handoff_id: HOFF-2026-04-21-claude-final`
  - `owner_agent_id: choi-minseok-cto`
  - 실질 summary / verification / learn_to_save 포함
- 즉, **cross-runtime continuity에 실제로 쓸 수 있는 수준의 latest.md**로 승격되었다.

### 8. Cross-runtime output comparison
- `cross-runtime-output-comparison-v1.md`를 작성해 Claude founder-facing 예시와 OMX 프로토타입 출력을 비교했다.
- 판정: **Pass with follow-up** — Team meeting은 사실상 일치, Verification은 제목 wording만 차이, Handoff/Continuity는 의도된 런타임 차이로 판단

### 9. Claude founder-facing output examples 수신
- `.claude/skills/pressco21-core-personas/founder-facing-output-examples.md`를 확인했고, local docs reference로 `claude-founder-facing-output-examples-v1.md`를 반영했다.
- 판정: **Pass** — team_meeting / verification / handoff / SessionStart 예시를 OMX 예시와 직접 비교 가능

## Drift 해소가 필요한 문서 (migration Phase 3~4 기준)

> 참고: `team/` 경로 수정이 필요한 항목은 별도 `work/team/shared-agent-memory-bootstrap` worktree에서 안전하게 진행 중이다.

### Phase 3 — founder-facing 문서 정렬 대상
1. `docs/에이전트-팀-사용가이드.md`
   - Core 6 중심으로 재서술 필요
   - “직원은 같고, 작업실이 다르다” 문장 반영 필요
2. `team/README.md`
   - 35 AI 서술을 founder-facing canonical roster 체계로 재구성 필요
   - specialist 수는 부록/내부 설명으로 이동 필요
3. `team/boardroom.md`
   - founder-facing core / extended 구분을 더 명확히 하면 좋음

### Phase 4 — tool-facing 문서 정렬 대상
4. `CLAUDE.md`
   - founder-facing canonical roster가 shared-agent-kernel 문서를 따른다는 참조 필요
5. `HARNESS.md`
   - Claude-vs-Codex 역할 설명 옆에 canonical source reference 추가 필요
6. future OMX adapter docs / wrapper docs
   - founder-facing identity는 canonical roster를 따른다는 문장 필요

---

## OMX-side immediate next tasks
1. 실제 company-agent output wrapper 설계/구현
2. meeting/verification output sample을 founder-facing 이름 기준으로 시연
3. cross-runtime review checklist로 smoke review 실행
4. founder-facing drift 문서 패치 반영 확인 (workspace + team worktree)
5. 필요 시 runtime wrapper 적용 브랜치 생성
