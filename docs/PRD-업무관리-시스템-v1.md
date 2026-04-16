# PRD — 업무관리 시스템 v1

> 작성일: 2026-04-16
> 작성: 경영기획 팀장 장지호 + Claude Code
> 상태: **계획 수립 (구현 대기)** — 정리 작업 후 착수 예정

---

## 1. 목적 & 배경

### Why
- PRESSCO21은 8명 소규모 회사 (재택 3 + 사무실 5)
- 업무가 카카오톡·말·쪽지로 분산되어 **추적 불가**, 빠진 업무·중복 업무 반복
- 재택근무자(장다경·조승해·송미)는 **법적으로 업무보고 증빙 필요** (재량근로 §58③)
- 현재 Flora 미니앱 업무보드(v3)는 있지만 **텔레그램 연동 없음 + 협업 기능 부재**

### 근본 목적
1. **전사 업무 가시화** — 누가 무엇을 언제까지 하는지 한 곳에서
2. **재택근무자 증빙 체계** — 장다경 근로자성 입증 자동 축적
3. **협업 문화** — 직원 상호 요청/수락으로 책임 분산
4. **관리 자동화** — 리마인더·완료 승인으로 대표 개입 최소화

---

## 2. 핵심 설계 원칙 (확정 사항)

| # | 원칙 | 출처 |
|---|------|------|
| 1 | 등록 주체: 관리자(하달) + 직원 본인 + 직원→직원 요청(수락/거절 선택) | Q1 |
| 2 | 완료: 직원 완료 요청 → 관리자 승인 → 완료 (승인 플로우 필수) | Q2 |
| 3 | 푸시: 직원별 개인 시간대 설정 + /내업무 수동 조회 + 기한 자동 리마인더 | Q3 |
| 4 | **재택근무자 완료 처리 = `hr_work_logs` 자동 연동** (법적 증빙) | Q4 |
| 5 | 직원 상호 요청: **전직원 누구에게나 가능** (자유) | Q5 |
| 6 | 범위: **풀 구현** (단, Phase 분할 점진적 개발) | Q6 |

### 추가 원칙 (Claude 추천 → 대표 승인)
- **수락/거절 버튼**: 직원→직원 요청 시 거절 사유 입력 가능
- **증빙 첨부**: 재택근무자 완료 요청 시 사진/영상/PDF 필수, `hr_work_logs` 자동 저장
- **리마인더 단계화**: D-3 / D-1 / D-day / 연체별 차등, 연체 2일 이상 관리자 자동 알림
- **부재/휴가 연동**: `staff.leave_status` 기반 배정 차단 (송미 대응)
- **우선순위 자동 승격**: D-1 → high, 초과 → critical (이미 미니앱 로직 일부 존재)
- **반복 업무**: cron 기반 자동 생성 (매주 월요일 재고체크 등)
- **완료 자동승인 옵션**: low priority + personal 범위는 승인 생략 (관리자 병목 방지)

---

## 3. 사용자/권한 모델

### 기존 tier 재활용
| Tier | 권한 |
|------|------|
| admin_full (장지호) | 전사 업무 CRUD + 완료 승인 + 전사 현황 |
| admin_cmd_only (원장님) | 업무 조회 + 완료 승인 (근태 기능 없음) |
| senior (장준혁·서향자·이혜자) | 본인 업무 + 협업 요청 + 완료 요청 |
| junior_office (이재혁) | senior와 동일 |
| junior_remote (장다경·조승해) | senior와 동일 + **완료 시 증빙 첨부 필수** |
| (out) 송미 | 출산휴가, 배정 차단 |

### 권한 매트릭스
| 액션 | admin | senior | junior_remote |
|------|-------|--------|---------------|
| 자기 업무 등록 | ✅ | ✅ | ✅ |
| 직원 하달 | ✅ | ❌ | ❌ |
| 동료 요청 | ✅ | ✅ | ✅ |
| 완료 요청 | ✅ | ✅ | ✅(증빙 필수) |
| 완료 승인 | ✅ | ❌ | ❌ |
| 업무 삭제 | ✅(본인것만+권한) | ✅(본인것) | ✅(본인것) |
| 전사 현황 조회 | ✅ | ❌ | ❌ |

---

## 4. 데이터 모델 (Flora DB 확장)

### 기존 `tasks` 테이블 확장
```sql
-- 신규 컬럼
ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'pending';
-- pending | in_progress | completion_request | completed | rejected

ALTER TABLE tasks ADD COLUMN assigned_by TEXT;  -- 누가 할당했나 (staff.id)
ALTER TABLE tasks ADD COLUMN delegation_status TEXT;
-- null | pending_accept | accepted | rejected

ALTER TABLE tasks ADD COLUMN completion_requested_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN completion_approved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN completion_approved_by TEXT;
ALTER TABLE tasks ADD COLUMN completion_evidence_url TEXT;  -- MinIO 증빙 파일 URL
ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;  -- 'weekly:mon' 등
ALTER TABLE tasks ADD COLUMN scope TEXT DEFAULT 'personal';
-- personal | collaboration | company
```

### 신규 `task_delegations` 테이블
```sql
CREATE TABLE task_delegations (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  requester_id TEXT REFERENCES staff(id),
  requestee_id TEXT REFERENCES staff(id),
  status TEXT DEFAULT 'pending',  -- pending | accepted | rejected
  message TEXT,
  response_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
```

### 신규 `task_reminders` 테이블
```sql
CREATE TABLE task_reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  reminder_type TEXT,  -- d_minus_3 | d_minus_1 | d_day | overdue
  sent_at TIMESTAMPTZ,
  channel TEXT  -- telegram | miniapp
);
```

### `staff` 테이블 확장
```sql
ALTER TABLE staff ADD COLUMN preferred_notification_time TEXT DEFAULT '08:00';
ALTER TABLE staff ADD COLUMN leave_status TEXT;
-- null | sick | annual | maternity | paternity
ALTER TABLE staff ADD COLUMN leave_from DATE;
ALTER TABLE staff ADD COLUMN leave_to DATE;
```

---

## 5. API 설계 (신규 엔드포인트)

### 조회
- `GET /api/tasks/mine?staffId={id}&status={...}` — 본인 업무
- `GET /api/tasks/received?staffId={id}` — 받은 요청 (수락 대기)
- `GET /api/tasks/pending-approval` — 관리자: 완료 승인 대기
- `GET /api/tasks/overdue` — 관리자: 연체 리스트
- `GET /api/tasks/all?project={...}&assignee={...}` — 관리자: 전사 조회

### 등록/배정
- `POST /api/tasks` — 업무 등록 (assignee 지정 시 하달, 자기 자신이면 개인업무)
- `POST /api/tasks/{id}/delegate` — 동료에게 요청 (requestee_id 지정)
- `POST /api/tasks/{id}/accept` — 수락 (자동 assignee 변경)
- `POST /api/tasks/{id}/reject` — 거절 (사유 필수)

### 상태 전이
- `POST /api/tasks/{id}/start` — pending → in_progress
- `POST /api/tasks/{id}/request-completion` — in_progress → completion_request (증빙 첨부)
- `POST /api/tasks/{id}/approve-completion` — completion_request → completed (관리자)
- `POST /api/tasks/{id}/reject-completion` — 반려 (사유 + in_progress 복귀)

### 설정
- `PUT /api/staff/{id}/notification-preference` — 개인 푸시 시간
- `PUT /api/staff/{id}/leave-status` — 휴가/부재 설정 (관리자)

---

## 6. 텔레그램 봇 UI

### 모든 직원 공통 명령어 (tier 확장)
```
/내업무          → 오늘 할 일 리스트 (각 태스크에 ✅ 시작 / 완료요청 버튼)
/받은요청        → 대기 중인 동료 요청 (수락/거절)
/보낸요청        → 내가 보낸 요청 상태
/새업무          → 새 업무 등록 (자연어 입력)
/알림시간 HH:MM  → 푸시 시간 개인화
```

### 관리자 추가 (admin_full/admin_cmd_only)
```
/승인대기        → 완료 승인 대기 리스트
/연체업무        → 연체된 업무 리스트
/직원업무 {이름} → 특정 직원 업무 조회
/전사현황        → 전직원 업무 요약
```

### 메시지 예시
```
📋 오늘 할 일 (장지호님)
━━━━━━━━━━━━━━━━
🔴 쿠팡 로켓 776 SKU 검수 (D-1)
   [✅ 시작]  [📝 완료요청]  [↩️ 위임]

🟡 노무사 메일 발송 (D-day)
   [✅ 시작]  [📝 완료요청]

🟢 SNS 콘텐츠 기획 (D+3)
   [✅ 시작]  [📝 완료요청]
```

---

## 7. 미니앱 UI 확장

기존 `mini.pressco21.com`에 탭/섹션 추가:
- 🔔 받은 요청 (뱃지 카운트)
- ✅ 완료 승인 대기 (관리자)
- 📊 주간 리포트 (Phase 6)
- ⚙️ 개인 설정 (푸시 시간)

기존 기능 유지:
- 월간 캘린더, 주간 타임라인, 프로젝트별 필터
- 파일 첨부, 체크리스트, 코멘트

---

## 8. Phase 분할 (점진적 개발 로드맵)

### Phase 1 — MVP 핵심 (1주)
**목표: 최소 기능으로 실사용 시작**
- DB 스키마 확장 (status, assigned_by, completion_*)
- API: `GET /mine`, `POST /start`, `POST /request-completion`, `POST /approve-completion`
- 텔레그램: `/내업무` 모든 tier 활성화, ✅ 시작/완료요청 버튼
- 매일 08:00 자동 푸시 (개인 시간 설정 전 고정)
- **검증**: 대표가 3개 업무 등록 → 이재혁이 /내업무로 확인 → 완료요청 → 대표 승인

### Phase 2 — 협업 & 증빙 (1주)
**목표: 직원 상호 요청 + 재택근무자 증빙**
- DB: `task_delegations` 신규 테이블
- API: `/delegate`, `/accept`, `/reject`
- 텔레그램: `/받은요청`, `/보낸요청`, 수락/거절 Inline 버튼
- 재택근무자 완료요청 시 파일 첨부 필수 + `hr_work_logs` 자동 INSERT
- **검증**: 장다경이 촬영 완료 사진 첨부 → `hr_work_logs` + `tasks` 동시 저장 확인

### Phase 3 — 리마인더 고도화 (3-4일)
**목표: 자동 리마인더 단계화 + 연체 경보**
- DB: `task_reminders` 신규 테이블
- WF [F13]: D-3/D-1/D-day 자동 알림 (매일 08:00)
- WF [F14]: 연체 경보 (매일 09:00, 2일 이상 연체 시 관리자 자동 알림)
- 우선순위 자동 승격 (cron 매시간)
- **검증**: 테스트 업무 D-3 설정 → 3일 전부터 알림 3회 수신

### Phase 4 — 개인화 & 부재 연동 (3-4일)
**목표: 알림 피로도 관리 + 장기 부재자 대응**
- DB: `staff.preferred_notification_time`, `leave_status`, `leave_from`, `leave_to`
- API: `PUT /staff/{id}/notification-preference`, `/leave-status`
- 텔레그램: `/알림시간` 명령어
- 미니앱: 부재 중인 직원은 배정 버튼 회색 처리 + 경고
- **검증**: 송미 `maternity` 설정 → UI에서 배정 차단, 장지호 알림 7시로 변경 → 다음날 07:00 푸시

### Phase 5 — 자동화 (1주)
**목표: 반복 업무 + 완료 자동승인**
- DB: `tasks.is_recurring`, `recurrence_rule`, `scope`
- WF [F15]: 반복 업무 자동 생성 (cron daily 00:00)
- API: 완료 자동승인 규칙 (scope='personal' + priority='low' → 승인 생략)
- 미니앱: 반복 업무 등록 UI (매주 월요일 재고체크 등)
- **검증**: "매주 월 재고체크" 반복 등록 → 매주 월요일 00:00 자동 생성

### Phase 6 — 리포트 & 대시보드 (1주)
**목표: 전사 가시성 + HR 평가 근거**
- WF [F16]: 주간 리포트 생성 (매주 금 18:00)
- 미니앱: 개인 대시보드 (이번 주 완료율, 연체, 받은 요청)
- 미니앱: 관리자 대시보드 (직원별 완료율, 프로젝트별 진척)
- API: `GET /tasks/report/weekly?staffId={id}`, `/report/company`
- **검증**: 월요일 회의 때 주간 리포트로 현황 공유

### 총 예상 일정
- **총 5-6주 (실제 AI 바이브 코딩 시 3-4주 가능)**
- Phase별 배포 → 실사용 피드백 → 다음 Phase

---

## 9. 검증 기준 (Phase별 Acceptance)

### Phase 1 Acceptance
- [ ] 모든 직원이 `/내업무` 실행 시 오늘 업무 리스트 정상 수신
- [ ] 완료 요청 → 관리자 승인 → 상태 변경 라운드트립
- [ ] 매일 08:00 자동 푸시 수신 (당일 업무 있을 때만)

### Phase 2 Acceptance
- [ ] 직원 A가 직원 B에게 요청 → B 수락/거절 작동
- [ ] 거절 시 사유 + A에게 자동 알림
- [ ] 장다경 완료요청 시 파일 첨부 없으면 차단
- [ ] 첨부 시 `hr_work_logs`에도 자동 저장 확인

### Phase 3 Acceptance
- [ ] D-3/D-1/D-day 리마인더 3단계 발송 확인
- [ ] 연체 2일 → 관리자에게 자동 알림
- [ ] D-1 업무 자동 high 승격

### Phase 4 Acceptance
- [ ] 개인 알림 시간 변경 후 다음날 반영
- [ ] 휴가 중 직원 배정 차단 UI 확인

### Phase 5 Acceptance
- [ ] 반복 업무 자동 생성 확인 (매주 월요일)
- [ ] 자동 승인 규칙 작동 (low + personal)

### Phase 6 Acceptance
- [ ] 주간 리포트 금 18:00 자동 발송
- [ ] 대시보드 주간 완료율 일치

---

## 10. 리스크 & 의존성

### 기술 리스크
| 리스크 | 대응 |
|-------|------|
| 텔레그램 Inline 버튼 스팸 느낌 | 성공 메시지만 버튼, 에러/상태 변경은 텍스트 |
| 리마인더 중복 발송 | `task_reminders` 테이블에 dedupe |
| 증빙 파일 저장 용량 | MinIO 라이프사이클 적용 (30GB 초과 시 아카이브) |
| 전직원 요청 권한 남용 | Phase 2에서 일일 요청 횟수 제한 (예: 하루 5건) |

### 조직 리스크
| 리스크 | 대응 |
|-------|------|
| 직원들이 기존 습관(카톡)을 안 바꿈 | Phase 1 출시 후 1주간 카톡·텔레그램 병행, 이후 카톡 업무 지시 금지 선언 |
| 완료 승인 병목 (대표/원장님 부재 시) | Phase 5 자동 승인 규칙 조기 도입 검토 |
| 재택근무자 증빙 부담 | Phase 2에서 "간단 증빙" UX (텍스트 요약 + 스크린샷 1장이면 OK) |

### 의존성
- Flora 미니앱 v3 업무 보드 (기존)
- Flora staff DB (tier 시스템)
- MinIO 파일 저장 (장다경 촬영 파일)
- HR-001 WF (명령어 라우팅, TG-ROUTER)
- `hr_work_logs` 테이블 (재택근무자 업무보고)

---

## 11. 법적 고려 (장다경·재택근무자)

### 재량근로 §58③ 연동
- 재택근무자의 **업무 완료 기록 = 업무보고 대체** (근기법 58조 전제)
- `hr_work_logs`에 자동 INSERT → **3년 보관** (근기법 §42)
- 증빙 파일은 MinIO 장기 보관 (근로자성 입증 분쟁 시 제출 가능)

### 관리감독자 조항 회피
- 이 시스템은 **업무 관리 도구이지 근로시간 감독 아님**
- 재택근무자 완료 시간 = 업무보고 시간 (시간 계산 금지 원칙 준수)
- 출퇴근 버튼과 분리된 독립 시스템

---

## 12. 참고 문서

- 현재 미니앱 v3: `MEMORY.md` → `hr-miniapp-prd.md` "미니앱 비전" 섹션
- HR-001 WF: `pressco21/n8n-automation/workflows/hr/WF-HR-001_clock-inout.json`
- Flora 업무 API: `pressco21/flora-todo-mvp/app/api/tasks/` (기존)
- 재량근로 근거: `docs/노무/04-재량근로시간제_서면합의서_초안.docx`

---

## 13. 다음 단계

### 즉시 (이번 주)
1. **이 PRD 대표 최종 리뷰**
2. **쌓여있는 정리안된 세팅 체계화** (대표 요청, 이 PRD 착수 전)
   - 미니앱 v3 현재 상태 점검
   - 기존 tasks 테이블 스키마 정리
   - HR 관련 문서 재정리

### Phase 1 착수 조건
- 정리 작업 완료
- 노무사 답변 수령 (법적 프레임워크 확정)
- 송미 출산휴가 지원금 신청 완료

### 실제 개발 시작
- 정리 + 법적 확정 이후
- Phase 1 = 1주 (5영업일)
- 각 Phase 종료마다 대표 실사용 피드백 → 다음 Phase 조정
