# 파트너클래스 상세 상용화 감사 보고서

작성일: 2026-03-08 (KST)
대상: `파트너클래스/상세/`, `파트너클래스/n8n-workflows/WF-01-class-api.json`
검증 방식: 코드 대조, 문서 대조, Playwright 실페이지 확인, `curl` 엔드포인트 확인

## 결론

2026년 3월 8일 기준 파트너클래스 상세 페이지는 "상세 전환 UX 부족" 이전에 "상세 데이터를 아예 못 불러오는 운영 장애"가 먼저 존재했다. 이 상태에서는 예약 전환율 문제가 아니라 매출 자체가 막힌다.

이번 작업에서 로컬 기준으로 아래 두 축을 동시에 보강했다.

1. `WF-01`을 프론트엔드 호출 방식과 맞춰 `POST body`를 정상 해석하도록 수정
2. 상세 페이지를 실제 예약 전환 페이지처럼 동작하도록 일정/시간/잔여석/FAQ/신뢰정보를 보강

## 실서비스에서 확인한 치명 이슈

### 1. 상세 API가 live에서 500으로 실패

- 확인 일시: 2026-03-08 KST
- 확인 URL: `https://foreverlove.co.kr/shop/page.html?id=2607&class_id=CL_202602_001`
- 증상: 상세 페이지가 에러 상태로만 노출됨
- 실제 응답:

```text
POST https://n8n.pressco21.com/webhook/class-api
HTTP/1.1 500 Internal Server Error
{"code":0,"message":"Could not find property option"}
```

### 2. 원인: `WF-01` 정의와 프론트 호출 규약 불일치

- 프론트엔드 `목록/js.js`, `상세/js.js` 는 `POST` JSON body 로 `action`, `id` 를 보냄
- 기존 `WF-01-class-api.json` 은 `GET` webhook + `$json.query.action` 기준으로 분기하고 있었음
- 결과적으로 n8n Switch/Code 노드가 body 기반 요청을 정상 해석하지 못함

### 3. 카카오 공유도 현재 그대로는 운영 불가

- Kakao SDK SRI hash 가 맞지 않아 브라우저에서 스크립트가 차단됨
- JS 내부 `KAKAO_JS_KEY` 도 플레이스홀더 상태라, 설령 SDK가 로드돼도 실제 공유가 동작하지 않음

### 4. API가 살아나도 강사/문의 정보가 비는 구조

- 상세 JS는 `partner.name`, `partner.region` 을 기대
- `WF-01` 응답은 `partner.partner_name`, `partner.location` 기준
- 강의등록에서 저장하는 `contact_instagram`, `contact_phone`, `contact_kakao` 도 상세 응답에 빠져 있었음

### 5. PRD상 핵심 기능이 상세 페이지에 미반영

- 일정 데이터가 있어도 날짜 비활성/시간선택/잔여석 반영이 없었음
- FAQ 섹션 부재
- 준비물/재료 안내가 텍스트 의미를 잘못 해석하고 있었음
- 예약 패널이 가격과 버튼만 보여줘 상용 전환 페이지로는 설득력이 약했음

## 이번에 반영한 로컬 수정

## 1. 백엔드 워크플로우 정합화

파일: `파트너클래스/n8n-workflows/WF-01-class-api.json`

- webhook method 를 `POST` 로 맞춤
- action 파싱을 `body -> query -> root` 순서로 모두 허용
- `getClasses`, `getClassDetail`, fallback 모두 POST body 호환
- 상세 응답에 아래 상용 필드를 추가 노출
  - `schedule_desc`
  - `contact_instagram`
  - `contact_phone`
  - `contact_kakao`
  - `faq_items`
  - `kit_enabled`
  - `kit_items`

## 2. 상세 페이지 전환 구조 개편

파일: `파트너클래스/상세/Index.html`

- 클래스 핵심 포인트 섹션 추가
- FAQ 섹션 추가
- 예약 패널에 시간 선택, 일정 상태, 운영 신뢰 포인트 영역 추가
- Kakao SDK SRI hash 교정

파일: `파트너클래스/상세/css.css`

- 전환 카드형 핵심 포인트 스타일 추가
- FAQ 아코디언 스타일 추가
- 일정 상태/시간 선택/신뢰 박스 스타일 추가
- 모바일 대응 포함

파일: `파트너클래스/상세/js.js`

- 일정 데이터 정규화 헬퍼 추가
- 일정이 있을 경우:
  - 예약 가능한 날짜만 활성화
  - 날짜 선택 후 시간 선택
  - 시간별 잔여석 반영
  - 선택 일정 기준 최대 예약 인원 제한
  - `schedule_id`, `schedule_time` 를 예약 기록 payload 에 포함
- 일정이 없을 경우:
  - 기존 날짜 기반 예약 흐름 유지
  - `schedule_desc` 기반 안내 문구 노출
- 강사/공방 렌더링을 실제 API 필드명과 맞춤
- 문의 버튼을 클래스/파트너 데이터에서 모두 읽도록 보강
- FAQ 자동 생성 로직 추가
- Schema.org FAQ 스키마도 실제 FAQ 기준으로 변경
- 재료 안내 문구를 "포함/별도/준비물 안내" 의미에 맞게 재정리
- Kakao key 미설정 시 카카오 버튼을 숨기고 링크복사만 남기도록 처리
- `showToast` 미정의 참조 버그 제거

## 상용 관점 점검 결과

### 작업 전

- 가동성: 1/5
- 예약 전환 준비도: 2/5
- 운영 신뢰도: 2/5

### 이번 수정 배포 후 기대 상태

- 가동성: 4/5
- 예약 전환 준비도: 4/5
- 운영 신뢰도: 4/5

## 아직 남아 있는 실제 운영 TODO

### 즉시 배포 필요

1. `WF-01-class-api.json` 을 n8n 에 재임포트 또는 수동 반영
2. `파트너클래스/상세/Index.html`, `css.css`, `js.js` 를 메이크샵 2607 페이지에 반영

### 운영 키/설정 필요

1. `window.PRESSCO21_KAKAO_JS_KEY` 형태로 실제 Kakao JS key 주입
2. `tbl_Classes.contact_*`, `faq_items`, `schedule_desc` 데이터 실제 입력 검수

### 다음 매출 개선 우선순위

1. `WF-01` 에 실제 `reviews[]` 배열까지 조인해 후기 카드 실데이터 표시
2. `kit_enabled`, `kit_items` 기반 자동배송 배지/수익 안내 연결
3. 목록 페이지에서도 `WF-01` 복구 확인 후 일정/잔여석 뱃지 동기화 검수
4. `WF-04` 와 `WF-05` 에서 `schedule_id` 기준 정합성 검증

## 권장 배포 순서

1. `WF-01` 반영
2. live `class-api` `POST` 수동 검증
3. 메이크샵 2607 배포
4. 실제 클래스 1건으로 날짜 선택 -> 시간 선택 -> 예약 -> 주문 진입 E2E 확인

## 참고 메모

- 현재 실서비스 장애는 프론트 문제보다 `WF-01` 정합성 문제가 더 크다.
- 이번 프론트 수정은 API가 복구되면 바로 매출 전환에 기여하는 형태로 맞춰 두었다.
- 즉, 우선순위는 "디자인"이 아니라 "WF-01 복구 -> 상세 배포 -> 실예약 검증" 순서다.
