# 11번가 URL 카탈로그 기준 재고 복구 재시도 로그

- 작업 시각: 2026-04-27 13:25~13:35 KST
- 대상: `꽃레진/50g`
- 목표 재고: 1000개
- 기준 문서: `docs/openmarket-ops/11st-openapi-url-catalog.md`
- 결과: 정확한 11번가 상품 식별자(`prdNo`, `prdStckNo`)를 확보하지 못해 쓰기 API는 호출하지 않음

## 카탈로그에서 확인한 관련 URL

- product_search: `http://api.11st.co.kr/rest/prodmarketservice/prodmarket`
- seller_product_search: `http://api.11st.co.kr/rest/prodmarketservice/sellerprodcode/[sellerprdcd]`
- stock_read: `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/stck/[prdNo]`
- soldout_option_list: `https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}`
- stock_write: `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]`
- restart_display: `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]`

## API 확인 결과

- 주문 API 키 유효성: 정상
- 주문 이력 스캔: 2026-01-01부터 현재까지 102회 호출, XML order chunk 96개 확인, `꽃레진/50g` 매칭 0건
- 공개 상품 검색: 정확한 PRESSCO21 `꽃레진/50g` 매칭 0건
- sellerprdcd 후보 조회: `103885`, `184`, `12195529`, `201617`, `201643`, `PC21-SKU-876F51C76E`, `flower_resin_50g` 모두 빈 결과
- 후보 `prdNo`: []
- 후보 `prdStckNo`: []

## URL별 판정

| URL/API | 결과 | 판정 |
|---|---|---|
| 다중상품조회<br>`https://api.11st.co.kr/rest/prodmarketservice/prodmarket` | 등록된 API 정보가 존재하지 않습니다. | 현재 키로 다중상품조회 권한/등록 불가 |
| 다중상품조회_keyword<br>`https://api.11st.co.kr/rest/prodmarketservice/prodmarket` | 등록된 API 정보가 존재하지 않습니다. | 현재 키로 다중상품조회 권한/등록 불가 |
| 다중상품재고정보조회<br>`https://api.11st.co.kr/rest/prodmarketservice/prodmarket/stocks` | [stocks] 상품 정보 조회중 오류입니다.상품번호는 숫자만 가능합니다. | `prdNo`가 필요하나 대상 `prdNo` 미확보 |
| 옵션품절리스트조회_12자리<br>`https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/202604131332/202604271332` | resultCode 200, 해당 기간 조회된 데이터 없음 | 현재 실재고체크 품절 옵션 목록에 대상 없음 |
| 옵션품절리스트조회_8자리<br>`https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/20260413/20260427` | resultCode 500, 날짜 형식 오류 | 12자리 `YYYYMMDDHH24MI` 형식 필요 확인 |

## 공개 검색 보정 결과

- `프레스코21 꽃레진 50g`: TotalCount 0, 정확한 PRESSCO21 50g 매칭 0건
- `프레스코21 꽃레진/50g`: TotalCount 0, 정확한 PRESSCO21 50g 매칭 0건
- `꽃레진/50g`: TotalCount 1, 정확한 PRESSCO21 50g 매칭 0건
- `꽃레진 50g`: TotalCount 1, 정확한 PRESSCO21 50g 매칭 0건
- `꽃레진 실리콘레진 50g`: TotalCount 0, 정확한 PRESSCO21 50g 매칭 0건
- `프레스코21 꽃레진`: TotalCount 16, 정확한 PRESSCO21 50g 매칭 0건
- `프레스코21 실리콘레진`: TotalCount 53, 정확한 PRESSCO21 50g 매칭 0건
- `프레스코21 레진 공예용 마감재 꽃레진`: TotalCount 0, 정확한 PRESSCO21 50g 매칭 0건
- `foreverlove 꽃레진`: TotalCount 0, 정확한 PRESSCO21 50g 매칭 0건
- `pressco21 flower resin`: TotalCount 1, 정확한 PRESSCO21 50g 매칭 0건

## 결론

카탈로그상 재고 변경 URL은 `http://api.11st.co.kr/rest/prodservices/stockqty/[prdStckNo]`, 전시중지 해제 URL은 `http://api.11st.co.kr/rest/prodstatservice/stat/restartdisplay/[prdNo]`로 확인했다. 다만 현재 API/공개검색/주문이력 어디에서도 `꽃레진/50g`의 11번가 `prdNo` 또는 `prdStckNo`가 확인되지 않았고, 다중상품조회는 `-997 등록된 API 정보가 존재하지 않습니다`로 차단됐다. 오등록 방지를 위해 11번가 재고/전시 쓰기 호출은 하지 않았다.

다음에 필요한 조치: 11번가 Seller Office에서 해당 상품의 `prdNo`/`prdStckNo` 확인 또는 현재 키에 상품조회/상품수정 API 권한 등록 후 재시도.

## 산출물

- `st11-url-catalog-probe-1.json`: 1차 URL 카탈로그 기반 탐색
- `st11-url-catalog-probe-2.json`: 인증 변형, 상품/재고 URL, 주문 이력 역추적
- `st11-public-search-regex-fix.json`: 11번가 공개검색 XML 파싱 보정 결과
