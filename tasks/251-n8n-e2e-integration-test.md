# Task 251: Phase 2 v2.1 n8n + NocoDB E2E 통합 테스트

> **상태**: 대기 중 (관리자 인프라 설정 완료 후 실행 가능)
> **규모**: L
> **의존성**: Task 201 (NocoDB 설치), Task 202 (n8n Credentials 설정), Task 211~232 (워크플로우 개발)
> **에이전트**: `주도` qa-test-expert | `협업` gas-backend-expert, makeshop-planning-expert

---

## 목표

Phase 2 v2.1 (n8n + NocoDB) 파트너 클래스 플랫폼 전체를 배포 전 최종 검증한다.
고객·파트너·관리자 세 플로우의 E2E 시나리오를 검증하고, 보안·성능·에러 핸들링 기준을 충족하는지 확인한다.

---

## 전제 조건 (관리자 인프라 설정 필요)

이 Task를 시작하기 전에 아래 인프라 설정이 완료되어야 한다.
모든 항목이 완료되기 전까지는 테스트를 시작할 수 없다.

### 필수 완료 항목 (Task 201)
- [ ] NocoDB Docker 컨테이너 설치 및 실행 중 (nocodb.pressco21.com)
- [ ] 8개 테이블 생성 완료:
  - tbl_Partners, tbl_Classes, tbl_Bookings, tbl_Settlements
  - tbl_Applications, tbl_Reviews, tbl_Education, tbl_ErrorLogs
- [ ] 테이블 간 Links(Relations) 연결 완료
- [ ] NocoDB API Token 발급 완료

### 필수 완료 항목 (Task 202)
- [ ] n8n Credentials 6개 등록 완료:
  1. NocoDB API (xc-token)
  2. Makeshop API (Shopkey + Licensekey)
  3. Email SMTP (Naver 또는 G Suite)
  4. Telegram Bot API
  5. (필요 시 추가)
- [ ] n8n CORS 설정 완료 (foreverlove.co.kr 허용)
- [ ] 메이크샵 API IP 화이트리스트에 n8n 서버 IP (158.180.77.201) 등록

### 필수 완료 항목 (Task 211~232)
- [ ] n8n 워크플로우 13개 + WF-ERROR 개발 및 배포 완료
- [ ] 각 워크플로우 Active 상태 확인
- [ ] 메이크샵 3개 페이지 프론트엔드 N8N_URL 교체 완료

---

## 테스트 환경 구성 방법

### 테스트 계정 준비

```
1. 테스트 파트너 계정 (메이크샵 "강사회원" 그룹)
   - 메이크샵 관리자 > 회원 관리 > 테스트 계정 생성
   - 그룹: "강사회원" 설정
   - NocoDB tbl_Partners에 해당 member_id로 레코드 수동 삽입

2. 테스트 일반 회원 계정
   - 메이크샵에서 일반 회원 가입

3. 테스트 클래스 (메이크샵 상품)
   - 메이크샵 관리자 > 상품 등록
   - 상품 유형: 클래스 (날짜/시간을 옵션으로 설정)
   - NocoDB tbl_Classes에 goodsNo와 함께 수동 삽입
```

### n8n 워크플로우 수동 실행 방법

```
n8n UI (n8n.pressco21.com) 접속 후:
1. 좌측 메뉴 > Workflows
2. 실행할 워크플로우 선택
3. 상단 "Execute Workflow" 버튼 클릭 (수동 1회 실행)
또는
4. 특정 Webhook 워크플로우는 curl로 직접 호출:
   curl -X GET "https://n8n.pressco21.com/webhook/class-api?action=getClasses"
   curl -X POST "https://n8n.pressco21.com/webhook/partner-apply" \
     -H "Content-Type: application/json" \
     -d '{"member_id":"test001","name":"테스트강사",...}'
```

### 스케줄 워크플로우 테스트 방법

```
WF-11 D-3/D-1 리마인더 테스트 방법:
1. NocoDB tbl_Bookings에 테스트 데이터 삽입
   - class_date: 오늘 + 3일 (D-3 테스트)
   - student_email_sent: null (미발송 상태)
2. n8n UI에서 WF-11 수동 실행
3. 수강생 이메일 수신 확인

WF-05e D+3 정산 테스트 방법:
1. NocoDB tbl_Settlements에 테스트 데이터 삽입
   - status: PENDING_SETTLEMENT
   - created_at: 오늘 - 3일
2. n8n UI에서 WF-05e 수동 실행
3. 파트너 메이크샵 적립금 잔액 확인
```

---

## 구현 단계

### 1단계: 환경 준비 체크리스트 완료

- [ ] 섹션 0 (환경 준비) 항목 전체 완료 확인
- [ ] 테스트 데이터 NocoDB에 삽입 완료
- [ ] n8n 워크플로우 13개 Active 상태 확인

### 2단계: 고객 플로우 E2E

- [ ] 클래스 목록 페이지 접속 및 WF-01 연동 확인
- [ ] 클래스 상세 페이지 및 결제 페이지 이동 확인
- [ ] 예약 확인 이메일 수신 확인 (WF-05 폴링 후)
- [ ] D-3/D-1 리마인더 이메일 (WF-11 수동 실행)
- [ ] 후기 요청 이메일 (WF-12 수동 실행)
- [ ] D+3 적립금 지급 (WF-05e 수동 실행)

### 3단계: 파트너 플로우 E2E

- [ ] 파트너 신청 (WF-07) 및 이메일/텔레그램 알림
- [ ] 관리자 승인 (WF-08, ADMIN_API_TOKEN 사용)
- [ ] 교육 이수 (WF-10, 합격/불합격 분기)
- [ ] 클래스 등록/수정/삭제 (WF-06)
- [ ] 파트너 대시보드 (WF-02/03) 및 마스킹 확인
- [ ] 후기 답글 (WF-09)

### 4단계: 보안 테스트

- [ ] 비로그인/비파트너/pending/inactive 상태별 차단
- [ ] ADMIN_API_TOKEN 없는 WF-08 접근 차단
- [ ] 자기결제 방지 (SELF_PURCHASE)
- [ ] XSS/Injection 방지
- [ ] 프론트 소스에 API 키 미노출

### 5단계: 에러 핸들링 및 스케줄

- [ ] WF-ERROR 텔레그램 알림 및 tbl_ErrorLogs 기록
- [ ] 이메일 실패 시 데이터 저장 독립적 처리
- [ ] 적립금 API 실패 시 retry_count 및 재시도
- [ ] 스케줄 워크플로우 실행 예정 시각 확인

### 6단계: NocoDB GUI 및 롤백 확인

- [ ] NocoDB 8개 테이블 뷰/필터/정렬 확인
- [ ] Links(Relations) 동작 확인
- [ ] Rollup 자동 집계 확인
- [ ] 롤백 절차 확인 (5분 이내 GAS URL 복구 가능)

### 7단계: 최종 배포 점검 및 문서화

- [ ] 테스트 결과 요약 표 완성 (통과/실패 건수)
- [ ] 발견된 이슈 목록 작성 (심각도별)
- [ ] 배포 판정 (PASS/CONDITIONAL PASS/FAIL)
- [ ] 실패 항목 수정 후 회귀 테스트

---

## 테스트 체크리스트 파일

```
docs/test-checklists/phase2-v2-integration-test.md
```

위 파일에 120개 이상의 테스트 항목이 체크박스 형식으로 정리되어 있다.
테스트 수행 시 해당 파일의 각 항목을 하나씩 확인하며 결과를 기록한다.

---

## 수락 기준

- [ ] 섹션 0 환경 준비 체크리스트 전체 통과
- [ ] 고객/파트너 플로우 E2E Critical 항목 0건 실패
- [ ] 보안 Critical 항목 0건 실패 (XSS, 인증 우회, 자기결제 방지)
- [ ] 에러 핸들링 Critical 항목 0건 실패 (이메일 독립 처리, 재시도 로직)
- [ ] NocoDB 관리자 GUI 접속 및 데이터 확인 완료
- [ ] 롤백 절차 확인 (5분 이내 복구 가능)
- [ ] `docs/test-checklists/phase2-v2-integration-test.md` 결과 기록 완료
- [ ] 최종 배포 판정 PASS 또는 CONDITIONAL PASS

---

## 참조 문서

| 문서 | 경로 |
|-----|-----|
| Phase 2 v2.1 PRD | `docs/PRD-phase2-n8n.md` |
| n8n 워크플로우 아키텍처 | `docs/phase2/n8n-airtable-migration-architecture.md` |
| NocoDB 설계 가이드 | `tasks/201-nocodb-database-design.md` |
| n8n 서버 설정 가이드 | `tasks/202-n8n-server-setup.md` |
| 테스트 체크리스트 | `docs/test-checklists/phase2-v2-integration-test.md` |
| 기존 GAS 코드 (참고용) | `파트너클래스/class-platform-gas.gs` |

---

## 주의 사항

1. **실제 결제 테스트 불가**: 메이크샵 결제는 실제 결제가 발생하므로 결제 페이지 이동까지만 확인한다.
   적립금 지급(process_reserve)은 테스트 계정 소액(100원)으로 검증한다.

2. **이메일 발송 주의**: 테스트 중 실제 이메일이 발송된다. 테스트 계정의 이메일을 테스트용 계정으로 설정하거나, SMTP를 테스트 모드(발송 로그만 기록)로 임시 설정할 것을 권장한다.

3. **텔레그램 알림**: 테스트 중 @Pressco21_makeshop_bot 채널에 다수의 테스트 메시지가 발송된다. 관리자에게 테스트 진행 중임을 사전 안내한다.

4. **NocoDB 테스트 데이터**: 테스트 완료 후 tbl_Settlements의 COMPLETED 레코드 등 테스트 데이터를 정리한다. 실제 파트너 적립금 지급이 발생했다면 minus API로 차감한다.

5. **서버 미배포 상태**: 이 Task는 관리자 인프라 설정(Task 201/202)과 n8n 워크플로우 개발(Task 211~232) 완료 후에만 실행 가능하다. 현재는 체크리스트 문서 준비 단계이다.
