# Task 201: Google Sheets 데이터 구조 설계 + GAS 기초 API

> **상태**: 코드 완료 (GAS 배포는 관리자 수동 작업 필요)
> **규모**: L
> **예상 기간**: 1~2주
> **의존성**: Task 150 (적립금 API), Task 151 (가상태그), Task 152 (API 예산)
> **우선순위**: Phase 2 최우선

## 목표

파트너 클래스 플랫폼의 데이터 백본을 구축한다.
Google Sheets 3개 시트를 설계하고, GAS 웹 앱(`doGet`/`doPost`) 엔드포인트를 구현한다.
Phase 2의 모든 후속 태스크(Task 202~232)가 이 API를 기반으로 동작한다.

## 대상 파일

- `파트너클래스/class-platform-gas.gs` (신규 생성) - GAS 코드 전체
- `docs/phase2/sheets-design.md` (신규 생성) - Sheets 컬럼 설계 문서

## 기술 전제조건 (검증 완료)

### 파트너 인증 (Task 151 확정)
```
[1단계: 메이크샵 서버 사이드]
HTML: <span id="ptn-user-id" style="display:none"><!--/user_id/--></span>
서버: <!--/user_id/--> -> "jihoo5755" (로그인) 또는 "" (비로그인)
주의: {$member_id} 형식은 메이크샵에서 동작하지 않음! 반드시 <!--/user_id/--> 사용

[2단계: JS 처리]
var memberId = document.getElementById('ptn-user-id').textContent.trim();
if (!memberId) { window.location.href = '/shop/member.html?type=login'; return; }

[3단계: GAS 서버]
1) Referer 체크 (foreverlove.co.kr만 허용)
2) memberId -> Sheets "파트너 상세"에서 매칭
3) 비파트너 -> { success: false, error: "NOT_PARTNER" }
4) 파트너 -> { success: true, partner: { code, grade, name, commissionRate } }
```

### 적립금 API (Task 150 확정)
- Plan A: `process_reserve` 기본 적립금 API
- POST `https://{도메인}/list/open_api_process.html?mode=save&type=reserve&process=give`
- Headers: Shopkey, Licensekey
- Body: `datas[0][id]=회원ID&datas[0][reserve]=금액&datas[0][content]=사유`

### API 예산 (Task 152 확정)
- 조회: ~28회/시간 (한도 500회의 5.6%)
- 처리: ~10회/시간 (한도 500회의 2.0%)
- 주문 폴링: 10분 간격 (6회/시간)
- 2계층 캐싱: GAS CacheService(5분) + localStorage(1시간)

## Google Sheets 설계

### 스프레드시트 구조
- 스프레드시트 이름: "PRESSCO21 파트너 클래스 플랫폼"
- 시트 1: "파트너 상세"
- 시트 2: "클래스 메타"
- 시트 3: "정산 내역"
- 시트 4: "주문 처리 로그"
- 시트 5: "이메일 발송 로그"

### 시트 1: "파트너 상세"
| 컬럼 | 필드명 | 타입 | 설명 | 예시 |
|------|--------|------|------|------|
| A | partner_code | STRING | 파트너 고유 코드 (P001~) | P001 |
| B | member_id | STRING | 메이크샵 회원 ID (PK, <!--/user_id/--> 결과) | jihoo5755 |
| C | partner_name | STRING | 공방/강사 이름 | 꽃공방 장지호 |
| D | grade | STRING | 등급 (SILVER/GOLD/PLATINUM) | SILVER |
| E | email | STRING | 연락 이메일 | partner@email.com |
| F | phone | STRING | 연락처 | 010-1234-5678 |
| G | location | STRING | 활동 지역 | 서울 강남구 |
| H | commission_rate | NUMBER | 수수료율 (0.10/0.12/0.15) | 0.10 |
| I | reserve_rate | NUMBER | 적립금 전환율 (1.0/0.8/0.6) | 1.0 |
| J | class_count | NUMBER | 누적 수강 완료 건수 | 0 |
| K | avg_rating | NUMBER | 평균 별점 (4.5) | 0 |
| L | education_completed | BOOLEAN | 파트너 교육 이수 여부 | FALSE |
| M | portfolio_url | STRING | 포트폴리오 URL | https://... |
| N | instagram_url | STRING | 인스타그램 URL | https://... |
| O | partner_map_id | STRING | 파트너맵 마커 ID (연동) | |
| P | approved_date | DATE | 파트너 승인일 | 2026-03-01 |
| Q | status | STRING | 상태 (ACTIVE/INACTIVE/SUSPENDED) | ACTIVE |
| R | notes | STRING | 관리자 메모 | |

### 시트 2: "클래스 메타"
| 컬럼 | 필드명 | 타입 | 설명 | 예시 |
|------|--------|------|------|------|
| A | class_id | STRING | 클래스 고유 ID (CLS001~) | CLS001 |
| B | makeshop_product_id | STRING | 메이크샵 상품 코드 (branduid) | 12345 |
| C | partner_code | STRING | 담당 파트너 코드 (FK) | P001 |
| D | class_name | STRING | 클래스명 | 봄꽃 압화 원데이 클래스 |
| E | category | STRING | 카테고리 (ONEDAY/REGULAR/ONLINE) | ONEDAY |
| F | level | STRING | 난이도 (BEGINNER/INTERMEDIATE/ADVANCED) | BEGINNER |
| G | price | NUMBER | 수강료 (원) | 65000 |
| H | duration_min | NUMBER | 수업 시간 (분) | 120 |
| I | max_students | NUMBER | 최대 정원 | 8 |
| J | description | STRING | 클래스 설명 (HTML) | <p>봄꽃...</p> |
| K | curriculum_json | STRING | 커리큘럼 JSON 문자열 | [{"step":1,...}] |
| L | instructor_bio | STRING | 강사 소개 | 10년 경력의... |
| M | thumbnail_url | STRING | 대표 이미지 URL | https://... |
| N | image_urls | STRING | 추가 이미지 URLs (콤마 구분) | https://...,... |
| O | youtube_video_id | STRING | 소개 유튜브 영상 ID | dQw4w9WgXcQ |
| P | location | STRING | 수업 장소 | 서울 강남구 압화갤러리 |
| Q | materials_included | BOOLEAN | 재료비 포함 여부 | TRUE |
| R | materials_product_ids | STRING | 재료 상품 branduid (콤마 구분) | 11111,22222 |
| S | tags | STRING | 태그 (콤마 구분) | 봄꽃,원데이,입문 |
| T | status | STRING | 상태 (ACTIVE/INACTIVE/DRAFT) | ACTIVE |
| U | created_date | DATE | 등록일 | 2026-03-01 |
| V | class_count | NUMBER | 총 수강 완료 건수 | 0 |
| W | avg_rating | NUMBER | 평균 별점 | 0 |

### 시트 3: "정산 내역"
| 컬럼 | 필드명 | 타입 | 설명 | 예시 |
|------|--------|------|------|------|
| A | settlement_id | STRING | 정산 ID (SET001~) | SET001 |
| B | order_id | STRING | 메이크샵 주문번호 | ORD20260301001 |
| C | partner_code | STRING | 파트너 코드 (FK) | P001 |
| D | class_id | STRING | 클래스 ID (FK) | CLS001 |
| E | member_id | STRING | 수강생 회원 ID | student123 |
| F | order_amount | NUMBER | 결제 금액 (원) | 65000 |
| G | commission_rate | NUMBER | 수수료율 | 0.10 |
| H | commission_amount | NUMBER | 수수료 금액 | 6500 |
| I | reserve_rate | NUMBER | 적립금 전환율 | 1.0 |
| J | reserve_amount | NUMBER | 지급 적립금 (원) | 6500 |
| K | class_date | STRING | 수업 일정 (옵션 텍스트) | 2026-03-15 오후 2시 |
| L | student_count | NUMBER | 수강 인원 | 1 |
| M | status | STRING | 정산 상태 (PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED) | PENDING |
| N | reserve_paid_date | DATE | 적립금 지급일 | |
| O | reserve_api_response | STRING | 적립금 API 응답 (JSON) | |
| P | error_message | STRING | 실패 시 오류 메시지 | |
| Q | student_email_sent | BOOLEAN | 수강생 확인 이메일 발송 여부 | FALSE |
| R | partner_email_sent | BOOLEAN | 파트너 안내 이메일 발송 여부 | FALSE |
| S | created_date | DATE | 주문 감지일 | 2026-03-01 |
| T | completed_date | DATE | 정산 완료일 | |

### 시트 4: "주문 처리 로그"
| 컬럼 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| A | log_id | STRING | 로그 ID |
| B | poll_time | DATETIME | 폴링 실행 시각 |
| C | orders_found | NUMBER | 감지된 주문 수 |
| D | orders_processed | NUMBER | 처리된 주문 수 |
| E | errors | STRING | 에러 목록 (JSON) |
| F | duration_ms | NUMBER | 처리 소요 시간 (ms) |

### 시트 5: "이메일 발송 로그"
| 컬럼 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| A | log_date | DATE | 발송일 |
| B | daily_count | NUMBER | 일일 발송 건수 |
| C | recipient | STRING | 수신자 |
| D | email_type | STRING | 이메일 유형 (CONFIRM/REMIND/REVIEW) |
| E | status | STRING | 발송 상태 (SUCCESS/FAILED) |
| F | error_message | STRING | 실패 시 오류 |

## GAS 엔드포인트 설계

### 기본 구조
```
GET  ?action=getClasses          -> 클래스 목록 조회 (공개)
GET  ?action=getClassDetail&id=  -> 클래스 상세 조회 (공개)
GET  ?action=getPartnerAuth      -> 파트너 인증 (member_id 필수)
GET  ?action=getPartnerDashboard -> 파트너 대시보드 데이터 (인증 필수)
POST ?action=recordBooking       -> 예약 기록 저장 (자동 정산 트리거)
POST ?action=pollOrders          -> 주문 폴링 (GAS 시간 트리거)
POST ?action=updateClassStatus   -> 클래스 상태 업데이트 (파트너 전용)
```

### 응답 형식 (통일)
```javascript
// 성공
{ "success": true, "data": {...}, "cached": false }

// 실패
{ "success": false, "error": "ERROR_CODE", "message": "상세 메시지" }
```

### 에러 코드
| 코드 | 의미 |
|------|------|
| NOT_LOGGED_IN | member_id 없음 (비로그인) |
| NOT_PARTNER | 파트너 미등록 회원 |
| PARTNER_INACTIVE | 파트너 비활성 상태 |
| INVALID_ACTION | 알 수 없는 action |
| LOCK_TIMEOUT | LockService 타임아웃 (동시 요청 충돌) |
| REFERER_MISMATCH | Referer가 foreverlove.co.kr이 아님 |
| CLASS_NOT_FOUND | 클래스 ID 없음 |
| RESERVATION_FAILED | 예약 기록 저장 실패 |

## GAS 보안 요구사항

### Referer 체크
```javascript
// 모든 요청에 적용 (파트너 전용 엔드포인트는 필수)
var referer = request.headers['Referer'] || '';
if (!referer.includes('foreverlove.co.kr')) {
  return jsonResponse({ success: false, error: 'REFERER_MISMATCH' });
}
```

### GAS 스크립트 속성 (Properties Service)
```
SHOPKEY           - 메이크샵 API Shopkey
LICENSEKEY        - 메이크샵 API Licensekey
SHOP_DOMAIN       - foreverlove.co.kr
SPREADSHEET_ID    - Google Sheets 스프레드시트 ID
ADMIN_EMAIL       - 관리자 알림 이메일
```

## 수수료 정책 (ecommerce-business-expert 확정 후 반영)

### 수수료 구간 (매출 기준 - 월 단위)
| 등급 | 수강 완료 건수 | 평균 별점 | 수수료율 | 적립금 전환율 |
|------|-------------|----------|---------|-------------|
| SILVER | 기본 | - | 10% | 100% |
| GOLD | 10건+ | 4.0+ | 12% | 80% |
| PLATINUM | 50건+ | 4.5+ | 15% | 60% |

> 수수료가 높을수록 파트너 수익 증가, 적립금 전환율은 감소 (재료 구매 유도)
> 상세 정책: ecommerce-business-expert 에이전트 설계 결과 반영

## LockService 구현 요구사항

```
// 동시 쓰기가 발생할 수 있는 모든 POST 요청에 적용
var lock = LockService.getScriptLock();
try {
  lock.waitLock(10000); // 10초 대기
  // ... 데이터 쓰기 작업 ...
} catch (e) {
  return jsonResponse({ success: false, error: 'LOCK_TIMEOUT' });
} finally {
  lock.releaseLock();
}
```

## 2계층 캐싱 전략 (GAS 측)

| 데이터 | GAS CacheService TTL | 비고 |
|--------|---------------------|------|
| 클래스 목록 | 5분 | 자주 변경 안 됨 |
| 클래스 상세 | 5분 | |
| 파트너 인증 | 캐시 없음 | 항상 최신 데이터 |
| 파트너 대시보드 | 1분 | 빠른 갱신 |

## 구현 단계

- [x] 1단계: Google Sheets 스프레드시트 생성 + 6개 시트 설계 (시트 구조 문서화 완료)
- [ ] 2단계: GAS 프로젝트 생성 + Spreadsheet ID 연결 (관리자 수동 작업)
- [x] 3단계: 유틸리티 함수 구현 (jsonResponse, escapeHtml_, rowToObject_ 등)
- [x] 4단계: doGet 구현 (getClasses, getClassDetail, getPartnerAuth, getPartnerDashboard, getCategories, health)
- [x] 5단계: doPost 구현 (recordBooking, pollOrders, updateClassStatus, clearCache)
- [x] 6단계: 파트너 인증 로직 구현 (member_id -> Sheets 매칭 -> 3단계 인증)
- [x] 7단계: LockService 기반 동시 쓰기 방지 전체 적용 (waitLock/tryLock 구분)
- [x] 8단계: CacheService 캐싱 레이어 적용 (5분/6시간)
- [ ] 9단계: 샘플 데이터 입력 + Playwright MCP로 API 테스트 (배포 후)
- [x] 10단계: GAS 배포 가이드 작성 (`docs/phase2/gas-deployment-guide.md`)
- [x] 11단계: 코드 리뷰 (makeshop-code-reviewer) - Critical 5건 수정 완료
- [x] 12단계: ROADMAP.md + Task 파일 업데이트

## 테스트 체크리스트

- [ ] `?action=getClasses` -> 클래스 목록 JSON 응답 정상
- [ ] `?action=getClassDetail&id=CLS001` -> 클래스 상세 정상
- [ ] `?action=getPartnerAuth&member_id=jihoo5755` -> 파트너 인증 성공
- [ ] `?action=getPartnerAuth&member_id=UNKNOWN` -> NOT_PARTNER 에러
- [ ] `?action=getPartnerAuth` (member_id 없음) -> NOT_LOGGED_IN 에러
- [ ] Referer 없는 요청 -> REFERER_MISMATCH 에러
- [ ] LockService 동시 요청 -> 하나만 성공, 나머지 LOCK_TIMEOUT
- [ ] CacheService 캐싱 -> 두 번째 요청이 캐시에서 응답 (`cached: true`)
- [ ] POST recordBooking -> Sheets 정산 내역 저장 확인
- [ ] 메이크샵 적립금 API 연동 테스트 (적립금 지급 확인)

## 수락 기준

- [ ] GAS 웹 앱이 배포되어 URL이 발급된다
- [ ] 5개 Sheets 시트가 설계 명세대로 생성된다
- [ ] 모든 doGet 엔드포인트가 정상 응답한다
- [ ] 파트너 인증이 member_id 기반으로 정상 동작한다
- [ ] LockService로 동시 쓰기가 안전하게 처리된다
- [ ] CacheService 캐싱이 적용된다
- [ ] 코드 리뷰 통과 (makeshop-code-reviewer)

## 변경 사항 요약

- 2026-02-21: Task 201 코드 구현 완료
  - `파트너클래스/class-platform-gas.gs` 생성 (2,700여 줄)
  - 16개 GAS 엔드포인트 구현 (doGet 6개, doPost 4개)
  - 파트너 인증: `<!--/user_id/-->` 가상태그 기반 3단계 인증
  - 수수료 정책: SILVER(10%/100%), GOLD(12%/80%), PLATINUM(15%/60%)
  - LockService(waitLock/tryLock 구분), CacheService(5분/6시간) 적용
  - 이메일 자동화 + 일일 100건 한도 관리
  - makeshop-code-reviewer 검수 후 Critical 5건 수정:
    - C-01: incrementEmailCount_ 새 날짜 처리 추가
    - C-02: doPost 관리자 전용 ADMIN_API_TOKEN 검증 추가
    - C-03: escapeHtml_ 유틸 추가 + 이메일 HTML XSS 방지
    - C-04: retryFailedSettlements 배치 함수 추가
    - C-05+W-06: 폴링 루프 5분 시간 체크 추가
  - 지원 문서 3개 생성:
    - `docs/phase2/gas-deployment-guide.md`
    - `docs/phase2/commission-policy.md`
    - `docs/phase2/makeshop-api-architecture.md`
- 배포 대기: GAS 프로젝트 생성, Sheets 생성, 스크립트 속성 설정은 관리자 수동 작업 필요
