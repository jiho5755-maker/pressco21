# Proposal Review — Claude Side Kernel Proposals (2026-04-21)

> 목적: Claude-side adapter 구현 중 분리 제안된 shared-kernel 변경 3건을 검토하고, 채택/보류를 명시한다.

## Proposal 1 — `claude_agent_file` 필드 추가
**판정: 보류**

### 이유
- `agents.v1.yaml`은 tool-neutral shared kernel이어야 한다.
- `claude_agent_file`는 Claude 전용 adapter detail이라 shared contract에 넣으면 runtime-specific 정보가 kernel로 새어들어간다.
- 현재는 Claude-side adapter 또는 local mapping 문서에서 관리해도 충분하다.

### 재검토 조건
- 향후 여러 Claude adapter 파일을 자동 동기화해야 하고, 수동 매핑 drift가 반복적으로 발생할 때

---

## Proposal 2 — `owner_display` 필드 추가
**판정: 보류**

### 이유
- `owner_display`는 `owner_agent_id` + canonical roster lookup으로 계산 가능하다.
- handoff contract에 display를 직접 넣으면 이름 변경 시 drift 가능성이 커진다.
- founder-facing 출력은 adapter layer에서 계산하는 것이 shared contract를 더 얇고 안정적으로 유지한다.

### 재검토 조건
- adapter가 아닌 외부 시스템이 handoff 파일만으로 직접 founder-facing 화면을 렌더링해야 할 때

---

## Proposal 3 — memory-spine path를 권장에서 확정으로 승격
**판정: 채택**

### 이유
- playbook / failures / founder-preferences 경로가 런타임마다 달라지면 cross-runtime learning이 바로 drift난다.
- 현재 Claude는 이미 이 경로를 전제로 구현을 시작했고, OMX도 동일 경로를 따라야 handoff와 memory 승격이 안정된다.
- 이 변경은 runtime-specific detail이 아니라 **shared memory contract**에 해당한다.

### 채택 내용
- `memory-spine-spec-v1.md`에서 아래 경로를 canonical path로 명시한다.
  - `team/knowledge-base/<agent>/playbook.md`
  - `team/knowledge-base/<agent>/failures.md`
  - `team/knowledge-base/shared/founder-preferences.md`

---

## 요약
- 채택: 1건 (Proposal 3)
- 보류: 2건 (Proposal 1, 2)

## 다음 단계
1. memory-spine-spec 경로 문구를 canonical path로 갱신
2. core agent 4~6명의 playbook / failures 초기 파일 생성
3. founder-facing drift 문서 정리 계속 진행
