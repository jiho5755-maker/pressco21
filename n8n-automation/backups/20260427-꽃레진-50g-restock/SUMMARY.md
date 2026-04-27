# 꽃레진/50g 품절 해제 및 재고 복구 운영 로그

- 작업 시각: 2026-04-27 12:21~12:35 KST
- 대상: `꽃레진/50g (실리콘레진)` 및 관련 추가상품/추가옵션
- 목표 재고: 1000개
- 실행 경로: Oracle/n8n 서버에서 운영 API 호출
- 인증값: 원격 `/home/ubuntu/n8n/.env` 참조, 산출물에 미기재

## 처리 결과

| 채널 | 결과 | 비고 |
|---|---|---|
| MakeShop | 완료 | 메인 2개 stock row, 관련 추가옵션 4개 stock row 복구 |
| SmartStore | 완료 | `알루미늄호일 액자 마감용 압화 호일 폭 52cm`의 관련재료 추가상품 1개 복구 |
| Coupang | 해당 50g 상품 없음 | API 검색상 `꽃레진` 후보는 10g만 확인, 50g 정확 매칭 0건 |
| 11번가 | 미실행 | 상품 API 후보가 `-997 등록된 API 정보가 존재하지 않습니다`; seller code 후보도 빈 결과 |

## MakeShop 최종 검증

| 구분 | uid | 상품명/옵션 | 표시 | 판매 | 재고 | 상태 |
|---|---:|---|---|---|---:|---|
| 메인 | 12195529 | 꽃레진/50g (실리콘레진) | N | N | 1000 | SALE |
| 메인 | 184 | 꽃레진/50g (실리콘레진) | Y | Y | 1000 | SALE |
| 추가옵션 | 11701520 | 하바리움 용기_부케글라스 / 꽃레진/50g(실리콘레진) | Y | Y | 1000 | SALE |
| 추가옵션 | 11699694 | 진공흡입기/미니 / 꽃레진/50g(실리콘레진) | Y | Y | 1000 | SALE |
| 추가옵션 | 11698310 | 알루미늄호일/길이10m/사이즈선택 / 꽃레진/실리콘레진(50g) | Y | Y | 1000 | SALE |
| 추가옵션 | 340120 | 웨딩액자 모음전 / 꽃레진/50g(실리콘레진) | Y | Y | 1000 | SALE |

주의: uid `12195529`는 `강사공간` 보관 row라 기존처럼 display/sell_accept는 `N/N`을 유지하고, 품절 상태만 `SALE`/재고 1000으로 풀었다. 사용자-facing row는 uid `184`다.

## SmartStore 최종 검증

- originProductNo `11584792106` / 알루미늄호일 액자 마감용 압화 호일 폭 52cm / 꽃레진/실리콘레진(50g): stockQuantity `1000`, usable `True`, statusType `SALE`

## Coupang/11번가 확인

- Coupang: exact 50g matched products `0`. `꽃레진` 검색 후보 1건은 10g 상품이라 수정하지 않음.
- 11번가: product API permission blocked `True`. write_attempted `False`.

## 산출물

- `n8n-automation/backups/20260427-꽃레진-50g-restock/dry-run.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/execute.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/makeshop-uid184-stock-fix.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/final-verify.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/SUMMARY.md`

## 11번가 URL 카탈로그 기준 추가 재시도

- 추가 작업 시각: 2026-04-27 13:25~13:35 KST
- 기준 문서: `docs/openmarket-ops/11st-openapi-url-catalog.md`
- 확인한 재고 변경 URL: `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]`
- 확인한 전시 재개 URL: `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]`
- 추가 확인 URL: `prodmarket`, `sellerprodcode`, `prodmarket/stocks`, `getRealTimeCheckSoldOutOpt/{startDt}/{endDt}`

추가 재시도 결과, 주문 API는 정상 동작했지만 `꽃레진/50g`의 11번가 `prdNo`/`prdStckNo`를 확보하지 못했다. 공개 상품검색에서도 PRESSCO21 `꽃레진/50g` 정확 매칭은 0건이었고, 2026-01-01부터 현재까지 주문 이력 102회 호출/96개 주문 chunk 역추적에서도 `꽃레진/50g` 매칭은 0건이었다. `sellerprdcd` 후보 `103885`, `184`, `12195529`, `201617`, `201643`, `PC21-SKU-876F51C76E`, `flower_resin_50g`도 빈 결과였다.

따라서 오등록/타상품 재고 변경을 막기 위해 11번가 쓰기 API(`stockqty`, `restartdisplay`)는 호출하지 않았다. 다음 재시도에는 Seller Office에서 해당 상품의 `prdNo`/`prdStckNo`를 먼저 확인하거나, 현재 키에 11번가 상품조회/상품수정 API 권한을 등록해야 한다.

추가 산출물:

- `n8n-automation/backups/20260427-꽃레진-50g-restock/st11-url-catalog-probe-1.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/st11-url-catalog-probe-2.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/st11-public-search-regex-fix.json`
- `n8n-automation/backups/20260427-꽃레진-50g-restock/st11-url-catalog-probe-summary.md`
