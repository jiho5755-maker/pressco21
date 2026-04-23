# OMX Adapter Implementation Plan v1

> 목적: Shared Agent Kernel 계약을 유지하면서, Codex/OMX의 내부 generic runtime role을 founder-facing 회사 에이전트 출력으로 래핑하는 실제 구현 순서를 정의한다.

## 구현 목표
OMX는 내부적으로 `architect / critic / analyst / executor / verifier` 같은 generic role을 유지하되, 대표가 읽는 출력은 항상 **한지훈님 / 박서연님 / 최민석님 / 유준호님 / 윤하늘님 / 팀 회의** 같은 canonical roster 중심으로 보이게 만든다.

---

## 구현 범위

### 포함
- team meeting founder-facing wrapper
- verification founder-facing wrapper
- handoff founder-facing wrapper
- execution completion founder-facing summary
- roster lookup / display name resolution flow

### 제외
- shared-kernel contract 수정
- Claude-side hooks/plugins 로직
- runtime internal role 제거
- team/tmux/state internals 재설계

---

## 단계별 구현

### Step 1 — Wrapper entrypoints 정의
우선 wrapper가 적용될 출력 지점을 확정한다.

우선순위:
1. team meeting summary
2. verification summary
3. handoff summary
4. execution completion report

각 출력은 내부 원문을 그대로 노출하지 않고, founder-facing summary를 먼저 만든다.

---

### Step 2 — Canonical name resolution 규칙 정의
입력은 runtime role이 아니라 **canonical agent id** 또는 그에 준하는 company-agent mapping 결과를 사용해야 한다.

최소 필요 매핑:
- `han-jihoon-cso` → `한지훈님`
- `park-seoyeon-cfo` → `박서연님`
- `choi-minseok-cto` → `최민석님`
- `yoo-junho-paircoder` → `유준호님`
- `yoon-haneul-pm` → `윤하늘님`
- `team-meeting` → `팀 회의`

원칙:
- founder-facing 본문에는 display_name을 사용
- technical artifact / handoff metadata에는 agent_id 유지 가능

---

### Step 3 — 출력 envelope 설계
모든 OMX founder-facing 출력은 아래 envelope 중 하나를 따른다.

#### A. Team meeting envelope
- `팀 회의 종합`
- `결론`
- `{직원명} 종합/관점`
- `다음 단계`

#### B. Verification envelope
- `{직원명} 검증 메모`
- `결론`
- `확인한 것`
- `남은 리스크`
- `다음 단계`

#### C. Handoff envelope
- `OMX 실행실 handoff`
- `담당`
- `참여`
- `요약`
- `확인`
- `리스크`
- `다음`

---

### Step 4 — Prompt-level integration
`.codex/prompts/omx-company-adapter.md`를 기준으로, 실제 구현 시 아래 guardrail을 유지한다.

- canonical roster 문서 읽기
- founder-facing 이름 우선
- runtime role 직접 노출 금지
- shared-kernel 변경 제안은 분리

---

### Step 5 — Smoke output 작성
실제 runtime hooking 전에 먼저 sample output 3종을 만든다.

필수 sample:
1. team meeting output
2. verification output
3. handoff output

이 샘플은 `cross-runtime-review-checklist-v1.md`로 self-review 한다.

---

### Step 6 — Runtime touchpoint 연결
그 다음에야 실제 runtime touchpoint에 연결한다.

연결 후보:
- OMX team meeting 결과 정리 루틴
- review summary 루틴
- execution completion summary 루틴
- handoff 생성 루틴

원칙:
- runtime 내부 구조를 크게 바꾸지 말고, 마지막 사용자 노출 단계에서 wrapper를 적용한다.

---

## acceptance criteria
- founder-facing 출력 첫 3줄 안에 canonical employee name 또는 `팀 회의`가 있다
- runtime generic role이 본문 앞부분에 보이지 않는다
- 결론과 다음 행동이 항상 있다
- handoff에 owner/contributors가 canonical agent id 기준으로 적힌다
- cross-runtime review checklist에서 A/B/C/D/E 항목이 pass 이상이다

---

## 구현 순서 추천
1. sample outputs
2. review checklist self-check
3. runtime touchpoint 연결
4. Claude-side wording과 비교 검토
5. founder-facing drift 문서 패치
