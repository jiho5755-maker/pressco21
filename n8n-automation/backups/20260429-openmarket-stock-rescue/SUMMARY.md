# 2026-04-29 오픈마켓 긴급 품절 복구 실행 리포트

## 대상

- 하바리움 LED 원목 무드등
- 꽃레진/50g (실리콘레진)
- 요청 수량: 품절 옵션/상품 발견 시 재고 1000개 입력
- 포함 채널: 메이크샵, 스마트스토어, 11번가, 쿠팡

## 실행 원칙

1. 채널별 fresh read로 상품/옵션을 먼저 식별했다.
2. 품절 또는 품절성 상태인 옵션만 1000개로 복구했다.
3. 이미 판매중이고 재고가 있는 옵션은 고객 노출 상태에 문제가 없으므로 불필요한 write를 하지 않았다.
4. API 키, 쿠키, IP/인증값은 저장하지 않았다.

## 결과 요약

| 채널 | 대상 | Fresh read 결과 | 실행 | Verify |
|---|---|---|---|---|
| 메이크샵 | 꽃레진/50g | 진열중 상품 `uid=184`, SALE, 재고 999. 숨김 중복 `uid=12195529`도 SALE/재고 1000 | 변경 없음 | 품절 아님 |
| 메이크샵 | 하바리움 LED 원목 무드등 | 진열중 상품 `uid=11700206`, 5개 옵션 모두 SALE/무제한. 숨김 중복 `uid=11700208`도 SALE | 변경 없음 | 품절 아님 |
| 스마트스토어 | 꽃레진/50g | `originProductNo=13398873235`, SALE/ON, 재고 998 | 변경 없음 | 품절 아님 |
| 스마트스토어 | 하바리움 LED 원목 무드등 | `originProductNo=10916662314`, SALE/ON, 옵션 4개 모두 재고 있음 | 변경 없음 | 품절 아님 |
| 11번가 | 꽃레진/50g | `prdNo=9310000549`, `prdStckNo=45817413733`, 상태 `01`, 재고 999 | 변경 없음 | 품절 아님 |
| 11번가 | 하바리움 원목 무드등 LED 코스터 원목 받침대 | `prdNo=8236628513`, `prdStckNo=45323749173` 무선_고급형만 상태 `02`, 재고 0 | 재고 1000개 입력 | 상태 `01`, 재고 1000 확인 |
| 쿠팡 | 전체 | 로컬 및 Oracle 서버 호출 모두 403 IP_NOT_ALLOWED | 변경 불가 | 쿠팡 API 허용 IP 등록 필요 |

## 11번가 실행 상세

- 상품: 하바리움 원목 무드등 LED 코스터 원목 받침대
- 상품번호: `8236628513`
- 옵션: `무선_고급형`
- 옵션재고번호: `45323749173`
- 변경 전: `prdStckStatCd=02`, `stckQty=0`
- 실행: `PUT /rest/prodservices/stockqty/45323749173`
- 요청 수량: `1000`
- 응답: `resultCode=200`, 수량 업데이트 완료
- 변경 후: `prdStckStatCd=01`, `stckQty=1000`

## 저장 파일

- `makeshop-fresh-read-candidates.json`
- `smartstore-fresh-read-candidates.json`
- `11st-product-search-*.json`
- `11st-stock-detail-*.json`
- `11st-stock-update-8236628513-45323749173-dry-run.json`
- `11st-stock-update-8236628513-45323749173-execute.json`
- `11st-stock-detail-8236628513-after.json`
- `coupang-product-search-results.json`
- `coupang-fresh-read-candidates.json`

## 남은 리스크

- 쿠팡은 현재 API가 시간 문제가 아니라 `IP_NOT_ALLOWED`로 차단되어 상품 조회/재고 변경을 하지 못했다.
- 쿠팡 판매자센터 또는 Open API 관리에서 현재 실행 서버 IP를 허용해야 API 재고 복구가 가능하다.
- 스마트스토어/메이크샵/11번가의 비품절 재고는 998/999처럼 1000과 근소하게 다를 수 있으나 판매중 상태라 이번 긴급 복구 write 대상에서 제외했다.
