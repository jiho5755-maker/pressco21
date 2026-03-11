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

## 2026-03-11 S2-5 콘텐츠 허브 검증 메모

- 허브는 로컬 fixture 에 라이브 `getContentHub` 응답을 주입하는 방식으로 검증하는 편이 가장 안정적이다.
- 최소 확인 세트는 `summary 수치 4개 + featured_message + 4개 섹션 카드 수` 다.
- 이번 기준 통과 값:
  - `totalClasses=7`
  - `totalPartners=3`
  - `highlightCount=4`
  - `storyCount=3`
  - `trendCount=3`
  - `guideCount=4`
- 첫 스토리 카드의 등급 라벨이 `BLOOM` 으로 보이면 grade alias 정규화까지 정상 반영된 것이다.
- 실제 산출물은 `output/playwright/s2-5-content-hub/content-hub-results.json` 과 `content-hub-page.png` 이다.

## 2026-03-11 S2-6 리텐션 검증 메모

- 리텐션은 `라이브 dry run API + 로컬 fixture 렌더링` 2단 검증이 가장 안정적이다.
- workflow 검증은 `/webhook/student-retention` 에 `dry_run=true` 로 completion, dormant 각각 따로 호출해 `raw_count` 와 `skipped_missing_email` 을 함께 확인한다.
- 이번 기준 통과 값:
  - completion `raw_count=1`, `count=0`, `skipped_missing_email=1`
  - dormant `raw_count=1`, `count=0`, `skipped_missing_email=1`
- UI 검증 최소 세트:
  - `retentionVisible=true`
  - `noticeTitle` 표시
  - `monthlyTitle` 표시
  - `streakCount=3`
  - `earnedBadges` 에 `Starter Loop`
  - `consoleErrors=[]`
- 실제 산출물은 `output/playwright/s2-6-retention/retention-results.json` 과 `mypage-retention.png` 이다.

## 2026-03-11 S2-7 파트너 이탈 감지 검증 메모

- 이 태스크는 `partner-auth touch 검증 + churn dry run + churn send mode` 3단으로 보는 편이 가장 정확하다.
- 최소 통과 세트:
  - `POST /webhook/partner-auth` 이후 `tbl_Partners.last_active_at` 갱신
  - `dry_run today=2026-03-11` → `risk_count=0`
  - `dry_run today=2026-06-15` → `risk_count>=1`
- send mode 는 현재 운영 credential blocker 때문에 성공 발송이 아니라 `구조화된 실패 반환` 이 기준선이다.
  - 기대 응답: `success=false`, `error.code=PARTNER_CHURN_EMAIL_FAILED`
  - 기대 로그: `tbl_EmailLogs` 에 `PARTNER_NOTIFY / FAILED`
- Telegram 실패는 현재 응답 본문을 더 이상 오염시키지 않아야 한다.
- 실제 산출물은 `output/playwright/s2-7-partner-churn/churn-results.json` 이다.

## 2026-03-11 S2-8 3계층 캐시 검증 메모

- 이 태스크는 `로컬 Playwright fixture 검증 + 라이브 WF execution path 검증` 2단으로 보는 편이 가장 정확하다.
- 로컬 최소 통과 세트:
  - 첫 목록 진입 `getClassesList=1`, `getCategories=1`
  - 같은 목록 재진입 시 추가 호출 없음
  - 협회 탭 첫 진입 `getAffiliations=1`
  - 같은 협회 탭 재진입 시 추가 호출 없음
  - 상세 후기 등록 후 `catalogVersion` 변경 + `classCatalog_*` 비움
  - TTL 강제 만료 후 `getClassesList/getCategories/getAffiliations` 각각 1회씩 재호출
- 로컬 산출물:
  - `output/playwright/s2-8-cache/cache-results.json`
  - `output/playwright/s2-8-cache/cache-flow.png`
- 라이브 최소 통과 세트:
  - `POST /webhook/class-api-read { action: "getCategories" }` 정상 JSON
  - `POST /webhook/class-api-affiliation { action: "getAffiliations" }` 정상 JSON
  - 실행 로그에서 warm miss 1회 후 cache-hit branch only 확인
- 이 환경에서는 workflow API의 staticData 조회보다 execution runData path 검증이 더 신뢰할 만하다.

## 2026-03-11 S2-9 묶음 키트 선택형 검증 메모

- 이 태스크는 `로컬 Playwright 결제 분기 검증 + 라이브 스키마/워크플로우 구조 검증` 2단으로 보는 편이 가장 정확하다.
- 로컬 최소 통과 세트:
  - 옵션 카드 2개 렌더링
  - `CLASS_ONLY` 예약: `amount=52000`, 장바구니 1건
  - `WITH_KIT` 예약: `amount=52000`, `kit_bundle_branduid=KIT9001`, 장바구니 2건
  - `WITH_KIT` 선택 시 선물하기 비활성
  - 상세 금액이 실상품가 hydrate 기준 `75,000원` 으로 갱신
- 로컬 산출물:
  - `output/playwright/s2-9-kit-bundle/kit-bundle-results.json`
  - `output/playwright/s2-9-kit-bundle/kit-bundle-flow.png`
- 라이브 최소 통과 세트:
  - `tbl_Classes.kit_bundle_branduid` 컬럼과 NocoDB 메타 존재
  - 활성 클래스 `getClassDetail(id)` 응답에 `kit_bundle_branduid` 필드 포함
  - 원격 `WF-17` 에 `IF Product Kind Class`, `WF-05` 에 `Filter Class Orders / Process Kit Order`, `WF-20` 에 `Process Edit` 존재

## 2026-03-11 S2-10 데모 시뮬레이션 검증 메모

- 이 태스크는 `live NocoDB 배치 입력 검증 + 로컬 Playwright 시연 검증` 2단으로 보는 편이 가장 정확하다.
- live 최소 통과 세트:
  - `PC_DEMO_*=5`
  - `CL_DEMO_*=15`
  - `SCH_DEMO_*=30`
  - `STL_DEMO_*=50`
  - `RV_DEMO_*=30`
- 로컬 Playwright 최소 통과 세트:
  - 학생 목록 15개, 서울 필터 후 3개
  - 상세 예약 `WITH_KIT`, 장바구니 요청 2건
  - 파트너 액션 보드 3카드 모두 1건 이상
  - 파트너 액션 클릭 후 일정/후기 탭 이동
  - 관리자 정산 탭 요약/이력 노출, 정산 실행 실패 토스트 확인
- 산출물:
  - `output/playwright/s2-10-demo/demo-results.json`
  - `output/playwright/s2-10-demo/demo-student-flow.png`
  - `output/playwright/s2-10-demo/demo-partner-flow.png`
  - `output/playwright/s2-10-demo/demo-admin-flow.png`

## 2026-03-11 S2-11 Phase 3-2 통합 테스트 메모

- 이 태스크는 `세일즈/협회/캐시/API 회귀` 를 한 러너에서 묶는 방식이 가장 효율적이었다.
- 최소 통과 세트:
  - 파트너 신청 success id 노출
  - 데모 온보딩 `3/5 완료`
  - 데모 첫 예약 `WITH_KIT`, 장바구니 `2건`
  - 협회 제안서 ROI `35,280,000원 / 3단계`
  - 혜택 카드 `5개`
  - L1/L2 repeat hit `100%`
  - L3 categories/affiliations miss -> hit execution 확인
  - WF-01 router/split `classes/detail/categories/affiliations/contentHub/schedules/remaining` body 일치
- L3 cache 검증은 n8n execution API 상세(`includeData=true`)에서 runData node 목록으로 판단한다.
- 실제 산출물:
  - `output/playwright/s2-11-phase3-2/phase3-2-results.json`
  - `output/playwright/s2-11-phase3-2/sales-landing-flow.png`
  - `output/playwright/s2-11-phase3-2/affiliation-b2b-flow.png`

## 2026-03-11 S3-1 신규 스키마 검증 메모

- 이 태스크는 `생성 스크립트 1차 실행 -> 재실행 idempotency 확인 -> Playwright API 재검증` 3단으로 보는 편이 가장 정확하다.
- 생성 러너:
  - `node scripts/partnerclass-s3-1-create-tables.js`
- Playwright 검증 러너:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-1-schema-runner.js`
- 최소 통과 세트:
  - `tbl_Seminars`, `tbl_Affiliation_Products`, `tbl_Affiliation_Content`, `tbl_Vocabulary` 4개 table 존재
  - 각 table 의 필수 컬럼 존재
  - 샘플 row 일치
    - seminars `2/2`
    - affiliation products `3/3`
    - affiliation content `3/3`
    - vocabulary `8/8`
  - 생성 스크립트 2차 실행 시 추가 insert 없이 update 로만 동작
- 실제 산출물:
  - `output/playwright/s3-1-schema/schema-create-results.json`
  - `output/playwright/s3-1-schema/schema-results.json`

## 2026-03-11 S3-2 등급 인센티브 검증 메모

- 이 태스크는 `MakeShop 정적 가드 + 로컬 Playwright fixture 검증` 2단으로 보는 편이 가장 정확하다.
- 정적 검증:
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `http://www.w3.org/2000/svg` 는 SVG namespace false positive 로 본다.
- 최소 통과 세트:
  - 대시보드 수익 탭에서 `ATELIER PARTNER` 배지와 등급 혜택 카드 3장 노출
  - 목록 혜택 레일 첫 카드가 `AMBASSADOR` 등급 카드로 정렬
  - 상세 연관 추천 첫 카드 태그에 `ATELIER` 이상 등급 노출
  - 콘텐츠 허브 첫 스토리가 `AMBASSADOR / 멘토 파트너` 로 노출
- Playwright 검증 러너:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-2-incentive-runner.js`
- 실제 산출물:
  - `output/playwright/s3-2-incentives/incentive-results.json`
  - `output/playwright/s3-2-incentives/partner-grade-benefits.png`
  - `output/playwright/s3-2-incentives/list-benefit-priority.png`
  - `output/playwright/s3-2-incentives/detail-related-priority.png`
  - `output/playwright/s3-2-incentives/content-hub-story-priority.png`

## 2026-03-11 S3-3 키트 구독 파일럿 검증 메모

- 이 태스크는 `MakeShop 정적 가드 + 로컬 Playwright UI + live API create/list/batch/cancel` 3단으로 보는 편이 가장 정확하다.
- 정적 검증:
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `http://www.w3.org/2000/svg` 는 SVG namespace false positive 로 본다.
- 로컬 UI 최소 통과 세트:
  - 히어로 타이틀 노출
  - 진행 중 구독 `1건`
  - 추천 구독 `1건`
  - 생성 후 진행 중 구독 `2건`
  - 해지 후 진행 중 구독 `1건`
- live API 최소 통과 세트:
  - create `201`
  - list active `1`
  - dry run generated `1`
  - batch generated `1`
  - `last_order_ref` 가 `SUBORD_202603_SUBS_*` 패턴
  - cancel `200`
- Playwright 검증 러너:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-3-subscription-runner.js`
- 실제 산출물:
  - `output/playwright/s3-3-subscription/table-create-results.json`
  - `output/playwright/s3-3-subscription/subscription-results.json`
  - `output/playwright/s3-3-subscription/mypage-subscription-flow.png`

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
