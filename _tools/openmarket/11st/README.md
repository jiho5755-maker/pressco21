# 11번가 Open API 공용 도구

> 목적: 어떤 worktree/프로젝트에서도 11번가 Open API를 동일한 방식으로 조회·검증·수정한다.

## 파일

| 파일 | 역할 |
|---|---|
| `11st_api.py` | 11번가 API 공용 CLI. 기본 dry-run, `--execute`일 때만 write |
| `11st_crawl_guides.py` | 로그인된 Playwright 브라우저 세션으로 공식 개발가이드를 크롤링 |

## 인증

`11st_api.py`는 아래 순서로 API 키를 읽는다.

1. `--api-key`
2. `ST11_API_KEY` 환경변수
3. `--env-file`로 넘긴 파일의 `ST11_API_KEY`

인증값 파일은 수정하지 말고 읽기만 한다.

## 예시

```bash
# 카탈로그 검색
python3 _tools/openmarket/11st/11st_api.py catalog-search 즉시할인

# 상품 목록 조회
ST11_API_KEY=... python3 _tools/openmarket/11st/11st_api.py product-search --limit 10

# 상품 상세조회
ST11_API_KEY=... python3 _tools/openmarket/11st/11st_api.py product-detail 8236629275

# 기본즉시할인 제거 dry-run
ST11_API_KEY=... python3 _tools/openmarket/11st/11st_api.py price-coupon-disable 8236629275 --sel-prc 1000

# 기본즉시할인 제거 실행
ST11_API_KEY=... python3 _tools/openmarket/11st/11st_api.py price-coupon-disable 8236629275 --sel-prc 1000 --execute
```

## 공식 문서 크롤링

먼저 브라우저를 열고 사용자가 직접 로그인한다.

```bash
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh open \
  'https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall' --headed
```

로그인 후:

```bash
python3 _tools/openmarket/11st/11st_crawl_guides.py
```

생성/갱신 대상:

- `docs/openmarket-ops/11st-openapi-guide-crawl-YYYY-MM-DD.json`
- `docs/openmarket-ops/11st-openapi-url-catalog.json`
- `docs/openmarket-ops/11st-openapi-url-catalog.md`

