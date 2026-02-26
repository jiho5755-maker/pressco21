# Phase 2.5 통합 E2E 테스트 체크리스트

> **작성일**: 2026-02-26
> **대상**: Task 290/291/293/294/295 완료 후 통합 테스트
> **목적**: Flow1(파트너 온보딩+강의등록), Flow2(예약+결제+연락처), Flow3(정산) 검증

---

## 테스트 환경

| 항목 | 값 |
|------|-----|
| 테스트 URL | `https://foreverlove.co.kr` |
| n8n | `https://n8n.pressco21.com` |
| NocoDB | `https://nocodb.pressco21.com` |
| 파트너 테스트 계정 | `jihoo5755` (SILVER, active) |
| 수강생 테스트 계정 | 별도 일반 회원 계정 |
| 관리자 토큰 | `pressco21-admin-2026` |

---

## 선행 조건 체크

- [ ] 메이크샵 편집기에서 4개 페이지 js.js 재저장 완료 (2606/2607/2609/2610)
- [ ] n8n WF-10 Validate Input 노드 answers 배열 방식으로 교체 완료
- [ ] n8n WF-05 수수료율 상수 확정 정책으로 수정 (SILVER 20%, GOLD 25%, PLATINUM 30%)
- [ ] NocoDB n8n 네트워크 연결 상태 (`docker network inspect n8n_n8n-network | grep nocodb`)
- [ ] 메이크샵 허용 IP에 `158.180.77.201` 등록

---

## Flow 1: 파트너 온보딩 + 강의 등록

> **경로**: 신청 → 검토 → 승인 → 강의 등록(WF-16) → pending → 목록 노출

### 1-1. 파트너 신청 (WF-07)

```bash
# WF-07 파트너 신청 테스트
curl -s -X POST https://n8n.pressco21.com/webhook/partner-apply \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "test_applicant_001",
    "name": "테스트 파트너",
    "studio_name": "테스트 공방",
    "email": "test@pressco21.com",
    "phone": "01012345678",
    "location": "서울 강남",
    "specialty": "압화",
    "introduction": "E2E 테스트용 신청"
  }' | python3 -m json.tool
```

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 정상 신청 | `success:true, application_id 반환` | | ☐ |
| 중복 신청 | `DUPLICATE_APPLICATION 오류` | | ☐ |
| 필수 필드 누락 | `MISSING_PARAMS 오류` | | ☐ |
| tbl_Applications 레코드 생성 | `status=pending` | | ☐ |
| 접수 이메일 발송 | 신청자 이메일 수신 | | ☐ |
| 텔레그램 알림 | 관리자 봇 알림 수신 | | ☐ |

### 1-2. 파트너 승인 (WF-08)

```bash
# WF-08 파트너 승인 (관리자 토큰 필요)
curl -s -X POST https://n8n.pressco21.com/webhook/partner-approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pressco21-admin-2026" \
  -d '{
    "application_id": "{섹션 1-1에서 받은 application_id}",
    "admin_note": "E2E 테스트 승인"
  }' | python3 -m json.tool
```

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 정상 승인 | `success:true, partner_code 반환` | | ☐ |
| 토큰 없이 호출 | `401 Unauthorized` | | ☐ |
| tbl_Applications status | `approved` | | ☐ |
| tbl_Partners 레코드 생성 | `status=active, grade=SILVER` | | ☐ |
| 승인 이메일 발송 | 파트너 이메일 수신 | | ☐ |
| 메이크샵 그룹 변경 | 강사회원(group_level=2) 변경 | | ☐ |

### 1-3. 강의 등록 (WF-16) — Task 293 신규

```bash
# 강의 등록 페이지 접속 확인
# foreverlove.co.kr/shop/page.html?id=2611 (등록 후)
# 또는 직접 API 테스트:
curl -s -X POST https://n8n.pressco21.com/webhook/class-register \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "jihoo5755",
    "title": "E2E 테스트 강의",
    "category": "기초",
    "type": "원데이",
    "difficulty": "초급",
    "max_students": 8,
    "price": 50000,
    "duration": 120,
    "schedule_desc": "매주 토요일 오후 2시",
    "description": "E2E 테스트용 강의입니다",
    "curriculum": "1회차: 기초, 2회차: 심화",
    "location": "서울 강남구 테스트 공방",
    "contact_instagram": "https://instagram.com/test",
    "contact_phone": "01012345678"
  }' | python3 -m json.tool
```

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 정상 등록 | `success:true, class_id 반환 (CL_YYYYMM_XXX)` | | ☐ |
| 비파트너 등록 시도 | `NOT_PARTNER 오류` | | ☐ |
| 필수 필드 누락 | `MISSING_PARAMS 오류` | | ☐ |
| tbl_Classes 레코드 생성 | `status=pending` | | ☐ |
| 텔레그램 알림 | "새 강의 등록 신청" 알림 | | ☐ |

### 1-4. 강의 승인 후 목록 노출 (NocoDB GUI)

| 테스트 항목 | 방법 | 결과 | ☐ |
|-----------|------|------|---|
| NocoDB에서 status=active 변경 | GUI 직접 수정 | | ☐ |
| 목록 페이지 2606에서 강의 노출 | 브라우저 확인 | | ☐ |
| WF-01 getClasses 응답에 포함 | API 확인 | | ☐ |

---

## Flow 2: 수강생 예약 → 결제 → 연락처 확인

> **경로**: 목록 탐색 → 상세 → 예약(WF-04) → 메이크샵 결제 → 파트너 연락처

### 2-1. 클래스 목록 탐색 (페이지 2606)

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 목록 페이지 로드 | 클래스 카드 표시 | | ☐ |
| 카테고리 필터(pill) | 해당 카테고리만 표시 | | ☐ |
| 검색어 하이라이트 | 검색어 `<mark>` 태그 강조 | | ☐ |
| 빈 결과 화면 | SVG + 친근한 메시지 표시 | | ☐ |
| 상세 페이지 링크 | `/shop/page.html?id=2607&class_id=CL_...` | | ☐ |

### 2-2. 클래스 상세 페이지 (페이지 2607)

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 강의 정보 렌더링 | 강의명/가격/소개 표시 | | ☐ |
| 별점 SVG 시각화 | 리뷰 별점 SVG 표시 | | ☐ |
| 스티키 예약 위젯 | 스크롤 시 고정 표시 | | ☐ |
| 파트너 연락처 버튼 | 인스타/전화/카톡 버튼 표시 | | ☐ |
| 인스타 링크 클릭 | 인스타그램 DM 연결 | | ☐ |
| 전화번호 클릭 | `tel:` 링크 연결 | | ☐ |

### 2-3. 예약 플로우 — Task 291 핵심

**비로그인 상태 테스트:**
- [ ] 예약 버튼 클릭 → "로그인이 필요합니다" 안내 표시
- [ ] 로그인 버튼 클릭 → 로그인 페이지 이동

**로그인 상태 테스트:**
```
테스트 순서:
1. 수강생 계정으로 foreverlove.co.kr 로그인
2. 클래스 상세 페이지(2607) 접속
3. 날짜 선택 → 예약 버튼 클릭
4. 예약 확인 모달 확인
5. 확인 버튼 클릭 → WF-04 API 호출 → 결제 페이지 이동
```

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 날짜 미선택 예약 시도 | "날짜를 선택해주세요" 안내 | | ☐ |
| 정상 예약 확인 모달 | 강의명/날짜/금액 요약 표시 | | ☐ |
| WF-04 POST 호출 | NocoDB tbl_Settlements에 PENDING_SETTLEMENT 생성 | | ☐ |
| 결제 페이지 이동 | 메이크샵 상품 페이지로 이동 | | ☐ |
| WF-04 실패 시 폴백 | 경고 없이 결제 페이지 이동 | | ☐ |

**WF-04 직접 테스트:**
```bash
curl -s -X POST https://n8n.pressco21.com/webhook/record-booking \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CL_202602_001",
    "member_id": "test_student_001",
    "booking_date": "2026-03-15",
    "participants": 1,
    "amount": 50000
  }' | python3 -m json.tool
```

| WF-04 테스트 | 기대 결과 | 결과 | ☐ |
|------------|---------|------|---|
| 정상 예약 | `success:true, settlement_id` 반환 | | ☐ |
| 수강생 이메일 | 예약 확인 이메일 수신 | | ☐ |
| 파트너 이메일 | 새 예약 알림 이메일 수신 | | ☐ |
| tbl_Settlements 생성 | `status=PENDING_SETTLEMENT` | | ☐ |

---

## Flow 3: 결제 → WF-05 폴링 → 정산 → 적립금

> **경로**: 메이크샵 결제 완료 → WF-05 감지 → D+3 정산 → process_reserve

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 결제 완료 후 WF-05 감지 | tbl_Settlements 레코드 생성 | | ☐ |
| 수수료 계산 (SILVER 20%) | commission_amount = 결제금액 × 0.20 | | ☐ |
| 적립금 계산 (80%) | reserve_amount = commission × 0.80 | | ☐ |
| D+3 시뮬레이션 후 COMPLETED | status=COMPLETED | | ☐ |
| process_reserve 성공 | `return_code: 0000` | | ☐ |
| 파트너 마이페이지 적립금 증가 | 예상 금액과 일치 | | ☐ |
| 자기 결제 방지 | 파트너 본인 결제 시 SELF_PURCHASE | | ☐ |

*상세 검증 방법: `docs/guides/settlement-pipeline-verification.md` 참고*

---

## 보안 테스트

### XSS 방어

| 테스트 항목 | 입력값 | 기대 결과 | ☐ |
|-----------|-------|---------|---|
| 강의 등록 폼 XSS | `<script>alert(1)</script>` | sanitize 후 저장 | ☐ |
| URL 파라미터 XSS | `javascript:alert(1)` | sanitizeUrl 차단 | ☐ |
| 후기 작성 XSS | `<img src=x onerror=alert(1)>` | 이스케이프 처리 | ☐ |

### 인증 우회

| 테스트 항목 | 방법 | 기대 결과 | ☐ |
|-----------|------|---------|---|
| WF-08 토큰 없이 호출 | Authorization 헤더 제거 | 401 Unauthorized | ☐ |
| WF-08 잘못된 토큰 | `Bearer wrong-token` | 401 Unauthorized | ☐ |
| WF-16 비파트너 등록 | 일반 member_id 사용 | NOT_PARTNER 오류 | ☐ |
| WF-04 자기 결제 | 파트너가 본인 강의 예약 | SELF_PURCHASE 처리 | ☐ |

### 데이터 유효성

| 테스트 항목 | 입력값 | 기대 결과 | ☐ |
|-----------|-------|---------|---|
| 강의 가격 음수 | `price: -1000` | INVALID_PARAMS 오류 | ☐ |
| 정원 초과 예약 | 현재 예약 > max_students | 오류 또는 경고 | ☐ |
| member_id 없는 예약 | `member_id: ""` | NOT_LOGGED_IN 오류 | ☐ |

---

## 파트너 대시보드 연동 확인

| 테스트 항목 | 기대 결과 | 결과 | ☐ |
|-----------|---------|------|---|
| 파트너 로그인 후 대시보드(2608) 접속 | 파트너 정보 + 강의 목록 표시 | | ☐ |
| 강의 등록 버튼 클릭 | `/shop/page.html?id=2611` 이동 | | ☐ |
| 강의 상태 변경 (active→paused) | WF-06 호출 → NocoDB 업데이트 | | ☐ |
| 예약 내역 조회 | WF-03 응답 정상 | | ☐ |

---

## 에러 핸들링 테스트

| 시나리오 | 테스트 방법 | 기대 결과 | ☐ |
|---------|----------|---------|---|
| WF-16 중복 강의 | 같은 강의명으로 재등록 | DUPLICATE_CLASS 오류 | ☐ |
| NocoDB 연결 실패 | docker 네트워크 임시 차단 | 에러 응답 + 텔레그램 알림 | ☐ |
| n8n 네트워크 오류 | 프론트엔드에서 fetch catch | "네트워크 오류" 메시지 표시 | ☐ |
| WF-ERROR 동작 | 의도적 노드 오류 | 텔레그램 에러 알림 수신 | ☐ |

---

## 반응형 테스트

| 해상도 | 테스트 페이지 | 확인 항목 | ☐ |
|-------|------------|---------|---|
| 375px (모바일) | 목록(2606) | 1열 그리드, pill 필터 스크롤 | ☐ |
| 375px (모바일) | 상세(2607) | 스티키 위젯 위치, 연락처 버튼 | ☐ |
| 768px (태블릿) | 목록(2606) | 2열 그리드 | ☐ |
| 1280px (PC) | 상세(2607) | 3열 레이아웃, 사이드바 sticky | ☐ |
| 375px (모바일) | 강의등록(2611) | 폼 필드 1열 배치 | ☐ |

---

## Phase 2.5 완료 선언 기준

아래 항목이 **모두** 통과해야 Phase 2.5 완료로 선언합니다:

**Critical (필수 통과):**
- [ ] WF-16 강의 등록 → tbl_Classes pending 생성
- [ ] WF-04 예약 → tbl_Settlements PENDING_SETTLEMENT 생성
- [ ] WF-05 주문 감지 → 수수료 계산 → COMPLETED
- [ ] process_reserve API 성공 + 파트너 적립금 증가
- [ ] WF-08 관리자 토큰 인증 통과
- [ ] WF-16 비파트너 차단 (NOT_PARTNER)
- [ ] XSS 입력값 sanitize 처리

**High (권고 통과):**
- [ ] 파트너 연락처 버튼 3종 정상 동작
- [ ] 강의 등록 → 관리자 텔레그램 알림
- [ ] 빈 결과 화면 표시
- [ ] 모바일(375px) 레이아웃 정상

---

## 테스트 결과 기록

| 날짜 | 테스터 | Flow 1 | Flow 2 | Flow 3 | 보안 | 결론 |
|------|--------|--------|--------|--------|------|------|
| | | ☐ 통과 | ☐ 통과 | ☐ 통과 | ☐ 통과 | |

---

> 📌 **관련 문서**:
> - `docs/guides/settlement-pipeline-verification.md` — Flow3 상세 검증
> - `docs/guides/phase2.5-manual-tasks.md` — 선행 수동 작업
> - `docs/test-checklists/phase2-e2e.md` — Phase 2 E2E (기존)
> - `docs/test-checklists/phase2-v2-integration-test.md` — n8n 통합 테스트
