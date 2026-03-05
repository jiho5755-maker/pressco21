# PRESSCO21 파트너클래스 플랫폼 고도화 로드맵

꽃공예 강사(파트너)가 수업 운영에만 집중할 수 있도록 — 일정 관리, 재료 자동 배송, 수강생 성장 파이프라인까지 플랫폼이 모든 운영 부담을 대신 처리한다.

## 개요

PRESSCO21 파트너클래스 플랫폼은 꽃공예 강사(파트너), 취미 수강생, 관리자를 위한 원스톱 클래스 운영 시스템으로 다음 기능을 제공합니다:

- **수업 일정 시스템**: tbl_Schedules 기반 날짜/시간/정원 관리, 잔여석 실시간 표시
- **재료키트 자동 배송**: 수강생 결제 시 재료 주문 자동 생성으로 핵심 수익 드라이버 구동
- **수강생-강사 성장 파이프라인**: 수료증 발급 → 파트너 신청 자격 연계로 생태계 순환
- **관리자 운영 도구**: NocoDB 직접 조작 없이 승인/정산/관리 처리

### 기술적 전제조건

| 항목 | 규칙 |
|------|------|
| 플랫폼 | 메이크샵 D4 (Vanilla HTML/CSS/JS, CDN만 사용, 빌드 도구 없음) |
| JS 이스케이프 | 템플릿 리터럴 `${var}` -> `\${var}` 필수 |
| 가상 태그 | `<!--/user_id/-->`, `<!--/group_no/-->` 등 절대 보존 |
| JS 격리 | IIFE 패턴 필수 |
| CSS 스코핑 | 컨테이너 ID/클래스로 범위 제한 필수 |
| 반응형 | 768px / 992px / 1200px |
| 백엔드 | n8n (n8n.pressco21.com) + NocoDB (nocodb.pressco21.com) |
| DB 필드 추가 | NocoDB REST API 불가 → SSH SQLite 직접 수정 |

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - `/tasks` 디렉토리에 새 작업 파일 생성
   - 명명 형식: `XXX-description.md` (예: `001-setup.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)
   - 예시를 위해 `/tasks` 디렉토리의 마지막 완료된 작업 참조
   - 초기 상태의 샘플로 `000-sample.md` 참조

3. **작업 구현**
   - 작업 파일의 명세서를 따름
   - 기능과 기능성 구현
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수
   - 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
   - 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
   - 테스트 통과 확인 후 다음 단계로 진행
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 완료로 표시

---

## 완료된 Phase 요약

### Phase 0~1b: 자사몰 코드 품질 개선 + 리뉴얼 ✅

> 기존 코드 IIFE 패턴, CSS 스코핑, 성능/접근성/SEO 향상, 유튜브 v4, 브랜드스토리 리뉴얼 완료
> 상세: `docs/ROADMAP.md` Phase 0~1b 섹션 참조

### Phase 1.5: 메이크샵 API 검증 ✅

> process_reserve 적립금 API 검증, 가상태그 인증 확정, API 예산 산정 완료
> 상세: `docs/ROADMAP.md` Phase 1.5 섹션 참조

### Phase 2 v2.0: 파트너 클래스 플랫폼 구축 (n8n + NocoDB) ✅

> n8n 13개 워크플로우 + NocoDB 8개 테이블 + 메이크샵 6개 페이지 배포 완료
> - WF-01~WF-17 + WF-APPROVE + WF-REFUND + WF-ERROR (총 19개 WF ACTIVE)
> - tbl_Partners, tbl_Classes, tbl_Applications, tbl_Settlements, tbl_Reviews, tbl_Settings 운영 중
> - 메이크샵 페이지: 목록(2606), 상세(2607), 파트너 대시보드(2608), 파트너 신청(2609), 교육(2610), 강의 등록(8009)
> 상세: `docs/ROADMAP.md` Phase 2 v2.0 섹션 참조

### Phase 2.5: 핵심 플로우 완성 ✅

> 강의 등록 + 예약 결제 + 정산 자동화 파이프라인 검증 완료
> 상세: `docs/ROADMAP.md` Phase 2.5 섹션 참조

### Phase 2.6: 운영 안정화 ✅

> Docker 자동 복구, 백업/복원, NocoDB 관리 워크플로우, 수강 후기 기능 완료
> 상세: `docs/ROADMAP.md` Phase 2.6 섹션 참조

### Phase 2.7: 고객 경험 완성 ✅

> 공유, 찜, 라이트박스, Chart.js 수익 시각화, CSV 내보내기, 메인페이지 진입점 완료
> 상세: `docs/ROADMAP.md` Phase 2.7 섹션 참조

### 원가마진분석 Phase A~B: 구글시트 시스템 ✅

> 구글시트 `PRESSCO21_원가마진분석` 8개 시트 구축, 쿠팡 로켓배송 전략 수립 완료
> 상세: `docs/원가마진분석-PRD.md` 참조

---

## 개발 단계

---

### Phase 3-A: 핵심 구조 보완 (예상 3~4주)

> **상태**: 대기
> **시작**: 즉시 착수 가능
> **목표**: 수업 일정 시스템, 재료키트 자동 배송, 강의 수정, 협회 제휴 등 핵심 구조 완성
> **PRD**: `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md` (v3.0)

---

#### Task 001: 수업 일정(tbl_Schedules) 시스템 구축 (F301) — 우선순위

> **규모**: XL | **예상 기간**: 2주 | **의존성**: 없음

현재 수강생이 아무 날짜나 선택할 수 있는 문제를 해결한다. 파트너가 일정을 등록하면 수강생이 가능한 날짜만 선택할 수 있도록 tbl_Schedules 기반 일정 관리 시스템을 구축한다.

- DB: NocoDB tbl_Schedules 테이블 생성 (SSH SQLite 직접 수정)
  - 필드: id, class_id, schedule_date, schedule_time, capacity, booked_count, status, created_at
- WF: n8n WF-18 schedule-management 신규 생성
  - POST /schedule-manage: 일정 추가/삭제 (파트너 인증 필수)
  - WF-01 변경: 클래스 상세 응답에 schedules[] 배열 포함
  - WF-16 변경: 강의 등록 시 tbl_Schedules에 초기 일정 동시 저장
  - WF-05 변경: 결제 완료 시 해당 일정의 booked_count 증가
- 프론트: 클래스 상세 페이지(2607) 예약 패널 개편
  - flatpickr가 tbl_Schedules 데이터 기반으로 가능한 날짜만 활성화
  - 잔여석 0인 날짜는 비활성(회색) 처리
  - 선택 날짜의 잔여석 실시간 표시 ("잔여 N석")
  - 선택된 schedule_id를 hidden input에 저장 → WF-04에 전달
- 프론트: 강의 등록 페이지(8009) 일정 입력 섹션 추가
  - 날짜/시간/정원 입력 필드, 일정 행 추가 버튼
- 프론트: 파트너 대시보드(2608) 스케줄 탭 추가
  - 일정 추가/삭제 UI
  - 일정별 예약자 수 표시
  - 삭제 시 기예약자 있으면 경고 팝업 ("이미 N명 예약됨")

---

#### Task 002: 재료키트 자동 배송 연동 (F302)

> **규모**: L | **예상 기간**: 1.5주 | **의존성**: 없음 (Task 001과 병렬 가능)

수강생 결제 완료 시 클래스에 등록된 재료 branduid 목록으로 메이크샵 주문이 자동 생성된다. 핵심 수익 드라이버 -- 수강생 결제 시 재료 매출 자동 발생.

- DB: tbl_Classes에 kit_items(JSON), kit_enabled(Checkbox) 필드 추가 (SSH SQLite)
  - kit_items 형식: [{branduid: "12345", qty: 1}, ...]
- WF: WF-05 확장 — 결제 시 메이크샵 재료 주문 자동 생성
  - 결제 완료 주문 감지 시 해당 클래스의 kit_items 조회
  - kit_enabled=1이면 메이크샵 주문 API로 재료 주문 생성
  - 실패 시 관리자 텔레그램 알림 (WF-13)
- 프론트: 강의 등록 폼(8009) 키트 구성 입력 UI 추가
  - 재료 branduid + 수량 입력 필드
  - 행 추가/삭제 버튼
  - "키트 배송 없음" 체크박스
- 프론트: 클래스 상세 페이지(2607) 재료키트 표시
  - kit_enabled=1인 클래스에 "재료 자동 배송 포함" 배지 표시
  - 배송지 입력 안내 문구

---

#### Task 003: 협회 일정 허브 탭 + 협회 제휴 DB (F304, F305)

> **규모**: L | **예상 기간**: 1.5주 | **의존성**: 없음 (Task 001/002와 병렬 가능)

클래스 목록에 "협회 세미나/행사" 탭을 추가하고, 4등급 회원 체계의 협회 연계 자격 기반을 구축한다.

- DB: NocoDB 3개 테이블 신규 생성 (SSH SQLite)
  - tbl_Affiliations: 협회 마스터 (코드, 명칭, 로고, 상태, 월 목표액)
  - tbl_Member_Affiliations: 회원-협회 매핑 (member_id, affiliation_code, verified)
  - tbl_Affiliation_Stats: 월별 구매 집계 (WF-AFFIL-SYNC가 생성)
- WF: WF-AFFIL-SYNC 배포 (wf-affil-sync.json 이미 작성됨)
  - n8n에 import + 활성화
  - 매월 1일 06:00 KST 스케줄 트리거
- WF: WF-01 확장 — 협회 행사 데이터 조회 포함
- 프론트: 클래스 목록 페이지(2606) "협회 세미나/행사" 탭 추가
  - tbl_Affiliations active 목록 조회
  - 협회 로고 + 이름 + "공식" 배지 표시
  - 협회 카드 UI (배지, 로고, 인센티브 배너)
  - 협회 행사 클릭 → 해당 클래스 상세 이동

---

#### Task 004: 클래스 수정/편집 기능 (F303)

> **규모**: M | **예상 기간**: 1주 | **의존성**: 없음

파트너가 대시보드에서 강의 정보를 직접 수정할 수 있도록 한다. 등록 후 수정 불가는 파트너 이탈의 주요 원인.

- WF: n8n WF-20 class-edit 신규 생성
  - POST /class-edit: 파트너 인증 후 tbl_Classes 업데이트
  - 수정 가능 필드: 제목, 설명, 가격, 카테고리, 이미지 URL, 재료 목록
  - 메이크샵 상품 가격 변경은 관리자 확인 후 별도 처리 권장
- 프론트: 파트너 대시보드(2608) 클래스 카드에 수정 버튼 추가
  - 수정 모달: 제목/설명/가격/카테고리/이미지 URL/재료 목록 편집
  - 저장 → WF-20 호출 → NocoDB 업데이트 → 성공 토스트 메시지

---

#### Task 005: 4등급 회원 체계 메이크샵 적용

> **규모**: M | **예상 기간**: 1주 | **의존성**: Task 003 완료 후 (협회 DB 기반)

기존 SILVER/GOLD/PLATINUM 3등급 체계를 BLOOM/GARDEN/ATELIER/AMBASSADOR 4등급으로 전환한다.

- 메이크샵 회원 등급 추가: 인스트럭터 / 파트너스 / 마스터 (관리자 수동 설정)
- WF-05 수수료 상수 변경
  - SILVER(20%) → BLOOM / GOLD(25%) → GARDEN / PLATINUM(30%) → ATELIER 로직 반영
  - AMBASSADOR 등급 수수료율 정의
- 등급별 자동 적립금 지급 로직 추가
- WF-13 등급 자동 업데이트 로직 보완 (기존 뼈대에 실제 기준 적용)
- 프론트: 파트너 대시보드(2608) 등급 배지 UI 업데이트

---

#### Task 005-1: Phase 3-A 통합 테스트

> **규모**: M | **예상 기간**: 0.5주 | **의존성**: Task 001~005 모두 완료 후

- Playwright MCP를 사용한 전체 사용자 플로우 테스트
  - 수강생: 목록 → 상세(일정 선택) → 결제 → 재료키트 자동 주문
  - 파트너: 강의 등록(일정+재료 입력) → 대시보드(일정 관리/강의 수정) → 정산 확인
  - 협회: 협회 탭 표시 → 협회 행사 상세 이동
- API 연동 및 비즈니스 로직 검증
  - WF-18(일정), WF-20(수정), WF-05(재료 주문) 엔드포인트 테스트
  - tbl_Schedules booked_count 정합성 검증
- 에러 핸들링 및 엣지 케이스 테스트
  - 잔여석 0인 일정 예약 시도 차단 확인
  - 기예약자 있는 일정 삭제 시 경고 표시 확인
  - 재료 주문 API 실패 시 텔레그램 알림 확인

---

### Phase 3-B: 운영 효율화 (예상 2~3주)

> **상태**: 대기
> **시작**: Phase 3-A 완료 후
> **목표**: 관리자 운영 도구, 이메일 알림 체계, 수강생 마이페이지 구축

---

#### Task 006: 관리자 어드민 페이지 신규 구축 (F306)

> **규모**: L | **예상 기간**: 1.5주 | **의존성**: Task 003 완료 후 (협회 DB 필요)

NocoDB 직접 조작 의존을 탈피하여 관리자가 메이크샵 전용 페이지에서 운영 업무를 처리한다.

- 메이크샵 신규 페이지 ID 발급 (관리자 어드민 전용)
- 관리자 권한 확인: `<!--/group_no/-->` 치환코드로 관리자 그룹 검증
  - 비관리자 접근 시 홈 리디렉션
- 탭 4개 구현:
  - **파트너 신청 탭**: tbl_Applications 목록 + 신청서 상세 모달 + 승인(WF-APPROVE)/거부 버튼
  - **강의 승인 탭**: tbl_Classes 대기 목록 + 승인(WF-17 트리거)/거부 버튼
  - **정산 탭**: tbl_Settlements PENDING 목록 + 수동 COMPLETED 처리 버튼
  - **협회 관리 탭**: tbl_Affiliations + tbl_Member_Affiliations 조회/수정, 회원-협회 매핑 추가/삭제 UI
- CSS 스코핑: `.admin-dashboard`, IIFE 패턴
- Playwright MCP 테스트: 관리자 인증 → 탭 전환 → 승인/거부 플로우 E2E

---

#### Task 007: 이메일 알림 체계 완성 (F307)

> **규모**: M | **예상 기간**: 1주 | **의존성**: Task 001 완료 후 (tbl_Schedules 기반 리마인더)

이미 WF-11/WF-12가 존재하나 미가동 상태. 실가동 검증 및 완성을 통해 수강생 경험의 핵심 터치포인트를 확보한다.

- WF-11 실가동 (예약 확인 + 리마인더)
  - 트리거 조건: tbl_Schedules.schedule_date 기준 D-3, D-1
  - 해당 일정 예약자(tbl_Settlements) 조회 → 이메일 발송
  - 중복 발송 방지: student_email_sent 필드 태그 확인
- WF-12 실가동 (수강 완료 + 후기 요청)
  - 트리거 조건: tbl_Settlements.status=COMPLETED 후 7일
  - 수강생 후기 요청 이메일 (적립금 인센티브 안내)
- 이메일 발송 실패 시 관리자 텔레그램 알림 (WF-13)
- 이메일 템플릿 5종 작성/검수
  - 예약 확인, D-3 리마인더, D-1 리마인더, 수강 완료, 후기 요청
- 테스트: jihoo5755 계정으로 실제 이메일 수신 확인

---

#### Task 008: 수강생 마이페이지 (F308)

> **규모**: M | **예상 기간**: 1주 | **의존성**: 없음 (Task 006과 병렬 가능)

수강생이 예약 내역을 확인할 방법이 현재 없는 문제를 해결한다.

- WF: n8n WF-19 my-bookings 신규 생성
  - GET /my-bookings?member_id=XXX: 수강생 예약 목록 반환
  - tbl_Settlements에서 해당 member_id 건 조회
- 프론트: 메이크샵 마이페이지에 "수강 내역" 탭 추가
  - `<!--/user_id/-->` 로 회원 ID 조회 → WF-19 호출
  - 예약 목록 컬럼: 강의명, 수업일, 금액, 상태(예약확정/완료/취소)
  - 수강일 7일 전까지 "환불 요청" 버튼 (WF-REFUND 호출)
  - 완료 상태 예약에 "수료증 발급" 버튼 (Phase 3-C Task 009에서 구현)
- CSS 스코핑: `.my-classes`, IIFE 패턴
- Playwright MCP 테스트: 로그인 → 마이페이지 → 수강 내역 조회 E2E

---

#### Task 008-1: Phase 3-B 통합 테스트

> **규모**: S | **예상 기간**: 0.5주 | **의존성**: Task 006~008 모두 완료 후

- Playwright MCP를 사용한 관리자/수강생 플로우 테스트
  - 관리자: 어드민 로그인 → 파트너 승인 → 강의 승인 → 정산 처리
  - 수강생: 마이페이지 → 예약 내역 → 환불 요청
- WF-11/WF-12 실가동 테스트
  - 테스트 데이터 기반 D-3/D-1 리마인더 수신 확인
  - 수강 완료 후 7일 후기 요청 이메일 수신 확인
- 비관리자의 어드민 페이지 접근 차단 확인

---

### Phase 3-C: 전환율 + 생태계 (예상 2~3주)

> **상태**: 대기
> **시작**: Phase 3-B 완료 후
> **목표**: 수강생 → 강사 성장 파이프라인, CS 지원, 잔여석 실시간 표시로 전환율 최적화

---

#### Task 009: 수강생 → 강사 성장 파이프라인 (F309)

> **규모**: M | **예상 기간**: 1주 | **의존성**: Task 008 완료 후 (마이페이지 존재 필수)

수강생의 강사 전환이 핵심 성장 엔진. 수강 완료 시 수료증이 발급되고, 이것이 파트너 신청 자격과 연계된다.

- 디지털 수료증 자동 발급
  - 수강생 마이페이지: 완료 상태 예약에 "수료증 발급" 버튼
  - `window.print()` 활용 — `@media print` CSS로 수료증 레이아웃 전용 스타일 정의
  - 수료증 내용: 로고, 수강생명, 강의명, 수업일, PRESSCO21 인증 문구
  - 별도 PDF 라이브러리 불필요 (jsPDF CDN은 용량 이슈로 비권장)
- 수료증 → 파트너 신청 자격 연계
  - 수료증 1개 이상 보유 시 마이페이지 하단에 "강사 도전하기" CTA 버튼 표시
  - 파트너 신청(id=2609): 수료증 보유 여부 자동 감지
  - "PRESSCO21 수료증 보유 — 우대 심사" 배지 표시
  - WF-07 신청 데이터에 `has_certificate: true/false` 필드 추가
- 교육 영상 실제 콘텐츠 교체 (현재 릭롤 영상 → 실제 교육 영상)

---

#### Task 010: CS 지원 체계 구축 (F310)

> **규모**: S | **예상 기간**: 0.5주 | **의존성**: 없음 (독립)

수강생이 클래스 상세에서 자주 묻는 질문을 바로 해결하고, 강사에게 직접 문의할 수 있게 한다.

- 프론트: 클래스 상세(2607) 하단에 FAQ 아코디언 섹션 추가
  - FAQ 데이터: tbl_Settings에 `faq_common` 키로 JSON 저장 (공통 FAQ)
  - 강의별 FAQ: tbl_Classes에 `faq_items` 필드 추가 (SSH SQLite)
- 파트너 SNS/카카오 딥링크 연결 UI
  - contact_kakao 필드가 있으면 "강사에게 문의" 버튼 → 카카오채널 딥링크
  - contact_phone 필드가 있으면 전화 딥링크 버튼 (`tel:`)

---

#### Task 011: 잔여석 실시간 표시

> **규모**: M | **예상 기간**: 1주 | **의존성**: Task 001 완료 필수 (tbl_Schedules 기반)

수업 일정 시스템이 구축된 후, 잔여석 정보를 목록/상세 페이지에 실시간으로 노출한다.

- 프론트: 클래스 목록(2606) 카드에 "잔여 N석" 배지 표시
  - tbl_Schedules에서 min(잔여석) 계산
  - "마감" 처리된 클래스는 목록 하단 배치
- 프론트: 클래스 상세(2607) 예약 패널 잔여석 표시
  - 날짜 선택 시 해당 일정의 잔여석 실시간 갱신
  - 잔여 3석 이하 시 빨간색 강조 ("마감 임박!")
- 대기자 알림 기능 (선택적)
  - 마감 시 "대기 신청" 버튼 표시
  - 취소 발생 시 대기자에게 이메일 알림 (WF-11 확장)

---

#### Task 012: 선물하기 연동

> **규모**: S | **예상 기간**: 0.5주 | **의존성**: 없음 (독립)

메이크샵 기본 선물하기 기능을 활용하여 클래스 예약을 선물할 수 있도록 한다.

- 메이크샵 기본 선물하기 기능 활성화 확인 (관리자 설정)
- 클래스 상세 페이지에 "선물하기" 버튼 추가
- 선물 결제 시 WF-05 폴링에서 정상 감지되는지 검증

---

#### Task 012-1: Phase 3-C 전체 통합 테스트

> **규모**: M | **예상 기간**: 0.5주 | **의존성**: Task 009~012 모두 완료 후

- Playwright MCP를 사용한 전체 Phase 3 통합 E2E 테스트
  - 수강생 전체 여정: 목록 → 상세(일정 선택, 잔여석 확인) → 결제 → 재료키트 배송 → 수강 완료 → 수료증 발급 → 강사 도전하기
  - 파트너 전체 여정: 강의 등록(일정+재료) → 대시보드(수정/일정관리) → 정산 → 등급 승급
  - 관리자 전체 여정: 어드민 페이지 → 승인/거부 → 정산 처리 → 협회 관리
- 잔여석 정합성 검증 (예약/취소 시 booked_count 정확성)
- 수료증 PDF 출력 검증
- 이메일 알림 전체 체계 검증 (5종 이메일 수신 확인)

---

### Phase CRM: Offline CRM 고도화 -- ERP 이전 + 고객관계관리 엔진 (예상 6~8주)

> **상태**: Phase 1(데이터 이관) ✅ 완료 / Phase 2(UI 구현) 🚧 진행 대기
> **시작**: Phase 3-A와 병렬 착수 가능 (CRM-001~004는 파트너클래스와 의존성 없음)
> **목표**: 구글시트 기반 거래장부/고객 관리를 NocoDB로 이전하고, 미수금 관리/VIP 등급/대시보드 KPI를 갖춘 본격 CRM 엔진 구축
> **배경**: 현재 Offline CRM(Vanilla HTML/CSS/JS)은 거래명세표 발행/고객 목록 기본 기능만 보유. ERP 도입 전 단계로 거래 히스토리 10만건과 고객 14,549건을 NocoDB로 통합하여 데이터 기반 경영 판단의 토대를 마련한다.
>
> ⚠️ **프로젝트 관리 정본**: **Shrimp Task Manager** (이 ROADMAP.md는 참조용 — 상세 태스크 현황은 Shrimp 확인)
> 🤝 **실행 방식**: Shrimp(추적) + 전문가 에이전트(도메인 판단) + Claude(코드 구현) 3계층 협업
> 📋 **에이전트 배치**: CRM-006/008 → `accounting-specialist` 선호출 / CRM-010 → 3개 에이전트 병렬 / CRM-012 → 2개 에이전트 병렬

---

#### ✅ Task CRM-PRE: 거래명세표 카드형 디자인 복원 + 미수금 기본 시스템 (2026-03-04 완료)

> **완료 항목**:
> - `buildInvoiceHtml()`: 세로형 표 → 카드형 디자인 (로고/도장/미수금 영역 포함) 전면 교체
> - `printDuplexViaIframe()` iframe CSS: 이등분 A4 인쇄 최적화 (11pt/6pt 폰트, flex 레이아웃)
> - `index.html` CSS: 화면 표시용 카드형 스타일 교체 (`.inv-header`, `.inv-parties`, `.inv-balance-tbl` 등)
> - 미수금 데이터 로직: `getCustomerBalance()`, `recalcCustomerBalance()`, `updateBalanceCalc()` 신규 함수
> - 입금 처리 모달: `openPaymentModal()`, `processPayment()` + `modal-payment` UI
> - 폼 UI: 미수금 관리 카드 (전잔액/입금액/현잔액 자동계산)
> - 대시보드: 총 미수금 stat 카드(5번째) + 수금 컬럼
> - 고객 목록: 미수금 컬럼 + 정렬 지원
> - 발행내역: payment_status 뱃지(미수금/부분수금/완납) + 입금 버튼
>
> **Phase 0 (수동 작업 필요)**:
> - NocoDB `invoices` 테이블(ml81i9mcuw0pjzk)에 4개 필드 추가: `paid_amount`(Number/0), `previous_balance`(Number/0), `current_balance`(Number/0), `payment_status`(SingleLineText)
> - NocoDB `customers` 테이블(mffgxkftaeppyk0)에 1개 필드 추가: `outstanding_balance`(Number/0)

---

#### ✅ Task CRM-001: NocoDB tbl_tx_history 테이블 생성 + customers 필드 추가 (2026-03-05 완료)

> **규모**: M | **담당**: `data-integrity-expert` | **의존성**: 없음

**완료 결과**:
- tbl_tx_history 생성: 15컬럼 (tx_date, legacy_book_id, customer_name, tx_type, amount, tax, memo, slip_no, debit_account, credit_account, ledger, tx_year + 3개)
- tbl_Customers 확장: customer_type, customer_status, business_no, last_order_date, first_order_date, total_order_count, total_order_amount, outstanding_balance 등 12개 필드
- 인덱스 5개 생성 (customer_name, tx_date, tx_type, tx_year, customer_status)

> ⚠️ **실제 구현 vs PRD 차이**: PRD는 customer_id FK 설계 → 실제는 customer_name 문자열 비정규화 (Phase 1 완료 후 소급 변경 없음)

**수락 기준**:
- [x] tbl_tx_history 테이블 생성 확인
- [x] tbl_Customers 필드 추가 확인 (12개 필드)
- [x] NocoDB REST API로 두 테이블 모두 조회 가능 확인
- [x] 인덱스 생성 확인

---

#### ✅ Task CRM-002: 거래내역 97,086건 마이그레이션 (2026-03-05 완료)

> **규모**: XL | **담당**: `data-integrity-expert` | **의존성**: CRM-001

**완료 결과**:
- 스크립트: `offline-crm-v2/scripts/migrate_tx_history.py`
- 원본: 얼마에요 백업 엑셀 (2013~2026 연도별 .xls)
- 이관: 97,086건 → NocoDB tbl_tx_history (배치 500건, 연도별 중복 방지)
- tx_type 분포: 출고/입금/반입/메모 (PRD 설계 SALES/PURCHASE와 다름 — 원본값 보존)

**수락 기준**:
- [x] 얼마에요 엑셀 → NocoDB 거래내역 전체 이관 완료 (97,086건)
- [x] 연도별 중복 방지 확인 (count_by_year 검증)
- [x] 연도별 건수 보고서 출력

---

#### Task CRM-003: 고객/거래처 15,830건 병합 이전 ✅ 완료 (2026-03-05)

> **규모**: L | **담당**: `data-integrity-expert` | **의존성**: CRM-001

얼마에요 거래처.xls(13,298건) + 고객리스트 전체자료.xls(6,592건) → NocoDB tbl_Customers 병합 이전.

**완료 결과**:
- [x] `scripts/migrate_customers.py` 작성 및 실행
- [x] customer_type 자동 분류 10,380건 적용 (INDIVIDUAL/SCHOOL_*/CENTER/ASSOC/ACADEMY/ONLINE)
- [x] 고객리스트 매칭 4,043건 → email/mobile 보완 업데이트 (858건)
- [x] 고객리스트 미매칭 2,548건 신규 추가
- [x] 최종 tbl_Customers: 15,830건

---

#### Task CRM-004: 마이그레이션 후 파생 필드 산출 ✅ 완료 (2026-03-05)

> **규모**: M | **담당**: `data-integrity-expert` | **의존성**: CRM-002, CRM-003

거래내역과 고객 데이터가 모두 이관된 후, 고객별 집계 필드(last_order_date, total_purchase_amount 등)와 상태 필드(customer_status)를 산출한다.

**완료 내용**:
- `offline-crm-v2/scripts/compute_derived_fields.py` 작성 및 실행
  - tbl_tx_history 출고 건 61,548건 → 7,523개 유니크 거래처 집계
  - tbl_Customers 15,830건 전체 업데이트
- customer_status 분류 기준: ACTIVE(12개월 이내), DORMANT(12~36개월), CHURNED(36개월 초과)
- 수동 검증 완료 (대전스톤스타 샘플: tx_history와 100% 일치)

**결과 (2026-03-05 기준)**:
- 매칭: 8,430건 / 미매칭(거래 없음): 7,400건
- ACTIVE: 311건(2.0%) / DORMANT: 335건(2.1%) / CHURNED: 15,184건(95.9%)
- 출고 총 금액 합계: 9,120,347,222원

**수락 기준**:
- [x] 고객별 집계 필드 5개 산출 완료 (total_order_amount, total_order_count, last_order_date, first_order_date, customer_status)
- [x] 집계 금액 합계 tbl_tx_history와 정합성 확인
- [x] customer_status 분포 보고서 출력
- [x] 산출 로직 문서화 (재실행 가능한 스크립트 형태)

---

#### Task CRM-005: 고객 상세 페이지 (거래 히스토리/매출 차트/명세표 탭)

> **규모**: L | **예상 기간**: 1.5주 | **담당**: `partner-admin-developer` (UI 개발), `makeshop-ui-ux-expert` (디자인) | **의존성**: CRM-004

고객을 클릭하면 거래 이력, 매출 추이 차트, 명세표 발행 이력을 한 화면에서 확인할 수 있는 상세 페이지를 구현한다.

- 프론트: 고객 상세 페이지 3탭 구조
  - **거래 히스토리 탭**: tbl_tx_history에서 해당 customer_id 건 목록 (페이지네이션, 날짜 필터)
  - **매출 차트 탭**: Chart.js 월별 매출 추이 (Bar + Line 복합 차트), 누적 매출 표시
  - **명세표 탭**: 해당 고객에게 발행된 명세표 목록, 클릭 시 명세표 상세 모달
- UI/UX 디자인
  - 고객 헤더: 이름, customer_type 배지, vip_grade 배지, customer_status 배지
  - 핵심 KPI 카드 4개: 총 매출, 거래 횟수, 평균 거래 금액, 최종 거래일
  - 브랜드 색상 #7d9675(세이지 그린) 기반 디자인 시스템 유지
- CSS 스코핑: `.crm-customer-detail`, IIFE 패턴
- Playwright MCP 테스트: 고객 목록 → 고객 클릭 → 상세 페이지 3탭 전환 → 데이터 표시 검증

**수락 기준**:
- [ ] 고객 상세 페이지 3탭 (거래 히스토리/매출 차트/명세표) 구현 완료
- [ ] Chart.js 월별 매출 차트 정상 렌더링
- [ ] 거래 히스토리 페이지네이션 동작 확인
- [ ] 반응형 디자인 768px/992px/1200px 대응
- [ ] Playwright E2E 테스트 통과

---

#### Task CRM-006: 대시보드 KPI + Recharts 차트 + 미수금 경보 ✅ 완료 (2026-03-05)

> **규모**: M | **예상 기간**: 1주 | **담당**: `partner-admin-developer` | **의존성**: CRM-004

기존 고객 목록의 단순 검색을 다중 필터 + 기간 조회로 강화하여 실무 운영에 필요한 데이터 접근성을 확보한다.

- 프론트: 고객 목록 필터 UI 강화
  - 다중 필터: customer_type(개인/사업자/기관), customer_status(ACTIVE/DORMANT/CHURNED), vip_grade
  - 기간 필터: last_order_date 기준 날짜 범위 선택 (flatpickr range mode)
  - 금액 범위 필터: total_purchase_amount 최소~최대
  - 필터 조합 AND 연산, URL 파라미터 반영 (필터 상태 공유 가능)
- 프론트: 기간별 거래내역 조회
  - 전체 거래내역 탭 추가 (고객 상세와 별도 진입점)
  - 날짜 범위 + 결제 상태(미수금/완료) 필터
  - 조회 결과 합계 표시 (건수, 공급가, 세액, 총액)
- NocoDB 쿼리 최적화: 서버 사이드 필터링 (where 파라미터 활용)

**수락 기준**:
- [ ] 다중 필터 조합 동작 확인 (customer_type + customer_status + vip_grade + 기간 + 금액)
- [ ] 기간별 거래내역 조회 + 합계 표시 정상 동작
- [ ] NocoDB 서버 사이드 필터 적용 (클라이언트 필터링 아님)
- [ ] URL 파라미터 기반 필터 상태 유지

---

#### Task CRM-007: 거래명세표 발행/인쇄 React 이전 ✅ 완료 (2026-03-05)

> **규모**: L | **예상 기간**: 1.5주 | **담당**: `makeshop-ui-ux-expert` (UI/차트), `accounting-specialist` (미수금 기준 정의) | **의존성**: CRM-004

CRM 메인 대시보드에 경영 판단에 필요한 KPI 8개와 시각화 차트를 구현하고, 미수금 경보 시스템을 추가한다.

- 프론트: 대시보드 KPI 카드 8개
  - 이번 달 매출 (전월 대비 증감률)
  - 이번 달 거래 건수
  - 미수금 총액 (30일 이상 미수금 별도 강조)
  - 신규 고객 수 (이번 달)
  - 활성 고객 비율 (ACTIVE / 전체)
  - 평균 객단가
  - VIP 고객 수 (GOLD 이상)
  - 고객 이탈률 (CHURNED / 전체)
- 프론트: Chart.js 차트 3종
  - 월별 매출 추이 (최근 12개월, Bar chart)
  - 고객 상태 분포 (ACTIVE/DORMANT/CHURNED, Doughnut chart)
  - 요일별 거래 패턴 (Radar chart)
- 미수금 경보 시스템
  - 30일 이상 미수금: 주황 경보 배지
  - 60일 이상 미수금: 빨강 경보 배지 + 목록 상단 고정
  - 미수금 총액이 기준값(사용자 설정) 초과 시 대시보드 상단 경보 배너
- CSS 스코핑: `.crm-dashboard`, IIFE 패턴

**수락 기준**:
- [ ] KPI 카드 8개 정상 표시 + 실시간 데이터 반영
- [ ] Chart.js 차트 3종 정상 렌더링
- [ ] 미수금 30일/60일 경보 배지 정상 동작
- [ ] 반응형 디자인 (모바일에서 KPI 카드 2열 배치)
- [ ] 브랜드 색상 #7d9675 기반 일관된 디자인

---

#### Task CRM-008: 미수금 관리 + 엑셀 내보내기 ✅ 완료 (2026-03-05)

> **규모**: L | **예상 기간**: 1.5주 | **담당**: `accounting-specialist` (비즈니스 로직), `partner-admin-developer` (UI) | **의존성**: CRM-006

미수금 관리를 체계화하여 현금흐름 가시성을 확보한다. 에이징(Aging) 분석으로 미수금 회수 우선순위를 판단할 수 있게 한다.

- 프론트: 미수금 전용 페이지
  - 에이징 테이블: 0~30일 / 31~60일 / 61~90일 / 91일+ 구간별 미수금 합계
  - 미수금 목록: 고객명, 명세표 번호, 발행일, 금액, 경과일수, 상태
  - 정렬: 경과일수 내림차순 기본 (오래된 미수금 우선)
- 입금 확인 처리
  - "입금 확인" 버튼 → 결제일/결제수단 입력 모달
  - tbl_tx_history.payment_status → PAID, payment_date 업데이트
  - 부분 입금 처리 (partial_amount 필드)
- 미수금 독촉 관리
  - "독촉 메모" 입력 (날짜 + 내용 → tbl_tx_history.memo에 누적)
  - 독촉 이력 타임라인 표시
- 엑셀 내보내기: 미수금 목록 SheetJS 다운로드 (CRM-009와 연계)

**수락 기준**:
- [ ] 에이징 테이블 4구간 합계 정상 표시
- [ ] 입금 확인 처리 (전액/부분) 정상 동작
- [ ] payment_status/payment_date NocoDB 업데이트 확인
- [ ] 독촉 메모 입력 및 타임라인 표시
- [ ] Playwright E2E 테스트: 미수금 목록 → 입금 확인 → 상태 변경 검증

---

#### Task CRM-009: 엑셀 내보내기 (SheetJS) ✅ 완료 (2026-03-05, CRM-008에 통합)

> **규모**: S | **예상 기간**: 0.5주 | **담당**: `accounting-specialist` | **의존성**: CRM-004

CRM의 주요 데이터를 엑셀 파일로 내보내는 기능을 구현한다. 세무사 제출, 내부 보고서 등 외부 공유 시 필수 기능.

- SheetJS(xlsx) CDN 로드
- 내보내기 대상 3종
  - 고객 목록: 현재 필터 적용 상태 그대로 내보내기
  - 거래내역: 현재 조회 기간/필터 기준 내보내기
  - 미수금 현황: 에이징 요약 + 상세 목록 시트 분리
- 파일명 규칙: `PRESSCO21_[유형]_[YYYYMMDD].xlsx`
- 서식 적용: 헤더 볼드, 금액 컬럼 천단위 콤마, 날짜 형식 통일
- 다운로드 트리거: 각 페이지 상단 "엑셀 다운로드" 버튼

**수락 기준**:
- [ ] 고객 목록/거래내역/미수금 3종 엑셀 내보내기 정상 동작
- [ ] 현재 필터 상태 반영 확인
- [ ] 엑셀 파일 서식 (헤더 볼드, 금액 콤마, 날짜 형식) 적용 확인
- [ ] 파일명 규칙 준수

---

#### Task CRM-010: 회원 등급 체계 구축 + 고객 카드 강화 ✅ 완료 (2026-03-05)

> **규모**: M | **예상 기간**: 1~1.5주 | **담당**: `ecommerce-business-expert` (등급 기준·수익성), `brand-planning-expert` (브랜딩), `sales-partnership-specialist` (파트너/VIP 전략), `partner-admin-developer` (UI), `makeshop-ui-ux-expert` (디자인) | **의존성**: CRM-004

> ⚠️ **착수 전 필수**: 아래 3개 에이전트 병렬 오케스트레이션 → 결과 취합 후 최종 규정 확정
> - `ecommerce-business-expert`: 할인율 수익성 분석, VIP 인센티브 공식, KPI
> - `brand-planning-expert`: 배지 디자인, 커뮤니케이션 문구 (참고: `docs/member-grade-brand-strategy.md`)
> - `sales-partnership-specialist`: 자격 인정 기준, VIP 협상 전략, 엠버서더 계약안 (참고: `.claude/agent-memory/sales-partnership-specialist/partner-vip-ambassador-strategy.md`)

**5등급 구조 (경영진 확정 방향)**

브랜드 메타포: "한 송이 꽃이 정원이 되기까지" — 씨앗(회원) → 뿌리(인스트럭터) → 꽃밭(파트너스) → 정원사(VIP) + ★별빛(엠버서더)

| 등급 | 자격 조건 | 혜택 | 배지 색상 |
|------|----------|------|---------|
| 회원 | 회원가입 | 정가 | `#a8b5a0` |
| 인스트럭터 | 자격증/수료증 or 원예 사업자등록증 | 5~10% 할인 (소매 1개도 적용) | `#7d9675` |
| 파트너스 | 제휴 협회/업체 소속 or 인정 자격증 | 10~20% 할인 (소매 1개도 적용) | `#5e8a6e` |
| VIP | 프레스코21 직접 선정 (협회장) | 특가 + 분기 인센티브 적립금 + 협회 지원 | `#b89b5e` |
| 엠버서더★ | 바이럴 능력 보유 초청 (어떤 등급도 병행 가능) | 신제품 협찬 + 전 제품 30% 할인 + 전용코드 | `#8b6fae` |

**구현 항목**:

- DB: customers 테이블에 `member_grade`, `is_ambassador`, `ambassador_code`, `grade_qualification`, `discount_rate`, `grade_approved_at`, `grade_updated_at` 필드 추가 (SSH SQLite)
- 기존 강사회원 1,200명 → INSTRUCTOR 일괄 분류 후 수동 검토
- 등급 갱신 버튼 (관리자 설정): 전체 member_grade 재산정 (tbl_tx_history 기반)
- 프론트: 고객 카드 5등급 배지 + 엠버서더 ★ 아이콘 + customer_status 배지 + 미수금 알림
- 할인율 메이크샵 회원 그룹 연동 (price_tier 적용)
- VIP 분기 인센티브: 메이크샵 process_reserve API + 분기 실적 리포트 이메일 발송

**수락 기준**:
- [ ] Phase 6 착수 전 3개 에이전트 오케스트레이션 완료 + 최종 규정 문서화
- [ ] customers 테이블 신규 필드 추가 확인 (SSH SQLite)
- [ ] 기존 강사회원 INSTRUCTOR 일괄 분류 + 수동 검토 완료
- [ ] 고객 카드 5등급 배지 + 엠버서더 ★ 아이콘 정상 표시
- [ ] 엠버서더 30% 할인 협찬 대상 상품 제한 목록 확정
- [ ] VIP 분기 인센티브 지급 시뮬레이션 성공
- [ ] 등급별 필터 (고객 목록) 동작 확인

---

#### Task CRM-011: 성능 최적화 (NocoDB 인덱스 + 서버 사이드 필터) ✅ 완료 (2026-03-05)

> **규모**: S | **예상 기간**: 0.5주 | **담당**: `devops-monitoring-expert` | **의존성**: CRM-004

10만건 이상의 거래내역과 14,000건 이상의 고객 데이터에서 응답 속도를 보장하기 위한 성능 최적화를 수행한다.

- NocoDB SQLite 인덱스 추가 (SSH 직접 수정)
  - tbl_tx_history: (customer_id, invoice_date), (payment_status), (invoice_date DESC)
  - tbl_customers: (customer_status), (vip_grade), (customer_type, customer_status)
- 쿼리 성능 측정 및 개선
  - EXPLAIN QUERY PLAN으로 주요 쿼리 실행 계획 확인
  - 풀 스캔 발생 쿼리 식별 → 인덱스 커버링 확인
  - 목표: 목록 조회 500ms 이내, 대시보드 KPI 산출 1초 이내
- 프론트 최적화
  - API 호출 debounce (필터 변경 시 300ms)
  - 페이지네이션 서버 사이드 (limit/offset)
  - 대시보드 KPI 데이터 5분 캐싱 (sessionStorage)

**수락 기준**:
- [ ] 인덱스 생성 확인 (EXPLAIN QUERY PLAN 결과 첨부)
- [ ] 고객 목록 500ms 이내 응답 (10,000건 기준)
- [ ] 대시보드 KPI 산출 1초 이내
- [ ] 풀 스캔 쿼리 0건

---

#### Task CRM-012: 보안 강화 (API 토큰 분리) + E2E 테스트 ✅ 완료 (2026-03-05)

> **규모**: S | **예상 기간**: 0.5주 | **담당**: `security-hardening-expert` (보안), `qa-test-expert` (E2E 테스트) | **의존성**: CRM-011

CRM 시스템의 API 토큰 보안을 강화하고, 전체 CRM 기능에 대한 E2E 테스트를 수행한다.

- 보안 강화
  - NocoDB API 토큰 분리: CRM 전용 토큰 발급 (기존 파트너클래스 토큰과 분리)
  - 토큰 권한 최소화: CRM 관련 테이블만 접근 가능하도록 설정
  - 프론트엔드 코드에서 토큰 직접 노출 방지 (n8n 프록시 경유 또는 환경변수 참조)
  - XSS 방어: 고객 메모/독촉 메모 입력값 새니타이징
- Playwright MCP E2E 테스트 (전체 CRM 플로우)
  - 대시보드 접근 → KPI 8개 표시 확인
  - 고객 목록 → 다중 필터 → 고객 상세 → 3탭 전환
  - 거래내역 조회 → 기간 필터 → 합계 표시
  - 미수금 관리 → 에이징 테이블 → 입금 확인 처리
  - 엑셀 내보내기 3종 다운로드
  - VIP 등급 배지 표시 확인
- 에지 케이스 테스트
  - 거래내역 0건 고객 상세 진입 시 빈 상태 표시
  - 미수금 0원 시 대시보드 경보 미표시 확인
  - 동시 입금 확인 처리 시 데이터 정합성

**수락 기준**:
- [x] CRM 전용 API 토큰 분리 완료 (n8n WF-CRM-PROXY 경유, .env.local 환경변수)
- [x] 프론트엔드 코드 내 토큰 직접 노출 0건 (VITE_CRM_API_KEY → 서버사이드 프록시)
- [ ] XSS 방어 새니타이징 적용 확인 (향후 과제)
- [x] Playwright E2E 테스트 전체 통과 (28/28 ✓, 28.2초)
- [x] 에지 케이스 테스트 완료 (tests/01~03-*.spec.ts)

**구현 내용 (2026-03-05)**:
- Vite dev proxy: `/crm-proxy` → `https://n8n.pressco21.com/webhook/crm-proxy` (CORS 우회)
- n8n WF-CRM-PROXY: NocoDB v2 bulk API 적용 (`POST /api/v2/tables/{tableId}/records`)
- TypeScript 빌드 에러 수정: Recharts Formatter 타입, import type 분리
- E2E 테스트 28개 통과: T1(9/9) T2(10/10) T3(9/9)

---

#### ✅ Task CRM-v2-고도화: CRM v2 6단계 고도화 (2026-03-05 완료)

> **규모**: XL | **담당**: Claude (오케스트레이션) + 6개 전문가 에이전트 | **의존성**: CRM-012

PRD: PRESSCO21 Offline CRM v2 고도화 (Phase 1~6 전체 구현)

**Phase 1 — 공통 인프라**:
- `sonner` 토스트 시스템 도입 (`alert()` 전체 교체)
- 설정 페이지 (`src/pages/Settings.tsx`): 공급자정보/인쇄설정/입금계좌/시스템 4섹션
- 인쇄 로고(좌상단) + 도장(우하단, 원형/회전/-15deg) 복원 (`print.ts`)
- `App.tsx`: Toaster, `/settings`, `/calendar` 라우트 추가
- `Sidebar.tsx`: 캘린더/설정 메뉴 추가
- 등급 색상: CHURNED 빨강 → 슬레이트(#94a3b8) (brand-planning-expert 권고)

**Phase 2 — API 타입 확장 + 보안**:
- `sanitizeSearchTerm()` / `sanitizeAmount()` 추가 (security-hardening-expert)
- `Product` 인터페이스: 8단가(price1~8), product_code, alias, category, is_taxable, is_active
- `getPriceByTier(product, tier)`: 등급별 단가 반환
- Product CRUD 4종: `getProduct()`, `createProduct()`, `updateProduct()`, `deleteProduct()`
- `deleteInvoice()`, `recalcCustomerBalance()` 신규 (accounting-specialist 설계)
- `Customer` 보강: mobile, price_tier, biz_no, ceo_name, biz_type, biz_item, memo
- `Supplier` 인터페이스 12필드 + CRUD 4종

**Phase 3 — 플레이스홀더 3페이지 구현**:
- `Transactions.tsx` 전체 재작성: 97K건 거래내역, 검색+유형필터+기간필터+50건 페이지네이션
- `ProductDialog.tsx` 신규 + `Products.tsx` 전체 재작성: 3,008건 제품 CRUD, 5단가 편집
- `SupplierDialog.tsx` 신규 + `Suppliers.tsx` 전체 재작성: 공급처 CRUD 12필드

**Phase 4 — 명세표 고도화**:
- `InvoiceDialog.tsx` 전면 재작성:
  - 상품 자동완성: debounce 250ms → 등급별 단가 자동세팅
  - 거래처 카드: 등급배지 + 최근거래 5건
  - 합계 역산: `supply = Math.floor(total/1.1)`, `tax = total - supply` (accounting-specialist 검증)
  - `_totalUnit` 수량 역산 패턴
  - `isDirty` + `window.confirm` 저장 안전장치
  - Ctrl+Enter 저장 / Esc 닫기 단축키
  - copySourceId 복사 모드 지원
- `Invoices.tsx` 재작성: 인라인 [인쇄][복사][삭제] 버튼, 삭제 시 items 연계 + 잔액 재계산

**Phase 5 — 고객 고도화**:
- `CustomerDialog.tsx` 신규: 전체 필드(name/phone/mobile/email/주소/유형/상태/단가등급/회원등급/사업자정보/메모)
- `Customers.tsx`: "새 고객" 버튼 + 다중필드 검색(name/phone/mobile) + sanitize 적용

**Phase 6 — 캘린더**:
- `Calendar.tsx` 신규: 월간 7열 캘린더, 일별 건수/금액, 날짜 클릭 → 명세표 목록, 월간 요약 사이드바

**수락 기준**:
- [x] Phase 1: sonner 토스트 전환, 설정 페이지 4섹션, 인쇄 로고/도장 CSS
- [x] Phase 2: TypeScript 빌드 에러 0건, sanitize 함수 3곳 적용
- [x] Phase 3: Transactions/Products/Suppliers 3페이지 완전 동작
- [x] Phase 4: 상품 자동완성 → 단가세팅 → 합계역산 → 잔액 재계산 E2E
- [x] Phase 5: CustomerDialog CRUD 동작, 다중필드 검색
- [x] Phase 6: Calendar 월별 탐색, 날짜 클릭 필터 동작
- [x] TypeScript 빌드 성공 (chunk 경고만, 에러 0건)
- [x] git commit + push 완료 (19파일, 2340 insertions)

**수정 파일 (19개)**:
`src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/lib/constants.ts`,
`src/lib/print.ts`, `src/lib/api.ts`,
`src/pages/Settings.tsx`(신규), `src/pages/Transactions.tsx`, `src/pages/Products.tsx`,
`src/pages/Suppliers.tsx`, `src/pages/Calendar.tsx`(신규),
`src/pages/Invoices.tsx`, `src/pages/Customers.tsx`,
`src/components/InvoiceDialog.tsx`, `src/components/CustomerDialog.tsx`(신규),
`src/components/ProductDialog.tsx`(신규), `src/components/SupplierDialog.tsx`(신규),
`public/images/company-stamp.jpg`(복사)

---

## 타임라인 요약

```
2026년 3월                     4월                          5월                          6월
|-- Phase 3-A (3~4주) -------|
| 핵심 구조 보완               |
| Task 001 일정 시스템         |
| Task 002 재료키트            |
| Task 003 협회 제휴           |
| Task 004 강의 수정           |
| Task 005 4등급 회원          |
| Task 005-1 통합 테스트       |
|                             |-- Phase 3-B (2~3주) -------|
|                             | 운영 효율화                  |
|                             | Task 006 관리자 어드민       |
|                             | Task 007 이메일 알림         |
|                             | Task 008 수강생 마이페이지   |
|                             | Task 008-1 통합 테스트       |
|                             |                             |-- Phase 3-C (2~3주) -------|
|                             |                             | 전환율 + 생태계              |
|                             |                             | Task 009 성장 파이프라인     |
|                             |                             | Task 010 CS 지원             |
|                             |                             | Task 011 잔여석 실시간       |
|                             |                             | Task 012 선물하기            |
|                             |                             | Task 012-1 통합 테스트       |
|                                                                                       |
|== Phase CRM (6~8주, Phase 3-A와 병렬 착수) ==========================================|
| CRM-001 테이블 생성 (1일)                                                             |
| CRM-002 거래내역 10만건 이관 (2주) -------->|                                         |
| CRM-003 고객 14,549건 이관 (1.5주) ------->|                                         |
|                                            | CRM-004 파생 필드 산출 (1주)              |
|                                            | CRM-005 고객 상세 페이지 (1.5주) -------->|
|                                            | CRM-006 필터 강화 (1주) ---|              |
|                                            | CRM-009 엑셀 내보내기 (0.5주)             |
|                                            | CRM-010 회원 등급 체계 (1~1.5주)           |
|                                            |                            | CRM-007 대시보드 KPI (1.5주)
|                                            |                            | CRM-008 미수금 관리 (1.5주)
|                                            |                            | CRM-011 성능 최적화 (0.5주)
|                                            |                            | CRM-012 보안+E2E (0.5주)
```

---

## Task 의존성 그래프

```
Phase 3-A (핵심 구조 보완)
  Task 001 (일정 시스템)     --> 없음 (독립, 최우선)
  Task 002 (재료키트)        --> 없음 (Task 001과 병렬 가능)
  Task 003 (협회 제휴)       --> 없음 (Task 001/002와 병렬 가능)
  Task 004 (강의 수정)       --> 없음 (독립)
  Task 005 (4등급 회원)      --> Task 003에 의존 (협회 DB 기반)
  Task 005-1 (3-A 통합)     --> Task 001~005 모두 완료 후

Phase 3-B (운영 효율화)
  Task 006 (관리자 어드민)   --> Task 003에 의존 (협회 관리 탭)
  Task 007 (이메일 알림)     --> Task 001에 의존 (tbl_Schedules 기반 리마인더)
  Task 008 (수강생 마이페이지) --> 없음 (독립)
  Task 008-1 (3-B 통합)     --> Task 006~008 모두 완료 후

Phase 3-C (전환율 + 생태계)
  Task 009 (성장 파이프라인)  --> Task 008에 의존 (마이페이지 기반)
  Task 010 (CS 지원)         --> 없음 (독립)
  Task 011 (잔여석 실시간)   --> Task 001에 의존 (tbl_Schedules 필수)
  Task 012 (선물하기)        --> 없음 (독립)
  Task 012-1 (3-C 통합)     --> Task 009~012 모두 완료 후

Phase CRM (Offline CRM 고도화 -- Phase 3-A와 병렬 착수 가능)
  CRM-001 (테이블 생성)      --> 없음 (독립, 최우선)
  CRM-002 (거래내역 이관)    --> CRM-001에 의존
  CRM-003 (고객 병합 이전)   --> CRM-001에 의존 (CRM-002와 병렬 가능)
  CRM-004 (파생 필드 산출)   --> CRM-002, CRM-003 모두 완료 후
  CRM-005 (고객 상세 페이지) --> CRM-004에 의존
  CRM-006 (필터 강화)        --> CRM-004에 의존
  CRM-007 (대시보드 KPI)     --> CRM-004에 의존
  CRM-008 (미수금 관리)      --> CRM-006에 의존
  CRM-009 (엑셀 내보내기)    --> CRM-004에 의존 (CRM-005/006과 병렬 가능)
  CRM-010 (VIP 등급)         --> CRM-004에 의존 (CRM-005/006과 병렬 가능)
  CRM-011 (성능 최적화)      --> CRM-004에 의존 (UI 작업 후 권장)
  CRM-012 (보안+E2E)         --> CRM-011에 의존 (최종 단계)
```

---

## 성공 지표 (KPI)

### Phase 3 비즈니스 지표

| 지표 | Phase 3-A 목표 | Phase 3-B 목표 | Phase 3-C 목표 |
|------|---------------|---------------|---------------|
| 예약 완료율 (상세 → 결제) | 30% 이상 | 40% 이상 | 50% 이상 |
| 재료키트 자동 배송 성공률 | 95% 이상 | - | - |
| 관리자 NocoDB 직접 접속 빈도 | - | 80% 감소 | - |
| 이메일 발송 성공률 | - | 98% 이상 | - |
| 수강생 → 파트너 전환율 | - | - | 5% 이상 |
| 수료증 발급 건수 (월) | - | - | 30건 이상 |
| CS 자체 해결률 (FAQ) | - | - | 60% 이상 |

### Phase CRM 비즈니스 지표

| 지표 | 목표 |
|------|------|
| 데이터 마이그레이션 정합성 (건수/금액) | 100% |
| 고객 중복 병합 정확도 | 99% 이상 |
| 미수금 파악 소요 시간 | 30초 이내 (기존 수분) |
| 고객 상세 조회 시간 | 500ms 이내 |
| 대시보드 KPI 산출 시간 | 1초 이내 |
| 구글시트 직접 접속 빈도 감소 | 90% 이상 |
| 엑셀 보고서 생성 소요 시간 | 10초 이내 (기존 수동 30분) |
| E2E 테스트 통과율 | 100% |

### 기술 품질 지표

| 지표 | 기준 |
|------|------|
| IIFE 미적용 JS | 0개 |
| CSS 전역 셀렉터 | 0개 |
| Lighthouse Performance | 80+ |
| Lighthouse Accessibility | 90+ |
| Playwright E2E 테스트 통과율 | 100% |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-05 | CRM-001~004 완료 처리 + Shrimp Task Manager 정본 안내 + 에이전트 배치 명시 |
| 2026-03-05 | 오케스트레이션 전략 확정: Shrimp(추적)+에이전트(도메인)+Claude(구현) 3계층 |
| 2026-03-04 | Phase CRM 고도화 로드맵 추가 (CRM-001~012, ERP 이전 + 고객관계관리 엔진) |
| 2026-03-04 | Phase 3-A/B/C 고도화 로드맵 초판 작성 (PRD v3.0 기반) |
