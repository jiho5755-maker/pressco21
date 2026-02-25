# GAS 백엔드 전문가 메모리

## 상세 기록 파일
- `n8n-workflows.md` - n8n 워크플로우 Task별 상세 (WF-01~WF-13)

## 현재 진행 상태 (2026-02-25)
- GAS 코드(5,281줄): `파트너클래스/class-platform-gas.gs` (참고용 보존)
- **n8n+NocoDB 전환**: 13개 워크플로우 + ERROR 핸들러 모두 구현 완료
- 완료: WF-01~13 + WF-ERROR (Task 211, 212, 213, 221, 222, 231, 232)

## n8n 워크플로우 요약 (전체 완료)

| WF | 파일 | 노드 | 트리거 | 기능 |
|----|------|------|--------|------|
| 01 | WF-01-class-api.json | 20 | Webhook GET | 클래스 조회/상세/카테고리 |
| 02 | WF-02-partner-auth-api.json | 37 | Webhook GET | 파트너 인증/대시보드/신청상태/교육 |
| 03 | WF-03-partner-data-api.json | 26 | Webhook GET | 예약현황/후기 |
| 04 | WF-04-record-booking.json | 27 | Webhook POST | 예약기록+수수료+정산 |
| 05 | WF-05-order-polling-batch.json | 67 | Schedule x5 | 폴링/정합성/동기화/재시도/D+3 |
| 06 | WF-06-class-management.json | 16 | Webhook POST | 클래스 상태 변경 |
| 07 | WF-07-partner-apply.json | 25 | Webhook POST | 파트너 신청 |
| 08 | WF-08-partner-approve.json | 30 | Webhook POST | 파트너 승인 (관리자) |
| 09 | WF-09-review-reply.json | 18 | Webhook POST | 후기 답변 |
| 10 | WF-10-education-complete.json | 20 | Webhook POST | 교육 이수 완료 |
| 11 | WF-11-send-reminders.json | 17 | Schedule 09:00 | D-3/D-1 리마인더 |
| 12 | WF-12-review-requests.json | 17 | Schedule 10:00 | 후기 요청 (+7일) |
| 13 | WF-13-grade-update.json | - | Schedule 06:00 | 등급 자동 업데이트 |
| ERR | WF-ERROR-handler.json | 4 | Error Trigger | 전역 에러 핸들러 (텔레그램+NocoDB) |

## 핵심 패턴

### NocoDB 연동
- URL: `https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/{table}`
- 인증: xc-token HTTP Header Auth (nocodb-token)
- where: `(field,eq,value)~and(field2,nlike,%pattern%)`
- PATCH: specifyBody: "json" + jsonBody: JSON.stringify()

### 이메일 자동화
- SMTP: pressco21-smtp (pressco21@foreverlove.co.kr)
- 중복 방지: student_email_sent 필드 (D3_SENT, D1_SENT, REVIEW_SENT comma-separated)
- NocoDB nlike + Code indexOf 이중 체크
- onError: continueRegularOutput (이메일 실패가 데이터 저장에 영향 없음)
- email-templates.md 디자인 완전 이식 (#b89b5e 골드 테마)

### 스케줄 배치 패턴
- Schedule -> NocoDB GET -> Code(파싱) -> IF(대상 존재?) -> 처리 -> 집계 -> 텔레그램
- 대상 없을 때: "대상 없음" 텔레그램 메시지
- 개별 건 실패 격리: onError: continueRegularOutput

### 보안
- XSS: escapeHtml() 모든 동적 값
- 마스킹: maskName/maskPhone/maskEmail Code 노드 인라인
- 관리자 인증: Bearer ADMIN_API_TOKEN 헤더
- sanitizeAnswer: HTML태그/XSS/이벤트핸들러 제거

### Sheets 구조 (NocoDB 8테이블 매핑)
1. tbl_Partners: partner_code(PK), member_id, grade, status, email
2. tbl_Classes: class_id(PK), class_name, partner_code(FK), status
3. tbl_Settlements: settlement_id(PK), class_date, status, student_email_sent, retry_count
4. tbl_PollLogs: 폴링 실행 이력
5. tbl_EmailLogs: type, recipient_email, sent_at, settlement_id
6. tbl_Settings: key-value
7. tbl_Applications: application_id(PK), member_id, status
8. tbl_Reviews: review_id(PK), class_id, rating, partner_answer

### 환경변수
- NOCODB_PROJECT_ID, TELEGRAM_CHAT_ID, ADMIN_API_TOKEN
- MAKESHOP_DOMAIN, MAKESHOP_PARTNER_GROUP_NO

## GAS 핵심 사항 (참고용)
- 응답 형식: { success, data, error: { code, message }, timestamp }
- CacheService 최대 TTL: 21600초(6시간)
- LockService: POST에 waitLock, 폴링에 tryLock(0)
- 이메일 한도: 개인 100건/일, Workspace 1,500건/일
- 파트너 코드: PC_YYYYMM_NNN, 등급 강등 없음
- 수수료: SILVER 10%, GOLD 12%, PLATINUM 15%

### 텔레그램 알림 통합 (Task 232)
- WF-ERROR-handler.json: Error Trigger -> Parse Error Info -> 텔레그램 + NocoDB 병렬
- 전체 14개 워크플로우에 22개 텔레그램 노드, 16개 메시지 유형
- Error Workflow 설정: 각 워크플로우 Settings에서 WF-ERROR 지정 필요
- WF-07/08 parse_mode 미설정 (plaintext) - 향후 고도화 시 Markdown 통일

## 다음 단계
- 프론트엔드 UI: 파트너 대시보드, 교육 아카데미 페이지 개발
- 배포: n8n 워크플로우 임포트 + NocoDB 테이블 생성 + Credentials 등록
- Error Workflow 연결: 모든 워크플로우에 WF-ERROR 지정
