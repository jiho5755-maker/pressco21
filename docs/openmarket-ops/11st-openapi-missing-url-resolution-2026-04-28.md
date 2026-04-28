# 11번가 Open API URL/Method 미확인 항목 재검증 결과

> 검증일: 2026-04-28  
> 기준: 로그인된 11번가 Open API 공식 개발가이드와 API TEST 화면 DOM 재확인

## 결론

활성 API 기준 URL/Method 미확인 항목은 0개로 정리했다.

| apiSeq | 라벨 | 최종 상태 | 처리 |
|---:|---|---|---|
| 6732 | 실재고체크를 통한 옵션품절 리스트 조회 | 활성 API URL 확인 | `GET https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}` |
| 1316 | 전세계배송 주문리스트 | 공식 문서 본문 없음/API TEST URL 빈 값 | `usable=false`, 대체 `1746` 사용 |
| 1318 | 전세계배송 발송처리리스트 | 공식 문서 본문 없음/API TEST URL 빈 값 | `usable=false`, 대체 `1748` 사용 |
| 1319 | 전세계배송 수취인주소조회 | 공식 문서 본문 없음/API TEST URL 빈 값 | `usable=false`, 대체 `1749` 사용 |
| 6705 | SF주문조회 | 공식 문서 본문 없음/API TEST URL 빈 값 | `usable=false`, 자동화 대상 제외 |
| 6706 | SF주문조회 | 공식 문서 본문 없음/API TEST URL 빈 값 | `usable=false`, 자동화 대상 제외 |

## 검증 근거

- 공식 개발가이드 guide URL 재방문
- API TEST URL 재방문
- `apiSpecType=1`, `apiSpecType=2` 모두 확인
- 1316/1318/1319/6705/6706은 guide 화면에서 `Content does not exist`, API TEST preview의 URL 값이 빈 문자열이었다.
- 6732는 guide와 API TEST 모두에서 상대 URL `/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}`가 확인됐다.

## 카탈로그 반영

`docs/openmarket-ops/11st-openapi-url-catalog.json`에는 아래 필드를 추가/보강했다.

- `availability`: `active` 또는 `official_no_content`
- `usable`: 자동화 사용 가능 여부
- `deprecated`: 공식 문서 본문 없음 항목 true
- `replacement_api_seq`: 대체 API가 있는 경우 연결
- `verification_status`: 재검증 상태
- `verification_note`: 확인 근거

`known_gaps`는 더 이상 “미확인”을 의미하지 않는다.

- `missing_url_api_seq`: `[]`
- `missing_method_api_seq`: `[]`
- `official_no_content_api_seq`: `1316`, `1318`, `1319`, `6705`, `6706`

## 6732 실사용 호출 결과

CLI 명령도 추가했다.

```bash
python3 _tools/openmarket/11st/11st_api.py --env-file .secrets.env realtime-soldout-options 202604010000 202604282359
```

현재 로컬 실행 환경에서는 URL/Method는 정상 구성됐지만 11번가 응답이 `resultCode=-500`, `인증된 IP가 아닙니다`로 반환됐다. 이는 URL/Method 문제가 아니라 6732 계열 API가 현재 호출 IP 등록을 요구하는 상태로 판단한다.

운영 사용 전 확인:

1. API 관리 화면에서 실행 PC 또는 n8n/Oracle 서버 IP 등록
2. 등록 후 위 read-only 명령 재실행
3. 성공 시 `root=soldoutList`, `resultCode=200` 또는 `soldout_items` 응답 확인

CLI는 이 오류 응답에 포함될 수 있는 공인 IP를 `[IP_REDACTED]`로 마스킹한다.
