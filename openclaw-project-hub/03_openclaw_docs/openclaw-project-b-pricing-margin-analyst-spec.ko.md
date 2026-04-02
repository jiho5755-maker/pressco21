# PRESSCO21 OpenClaw 가격/마진 검토 스펙

> 상태: working draft v0.2
> 작성일: 2026-03-24

## 1. 목적

이 스펙은 SKU 원가, 판매가, 채널 기준, 원가 가정, 연계마스터 조회 결과를 바탕으로 가격과 마진을 빠르게 검토하기 위한 입력/출력 계약이다.

기본 원칙은 다음과 같다.

- 상품명, `skuCode`, `branduid` 중 하나가 있으면 연계마스터에서 기본 원가와 메이크샵 판매가를 자동 조회한다.
- 조회된 판매가가 메이크샵 기준가이면, 타 채널 검토 시 `기준가`로만 사용하고 실제 채널 판매가로 단정하지 않는다.
- 채널 기준과 카테고리 전략을 함께 넣어, 단순 마진 계산이 아니라 채널별 가격 판단까지 보조한다.
- 연계마스터에 동일 식별자 원가 충돌이 있으면 `참고치`로만 다루고, 장기적으로는 별도 Product Cost Profile 원장을 우선 참조한다.
- 사람이 검토한 `reviewed.json`이 있으면 seed 원장보다 우선 사용한다.
- 중국 사입은 `최신 게시 환율`, `지사관리비 10%`, `CBM당 운임`, `건당 통관수수료`를 우선 원칙으로 둔다.
- 수입 부가세는 기본적으로 `매입세액 공제 대상`으로 보고 COGS에 넣지 않는다.
- 광고비는 COGS에 섞지 않고 채널별 예산율로 별도 차감한다.

## 2. 필수 입력값

| 필드 | 타입 | 설명 |
|------|------|------|
| `productName` | string | 상품명 |
| `channel` | string | 판매 채널 |
| `approvalOwner` | string | 승인자 |

## 3. 선택 입력값

| 필드 | 타입 | 설명 |
|------|------|------|
| `skuCode` | string | SKU코드 |
| `branduid` | string | 메이크샵 branduid |
| `category` | string | 상품 카테고리 |
| `sourceCost` | string | 원가 또는 COGS |
| `costType` | string | `cogs`, `purchase_krw`, `purchase_cny` 중 하나 |
| `sellingPrice` | string | 현재 판매가 |
| `normalizedCogs` | string | 추정 COGS |
| `catalogLookupStatus` | string | `matched`, `ambiguous`, `not_found`, `lookup_error` 등 조회 상태 |
| `catalogMatchSummary` | string | 연계마스터 조회 결과 요약 |
| `catalogRecord` | string | 매칭된 연계마스터 레코드 JSON |
| `channelBenchmark` | string | 채널 기준 JSON 또는 요약 |
| `categoryProfile` | string | 카테고리별 가격 전략 요약 |
| `computedSnapshot` | string | 공급가/수수료/추정 마진 계산 스냅샷 |
| `costRule` | string | 원가 해석 규칙 |
| `costAssumptions` | string[] | 계산에 사용한 가정 |
| `hiddenCostChecklist` | string[] | 숨은 비용 점검 목록 |
| `feeNotes` | string | 수수료/비용 메모 |
| `targetMargin` | string | 목표 마진 |
| `priceConstraints` | string[] | 가격 제약 |
| `allocationQuantity` | string/number | 건당 고정비 배분 수량 |
| `unitVolumeCbm` | string/number | 개당 CBM |
| `packageLengthCm` | string/number | 가로(cm) |
| `packageWidthCm` | string/number | 세로(cm) |
| `packageHeightCm` | string/number | 높이(cm) |
| `originCertificateApplied` | string/bool | 원산지증명 적용 여부 |
| `domesticInboundShippingPerUnit` | string/number | 통관 후 국내 입고 배송비(개당) |

## 4. 출력 계약

- `marginSummary`
- `thresholdCheck`
- `riskFlags`
- `priceOptions`
- `scenarioTable`
- `assumptions`
- `dataGaps`
- `channelNotes`
- `nextActions`
- `approvalChecklist`

## 5. 조회 우선순위

1. `skuCode`
2. `branduid`
3. `productName`

조회 결과가 `ambiguous`면 SKU 또는 branduid를 추가로 받아야 한다.

## 6. 자동 조회 기본 경로

- `~/Downloads/1688-SKU-메이크샵_연계마스터.xlsx`
- `~/Downloads/1688-SKU_연계마스터.xlsx`

필요하면 `PRESSCO21_PRICING_CATALOG` 또는 `PRESSCO21_PRICING_CATALOG_PATHS`로 경로를 덮어쓴다.

## 7. 원가 원장 우선순위

1. `docs/reference/openclaw-pressco21-product-cost-profiles.reviewed.json`
2. `docs/reference/openclaw-pressco21-product-cost-profiles.seed.json`
3. 연계마스터 조회

즉, 장기적으로는 `연계마스터 자동조회`보다 `사람이 검토한 원가 원장`이 우선이다.

## 8-1. 계산 운영 정책

- 환율: 최신 게시 일일 환율 자동 반영, 실제 송금 완료 건은 실환율로 덮어씀
- 판매가: VAT 포함가 입력, 공급가로 환산해 마진 계산
- 수입 VAT: COGS 미포함, 현금흐름 항목으로만 별도 메모
- 국제운임: `해상운임 82,000원/CBM`, `창고료/작업비 6,000원/CBM`
- 통관수수료: `33,000원/건`
- 원산지증명: 필요 시 `250 CNY/건`

## 9. 검토용 엑셀 원장

원가 원장은 아래 워크플로우로 운영한다.

- 생성: `scripts/generate-pressco21-cost-ledger.py`
- 검토: `output/spreadsheet/pressco21-product-cost-ledger.seed.xlsx`
- 내보내기: `scripts/export-pressco21-cost-ledger.py`

상세 운영 문서는 `openclaw-pressco21-cost-ledger-workflow.ko.md`를 따른다.
