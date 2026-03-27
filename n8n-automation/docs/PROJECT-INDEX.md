# Pressco21 자동화 프로젝트 현황

> 최종 업데이트: 2026-03-03

---

## 인프라 요약

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud Free Tier ARM (2 OCPU / 12GB RAM) |
| 서버 IP | 158.180.77.201 |
| n8n | https://n8n.pressco21.com |
| NocoDB | https://nocodb.pressco21.com |
| 강사 신청 폼 | https://nocodb.pressco21.com/apply |
| 텔레그램 봇 1 | @Pressco21_bot (Chat ID: 7713811206) — 업무/정부지원사업 |
| 텔레그램 봇 2 | @Pressco21_makeshop_bot — 쇼핑몰/FA |
| 활성 WF 수 | 43개 (2026-03-03 기준) |

---

## 프로젝트별 현황

### 1. 업무 일정 자동화 (`automation-project/`)

| 항목 | 내용 |
|------|------|
| 목적 | 텔레그램/구글캘린더로 노션 업무를 편하게 입력 |
| 상태 | **Phase 3 완료** — 운영 안정화 단계 |
| 봇 | @Pressco21_bot |

**운영 워크플로우 (4개):**

| WF | 트리거 | 역할 |
|----|--------|------|
| F2 구글캘린더 동기화 | 5분마다 | 노션 할 일 → 구글캘린더 |
| F3 모닝브리핑 | 매일 08:00 | 오늘 할 일 요약 텔레그램 |
| F4 밀린업무 알림 | 매일 09:00 | 기한 초과 업무 텔레그램 |
| F5 주간 리포트 | 매주 월요일 | 주간 업무 현황 요약 |

---

### 2. 정부지원사업 자동수집 (`govt-support/`)

| 항목 | 내용 |
|------|------|
| 목적 | 기업마당/K-Startup/보조금24 → AI 분석 → 텔레그램 알림 |
| 상태 | **Phase 7 완료** — Google Docs 사업계획서 자동생성 포함 |
| 봇 | @Pressco21_bot |
| PRD | `govt-support/PRD-v3.md` |
| ROADMAP | `govt-support/ROADMAP.md` |

**운영 워크플로우 (7개):**

| WF | n8n ID | 트리거 | 역할 |
|----|--------|--------|------|
| WF#1 자동수집+AI분석 | `7MXN1lNCR3b7VcLF` | 매일 09:00 | API 3개 수집 → Gemini 배치 분석 → 알림 |
| WF#2 마감임박 재알림 | `3TXzJ9AADTf9oNL6` | 매일 09:30 | 마감 3일 전 공고 재알림 |
| WF#3 월간리포트 | `oeIOcnDYpSDmbkKp` | 매월 1일 | 월간 수집 공고 요약 |
| WF#4 이벤트기반탐색 | `Is13frkTT5USFXyI` | 매주 월요일 | 회사 상황 변화 기반 공고 탐색 |
| WF#5 행정서류자동생성 | `TsJQE6BxL3HQM6Ax` | 매 4시간 | 신청의향=true 감지 → Google Docs 생성 |
| WF#6 텔레그램허브 | `HxskyYvTbFvRzgaa` | 텔레그램 명령어 | /검색 /요약 /이벤트 /상태 /신청 /서류 |
| WF#7 주간TOP5 | `FedVm1QWsvUeUjUn` | 매주 금요일 17:00 | 관련도 50점 이상 TOP5 리포트 |

**NocoDB 테이블:**

| 테이블 | ID |
|--------|-----|
| 정부지원공고 | `m9pvnifrpmwmbvs` |
| 회사상황_이벤트 | `m5bh1vt0khkxhxw` |
| 회사_프로파일 | `mptlhf2fqskxwkk` |

**n8n Credentials:**

| 서비스 | Credential ID |
|--------|---------------|
| Gemini AI | `qC5YRvdMTRVPbAmQ` |
| Google Drive OAuth2 | `2e6e75e1-2d4f-40ac-b992-c12aef75e69e` |
| Google Docs OAuth2 | `49ff74cd-f8de-48b4-bbfd-1b0bd8333e75` |
| MSIT API (중기부) | `Ymg1WkzG6h1Ffz81` |

---

### 3. 쇼핑몰 운영 자동화 (`homepage-automation/`)

| 항목 | 내용 |
|------|------|
| 목적 | 메이크샵 D4 쇼핑몰 1인 운영 자동화 (CS/리뷰/강사/SNS/챗봇) |
| 상태 | **F050 Phase 2 완료** — AI 챗봇 + FA 강사 시스템 운영 중 |
| 봇 | @Pressco21_makeshop_bot |
| ACTION 가이드 | `homepage-automation/ACTION-GUIDE.md` |
| ROADMAP | `homepage-automation/ROADMAP.md` |

**운영 워크플로우 (7개):**

| WF | n8n ID | 트리거 | 역할 |
|----|--------|--------|------|
| FA-001 강사 등급변경 | `jaTfiQuY35DjgrxN` | 5분마다 | 승인대기 → 메이크샵 등급변경 → 이메일 |
| FA-002 강사 신청알림 | `ovWkhq7E0ZqvjBIZ` | 1시간마다 | 새 신청 텔레그램 알림 |
| FA-003 강사 반려이메일 | `Ks4JvBC06cEj6b8b` | 5분마다 | 반려 → 고객 이메일 자동 발송 |
| F030a SNS 일일리마인더 | `A2VToTXNoaeHu29N` | 매일 09:00 | 내일 SNS 발행 예정 알림 |
| F030b SNS 주간리포트 | `3X7AM40dgQP4SQAO` | 매주 월요일 | 주간 SNS 일정 요약 |
| F050 AI 챗봇 백엔드 | `krItUablejX8YLNV` | Webhook | FAQ매칭+의도분류+Gemini응답+피드백 |
| F050b 챗봇 피드백 수집 | `C3VQdprEjzQiiEW9` | Webhook | 피드백 NocoDB 기록 |

**NocoDB 테이블:**

| 테이블 | ID |
|--------|-----|
| 강사공간 | `mcafm2yyeaupdnt` |
| 챗봇 로그 | `mlivh63v7ekssew` |
| 챗봇 설정 | `m44vkmso6lzoef9` |
| AI챗봇_FAQ | `m56konamendfq6h` |

**Webhook 주소:**

| 서비스 | URL |
|--------|-----|
| AI 챗봇 | `https://n8n.pressco21.com/webhook/f050-chat` |
| 챗봇 피드백 | `https://n8n.pressco21.com/webhook/f050-feedback` |

**n8n Credentials:**

| 서비스 | Credential ID |
|--------|---------------|
| NocoDB | `Vyw7FAboYUzOK48Q` |
| Gemini AI | `YOec0pTXalcgCh8e` |
| 네이버 SMTP | `31jTm9BU7iyj0pVx` |
| 텔레그램 쇼핑몰봇 | `RdFu3nsFuuO5NCff` |

**다음 작업 (우선순위순):**
1. F050 Phase 5 (AI-first 고도화) — FAQ 키워드 매칭 제거, AI-only 응답
2. 메이크샵 기본 하단에 FAB 코드 배포 (ACTION-GUIDE Step 5B)

---

## 전체 Credential 빠른 참조

| 서비스 | Credential ID | 용도 |
|--------|---------------|------|
| @Pressco21_bot | 별도 텔레그램 설정 | 업무/정부지원사업 |
| @Pressco21_makeshop_bot | `RdFu3nsFuuO5NCff` | 쇼핑몰/FA |
| Notion API | Header Auth | 업무 DB |
| Google Calendar | OAuth2 | 캘린더 동기화 |
| Google Drive | `2e6e75e1-...` | Docs 생성 |
| Gemini (정부지원) | `qC5YRvdMTRVPbAmQ` | WF#1 AI 분석 |
| Gemini (챗봇) | `YOec0pTXalcgCh8e` | F050 챗봇 |
| NocoDB | `Vyw7FAboYUzOK48Q` | 챗봇/FA DB |
| SMTP 네이버 | `31jTm9BU7iyj0pVx` | 이메일 발송 |
| MSIT API | `Ymg1WkzG6h1Ffz81` | 중기부 공공데이터 |

> **Note**: Gemini WF#1과 F050은 동일한 API 키를 사용합니다. 키 갱신 시 두 Credential 모두 업데이트 필요.

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| `GETTING-STARTED.md` | 새 환경 세팅 가이드 |
| `PRESSCO21-GUIDE.md` | 운영 가이드 (서버/WF 관리/FA 시스템) |
| `_tools/README.md` | 배포 스크립트 사용법 |
| `_tools/deploy.sh` | 안전한 WF 배포 스크립트 |
