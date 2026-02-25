# QA/테스트 전문가 메모리

## 상태 (2026-02-25)
- Phase 1a/1b 테스트 체크리스트 작성됨 (docs/test-checklists/)
- Phase 2 GAS 통합 테스트 체크리스트 완료 (Task 241)
  - 파일: `docs/test-checklists/phase2-integration-test.md` (688줄)
  - 7개 섹션: 환경설정/고객E2E/파트너E2E/보안/성능/API한도/최종점검
  - Critical Issues 19건 회귀 테스트 포함
- Phase 2 v2.1 n8n+NocoDB 통합 테스트 체크리스트 완료 (Task 251)
  - 파일: `docs/test-checklists/phase2-v2-integration-test.md` (692줄)
  - 8개 섹션: 환경준비/고객플로우/파트너플로우/보안/에러핸들링/스케줄/NocoDB GUI/롤백
  - 체크박스 항목 161개, Critical 관련 85개
  - Task 정의: `tasks/251-n8n-e2e-integration-test.md` (206줄)
- Playwright MCP 사용 가능 (현재는 서버 미배포 상태로 수동 테스트 가이드 작성)

## Phase 2 v2.1 n8n+NocoDB 테스트 핵심 패턴 (Task 251 확립)

- **환경 준비 선행 필수**: NocoDB 8테이블+NocoDB API Token+n8n Credentials 6개+CORS 설정 모두 완료 후 테스트 시작
- **스케줄 WF 수동 테스트**: n8n UI "Execute Workflow" 버튼으로 WF-11/12/13 수동 1회 실행 → 조건 데이터 NocoDB에 직접 삽입
- **ADMIN_API_TOKEN 보안**: WF-08 partner-approve는 토큰 없을 때 401 반드시 검증
- **자기결제 방지**: booking_member_id === partner_member_id 조건 → SELF_PURCHASE 에러
- **이메일 독립 처리**: onError: continueRegularOutput → 이메일 실패해도 tbl_Settlements 저장 성공
- **등급 강등 없음**: WF-13 상위 등급만 변경, 현재 등급보다 낮은 등급으로 변경 안 됨
- **retry_count 최대 5회**: tbl_Settlements status FAILED_MAX + 텔레그램 Critical 알림
- **중복 발송 방지**: tbl_Bookings student_email_sent 필드 (D3_SENT/D1_SENT/REVIEW_SENT) 확인
- **NocoDB xc-token**: n8n Credentials에 xc-token 헤더 방식으로 등록 (Airtable Bearer 방식과 다름)

## Phase 2 GAS 테스트 핵심 패턴 (Task 241 확립)

- **GAS 헬스 체크**: `{GAS_URL}?action=health` GET 요청으로 배포 전 서버 상태 확인
- **인증 흐름 테스트**: 비로그인/비파트너/pending/inactive/active 5단계 상태 모두 검증
- **getPartnerAuth 상태 분기 확인**: pending/inactive는 errorResult가 아닌 `{ success: true, data: { status: "..." } }` 반환
- **XSS 테스트 순서**: GAS escapeHtml_ -> 프론트 sanitizeHtml -> textContent 할당 3단계 체인
- **정산 테스트**: pollOrders 수동 실행 -> "정산 내역" 시트 U/V/W 컬럼 확인
- **Critical Issues 19건 회귀**: Task211/212/221/222/231/232 각 C-이슈 회귀 테스트 필수
