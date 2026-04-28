# 11번가 Open API 공용 도구

> 목적: 어떤 worktree/프로젝트에서도 11번가 Open API를 동일한 방식으로 조회·검증·수정한다.

## 파일

| 파일 | 역할 |
|---|---|
| `11st_api.py` | 11번가 API 공용 CLI. 기본 dry-run, `--execute`일 때만 write |
| `11st_crawl_guides.py` | 로그인된 Playwright 브라우저 세션 또는 기존 crawl JSON으로 공식 개발가이드 카탈로그 생성 |

## 아무 디렉터리에서 실행하기

메인 병합 후에는 repo root의 절대경로를 잡아 두고 실행한다.

```bash
export PRESSCO21_ROOT=/Users/jangjiho/workspace/pressco21
python3 "$PRESSCO21_ROOT/_tools/openmarket/11st/11st_api.py" catalog-search 재고 --limit 3
```

현재 repo/worktree 안에서는 상대경로도 가능하다.

```bash
python3 _tools/openmarket/11st/11st_api.py catalog-search 즉시할인 --limit 3
```

두 Python 파일은 실행 권한이 있으므로 아래 형태도 가능하다.

```bash
_tools/openmarket/11st/11st_api.py catalog-show 1855 --limit 1
```

## 인증

`11st_api.py`는 아래 순서로 API 키를 읽는다.

1. `--api-key`
2. `ST11_API_KEY` 환경변수
3. `--env-file`로 넘긴 파일의 `ST11_API_KEY`

인증값 파일은 수정하지 말고 읽기만 한다. API 키, 세션 쿠키, 추가인증 결과는 로그·커밋·handoff에 남기지 않는다.


## 카탈로그 상태 기준

2026-04-28 재검증 기준으로 활성 API의 URL/Method 미확인은 0개다.

- `6732` 실재고체크 옵션품절 리스트 조회: `GET /rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}` 확인
- `1316`, `1318`, `1319`, `6705`, `6706`: 공식 개발가이드가 `Content does not exist`이고 API TEST URL도 빈 값이므로 `availability=official_no_content`, `usable=false`로 분류
- `1316`, `1318`, `1319`는 각각 `1746`, `1748`, `1749`를 대체 API로 사용한다.

## 빠른 예시

```bash
# 카탈로그 검색: API 키 불필요
python3 _tools/openmarket/11st/11st_api.py catalog-search 즉시할인 --limit 3

# apiSeq/라벨/URL 상세 확인
python3 _tools/openmarket/11st/11st_api.py catalog-show 1855 --limit 1

# 상품조회 XML payload dry-run: API 키 불필요
python3 _tools/openmarket/11st/11st_api.py product-search-dry --prd-name 꽃레진 --limit 5 --start 1 --end 5

# 키/IP/read-only 권한 확인
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env auth-check

# 상품 목록 조회
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env product-search --limit 10

# 상품 상세조회
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env product-detail 8236629275

# 실재고체크 옵션품절 리스트 조회(apiSeq 6732)
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env realtime-soldout-options 202604010000 202604282359

# 기본즉시할인 제거 dry-run: 실제 변경 없음
python3 _tools/openmarket/11st/11st_api.py price-coupon-disable 8236629275 --sel-prc 1000

# 기본즉시할인 제거 실행: 실행 직전 fresh read/승인 후에만 사용
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env price-coupon-disable 8236629275 --sel-prc 1000 --execute

# 재고 변경 dry-run: 실제 변경 없음
python3 _tools/openmarket/11st/11st_api.py stock-update 987654 1000 --prd-no 8236629275
```

## 안전 장치

- write 명령은 `--execute`가 없으면 실제 API를 호출하지 않는다.
- `api.11st.co.kr` 외 base-url은 기본 차단한다. API 키 외부 전송 방지 목적이다.
- HTTP 4xx/5xx 또는 실패성 `resultCode`는 non-zero exit로 종료한다.
- XML payload 값은 escape하고, path parameter는 `/`까지 인코딩한다.
- 응답은 기본 5MB까지만 읽는다. 필요 시 `--max-response-bytes`를 조정한다.

## 공식 문서 크롤링

먼저 브라우저를 열고 사용자가 직접 로그인/추가인증한다.

```bash
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh open \
  'https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall' --headed
```

로그인 후 공식 문서 전체 크롤링:

```bash
python3 _tools/openmarket/11st/11st_crawl_guides.py
```

기존 crawl JSON으로 카탈로그만 재생성:

```bash
python3 _tools/openmarket/11st/11st_crawl_guides.py \
  --from-crawl docs/openmarket-ops/11st-openapi-guide-crawl-2026-04-28.json \
  --date 2026-04-28
```

Playwright skill 경로가 다른 환경에서는 `--playwright-cli`로 지정한다.

생성/갱신 대상:

- `docs/openmarket-ops/11st-openapi-guide-crawl-YYYY-MM-DD.json`
- `docs/openmarket-ops/11st-openapi-url-catalog.json`
- `docs/openmarket-ops/11st-openapi-url-catalog.md`
