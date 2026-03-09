# 파트너클래스 실서비스 확장 통합 테스트 매트릭스

- 실행 일시: 2026-03-09 23:05 KST ~ 2026-03-10 00:08 KST
- 실행 도메인: `https://www.foreverlove.co.kr`
- 파트너 계정: `jihoo5755`
- 자동화 스크립트: `scripts/partnerclass-live-smoke.js`
- 결과 JSON: `output/playwright/partnerclass-20260309-ext/partnerclass-live-results.json`
- 증빙 폴더: `output/playwright/partnerclass-20260309-ext/`
- 제외 항목: 카카오 SDK `integrity` 이슈는 사용자 요청에 따라 이번 라운드 최종 블로커에서 제외

## 실행 요약

- 총 15건 중 12건 통과, 3건 실패
- Phase 1 핵심 흐름: 목록, 상세 진입, flatpickr 일정 선택, FAQ 5개, 협회 제휴 탭 통과
- Phase 3 핵심 흐름: 마이페이지 비로그인/로그인 빈 상태, 목록 잔여석 = 상세 시간슬롯 합계 통과
- 파트너/관리자 확장 흐름: 대시보드 탭 전환, CSV 예외 처리, 강의등록 폼 검증, 관리자 비권한 차단, 관리자 양성 시뮬레이션 통과

## 시나리오 결과

| 구분 | 시나리오 | 결과 | 근거 |
|---|---|---|---|
| 목록 | 클래스 카드/잔여석 배지 노출 | PASS | 6건 렌더링, 첫 카드 `잔여 20석` |
| 목록 | 가격 높은순 정렬 + 서울 필터 + 찜 필터 | FAIL | 찜 후 localStorage가 `null`, 결과 0건 |
| 목록 | `협회 제휴` 탭 전환 | PASS | `한국꽃공예협회`, 인센티브 섹션 노출 |
| 상세 | 목록에서 상세 진입, flatpickr 일정 선택, 시간슬롯/총액 반영 | PASS | `2026-03-15`, `2026-03-20`, 첫 슬롯 `14:00 잔여 8석` |
| 상세 | FAQ 5개 열기/닫기, 잔여석 정합성 | PASS | 목록 `20석` = 상세 합계 `20석` |
| 상세 | 잘못된 `class_id` 예외 처리 | PASS | 오류 상태 확인 |
| 마이페이지 | 비로그인 안내 | PASS | 로그인 안내 영역 노출 |
| 파트너 | 대시보드 탭 전환/CSV 다운로드 예외 처리 | PASS | `BLOOM PARTNER`, 토스트 `내보낼 정산 내역이 없습니다.` |
| 파트너 | 일정 관리 탭 활성화/일정 추가 폼 | FAIL | 탭 활성 대기 15초 타임아웃 |
| 파트너 | 등급 게이지/승급표 vs API 수수료율 정합성 | FAIL | UI `25%`, API `20%` |
| 강의등록 | 필수 검증, 일정 추가, 키트 토글 | PASS | 오류 9건, 일정 1건, 키트 항목 2건 |
| 마이페이지 | 로그인 후 빈 상태 | PASS | 예약 0건 빈 상태 확인 |
| 관리자 | 비권한 접근 차단 | PASS | `#adUnauthorized` 노출 |
| 관리자 API | 신청/승인대기/정산/협회 조회 | PASS | `applications=5`, `classes=1`, `settlements=5`, `affiliations=1` |
| 관리자 UI | 양성 시뮬레이션 | PASS | 요약 카드 `5`, 탭 4종 전환 확인 |

## 실무형 교차 검증 자료

### 사용자/수강 흐름

- 목록 첫 카드 잔여석: `20석`
- 상세 시간슬롯 합계: `8 + 6 + 6 = 20석`
- 마이페이지 API: `{"success":true,"data":{"bookings":[],"total":0}}`

### 파트너/정산 흐름

- `getPartnerAuth(member_id=jihoo5755)`
  - `partner_code=PC_202602_001`
  - `grade=SILVER`
  - `commission_rate=20`
- `getPartnerDashboard`
  - 클래스 3건: `CL_202602_001`, `CL_202602_002`, `CL_202602_662`
  - 최근 정산/예약 데이터 존재
- 수익 리포트 CSV
  - 현재 UI는 다운로드 대신 `내보낼 정산 내역이 없습니다.` 토스트로 처리

### 관리자/운영 흐름

- `getApplications`: 5건
- `getPendingClasses`: 1건
- `getSettlements(limit=5)`: 5건
- `getAffiliations`: 1건 (`한국꽃공예협회`)
- 관리자 양성 시뮬레이션 방식
  - `context.addInitScript()`로 `adMemberId`, `adGroupName`, `adGroupLevel`를 `DOMContentLoaded` 전에 주입
  - 실관리자 계정 없이도 어드민 UI 렌더링과 탭 전환을 확인

## 실패 항목 상세

### 1. 목록 찜 필터 저장 실패

- 에러 메시지:
  - `찜 필터 결과가 1건이 아닙니다. count=0, wishedClassId=CL_202602_002, wishlist=null, rendered=`
- 해석:
  - 하트 클릭 후 `pressco21_wishlist`가 저장되지 않아 찜 필터가 비어 있음
- 스크린샷:
  - `output/playwright/partnerclass-20260309-ext/fail-목록-정렬-서울-필터-찜-필터.png`

### 2. 파트너 일정 관리 탭 활성화 실패

- 에러 메시지:
  - `page.waitForFunction: Timeout 15000ms exceeded.`
- 해석:
  - 대시보드에서 `일정 관리` 탭 활성 상태 전환이 완료되지 않음
  - 실패 스크린샷에서는 로딩 오버레이가 남아 있어 무한 로딩 또는 탭 전환 이벤트 미완료 가능성 있음
- 스크린샷:
  - `output/playwright/partnerclass-20260309-ext/fail-파트너-일정-관리-탭.png`

### 3. 파트너 수수료율 정합성 불일치

- 에러 메시지:
  - `수수료율 불일치: ui=25, api=20, badge=BLOOM PARTNER`
- 해석:
  - 대시보드 UI는 `BLOOM PARTNER / 25%`를 표시하지만, 실제 인증 API는 `SILVER / 20%`
  - 구등급 alias 처리와 수수료율 표시가 동시에 맞지 않을 가능성 있음
- 스크린샷:
  - `output/playwright/partnerclass-20260309-ext/fail-파트너-등급-게이지-승급표-정합성.png`

## 첨부 산출물

- `output/playwright/partnerclass-20260309-ext/admin-simulated-dashboard.png`
- `output/playwright/partnerclass-20260309-ext/class-register-validation-kit.png`
- `output/playwright/partnerclass-20260309-ext/detail-faq-remaining-consistency.png`
- `output/playwright/partnerclass-20260309-ext/detail-invalid-state.png`
- `output/playwright/partnerclass-20260309-ext/partnerclass-live-results.json`
