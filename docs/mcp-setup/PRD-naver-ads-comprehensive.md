# PRD: 네이버 광고 종합 운영 계획

> **프로젝트명**: PRESSCO21 네이버 광고 MCP + 운영 종합 계획
> **작성일**: 2026-04-17
> **버전**: 3.0 (v1 MCP 도구 + v2 고도화 + 운영 전략 통합)
> **승인**: 장지호 팀장 (대표)
> **관련 문서**: `PRD-naver-ads-mcp.md` (v1), `PRD-naver-ads-mcp-v2.md` (v2), `guide-gfa-adboost.md`

---

## 1. 전체 그림

```
Week 0 (지금)     측정 인프라 구축 + 카탈로그 GFA 시작
Week 1~3          MCP Phase 2 개발 (21개 도구)
Week 2~3          자사몰 전환추적 확인 → GFA 전환 캠페인 시작
Week 4~           MCP 통합 운영 + 자동화 사이클 가동
```

**핵심 원칙**: 측정 안 되면 돈 안 쓴다. 데이터로 검증된 것만 남긴다.

---

## 2. 현재 자산 (Phase 1 완료)

| 자산 | 상태 |
|------|------|
| naver-ads-mcp | 33개 도구, SA+커머스 실 API 검증 완료 |
| 검색광고 계정 | 캠페인 17개(활성 8), 키워드 28개, 쇼핑 7개+파워링크 1개 |
| 스마트스토어 | 1,117개 상품, 커머스 API 연동 완료 |
| 자사몰 (메이크샵) | 4,706개 상품 |
| API 키 | SA 3종 + 커머스 2종 + 개발자센터 2종 발급 완료 |
| GFA API | 파트너 승인 신청 완료, 대기 중 |
| Claude Code MCP | naver-ads 서버 등록 완료 |

---

## 3. 실행 로드맵 (순서 = 의존관계)

### Week 0: 측정 인프라 + 카탈로그 GFA (지금 즉시)

> 돈을 쓰기 전에 측정부터.

#### 0-1. 메이크샵 전환추적 확인/설치

| 단계 | 할 일 | 소요 |
|------|-------|------|
| ① | 메이크샵 어드민 → 기본설정 → 외부서비스 연동 → 네이버 공통인증키 확인 | 5분 |
| ② | 없으면: GFA 광고관리시스템 → 도구 → 전환추적 관리 → 서비스 신청 | 5분 |
| ③ | 승인 메일(1~2일) → 공통인증키 발급 → 메이크샵에 입력 | 10분 |
| ④ | 검증: GFA 전환추적 관리에서 "설치 확인됨" 표시 확인 | 5분 |

**전환추적이 확인되기 전까지 자사몰 GFA는 시작하지 않음.**

#### 0-2. 카탈로그 판매 GFA 시작 (전환추적 불필요)

카탈로그는 스마트스토어 내부 데이터로 자동 측정되므로 즉시 시작 가능.

| 단계 | 할 일 |
|------|-------|
| ① | GFA 광고관리시스템 (gfa.naver.com) 접속 → 광고 계정 생성 |
| ② | 캠페인 만들기 → **"카탈로그 판매"** 선택 |
| ③ | 카탈로그 관리 → 비즈채널(스마트스토어) 연결 → 카탈로그 자동 생성 |
| ④ | 일예산: **3,000원** |
| ⑤ | 타겟: **자동 (다이나믹 리타겟팅)** |
| ⑥ | 완료. 소재 자동 생성, AI 자동 최적화 |

#### 0-3. 7일 후 카탈로그 킬 스위치

| 지표 | 유지 | OFF |
|------|------|-----|
| ROAS | 200% 이상 | 100% 미만 |
| 클릭수 | 주 30+ | 주 5 미만 (노출 자체 안 됨) |
| CPC | 300원 이하 | 500원 이상 |

---

### Week 1: MCP P0 개발 + 전환추적 대기

> MCP 핵심 도구 구축. 전환추적 승인 대기 병행.

#### 1-1. MCP P0 도구 6개 구현

| # | 도구 | 파일 | 내용 |
|---|------|------|------|
| 34 | `negative_keyword_list` | `tools/negative_keywords.py` | 제외 키워드 조회 |
| 35 | `negative_keyword_create_bulk` | 상동 | 제외 키워드 대량 등록 (dry_run) |
| 36 | `negative_keyword_delete_bulk` | 상동 | 제외 키워드 대량 삭제 (dry_run) |
| 37 | `keyword_quality_check` | 상동 | 품질지수 조회 + 저품질 경고 |
| 38 | `budget_pace_check` | `tools/budget_guardian.py` | 예산 소진 속도 체크 |
| 39 | `budget_auto_pause` | 상동 | 초과 캠페인 일시정지 제안 |

+ DataLabClient 신규 작성 (`clients/datalab.py`, `auth/datalab.py`)

#### 1-2. 전환추적 설치 완료 확인

메이크샵 전환추적이 "설치 확인됨"이면 → Week 2에서 자사몰 GFA 시작.

#### 1-3. Week 1 완료 기준

- "압화 그룹 제외 키워드 보여줘" → 실데이터 응답
- "QI 낮은 키워드 알려줘" → 품질지수 4 이하 키워드 목록
- 카탈로그 GFA 7일 데이터 확인 → 유지/OFF 판단

---

### Week 2: MCP P1 개발 + 자사몰 GFA 시작

> 키워드 발굴 + 입찰 시뮬레이터. 전환추적 확인되면 자사몰 GFA 시작.

#### 2-1. MCP P1 도구 8개 구현

| # | 도구 | 내용 |
|---|------|------|
| 40 | `keyword_discover` | 시드→연관 키워드 200개 (검색량/경쟁도/CPC) |
| 41 | `keyword_trend` | 데이터랩 검색량 추이 |
| 42 | `bulk_keyword_filter` | 검색량/CPC 기준 필터링 |
| 43 | `bulk_performance_audit` | 벌크 캠페인 성과 분석 |
| 44 | `keyword_competitor_gap` | 미사용 유망 키워드 발굴 |
| 45 | `bid_simulate` | 입찰가→예상 노출/클릭/비용 |
| 46 | `bid_estimate_position` | 목표 순위에 필요한 입찰가 |
| 47 | `bid_estimate_median` | 경쟁사 중간 입찰가 |

#### 2-2. 자사몰 GFA 전환 캠페인 시작 (전환추적 확인 후만)

| 설정 | 값 |
|------|-----|
| 캠페인 목적 | **웹사이트 전환** (트래픽 아님!) |
| 일예산 | **5,000원** |
| 과금 | CPC |
| 입찰 | 자동 입찰 (AI 학습) |
| 랜딩 | foreverlove.co.kr + UTM 필수 |

광고그룹 3개로 테스트:

| 그룹 | 타겟 | 소재 |
|------|------|------|
| A. 꽃공예 관심 | 여성 25~44 / 핸드메이드+꽃 | 인기 상품 이미지 |
| B. 인테리어 관심 | 전체 25~49 / 인테리어+홈데코 | 프리저브드 이미지 |
| C. 교육 관심 | 여성 30~54 / 자격증+교육 | 파트너클래스 이미지 |

**UTM 형식**: `?utm_source=naver_gfa&utm_medium=display&utm_campaign=그룹명`

#### 2-3. Week 2 완료 기준

- "압화 관련 키워드 뽑아줘" → 200개 + 검색량/경쟁도 표
- "압화재료 200원 넣으면?" → 예상 노출/클릭/비용 시뮬레이션
- 자사몰 GFA 3개 그룹 라이브

---

### Week 3: MCP P2 개발 + GFA 킬 스위치 판단

> 벌크 자동화 + 광고 문구 + A/B 테스트. GFA 7일 데이터 판단.

#### 3-1. MCP P2 도구 7개 구현

| # | 도구 | 내용 |
|---|------|------|
| 48 | `bulk_auto_prune` | 30일 전환 0 키워드 자동 OFF |
| 49 | `bulk_bid_optimizer` | 전환 키워드 입찰가 인상 |
| 50 | `ad_copy_context` | 키워드+상품+경쟁소재 데이터 수집 → Claude가 문구 생성 |
| 51 | `ad_copy_best_patterns` | CTR 상위 소재 패턴 추출 |
| 52 | `ab_test_create` | 소재 A/B 등록 + 비교 기간 설정 |
| 53 | `ab_test_evaluate` | CTR/전환율 비교 → 패배 소재 OFF |
| 54 | `landing_url_audit` | 랜딩 URL 자사몰 비중 리포트 |

#### 3-2. GFA 전환 캠페인 7일 킬 스위치

| 지표 | 유지 | OFF |
|------|------|-----|
| CTR | 0.3% 이상 | 0.1% 미만 |
| CPC | 300원 이하 | 500원 이상 |
| 전환 | 1건 이상 | 클릭 100+ 전환 0 |
| ROAS | 200% 이상 | 100% 미만 → 즉시 중단 |

```
판단:
  그룹A ROAS 350% → 유지, 예산 +2,000원
  그룹B 전환 0건  → 즉시 OFF, 예산을 A에 이동
  그룹C ROAS 250% → 유지
```

#### 3-3. Week 3 완료 기준

- "벌크 30일 전환 0 키워드 정리해줘" → dry_run 목록 + 승인 후 실행
- A/B 테스트 생성/평가 시나리오 통과
- GFA 3개 그룹 중 살릴 것/죽일 것 판단 완료

---

### Week 4: 통합 운영 시작

> MCP 54개 도구 완성. 모든 광고를 데이터 기반으로 운영.

#### 4-1. 벌크 자동 사이클 가동

```
매주 월  keyword_discover → 연관 키워드 수백 개 수확
  ↓
자동    bulk_keyword_filter → 검색량 100+, CPC 200원 이하
  ↓
확인 후  keyword_create_bulk → 벌크 캠페인에 최저가(70원) 등록
  ↓
매주 금  bulk_performance_audit → 전환 키워드 하이라이트
  ↓
매월 1일 bulk_auto_prune → 30일 전환 0 키워드 OFF
  ↓
자동    bulk_bid_optimizer → 전환 키워드 +15원 인상
```

#### 4-2. 주간 운영 루틴

| 요일 | 할 일 | MCP 도구 |
|------|-------|---------|
| 월 | 벌크 키워드 수확 + 등록 | keyword_discover → keyword_create_bulk |
| 화 | 제외 키워드 점검 | negative_keyword_list → create_bulk |
| 수 | 품질지수 체크 | keyword_quality_check |
| 목 | 입찰가 시뮬레이션 | bid_simulate + bid_estimate_median |
| 금 | 주간 성과 리뷰 + GFA 데이터 확인 | bulk_performance_audit + GFA 웹 |

#### 4-3. GFA API 승인 후 (시기 미정)

승인되면 naver-ads-mcp에 GFA 도구 6개 추가:
- `gfa_campaign_list`, `gfa_campaign_create`
- `gfa_adgroup_manage`, `gfa_creative_list`
- `gfa_stat_report`, `gfa_budget_adjust`

→ 정유나 CMO가 SA + GFA 통합 관리

---

## 4. 광고비 배분

### 4.1 단계적 증액 (CFO 박서연 권고)

| 단계 | 시기 | 월 예산 | 조건 |
|------|------|---------|------|
| 0단계 | 지금 | **9만원** | 카탈로그 GFA만 (3,000원/일) |
| 1단계 | 전환추적 확인 후 | **99만원** | SA + 카탈로그 + 자사몰 GFA 추가 |
| 2단계 | 3개월차 | **최대 129만원** | GFA ROAS 3.0+ 확인 후 증액 |
| 3단계 | 4개월차~ | **재검토** | 실측 데이터 기반 재배분 |

### 4.2 1단계 상세 (월 99만원)

| 채널 | 일예산 | 월예산 | 측정 방법 | 손익분기 ROAS |
|------|--------|--------|----------|-------------|
| SA 파워링크 (자사몰) | 10,000원 | 30만원 | MCP stat API | 1.7 |
| 쇼핑검색 (전략) | 15,000원 | 45만원 | MCP stat API | 1.8 |
| 쇼핑검색 (벌크) | 3,000원 | 9만원 | MCP stat API | 1.8 |
| GFA 카탈로그 | 3,000원 | 9만원 | GFA 대시보드 (자동) | 1.8 |
| GFA 자사몰 전환 | 5,000원 | 15만원 | 전환추적 + UTM | 1.7 |
| (애드부스트) | (-) | (-) | 수동, 선택사항 | - |
| **합계** | **36,000원** | **108만원** | | |

### 4.3 킬 스위치 총괄

**모든 광고 채널에 동일 원칙 적용:**

| 조건 | 액션 |
|------|------|
| ROAS 300%+ | 예산 증액 검토 |
| ROAS 200~300% | 유지 |
| ROAS 100~200% | 소재/키워드 교체 시도, 2주 후 미개선 시 예산 축소 |
| ROAS 100% 미만 | **즉시 중단** (적자) |
| 전환추적 안 됨 | **돈 안 씀** |

---

## 5. 애드부스트 (별도 트랙)

API 없음. MCP 통합 불가. 선택사항으로 수동 운영.

| 항목 | 내용 |
|------|------|
| 시작 조건 | SA + GFA 안정화 후 여유 있을 때 |
| 세팅 | 스마트스토어센터 → 마케팅 → 애드부스트 → 인기 TOP 30 상품만 ON |
| 일예산 | 5,000원 |
| 측정 | ON/OFF 전후 스마트스토어 매출 비교 (commerce_order_list) |
| 킬 스위치 | 1개월 ROAS 2.0 미만 → OFF |

---

## 6. MCP Phase 2 도구 전체 목록 (21개 추가, 총 54개)

### P0 — Week 1 (6개)

| # | 도구 | API/방식 |
|---|------|---------|
| 34 | `negative_keyword_list` | `GET /ncc/negative-keywords` |
| 35 | `negative_keyword_create_bulk` | `POST /ncc/negative-keywords` |
| 36 | `negative_keyword_delete_bulk` | `DELETE /ncc/negative-keywords` |
| 37 | `keyword_quality_check` | keyword_list 응답 qualityIndex 파싱 |
| 38 | `budget_pace_check` | dailyBudget vs stat salesAmt 비교 (1~3h 지연) |
| 39 | `budget_auto_pause` | campaign_update + dry_run |

### P1 — Week 2 (8개)

| # | 도구 | API/방식 |
|---|------|---------|
| 40 | `keyword_discover` | `GET /keywordstool` |
| 41 | `keyword_trend` | 데이터랩 `POST /v1/datalab/search` |
| 42 | `bulk_keyword_filter` | 내부 필터 로직 |
| 43 | `bulk_performance_audit` | stat_get_by_date 조합 |
| 44 | `keyword_competitor_gap` | keywordstool + keyword_list diff |
| 45 | `bid_simulate` | `POST /estimate/performance/keyword` |
| 46 | `bid_estimate_position` | `POST /estimate/average-position-bid/keyword` |
| 47 | `bid_estimate_median` | `POST /estimate/median-bid/keyword` |

### P2 — Week 3 (7개)

| # | 도구 | API/방식 |
|---|------|---------|
| 48 | `bulk_auto_prune` | keyword_update_status_bulk + 필터 |
| 49 | `bulk_bid_optimizer` | keyword_update_bid_bulk + 전환 분석 |
| 50 | `ad_copy_context` | 키워드+상품+경쟁소재 수집 → Claude 생성 |
| 51 | `ad_copy_best_patterns` | ad_list + stat → CTR 상위 패턴 |
| 52 | `ab_test_create` | ad_create × 2 + 비교 기간 설정 |
| 53 | `ab_test_evaluate` | stat 비교 → 패배 소재 OFF 제안 |
| 54 | `landing_url_audit` | ad_list 응답 URL 분석 |

### 보류 (Phase 3 이월)

| 도구 | 사유 | 시기 |
|------|------|------|
| `adboost_status/toggle` | 공식 API 없음 | API 지원 시 |
| `season_template_suggest/apply` | 시즌 DB 설계 필요 | 9월 가을 시즌 전 |
| `gfa_*` 6개 | 파트너 API 승인 대기 | 승인 후 즉시 |

---

## 7. 기술 아키텍처 변경

### 신규 파일

```
src/naver_ads_mcp/
    auth/datalab.py              [신규]
    clients/datalab.py           [신규]
    tools/negative_keywords.py   [신규] #34~36
    tools/budget_guardian.py     [신규] #38~39
    tools/keyword_discovery.py   [신규] #40~44
    tools/bid_estimate.py        [신규] #45~47
    tools/bulk_optimizer.py      [신규] #48~49
    tools/ad_copy.py             [신규] #50~51
    tools/ab_test.py             [신규] #52~53
    tools/analysis.py            [신규] #37, #54
    models/negative_keyword.py   [신규]
    models/keyword_tool.py       [신규]
    models/bid_estimate.py       [신규]
```

### config.py 추가

```python
naver_dev_client_id: str = ""      # 데이터랩
naver_dev_client_secret: str = ""
bulk_min_search_volume: int = 100
bulk_max_cpc: int = 200
bulk_prune_days: int = 30
bulk_bid_increment: int = 15
```

### 기존 구조 변경 없음

Phase 1의 SearchAdClient, CommerceClient, dry_run, audit_log 패턴 그대로 계승.

---

## 8. 성공 지표

| 지표 | 현재 | 1개월 | 3개월 |
|------|------|-------|-------|
| 광고 관리 시간 | 주 8시간 | 주 4시간 | 주 2시간 |
| 키워드 수 | 28개 | 80개 | 150개 |
| 예산 낭비율 | 추정 15~20% | 10% | 5% 이하 |
| SA ROAS | 미측정 | 측정 시작 | 260% 목표 |
| GFA ROAS | 없음 | 측정 시작 | 카탈로그 350%+ / 전환 200%+ |
| 자사몰 비중 | 34% | 35% | 36~38% |
| 전환추적 커버리지 | 스마트스토어만 | 자사몰 추가 | 전 채널 |

---

## 9. 리스크 및 완화

| 리스크 | 대응 |
|--------|------|
| 전환추적 설치 실패 | UTM + GA4로 간접 측정. 자사몰 GFA는 전환추적 될 때까지 대기 |
| GFA API 승인 거절 | 수동 운영 + 주 1회 데이터 확인으로 충분 |
| stat API 1~3시간 지연 | 예산 가디언은 "실시간 차단"이 아닌 "지연 감지" UX 명시 |
| GFA 적자 | 7일 킬 스위치로 최대 손실 35,000원 제한 |
| keywordstool 일 5,000회 제한 | 벌크 사이클 주 1회면 충분 |

---

## 10. 체크리스트 (지호님용)

### 지금 바로

- [ ] 메이크샵 어드민에서 네이버 전환추적 설치 상태 확인
- [ ] GFA 광고 계정 생성 (gfa.naver.com)
- [ ] GFA 카탈로그 판매 캠페인 생성 (일예산 3,000원)
- [ ] GFA API 파트너 승인 신청 ✅ (완료)

### 1주 후

- [ ] 카탈로그 GFA 7일 데이터 확인 → 유지/OFF 판단
- [ ] 전환추적 설치 확인됨 → 자사몰 GFA 전환 캠페인 생성 가능
- [ ] MCP P0 (제외키워드+QI+예산방어) 구현 완료 확인

### 2주 후

- [ ] MCP P1 (키워드발굴+입찰시뮬) 구현 완료 확인
- [ ] 자사몰 GFA 전환 캠페인 시작 (전환추적 확인된 경우)
- [ ] "압화 관련 키워드 뽑아줘" → MCP로 실행 테스트

### 3주 후

- [ ] MCP P2 (벌크자동화+문구+A/B) 구현 완료 확인
- [ ] 자사몰 GFA 7일 킬 스위치 판단
- [ ] 벌크 자동 사이클 첫 실행

### 1개월 후

- [ ] 전 채널 ROAS 측정 가능한 상태인지 확인
- [ ] 적자 채널 OFF 완료
- [ ] MCP 54개 도구 안정 운영 확인
- [ ] GFA API 승인 여부 확인 → MCP 통합 계획

---

**끝.** 이 문서가 네이버 광고 운영의 단일 진실 소스(Single Source of Truth)입니다. MCP 개발과 광고 운영을 순서대로 진행하되, "측정 → 테스트 → 검증 → 확대" 사이클을 반복합니다.
