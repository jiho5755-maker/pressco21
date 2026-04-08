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
- Started At: 2026-04-08 19:05:00 KST
- Branch: main
- Working Scope: 레지너스 6개 상품 AS/반품 관리 체계 문서화 및 추적 양식 생성
- Active Subdirectory: docs, output/spreadsheet

## Files In Progress
- —

## Last Changes

> 전체 이력: `archive/ai-sync-history/`

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
- `[CODEX]` WF-CRM-02/03 실건 검증 (입금/감사 루프)
- `[CODEX]` 재고 정리 스크립트를 실제 메이크샵 키로 한 번 실행해 live CSV와 manifest가 기대대로 나오는지 확인
- `[CODEX]` CRM E2E 수정분을 로컬에서 `npx playwright test tests/04-transactions.spec.ts tests/09-calendar.spec.ts --reporter=list`로 재실행해 skip 제거 여부 확인
- `[CODEX]` CRM E2E skipped 2건 재검토 + 플래키 모니터링
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
