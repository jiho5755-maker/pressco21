# QA/테스트 전문가 메모리

## 상태 (2026-02-26)
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
- **Phase 2.6 인프라+관리 검증 체크리스트 완료 (Task 302)**
  - 파일: `docs/test-checklists/phase2.6-ops.md` (769줄, 64개 체크박스)
  - 초점: Task 297~301 산출물 (Docker 안정성/백업/SSL갱신/모니터링/WF-APPROVE/WF-15 후기)
- **Phase 2.7 UX 통합 테스트 + Lighthouse 체크리스트 완료 (Task 316)**
  - 파일: `docs/test-checklists/phase2.7-ux.md` (498줄, 105개 테스트 항목)
  - 초점: Task 310~315 신규 UX (찜/최근본/공유/라이트박스/차트/CSV/메인진입점) + 반응형 + Lighthouse

## Phase 2.7 UX 테스트 핵심 패턴 (Task 316 확립)

- **찜 기능 DOM 패턴**: `.wishlist-btn.is-active` (빨간 하트), `.wishlist-btn.is-animating` (ccHeartPop 0.35s 애니메이션), `.wishlist-btn__outline/filled` (SVG 경로 전환)
- **localStorage 키 2개**: `pressco21_wishlist` (JSON 배열), `pressco21_recent` (객체 배열, 최대 RECENT_MAX=10개)
- **찜 필터 aria-pressed**: 활성화 시 `aria-pressed="true"`, 비활성 시 `aria-pressed="false"` 동적 변경 확인
- **메인페이지 캐시 키**: `pressco21_popular_classes_v2`, TTL=30분 → `{ts: 타임스탬프, data:[...]}` 형태
- **캐시 만료 수동 테스트**: `localStorage.setItem('pressco21_popular_classes_v2', JSON.stringify({ts: Date.now() - 31*60*1000, data:[]}))` → 새로고침
- **Chart.js 렌더링 확인**: `#pdRevenueChart` 캔버스 + `typeof Chart !== 'undefined'` 가드
- **등급 게이지 CSS**: conic-gradient로 반원 게이지 구현 → `gaugeDeg = Math.round((pct/100)*180)` 각도 계산
- **전월 대비 증감**: `direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'` → 색상 분기
- **CSV BOM 처리**: `'\uFEFF'` 접두사로 Excel 한글 UTF-8 인식 (없으면 한글 깨짐)
- **API 실패 폴백**: 메인페이지 클래스 섹션 `hideSection()` → `section.style.display = 'none'`
- **Lighthouse 기준 완화**: 파트너 대시보드 Performance 75+ (Chart.js 로드 비용), SEO 85+ (로그인 필요)

## 2026-03-11 S2-3 전국 탐색 IA 테스트 메모

- 목록 2606은 이제 탭 3개를 기준으로 검증한다: `전체 클래스`, `협회·세미나`, `혜택·이벤트`.
- 로컬 검증 시 파트너맵 실서비스 대신 `output/playwright/fixtures/partnerclass/partnermap-shell.html` 연결 여부를 확인하면 된다.
- 지도 보기 검증은 `오프라인 카드가 있을 때 활성`, `온라인 필터만 남으면 비활성` 두 상태를 모두 확인해야 한다.
- 상세 2607은 `GENERAL / AFFILIATION / EVENT` fixture 각각에서 상단 eyebrow, trust chip, 파트너맵 링크 존재 여부를 같이 본다.
- 실제 산출물 기준 파일은 `output/playwright/s2-3-ia/s2-3-results.json` 과 `output/playwright/s2-3-ia/*.png` 이다.

## 2026-03-11 S2-4 WF-01 분리 회귀 메모

- baseline 비교는 분리 전 `class-api` 응답을 먼저 저장한 뒤, 분리 후 `timestamp` 와 내부 `_status` 를 제외하고 본문 동등성으로 비교한다.
- 최소 회귀 세트는 `getClasses`, `getClassDetail`, `getCategories`, `getAffiliations`, `INVALID_ACTION` 5개다.
- 신규 action 검증은 `getSchedules`, `getRemainingSeats` 를 같은 `class-api` 라우터로 직접 호출해 `200 + success=true` 만 우선 확인하면 된다.
- 이번 작업의 Playwright 검증은 브라우저 렌더링보다 `APIRequestContext` 가 더 적합했다. 결과 파일은 `output/playwright/s2-4-wf01/playwright-results.json` 이다.

## Phase 2.6 운영 인프라 테스트 핵심 패턴 (Task 302 확립)

- **체크리스트 분업 4레이어**: phase2-deployment-check.md(인프라) + phase2-v2-integration-test.md(기능플로우) + phase2-e2e.md(신규UX+보안) + **phase2.6-ops.md(백업/모니터링/SSL/관리WF)**
- **WF-APPROVE 테스트**: `status=approved` 직접 curl → tbl_Partners 레코드 생성 확인, `status=pending` → `_skip: true` 확인
- **NocoDB Webhook 수동 설정**: NocoDB GUI → tbl_Applications → Webhooks → After Update → `https://n8n.pressco21.com/webhook/nocodb-approve`
- **백업 4종 확인**: n8n 워크플로우/NocoDB 데이터/n8n 환경설정/백업 로그 — 크기 > 0 필수
- **certbot dry-run**: `sudo certbot renew --dry-run` → `all simulated renewals succeeded` 확인
- **장애 시뮬레이션 순서**: `docker stop nocodb` → `bash monitor.sh` → Telegram 알림 확인 → `docker start nocodb` → 복구 확인
- **WF-15 임포트 필수**: 파일명 `WF-15-review-submit.json` — 2026-02-26 기준 아직 n8n 미임포트 상태
- **수동 작업 4종**: 메이크샵 4페이지 js.js 재저장 + WF-10 answers 배열 업데이트 + NocoDB Webhook 설정 + WF-15 임포트

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
