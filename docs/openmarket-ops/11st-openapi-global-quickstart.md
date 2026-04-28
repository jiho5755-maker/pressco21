# 11번가 Open API 글로벌 빠른 시작

> 대상: 11번가 API를 처음 쓰는 다음 세션, n8n 작업자, 개발자.  
> 원칙: 키/쿠키를 출력하지 않고, write API는 `fresh read → dry-run → 승인 → execute → verify` 순서로만 실행한다.

## 1. 기준 파일

| 목적 | 파일 |
|---|---|
| 전체 지침 | `docs/openmarket-ops/11st-openapi-global-kit.md` |
| URL/Method 카탈로그 | `docs/openmarket-ops/11st-openapi-url-catalog.md` |
| 자동화용 JSON 카탈로그 | `docs/openmarket-ops/11st-openapi-url-catalog.json` |
| 공용 CLI | `_tools/openmarket/11st/11st_api.py` |
| 공식 문서 크롤러 | `_tools/openmarket/11st/11st_crawl_guides.py` |

## 2. 아무 디렉터리에서 실행

메인 worktree 병합 후에는 절대경로로 실행한다.

```bash
export PRESSCO21_ROOT=/Users/jangjiho/workspace/pressco21
python3 "$PRESSCO21_ROOT/_tools/openmarket/11st/11st_api.py" catalog-search 재고 --limit 3
```

작업 worktree 안이라면 상대경로도 가능하다.

```bash
python3 _tools/openmarket/11st/11st_api.py catalog-search 재고 --limit 3
```

## 3. 5분 점검 명령

API 키 없이 가능한 로컬 점검:

```bash
python3 _tools/openmarket/11st/11st_api.py catalog-search 즉시할인 --limit 3
python3 _tools/openmarket/11st/11st_api.py catalog-show 1855 --limit 1
python3 _tools/openmarket/11st/11st_api.py product-search-dry --prd-name 꽃레진 --limit 5 --start 1 --end 5
python3 _tools/openmarket/11st/11st_api.py stock-update 987654 1000 --prd-no 123456
python3 _tools/openmarket/11st/11st_api.py price-coupon-disable 123456 --sel-prc 1000
```

키/IP 등록 후 read-only 점검:

```bash
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env auth-check
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env product-search --limit 1
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env realtime-soldout-options 202604010000 202604282359
```

## 4. 인증/IP 체크

11번가 Open API는 API KEY만으로 끝나지 않는다. API 관리 화면에서 개발자 PC, n8n/Oracle 서버, 운영 서버 IP가 등록되어 있어야 한다. 사무실/서버 IP가 바뀌면 기존에 되던 호출도 실패할 수 있다.

API KEY 확인, 이메일 변경, 일부 관리 화면 접근은 추가인증이 필요하다. 사람 운영자가 브라우저에서 직접 로그인과 추가인증을 완료하고, 자동화는 로그인 이후 화면만 탐색한다.

```bash
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh open \
  'https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall' --headed
```

확인할 항목:

- API KEY 관리가 정상 표시되는지
- IP 직접 입력이 `사용`인지
- 개발자 PC IP, n8n/Oracle 서버 IP, 운영 서버 IP가 등록되어 있는지
- 셀링툴 업체 설정과 개발자 이메일이 현재 운영 기준과 맞는지

## 5. API 카탈로그 읽는 법

- `method`: HTTP method. 단, 11번가는 `GET`이어도 처리/승인/거부/발송/수정/등록이면 쓰기성 API로 취급한다.
- `payload_type`: XML이면 HTTP body를 XML로 보낸다.
- `mutation`: 안전을 위해 쓰기성/상태변경으로 분류한 값이다.
- `risk_level`: `critical`, `high`는 대상 식별자와 승인 없이는 실행하지 않는다.
- `guide_url`/`tester_url`: 공식 문서와 API TEST 화면으로 역추적한다.

## 6. n8n 작업자 패턴

- Credential 또는 환경변수에서 `ST11_API_KEY`를 주입한다.
- HTTP Request node header: `openapikey: {{$env.ST11_API_KEY}}`
- 상품조회처럼 조회 API도 `POST + XML body`일 수 있으므로 catalog의 `method`와 `payload_type`을 먼저 본다.
- 운영 workflow는 dry-run workflow와 execute workflow를 분리한다.
- 응답 XML은 EUC-KR/CP949 가능성을 고려해 파싱한다.

## 7. write API 실행 전

실행 전 반드시 `docs/openmarket-ops/11st-openapi-write-safety-checklist.md`를 따른다.
