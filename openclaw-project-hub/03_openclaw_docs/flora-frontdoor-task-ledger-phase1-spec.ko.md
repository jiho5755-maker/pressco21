# Flora Frontdoor -> Task Ledger Phase 1 구현 스펙 v0.1

> 상태: Draft  
> 성격: 구현 스펙  
> 상위 PRD: [flora-orchestration-service-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-prd.ko.md)  
> 상위 기준 문서: [flora-orchestration-service-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-master-plan.ko.md)

---

## 1. 이 스펙의 목적

이 문서는

`Telegram 메모 -> flora-frontdoor secretary 응답 -> source_messages 기록 -> task ledger 적재 -> briefing 반영`

까지의 닫힌 루프를 가장 저비용으로 구현하기 위한 1차 스펙이다.

핵심은 아래 두 가지다.

1. 플로라가 잘 정리한 메모가 실제 업무 원장까지 남게 한다.
2. 나중에 assignment / approval / event log 확장으로 자연스럽게 올라갈 수 있게 만든다.

---

## 2. 현재 상태

현재 이미 가능한 것:

- `flora-frontdoor`는 secretary-style 첫 응답이 가능하다
- `flora-todo-mvp`는 `source_messages`, `POST /api/ingest`, `POST /api/automation/tasks`를 갖고 있다
- `flora-local-dev-worker`는 개발 요청 실행 경로가 있다

현재 부족한 것:

- frontdoor 메모가 항상 task ledger에 적재되지 않는다
- source message와 frontdoor 응답 결과가 업무 원장과 안정적으로 연결되지 않는다
- dev request / approval candidate / delegation candidate가 원장 구조와 분리돼 있다
- Telegram DM이 `main` 세션으로 뭉치면 sender/message metadata를 잃거나 fallback 비율이 올라갈 수 있다

---

## 3. Phase 1 범위

이번 스펙의 구현 범위는 아래만 포함한다.

### 포함

- Telegram 메모 원문 저장
- freeform memo ingest
- frontdoor 응답 후 task ledger 반영
- 최소 메타데이터 저장
- briefing 재반영 가능성 확보

### 제외

- assignment 전용 테이블
- approval 전용 테이블
- event log 전용 테이블
- Mini App 신규 화면 구현
- 팀 사용자 오픈
- 메일 발송/브라우저 자동화 실행

즉, 이번 Phase 1은 `원장 적재 닫기`에만 집중한다.

---

## 4. 설계 원칙

1. 새 시스템을 만들지 않는다
2. 기존 `flora-todo-mvp` API와 저장 구조를 최대한 활용한다
3. 구조화는 1차는 `detailsJson`과 `metadata`를 사용한다
4. source message는 항상 남긴다
5. frontdoor 응답 품질을 낮추지 않는다
6. 나중에 정규화 테이블로 올리기 쉬운 필드명을 미리 통일한다

---

## 5. 권장 처리 흐름

## 5.1 메인 자유 메모

```text
Telegram message
  -> flora-frontdoor
  -> secretary response 생성
  -> source_message upsert
  -> /api/ingest 호출
  -> task / reminder / follow-up 생성
  -> briefing source 반영
```

### 5.2 개발 요청

```text
Telegram message
  -> flora-frontdoor
  -> "개발 요청" 판단
  -> source_message upsert
  -> /api/automation/tasks 에 dev task 등록
  -> dispatcher / local dev worker queue 전달
```

### 5.3 명시적 위임/승인 후보

```text
Telegram message
  -> flora-frontdoor
  -> source_message upsert
  -> /api/ingest 또는 /api/automation/tasks 적재
  -> detailsJson/metadata에 assignmentCandidate / approvalCandidate 저장
```

---

## 6. API 사용 전략

Phase 1에서는 기존 API를 아래처럼 쓴다.

### 6.1 `/api/automation/source-messages`

용도:

- frontdoor가 받은 원문과 응답 컨텍스트를 안정적으로 남긴다

반드시 포함해야 할 값:

- `sourceChannel`
- `sourceMessageId`
- `messageText`
- `userChatId`
- `userName`
- `agentId`
- `sourceCreatedAt`
- `metadata.capturePath`

권장 추가 metadata:

- `requestType`
- `specialistMode`
- `briefingBucket`
- `delegationCandidate`
- `approvalCandidate`

### 6.2 `/api/ingest`

용도:

- 자유 메모를 자동 구조화해서 task / reminder / follow-up 생성

적합한 상황:

- 자유 메모
- 혼합 메모
- “두서없이 정리해줘”형 입력

추가 원칙:

- `metadata`는 source_messages 쪽 복구/검색용 컨텍스트로 본다
- task ledger에 바로 남겨야 하는 분류 힌트는 `detailsMerge`로 함께 전달한다
- 최소 권장 `detailsMerge`는 `requestType`, `briefingBucket`, `assignmentCandidate`, `approvalCandidate`, `executionRoute`다

### 6.3 `/api/automation/tasks`

용도:

- 구조가 더 명확한 task를 직접 적재

적합한 상황:

- 개발 요청
- 명시적 할 일
- 후속 체크가 분명한 업무

---

## 7. Phase 1 데이터 계약

현재 `IngestRequestBody`는 최소 필드만 가진다.

Phase 1에서는 API 스키마를 크게 흔들지 않고,
아래 정보를 임시로 `metadata` 또는 `detailsMerge/detailsJson`에 넣는 전략을 쓴다.

### 7.1 Source Message metadata

```json
{
  "capturePath": "flora-frontdoor",
  "requestType": "freeform-memo | dev-request | meeting | delegation",
  "specialistMode": "executive-orchestrator | crm-ops | storefront-ops | ...",
  "briefingBucket": "today | waiting | approval | dev",
  "delegationCandidate": {
    "owner": "design | video | logistics | dev | owner"
  },
  "approvalCandidate": {
    "required": true,
    "owner": "owner"
  }
}
```

### 7.2 Task detailsJson

```json
{
  "parserStatus": "structured",
  "normalizedText": "...",
  "requestType": "freeform-memo",
  "briefingBucket": "today",
  "assignmentCandidate": {
    "owner": "design",
    "team": "creative"
  },
  "approvalCandidate": {
    "required": false,
    "owner": null
  },
  "executionRoute": {
    "kind": "manual | dev-worker | review"
  }
}
```

원칙:

- Phase 1에서는 이 값들을 정규화 테이블 대신 JSON 필드에 저장한다
- Phase 2에서 `assignment`, `approval`, `event_log` 테이블로 올린다

### 7.3 안정 ID / 재시도 규칙

- `sourceChannel + sourceMessageId`는 같은 입력을 다시 보내도 같은 건으로 인식되는 기준 키다
- 발신단은 가능하면 Telegram message id를 그대로 `sourceMessageId`로 보낸다
- OpenClaw가 user message 앞에 붙이는 `Conversation info (untrusted metadata)` 블록이 있으면 wrapper가 여기서 `message_id`, `sender_id`, `timestamp`를 우선 추출한다
- wrapper는 metadata block은 relay 전에 제거하고, 실제 사용자 본문만 `messageText`로 적재한다
- 게이트웨이 `session.dmScope`는 `per-channel-peer`를 기본값으로 고정해 Telegram DM을 사용자별 세션으로 분리한다
- message id를 직접 모르면 `userChatId:sourceCreatedAt` fallback을 쓴다
- source_message upsert와 ingest는 같은 키로 재호출돼도 중복 task 폭증이 나지 않아야 한다

### 7.4 sourceChannel 권장값

초기 권장값은 아래로 통일한다.

- `telegram-flora`
- `telegram-flora-codex`
- `telegram-flora-claude`
- `miniapp-flora`
- `server-automation`

이 값이 흔들리면 briefing, 검색, 복구 화면이 같이 흔들린다

---

## 8. Frontdoor 응답 규칙

Phase 1에서도 응답 형식은 계속 비서형으로 유지한다.

권장 기본 구조:

1. `지금 상황 한 줄`
2. `오늘 우선순위`
3. `위임/연결`
4. `보류/나중`
5. `제가 바로 해둘 것`

중요:

- 응답과 적재는 둘 다 일어나야 한다
- 응답이 좋더라도 원장 적재가 빠지면 실패다

---

## 9. 업무 분류 규칙

Phase 1에서는 아래 4분류만 먼저 쓴다.

### 9.1 today

- 오늘 바로 해야 하는 일

### 9.2 waiting

- 누군가 답변/자료/확인을 줘야 하는 일

### 9.3 approval

- 대표 확인 또는 승인 필요 일

### 9.4 dev

- Codex/Claude 실행이 필요한 일

이 분류는 source message metadata와 task detailsJson 양쪽에 남길 수 있다.

---

## 10. 구현 우선순위

### Step 1. source message 발신 메타데이터 보강

해야 할 것:

- frontdoor 발신단에서 `sourceMessageId`, `sourceCreatedAt`, `userChatId`, `userName` 누락 여부 점검
- 누락 시 fallback 규칙 고정

완료 기준:

- source message가 recovery 가능한 수준으로 남는다

### Step 2. freeform memo ingest 자동 연결

해야 할 것:

- frontdoor가 자유 메모를 받으면 `/api/ingest` 또는 equivalent 경로로 적재
- 실제 frontdoor runtime에서는 `log-flora-frontdoor-turn.py` wrapper를 써서
  `응답 초안 저장 -> relay 호출 -> 최종 응답` 순서로 닫는다
- Telegram 채널은 `streaming=off`로 고정해 내부 commentary, 도구 실행 로그, preview payload가 사용자에게 노출되지 않게 한다

완료 기준:

- 텔레그램 메모 1건이 task ledger에 자동 생성된다
- 텔레그램에는 최종 답변 1개만 보이고, 내부 도구 출력은 보이지 않는다

### Step 3. dev request direct automation task 연결

해야 할 것:

- 개발 요청은 `/api/automation/tasks`에 직접 남기고 dev worker로도 넘긴다

완료 기준:

- 개발 요청함과 dev worker 실행이 같은 source message를 공유한다

### Step 4. briefing source 재활용

해야 할 것:

- dashboard / morning briefing에서 `briefingBucket`을 읽을 수 있게 기준 확정

완료 기준:

- 적재된 메모가 다시 브리핑에 잡힌다

### Step 5. 실패 복구 경로 확인

해야 할 것:

- source_message 저장 성공 후 ingest 실패 시 recovery 검색 경로 확인
- 같은 `sourceMessageId`로 재시도했을 때 중복 폭증이 없는지 확인

완료 기준:

- half-success 상황을 운영에서 다시 닫을 수 있다

---

## 11. 검증 시나리오

### 시나리오 A. 자유 메모

입력:

`오늘 협회 제안서도 봐야 하고 CRM 거래명세서도 점검해야 하고 샘플 발주도 확인해야 해`

검증:

- source_message 생성
- task 2건 이상 생성
- waiting 또는 today bucket 분류
- frontdoor 응답 정상
- frontdoor 세션에서 wrapper 실행 흔적 확인

### 시나리오 B. 개발 요청

입력:

`CRM 거래명세서 인쇄 흐름 점검하고 수정 필요하면 바로 잡아줘`

검증:

- source_message 생성
- automation task 생성
- dev bucket 분류
- local dev worker queue 전달
- frontdoor 세션에서 `requestType=dev-request` capture 실행 흔적 확인

### 시나리오 C. 승인 후보

입력:

`이건 대표 확인 받고 고객 안내문 보내야 해`

검증:

- approvalCandidate metadata 저장
- approval bucket 분류

---

## 12. Phase 1 성공 기준

1. 메인 텔레그램 메모가 원장에 남는다
2. source_message와 task가 같은 입력 기준으로 연결된다
3. frontdoor 응답 품질이 떨어지지 않는다
4. 개발 요청은 task ledger와 dev worker 양쪽에서 추적 가능하다
5. 다음 Phase에서 assignment / approval / event log 정규화로 올라갈 수 있다

---

## 13. 다음 Phase와의 연결

Phase 1이 끝나면 다음으로 넘어간다.

### Phase 2

- `assignment` 정규화
- `approval` 정규화
- `event_log` 정규화

### Phase 3

- Telegram Mini App MVP

### Phase 4

- 메일 초안 -> 승인 -> 발송
- 서버 Playwright 조회/보조 실행
- 모바일 중심 운영 자동화

즉, 이번 스펙은 전체 서비스의 첫 연결 고리다.
