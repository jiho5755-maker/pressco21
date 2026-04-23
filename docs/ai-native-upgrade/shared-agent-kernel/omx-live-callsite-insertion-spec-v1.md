# OMX Live Call-Site Insertion Spec v1

> 목적: 실제 OMX 결과 흐름에 founder-facing wrapper를 연결할 때 어떤 방식으로 호출하면 되는지 call-site 관점에서 정리한다.

## 기본 원칙
- 내부 결과 생성 → structured payload 생성/정규화 → founder-facing live wrapper 호출
- JSON payload가 있으면 `_tools/omx-founder-facing-live.sh --stdin-json`를 우선 사용
- handoff markdown이 이미 있으면 `_tools/omx-founder-facing-live.sh --input <latest.md>` 사용

---

## Pattern A — Team meeting call-site

### 내부 결과 준비
최종 synthesis 직전에 아래 payload를 만든다.

```json
{
  "type": "team_meeting",
  "owner": "han-jihoon-cso",
  "details": [
    {"agent_id": "han-jihoon-cso", "heading": "한지훈님 종합", "text": "..."},
    {"agent_id": "park-seoyeon-cfo", "heading": "박서연님 관점", "text": "..."}
  ],
  "summary": "...",
  "risk": ["..."],
  "next": ["..."]
}
```

### 호출
```bash
printf '%s' "$TEAM_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

---

## Pattern B — Verification call-site

### 내부 결과 준비
```json
{
  "type": "verification",
  "owner": "choi-minseok-cto",
  "checks": ["...", "..."],
  "risk": ["..."],
  "next": ["..."]
}
```

### 호출
```bash
printf '%s' "$VERIFY_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

---

## Pattern C — Handoff call-site

### markdown latest handoff가 이미 존재할 때
```bash
bash _tools/omx-founder-facing-live.sh --input team/handoffs/latest.md
```

### structured payload에서 직접 handoff 요약을 만들 때
```json
{
  "type": "handoff",
  "owner": "yoo-junho-paircoder",
  "participants": ["yoon-haneul-pm"],
  "summary": "...",
  "checks": ["..."],
  "risk": ["..."],
  "next": ["..."]
}
```

---

## Pattern D — Execution completion call-site

### 내부 결과 준비
```json
{
  "type": "execution_report",
  "owner": "yoo-junho-paircoder",
  "summary": "...",
  "checks": ["..."],
  "risk": ["..."],
  "next": ["..."]
}
```

### 호출
```bash
printf '%s' "$REPORT_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

---

## normalization helper를 왜 쓰는가
call-site마다 field 이름이 조금씩 다를 수 있다.

예:
- `type` / `context_type`
- `owner` / `owner_agent_id`
- `checks` / `verification`
- `risk` / `risks`
- `next` / `next_steps`

이 차이를 runtime call-site에서 일일이 맞추기보다, `omx-founder-facing-live.sh --stdin-json`가 내부적으로 normalize 후 render 하도록 두는 게 가장 안전하다.

---

## 추천 순서
1. 실제 OMX 내부 결과를 alias-friendly JSON으로 모은다
2. live wrapper로 founder-facing output 생성
3. smoke/runbook 기준으로 검증
4. 이상 없으면 해당 call-site에 고정 연결
