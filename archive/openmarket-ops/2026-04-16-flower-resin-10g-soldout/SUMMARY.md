# 꽃레진/10g 품절 처리 운영 로그

- 작업 시각: 2026-04-16 KST
- 작업 브랜치/worktree: `work/workspace/flower-resin-10g-soldout`
- 대상: `꽃레진/10g` 메인상품 및 옵션/추가 구성성 재고
- 실행 경로: Oracle 서버에서 각 채널 운영 API 호출
- 인증값: 원격 `/home/ubuntu/n8n/.env` 참조, 로그에 미기재

## 처리 결과

### MakeShop

API:
`POST /list/open_api_process.html?mode=save&type=product&process=stock`

처리 완료:

| uid | 상품명 | 구분 | 옵션 | 처리 전 | 처리 후 |
|---|---|---|---|---:|---|
| 201643 | 꽃레진/10g/낱개 | 강사공간 | 1개구입 | 9875 / SALE | 0 / SOLDOUT |
| 201643 | 꽃레진/10g/낱개 | 강사공간 | 5개세트구입 | 9884 / SALE | 0 / SOLDOUT |
| 201617 | 꽃레진/10g/낱개 | 압화 | 1개구입 | 9936 / SALE | 0 / SOLDOUT |
| 201617 | 꽃레진/10g/낱개 | 압화 | 5개세트구입 | 9963 / SALE | 0 / SOLDOUT |

API 응답: `return_code=0000`, 4개 stock row 모두 `result=true`.

### SmartStore

API:
`PUT /v1/products/origin-products/{originProductNo}/change-status`

처리 완료:

| originProductNo | channelProductNo | 상품명 | 처리 전 | 처리 후 |
|---:|---:|---|---|---|
| 3139497146 | 3144159179 | 레진 공예용 마감재 꽃레진 압화재료 | SALE / stock 9932 | OUTOFSTOCK / stock 0 |

참고: 상품 목록 조회에서는 `꽃레진/10g` 정확명은 없었고, 단일 `꽃레진` 상품이 확인되어 fallback 대상으로 처리했다. v2 원상품 조회 기준 원상품명은 `프레스코21 레진 공예용 마감재 꽃레진 10g 압화재료`로 확인됨.

### 11번가

현재 `ST11_API_KEY`로 주문/클레임 조회는 운영 중이나, 상품 API 후보 엔드포인트는 모두 아래 오류를 반환했다.

- `resultCode=-997`
- `resultMessage=등록된 API 정보가 존재하지 않습니다.`

따라서 11번가는 상품 품절 write를 실행하지 않았다. 11번가 Seller/OpenAPI 상품 서비스 권한 등록 또는 상품 수정 가능 API 키가 필요하다.

## 산출물

- Dry-run: `dry-run-v3.json`
- 실행 로그: `execute.json`
- 운영 스크립트: `tools/openmarket/flower_resin_10g_soldout.py`

---

## 추가상품 정리 — 50g 제외

추가 요청 기준:

- `50g`는 신상품이므로 제외
- `꽃레진(9g)`는 기존 추가상품명으로 남아 있었고, 현재 품절 대상인 소용량 꽃레진 계열로 판단해 정리
- `누름꽃 레진`처럼 공백 제거 시 오탐될 수 있는 문자열은 제외

### MakeShop 추가상품

정확한 `꽃레진/10g` 추가옵션은 없었으나, 기존명 `꽃레진(9g)` / `꽃레진/9g` 추가옵션이 8개 상품에서 발견됨.
MakeShop Open API는 개별 추가옵션 삭제 전용 endpoint가 없어, 대상 추가옵션 stock row를 모두 `0 / SOLDOUT` 처리함.

처리 완료: 8개 상품, 14개 추가옵션 stock row.

주요 대상:

- LED/천스탠드/사각: 강사공간 + 압화 상품 2개
- 압화부채만들기세트: 강사공간 + 압화 상품 2개
- LED/천스탠드/원형: 강사공간 + 압화 상품 2개
- 스마트폰거치대/MDF: 강사공간 + 압화 상품 2개

로그: `addon-makeshop-execute-summary.json`

### SmartStore 추가상품

SmartStore `supplementProductInfo.supplementProducts`에서 `꽃레진(9g)` 추가상품을 확인하고 `usable=false`, `stockQuantity=0`으로 갱신함.

검증 완료 대상:

| originProductNo | 상품명 | 처리 후 |
|---:|---|---|
| 10165522025 | 프레스코21 압화 부채 만들기세트 종이 한지 | 꽃레진(9g) usable=false / stock 0 |
| 8698722050 | 압화 부채 만들기 재료 조개부채 꽃부채 프레스코21 한국 전통 노인 어르신 아이 | 꽃레진(9g) usable=false / stock 0 |
| 8987956992 | 프레스코21 압화 만들기 LED 천스탠드 원형 | 꽃레진(9g) 1개/5개세트 usable=false / stock 0 |
| 10251781321 | 프레스코21 LED 천스탠드 사각 압화 만들기 | 꽃레진(9g) 1개/5개세트 usable=false / stock 0 |

로그: `smartstore-addon-targeted-summary.json`

주의: SmartStore 전체 1117개 원상품 상세를 반복 조회하는 중 rate limit(429)이 발생했으므로, 전체 재스캔 로그에는 오류가 많다. 다만 부분 스캔에서 발견된 알려진 대상 4개는 별도 targeted 검증으로 모두 처리 후 재조회 확인했다.

### 11번가 API 권한 안내

현재 보유 `ST11_API_KEY`는 주문/클레임 조회에는 사용 가능하지만, 상품 API 후보 endpoint는 `-997 등록된 API 정보가 존재하지 않습니다`를 반환했다.

필요한 것은 **11번가 판매자 상품관리/상품수정/재고수정 권한이 포함된 Open API 사용 등록**이다.

안내 URL:

- 11번가 OpenAPI 센터: `https://openapi.11st.co.kr/openapi/OpenApiFrontMain.tmall`
- 공개 문서 참고: `https://skopenapi.readme.io/reference/11%EB%B2%88%EA%B0%80-%EC%86%8C%EA%B0%9C`

판매자 센터에서 위 API 키에 상품 관련 서비스가 붙도록 설정하거나, 상품 API 권한이 있는 새 키를 `.secrets.env` / 운영 n8n env의 `ST11_API_KEY`로 교체해야 한다.

---

## 2026-04-17 SmartStore rate-limit 미확인분 재검증

전날 rate limit으로 전체 상세 재스캔이 끝나지 않았던 SmartStore 원상품을 저속으로 다시 전수 조회했다.

- 조회 대상: SmartStore 원상품 1117개
- 지연: 원상품 상세 조회당 약 1.15초 + 429 backoff
- 오류: 0건
- 50g 제외 조건 유지
- 검색 조건: 원문에 `꽃레진` 포함, `50g`/`50ｇ` 미포함

결과:

- 꽃레진 소용량 추가상품 포함 원상품: 총 7개
- 이미 전날 비활성화되어 있던 상품: 4개
- 이번 재검증 중 새로 비활성화한 상품: 3개
- 최종 상태: 7개 전부 `usable=false`, `stockQuantity=0`

이번에 추가로 변경된 3개:

| originProductNo | 상품명 | 처리 |
|---:|---|---|
| 11818600667 | [진짜 꽃] 부채 만들기 접이식 부채 제작 꾸미기 조개 압화 소 | 꽃레진(9g) usable=false / stock 0 |
| 10209312809 | [진짜 꽃] 부채 만들기 키트 접이식 부채 제작 꾸미기 조개 압화 소 | 꽃레진(9g) usable=false / stock 0 |
| 8813221419 | 프레스코21 압화 만들기 스마트폰 거치대 | 꽃레진(9g) usable=false / stock 0 |

전체 최종 확인 7개:

| originProductNo | 상품명 | 최종 상태 |
|---:|---|---|
| 11818600667 | [진짜 꽃] 부채 만들기 접이식 부채 제작 꾸미기 조개 압화 소 | usable=false / stock 0 |
| 10251781321 | 프레스코21 LED 천스탠드 사각 압화 만들기 | usable=false / stock 0 |
| 10209312809 | [진짜 꽃] 부채 만들기 키트 접이식 부채 제작 꾸미기 조개 압화 소 | usable=false / stock 0 |
| 10165522025 | 프레스코21 압화 부채 만들기세트 종이 한지 | usable=false / stock 0 |
| 8987956992 | 프레스코21 압화 만들기 LED 천스탠드 원형 | usable=false / stock 0 |
| 8813221419 | 프레스코21 압화 만들기 스마트폰 거치대 | usable=false / stock 0 |
| 8698722050 | 압화 부채 만들기 재료 조개부채 꽃부채 프레스코21 한국 전통 노인 어르신 아이 | usable=false / stock 0 |

로그: `smartstore-full-slow-scan-20260417.json`
