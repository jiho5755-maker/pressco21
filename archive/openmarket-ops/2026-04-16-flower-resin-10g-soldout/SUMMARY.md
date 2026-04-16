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
