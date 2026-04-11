# PRD: PRESSCO21 HR 근태관리 미니앱

> **버전**: v1.2 (최종 확정)
> **작성일**: 2026-04-11
> **작성자**: CTO팀 (팀미팅 종합)
> **분야**: HRM (Human Resource Management) / 근태관리 시스템
> **검증**: CTO + COO + 법률자문관 3자 합의 + 실제 서류(HWP) 기반 korean-law MCP 법조문 대조
> **확정**: 2026-04-11 대표 승인

---

## 0. 한줄 요약

텔레그램 봇 + 미니앱으로 **전직원 근태 기록을 자동화**하여, (1) 장다경 근로자성 입증 증거를 체계적으로 생성하고, (2) PRESSCO21의 지속적 인사관리 기반을 구축한다.

---

## 1. 배경 및 동기

### 1-1. 직접 동기: 장다경 근로자성 입증

- 장다경(팀장, 디자인기획팀)은 대표 이진선의 직계가족(비동거 친족)
- 고용노동부에 고용보험 피보험자격 인정을 위한 자료 제출 필요
- **자료5: "정기적 출근 입증 자료(출근부/근태기록)"** 미비 상태
- **자료7: "휴가대장 + 출장부"** 미비 상태

### 1-2. 장기 동기: 전사 인사관리 체계화

- 7~8명 규모지만 출퇴근/휴가/업무일지 관리 시스템 전무
- 모든 인사관리가 구두 또는 카톡 대화로만 진행
- 소규모 사업장이지만 근기법상 서류 보관 의무 존재 (제42조, 3년)

### 1-3. 판례 교훈

| 판례 | 패소 원인 | 이 시스템이 해결하는 것 |
|------|----------|---------------------|
| 수원지법 2020구합795 | 급여 불일치, 출퇴근 증명 부족 | 서버 타임스탬프 근태 기록 |
| 서울행법 2021구합88951 | 사후작성 의심, 출퇴근 불일치 | append-only + 감사로그 |
| 대법원 2024두32973 | (인정 사례) 고정급+원천징수 | 추가 증거로 근태기록 보강 |

---

## 2. 범위 (Scope)

### In-Scope

| 모듈 | 설명 | 우선순위 |
|------|------|---------|
| **M1. 출퇴근 기록** | 텔레그램 /출근 /퇴근 → 서버 타임스탬프 저장 | P0 (48시간) |
| **M2. 업무일지** | 퇴근 시 대화형 수집 + 미니앱 작성 | P1 (1주) |
| **M3. 휴가/연차** | 신청→승인 + 연차 자동계산 + 촉진 자동화 | P1 (1주) |
| **M4. 출장/외근** | 외근 등록 + 장소 기록 | P2 (2주) |
| **M5. 월간 리포트** | 자동 PDF 생성 + 텔레그램 발송 | P2 (2주) |
| **M6. 미니앱 HR 탭** | 근태 대시보드/조회/관리 UI | P1 (1~2주) |
| **M7. 근로자 명부** | 법정 기재사항 관리 (근기법 제41조) | P0 (Phase 1과 동시) |
| **M8. 임금명세서 자동 교부** | 매월 자동 생성 + 텔레그램 발송 (근기법 제48조②) | P2 (2주) |
| **M9. 교육훈련 기록** | 이수 기록 + 수료증 보관 + 안전보건교육 관리 | P2 (2주) |
| **M10. 개인정보 동의** | HR 시스템 최초 접속 시 동의 게이트 | P0 (Phase 1과 동시) |

### Out-of-Scope (이번 PRD 범위 밖)

- 인사고과 / 성과평가
- 채용 관리
- 급여 계산 자동화 (급여 기준 등록 + 명세서 생성만, 급여 산정 로직은 세무사 영역)

---

## 3. 핵심 설계 원칙

### 3-1. 법적 증거력 우선 (법률자문 합의)

| 원칙 | 구현 | 근거 |
|------|------|------|
| **서버 타임스탬프** | 모든 기록은 서버 UTC 시각 기준 | 전자문서법 제5조 |
| **Append-Only** | 출퇴근 기록은 INSERT만, UPDATE/DELETE 금지 | 위변조 방지 |
| **감사 로그** | 모든 변경에 before/after 스냅샷 보관 | 무결성 입증 |
| **3년 자동 보관** | 근기법 제42조 보관 의무 충족 | 시행령 제22조 |
| **전직원 동시 도입** | 장다경만이 아닌 전원이 동일 시스템 사용 | 2020구합795 판례 교훈 |

### 3-2. 간주근로시간제 충돌 방지 (법률자문 핵심 발견)

> **[CRITICAL]** 근기법 제58조 간주근로시간제 = "근로시간 산정이 곤란한 경우"를 전제.
> 출퇴근을 정밀 기록하면서 간주근로시간제를 적용하면 **논리적 모순** 발생.

**해결책: 라벨 분리**

| 직원 유형 | 시스템 라벨 | 저장 항목 | 금지 항목 |
|----------|-----------|----------|----------|
| 일반 직원 (이재혁, 서향자 등) | "출근" / "퇴근" | 시각, 장소, 근무시간 자동 계산 | - |
| 간주근로 대상 (장다경) | **"업무 시작 보고"** / **"업무 종료 보고"** | 보고 시각, 장소, 업무 내용 | **총 근로시간 계산 금지** |
| 재택 혼합 (장지호) | "출근" / "퇴근" | 시각, 장소(재택/사업장), 근무시간 | - |

장다경에게는 "소정근로시간(8시간)을 근로한 것으로 간주합니다" 메시지를 표시한다.

### 3-3. 최소 마찰 도입 (COO 합의)

- 텔레그램 명령어 2개(`/출근`, `/퇴근`)로 시작 — 추가 앱 설치 없음
- 미기록 시 09:30 자동 리마인더
- 퇴근 시 업무일지를 대화형으로 30초 내 작성 가능하게

---

## 4. 아키텍처

### 4-1. 시스템 구성도

```
┌──────────────────┐     ┌─────────────────────────────┐
│  텔레그램 직원    │     │  미니앱 (mini.pressco21.com) │
│  /출근  /퇴근     │     │  /hr 라우트 그룹            │
└──────┬───────────┘     └──────────┬──────────────────┘
       │                            │
       ▼                            ▼
┌──────────────────┐     ┌─────────────────────────────┐
│  n8n WF          │     │  Nginx reverse proxy        │
│  (본진 서버)     │────▶│  (플로라 서버)               │
│  Telegram Trigger│     └──────────┬──────────────────┘
└──────────────────┘                │
                                    ▼
                         ┌─────────────────────────────┐
                         │  flora-todo-mvp              │
                         │  Next.js API Routes          │
                         │  /api/hr/* 엔드포인트        │
                         │  Drizzle ORM                 │
                         └──────────┬──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────────┐
                         │  PostgreSQL (flora)          │
                         │  hr_attendance               │
                         │  hr_work_logs                │
                         │  hr_leave_records            │
                         │  hr_trips                    │
                         │  hr_audit_log                │
                         └──────────┬──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────────┐
                         │  금고 서버 (매일 04:00 백업) │
                         └─────────────────────────────┘
```

### 4-2. 기술 결정 (CTO 합의)

| 항목 | 결정 | 이유 |
|------|------|------|
| 백엔드 | flora-todo-mvp 확장 | 인증/DB/인프라 재사용, 별도 서비스 불필요 |
| DB | flora Postgres, `hr_` 접두사 | staff 테이블 조인, Drizzle 타입 안전성 |
| 봇 Phase 1 | n8n WF + @Pressco21_bot | Flora 봇 코드 미수정, 48시간 배포 가능 |
| PDF 생성 | flora 백엔드 pdfkit | n8n 샌드박스 제약 회피, 디버깅 용이 |
| 프론트 | mini-app-v2 `/hr` 라우트 | 단일 앱, 직원 동선 통합 |
| NocoDB | 미사용 | HR 데이터는 민감, API 기반 접근만 허용 |

---

## 5. DB 스키마

### 5-1. hr_attendance (출퇴근/업무보고 기록)

> Append-only: INSERT만 허용, UPDATE/DELETE API 없음

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | staff.id FK |
| `staff_name` | text NOT NULL | 비정규화 (리포트 편의) |
| `type` | text NOT NULL | `'clock_in'` \| `'clock_out'` |
| `work_mode` | text NOT NULL | `'office'` \| `'remote'` \| `'field'` |
| `is_deemed_hours` | boolean DEFAULT false | 간주근로시간제 대상 여부 |
| `recorded_at` | timestamptz NOT NULL DEFAULT now() | **서버 타임스탬프 (증거력 핵심)** |
| `client_time` | text | 클라이언트 보낸 시각 (참고용) |
| `source` | text DEFAULT 'telegram' | `'telegram'` \| `'miniapp'` |
| `telegram_msg_id` | text | 추적용 |
| `location_detail` | text | 외근 시 상세 장소 |
| `note` | text | 비고 |
| `corrected_by` | text | 정정 시 새 레코드 ID 참조 |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**인덱스**: `(staff_id, recorded_at)`, `(type, recorded_at)`

### 5-2. hr_work_logs (업무일지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | |
| `staff_name` | text NOT NULL | |
| `work_date` | text NOT NULL | 'YYYY-MM-DD' |
| `content` | text NOT NULL | 업무 내용 (마크다운) |
| `work_type` | text | `'filming'` \| `'editing'` \| `'upload'` \| `'general'` |
| `external_ref` | text | 유튜브 URL 등 (교차 검증용) |
| `source` | text DEFAULT 'miniapp' | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-3. hr_leave_records (휴가/연차)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | |
| `staff_name` | text NOT NULL | |
| `leave_type` | text NOT NULL | `'annual'` \| `'half_am'` \| `'half_pm'` \| `'sick'` \| `'special'` |
| `start_date` | text NOT NULL | 'YYYY-MM-DD' |
| `end_date` | text NOT NULL | 'YYYY-MM-DD' |
| `days` | text NOT NULL | '1.0', '0.5' 등 |
| `reason` | text | |
| `status` | text DEFAULT 'pending' | `'pending'` \| `'approved'` \| `'rejected'` |
| `approved_by` | text | |
| `approved_at` | timestamptz | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-4. hr_trips (출장/외근)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | |
| `staff_name` | text NOT NULL | |
| `trip_type` | text NOT NULL | `'business_trip'` \| `'field_work'` |
| `destination` | text NOT NULL | |
| `purpose` | text NOT NULL | |
| `start_date` | text NOT NULL | |
| `end_date` | text NOT NULL | |
| `status` | text DEFAULT 'pending' | |
| `approved_by` | text | |
| `approved_at` | timestamptz | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-5. hr_audit_log (감사 로그)

> DELETE API 미제공 — 코드 레벨에서 원천 차단

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `target_table` | text NOT NULL | 'hr_attendance' 등 |
| `target_id` | text NOT NULL | 대상 레코드 ID |
| `action` | text NOT NULL | `'create'` \| `'update'` \| `'correct'` |
| `actor_id` | text NOT NULL | 누가 |
| `actor_name` | text NOT NULL | |
| `before_data` | jsonb | 변경 전 |
| `after_data` | jsonb | 변경 후 |
| `reason` | text | 수정 사유 |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-6. hr_employee_registry (근로자 명부, M7)

> 근기법 제41조 + 시행령 제20조 법정 기재사항

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | staff.id FK |
| `full_name` | text NOT NULL | 성명 |
| `gender` | text | 성별 |
| `birth_date` | text | 생년월일 |
| `address` | text | 주소 |
| `career_history` | jsonb | 이력 |
| `job_title` | text | 직위 |
| `department` | text | 부서 |
| `job_description` | text | 종사 업무 |
| `hire_date` | text NOT NULL | 고용일 |
| `contract_type` | text | `'permanent'` \| `'fixed'` \| `'part_time'` \| `'contract'` |
| `work_type` | text | `'standard'` \| `'deemed_hours'` \| `'inclusive_wage'` |
| `separation_date` | text | 퇴직일 |
| `separation_reason` | text | 퇴직 사유 |
| `status` | text DEFAULT 'active' | `'active'` \| `'separated'` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-7. hr_payslip (임금명세서, M8)

> 근기법 제48조② + 시행령 제27조의2 법정 기재사항

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | |
| `staff_name` | text NOT NULL | |
| `pay_period` | text NOT NULL | '2026-04' |
| `pay_date` | text NOT NULL | 지급일 |
| `base_salary` | integer | 기본급 |
| `meal_allowance` | integer | 식대 |
| `overtime_pay` | integer | 연장근로수당 (포괄임금 고정분 포함) |
| `bonus` | integer | 상여 |
| `gross_total` | integer NOT NULL | 지급 총액 |
| `deductions` | jsonb | {국민연금, 건강보험, 장기요양, 고용보험, 소득세, 지방소득세} |
| `deductions_total` | integer NOT NULL | 공제 총액 |
| `net_pay` | integer NOT NULL | 실수령액 |
| `calculation_note` | text | 계산방법 (출근일수 등) |
| `delivered_at` | timestamptz | 교부 일시 |
| `delivery_method` | text | `'telegram'` \| `'email'` |
| `pdf_url` | text | MinIO PDF URL |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

### 5-8. hr_training_records (교육훈련 기록, M9)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text PK | nanoid |
| `staff_id` | text NOT NULL | |
| `staff_name` | text NOT NULL | |
| `training_type` | text NOT NULL | `'safety'` \| `'job_skill'` \| `'harassment'` \| `'external'` |
| `title` | text NOT NULL | 교육명 |
| `provider` | text | 교육기관 |
| `start_date` | text NOT NULL | |
| `end_date` | text NOT NULL | |
| `hours` | real NOT NULL | 이수 시간 |
| `certificate_url` | text | 수료증 이미지 (MinIO) |
| `note` | text | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

---

## 6. API 엔드포인트

### flora-todo-mvp `app/api/hr/` 네임스페이스

| 메서드 | 경로 | 용도 | 인증 |
|--------|------|------|------|
| POST | `/api/hr/attendance` | 출퇴근/업무보고 기록 | 봇 WF, 미니앱 |
| GET | `/api/hr/attendance?staffId=&month=` | 출퇴근 조회 | 미니앱 |
| GET | `/api/hr/attendance/today` | 오늘 상태 | 미니앱 홈 |
| POST | `/api/hr/work-logs` | 업무일지 작성 | 미니앱, 봇 |
| GET | `/api/hr/work-logs?staffId=&month=` | 업무일지 조회 | 미니앱 |
| POST | `/api/hr/leave` | 휴가 신청 | 미니앱 |
| PATCH | `/api/hr/leave/:id` | 휴가 승인/반려 | 관리자 |
| GET | `/api/hr/leave?staffId=&year=` | 휴가 내역 | 미니앱 |
| GET | `/api/hr/leave/balance?staffId=` | 잔여 연차 | 미니앱 |
| POST | `/api/hr/trips` | 출장/외근 등록 | 미니앱 |
| GET | `/api/hr/report/monthly?month=` | 월간 리포트 JSON | n8n, 미니앱 |
| GET | `/api/hr/report/monthly/pdf?month=` | 월간 PDF | 미니앱 |
| GET | `/api/hr/audit?targetId=` | 감사 로그 | 관리자 |
| POST | `/api/hr/attendance/correct` | 출퇴근 정정 (관리자) | 대표만 |

**인증**: 기존 `x-flora-automation-key` + `x-telegram-init-data` 이중 인증 재사용.
**권한**: 일반 직원은 본인 기록만, 관리자(대표/지호)는 전체 조회+정정+승인.

---

## 7. 텔레그램 봇 명령어

### 7-1. 출퇴근 플로우 (n8n WF, @Pressco21_bot)

```
[직원] /출근
  ↓
[봇] 인라인 버튼: [사업장] [재택] [외근/촬영]
  ↓
[직원] 버튼 클릭
  ↓
[n8n] → POST /api/hr/attendance { type: 'clock_in', workMode: '...', staffId: '...' }
  ↓
[봇] "OO님, 업무 시작 보고 완료 (09:02, 사업장)"
      ※ 간주근로 대상: "소정근로시간(8시간)을 근로한 것으로 간주합니다"
```

```
[직원] /퇴근
  ↓
[봇] "오늘 주요 업무를 간단히 적어주세요 (선택)"
  ↓
[직원] "택배 42건 출고, 반품 3건" (또는 /skip)
  ↓
[n8n] → POST /api/hr/attendance { type: 'clock_out', ... }
       → POST /api/hr/work-logs { content: '...', workDate: '...' }
  ↓
[봇] "OO님, 업무 종료 보고 완료 (18:30)"
      ※ 일반 직원: "근무시간: 9시간 28분"
      ※ 간주근로 대상: 근무시간 표시 안 함
```

### 7-2. 기타 명령어

| 명령어 | 기능 | Phase |
|--------|------|-------|
| `/출근` | 업무 시작 보고 | Phase 1 |
| `/퇴근` | 업무 종료 보고 + 업무일지 | Phase 1 |
| `/근태` | 이번주 내 기록 요약 | Phase 2 |
| `/휴가신청` | 연차/반차/병가 신청 | Phase 2 |
| `/내연차` | 잔여 연차 조회 | Phase 2 |
| `/근태현황` | 전직원 이번달 요약 (관리자) | Phase 3 |

### 7-3. 자동 알림

| 트리거 | 대상 | 내용 |
|--------|------|------|
| 매일 09:30 | 미기록 직원 | "출근 기록을 남겨주세요" |
| 휴가 신청 시 | 대표 | "[이름]님이 연차를 신청했습니다" + [승인][반려] 버튼 |
| 승인/반려 시 | 신청자 | "연차가 승인/반려되었습니다" |
| 매월 1일 09:00 | 대표 | "지난달 근태 리포트 생성 완료" + PDF 첨부 |

---

## 8. 미니앱 UI 설계

### 8-1. 라우트 추가

```typescript
// App.tsx에 추가
<Route path="/hr" element={<HrDashboardPage />} />
<Route path="/hr/attendance" element={<HrAttendancePage />} />
<Route path="/hr/work-logs" element={<HrWorkLogsPage />} />
<Route path="/hr/work-logs/new" element={<HrWorkLogCreatePage />} />
<Route path="/hr/leave" element={<HrLeavePage />} />
<Route path="/hr/leave/new" element={<HrLeaveCreatePage />} />
<Route path="/hr/trips" element={<HrTripsPage />} />
<Route path="/hr/report" element={<HrReportPage />} />
```

### 8-2. 네비게이션 구조 변경

현재(메뉴 카드 그리드) → 하단 5탭 바 도입:

```
[홈]  [업무]  [HR]  [캘린더]  [더보기]
                              ├── 출고
                              ├── OMX
                              └── 설정
```

### 8-3. 파일 구조

```
src/
  pages/hr/
    HrDashboardPage.tsx      -- 오늘 출퇴근 상태 + 이번주 요약
    HrAttendancePage.tsx     -- 월별 출퇴근 목록 (캘린더 그리드)
    HrWorkLogsPage.tsx       -- 업무일지 목록
    HrWorkLogCreatePage.tsx  -- 업무일지 작성 폼
    HrLeavePage.tsx          -- 휴가 내역 + 잔여 연차
    HrLeaveCreatePage.tsx    -- 휴가 신청 폼
    HrTripsPage.tsx          -- 출장/외근 목록
    HrReportPage.tsx         -- 월간 리포트 조회/다운로드
  lib/
    hrApi.ts                 -- HR API 클라이언트
    hrTypes.ts               -- HR 타입 정의
  components/hr/
    AttendanceCard.tsx       -- 출퇴근 상태 카드
    AttendanceCalendar.tsx   -- 월간 출퇴근 캘린더
    WorkLogForm.tsx          -- 업무일지 폼
    LeaveForm.tsx            -- 휴가 신청 폼
    LeaveApprovalCard.tsx    -- 관리자 휴가 승인 카드
```

### 8-4. HR 대시보드 화면 구성

```
┌─────────────────────────────┐
│  오늘의 근태                 │
│  ┌──────────┬──────────┐    │
│  │ 업무 시작 │ 업무 종료 │    │
│  │  09:02   │  --:--   │    │
│  │ [사업장]  │ [기록하기]│    │
│  └──────────┴──────────┘    │
├─────────────────────────────┤
│  이번주 요약                 │
│  월: ✅ 재택  화: ✅ 재택    │
│  수: ✅ 재택  목: ✅ 사업장  │
│  금: ⏳ 오늘                 │
├─────────────────────────────┤
│  잔여 연차: 8.5일            │
├─────────────────────────────┤
│  빠른 메뉴                   │
│  [업무일지] [휴가신청] [리포트]│
└─────────────────────────────┘
```

---

## 9. 장다경 영상 업무 특화 설계

장다경은 영상 콘텐츠 유일 담당자이므로 업무일지에 영상 특화 항목을 포함한다.

### 업무일지 템플릿 (work_type별)

**촬영일 (filming)**:
```
- 촬영 장소: 사무실 / [외부 장소]
- 촬영 시간대: 오전 / 오후 / 종일
- 촬영 내용: [자유 기술]
- 사용 장비: 회사 카메라(Sony A7 IV)
```

**편집일 (editing)**:
```
- 편집 영상: [제목 또는 설명]
- 작업 내용: 컷편집 / 자막 / 색보정 / 썸네일 / 기타
- 진행률: [대략적 %]
```

**업로드 완료 시 (upload)**:
```
- 영상 제목: [제목]
- 업로드 URL: [유튜브 링크] ← 교차 검증 핵심
- 업로드 일시: [자동 기록]
```

업로드 URL을 기록하면 유튜브 서버의 독립적 타임스탬프와 교차 검증이 가능하여 증거력이 강화된다.

---

## 10. PDF 월간 리포트 설계

### 10-1. 생성 방식

- **생성 주체**: flora-todo-mvp 백엔드 (pdfkit + NotoSansKR 폰트)
- **트리거**: (1) 미니앱 "리포트 다운로드" 버튼, (2) n8n WF 매월 1일 자동 생성
- **아카이브**: MinIO에 자동 저장 + 금고 백업

### 10-2. 리포트 양식

```
┌─────────────────────────────────────────┐
│         PRESSCO21 월간 근태 보고서        │
│                                         │
│  회사명: PRESSCO21 (215-05-52221)       │
│  보고 대상 기간: 2026년 04월 01일~30일   │
│  대상: 전 직원                           │
├─────────────────────────────────────────┤
│                                         │
│  [직원별 출퇴근 요약표]                  │
│  이름 | 출근일수 | 재택일수 | 외근 | 휴가 │
│  ─────┼─────────┼─────────┼──────┼───── │
│  장다경│    4    │   16    │  2   │  0  │
│  ...  │   ...   │  ...    │ ...  │ ... │
│                                         │
│  [일별 상세 (직원별)]                    │
│  날짜  | 시작보고 | 종료보고 | 장소 | 비고│
│  04.01 │  09:02  │  18:15  │ 재택 │     │
│  ...   │  ...    │  ...    │ ...  │ ... │
│                                         │
│  ※ 간주근로시간제 대상자는 소정근로시간  │
│    (8시간)을 근로한 것으로 간주           │
│                                         │
├─────────────────────────────────────────┤
│  본 보고서는 PRESSCO21 HR 시스템에 의해  │
│  자동 생성되었습니다.                    │
│  생성 일시: 2026-05-01 09:00:00 (KST)  │
│  데이터 무결성 해시: [SHA-256]           │
│                                         │
│  확인자: 대표이사 이진선                  │
│  확인일: ____________                    │
└─────────────────────────────────────────┘
```

### 10-3. 3종 일자 구분 (법률자문 필수 요건)

| 일자 유형 | 표기 예시 | 의미 |
|----------|----------|------|
| 데이터 기간 | "보고 대상 기간: 2026년 4월" | 보고서가 다루는 기간 |
| 생성일 | "생성 일시: 2026-05-01 09:00:00" | PDF가 시스템에 의해 생성된 시점 |
| 확인일 | "확인일: 2026-05-03" | 대표가 내용을 확인한 시점 |

---

## 11. 보안 설계

### 11-1. 위변조 방지 (법률자문 + CTO 합의)

| 정책 | 구현 |
|------|------|
| **서버 시각 기준** | `recorded_at = defaultNow()`, 클라이언트 시각은 `client_time`에 참고용 |
| **Append-Only** | hr_attendance에 UPDATE/DELETE API 미제공 |
| **정정 절차** | 관리자만 `/api/hr/attendance/correct` → 새 레코드 INSERT + 기존에 `corrected_by` 참조 + 사유 필수 |
| **감사 로그** | 모든 변경 → hr_audit_log에 before/after jsonb 스냅샷 |
| **감사 로그 삭제 금지** | DELETE API 코드 레벨 원천 차단 |
| **NTP 동기화** | 서버 chrony 상시 운영, NTP 로그 별도 보관 |
| **백업 분리** | 서버 원본 + 금고 매일 04:00 pg_dump (기존 인프라 활용) |

### 11-2. 접근 제어

| 역할 | 할 수 있는 것 | 할 수 없는 것 |
|------|-------------|-------------|
| 일반 직원 | 본인 출퇴근 기록, 본인 업무일지, 본인 휴가 신청/조회 | 타인 기록 조회, 기록 수정/삭제 |
| 관리자 (대표/지호) | 전체 조회, 정정(사유 필수), 휴가 승인, 리포트 | 감사 로그 삭제 |

### 11-3. 소급 기록 방지

- 당일만 출퇴근 기록 가능 (n8n에서 현재 날짜와 비교)
- 과거 날짜 기록 시도 → 거부 + "관리자에게 정정을 요청하세요" 안내

---

## 12. 도입 일정

### Phase 1: 기반 + 텔레그램 봇 (48시간)

**Day 1 오전** — DB + API:
- [ ] Drizzle 스키마: `hr_attendance`, `hr_audit_log`, `hr_employee_registry` (M1+M7)
- [ ] `db:push` 마이그레이션 실행
- [ ] API: `POST /api/hr/attendance`, `GET /api/hr/attendance/today`
- [ ] 근로자 명부 8명분 초기 데이터 입력

**Day 1 오후** — 봇 + 인증:
- [ ] n8n WF (HR-001): Telegram Trigger → Code → HTTP Request → 응답
- [ ] staff 테이블 telegram_user_id 기입 (장다경+장지호 최소)
- [ ] 개인정보 동의 화면 (미니앱 HR 최초 진입 시 게이트) (M10)
- [ ] 테스트: 본인들 /출근 /퇴근

**Day 2** — 보조 WF:
- [ ] n8n WF (HR-002): 미기록 리마인더 (09:30)
- [ ] 퇴근 시 업무일지 대화형 수집 추가
- [ ] 전직원 Chat ID 수집 안내

### Phase 2: 미니앱 HR 탭 + 휴가 + 교육 (1.5주)

- [ ] 나머지 스키마: `hr_work_logs`, `hr_leave_records`, `hr_trips`, `hr_training_records` (M2~M4, M9)
- [ ] API 엔드포인트 전체
- [ ] 미니앱 HR 페이지 구현 (대시보드, 출퇴근, 업무일지, 휴가, 교육, 직원정보)
- [ ] 하단 네비게이션 바 도입: [홈] [업무] [HR] [캘린더] [더보기]
- [ ] 휴가 신청→승인 텔레그램 플로우 (HR-003, HR-004)
- [ ] 연차 자동 계산 (입사일 기준) + 촉진 자동화 준비
- [ ] 교육훈련 기록 CRUD + 수료증 사진 첨부 (MinIO)
- [ ] 소프트 런칭: 대표+지호+이재혁 3명 시범

### Phase 3: 전사 도입 (D-Day)

**D-Day**:
- [ ] 사내 공지문 발송 (텔레그램 그룹 + 서면)
- [ ] 근태관리 시행세칙 공지 (재택수칙 제4조/제5조 구체화)
- [ ] 전 직원 첫 /출근 기록 (공식 도입일)
- [ ] 전 직원 개인정보 동의 완료

### Phase 4: 완성 + 증빙 체계 확립 (D-Day 이후 2주)

- [ ] `hr_payslip` 스키마 + 임금명세서 자동 교부 시스템 (M8)
- [ ] 매월 급여일 자동 생성 → 대표 확인 → 텔레그램 발송
- [ ] 월간 근태 리포트 PDF 자동 생성 (HR-005)
- [ ] 연차 촉진 자동화 WF (만료 6개월 전 1차, 2개월 전 2차)
- [ ] 안전보건교육 일정 수립 + 리마인더
- [ ] 취업규칙 초안 완성 (AI 생성 + 대표 검토)
- [ ] 간주합의서 갱신 리마인더 등록 (2026.09.21 알림)

---

## 13. 공식화 서류 (법률자문 권고)

### 13-1. 사내 시행 공고문 (D-Day 발송)

```
[PRESSCO21 근태관리 시스템 도입 안내]

시행일: 2026년 4월 28일(화)부터
대상: 전 직원
방법: 텔레그램 봇(@Pressco21_bot)에서 /출근, /퇴근 명령어 사용
      + 미니앱(mini.pressco21.com) HR 메뉴 활용
목적: 전사 인사관리 체계화 및 근태 기록 정확성 제고

세부사항:
1. 매일 업무 시작 시 /출근, 종료 시 /퇴근 기록
2. 간주근로시간제 적용 대상은 업무 시작/종료 보고로 운영
3. 휴가는 미니앱을 통해 사전 신청, 대표 승인 후 사용
4. 미기록 시 09:30 자동 리마인더 발송

대표이사 이진선
```

### 13-2. 시스템 도입 사유서

"특정 직원이 아닌 전사적 업무 개선" 목적을 명확히 하는 문서. 고용노동부 제출 시 "증거 만들기" 의심을 차단한다.

### 13-3. 취업규칙 근태관리 조항 (추가)

10인 미만 사업장은 작성/신고 의무 없으나, 자발적으로 작성하면 증거력 상승.

---

## 14. 리스크 및 블로커

| 리스크 | 등급 | 대응 |
|--------|------|------|
| **직원 Chat ID 미수집** | 🔴 CRITICAL | Phase 1 전제조건. 최소 2명(장다경+장지호) 즉시, 나머지 1주 내 |
| **직원 사용 저항** | 🟡 중 | 텔레그램 명령어 2개만, 리마인더, 대표 직접 안내 |
| **간주근로 라벨 혼동** | 🟡 중 | UI/봇 응답에서 명확히 구분, 코드에서 is_deemed_hours 플래그 |
| **pdfkit 한글 폰트** | 🟢 하 | NotoSansKR.ttf Docker 이미지 포함 |
| **플로라 디스크** | 🟢 하 | HR 데이터 = 텍스트 위주, 용량 부담 미미 |

---

## 15. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 시스템 사용률 | 전직원 90%+ 일일 기록 | hr_attendance 일별 카운트 |
| 도입 후 첫 월간 리포트 | 4/28~5/31 전직원 포함 PDF | 리포트 생성 확인 |
| 근로자성 자료 보강 | 자료5(출근부) + 자료7(휴가대장) 확보 | 고용노동부 제출 시 첨부 |
| 업무일지 작성률 | 주 3회+ | hr_work_logs 주간 카운트 |

---

## 부록 A. 직원 유형별 처리 매트릭스 (실제 서류 기반 확정)

> 근거: 실제 근로계약서, 간주근로시간제 합의서, 포괄임금 계약서 HWP 원문 확인

| 직원 | 직위 | 유형 | 계약 형태 | 출퇴근 라벨 | 근무시간 | 업무일지 | 비고 |
|------|------|------|----------|-----------|---------|---------|------|
| 이진선 | 대표 | 대표 | - | 출근/퇴근 | 자동 | 선택 | 관리자 권한 |
| 장다경 | 팀장 | **재택+간주근로** | 간주근로시간제 | **업무보고 접수** | **금지 (8h 간주 고정)** | 영상 특화 | 근로자성 핵심, 월화수금 재택 |
| 송미 | 대리 | **재택+간주근로** | 간주근로시간제 | **업무보고 접수** | **금지 (8h 간주 고정)** | 일반 | 월수금 재택, 디자인 |
| 조승해 | 사원 | **재택+간주근로** | 간주근로시간제 | **업무보고 접수** | **금지 (8h 간주 고정)** | 일반 | 송미 대체인력, 동일 처우, 월화수금 재택 |
| 이재혁 | 과장 | **포괄임금** | 고정연장20h포함 | 출근/퇴근 | 자동 | 일반 | 물류운영 총괄, 근로자대표 |
| 서향자 | 실장 | **포괄임금(촉탁)** | 정년후 재고용 | 출근/퇴근 | 자동 | 일반 | 2026.01~2028.12 |
| 이혜자 | 대리 | **포괄임금** | 고정연장포함 | 출근/퇴근 | 자동 | 일반 | |
| 장지호 | 팀장 | 일반 | 표준 | 출근/퇴근 | 자동 | 일반 | IT관리자 권한 |
| 장준혁 | 부장 | 일반 | 표준 | 출근/퇴근 | 자동 | 일반 | |

---

## 부록 B. n8n 워크플로우 목록 (신규)

| WF 이름 | 트리거 | 설명 |
|---------|--------|------|
| HR-001 | Telegram Trigger `/출근` `/퇴근` | 출퇴근 기록 → flora API → 응답 |
| HR-002 | Cron 매일 09:30 | 미기록 직원 리마인더 |
| HR-003 | Webhook (휴가 신청) | 대표에게 승인 요청 인라인 버튼 |
| HR-004 | Telegram Callback (승인/반려) | 휴가 상태 업데이트 + 신청자 알림 |
| HR-005 | Cron 매월 1일 09:00 | 월간 리포트 생성 + 텔레그램 발송 |

---

---

## 부록 C. 법률 검증 보완사항 (2026-04-11, korean-law MCP 대조)

> 실제 서류(HWP 원문) + 근로기준법/전자문서법 조문 + 판례를 대조한 결과

### C-1. 간주근로시간제 시스템 제약 (CRITICAL)

근기법 제58조 제1항의 전제는 "근로시간을 산정하기 어려운 경우"이다.
HR 시스템이 근로시간을 자동 산정하면 이 전제가 붕괴되어 간주근로시간제 적용 자체가 부인될 수 있다.

**시스템에서 절대 해서는 안 되는 것 (DON'T)**:

| 금지 기능 | 위험 사유 |
|----------|----------|
| 출퇴근 시간 차이로 총 근로시간 자동 산정 | 간주근로 전제 붕괴 |
| "지각/조퇴/결근" 자동 판정 (간주대상) | 근로시간 관리로 해석 |
| GPS/IP 기반 위치 추적 | 과도한 감시 + 개인정보 침해 |
| 실시간 온라인 상태 모니터링 | 지휘감독 인정 → 간주제 부인 |

**시스템에서 반드시 해야 하는 것 (DO)**:

| 기능 | 설계 방법 |
|------|----------|
| 간주 대상자 시간 기록 시 | 라벨: "업무보고 접수시간" (출근시간 아님) |
| 간주 대상자 근무시간 표시 | 항상 **"간주 8시간"** 고정 표시, 실 시간 차이 계산 금지 |
| DB `is_deemed_hours` 플래그 | true일 때 프론트엔드에서 시간 계산 UI 숨김 |

### C-2. 재택근무 수칙 제4조/제5조 구체화 필요

현재 "업무보고는 회사에서 정한다" / "근태관리는 회사에서 정한다"는 포괄위임이다.
HR 시스템 도입 시 **별도 시행세칙 또는 사내공지**로 구체적 방법을 명시해야 한다:

```
[근태관리 시행세칙 (사내공지 포함)]

1. 업무 보고 방법: 텔레그램 봇 /출근, /퇴근 명령어
2. 보고 항목: 업무 시작/종료 사실, 근무 장소(재택/사업장/외근)
3. 업무일지: 퇴근 보고 시 당일 업무 내용 간략 기재
4. 간주근로시간제 대상자: 업무보고 접수만 기록, 근로시간 산정 불가
5. 휴가/연차: 미니앱을 통해 사전 신청, 대표 승인 후 사용
```

### C-3. 간주근로시간제 합의서 갱신 관리

- **유효기간**: 2025.11.21 ~ **2026.11.20** (1년)
- **갱신 알림**: 시스템에서 만료 60일 전(2026.09.21)부터 자동 리마인더
- **보존 의무**: 근기법 시행령 제22조 제1항 제8호 → 합의일로부터 **3년 보존**

### C-4. 퇴직 후 경업금지 조항 위험 (리스크 상)

근로계약서 제8조②: "계약종료 후 1년간 동종업 전직/창업 금지"
- **대가(보상금) 미지급** → 대법원 2009다82244 판례 기준 무효 가능성 높음
- **조치**: 노무사 상담 후 조항 수정 또는 삭제 권고 (HR 시스템과 직접 관련은 없으나 근로계약 전체 리스크)

### C-5. 실제 서류에서 확인된 HR 시스템 법적 근거

| 서류 | 조항 | HR 시스템 근거 |
|------|------|-------------|
| 재택근무 수칙 제4조 | "업무보고는 회사에서 정한다" | 업무일지 수집 근거 |
| 재택근무 수칙 제5조 | "근태관리는 회사에서 정한다" | 출퇴근 보고 시스템 근거 |
| 재택근무 수칙 제8조 | "소정 근로시간에 겸업 금지" | 장다경 프리랜서 허용 확인 |
| 근로계약서 제2조⑤ | 근기법 58조 간주근로 적용 명시 | 간주근로 시스템 분기 근거 |
| 근로계약서 제5조② | "연차휴가는 근기법에 따라 부여" | 휴가 모듈 근거 |
| 간주합의서 제6조 | 유효기간 1년 | 갱신 알림 필요 |
| 전자문서법 제4조/5조 | 전자문서 = 서면 대체 가능 | 전자 기록 법적 효력 |
| 근기법 제42조+시행령 제22조 | 3년 보존 의무 | DB 보존 정책 |

### C-6. 직원 3유형 확정 (실제 계약서 기반)

| 유형 | 대상 | 계약 특징 | HR 시스템 처리 |
|------|------|----------|-------------|
| **재택+간주근로** | 장다경, 송미, 조승해 | 간주근로시간제, 월/화/수/금 재택 (목 출근) | 업무보고 접수, 시간 계산 금지, 8h 간주 |
| **포괄임금** | 이재혁, 서향자, 이혜자 | 고정연장근로수당 포함, 매일 출근 | 출퇴근 시간 기록, 시간 자동 계산 |
| **일반** | 장지호, 장준혁 | 표준 근로계약 | 출퇴근 시간 기록, 시간 자동 계산 |

---

*본 PRD는 CTO + COO + 법률자문관 팀미팅(2026-04-11)을 통해 검증되었으며,*
*실제 서류(HWP 원문) + korean-law MCP 법조문 대조를 통해 보완되었습니다.*
