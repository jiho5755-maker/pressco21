# 월마감 매출 전수조사 운영 플레이북

> 작성: 2026-04-17  
> 목적: 월마감 때 API 한도에 걸리지 않고, 자동/API 채널과 수기 채널을 안전하게 검증·백필·반영하기 위한 운영 표준  
> 적용 대상: `일별 매출` Google Sheet, NocoDB `daily_sales`, n8n F23/F24/F26 매출 자동화

---

## 1. 결론 요약

월마감 전수조사는 “한 번에 모든 API를 무제한 호출”하면 안 된다.

권장 방식:

```text
1. 매일 F23으로 전일 매출 증분 수집
2. 매주 F26으로 최근 14일 상태 변경 백필
3. 월마감 시에는 전월 1일~말일만 채널별 감사 collector 실행
4. API 오류일은 기존값 보존
5. 오류 없는 일자만 Sheets/NocoDB 반영
6. 최종 diff 리포트 확인 후 월마감 확정
```

---

## 2. 실험 결과 요약 (2026-04-17)

| 채널 | 실험 결과 | 결론 |
|---|---|---|
| MakeShop | 로컬/서버 호출 가능, 일별 조회 안정적 | 전수조사 가능. 단 500건 초과 pagination 확인 필요 |
| Naver Commerce | 로컬 IP는 `GW.IP_NOT_ALLOWED`, Oracle/n8n에서 호출 가능. 1.4초 throttle로 106일 조회 성공 | Oracle/n8n에서 14~16일 청크 + throttle |
| 11번가 | `/complete` 단독 조회는 누락. `dlvcompleted`, `completed`에서 실제 매출 확인 | 복수 endpoint + dedupe 필수 |
| Coupang WING | 로컬 IP 403, Oracle/n8n에서 호출 가능. multi-status 전수조회는 429 다수. `FINAL_DELIVERY` 단독 저속 조회는 106일 무오류 | 월마감 과거 확정분은 `FINAL_DELIVERY` 우선, 최근일만 상태 추가 |
| CRM/NocoDB | 단일 조회 안정적 | 빠르게 전수조사 가능 |
| 로켓배송/기타 | API 원천 없음 | H/I 수기값 보존 |

---

## 3. 월마감 기준일

| 실행 시점 | 권장도 | 이유 |
|---|---|---|
| 매월 1일 오전 | 낮음 | 전월 말 주문이 아직 배송/구매확정 전일 수 있음 |
| 매월 3~5일 | 높음 | 전월 주문의 상태 변경이 대부분 반영됨 |
| 매월 7일 이후 | 매우 높음 | 배송완료/구매확정/클레임 반영 안정적 |

권장:

```text
월마감 1차: 다음달 3일
월마감 확정: 다음달 7일
```

---

## 4. 채널별 월마감 조회 전략

### 4.1 MakeShop

- 일자별 조회 가능
- 확정 기준: `order_status` 또는 `ord_state`가 `Y`
- 금액 우선순위: `pay_price > total_product_price > start_price`
- 하루 주문 500건 초과 가능성이 있으면 pagination/limit 확인 필요

### 4.2 Naver Commerce

- 로컬 맥 IP는 `GW.IP_NOT_ALLOWED`
- 운영 Oracle/n8n IP에서 호출
- 주문조회 일 단위 반복 호출은 429 가능
- 권장:
  - 14~16일 단위 청크
  - 일자별 호출 사이 최소 1.4초 이상 지연
  - 실패일만 재시도
- 제외 상태:
  - `CANCELED`, `RETURNED`, `EXCHANGED`, `CANCEL_REQUEST`, `RETURN_REQUEST`, `CANCEL_DONE`
- 금액: `productOrder.totalPaymentAmount`

### 4.3 11번가

`/ordservices/complete`만으로 정상 매출을 보면 안 된다.

정상 매출 조회 endpoint:

```text
/ordservices/complete/{startTime}/{endTime}
/ordservices/packaging/{startTime}/{endTime}
/ordservices/shipping/{startTime}/{endTime}
/ordservices/dlvcompleted/{startTime}/{endTime}
/ordservices/completed/{startTime}/{endTime}
/ordservices/reservatecomplete/{startTime}/{endTime}
```

운영 기준:

- 7일 단위 청크
- `ordNo + ordPrdSeq`로 중복 제거
- `ordDt` 기준 일별 귀속
- 금액 우선순위: `ordAmt > ordPayAmt > prdPayAmt > selPrc`

클레임 endpoint:

```text
/claimservice/cancelorders/{startTime}/{endTime}
/claimservice/canceledorders/{startTime}/{endTime}
/claimservice/returnorders/{startTime}/{endTime}
/claimservice/returnedorders/{startTime}/{endTime}
/claimservice/exchangeorders/{startTime}/{endTime}
/claimservice/exchangedorders/{startTime}/{endTime}
```

정산 endpoint는 매출이 아니라 정산/수수료 분석으로 분리한다.

```text
/settlement/settlementList/{YYYYMMDD}/{YYYYMMDD}
```

2026-04 실측 교훈:

- `/complete`만 보면 0원처럼 보였음
- 실제 매출은 `dlvcompleted`, `completed`에 있었음
- 2026-04-01~2026-04-16 API 기준 11번가 매출: `707,600원`

### 4.4 Coupang WING

- 로컬 맥 IP는 403 `IP_NOT_ALLOWED`
- Oracle/n8n IP에서 호출
- n8n Code 런타임에 `URLSearchParams` 없음
- `status=ALL` 안 됨
- 상태별 호출 필요

사용 상태:

```text
ACCEPT
INSTRUCT
DEPARTURE
DELIVERING
FINAL_DELIVERY
NONE_TRACKING
```

월마감 효율 전략:

```text
1. 전월 전체를 FINAL_DELIVERY 단독으로 저속 조회
2. 전월 마지막 7~10일만 ACCEPT/INSTRUCT/DEPARTURE/DELIVERING/NONE_TRACKING 추가 조회
3. 429 발생 시 해당 날짜/상태만 retry queue
4. 기존값을 0으로 덮지 않음
```

실험 결과:

| 방식 | 결과 |
|---|---|
| 106일 × 6상태 빠른 조회 | 429 다수 발생 |
| 106일 × FINAL_DELIVERY 단독 + 1.2초 지연 | 오류 0, 총 26,808,010원 확인 |

비즈니스 휴지시간:

```text
14:30~19:00 KST: 사방넷/출고 연동 시간
매출 자동화 쿠팡 API 호출 금지
기존값 유지 후 19시 이후 백필
```

### 4.5 CRM/NocoDB 직접거래

- `invoice_date` 기준 일별 귀속
- `payment_status == cancelled` 제외
- 금액: `total_amount`

### 4.6 로켓배송/기타

- API 원천 없음
- H열: 로켓배송
- I열: 기타
- 월마감 collector는 H/I를 덮어쓰지 않음

---

## 5. 월마감 실행 순서

```text
1. 전월 기간 결정
2. 기존 Sheets/NocoDB snapshot 저장
3. MakeShop 조회
4. CRM/NocoDB 조회
5. 11번가 복수 endpoint 조회
6. Naver 조회 (throttle)
7. Coupang FINAL_DELIVERY 조회
8. Coupang 최근일 다중 상태 보정
9. 결과 JSON/CSV 생성
10. 기존값 대비 diff 생성
11. error_days 확인
12. 오류 없는 일자만 업데이트 후보 생성
13. Sheets/NocoDB 반영
14. 대시보드/월별 요약/채널 분석 검산
15. 월마감 확정 메모 기록
```

---

## 6. 오류일 처리 정책

| 상황 | 처리 |
|---|---|
| API 성공, 값 0 | 0 반영 가능 |
| API 429 | 기존값 보존, 재시도 큐 |
| IP_NOT_ALLOWED | 실행 위치 변경, 기존값 보존 |
| 인증 오류 | 반영 중단 |
| 일부 상태만 429 | 성공 상태값으로 덮지 말고 해당 날짜/상태 재시도 |
| H/I 수동 입력 | 항상 보존 |

---

## 7. 저장해야 하는 산출물

월마감마다 아래 artifact를 남긴다.

```text
monthly_sales_audit_YYYY_MM_raw.json
monthly_sales_audit_YYYY_MM_daily.csv
monthly_sales_audit_YYYY_MM_diff.csv
monthly_sales_audit_YYYY_MM_errors.json
```

---

## 8. 반영 전 체크리스트

- [ ] `error_days == 0` 또는 오류일 제외 업데이트인가?
- [ ] H/I 수동 입력을 덮지 않는가?
- [ ] 쿠팡 429 날짜를 0으로 덮지 않는가?
- [ ] 11번가가 `/complete` 단독이 아닌가?
- [ ] Naver는 Oracle/n8n IP에서 호출했는가?
- [ ] 결과 JSON/CSV가 저장됐는가?
- [ ] 기존값 대비 diff를 확인했는가?
- [ ] NocoDB와 Sheets를 같은 기준으로 업데이트하는가?
- [ ] 월별 요약/채널 분석/연간 매트릭스가 자동 반영되는가?

---

## 9. 향후 개선 과제

1. `monthly-sales-audit-runner` 전용 n8n workflow 또는 CLI 제작
2. API raw response를 MinIO/NocoDB raw table에 저장
3. 실패일 retry queue 자동 생성
4. 채널별 API 호출량/429 발생량 기록
5. 월마감 승인 플로우 추가
6. 쿠팡 최근일 상태 보정 로직 고도화
7. 2025년 일별 매출 원장 확보 시 MTD YoY를 일할 환산이 아닌 실제 일별 비교로 전환

---

## 10. 메이크샵 개인결제건 이중계산 방지

CRM/전화·방문 주문을 카드로 결제받기 위해 메이크샵에 `개인결제건` 상품을 생성하는 경우가 있다. 이 경우 실제 영업 채널은 CRM/직접거래이고, 메이크샵은 카드 결제 경로일 뿐이다.

따라서 월마감 감사 기준은 아래와 같다.

```text
메이크샵 개인결제건 = 메이크샵 매출에서 제외
CRM/직접거래 = 그대로 매출 반영
```

### 식별 기준

현재 확인된 개인결제건은 전부 아래 기준을 만족한다.

```text
product_cate1 = 097
brandcode starts with 097001
```

보조 문자열 패턴:

```text
개인결제
개별결제
개인결재
개별결재
```

### 자동화 반영

- F23 메이크샵 일일 집계에서 개인결제 카테고리 097 제외
- F26 메이크샵 백필에서도 개인결제 카테고리 097 제외
- 월마감 감사 탭에 `개인결제 제외` 검증 컬럼 추가

### 월마감 체크

월마감 시 아래를 확인한다.

1. 개인결제 카테고리 097 주문 합계가 메이크샵 매출에서 제외되었는가?
2. 해당 거래가 CRM/직접거래에 포함되어 있는가?
3. 메이크샵 PG 원장과 매출 분석 원장 차이가 개인결제 제외액으로 설명되는가?
4. 신규 개인결제 상품도 카테고리 097 / brandcode 097001 계열로 생성되었는가?

개인결제 상품을 다른 카테고리로 생성하면 자동 제외가 되지 않을 수 있으므로, 계속 같은 카테고리로 유지한다.
