# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

---

## 운영 모드

- **모드 A (보조)**: Claude Code 주도 → Codex 테스트/리팩토링 (`[CODEX]` prefix)
- **모드 B (독립)**: Codex가 기획~배포 총괄 (`[CODEX-LEAD]` prefix)
- 서브디렉토리 격리: 서로 다른 서브디렉토리면 동시 WRITE 가능

### 공통 금지사항

- `.secrets.env` 수정 금지
- `git push --force`, `git reset --hard` 금지
- 다른 에이전트 WRITE 중인 파일 수정 금지

---

## Session Lock

- Current Owner: IDLE
- Mode: —
- Started At: —
- Branch: main
- Working Scope: —
- Active Subdirectory: —

## Files In Progress
- 없음

## Last Changes

> 전체 이력: `archive/ai-sync-history/`

- 2026-04-09 메이크샵 실read 검증 + 쿠팡 live probe 스켈레톤 추가 (codex)
  - `tools/openmarket/makeshop_live_test.py`
    - Oracle 허용 IP 서버 env를 직접 읽는 메이크샵 실검증 CLI 추가
    - `list-board-codes`, `list-crm-board`, `list-reviews`, `preview-crm-reply`, `preview-review-answer` 지원
    - 고객명/전화/이메일을 마스킹해서 read-only probe 결과를 안전하게 출력
  - `tools/openmarket/makeshop_openapi_docs_probe.py`
    - 로컬 `.secrets.env`의 비ASCII 참조값을 placeholder로 인식하도록 보강
  - `tools/openmarket/coupang_live_test.py`
    - Coupang HMAC 인증 헤더 생성, 상품문의/고객센터 문의 read probe, reply payload preview를 위한 CLI 추가
    - preview 명령은 자격 증명 없이도 테스트 가능하도록 분리
  - `docs/openmarket-ops/omx-channel-capability-matrix-v1.md`
    - 메이크샵을 `실read 검증 완료 + 실write 승인 대기` 상태로 문구 정리
    - 쿠팡 blocker를 `실검증 전`에서 `access/secret/vendorId/wingId 미주입`으로 구체화
    - `coupang_live_test.py`와 Coupang HMAC/free FAQ 근거 추가
  - `mini-app-v2/src/lib/omx.ts`
    - 메이크샵 queue/capability 문구를 실read 검증 기준으로 수정
    - 쿠팡 queue/capability 문구를 HMAC + 자격 증명 병목 기준으로 수정
  - 실검증 결과
    - `python3 tools/openmarket/makeshop_live_test.py --remote-host ubuntu@158.180.77.201 list-board-codes` 성공
    - `python3 tools/openmarket/makeshop_live_test.py --remote-host ubuntu@158.180.77.201 list-crm-board --from-dt '2026-04-01 00:00:00' --to-dt '2026-04-09 23:59:59' --member-type MEMBER --limit 3` 성공
    - `python3 tools/openmarket/makeshop_live_test.py --remote-host ubuntu@158.180.77.201 list-reviews --from-dt '2026-04-01' --to-dt '2026-04-09' --limit 3` 성공 (`count=0`)
    - 메이크샵 write는 고객 노출을 수반해 이번 턴에서는 preview까지만 수행
    - 쿠팡 자격 증명은 로컬 `.secrets.env`와 Oracle 핵심 env에서 찾지 못함
  - 검증
    - `python3 -m py_compile tools/openmarket/makeshop_live_test.py tools/openmarket/makeshop_openapi_docs_probe.py tools/openmarket/coupang_live_test.py` 통과
    - `cd mini-app-v2 && npm run build` 통과
- 2026-04-09 메이크샵 공식 Open API board/review 검증 + OMX 허브 1차 구현 (codex)
  - `docs/openmarket-ops/omx-channel-capability-matrix-v1.md`
    - 메이크샵 capability를 `manual/manual_send`에서 `api/direct_send/doc_only`로 상향
    - 공식 guide endpoint 기준 `crm_board/reply`, `comment/store`, `review/store` 스펙과 남은 live probe 공백을 문서화
  - `tools/openmarket/makeshop_openapi_docs_probe.py`
    - 공식 guide id `86/90/93/94/95`를 직접 조회해 endpoint/method/permission/request example을 요약하는 probe 스크립트 추가
    - `--live-domain` 옵션을 넣었고, 현재 로컬 시크릿이 placeholder라 live read probe는 자동 skip 처리
  - `mini-app-v2/src/lib/omx.ts`
    - 메이크샵 inquiry/review capability와 샘플 queue item을 direct_send/doc_only 기준으로 갱신
  - `mini-app-v2/src/pages/OmxPage.tsx`
    - capability matrix, 승인형 inbox, 답변 편집 패널, 실행 순서를 한 화면에서 보는 OMX 허브 페이지 추가
  - `mini-app-v2/src/App.tsx`
    - `/omx` 라우트 추가
  - `mini-app-v2/src/pages/HomePage.tsx`
    - 홈 카드에 `OMX 답변 허브` 진입점 추가
  - `mini-app-v2/src/components/layout/Header.tsx`
    - 와이드 페이지 대응을 위한 `maxWidthClassName` 옵션 추가
  - 검증
    - `python3 -m py_compile tools/openmarket/makeshop_openapi_docs_probe.py` 통과
    - `python3 tools/openmarket/makeshop_openapi_docs_probe.py --live-domain foreverlove.co.kr` 실행
      - 메이크샵 inquiry/review write 스펙 문서 검증 완료
      - live read probe는 `.secrets.env` placeholder 때문에 skip
    - `cd mini-app-v2 && npm run build` 통과
- 2026-04-09 수금/지급 UX 필터·정렬·선택합계·누적보기 개선 (codex)
  - `offline-crm-v2/src/pages/Receivables.tsx`
    - 수금/지급 화면에 정렬, 금액 필터, 에이징 필터, 고객 구성/정산 구분 필터 추가
    - 기본 정렬을 금액 높은 순으로 통일하고 query string 연동 추가
    - 현재 목록 전체 선택, 선택 건수/합계 표시, 고액/장기 미수 강조 추가
    - 기존 장부 입금 이력에 `누적 보기 / 건별 보기` 토글 추가
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
    - 고객 상세의 기존 장부 입금 이력에도 `누적 보기 / 건별 보기` 토글 추가
  - `offline-crm-v2/src/lib/receivables.ts`
    - 기존 장부 입금 이력의 누적 입금액/잔액 계산용 타임라인 helper 추가
  - 검증
    - `cd offline-crm-v2 && npm run build` 통과
  - 배포
    - `cd offline-crm-v2 && bash deploy/deploy.sh` 실행
    - 운영 서버 `/var/www/crm/index.html`과 `/var/www/crm/assets/index-DOo3i35X.js`, `/var/www/crm/assets/index-Bs33k2nZ.css` 업로드 시각 확인
- 2026-04-09 네이버 커머스 실계정 문의 조회/답변 검증 완료 (codex)
  - `tools/openmarket/naver_commerce_live_test.py`
    - `.secrets.env` 기반 전자서명 생성 + SSH 원격 실행 조합으로 네이버 커머스 실계정 검증용 CLI 추가
    - `seller-account`, `list-customer-inquiries`, `list-qnas`, `answer-qna`, `answer-customer-inquiry` 서브커맨드 구현
    - 허용 IP 서버에서만 호출되도록 원격 실행 경로를 두고, 로컬 서명/원격 HTTP 요청 분리
  - `docs/openmarket-ops/smartstore-inquiry-adapter-v1.md`
    - 실계정 검증 결과를 반영해 `SELF` 토큰 동작, 고객 문의/상품 문의 날짜 파라미터 형식, 상품 문의 답변 body를 문서화
    - `accountId=pressco21farm`, `accountUid=ncp_2sSExBvQycBXNCGTg1OdN` 실조회 결과 반영
  - `docs/openmarket-ops/smartstore-inquiry-adapter-n8n-draft.json`
    - `NAVER_COMMERCE_ACCESS_TOKEN` 기준으로 토큰 env를 중립화
    - raw query 없이도 `onlyPending=true`만으로 조회 가능하도록 고객 문의 최근 7일, 상품 문의 최근 48시간 기본 날짜 계산 추가
  - `docs/openmarket-ops/om-sla-01-implementation-notes.md`
    - 스마트스토어 실측 파라미터 형식과 보조 검증 스크립트 링크 추가
  - 실검증 결과
    - 로컬 직접 호출은 `403 GW.IP_NOT_ALLOWED`
    - Oracle 서버 `158.180.77.201`에서 토큰 발급/계정 조회/문의 조회 성공
    - 고객 문의 조회는 성공했으나 현재 기간 내 `0건`
    - 상품 문의 조회는 실데이터 반환
    - 상품 문의 `questionId=669968949`에 실제 답변 등록 후 재조회로 `answered=true` 확인
  - 검증
    - `python3 -m py_compile tools/openmarket/naver_commerce_live_test.py` 통과
    - 실계정 API 호출 성공
- 2026-04-09 스마트스토어 문의 adapter draft 작성 (codex)
  - `docs/openmarket-ops/smartstore-inquiry-adapter-v1.md`
    - 네이버 커머스API의 고객 문의와 상품 문의(Q&A)를 OM-SLA 공통 계약으로 합치는 adapter 설계 문서 작성
    - 공식 확인 항목과 설계상 추론 항목을 분리하고, 필드 매핑/출력 예시/raw query passthrough 정책을 정리
    - 2026-04-09 기준 공식 참고 소스 링크 추가
  - `docs/openmarket-ops/smartstore-inquiry-adapter-n8n-draft.json`
    - `openmarket/smartstore/inquiries` webhook 기반 adapter skeleton 작성
    - `NAVER_COMMERCE_SELLER_TOKEN` 전제 하에 고객 문의 조회 + 상품 문의 조회 + 정규화 + 응답 흐름 구현
    - `onlyPending`, `customerQuery`, `qnaQuery` query passthrough 지원
  - `docs/openmarket-ops/om-sla-01-implementation-notes.md`
    - 스마트스토어 adapter 연결 예시 URL과 하위 자산 링크 추가
  - 검증
    - `jq empty docs/openmarket-ops/smartstore-inquiry-adapter-n8n-draft.json` 통과
- 2026-04-09 OM-SLA-01 구현 초안 분리 (codex)
  - `docs/openmarket-ops/om-sla-01-nocodb-ddl.sql`
    - `om_channel_policy`, `om_agent_routing`, `om_inquiry_queue`를 Postgres/NocoDB 기준 DDL로 정의
    - 중복 문의 방지, SLA 진행률, 경고 이력, 원본 payload 보관용 운영 필드를 추가
    - 초기 seed 데이터와 인덱스, UpdatedAt trigger까지 포함
  - `docs/openmarket-ops/om-sla-01-n8n-draft.json`
    - 5분 스케줄 기반 코어 워크플로우 draft 작성
    - adapter URL env 기반 채널 수집, 정규화, 라우팅, 신규 생성, SLA 경고 PATCH, 텔레그램 알림 흐름 구현
    - NocoDB v2 API 기준 POST/PATCH 형식으로 초안 작성
  - `docs/openmarket-ops/om-sla-01-implementation-notes.md`
    - adapter 응답 계약, 권장 env, holiday policy 운영 원칙, 검증 순서, draft 제한사항 정리
  - `docs/PRD-오픈마켓-운영보완-Phase1-상세설계-v1.md`
    - 참고 문서 섹션에 OM-SLA-01 하위 산출물 링크 추가
  - 검증
    - `jq empty docs/openmarket-ops/om-sla-01-n8n-draft.json` 통과
- 2026-04-09 오픈마켓 운영보완 Phase 1 상세 설계 작성 (codex)
  - `docs/PRD-오픈마켓-운영보완-Phase1-상세설계-v1.md`
    - Phase 1 범위를 `리뷰 답변 초안`, `문의 SLA 알람`, `기본 운영 큐 대시보드`로 고정
    - 화면 3개, NocoDB 테이블 6개, n8n 워크플로우 3개, 텔레그램 알림 규격, 라우팅 규칙, 검증 시나리오를 구현 단위로 정리
    - Phase 1은 `읽기/알림/초안`만 수행하고 고객 발송/운영 실행은 승인형으로 남기는 원칙을 명시
  - 검증
    - 문서형 산출물이라 별도 테스트/빌드 실행 없음
- 2026-04-08 재고 정리 스크립트 CLI 구현 (codex)
  - `tools/stock_cleanup.py`
    - 하드코딩된 1회성 스크립트를 `argparse` 기반 CLI로 재작성
    - API 호출 대신 `--input-json` 로컬 입력도 지원하도록 확장
    - 출력 경로를 상대 경로/인자 기반으로 정리하고 `manifest.json` 요약 파일 추가
    - API 키는 코드 상수 대신 `--shopkey`, `--licensekey`, 환경변수로 받도록 변경
  - `tools/stock_cleanup/sample_products.json`
    - 오프라인 검증용 샘플 데이터를 추가
  - 검증
    - `PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m py_compile tools/stock_cleanup.py` 통과
    - `python3 tools/stock_cleanup.py --input-json tools/stock_cleanup/sample_products.json --output-dir /tmp/stock_cleanup_demo` 실행 완료
    - 출력 확인: `/private/tmp/stock_cleanup_demo/*.csv`, `/private/tmp/stock_cleanup_demo/manifest.json`
- 2026-04-08 레지너스 AS 관리 문서/추적 양식 추가 (codex)
  - `docs/reginus-as-management-playbook-2026-04-08.md`
    - 레지너스 6개 상품 master, 무상수리 판정 기준, 회수품 보관 원칙, 본사 발송 흐름을 문서화
    - 저장소 내 실반품 데이터는 바로 식별되지 않았음을 명시하고 역입력 절차 제안
  - `output/spreadsheet/reginus_as_tracker_template.xlsx`
    - `상품마스터`, `AS접수`, `본사발송`, `상태코드` 시트 생성
    - 구매일 기준 1년 무상수리 만료일 및 1년 이내 여부 계산식 포함
    - 상태/증상/판정 드롭다운과 레지너스 6개 상품 마스터 내장
  - 검증
    - `openpyxl`로 워크북 저장 및 시트/수식/데이터검증 재확인
    - `soffice` 미설치로 렌더링 기반 시각 검수는 미실행
- 2026-04-08 CRM E2E 설정/skip 보정 (codex)
  - `offline-crm-v2/playwright.config.ts`
    - Playwright webServer/baseURL을 `127.0.0.1:5173`로 고정해 `localhost -> ::1` 바인딩 이슈를 피하도록 수정
  - `offline-crm-v2/tests/04-transactions.spec.ts`
    - 페이지네이션 검증에서 `skip`을 제거하고 현재 UI 기준 다음 페이지 버튼/indicator를 강하게 검증하도록 수정
  - `offline-crm-v2/tests/09-calendar.spec.ts`
    - ambient 데이터 의존 `skip`을 제거하고 테스트용 명세표를 직접 생성한 뒤 `빠른 확인 -> 당일 명세표 보기` 흐름을 검증하도록 수정
  - 검증
    - `npm run build` 통과
    - `npx playwright test tests/04-transactions.spec.ts tests/09-calendar.spec.ts --reporter=list`는 현재 샌드박스에서 `listen EPERM 127.0.0.1:5173`로 실브라우저 재현 불가
- 2026-04-09 오픈마켓 운영보완 PRD 작성 (codex)
  - `docs/PRD-오픈마켓-운영보완-리뷰-문의-인사이트-v1.md`
    - 사방넷 보완 레이어로 범위를 고정하고, 통합 매출조회 1차 개발은 비범위로 제외
    - 리뷰 일괄 답변, 문의 SLA 알람, 인사이트/이상치/재구매 엔진을 `AI 초안 + 사람 승인` 원칙으로 정리
    - 채널별 즉시 알림, 24시간 SLA 경보, 승인형 재구매 메시지 정책을 문서화
  - 검증
    - 문서 초안 작성 및 범위 확인 완료
- 2026-04-07 하네스 v4.0 경량화 — CLAUDE.md/MEMORY/AI_SYNC/settings 축소 (Claude Code)
- 2026-04-07 WF-CRM-02 오배선 수정 + 텔레그램 포맷 정리 + 톤 다운 (codex)
- 2026-04-07 고객 상세 거래내역 인라인 편집 전환 (codex)

## Next Step

### Claude Code 담당
- Phase 3b 기획안 파이프라인 구현 (PRD 템플릿 + n8n WF + 디자인팀 핸드오프)
- Phase 3c OpenClaw + 텔레그램 고도화 (3방 라우팅, Codex 원격 실행, task ledger)
- **블로커**: 이재혁 Chat ID 확보 (대표님 확인 필요)
- **별도 세션**: 서버 이전 (flora-todo, n8n-staging → 플로라)

### Codex 담당
- `[CODEX-LEAD]` 승인된 메이크샵 테스트 케이스 1건으로 `crm_board/reply` 또는 `review/store(save_type=answer)` 실write를 1회 검증
- `[CODEX-LEAD]` 쿠팡 access/secret/vendorId/wingId 확보 후 `coupang_live_test.py`로 `onlineInquiries`/`callCenterInquiries` live probe 실행
- `[CODEX-LEAD]` 채널톡 무료/체험 플랜에서 Open API/Webhook 운영 가능 여부를 최종 확인하고, 불가하면 대안/제외 결론 문서화
- `[CODEX-LEAD]` mini-app-v2 OMX 허브를 실제 adapter/NocoDB 데이터와 연결하고 DRY_RUN/LIVE_SEND feature flag를 서버값으로 분리
- `[CODEX-LEAD]` 쿠팡 문의 live probe와 채널톡 가격 검증을 끝내서 OMX capability matrix를 2차 확정
- `[CODEX-LEAD]` 스마트스토어 토큰 helper 또는 mini.pressco21.com 토큰 대행 방식 확정
- `[CODEX-LEAD]` `OM_FETCH_SMARTSTORE_INQUIRIES_URL`를 adapter webhook으로 연결하고 OM-SLA-01 수동 실행 검증
- `[CODEX-LEAD]` 스마트스토어 문의 adapter 응답 계약을 실측 결과 기준으로 확정하고 OM-SLA-01에 1차 연결
- `[CODEX-LEAD]` NocoDB base/table 실제 식별자와 운영 서버 credential 이름을 draft와 매핑
- `[CODEX-LEAD]` 이재혁/장지호 텔레그램 chat id 반영 후 신규/50%/80%/breach 알림 실검증
- `[CODEX-LEAD]` 문의 SLA 알람용 채널별 수집 가능 범위와 담당자 라우팅 규칙 점검
- `[CODEX-LEAD]` 고객 문의 실데이터 발생 시 `POST /v1/pay-merchant/inquiries/:inquiryNo/answer` body shape를 1회 실측해 확정
- `[CODEX-LEAD]` 리뷰 일괄 답변 승인 큐와 로그 스키마 상세화
- `[CODEX-LEAD]` Phase 1 상세 설계를 기준으로 NocoDB 테이블 생성안과 n8n WF JSON 초안 분리
- `[CODEX-LEAD]` 재구매 엔진 대상 SKU 우선 목록과 자사몰 보충카트 연결 방식 확정
- `[CODEX]` WF-CRM-02/03 실건 검증 (입금/감사 루프)
- `[CODEX]` 재고 정리 스크립트를 실제 메이크샵 키로 한 번 실행해 live CSV와 manifest가 기대대로 나오는지 확인
- `[CODEX]` CRM E2E 수정분을 로컬에서 `npx playwright test tests/04-transactions.spec.ts tests/09-calendar.spec.ts --reporter=list`로 재실행해 skip 제거 여부 확인
- `[CODEX]` CRM E2E skipped 2건 재검토 + 플래키 모니터링
- `[CODEX]` 수금/지급 UX 개선분 실제 화면에서 필터/선택합계/누적보기 동작 수동 점검
- `[CODEX]` 파서 실패 fixture 수집 확대
- `[CODEX]` 메이크샵 주문/반품 원본 데이터에서 레지너스 6개 상품 주문건만 추출해 AS접수 시트에 과거 건 역입력
- `[CODEX]` 카카오톡/전화/게시판 CS 내역에서 레지너스 불량·반품 문의를 접수번호 기준으로 재정리
- `[CODEX-LEAD]` Flora frontdoor: open item 캐시 재빌드
- `[CODEX-LEAD]` Flora 텔레그램 방 라우팅 + task ledger

## Known Risks

- 이재혁 Chat ID 미확보 → 자동화 WF 3종 + 텔레그램 3방 활성화 불가
- 서버 이전 미실행 (flora-todo, n8n-staging → 플로라)
- ONBOARD-SEQ/PARTNER-ONBOARD WF 의도적 비활성 — 파트너클래스 런칭 전 재활성 금지
- WF-CRM-02/03 실건 검증 미완 (파서 정확도 지속 모니터링 필요)
- 2026-04-07 누락 입금 3건 수동 재처리 또는 CRM 반영 확인 필요
- 현재 샌드박스는 로컬 포트 listen이 막혀 있어 Playwright webServer 실구동 검증을 여기서 끝까지 할 수 없다. CRM E2E 최종 통과 여부는 사용자 로컬 셸에서 한 번 더 확인해야 한다.
- 재고 정리 스크립트는 오프라인 샘플 검증까지는 끝났지만, 실제 메이크샵 API 실호출은 키를 코드에서 제거했기 때문에 로컬 환경변수 또는 CLI 인자로 한 번 더 실행해야 한다.
