# QA/테스트 전문가 메모리

## 상태 (2026-02-25)
- Phase 1a/1b 테스트 체크리스트 작성됨 (docs/test-checklists/)
- Phase 2 GAS 통합 테스트 체크리스트 완료 (Task 241)
  - 파일: `docs/test-checklists/phase2-integration-test.md` (688줄)
- Phase 2 v2.1 n8n+NocoDB 통합 테스트 체크리스트 완료 (Task 251)
  - 파일: `docs/test-checklists/phase2-v2-integration-test.md` (692줄, 161개 체크박스)
- Phase 2 배포 검증 체크리스트 완료 (Task 271)
  - 파일: `docs/test-checklists/phase2-deployment-check.md` (인프라/서버/Credentials/CORS)
- **Phase 2 최종 E2E 체크리스트 완료 (Task 280)**
  - 파일: `docs/test-checklists/phase2-e2e.md` (8개 섹션, 103개 체크박스)
  - 초점: Task 261/262 신규 UX + score 경계값 매트릭스 + Playwright 코드 + 완료 선언 기준
- Playwright MCP 사용 가능 (현재는 서버 미배포 상태로 수동 테스트 가이드 작성)

## Phase 2 최종 E2E 테스트 핵심 패턴 (Task 280 확립)

- **3개 체크리스트 분업**: phase2-deployment-check.md(인프라) + phase2-v2-integration-test.md(기능플로우) + phase2-e2e.md(신규UX+보안경계값+완료선언)
- **score 경계값 7가지 매트릭스**: 합격최솟값(11), 불합격최댓값(10), 만점(15), 0점, 범위초과(16), total조작(5/5), pass_threshold주입 → 서버 PASS_THRESHOLD=11 고정 확인
- **UI 분기 HTML ID 패턴**: 교육=`#peNoticeArea/#peNotPartnerArea/#peAlreadyArea/#peContentArea/#peResultArea`, 신청=`#paNoticeArea/#paSuccessArea/#paAlreadyArea/#paFormArea`
- **Playwright 세션 주입**: 가상태그는 foreverlove.co.kr 서버에서만 치환 → PHPSESSID 쿠키 직접 주입 또는 로그인 폼 자동화
- **Phase 2 완료 선언 기준**: 필수(인프라+기본E2E+신규UX+보안+성능) vs 조건부(스케줄 이메일, YouTube ENDED, Rich Results)
- **반응형 가로 스크롤 체크**: scrollWidth <= clientWidth+5px 허용 (Playwright evaluate)

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
