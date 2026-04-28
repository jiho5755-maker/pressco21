# 11번가 Open API Global Kit

> 작성일: 2026-04-28  
> 브랜치: `work/workspace/11st-openapi-global-kit`  
> 목적: 11번가 Open API를 매번 다시 문서 확인/권한 확인하지 않고, 메이크샵·스마트스토어처럼 어느 작업 디렉터리에서도 안전하게 재사용한다.

## 1. 목표

11번가 Open API 연동을 아래 3개 레이어로 표준화한다.

1. **공식 문서 카탈로그**
   - 전체 API URL, Method, Parameter, Payload, Return, 권한/주의사항을 로컬 JSON/Markdown으로 보관한다.
   - 출처는 11번가 Open API 공식 개발가이드와 API TEST 화면이다.
2. **공용 CLI/라이브러리**
   - 상품조회, 상세조회, 재고조회/변경, 가격/즉시할인 수정처럼 반복되는 작업을 `_tools/openmarket/11st/`에서 실행한다.
   - 기본은 dry-run이고, 쓰기는 `--execute`가 있어야 한다.
3. **운영 지침/학습 노트**
   - 브라우저 인증, API 관리, IP 등록, 추가인증, API TEST 사용법을 문서화한다.
   - 한 번 배운 호출 방식과 오류 패턴을 누적해 다음 작업에서 바로 사용한다.

## 2. 권장 아키텍처

### 2.1 1차: 공용 CLI가 우선

현재 목표에는 MCP보다 공용 CLI/문서 키트가 먼저 적합하다.

이유:

- 11번가 API는 HTTP + XML 기반 서버-서버 호출이 중심이다.
- n8n, 로컬 터미널, Oracle 서버, 다른 프로젝트 worktree에서 모두 재사용해야 한다.
- 실제 쓰기 작업은 dry-run, 대상 CSV, 실행 리포트, 재조회 검증이 필요하므로 CLI가 감사 로그를 남기기 쉽다.

### 2.2 2차: n8n adapter

반복 운영이 안정되면 n8n webhook/스케줄 workflow가 CLI와 동일한 계약을 소비하도록 한다.

- 예: `openmarket/11st/products/search`
- 예: `openmarket/11st/price-coupon/disable`
- 예: `openmarket/11st/stock/update`

### 2.3 3차: MCP tool

MCP는 “AI가 자연어로 11번가 API를 호출”하는 단계에서 감싸는 것이 좋다.

권장 MCP surface:

- `st11.catalog.search`
- `st11.product.search`
- `st11.product.detail`
- `st11.stock.update`
- `st11.price_coupon.disable`
- `st11.errors.explain`

단, MCP write tool은 반드시 `dry_run=true` 기본값과 `execute=true` 명시를 요구해야 한다.

## 3. 저장 위치

| 자산 | 경로 | 역할 |
|---|---|---|
| URL 카탈로그 JSON | `docs/openmarket-ops/11st-openapi-url-catalog.json` | 전체 URL/분류 원장 |
| URL 카탈로그 MD | `docs/openmarket-ops/11st-openapi-url-catalog.md` | 사람이 읽는 URL 목록 |
| 글로벌 지침 | `docs/openmarket-ops/11st-openapi-global-kit.md` | 이 문서 |
| CLI | `_tools/openmarket/11st/11st_api.py` | 조회/쓰기 공용 도구 |
| 브라우저 크롤러 | `_tools/openmarket/11st/11st_crawl_guides.py` | 공식 문서/API TEST 학습 |
| README | `_tools/openmarket/11st/README.md` | 도구 사용법 |

## 4. 인증 원칙

- API 키는 `.secrets`, `.secrets.env`, `.env.local` 등에 저장하되 수정하지 않는다.
- 도구는 기본적으로 `ST11_API_KEY` 환경변수를 읽는다.
- 운영 서버에서는 n8n/Oracle 환경변수의 `ST11_API_KEY`를 사용한다.
- 출력 로그에는 API 키, 세션 쿠키, 추가인증 결과를 절대 남기지 않는다.
- Playwright 산출물(`.playwright-cli/`)은 커밋하지 않는다.

## 5. 브라우저 인증 학습 절차

1. 사용자가 11번가 로그인/추가인증을 직접 완료한다.
2. 자동화는 로그인 이후 화면만 탐색한다.
3. API 관리 화면에서 아래 항목을 확인한다.
   - API KEY 관리
   - IP 직접 입력 사용 여부
   - n8n/Oracle 서버 IP 등록 여부
   - 개발자 PC IP 등록 여부
   - 셀링툴 업체 설정 여부
4. 개발가이드 화면에서 전체 category/API tab을 순회한다.
5. 각 API마다 Method, URL, Path Parameter, Request Parameter, Response, Error, API TEST preview를 추출한다.
6. 추출 결과는 JSON으로 저장하고 사람이 읽는 Markdown을 재생성한다.

## 6. 쓰기 API 안전 규칙

모든 쓰기 작업은 아래 순서를 강제한다.

1. 대상 식별: `prdNo`, `prdStckNo`, `sellerPrdCd` 등 정확 식별자 확보
2. fresh read: 실행 직전 상세조회로 현재 상태 확인
3. dry-run report: 변경 전/후 예상값 생성
4. execute: 사용자가 승인한 대상만 쓰기 호출
5. verify: 다시 상세조회해 실제 반영 여부 확인
6. exception report: 실패 사유/대상 CSV 저장

## 7. 2026-04-27 기본즉시할인 작업에서 확정한 핵심 학습

- `prodmarketservice/prodmarket` 다중상품조회는 `GET`이 아니라 `POST + XML body`다.
- 상품가격/즉시할인 수정은 `POST /rest/prodservices/product/priceCoupon/[prdNo]`다.
- 기본즉시할인 제거 시 최소 payload는 `selPrc`, `cuponcheck=N`이다.
- 고객 노출가 상승을 막으려면 기존 할인 후 실판매가를 새 `selPrc`로 넣고 `cuponcheck=N` 처리한다.
- 실패 패턴:
  - 판매가가 기본즉시할인금액 이하 제한
  - 최대 80% 인하 제한
  - 옵션가격/판매가 범위 제한

## 8. 다음 개발 과제

- 공식 문서 전체 크롤링으로 카탈로그 최신화
- `11st_api.py`에 상품/재고/가격/문의/주문 계열 핵심 명령 추가
- n8n adapter 계약 초안 작성
- MCP wrapper는 CLI 안정화 이후 별도 프로젝트로 분리

## 9. 2026-04-28 브라우저 크롤링 결과

로그인된 11번가 Open API 브라우저 세션으로 공식 개발가이드를 전체 순회했다.

- 카테고리 수: 26개
- API 탭 수: 150개
- Method 분포:
  - GET: 103개
  - POST: 28개
  - PUT: 12개
  - DELETE: 2개
  - Method 미표기/본문 없음: 5개, 주로 물류 API 일부
- 카탈로그:
  - `docs/openmarket-ops/11st-openapi-url-catalog.json`
  - `docs/openmarket-ops/11st-openapi-url-catalog.md`
- 원본 크롤링:
  - `docs/openmarket-ops/11st-openapi-guide-crawl-2026-04-28.json`

### API 관리 화면 확인

`https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall` 기준 확인 사항:

- 권한별 API 체크박스는 보이지 않는다.
- 관리 화면은 API KEY, 셀링툴 업체, IP 직접 입력, 개발자 이메일 중심이다.
- IP 직접 입력은 `사용` 상태로 확인했다.
- 개발서버/개발자PC/상용서버 IP 입력칸이 존재한다.
- KEY 확인 및 이메일 변경은 추가인증 후 가능하다.

즉, 매번 “API별 권한 등록”을 다시 할 문제가 아니라 아래 두 가지를 표준화해야 한다.

1. API 관리 화면에서 운영 서버/개발 PC IP가 등록되어 있는지 확인한다.
2. 호출할 API의 Method와 XML payload를 로컬 카탈로그/CLI가 정확히 사용한다.

## 10. 구현된 공용 도구

```text
_tools/openmarket/11st/README.md
_tools/openmarket/11st/11st_api.py
_tools/openmarket/11st/11st_crawl_guides.py
```

검증한 명령:

```bash
python3 -m py_compile _tools/openmarket/11st/11st_api.py _tools/openmarket/11st/11st_crawl_guides.py
python3 _tools/openmarket/11st/11st_api.py catalog-search 즉시할인 --limit 3
python3 _tools/openmarket/11st/11st_api.py price-coupon-disable 123456 --sel-prc 1000
python3 _tools/openmarket/11st/11st_api.py stock-update 987654 1000 --prd-no 123456
python3 _tools/openmarket/11st/11st_crawl_guides.py --output-dir /tmp/st11-crawl-test --date 2026-04-28-test
```

주의:

- `11st_api.py`는 외부 `requests` 의존 없이 Python 표준 라이브러리로 HTTP/XML을 처리한다.
- `catalog-search`는 API 키가 없어도 가능하다.
- write 계열 명령은 기본 dry-run이고 `--execute`가 있어야 실제 호출한다.

## 11. 메인 병합 후 공용 사용법

메인에 병합되면 모든 프로젝트/worktree에서 아래 기준으로 11번가 API를 사용한다.

```bash
export PRESSCO21_ROOT=/Users/jangjiho/workspace/pressco21
python3 "$PRESSCO21_ROOT/_tools/openmarket/11st/11st_api.py" catalog-search 즉시할인 --limit 3
python3 "$PRESSCO21_ROOT/_tools/openmarket/11st/11st_api.py" catalog-show 1855 --limit 1
```

인증 우선순위는 `--api-key` → `ST11_API_KEY` 환경변수 → `--env-file`의 `ST11_API_KEY`다. `.secrets`, `.secrets.env`, `.env.local`은 읽기만 하고 수정하지 않는다.

권장 진입 문서:

- 빠른 시작: `docs/openmarket-ops/11st-openapi-global-quickstart.md`
- 쓰기 안전 체크리스트: `docs/openmarket-ops/11st-openapi-write-safety-checklist.md`
- 공용 CLI README: `_tools/openmarket/11st/README.md`

## 12. 카탈로그 신뢰도와 한계

2026-04-28 로그인된 11번가 공식 개발가이드 화면을 브라우저로 순회해 생성했다.

- 총 API: 150개
- Method 미표기: 5개
- URL 미확인: 6개
- URL 미확인 apiSeq: `1316`, `1318`, `1319`, `6705`, `6706`, `6732`
- 카탈로그는 `schema_version=1.1`부터 `coverage_summary`, `known_gaps`, `risk_level`, `mutation_reason`, `verify_strategy`를 포함한다.

주의할 점:

- `GET`이라고 항상 read-only가 아니다. 처리/승인/거부/발송/수정/등록/해제/완료/업데이트 계열은 쓰기성 API로 취급한다.
- `mutation=true`는 안전을 위한 보수적 판정이다. execute 전 공식 문서와 fresh read로 반드시 확인한다.
- 같은 API가 여러 카테고리에 반복 등장할 수 있으므로 `api_seq`, `url`, `canonical_key`를 함께 본다.
- 공식 문서 UI가 바뀌면 `11st_crawl_guides.py`로 재크롤하고 이전 JSON과 diff를 확인한다.

## 13. 작업 전 필수 확인

- 현재 branch/worktree가 해당 프로젝트 허용 범위인지 확인한다.
- `docs/openmarket-ops/11st-openapi-url-catalog.json`이 존재하고 JSON 파싱이 되는지 확인한다.
- API KEY, IP 직접 입력, 개발자 PC/n8n/Oracle/운영 서버 IP 등록 여부를 확인한다.
- write API는 `fresh read → dry-run → 승인 → execute → verify` 순서를 지킨다.
- 가격/즉시할인/정산/주문/클레임 영향이 있으면 대표 승인 없이 일괄 실행하지 않는다.

## 14. 긴급 중단/복구 기준

아래 상황에서는 즉시 일괄 실행을 중단한다.

- HTTP 4xx/5xx 또는 실패성 `resultCode`가 반복된다.
- 실행 전 조회한 대상과 실제 execute 대상이 일치하지 않는다.
- verify 조회에서 변경 후 값이 확인되지 않는다.
- 고객 노출가 상승, 옵션가 한도 초과, 정산 손실 가능성이 발견된다.
- IP 등록/추가인증/API KEY 상태가 의심된다.

중단 후에는 실패 대상 CSV/JSON, dry-run payload, fresh read/verify 결과를 저장하고 재시도 전 원인을 분류한다.
