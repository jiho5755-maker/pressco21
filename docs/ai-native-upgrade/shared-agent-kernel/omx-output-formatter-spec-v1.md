# OMX Output Formatter Spec v1

> 목적: OMX/Codex에서 생성된 내부 결과를 founder-facing 회사 에이전트 출력으로 변환하는 formatter 규격을 구현 지향적으로 정의한다.

## 1. 입력 모델
Formatter는 아래 최소 입력을 받는다고 가정한다.

```yaml
context_type: team_meeting | verification | handoff | execution_report
owner_agent_id:
contributors:
internal_roles:
summary:
findings:
risks:
next_steps:
verification:
```

### 필드 의미
- `context_type`: 출력 종류
- `owner_agent_id`: canonical company agent id
- `contributors`: 다른 canonical agent id 배열
- `internal_roles`: architect/critic/analyst 등 내부 role 배열
- `summary`: 내부 요약
- `findings`: 근거/관점/세부 결과
- `risks`: 남은 위험
- `next_steps`: 다음 단계
- `verification`: 검증 근거

---

## 2. name resolution

### canonical display lookup
`agents.v1.yaml` 기준으로 아래 값을 조회한다.
- `display_name`
- `full_name`
- `title`

### 규칙
- founder-facing 본문: `display_name` 우선
- technical metadata: `agent_id` 유지 가능
- `internal_roles`는 formatter 내부에서만 참고하고 본문 앞부분에는 노출하지 않음

---

## 3. 출력 규격

## A. team_meeting

### output header
- `## 팀 회의 종합`

### required sections
1. `### 결론`
2. `### {display_name} 종합` 또는 `### {display_name} 관점`
3. `### 다음 단계`

### section assembly
- `owner_agent_id`가 `han-jihoon-cso`면 `한지훈님 종합` 우선
- contributors 중 핵심 1~2명만 관점 섹션 표시
- 나머지 세부는 findings 압축

### constraints
- 첫 3줄 안에 `팀 회의` 또는 company display name 노출
- `architect`, `critic`, `analyst` 직접 노출 금지

---

## B. verification

### output header
- `## {display_name} 검증 메모`

### required sections
1. `### 결론`
2. `### 확인한 것`
3. `### 남은 리스크`
4. `### 다음 단계`

### recommended owner
- 기술 검증이면 `choi-minseok-cto`
- 재무 검증이면 `park-seoyeon-cfo`
- 복합 검증이면 `team-meeting` 또는 owner+contributors 구조

---

## C. handoff

### output header
- `## OMX 실행실 handoff`

### required fields
- `담당: {display_name}`
- `참여: {display_name list}`
- `요약`
- `확인`
- `리스크`
- `다음`

### rules
- `owner_agent_id`와 `contributors`는 canonical ids에서 display_name으로 변환
- `작업실: OMX 실행실`은 보조 정보로만 표시 가능
- runtime role로 participant를 표시하지 않음

---

## D. execution_report

### output header
- `## {display_name} 실행 보고`

### required sections
1. `### 무엇을 했는가`
2. `### 확인한 것`
3. `### 남은 위험`
4. `### 다음 행동`

### primary use
- 구현 완료 후 founder-facing 보고
- long execution loop 종료 시 summary

---

## 4. formatting rules

### keep
- 짧은 결론 먼저
- 사람 이름 먼저
- next step 명시
- risk를 숨기지 않음

### avoid
- runtime/tool 설명 먼저
- 내부 role 기반 도입부
- 불필요한 영어 role 표기
- evidence 없이 추정 결론

---

## 5. pseudo-code

```text
resolve owner_agent_id -> owner_display
resolve contributors -> contributor_displays
switch context_type:
  team_meeting -> meeting template
  verification -> verification template
  handoff -> handoff template
  execution_report -> execution template
compress findings to 2~3 bullets max for founder-facing body
ensure first 3 lines contain owner_display or 팀 회의
append next_steps
```

---

## 6. acceptance checks
- first 3 lines contain founder-facing display_name or 팀 회의
- no raw internal role label in heading/body intro
- every output has next step
- every output uses canonical display names
- every output remains compatible with cross-runtime review checklist
