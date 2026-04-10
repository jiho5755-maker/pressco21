# OMX Notify Poller v1

> 작성일: 2026-04-10  
> 범위: 스마트스토어 문의/Q&A + 메이크샵 문의/리뷰  
> 목적: 고객 문의와 리뷰를 주기 조회해 신규 건만 텔레그램으로 알리고, 처리 자체는 OMX에서 하도록 분리한다.

---

## 1. 운영 원칙

- 알림은 `실시간 webhook`이 아니라 `주기 조회` 방식이다.
- 처리 UI는 계속 `mini-app-v2 /omx`를 사용한다.
- 알림을 받아도 바로 발송하지 않고, OMX에서 최신 상태를 다시 확인한 뒤 답변한다.
- `다른 담당자가 이미 처리한 건`은 OMX 발송 직전 preflight에서 자동 차단한다.

즉 알림은 `빠른 인지`, OMX는 `안전한 처리`를 맡는다.

---

## 2. 현재 수집 대상

### 2.1 스마트스토어

- 고객 문의
- 상품 문의(Q&A)

가능:

- 조회
- 답변 등록/수정

제한:

- 공개 커머스 API current 문서 기준으로 리뷰 조회/답변 API는 현재 미확인

### 2.2 메이크샵

- `crm_board` 문의
- `review` 후기

가능:

- 조회
- 답변 등록

---

## 3. 워크플로우 자산

- workflow JSON:
  - `n8n-automation/workflows/automation/omx-new-items-alert.json`
- 이름:
  - `[OMX-NOTIFY-01] 스마트스토어·메이크샵 신규 문의 알림`

현재 기본 스케줄:

- `매시간 정시`

이 값은 운영이 안정되면 `30분` 또는 `15분`으로 줄일 수 있다.  
현재는 API 허용량과 운영 피로도를 고려해 `1시간` 기준으로 둔다.

---

## 4. 동작 방식

1. 스케줄 트리거가 실행된다.
2. 스마트스토어 fetch adapter를 호출한다.
3. 메이크샵 fetch adapter를 호출한다.
4. `OPEN` 상태만 대상으로 신규 건을 판별한다.
5. 첫 실행은 기존 누적 건을 `기준선`으로만 저장하고, 기본적으로 알림을 보내지 않는다.
6. 이후 새로 들어온 건만 텔레그램으로 묶어서 보낸다.
7. 담당자는 알림에서 OMX 링크를 열고 `지금 문의 가져오기`로 최신 상태를 확인한 뒤 처리한다.

---

## 5. 신규 판별 규칙

중복 판별 키:

- `channel:itemType:id`

예시:

- `smartstore:inquiry:qna_669968949`
- `makeshop:review:123456`

워크플로우는 `workflow static data`에 본 키를 저장한다.

- 45일보다 오래된 seen 데이터는 자동 정리
- 첫 실행은 `OMX_NOTIFY_INITIAL_SEED_QUIET=true`일 때 무음 기준선만 생성

즉 이미 존재하던 옛 문의 때문에 첫 실행에서 알림이 쏟아지지 않는다.

---

## 6. 알림 메시지 구성

메시지에는 아래를 담는다.

- 채널
- 문의/리뷰 구분
- 분류
- 고객명
- 상품명
- 제목
- 본문 요약
- 첨부 건수
- 접수 시각
- OMX 열기 링크

분류 기준:

- 사업자
- 불량
- 사용법
- 재고/입고
- 배송
- 교환/반품
- 후기
- 일반

이 분류는 OMX 내부 초안 흐름과 맞춘다.

---

## 7. 필요한 환경 변수

필수:

- `OMX_SHARED_KEY`
- `OMX_NOTIFY_CHAT_ID`

선택:

- `OMX_NOTIFY_N8N_BASE_URL`
  - 기본값: `https://n8n.pressco21.com`
- `OMX_NOTIFY_APP_URL`
  - 기본값: `https://mini.pressco21.com/omx`
- `OMX_NOTIFY_INCLUDE_MAKESHOP_REVIEWS`
  - 기본값: `true`
- `OMX_NOTIFY_MAX_LINES`
  - 기본값: `8`
- `OMX_NOTIFY_INITIAL_SEED_QUIET`
  - 기본값: `true`

현재 workflow는 `OMX_NOTIFY_CHAT_ID`가 없으면 실패하도록 fail-closed다.

---

## 8. 활성화 순서

1. n8n 운영 env에 `OMX_NOTIFY_CHAT_ID` 추가
2. alert workflow upsert
3. 첫 실행은 수동 실행으로 확인
4. 텔레그램 알림 포맷이 괜찮으면 workflow 활성화
5. OMX에서 실제로 새 문의를 처리해 end-to-end 확인

---

## 9. 운영 해석

- `알림이 왔다`:
  - 새 문의/리뷰가 감지된 것
- `OMX에 들어가니 이미 처리됨`:
  - 다른 담당자가 플랫폼 원문에서 먼저 답변했을 가능성
  - 정상 시나리오다
- `발송 직전 차단됨`:
  - 중복 답변 방지 장치가 정상 동작한 것

---

## 10. 후속 개선

- `새 문의 N건`을 OMX 상단에도 표시
- fetch adapter 실패 시 운영 알림 추가
- 스마트스토어 리뷰 API가 공식화되면 같은 poller에 바로 편입
