# 월말 매출 전수조사 Runner 고도화 계획 (2026-04-30)

## 배경

2026-04 월마감 전수조사 중 두 가지 운영 이슈가 확인됐다.

1. 쿠팡 OpenAPI 일시 미반영/휴지시간으로 일부 일자의 쿠팡 매출이 0원 또는 pending 상태로 남을 수 있다.
2. CRM 출고확정 메타 도입 후, 과거 완납건 마이그레이션 실행일이 `revenueRecognizedDate`로 기록되면 월중 매출이 특정일로 몰릴 수 있다.
3. Google Sheet H/I열처럼 API 원천이 없는 수기 채널(로켓배송/기타)은 F23 재집계 시 보존해야 하며, NocoDB `total_revenue`에도 포함돼야 한다.

이번 조치로 F23은 자동 채널(C:G)만 다시 쓰되 H/I 수기 채널은 읽어서 총매출과 NocoDB 보조 컬럼에 보존한다. CRM은 출고확정/매출반영 상태 자체는 유지하고, 마이그레이션으로 잘못 들어간 매출인식일만 명세표 작성일 기준으로 정정했다.

## 현재 운영 기준

### 일일 집계 F23

- 기준: 전일 확정 집계, 수동 웹훅은 `targetDate` 지정 가능
- 대상 채널:
  - 메이크샵
  - 스마트스토어
  - 11번가
  - CRM/직접거래
  - 쿠팡윙
  - 로켓배송/기타 수기 채널은 Sheet H/I 보존값으로 총계 포함
- 저장:
  - Google Sheet `일별 매출!C:G` 자동 채널만 갱신
  - NocoDB `daily_sales` upsert
  - 중복 NocoDB row는 최신 row 유지 후 정리

### 쿠팡 백필 F23B

- 최근 3개 확정일을 항상 점검한다.
- 문제가 있을 때만 운영 알림을 보낸다.
- 문제가 없으면 Telegram 운영알림을 보내지 않는다.
- 정정이 발생하면 기존 총매출/쿠팡 금액과 정정 후 금액을 같이 알린다.

## 월말 Runner 목표

월말 Runner(F27 예정)는 “그 달 데이터를 다시 쓰는 도구”가 아니라 “원천 재조회 → 차이 산출 → 안전 반영 → 증빙 저장” 흐름이어야 한다.

### 1단계: 읽기 전용 전수 진단

- 기간: `YYYY-MM-01`부터 마지막 닫힌 일자까지
- 원천별 fresh read:
  - 메이크샵 주문 상태별 매출
  - 스마트스토어 주문/클레임
  - 11번가 다중 주문 endpoint + 클레임 endpoint
  - 쿠팡 주문/반품/취소 또는 정산 endpoint
  - CRM invoice meta 기준 매출인식일
  - Google Sheet H/I 수기 채널
- 산출물:
  - 채널별 기존값/원천값/diff
  - total formula 검증
  - NocoDB 중복 row 검증
  - Sheet C:G와 NocoDB 자동 채널 불일치 검증
  - 수기 채널 H/I 누락 여부 검증

### 2단계: 승인 가능한 반영 계획 생성

- diff가 있는 날짜만 patch plan을 만든다.
- plan에는 다음을 포함한다.
  - 날짜
  - 채널
  - 기존 금액/건수
  - 신규 금액/건수
  - 증감액
  - 원천 API와 기준 필드
  - 취소/반품/교환에 의한 감소인지, 지연 반영에 의한 증가인지
- CRM은 `shipment_confirmed + posted`만 매출 반영한다.
- CRM 마이그레이션/운영 보정은 `revenueRecognizedDate`가 실행일로 몰리지 않았는지 별도 검사한다.

### 3단계: 안전 반영

- 반영 순서:
  1. NocoDB backup
  2. Google Sheet snapshot
  3. NocoDB patch
  4. Google Sheet C:G patch
  5. NocoDB/Sheet 재조회 검증
  6. 운영 알림은 변경 또는 오류가 있을 때만 발송
- Sheet H/I는 자동 갱신하지 않는다.
- total은 항상 다음 공식으로 검증한다.

```text
total_revenue = makeshop + naver + st11 + crm + coupang + rocket + legacy_others
```

## 취소/반품/교환 지표 고도화

월말에는 단순 매출 합계뿐 아니라 “정정된 매출의 원인”을 저장해야 한다.

### 제안 컬럼 또는 보조 테이블

`daily_sales_adjustments` 또는 월말 감사 artifact에 아래 지표를 저장한다.

- `gross_revenue`: 최초 주문 기준 총매출
- `net_revenue`: 취소/반품/교환 반영 후 순매출
- `cancel_amount`, `cancel_count`
- `return_amount`, `return_count`
- `exchange_count`
- `adjustment_amount`: 월말 전수조사 정정액
- `adjustment_reason`: delayed_api, cancel, return, exchange, crm_revenue_date, manual_channel_preserve 등
- `source_channel`: makeshop, naver, st11, coupang, crm, manual

### 운영 지표

- 채널별 취소율 = `cancel_amount / gross_revenue`
- 채널별 반품율 = `return_amount / gross_revenue`
- 순매출 기여율 = `net_revenue / 전체 net_revenue`
- 월말 정정률 = `abs(adjustment_amount) / 월중 provisional total`

## 추천 스케줄

- 매일 08:00: F23 전일 확정 집계
- 매일 19:30: F23B 최근 3개 확정일 쿠팡/시트 백필 점검
- 매월 1일 08:30: 전월 1차 전수조사(D+1)
- 매월 3일 08:30: 전월 2차 전수조사(D+3, 지연 API 반영)
- 매월 7일 08:30: 전월 최종 전수조사(D+7, 반품/취소 안정화)

## 2026-04 월마감 교훈

- 월말 재집계 전에 CRM 메타의 `revenueRecognizedDate` 분포를 먼저 검사해야 한다.
- 과거 데이터 마이그레이션은 실행일을 매출일로 넣으면 안 된다. 원칙적으로 명세표 작성일 또는 실제 출고확정일 중 회계 기준으로 정한 날짜를 사용한다.
- F23처럼 자동 채널만 갱신하는 워크플로우도 수기 채널을 total에 포함해 보존해야 한다.
- 운영 알림은 “문제 없음”까지 보내면 알림 피로가 생기므로, 오류/정정/미해결이 있을 때만 보낸다.
