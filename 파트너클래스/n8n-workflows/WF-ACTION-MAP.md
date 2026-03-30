# 파트너클래스 n8n 워크플로우 액션 맵

> 최종 업데이트: 2026-03-21

## WF-01 Class API (라우터)
**서버 ID**: `WabRAcHmcCdOpPzJ`
**Webhook**: `/webhook/class-api`
**구조**: 라우터 → 하위 WF 분기

| 액션 | 라우트 그룹 | 하위 WF | 설명 |
|------|------------|---------|------|
| `getClasses` | classRead | WF-01A | 클래스 목록 (필터/정렬/페이지네이션) |
| `getClassDetail` | classRead | WF-01A | 클래스 상세 (파트너+일정 포함) |
| `getCategories` | classRead | WF-01A | 카테고리 목록 + 카운트 |
| `getSchedules` | scheduleRead | WF-01B | 특정 클래스 일정 목록 |
| `getRemainingSeats` | scheduleRead | WF-01B | 잔여석 확인 |
| `getAffiliations` | affiliationRead | WF-01C | 협회 목록 |
| `getSeminars` | affiliationRead | WF-01C | 세미나 목록 |
| `getAffiliationDetail` | affiliationRead | WF-01C | 협회 상세 |
| `getVocabulary` | affiliationRead | WF-01C | 용어 사전 |
| `getContentHub` | affiliationRead | WF-01C | 콘텐츠 허브 |

## WF-ADMIN Admin API
**서버 ID**: `SMCKmeLSfxs1e1Ef`
**Webhook**: `/webhook/admin-api`
**인증**: `_auth` body (member_id + group_name + group_level) 또는 Bearer 토큰

| 액션 | 설명 |
|------|------|
| `getApplications` | 파트너 신청 목록 조회 |
| `approveApplication` | 파트너 신청 승인 |
| `rejectApplication` | 파트너 신청 반려 |
| `getPendingClasses` | 승인 대기 강의 목록 |
| `approveClass` | 강의 승인 |
| `rejectClass` | 강의 반려 |
| `getSettlements` | 정산 내역 조회 |
| `completeSettlement` | 정산 확정 (일괄) |
| `getAffilStats` | 협회 통계 |

## 기타 워크플로우

| WF | 서버 ID | Webhook | 용도 |
|----|---------|---------|------|
| WF-05 Order Polling | `W3DFBCKMmgylxGqD` | Cron | 주문 폴링 + 수수료 계산 |
| WF-08 Partner Approve | `89eQKUm5KNeVRtYf` | `/webhook/partner-auth` | 파트너 인증/승인 |
| WF-11 Reminders | `1UFFVf24uNRDwn58` | Cron | D-3/D-1 리마인더 |
| WF-12 Reviews | `zUxqaEHZpYwMspsC` | `/webhook/review-submit` | 후기 작성 |
| WF-13 Grade | `cvZYsiGJBEQAXm9i` | Cron (매월 1일) | 등급 자동 심사 |
| WF-17 Approve | `N3p7L6wo0nuT5cqM` | 내부 | 클래스 승인 + 메이크샵 상품 등록 |
| WF-18 Schedule | `2ErVjzWyafqC9RBP` | `/webhook/schedule-manage` | 일정 CRUD |
| WF-19 Bookings | `Zvk8akZ20VnfsQeN` | `/webhook/booking` | 수강생 예약 |
| WF-20 Class Edit | `EHjVijWGTkUkYNip` | `/webhook/class-edit` | 클래스 수정 |
| WF-SETTLE | `hhwZTICxtewsb31D` | Cron (매월 1일, 비활성) | 월간 정산 자동 계산 |
| WF-AFFIL | `cqEGvqHywZm1ifSV` | Cron | 협회 월간 구매액 집계 |

## 프론트엔드 → WF 매핑

| 프론트엔드 페이지 | 호출 WF | 액션 |
|-----------------|---------|------|
| 목록 (2606) | WF-01 | getClasses, getCategories |
| 상세 (2607) | WF-01, WF-19 | getClassDetail, getSchedules, booking |
| 파트너 대시보드 (2608) | WF-08, WF-01 | partner-auth, partner-data |
| 파트너 신청 (2609) | WF-08 | partner-apply |
| 교육 (2610) | WF-08 | partner-auth (교육 상태) |
| 강의등록 (8009) | WF-20 | class-edit (신규) |
| 마이페이지 (8010) | WF-19, WF-12 | 내 예약/후기 |
| 어드민 (8011) | WF-ADMIN | getApplications, approveClass 등 |
