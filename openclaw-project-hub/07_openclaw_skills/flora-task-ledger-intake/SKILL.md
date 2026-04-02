---
name: flora-task-ledger-intake
description: >
  플로라 frontdoor가 자유 메모, 실행 요청, 개발 요청을 응답 직후 task ledger에 자동 적재할 때 쓰는 스킬.
  현재 turn의 사용자 원문과 최종 답변 초안을 파일로 저장한 뒤,
  log-flora-frontdoor-turn.py wrapper를 실행해 source_message와 ingest를 닫는다.
---

# Flora Task Ledger Intake

frontdoor turn을 `응답 + 원장 적재`까지 함께 닫는 스킬이다.

## 언제 써야 하나

아래 요청은 기본적으로 적재 대상이다.

- 자유 메모
- `정리해줘`, `메모해둘게`, `두서없이 말할게`
- 명시적 할 일/후속 조치
- 개발 요청
- 위임/승인 판단이 필요한 요청

아래는 기본적으로 적재하지 않아도 된다.

- 짧은 잡담
- 단순 정보 질의
- 가벼운 인사

## 적재 전 분류

- `requestType`
  - `freeform-memo`: 기본값
  - `dev-request`: Codex/Claude 실행이 필요한 요청
  - `delegation`: 위임이 핵심인 요청
  - `meeting`: 일정/회의/조율 성격
- `specialistMode`
  - 현재 turn에서 고른 전문 모드와 같게 유지
- `executionRoute`
  - `manual`: 기본값
  - `dev-worker`: 개발 실행이 필요한 경우
  - `review`: 승인/검토가 먼저인 경우
- `briefingBucket`
  - `approval`: 승인 필요
  - `dev`: 개발 요청
  - `waiting`: 누군가의 답변/자료 대기
  - `today`: 그 외 기본값

## 실행 순서

1. 사용자 원문을 임시 파일로 저장한다.
2. 최종으로 보낼 답변 초안을 임시 파일로 저장한다.
3. 아래 wrapper를 실행한다.

```bash
python3 /home/ubuntu/.openclaw/workspace-flora-frontdoor/log-flora-frontdoor-turn.py \
  --message-file /home/ubuntu/.openclaw/workspace-flora-frontdoor/.frontdoor-turn/user-message.txt \
  --reply-file /home/ubuntu/.openclaw/workspace-flora-frontdoor/.frontdoor-turn/reply.txt \
  --request-type freeform-memo \
  --specialist-mode executive-orchestrator \
  --briefing-bucket today \
  --execution-route manual
```

4. wrapper 성공을 확인한 뒤 같은 내용으로 최종 답변을 보낸다.

## 추가 규칙

- 적재는 내부 작업이다. `정리 답변을 만들고 적재하겠습니다` 같은 중간 안내 문장을 먼저 보내지 않는다.
- 사용자에게 보내는 payload는 최종 답변 1개만 남기는 것을 목표로 한다.
- `원장 적재`, `wrapper`, `webhook`, `파일 저장`, `git`, `커밋` 같은 내부 실행 사실을 사용자에게 말하지 않는다.
- `userChatId`를 현재 세션에서 알 수 있으면 함께 보낸다.
- `sourceMessageId`를 알 수 있으면 Telegram message id를 그대로 쓴다.
- 둘 다 모르면 wrapper/relay의 fallback을 허용한다.
- 개발 요청은 `executionRoute=dev-worker`, `briefingBucket=dev`를 우선한다.
- 승인이 먼저면 `executionRoute=review`, `briefingBucket=approval`를 우선한다.

## 실패 시

- wrapper 실패 시 한 번만 재시도한다.
- 그래도 실패하면 사용자 응답은 유지하되, 같은 turn에서 추가 도구 호출로 무한 반복하지 않는다.
