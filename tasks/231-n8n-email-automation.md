# Task 231: WF-11~12 리마인더 + 후기요청 이메일 자동화

> **Phase**: 2-D
> **담당**: gas-backend-expert
> **상태**: 완료
> **작성일**: 2026-02-25
> **산출물**:
> - `파트너클래스/n8n-workflows/WF-11-send-reminders.json` (17노드)
> - `파트너클래스/n8n-workflows/WF-12-review-requests.json` (15노드)

---

## 개요

매일 스케줄로 실행되는 2개의 n8n 워크플로우를 구현한다.

| 워크플로우 | 스케줄 | 기능 |
|-----------|--------|------|
| WF-11 Send Reminders | 매일 09:00 KST | D-3 / D-1 수업 전 리마인더 이메일 발송 |
| WF-12 Review Requests | 매일 10:00 KST | 수업 후 7일 후기 요청 이메일 발송 |

---

## WF-11 Send Reminders 상세

### 노드 흐름 (17노드)

```
Schedule Daily 09:00
  -> Calculate Target Dates (Code: KST today+3, today+1)
  -> NocoDB Get Reminder Targets (tbl_Settlements: class_date IN [d3, d1], status IN [COMPLETED, PENDING_SETTLEMENT])
  -> Filter and Parse Targets (Code: 중복 발송 필터링, 이메일 유효성)
  -> IF Has Targets
    [true] -> NocoDB Get Class (병렬) + NocoDB Get Partner (병렬)
           -> Build Reminder Emails (Code: D-3/D-1 수강생 + 파트너 이메일 HTML)
           -> Send Student Reminder (emailSend)
           -> IF Partner Has Email
              [true] -> Send Partner Reminder (emailSend)
           -> NocoDB Update Email Sent (PATCH: student_email_sent += ",D3_SENT" or ",D1_SENT")
           -> NocoDB Log Email (POST: tbl_EmailLogs)
           -> Build Summary Message (Code: 결과 집계)
           -> Telegram Summary
    [false] -> Build No Targets Message -> Telegram No Targets
```

### 이메일 종류 (4종)

| 유형 | 수신자 | 제목 | 디자인 |
|------|--------|------|--------|
| D-3 수강생 | 수강생 | [PRESSCO21] {className} 수업까지 3일 남았습니다! | 골드 D-3 배지, 수업 정보, 준비물 체크리스트, 강사 연락처 |
| D-1 수강생 | 수강생 | [PRESSCO21] 내일이 수업날입니다! 준비되셨나요? | 오렌지 D-1 배지, 체크리스트 형식, 오시는 길 안내 |
| D-3 파트너 | 파트너 | [PRESSCO21] 수업 3일 전 알림 - {className} | 일시/인원/수강생(마스킹) |
| D-1 파트너 | 파트너 | [PRESSCO21] 수업 1일 전 알림 - {className} | 일시/인원/수강생(마스킹) |

### 중복 발송 방지

- `student_email_sent` 필드: comma-separated string (`"D3_SENT,D1_SENT,REVIEW_SENT"`)
- NocoDB 조회 시 전체 대상 가져온 후, Code 노드에서 `indexOf('D3_SENT')` / `indexOf('D1_SENT')` 확인
- 발송 후 즉시 PATCH로 상태 업데이트

### NocoDB where 쿼리

```
((class_date,eq,{d3Date})~or(class_date,eq,{d1Date}))~and((status,eq,COMPLETED)~or(status,eq,PENDING_SETTLEMENT))
```

---

## WF-12 Review Requests 상세

### 노드 흐름 (15노드)

```
Schedule Daily 10:00
  -> Calculate Target Date (Code: KST today-7)
  -> NocoDB Get Review Targets (tbl_Settlements: class_date = today-7, status = COMPLETED, student_email_sent nlike %REVIEW_SENT%)
  -> Filter Review Targets (Code: 이중 안전장치 + 이메일 유효성)
  -> IF Has Targets
    [true] -> NocoDB Get Class (병렬) + NocoDB Get Partner (병렬)
           -> Build Review Emails (Code: 수강생 후기 요청 + 파트너 알림)
           -> Send Student Review Request (emailSend)
           -> IF Partner Has Email
              [true] -> Send Partner Review Alert (emailSend)
           -> NocoDB Update Email Sent (PATCH: student_email_sent += ",REVIEW_SENT")
           -> NocoDB Log Email (POST: tbl_EmailLogs)
           -> Build Summary Message
           -> Telegram Summary
    [false] -> Build No Targets Message -> Telegram No Targets
```

### 이메일 종류 (2종)

| 유형 | 수신자 | 제목 | 디자인 |
|------|--------|------|--------|
| 후기 요청 | 수강생 | [PRESSCO21] 수업은 즐거우셨나요? 후기를 남겨주세요 | 골드 별 5개, 1,000원 적립금 인센티브, CTA 버튼 |
| 후기 알림 | 파트너 | [PRESSCO21] 수강생 후기 확인 안내 - {className} | 클래스/수강일 정보, 대시보드 CTA |

### NocoDB where 쿼리

```
(class_date,eq,{targetDate})~and(status,eq,COMPLETED)~and(student_email_sent,nlike,%REVIEW_SENT%)
```

---

## 공통 패턴

### 보안
- XSS 방지: 모든 동적 값 `escapeHtml()` 처리
- 개인정보 마스킹: 파트너 이메일에 수강생 이름 `maskName()` 처리
- 이메일 발송 실패 시: `onError: continueRegularOutput` (데이터 저장에 영향 없음)

### NocoDB 연동
- 인증: `xc-token` HTTP Header Auth (nocodb-token)
- PATCH: `specifyBody: "json"` + `JSON.stringify()` 패턴
- POST (EmailLogs): type, recipient_email, sent_at, settlement_id
- retry: GET 3회, PATCH 2회

### 이메일 발송
- SMTP Credentials: pressco21-smtp
- fromEmail: pressco21@foreverlove.co.kr
- emailType: html
- 이메일 HTML: email-templates.md 디자인 준수 (PRESSCO21 골드 #b89b5e 테마)

### 텔레그램
- 대상 없음: "오늘 발송 대상이 없습니다."
- 완료: "리마인더 발송 완료 / D-3: N건, D-1: M건" 또는 "후기 요청 발송: N건"

---

## tbl_EmailLogs 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| type | SingleLineText | REMINDER_D3, REMINDER_D1, REVIEW_REQUEST |
| recipient_email | Email | 수신자 이메일 |
| sent_at | DateTime | 발송 시각 (ISO 8601) |
| settlement_id | SingleLineText | 연관 정산 ID |

---

## 테스트 체크리스트

### WF-11 Send Reminders

- [ ] Schedule Trigger가 매일 09:00 KST에 실행되는지 확인
- [ ] KST 날짜 계산이 정확한지 확인 (today+3, today+1)
- [ ] tbl_Settlements에서 D-3/D-1 대상을 정확히 조회하는지 확인
- [ ] status가 COMPLETED 또는 PENDING_SETTLEMENT인 건만 대상인지 확인
- [ ] student_email이 없는 건은 스킵되는지 확인
- [ ] student_email_sent에 D3_SENT가 이미 있으면 D-3 리마인더 스킵하는지 확인
- [ ] student_email_sent에 D1_SENT가 이미 있으면 D-1 리마인더 스킵하는지 확인
- [ ] D-3 수강생 이메일: 골드 D-3 배지, 수업 정보, 준비물 표시 확인
- [ ] D-1 수강생 이메일: 오렌지 D-1 배지, 체크리스트, 오시는 길 안내 확인
- [ ] 파트너 이메일: 수강생 이름 마스킹, 인원 표시 확인
- [ ] 파트너 이메일이 없으면 파트너 이메일 스킵하는지 확인
- [ ] NocoDB PATCH로 student_email_sent가 정확히 업데이트되는지 확인
- [ ] tbl_EmailLogs에 발송 이력이 기록되는지 확인
- [ ] 텔레그램으로 D-3 N건 / D-1 M건 요약 발송되는지 확인
- [ ] 대상이 없을 때 텔레그램 "대상 없음" 메시지 발송되는지 확인
- [ ] 이메일 발송 실패 시 워크플로우가 중단되지 않는지 확인 (onError)
- [ ] 이메일 HTML에 XSS 취약점이 없는지 확인 (escapeHtml)

### WF-12 Review Requests

- [ ] Schedule Trigger가 매일 10:00 KST에 실행되는지 확인
- [ ] KST 날짜 계산이 정확한지 확인 (today-7)
- [ ] tbl_Settlements에서 status=COMPLETED, class_date=today-7인 건만 조회하는지 확인
- [ ] student_email_sent에 REVIEW_SENT가 이미 있으면 스킵하는지 확인 (NocoDB nlike + Code 이중 체크)
- [ ] 수강생 후기 요청 이메일: 별점 시각, 1,000원 적립금 인센티브, CTA 버튼 확인
- [ ] 파트너 후기 알림 이메일: 클래스/수강일 정보, 대시보드 CTA 확인
- [ ] NocoDB PATCH로 student_email_sent에 REVIEW_SENT 추가되는지 확인
- [ ] tbl_EmailLogs에 type=REVIEW_REQUEST로 기록되는지 확인
- [ ] 텔레그램으로 발송 건수 요약되는지 확인
- [ ] 대상이 없을 때 텔레그램 "대상 없음" 메시지 발송되는지 확인
- [ ] student_email이 없는 건은 자동 스킵되는지 확인

### 공통

- [ ] 모든 이메일에 PRESSCO21 골드 테마(#b89b5e) 적용 확인
- [ ] 모든 이메일에 "PRESSCO21 드림" 서명, "Forever and ever and Blooming" 슬로건 확인
- [ ] 모든 이메일의 fromEmail이 pressco21@foreverlove.co.kr인지 확인
- [ ] NocoDB Credentials(nocodb-token)가 올바르게 설정되었는지 확인
- [ ] SMTP Credentials(pressco21-smtp)가 올바르게 설정되었는지 확인
- [ ] Telegram Credentials(pressco21-telegram)가 올바르게 설정되었는지 확인
- [ ] 환경 변수: NOCODB_PROJECT_ID, TELEGRAM_CHAT_ID 설정 확인
- [ ] timezone: Asia/Seoul 설정 확인

---

## 의존성

| 항목 | 설명 |
|------|------|
| tbl_Settlements | class_date, status, student_email, student_email_sent, student_name, class_id, partner_code 필드 필요 |
| tbl_Classes | class_id, class_name, location, materials_included 필드 필요 |
| tbl_Partners | partner_code, partner_name, email, phone 필드 필요 |
| tbl_EmailLogs | type, recipient_email, sent_at, settlement_id 필드 필요 |
| WF-04/WF-05 | student_email_sent 필드 초기값 설정 (빈 문자열) |

---

## GAS 대비 개선점

| 항목 | GAS (기존) | n8n (신규) |
|------|-----------|-----------|
| 이메일 한도 | 일 100건 (Gmail) | 일 500건 (SMTP) |
| 이메일 디자인 | 문자열 연결 인라인 HTML | email-templates.md 디자인 완전 이식 |
| 중복 방지 | Sheets 행 단위 업데이트 | NocoDB PATCH + 이중 체크 (nlike + indexOf) |
| 모니터링 | Logger.log (GAS 편집기) | 텔레그램 실시간 알림 + tbl_EmailLogs |
| 에러 복구 | try-catch + logError_ | onError: continueRegularOutput (개별 실패 격리) |
| 실행 제한 | 6분 타임아웃 | n8n 제한 없음 |
| 파트너 이메일 | 조건부 (있을 때만) | IF 분기로 명확한 스킵 |
