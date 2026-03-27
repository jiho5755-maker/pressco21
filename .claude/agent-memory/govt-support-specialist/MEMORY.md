# 정부지원사업 자동화 전문가 메모리

## 현재 시스템 상태 (2026-03-12 분석)

### 운영 워크플로우 7개 (모두 Active)
- WF#1 `7MXN1lNCR3b7VcLF` 자동수집 (09:00 KST) - 41개 노드, 키워드점수화+상위30건 아키텍처
- WF#2 `3TXzJ9AADTf9oNL6` 마감알림 (09:30 KST) - 19개 노드, D-7/D-3/D-1/D-0 단계별
- WF#3 `oeIOcnDYpSDmbkKp` 월간리포트 (매월 1일)
- WF#4 `Is13frkTT5USFXyI` 이벤트탐색 (매주 월요일) - 16개 노드
- WF#5 `TsJQE6BxL3HQM6Ax` 행정서류 (4시간) - 20개 노드, Google Docs 자동생성
- WF#6 `HxskyYvTbFvRzgaa` 텔레그램허브 - 20개 노드, /검색/요약/이벤트/상태/신청/서류
- WF#7 `FedVm1QWsvUeUjUn` 주간TOP5 (금 17:00 KST)

### API 엔드포인트 (검증 완료)
- 기업마당: `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` (crtfcKey=FmSrV3, 100건)
- K-Startup: `https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01` (공공데이터포털 serviceKey)
- 보조금24: `https://api.odcloud.kr/api/gov24/v3/serviceList` (공공데이터포털 serviceKey, lifeArray=중소기업,창업)

### WF#1 아키텍처 핵심
- 3 API -> 정규화 -> Merge -> 중복제거(NocoDB 기존ID 조회) -> 사전필터링 -> 키워드점수화 -> 상위30건 -> 원문크롤링 -> Gemini 배치분석 -> 응답파싱 -> NocoDB 저장 -> 텔레그램
- Gemini: gemini-2.5-flash, thinkingBudget:0, maxOutputTokens:20000
- 키워드: HIGH(20/10) 63개, MID(10/5) 9개, LOW(-15) 20개
- 회사프로파일: Code 내 하드코딩 (NocoDB 회사_프로파일 테이블 존재하나 WF#1에서는 별도 HTTP로 조회)

### ROADMAP 미완료 태스크
- GS-801: 서울시 열린데이터광장 API 연동 (대기)
- GS-802: 공고 원문 크롤링 노드 추가 (대기) - 실제로는 이미 구현됨
- GS-803: 회사 프로파일 NocoDB 테이블 (대기) - 실제로는 이미 생성됨 (mptlhf2fqskxwkk)
- GS-804: Gemini 프롬프트 v2 고도화 (대기) - 부분 구현
- GS-806: 마감 단계별 알림 고도화 (대기) - 실제로는 이미 구현됨 (D-7/D-3/D-1/D-0)
- GS-807: /재검토 명령어 (대기)

### 발견된 이슈
1. API 키가 WF JSON에 하드코딩됨 (serviceKey, crtfcKey)
2. 보조금24 API는 lifeArray=중소기업,창업 필터만 사용 - 여성기업, 소상공인 등 추가 필터 가능
3. WF#1 Gemini 프롬프트에 회사프로파일 하드코딩 vs NocoDB 테이블 존재 - 동기화 필요
4. PRD-v3과 실제 구현 사이 ROADMAP 상태 불일치 (일부 "대기"인데 이미 구현됨)

### 추가 API 소스 심층 조사 결과 (2026-03-12)
**결론: 추가 소스 불필요 -- 기존 3개가 이미 최적 구성**

| 후보 | 판정 | 사유 |
|------|------|------|
| 중소벤처24 (data.go.kr/15113191) | 불필요 | 기업마당의 부분집합(중기부 유관기관만) |
| 중기부 사업공고 (data.go.kr/15113297) | 불필요 | 기업마당과 거의 100% 중복 |
| 고용24 (work24.go.kr) | 불필요 | XML전용+별도심사인증, 고용지원금 공고는 기업마당에 이미 포함 |
| HRD-Net 사업주훈련 (data.go.kr/15037378) | 불필요 | 꽃공예 관련 훈련과정 극소수, 정적 데이터 |
| 서울시 열린데이터광장 (data.seoul.go.kr) | 불필요 | 지원사업 공고 API 없음(통계 데이터만), 서울시 공고는 기업마당 경유 |
| 서울경제진흥원 SBA (sba.seoul.kr) | 불필요 | API 없음, SBA 공고는 기업마당에 게재 |
| 소상공인시장진흥공단 (semas.or.kr) | 불필요 | API 없음, 소진공 공고는 기업마당에 게재 |
| 여성기업종합지원센터 (wbiz.or.kr) | 불필요 | API 없음, 여성기업육성사업 통합공고는 기업마당에 게재 |
| 국세청 세제혜택 | 불필요 | API 없음, "제도"이므로 매일 수집 대상 아님 |

**핵심 인사이트**: 기업마당이 중앙부처+지자체+유관기관 공고를 거의 전수 수집하므로, 다른 정부기관의 공고 API를 추가해도 80-100% 중복됨

**대신 권장하는 개선**:
1. 보조금24 lifeArray 필터 확장 (여성기업, 소상공인, 고용/인력 추가)
2. WF#1 키워드에 고용/세제/서울시 관련 키워드 추가
3. GS-801(서울시 열린데이터광장) ROADMAP 취소 권장
