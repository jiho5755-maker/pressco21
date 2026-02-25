# n8n 워크플로우 상세 기록

## Task 211: WF-01~03 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-01-class-api.json` (20노드) - getClasses/getClassDetail/getCategories
- `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json` (37노드) - getPartnerAuth/getPartnerDashboard/getPartnerApplicationStatus/getEducationStatus
- `파트너클래스/n8n-workflows/WF-03-partner-data-api.json` (26노드) - getPartnerBookings/getPartnerReviews

## Task 212: WF-04 Record Booking 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-04-record-booking.json` (27노드) - 예약기록+수수료계산+정산
- D+3 정산, 자기결제 방지, 수수료 개선안 B, 이메일 2종 + 텔레그램 3종

## Task 213: WF-05 Order Polling + Batch Jobs 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` (67노드) - 5개 스케줄 배치 통합
- 주문폴링(10분), 정합성(00:00), 상품동기화(03:00), 실패재시도(04:00), D+3정산(05:00)

## Task 221(n8n): WF-07~08 파트너 신청/승인 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-07-partner-apply.json` (25노드)
- `파트너클래스/n8n-workflows/WF-08-partner-approve.json` (30노드)
- 관리자 인증: Bearer 토큰, 메이크샵 회원등급 변경 API 연동

## Task 222(n8n): WF-06, WF-09, WF-10 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-06-class-management.json` (16노드) - 클래스 상태 변경
- `파트너클래스/n8n-workflows/WF-09-review-reply.json` (18노드) - 후기 답변 저장
- `파트너클래스/n8n-workflows/WF-10-education-complete.json` (20노드) - 교육 이수 완료

## Task 231(n8n): WF-11~12 리마인더+후기요청 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-11-send-reminders.json` (17노드) - D-3/D-1 리마인더 매일 09:00
- `파트너클래스/n8n-workflows/WF-12-review-requests.json` (17노드) - 후기 요청 매일 10:00
- `tasks/231-n8n-email-automation.md` - Task 정의 + 테스트 체크리스트
- 중복 방지: student_email_sent 필드 (D3_SENT, D1_SENT, REVIEW_SENT comma-separated)
- NocoDB nlike + Code indexOf 이중 체크
- 이메일 6종: D-3 수강생/파트너, D-1 수강생/파트너, 후기 수강생, 후기 파트너
- email-templates.md 디자인 완전 이식 (골드 #b89b5e 테마)
- tbl_EmailLogs 발송 이력 기록 (REMINDER_D3, REMINDER_D1, REVIEW_REQUEST)

## Task 232: WF-ERROR 전역 에러 핸들러 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-ERROR-handler.json` (4노드) - Error Trigger + 텔레그램 + NocoDB 로깅
- `tasks/232-telegram-notification.md` - 텔레그램 메시지 형식 가이드 + Error Workflow 설정 방법
- 텔레그램 노드 합계: 14개 워크플로우에 22개 노드, 16개 메시지 유형
- Error Trigger 워크플로우는 n8n에서 각 워크플로우 Settings에 Error Workflow로 지정 필요
- NocoDB tbl_EmailLogs에 type=ERROR로 에러 이력 기록

## n8n 워크플로우 공통 패턴
- NocoDB: xc-token 헤더, where 파라미터, specifyBody: "json" + JSON.stringify()
- 이메일: emailSend 노드 + SMTP Credentials (pressco21-smtp), onError: continueRegularOutput
- 텔레그램: telegram 노드 + Telegram API Credentials, Markdown parse_mode
- 환경변수: NOCODB_PROJECT_ID, TELEGRAM_CHAT_ID, ADMIN_API_TOKEN
- 응답 형식: { success, data, error: { code, message }, timestamp }
- 스케줄 배치: Schedule -> NocoDB GET -> Code(파싱) -> IF -> 처리 -> 집계 -> 텔레그램
- timezone: Asia/Seoul
