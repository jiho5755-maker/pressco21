# PRD: Naver Ads MCP

> **프로젝트명**: `naver-ads-mcp` — 네이버 검색광고 + 쇼핑검색광고 + 커머스 API 통합 MCP 서버
> **작성일**: 2026-04-17
> **작성자**: 최민석 CTO (PRESSCO21)
> **요청자**: 장지호 팀장 (대표)
> **버전**: 1.0 (착수용)
> **라이선스**: Apache 2.0 (추후 오픈소스 공개 예정)
> **저장소 예정 경로**: `pressco21/mcp-servers/naver-ads-mcp/` (GitHub private → 검증 후 public)
> **참고 모델**: [`pipeboard-co/meta-ads-mcp`](https://github.com/pipeboard-co/meta-ads-mcp) (Python, Apache 2.0)

---

## 1. 제품 개요

### 1.1 이름

**naver-ads-mcp** — 네이버 광고 생태계 전반을 Claude/Cursor/Claude Desktop에서 자연어로 운영하기 위한 Model Context Protocol 서버.

### 1.2 한 줄 설명

네이버 검색광고·쇼핑검색광고·커머스(스마트스토어) API를 하나의 MCP 서버로 묶어, LLM이 캠페인을 조회·진단·최적화·집행할 수 있게 하는 도구 모음.

### 1.3 핵심 가치

1. **대화형 운영**: 광고주가 "지난 7일 ROAS 100% 미만 키워드 전부 입찰가 -20% 낮춰줘"를 자연어로 지시 → MCP가 조회·계산·변경을 일괄 수행.
2. **데이터 단일화**: 검색광고(searchad.naver.com) + 커머스(apicenter.commerce.naver.com) + 데이터랩(developers.naver.com)을 한 인터페이스에서 상호 참조.
3. **안전 장치 내장**: 입찰가 변경·예산 조정·소재 수정 등 "돈이 새는 작업"은 dry-run / confirm 플래그로 이중 안전.
4. **PRESSCO21 맞춤**: 꽃공예 쇼핑몰(foreverlove.co.kr) 4,706 SKU 운영 맥락을 전제로, 쇼핑검색광고 최적화 시나리오를 1급 시민(first-class)으로 취급.

---

## 2. 배경 및 목적

### 2.1 왜 만드는가 (비전공자용 설명)

PRESSCO21은 네이버 검색광고, 쿠팡광고, 메타(Facebook/Instagram) 광고를 병행 집행 중이다. 이 중 네이버 쇼핑검색광고는 **자사 스마트스토어로 직결되는 주력 채널**이지만, 현재 운영 방식은 다음과 같다:

- 네이버 광고 관리시스템(NAVER Search Ad) 웹 UI에 수동 로그인
- 엑셀 다운로드 → 정유나 CMO가 수동 분석 → 장지호 팀장 승인 → 다시 웹 UI에서 입찰가 수정
- 주 1~2회 최적화에 머무르며, 사이클이 1주일 단위로 돌아감

이 방식은 **초당 최적화가 가능한 영역에서 주간 최적화에 머무는 기회비용**을 매일 누적시킨다. 또한 메타 광고 쪽은 `pipeboard-co/meta-ads-mcp`(Stars 772)로 MCP 기반 자동화가 가능한 반면, 네이버는 **검증된 오픈소스 MCP가 존재하지 않는다**(ND-SPACE Stars 0 검토 후 기각).

따라서 자체 제작하여:
- 로컬 Claude Code에서 "이번 주 ROAS 저조한 키워드 진단해줘" → 즉시 수행
- n8n에서 HTTP MCP 호출 → 자동 입찰 조정
- 향후 ad-operations 에이전트가 대화형으로 운영 → 운영 인력 0.5인 절감

### 2.2 해결할 문제

| 문제 | 현재 상태 | MCP 도입 후 |
|------|----------|------------|
| 광고 데이터 취합 | 수동 엑셀 다운로드 | 도구 1회 호출로 JSON 응답 |
| 입찰가 일괄 변경 | 웹 UI 한 건씩 수정 | 자연어 조건 기반 bulk update |
| 부진 키워드 탐지 | 주 1회 사람이 확인 | 정기 프롬프트 + 임계값 알림 |
| 쇼핑검색광고-상품DB 매칭 | 수동 크로스 체크 | 커머스 API 조합으로 자동 매칭 |
| 경쟁 키워드 트렌드 | 따로 데이터랩 조회 | 동일 MCP 안에서 호출 |
| ad-operations 에이전트 운영 | 불가 (API 접근 수단 없음) | MCP 도구 호출로 자율 실행 |

### 2.3 성공 지표 (KPI)

| 지표 | 현재 | 3개월 목표 | 측정 방법 |
|------|------|-----------|----------|
| 쇼핑검색광고 전체 ROAS | 미측정(예상 180%) | 260% | stat reports 주간 평균 |
| 광고 최적화 주기 | 7일 | 24시간 | 입찰 변경 로그 |
| 부진 키워드 자동 off 처리량 | 0 | 주 30건 | MCP 감사 로그 |
| 운영 인력 시간 | 주 6시간 | 주 1시간 | 정유나 CMO 체감 |
| MCP 도구 호출 성공률 | — | 99% | 서버 로그 |

---

## 3. 페르소나 및 사용 시나리오

### 3.1 페르소나

| 페르소나 | 기술 수준 | 주 사용 환경 | 주요 관심사 |
|----------|----------|------------|------------|
| **장지호 팀장** (대표, 바이브코더) | 비전공자, LLM 친화 | Claude Code / Cursor | "왜 오늘 ROAS 떨어졌어?" 같은 자연어 진단 |
| **정유나 CMO** (AI 페르소나) | AI 임원 | Claude Code `/board-call 정유나 ...` | 캠페인 전략 수립, 월간 리뷰 |
| **ad-operations** (AI 실무) | AI 실무진 | n8n → HTTP MCP 호출 | 반복 실행, 임계값 기반 자동 조치 |

### 3.2 사용 시나리오 5개

#### 시나리오 ①: 일일 건강 체크 (장지호 팀장)
```
지호님: "@naver-ads 오늘 오전 쇼핑검색광고 현황 3줄 요약해줘"
Claude: → get_shopping_campaigns → get_stat_summary(today)
        → "오늘 09~11시 노출 12,450 / 클릭 187 / 광고비 43,200원 /
           구매 5건 / ROAS 214%. 어제 동시간 대비 클릭 -18%,
           입찰가 경쟁 심화 추정."
```

#### 시나리오 ②: 부진 키워드 일괄 정리 (장지호 팀장)
```
지호님: "지난 14일 노출 100회 이상이면서 전환 0건인 키워드
        전부 OFF, dry-run으로 먼저 목록만 보여줘"
Claude: → get_stat_by_keyword(period=14d, minImpressions=100)
        → filter(conversions==0)
        → "후보 23개: '꽃꽂이 초보', '프리저브드 원데이'...
           dry-run 완료. 실제 OFF 실행하려면 confirm=true로 다시 요청"
지호님: "확정"
Claude: → update_keywords(ids=[...], status=OFF)
```

#### 시나리오 ③: 쇼핑검색광고 상품 커버리지 점검 (정유나 CMO)
```
CMO: "/board-call 정유나 스마트스토어 전체 상품 대비 쇼핑검색광고
      소재 등록률 점검"
정유나: → commerce_list_products() → 312 상품
        → get_shopping_ads() → 87 소재
        → "등록률 28%. 미등록 주력 SKU: 프리저브드 장미 3종,
           드라이플라워 부케 5종. 광고 등록 필요"
```

#### 시나리오 ④: ad-operations 야간 자동 최적화 (AI 에이전트)
```
n8n 매일 02:00 → ad-operations 에이전트 트리거
→ MCP 호출 순서:
  1. get_stat_yesterday() (CPC/전환 전량)
  2. compute_keyword_score() (자체 알고리즘)
  3. update_bids_bulk(dry_run=true)
  4. notify_telegram(요약 + 승인 링크)
  5. 지호님 승인 후 dry_run=false 재실행
```

#### 시나리오 ⑤: 쇼핑 인사이트 기반 신규 키워드 탐색
```
지호님: "5월 어버이날 관련 급상승 검색어 조회해서
        우리 카네이션 SKU랑 매칭되는 후보 10개 뽑아줘"
Claude: → datalab_shopping_trends(category="플라워", period="2026-04")
        → commerce_search_products(keyword="카네이션")
        → 매칭 알고리즘 → 후보 리스트 반환
```

---

## 4. 범위 (Scope)

### 4.1 In-scope (Phase 1·2·3)

**Phase 1 (D+1~D+7, MVP):**
- 네이버 검색광고 API 인증 (HMAC-SHA256 서명)
- 네이버 커머스 API 인증 (OAuth 2.0 client_credentials)
- 캠페인/광고그룹/키워드/광고(소재) 조회·생성·수정·삭제
- 통계 리포트 조회 (일별/시간별/키워드별)
- 쇼핑검색광고 조회 도구
- stdio 모드 MCP 서버 (Claude Code/Cursor/Desktop 로컬 연결)

**Phase 2 (D+8~D+14, 확장):**
- 스마트스토어 상품/주문/문의 조회·기본 수정
- bulk 작업 도구 (입찰가 일괄 변경, 키워드 대량 off)
- dry-run / confirm 이중 안전 장치
- stat reports 비동기 처리 (report request → polling → download)
- 쇼핑 인사이트 도구 (데이터랩)
- JSON 스키마 기반 파라미터 검증

**Phase 3 (D+15~D+30, 심화):**
- HTTP SSE 모드 (n8n/플로라에서 호출 가능)
- 자동 최적화 플레이북 도구 (combined tools)
- 감사 로그 (누가 언제 어떤 도구로 얼마를 바꿨는지)
- CI 단위 테스트 + mock 서버
- GitHub 공개 전 보안 감사

### 4.2 Out-of-scope

- **네이버 디스플레이 광고(브랜드검색/플레이스 등)**: Phase 3 이후 별도 검토
- **검색광고 계정 신청/심사**: 공식 웹 UI 전용
- **결제/세금계산서 발급**: 네이버페이 정산은 커머스 API 조회만, 발급은 제외
- **GPT 직접 연동**: MCP 표준 준수만, OpenAI/제미나이 전용 SDK 래퍼 미포함
- **UI 대시보드**: CLI + MCP 호출만. 향후 mini-app 연계 시 별도 프로젝트

---

## 5. 기능 요구사항 (MCP 도구 명세)

### 5.1 공통 규칙

- **네이밍**: `<리소스>_<동작>` 스타일 (`keyword_list`, `keyword_update_bid`)
- **파라미터**: snake_case, 필수/선택 명시, Pydantic 모델로 검증
- **출력**: JSON 직렬화 가능한 dict. 네이버 원본 응답을 그대로 통과시키지 않고 꼭 필요한 필드만 정규화
- **오류**: `{"ok": false, "error": {"code": "NAVER_429", "message": "...", "retry_after": 60}}` 형식 통일

### 5.2 도구 목록

| # | 도구명 | 설명 | 주요 입력 | 출력 | 대응 엔드포인트 | Phase |
|---|--------|------|----------|------|----------------|-------|
| **인증/시스템** |
| 1 | `auth_status` | 현재 인증 상태·만료일 | - | `{searchad, commerce}` | - | 1 |
| 2 | `auth_refresh_commerce_token` | 커머스 토큰 수동 갱신 | - | 새 토큰 만료 | `/external/v1/oauth2/token` | 1 |
| 3 | `api_rate_limit_status` | 현재 Rate Limit 잔여 | - | `{searchad, commerce}` | - | 2 |
| **캠페인 (검색광고)** |
| 4 | `campaign_list` | 캠페인 전체 조회 | `ids?`, `campaignType?` | 캠페인 배열 | `GET /ncc/campaigns` | 1 |
| 5 | `campaign_get` | 캠페인 단건 조회 | `id` | 캠페인 객체 | `GET /ncc/campaigns/{id}` | 1 |
| 6 | `campaign_create` | 캠페인 생성 | 캠페인 속성 | 생성된 캠페인 | `POST /ncc/campaigns` | 1 |
| 7 | `campaign_update` | 캠페인 수정 (예산/기간/상태) | `id`, 필드 | 수정 결과 | `PUT /ncc/campaigns/{id}` | 1 |
| 8 | `campaign_update_budget_bulk` | 예산 일괄 변경 | `[{id, budget}]`, `dry_run` | 변경 요약 | N회 PUT | 2 |
| 9 | `campaign_delete` | 캠페인 삭제 | `id` | 삭제 결과 | `DELETE /ncc/campaigns/{id}` | 1 |
| **광고그룹** |
| 10 | `adgroup_list` | 광고그룹 조회 | `campaignId?` | 배열 | `GET /ncc/adgroups` | 1 |
| 11 | `adgroup_get` | 단건 조회 | `id` | 객체 | `GET /ncc/adgroups/{id}` | 1 |
| 12 | `adgroup_create` | 생성 | 그룹 속성 | 생성 결과 | `POST /ncc/adgroups` | 1 |
| 13 | `adgroup_update` | 수정 (입찰가/매칭타입/상태) | `id`, 필드 | 결과 | `PUT /ncc/adgroups/{id}` | 1 |
| 14 | `adgroup_update_bid_bulk` | 입찰가 일괄 | `[{id, bidAmt}]`, `dry_run` | 요약 | N회 PUT | 2 |
| 15 | `adgroup_delete` | 삭제 | `id` | 결과 | `DELETE /ncc/adgroups/{id}` | 1 |
| **키워드** |
| 16 | `keyword_list` | 키워드 조회 | `adgroupId?`, `status?` | 배열 | `GET /ncc/keywords` | 1 |
| 17 | `keyword_get` | 단건 | `id` | 객체 | `GET /ncc/keywords/{id}` | 1 |
| 18 | `keyword_create_bulk` | 대량 등록 | `[{text, bidAmt, ...}]` | 결과 배열 | `POST /ncc/keywords` | 1 |
| 19 | `keyword_update_bid_bulk` | 입찰가 일괄 변경 | `[{id, bidAmt}]`, `dry_run` | 요약 | N회 PUT | 1 |
| 20 | `keyword_update_status_bulk` | ON/OFF 일괄 | `[{id, status}]`, `dry_run` | 요약 | N회 PUT | 1 |
| 21 | `keyword_delete_bulk` | 대량 삭제 | `ids[]`, `dry_run` | 요약 | N회 DELETE | 2 |
| **광고 소재 (ads)** |
| 22 | `ad_list` | 소재 조회 | `adgroupId?` | 배열 | `GET /ncc/ads` | 1 |
| 23 | `ad_get` | 단건 | `id` | 객체 | `GET /ncc/ads/{id}` | 1 |
| 24 | `ad_create` | 소재 생성 | type, 필드 | 결과 | `POST /ncc/ads` | 1 |
| 25 | `ad_update` | 수정 | `id`, 필드 | 결과 | `PUT /ncc/ads/{id}` | 1 |
| 26 | `ad_update_status_bulk` | 상태 일괄 | `[{id, status}]`, `dry_run` | 요약 | N회 PUT | 2 |
| 27 | `ad_delete` | 삭제 | `id` | 결과 | `DELETE /ncc/ads/{id}` | 1 |
| **비즈니스 채널 / 확장소재** |
| 28 | `business_channel_list` | 비즈채널 (쇼핑/플레이스 등) 조회 | - | 배열 | `GET /ncc/channels` | 1 |
| 29 | `label_list` | 라벨(그룹) 조회 | - | 배열 | `GET /ncc/labels` | 2 |
| **통계 리포트** |
| 30 | `stat_get_realtime` | 실시간 요약 | `entityType`, `ids[]`, `fields[]` | 시계열 | `GET /stats` | 1 |
| 31 | `stat_get_by_date` | 일자별 | 범위, 대상 | 배열 | `GET /stats?timeIncrement=allDays` | 1 |
| 32 | `stat_get_by_hour` | 시간별 | 범위, 대상 | 배열 | `GET /stats?timeIncrement=hourly` | 1 |
| 33 | `stat_report_request` | 대용량 비동기 요청 | 타입, 기간 | `reportJobId` | `POST /stat-reports` | 2 |
| 34 | `stat_report_status` | 생성 상태 폴링 | `reportJobId` | 상태 | `GET /stat-reports/{id}` | 2 |
| 35 | `stat_report_download` | 결과 다운로드 | `reportJobId` | TSV 파싱 배열 | signed URL | 2 |
| **쇼핑검색광고 (Power Shopping)** |
| 36 | `shopping_campaign_list` | 쇼핑 캠페인 조회 | - | 배열 | `GET /ncc/campaigns?type=SHOPPING` | 1 |
| 37 | `shopping_product_list` | 쇼핑 소재(상품) 조회 | `adgroupId?` | 배열 | `GET /ncc/ad-products` | 1 |
| 38 | `shopping_product_update_bid` | 상품 입찰가 | `id`, `bidAmt`, `dry_run` | 결과 | `PUT /ncc/ad-products/{id}` | 1 |
| 39 | `shopping_product_update_bid_bulk` | 일괄 | 배열, `dry_run` | 요약 | N회 | 1 |
| 40 | `shopping_keyword_add_exclusion` | 제외 키워드 추가 | `adgroupId`, 키워드 | 결과 | `POST /ncc/negative-keywords` | 2 |
| **스마트스토어 (커머스)** |
| 41 | `commerce_product_list` | 상품 조회 | 페이지, 필터 | 배열 | `GET /external/v1/products/search` | 1 |
| 42 | `commerce_product_get` | 단건 | `productNo` | 객체 | `GET /external/v1/products/{productNo}` | 1 |
| 43 | `commerce_product_update_stock` | 재고 수정 | `productNo`, 수량 | 결과 | `PATCH /external/v1/products/{productNo}/stock` | 2 |
| 44 | `commerce_product_update_price` | 가격 수정 | `productNo`, 가격 | 결과 | `PATCH /external/v1/products/{productNo}/price` | 2 |
| 45 | `commerce_order_list` | 주문 조회 | 기간, 상태 | 배열 | `POST /external/v1/pay-order/seller/product-orders/query` | 1 |
| 46 | `commerce_inquiry_list` | 문의 조회 | 기간 | 배열 | `GET /external/v1/pay-order/seller/inquiries` | 2 |
| 47 | `commerce_settlement_list` | 정산 조회 | 기간 | 배열 | `GET /external/v1/settlements` | 2 |
| **쇼핑 인사이트 / 데이터랩 (개발자센터)** |
| 48 | `shopping_trend_category` | 카테고리 트렌드 | `category`, `period` | 시계열 | `POST /datalab/shopping/categories` | 2 |
| 49 | `shopping_trend_keyword` | 키워드 트렌드 | `keyword`, `period` | 시계열 | `POST /datalab/shopping/category/keywords` | 2 |
| 50 | `search_trend` | 검색어 트렌드 | 키워드, 기간 | 시계열 | `POST /datalab/search` | 2 |
| **복합 플레이북 (Phase 3)** |
| 51 | `playbook_daily_healthcheck` | 일일 광고 헬스체크 | - | 요약 리포트 | 여러 도구 조합 | 3 |
| 52 | `playbook_low_performer_sweep` | 저성과 자동 정리 | 임계값, `dry_run` | 제안 | 여러 도구 조합 | 3 |
| 53 | `playbook_new_keyword_scout` | 신규 키워드 발굴 | seed 키워드 | 제안 리스트 | datalab + commerce 조합 | 3 |

> 도구 총 53개 (Phase 1: 33, Phase 2: 17, Phase 3: 3). 실제 구현 중 네이버 API 명세와 불일치가 발견되면 doc/changes.md 기록 후 조정.

---

## 6. 비기능 요구사항

### 6.1 성능 / Rate Limit

| 소스 | Rate Limit | 대응 전략 |
|------|-----------|----------|
| 네이버 검색광고 | 공식 문서상 초당 3~5건 (리소스별) | `aiolimiter` 기반 token bucket, 도구당 지연 반영 |
| 네이버 커머스 | 2 calls/sec | `asyncio.Semaphore(2)` + 지수 백오프 |
| 메이크샵 | 500/hr | (본 MCP 범위 외, 참고만) |
| DataLab | 일 1,000회 | in-memory cache 24h |

- 응답 시간 목표: 단건 도구 < 800ms, bulk 도구 100건 < 8s
- 동시 실행 안전: 각 도구는 `asyncio` 기반, 동일 세션 내 경쟁 상태 방지

### 6.2 보안

- **시크릿 관리**:
  - 환경변수 `.env` + `pydantic-settings` 로드
  - 절대 저장소 커밋 금지 (`.gitignore` + pre-commit 훅)
  - 배포 시: 로컬은 `~/.naver-ads-mcp/.env`, 플로라는 `/home/ubuntu/naver-ads-mcp/.env`
- **PII 마스킹**: 주문 조회 시 구매자 이름/전화번호는 기본적으로 `홍*동`, `010-****-1234` 마스킹, `unmask=true` 명시한 도구 호출 시에만 노출
- **쓰기 가드**: `MCP_WRITE_ENABLED=true` 환경변수 없으면 PUT/POST/DELETE 도구 호출 자체 거부
- **감사 로그**: 모든 쓰기 도구는 `logs/audit-YYYY-MM-DD.jsonl` 에 `{ts, tool, params_hash, caller}` 기록

### 6.3 로깅

- 구조: JSON Lines, 레벨 `INFO/WARN/ERROR`
- 출력: stdout (MCP stdio 모드에서는 stderr만 사용, stdout는 프로토콜 예약)
- 필수 필드: `ts, level, tool, duration_ms, status_code, rate_limit_remaining`

### 6.4 에러 처리 원칙

- 네이버 원본 오류 메시지를 **한국어로 번역**하여 LLM이 이해 가능한 힌트 추가
- `retry_after` 헤더 존재 시 자동 재시도 (최대 3회, 지수 백오프)
- LLM이 연쇄 호출할 때 마지막 3회 오류를 메모리에 유지, 동일 오류 반복 시 호출 차단

---

## 7. 기술 스택

| 레이어 | 선택 | 비고 |
|-------|------|------|
| 언어 | Python 3.12 | meta-ads-mcp 호환, 최신 타입 지원 |
| MCP SDK | `mcp` (공식 Anthropic Python SDK, 최신 stable) | FastMCP 데코레이터 패턴 |
| HTTP | `httpx` (async) | 리트라이/타임아웃 내장 |
| 검증 | `pydantic` v2 | 파라미터 + 응답 모델 |
| Rate limiter | `aiolimiter` | 토큰버킷 |
| 설정 | `pydantic-settings` + `.env` | - |
| 로깅 | `structlog` | JSON Lines 출력 |
| 테스트 | `pytest` + `pytest-asyncio` + `respx` (httpx mock) | - |
| 빌드/패키지 | `uv` (권장) 또는 `pip` + `pyproject.toml` | uv 우선 |
| 린트 | `ruff` + `mypy --strict` | CI 필수 |

### 7.1 프로젝트 구조

```
pressco21/mcp-servers/naver-ads-mcp/
├── pyproject.toml
├── README.md
├── LICENSE (Apache-2.0)
├── .env.example
├── .gitignore
├── src/naver_ads_mcp/
│   ├── __init__.py
│   ├── server.py              # MCP 엔트리포인트 (FastMCP)
│   ├── config.py              # pydantic-settings
│   ├── auth/
│   │   ├── searchad.py        # HMAC-SHA256 서명
│   │   └── commerce.py        # OAuth2 client_credentials
│   ├── clients/
│   │   ├── searchad.py        # httpx 래퍼
│   │   ├── commerce.py
│   │   └── datalab.py
│   ├── models/
│   │   ├── campaign.py
│   │   ├── adgroup.py
│   │   ├── keyword.py
│   │   ├── ad.py
│   │   ├── stat.py
│   │   └── commerce.py
│   ├── tools/                 # MCP 도구 정의
│   │   ├── campaigns.py
│   │   ├── adgroups.py
│   │   ├── keywords.py
│   │   ├── ads.py
│   │   ├── stats.py
│   │   ├── shopping.py
│   │   ├── commerce.py
│   │   ├── datalab.py
│   │   └── playbooks.py
│   ├── utils/
│   │   ├── rate_limit.py
│   │   ├── audit_log.py
│   │   └── pii.py
│   └── errors.py
├── tests/
│   ├── unit/
│   ├── integration/           # mock 서버 기반
│   └── fixtures/
└── docs/
    ├── tool-catalog.md
    ├── changes.md
    └── playbooks.md
```

---

## 8. 시스템 아키텍처

### 8.1 다이어그램 (텍스트)

```
[Claude Code / Cursor / Desktop]
           │ (stdio JSON-RPC)
           ▼
  ┌──────────────────────────────┐
  │   naver-ads-mcp server       │
  │  ─ FastMCP tools registry    │
  │  ─ Auth managers (2종)       │
  │  ─ Rate limiter              │
  │  ─ Audit logger              │
  └────┬──────────────────┬──────┘
       │                  │
  HMAC 서명 요청       OAuth Bearer 요청
       │                  │
       ▼                  ▼
  api.searchad.naver.com  api.commerce.naver.com
  (+ openapi.naver.com/datalab)
```

- 로컬(stdio): Claude Code가 자식 프로세스로 MCP 서버 실행, stdio로 JSON-RPC
- 원격(Phase 3 HTTP SSE): 플로라 서버에서 `uvicorn` 기반 SSE 엔드포인트 공개, Tailscale + 토큰 인증

### 8.2 인증 흐름

**네이버 검색광고 (HMAC-SHA256)** — 요청마다 서명:
```
timestamp = str(int(time.time() * 1000))
method = "GET"  # 또는 POST/PUT/DELETE
path = "/ncc/campaigns"
msg = f"{timestamp}.{method}.{path}"
signature = base64(hmac_sha256(SECRET_KEY, msg))
headers = {
  "X-Timestamp": timestamp,
  "X-API-KEY": API_KEY,
  "X-Customer": CUSTOMER_ID,
  "X-Signature": signature,
  "Content-Type": "application/json"
}
```
- API_KEY / SECRET_KEY / CUSTOMER_ID: 네이버 검색광고 → API 사용 관리
- 서명 실패 시 `401 Invalid Signature` → 원인(timestamp drift, path 오타, body hash 여부) 자동 진단 로직 포함

**네이버 커머스 (OAuth 2.0 client_credentials)** — 토큰 3시간 만료:
```
POST /external/v1/oauth2/token
  grant_type=client_credentials
  type=SELF
  client_id=7hUEKOQGxDpri42gkU0OGH
  client_secret=<>
  timestamp=<millis>
  client_secret_sign=bcrypt(client_id + "_" + timestamp, client_secret)
→ { access_token, expires_in=10800 }

이후 모든 요청:
  Authorization: Bearer <access_token>
```
- 토큰 캐시: 파일 `~/.naver-ads-mcp/commerce_token.json` (권한 600)
- 만료 5분 전 자동 갱신

### 8.3 실행 모드

| 모드 | 전송 | 용도 | Phase |
|------|------|------|-------|
| stdio | JSON-RPC over stdio | 로컬 IDE (Claude Code/Cursor) | 1 |
| SSE / streamable HTTP | FastAPI + MCP SSE 어댑터 | 원격 (n8n, 플로라 AI) | 3 |

---

## 9. 데이터 모델

### 9.1 Campaign (검색광고)
```python
class Campaign(BaseModel):
    nccCampaignId: str           # "cmp-a001-01-000000000"
    customerId: int
    name: str
    campaignTp: Literal["WEB_SITE","SHOPPING","POWER_CONTENTS","BRAND_SEARCH","PLACE"]
    deliveryMethod: Literal["STANDARD","ACCELERATED"]
    dailyBudget: int            # 원 단위
    useDailyBudget: bool
    period: dict                # { startDt, endDt }
    status: Literal["ELIGIBLE","PAUSED","DELETED"]
    statusReason: str | None
    regTm: datetime
    editTm: datetime
```

### 9.2 AdGroup
```python
class AdGroup(BaseModel):
    nccAdgroupId: str
    nccCampaignId: str
    name: str
    adgroupType: str
    bidAmt: int
    dailyBudget: int | None
    useDailyBudget: bool
    targets: list[TargetRule]   # 디바이스/시간대/지역
    keywordPlusWeight: int | None
    status: Literal["ELIGIBLE","PAUSED","DELETED"]
```

### 9.3 Keyword
```python
class Keyword(BaseModel):
    nccKeywordId: str
    nccAdgroupId: str
    keyword: str
    bidAmt: int
    useGroupBidAmt: bool
    userLock: bool
    inspectStatus: Literal["APPROVED","REJECTED","WAITING"]
    status: Literal["ELIGIBLE","PAUSED","DELETED"]
```

### 9.4 ShoppingProductAd
```python
class ShoppingProductAd(BaseModel):
    nccAdId: str
    nccAdgroupId: str
    type: Literal["SHOPPING_PRODUCT"]
    productId: str              # 스마트스토어 productNo와 매칭
    productName: str
    bidAmt: int
    status: Literal["ELIGIBLE","PAUSED","DELETED"]
    inspectStatus: str
```

### 9.5 StatRow
```python
class StatRow(BaseModel):
    entityId: str               # 캠페인/그룹/키워드/광고 ID
    date: date | None
    hour: int | None
    impCnt: int
    clkCnt: int
    salesAmt: int               # 광고비(원)
    ctr: float
    cpc: float
    avgRnk: float | None
    ccnt: int                   # 전환 수
    convAmt: int                # 전환 금액
    roas: float
```

### 9.6 CommerceProduct (스마트스토어)
```python
class CommerceProduct(BaseModel):
    productNo: int
    channelProductNo: int
    name: str
    statusType: str             # SALE, OUTOFSTOCK, ...
    salePrice: int
    stockQuantity: int
    categoryId: str
    representativeImage: str
    createdDate: datetime
    modifiedDate: datetime
```

---

## 10. 인증 흐름 상세

### 10.1 검색광고 서명 생성 (Python 예시)

```python
import hmac, hashlib, base64, time

def sign(method: str, uri: str, secret: str) -> tuple[str, str]:
    ts = str(int(time.time() * 1000))
    msg = f"{ts}.{method}.{uri}".encode()
    sig = base64.b64encode(
        hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    ).decode()
    return ts, sig
```

- **중요**: `uri`는 쿼리스트링 제외 순수 path (`/ncc/campaigns`). 일부 리소스는 hyphen 포함.
- 타임스탬프는 서버 시간과 5초 이내 동기화 필요 → `ntpdate` 또는 OS NTP 활성 확인.

### 10.2 커머스 OAuth 토큰 (client_secret_sign)

네이버 커머스 `client_secret_sign`은 bcrypt 기반이며 특이 규칙이 있다:

```python
import bcrypt, time, base64

def commerce_sign(client_id: str, client_secret: str) -> tuple[str, str]:
    ts = str(int(time.time() * 1000))
    password = f"{client_id}_{ts}"
    hashed = bcrypt.hashpw(password.encode(), client_secret.encode())
    sign = base64.urlsafe_b64encode(hashed).decode()
    return ts, sign
```

- `client_secret`을 bcrypt salt로 사용하는 비표준 방식. 일반 `bcrypt.checkpw`와 혼동 주의.
- 응답의 `expires_in`은 초 단위 (10800 = 3시간).

---

## 11. API 엔드포인트 매핑

### 11.1 검색광고 (일부 발췌)

| 리소스 | 메서드 | 경로 | MCP 도구 |
|--------|-------|------|---------|
| campaigns | GET | `/ncc/campaigns` | campaign_list |
| campaigns | GET | `/ncc/campaigns/{id}` | campaign_get |
| campaigns | POST | `/ncc/campaigns` | campaign_create |
| campaigns | PUT | `/ncc/campaigns/{id}` | campaign_update |
| adgroups | GET | `/ncc/adgroups` | adgroup_list |
| keywords | GET | `/ncc/keywords` | keyword_list |
| keywords | POST | `/ncc/keywords` | keyword_create_bulk |
| ads | GET | `/ncc/ads` | ad_list |
| ad-products | GET | `/ncc/ad-products` | shopping_product_list |
| stats | GET | `/stats` | stat_get_* |
| stat-reports | POST | `/stat-reports` | stat_report_request |
| stat-reports | GET | `/stat-reports/{id}` | stat_report_status |

> 전체 매핑은 `docs/tool-catalog.md`에 최신 상태로 유지. API 변경 시 이 문서가 단일 진실 소스.

### 11.2 커머스 (일부)

| 리소스 | 메서드 | 경로 | MCP 도구 |
|--------|-------|------|---------|
| products | POST | `/external/v1/products/search` | commerce_product_list |
| products | GET | `/external/v1/products/{productNo}` | commerce_product_get |
| products/stock | PATCH | `/external/v1/products/{productNo}/stock` | commerce_product_update_stock |
| pay-order | POST | `/external/v1/pay-order/seller/product-orders/query` | commerce_order_list |
| inquiries | GET | `/external/v1/pay-order/seller/inquiries` | commerce_inquiry_list |

---

## 12. 스마트스토어 광고 최적화 전략 (핵심)

### 12.1 데이터 흐름

```
매일 02:00 (플로라)
├─ shopping_campaign_list → 활성 캠페인 ID
├─ shopping_product_list → 소재(상품) 전체
├─ stat_get_by_date (yesterday, entityType=AD) → 전환/ROAS
├─ commerce_product_list → 스마트스토어 실제 재고/가격
└─ playbook_low_performer_sweep 호출
     ├─ ROAS < 100% AND 노출 > 500 → 입찰 -20% 후보
     ├─ ROAS > 300% AND 노출상위 < 5위 → 입찰 +10% 후보
     ├─ 재고 0 → 상품 상태 PAUSED (commerce 동기화)
     └─ 결과: dry_run 제안 → 텔레그램 승인 요청 → confirm 실행
```

### 12.2 핵심 메트릭과 대응 도구

| 시그널 | 판단 기준 | 자동 조치 |
|--------|----------|----------|
| 노출 많고 전환 0 | 14일 노출 ≥ 100, 전환 = 0 | keyword_update_status_bulk(OFF) |
| 전환 우수 키워드 | ROAS > 300%, 평균 순위 > 5 | adgroup_update_bid_bulk(+10%) |
| 재고 0 상품 광고 | commerce stock = 0 AND ad ELIGIBLE | shopping_product_update_bid(0 or PAUSED) |
| 경쟁 심화 CPC 급등 | CPC 전주 대비 +30% AND ROAS 악화 | adgroup_update_bid_bulk(-15%) + 제외 키워드 검토 |
| 신규 급상승 키워드 | datalab 급상승 상위 50 AND 자사 상품 매칭 | keyword_create_bulk (검토 후) |

### 12.3 안전 규칙

- 입찰가 변동폭은 기본 ±20% 상한 (env `MAX_BID_DELTA_PCT` 조정 가능)
- 일일 자동 조치 건수 상한: 100건/그룹 (env `MAX_AUTO_ACTIONS_PER_DAY`)
- 모든 자동 조치는 감사 로그 + 텔레그램 요약 리포트

---

## 13. 에러 처리

| 코드 | 의미 | 처리 |
|------|------|------|
| 400 BAD_REQUEST | 파라미터 오류 | Pydantic 검증 단계에서 선행 차단, 그래도 발생하면 원본 에러 + 힌트 반환 |
| 401 UNAUTHORIZED | 서명/토큰 실패 | 서명 구성요소 덤프(단 시크릿 제외) + 자가 진단 |
| 403 FORBIDDEN | 권한 부족 | 네이버 광고 계정 권한 확인 안내 |
| 404 NOT_FOUND | 리소스 없음 | ID 오타 가능성 안내 |
| 409 CONFLICT | 상태 충돌 (예: 삭제된 캠페인 수정) | 최신 상태 재조회 후 재시도 제안 |
| 429 TOO_MANY_REQUESTS | Rate Limit | `Retry-After` 준수, 최대 3회 재시도, 실패 시 에이전트에 대기 요청 |
| 5xx SERVER_ERROR | 네이버 장애 | 즉시 재시도 X, 30초 후 1회 재시도, 반복 실패 시 `SERVICE_UNAVAILABLE` 반환 |

모든 에러 응답은 다음 구조:
```json
{
  "ok": false,
  "error": {
    "code": "NAVER_SA_429",
    "http_status": 429,
    "message_ko": "네이버 검색광고 API 초당 요청 한도를 초과했습니다",
    "retry_after_sec": 1,
    "upstream": { "raw": {...} },
    "hint": "도구 호출 간격을 늘리거나 bulk 도구를 사용해주세요"
  }
}
```

---

## 14. 테스트 계획

### 14.1 단위 테스트

- `tests/unit/test_auth_searchad.py`: HMAC 서명 알려진 입력 → 알려진 출력 검증
- `tests/unit/test_auth_commerce.py`: bcrypt 서명 + 토큰 캐시
- `tests/unit/test_rate_limit.py`: 초당 제한 준수 검증
- `tests/unit/test_pii.py`: 마스킹 규칙
- 각 도구별 파라미터 검증 테스트

### 14.2 통합 테스트 (respx 기반 mock)

- `tests/integration/test_campaign_flow.py`: list → create → update → delete
- `tests/integration/test_keyword_bulk.py`: 200건 bulk + 부분 실패 시나리오
- `tests/integration/test_stat_report.py`: request → polling → download

### 14.3 수동 테스트 시나리오

1. **D+3**: 샌드박스/테스트 캠페인 1개 생성 → 조회 → 삭제
2. **D+5**: 운영 캠페인 keyword_list 호출 → 실제 데이터 반환 확인
3. **D+7**: stat_get_by_date(어제, 주력 캠페인) → 광고 관리시스템 수치와 ±1% 이내 일치
4. **D+10**: dry_run 모드 bulk bid 변경 → 실제 변경 없이 제안만 출력 확인
5. **D+12**: confirm 모드로 테스트 키워드 1개 변경 → 실제 반영 5분 내 확인
6. **D+14**: Phase 2 전체 스모크

### 14.4 CI

- GitHub Actions (추후 public 전): ruff + mypy + pytest
- 보안 스캐너: `bandit` + `pip-audit`
- 커버리지 목표: 단위 80% / 통합 60%

---

## 15. 배포 계획

### 15.1 저장소

- 초기 2주: `jiho5755-maker/n8n-automation` private 또는 신규 private repo `jiho5755-maker/naver-ads-mcp`
- 보안 감사 후 public 전환 + `Apache-2.0` 라이선스 명시

### 15.2 배포 환경

| 환경 | 전송 | 인증 | 용도 |
|------|------|------|------|
| 로컬 (Claude Code/Cursor) | stdio | `.env` 파일 | 장지호 팀장 대화형 |
| 플로라 Docker (Phase 3) | SSE over HTTPS | Bearer 토큰 + Tailscale | n8n WF 호출, 정유나 CMO 에이전트 |

### 15.3 설정 샘플

**Claude Code config (`~/.claude/mcp.json` 또는 `~/.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "naver-ads": {
      "command": "uv",
      "args": ["--directory", "/Users/jangjiho/workspace/pressco21/mcp-servers/naver-ads-mcp", "run", "naver-ads-mcp"],
      "env": {
        "NAVER_SA_API_KEY": "...",
        "NAVER_SA_SECRET_KEY": "...",
        "NAVER_SA_CUSTOMER_ID": "...",
        "NAVER_COMMERCE_CLIENT_ID": "7hUEKOQGxDpri42gkU0OGH",
        "NAVER_COMMERCE_CLIENT_SECRET": "...",
        "MCP_WRITE_ENABLED": "true"
      }
    }
  }
}
```

### 15.4 릴리스 규칙

- SemVer, `v0.x.y` (0.x는 Breaking 허용), `v1.0.0`은 외부 공개 시점
- 변경 로그: `CHANGELOG.md` Keep-a-Changelog 형식

---

## 16. 일정 / 마일스톤

| 기간 | Phase | 주요 산출 |
|------|-------|----------|
| **D+1 (4/18)** | 킥오프 | 네이버 검색광고 API 키 발급 완료, 저장소 생성, 뼈대 커밋 |
| **D+2~3** | Phase 1 | auth/searchad + auth/commerce + auth_status 도구 동작 |
| **D+4~5** | Phase 1 | campaign/adgroup/keyword/ad 각 list·get·create·update·delete |
| **D+6~7** | Phase 1 | shopping_* 핵심 4개 + stat_get_* + Claude Code에서 MVP 시연 |
| **D+8~10** | Phase 2 | commerce_* 7개 + datalab + bulk 도구 + dry_run 장치 |
| **D+11~14** | Phase 2 | stat_report 비동기 + 감사 로그 + 통합 테스트 + 정유나 CMO 시연 |
| **D+15~21** | Phase 3 | playbook 3종 + 자동 최적화 n8n WF 초안 + 플로라 HTTP SSE |
| **D+22~28** | Phase 3 | 보안 감사 + 단위/통합 테스트 + 문서화 |
| **D+29~30** | 오픈 | GitHub public + README + 블로그 포스트 (선택) |

### 16.1 각 단계 Exit 기준

- Phase 1: Claude Code에서 "오늘 쇼핑검색광고 CTR 알려줘" 1회 호출로 응답
- Phase 2: "지난 14일 전환 0 키워드 OFF dry_run" 시나리오 통과
- Phase 3: n8n에서 매일 02:00 트리거 → playbook_low_performer_sweep → 텔레그램 리포트 + 승인 플로우 1주 안정 운영

---

## 17. 리스크 및 완화

| 리스크 | 가능성 | 영향 | 완화 |
|--------|-------|------|------|
| 네이버 커머스 API 인증 갱신 (~2026-09-01) | 확정 | 중단 위험 | 8월 첫 주에 갱신 리마인더 + 자동 갱신 스크립트 |
| 검색광고 API 미발급 상태로 착수 불가 | 중 | Phase 1 지연 | 지호님 이번 주 발급 → 대기 중 커머스 도구부터 개발 가능 |
| Rate Limit 문서가 내부 문서와 다름 | 중 | 운영 장애 | 실측 기반 가드 + 422 / 429 감지 시 자동 완화 |
| 네이버 API 스펙 변경 (비정기) | 중 | 특정 도구 실패 | 변경 로그 watcher + `docs/changes.md` 운영 |
| 시크릿 유출 | 낮 | 치명 | pre-commit 훅 + git-secrets + 감사 로그 + 토큰 파일 권한 600 |
| dry_run을 빼먹고 bulk 호출 | 중 | 광고비 손실 | `MCP_WRITE_ENABLED=false` 기본값, 명시 opt-in 필요 |
| bcrypt 기반 서명 호환 문제 | 낮 | 커머스 연동 실패 | OpenSDK 패키지(`commerce-api-helper`) 참고 후 자체 구현 |
| HTTP SSE 원격 공개 시 악용 | 낮 | 보안 사고 | Tailscale 내부망 + Bearer 토큰 + IP 화이트리스트 (158.180.77.201, 158.179.193.173) |

---

## 18. 오픈 이슈

다음 항목은 별도 세션에서 결정 필요:

1. **[인증 범위]** 네이버 검색광고는 "광고주 계정당 키 1조(Key+Secret+CustomerID)". MCP를 여러 광고주(본사/스토어 분리) 지원 구조로 설계할지, 단일 광고주 전용으로 할지. → Phase 3 시점 결정 권장.
2. **[쓰기 가드 수준]** `MCP_WRITE_ENABLED=true`만으로 충분한가, 아니면 도구별 `--confirm` 플래그까지 이중으로 강제할지. → 정유나 CMO 의견 반영 필요.
3. **[데이터 보존 기간]** 감사 로그 / stat cache를 며칠간 보관할지 (30일 / 90일 / 무제한). → CFO 박서연 승인.
4. **[공개 범위]** GitHub public 전환 시 PRESSCO21 사내 정보(쇼핑몰 URL, 일부 카테고리 예시)를 제거할지, 유지할지. → 법무 조현우 리뷰.
5. **[쇼핑 인사이트 쿼터]** 데이터랩 일 1,000회 한도 안에서 어떤 키워드 세트를 우선 트래킹할지. → 정유나 CMO + SEO 담당 협의.
6. **[다국어 대응]** 도구 설명(description) 한국어 vs 영어. GitHub 공개 시 영어 필요, 내부 쓰임은 한국어 선호. → `lang=ko|en` 환경변수로 스위치하는 초기 설계 권장.

---

## 부록 A. 빠른 착수 체크리스트 (다른 세션 Day 1)

- [ ] `pressco21/mcp-servers/naver-ads-mcp/` worktree 생성
- [ ] `uv init` + `pyproject.toml` 작성 (python 3.12, mcp, httpx, pydantic v2, aiolimiter, structlog)
- [ ] `src/naver_ads_mcp/server.py`에 FastMCP 초기화 + `auth_status` 도구 1개
- [ ] `.env.example` + `.gitignore` + `pre-commit` + `LICENSE(Apache-2.0)`
- [ ] 네이버 검색광고 HMAC 서명 단위 테스트부터 (알려진 입력/출력 fixture)
- [ ] Claude Code에 stdio 연결 → `auth_status` 호출 → 성공 메시지 확인
- [ ] 이후 본 PRD의 Phase 1 도구를 상위(`campaign_list` 등)부터 순차 구현
- [ ] 매 도구 구현 후 `docs/tool-catalog.md` 업데이트

## 부록 B. 참고 링크

- 네이버 검색광고 API 문서: https://naver.github.io/searchad-apidoc/
- 네이버 커머스 API 센터: https://apicenter.commerce.naver.com/
- 네이버 개발자센터 (데이터랩): https://developers.naver.com/docs/serviceapi/datalab/
- MCP 공식 문서: https://modelcontextprotocol.io/
- 참고 MCP 구현: https://github.com/pipeboard-co/meta-ads-mcp
- `example-skills:mcp-builder` 스킬 (Claude Code 내장)

---

**끝.** 이 PRD 하나로 신규 개발 세션(Claude Code 또는 주니어 개발자)이 Day 1부터 착수 가능하도록 설계되었다. 실장된 규칙 중 "왜 이 선택인지" 근거가 필요한 항목은 본문에 주석 형태로 명시했으며, 변경 시 `docs/changes.md`에 기록한다.
