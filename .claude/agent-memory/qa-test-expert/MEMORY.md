# QA/테스트 전문가 메모리

## 상태 (2026-02-21)
- Phase 1a/1b 테스트 체크리스트 작성됨 (docs/test-checklists/)
- Phase 2 통합 테스트 체크리스트 작성 완료 (Task 241)
  - 파일: `docs/test-checklists/phase2-integration-test.md` (688줄)
  - 7개 섹션: 환경설정/고객E2E/파트너E2E/보안/성능/API한도/최종점검
  - Critical Issues 19건 회귀 테스트 포함
- Playwright MCP 사용 가능

## Phase 2 테스트 핵심 패턴 (Task 241 확립)

- **GAS 헬스 체크**: `{GAS_URL}?action=health` GET 요청으로 배포 전 서버 상태 확인
- **인증 흐름 테스트**: 비로그인/비파트너/pending/inactive/active 5단계 상태 모두 검증
- **getPartnerAuth 상태 분기 확인**: pending/inactive는 errorResult가 아닌 `{ success: true, data: { status: "..." } }` 반환
- **XSS 테스트 순서**: GAS escapeHtml_ -> 프론트 sanitizeHtml -> textContent 할당 3단계 체인
- **정산 테스트**: pollOrders 수동 실행 -> "정산 내역" 시트 U/V/W 컬럼 확인
- **Critical Issues 19건 회귀**: Task211/212/221/222/231/232 각 C-이슈 회귀 테스트 필수
