# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소와 하위 폴더를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

---

## 운영 모드

### 모드 A: 메인 프로젝트 (Claude Code 주도 → Codex 관리)

| 단계 | 담당 | 커밋 prefix |
|------|------|------------|
| 기획/아키텍처/신규 개발 | **Claude Code** | — |
| 테스트/리팩토링/버그수정 | **Codex CLI** | `[codex]` |

### 모드 B: 독립 프로젝트 (Codex 단독 총괄)

가벼운 프로젝트는 Codex CLI가 기획~배포까지 독립 수행. Next Step에 `[CODEX-LEAD]` prefix.

### 태스크 위임 표시

| prefix | 의미 |
|--------|------|
| `[CODEX]` | 모드 A — Codex가 보조 작업 수행 |
| `[CODEX-LEAD]` | 모드 B — Codex가 독립 주도 |
| (prefix 없음) | Claude Code 담당 |

### 공통 금지 사항 (모드 무관)

- `.secrets.env` 수정 금지
- `git push --force`, `git reset --hard` 금지
- Claude Code가 WRITE 중인 파일 수정 금지

### 모드 A 추가 금지 (보조 모드에서만)

- `n8n-workflows/*.json` 수정 금지
- 비즈니스 로직 임계값 변경 금지
- ROADMAP.md 수정 금지

---

## Mandatory Rules

1. 작업 시작 전에 이 파일과 `git status --short`를 먼저 확인합니다.
2. `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일을 수정하지 않습니다.
3. 첫 수정 전에 아래 `Session Lock`과 `Files In Progress`를 갱신합니다.
4. 작업 종료 전 `Last Changes`, `Next Step`, `Known Risks`를 갱신합니다.
5. `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행합니다.

## Session Lock

- Current Owner: IDLE
- Mode: —
- Started At: 2026-03-29 23:32:00 KST
- Branch: main
- Working Scope: 명세표 목록 상단 필터/검색 바 위계 정리
- Active Subdirectory: offline-crm-v2

## Files In Progress
- 없음

### [CODEX-LEAD] Gmail 보안메일 자동입금 1차 실동작 검증 완료 (CODEX)
- 변경
  - `offline-crm-v2/src/pages/DepositInbox.tsx`
    - 자동입금 수집원 라벨에 `Gmail 보안메일 연동` 추가
  - `offline-crm-v2/src/pages/Settings.tsx`
    - 자동입금 수집 방식에 `Gmail 보안메일 연동` 추가
    - 안내 문구를 NH API 전 임시 운영 구조에 맞게 정리
  - `n8n-main/pressco21/accounting-automation/scripts/generate-workflows.mjs`
    - NH 보안메일(VestMail/YettieSoft) HTML을 `textHtml` 또는 첨부 HTML에서 직접 복호화하도록 보정
    - 고정 비밀번호 `610227` 기반으로 `입금자명/금액/거래일` 추출
    - `Blob` 전역이 없는 n8n sandbox에서 동작하도록 안전화
  - `n8n-main/pressco21/accounting-automation/workflows/WF-CRM-02_Gmail_입금알림_수집.json`
    - collector workflow 재생성 및 live 재배포
- 검증
  - 실메일 발송: `presscobank@gmail.com` 으로 보안메일 샘플 재전송
  - live execution `58460`:
    - `Code: Parse Deposit Email` 성공
    - 추출값: `장지호 / 7,524원 / 2026-03-12`
    - `HTTP Call Intake Engine` 성공
  - live execution `58461`:
    - intake 응답 `ok: true`
    - 현재는 정확 일치 고객이 없어 `unmatched` 1건으로 큐 적재
  - CRM build/deploy 완료
  - 운영 확인:
    - 설정 화면에 `Gmail 보안메일 연동` 표시
    - 입금 수집함에 `장지호`, `7,524` 검토 항목 노출
- 참고
  - 지금 단계는 `보안메일 수집/복호화/전달` 검증 완료 상태다.
  - 정확 일치 자동반영은 고객명/입금자명 별칭/금액이 맞는 실제 운영 케이스에서 이어서 검증 필요.

## Last Changes
- offline-crm-v2 `명세표 작성/관리` 상단 필터/검색 바의 읽기 순서를 정리했다.
  - `src/pages/Invoices.tsx`
  - 필터 영역을 `조회 조건` 카드로 재구성하고, `거래처 검색 → 조회 기간 → 수금 상태 → 초기화` 순서로 다시 배치했다.
  - 날짜 필터에는 `오늘 / 최근 7일 / 이번달` 빠른 버튼을 추가해 자주 쓰는 조회를 바로 누를 수 있게 했다.
  - 현재 결과 건수와 조회 기간을 우측 요약 배지로 분리해, 지금 어떤 조건으로 보고 있는지 바로 이해되게 정리했다.
  - `초기화`는 실제로 기본 상태에서 벗어난 경우에만 노출되도록 조건도 바로잡았다.
- 검증
  - 로컬 브라우저에서 `/invoices` 상단 필터 카드 레이아웃 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
- offline-crm-v2 `명세표 작성/관리` 목록의 우측 액션 묶음 밀도를 정리했다.
  - `src/pages/Invoices.tsx`
  - `명세표`, `견적서`는 같은 인쇄 그룹 안에서 묶고, `수정/복사/삭제`는 별도 관리 그룹으로 분리했다.
  - 기능은 그대로 두고 시선 부담만 줄이는 방향으로 레이아웃을 정리했다.
- 화면 가이드 UX 방향도 다시 정리했다.
  - 현재처럼 `사이드바 하단 인라인 패널 + 단계형 투어 + 빠른 이동`을 한 컴포넌트에 몰아두는 구조는 계속 어색해질 가능성이 크다.
  - 다음 리디자인은 `사이드바 버튼만 남기고, 우측 Help drawer에서 가이드/빠른이동/투어를 분리`하는 방식이 가장 적합하다는 쪽으로 판단했다.
- 검증
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
- offline-crm-v2 사이드바 `화면 가이드` 액션 위계와 스크롤 충돌을 같이 정리했다.
  - `src/components/layout/AppGuideWidget.tsx`
  - 가이드 버튼은 닫힌 상태/열린 상태가 더 분명하게 보이도록 `화면 가이드 / 열기`와 `화면 가이드 열림 / 접기` 형태로 정리했다.
  - 패널은 예전처럼 사이드바 바깥으로 길게 뜨는 오버레이가 아니라, 사이드바 안에서 자연스럽게 펼쳐지는 인라인 패널로 바꿨다.
  - 투어 모드에서 스크롤 이벤트마다 `scrollIntoView`를 다시 호출하던 구조를 없애, 단계가 바뀔 때만 한 번 이동하고 이후에는 사용자가 자유롭게 아래로 더 스크롤할 수 있게 보정했다.
- 검증
  - 로컬 실브라우저에서 `/transactions` 기준 가이드 열기 후 페이지 스크롤이 하단까지 계속 내려가는 것 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
- offline-crm-v2 명세표 작성 다이얼로그의 하단 액션 버튼 위계를 정리했다.
  - `src/components/InvoiceDialog.tsx`
  - 하단 액션 바를 sticky footer처럼 보이도록 바꾸고, 저장 버튼은 우측 고정의 가장 강한 버튼으로 정리했다.
  - `인쇄 미리보기`, `임시저장`은 좌측 보조 액션으로 분리했고, `취소`는 우측 보조 버튼으로 정리했다.
  - `Ctrl+Enter 저장`, `Esc 닫기` 단축키 안내도 버튼 근처로 내려 상단 제목 영역 부담을 줄였다.
  - 새 명세표 저장 버튼 문구는 `명세표 발행` 대신 `저장`으로 단순화했다.
- 회귀 테스트도 현재 액션 버튼 문구 기준으로 보정했다.
  - `tests/02-invoices.spec.ts`
  - 신규 명세표 저장 버튼을 `저장` exact 매칭으로 찾도록 바꿔 `임시저장`과 충돌하지 않게 했다.
- 검증
  - 로컬 실브라우저에서 명세표 수정 다이얼로그 하단 액션 바 레이아웃 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
- offline-crm-v2 로그인 진입 시 UI가 두 번 뜨는 체감 문제를 앱 초기 마운트 기준으로 완화했다.
  - `src/main.tsx`
  - React `StrictMode`를 제거해 개발/실행 환경에서 같은 UI가 두 번 그려지는 체감을 줄였다.
  - 이 저장소 안에는 별도 CRM 로그인 화면 소스가 없어서, 이번 보정은 앱 루트 중복 마운트 완화 기준이다.
- 명세표 수정/미리보기 UX 회귀를 정리했다.
  - `src/components/ui/dialog.tsx`
  - `src/components/InvoiceDialog.tsx`
  - Dialog 기본 X 버튼을 옵션화하고, 인쇄 미리보기 모달이 열릴 때 부모 다이얼로그 X 버튼을 숨겨 우측 상단 X가 두 개 보이지 않게 했다.
  - 새 명세표 제목은 `새 거래명세표` 대신 `새 명세표`로 정리했다.
  - 수정 화면 `구분`은 `청구/영수`만 보이게 바꾸고 기본값은 `청구`로 고정했다.
- 명세표 저장/조회/출력의 구분값을 운영 기준으로 정규화했다.
  - `src/lib/invoiceDefaults.ts`
  - `src/lib/api.ts`
  - `src/pages/Invoices.tsx`
  - 레거시 `거래명세표/견적서/영수(청구)`는 저장 시 `청구/영수` 체계로 정리되도록 맞췄다.
  - 목록에서 `명세표`/`견적서` 출력 버튼을 눌렀다가 닫아도 현재 보고 있던 날짜 필터가 오늘로 되돌아가지 않게 `useSearchParams` 동기화 로직을 보정했다.
- 견적서 Safari 출력이 2페이지로 쪼개질 가능성을 줄이도록 인쇄 밀도를 더 압축했다.
  - `src/lib/print.ts`
  - 페이지 마진, 상단 메타, 표 행 높이, 비고/서명 블록 높이를 줄여 한 페이지 수용 여유를 늘렸다.
- 회귀 테스트도 현재 UX 기준으로 같이 갱신했다.
  - `tests/helpers.ts`
  - `tests/01-customers.spec.ts`
  - `tests/02-invoices.spec.ts`
  - 새 다이얼로그 제목 `새 명세표` 기준으로 회귀 테스트를 맞췄다.
- 검증
  - 로컬 실브라우저 클릭 확인
    - 수정 다이얼로그 `구분=청구/영수`만 표시
    - 인쇄 미리보기 우측 상단 X 1개만 표시
    - 목록 `명세표` 버튼 클릭 후에도 날짜 필터 `2026-03-13 ~ 2026-03-13` 유지
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
  - 운영 릴리스 배포 완료: `20260329222152-6d0dfd7-dirty`
  - 서버 확인: `/var/www/crm`, `/var/www/crm-current` 모두 `20260329222152-6d0dfd7-dirty` 가리킴
  - `curl -I -L https://crm.pressco21.com` → Basic Auth 앞단 `401 Unauthorized` 정상 응답
  - 위 릴리스의 `-dirty`는 코드 미커밋이 아니라 `AI_SYNC.md` 미정리 상태에서 배포한 영향이다. 이후 AI_SYNC 정리 커밋 후 clean 릴리스 재배포 예정.
- offline-crm-v2 견적서 출력의 `유효기간`을 `견적일자 + 14일`로 자동 계산하도록 보정했다.
  - `src/lib/print.ts`
  - 견적서 상단 메타에서 `유효기간`은 발행일과 동일값이 아니라 `invoice_date` 기준 14일 뒤 날짜로 출력된다.
  - 사업자번호/전화 표기도 견적서와 거래명세표 인쇄물 모두 일반적인 하이픈 형식으로 맞췄다.
- offline-crm-v2 입력 포맷 공통 함수를 추가하고 고객/공급처/설정/고객상세 편집에 자동 포맷을 연결했다.
  - `src/lib/formatters.ts`
  - `src/components/CustomerDialog.tsx`
  - `src/components/SupplierDialog.tsx`
  - `src/pages/Settings.tsx`
  - `src/pages/CustomerDetail.tsx`
  - `src/components/InvoiceDialog.tsx`
  - 전화/휴대폰은 `01098485520 → 010-9848-5520`, 사업자번호는 `2150552221 → 215-05-52221`처럼 입력 중 자동 변환된다.
  - 명세표 다이얼로그 고객 스냅샷과 날짜 정규화도 같은 공통 포맷 기준을 쓰게 맞췄다.
- 검증
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
  - 로컬 브라우저에서 설정 화면 raw 숫자 입력 시 자동 하이픈 포맷 확인
  - 운영 릴리스 배포 완료: `20260329213816-8acbe77`
  - 서버 확인: `/var/www/crm`, `/var/www/crm-current` 모두 `20260329213816-8acbe77` 릴리스 가리킴
  - `curl -I -L https://crm.pressco21.com` → Basic Auth 앞단 `401 Unauthorized` 정상 응답
- offline-crm-v2 견적서 출력에서 빈 행을 제거하고, 하단 비고/합계/서명 영역이 실제 품목 뒤로 바로 이어지게 바꿨다.
  - `src/lib/print.ts`
  - 기존처럼 남는 줄을 표에 억지로 채우지 않고, 실제 품목 수만큼만 렌더링한다.
  - 하단 요약 블록을 페이지 맨 아래로 밀던 `auto` 여백도 제거해 중간 공백이 크지 않게 조정했다.
- 명세표 작성 다이얼로그의 내부 스크롤도 함께 복구했다.
  - `src/components/InvoiceDialog.tsx`
  - `DialogContent`를 `flex column` 구조로 바꾸고, 본문 영역에 `min-h-0 flex-1 overflow-y-auto`를 적용해 하단까지 다시 내려가게 했다.
- 검증
  - 로컬 브라우저에서 견적서 `인쇄 미리보기` 확인: 품목 6개 뒤에 빈 행 없이 비고/합계가 바로 이어짐
  - 로컬 브라우저에서 명세표 수정 다이얼로그 스크롤 복구 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
  - 최종 운영 릴리스: `20260329212355-cdf1841`
- offline-crm-v2 명세표 작성 다이얼로그의 하단 `입금/잔액` 블록을 계산 근거가 보이도록 재구성했다.
  - `src/components/InvoiceDialog.tsx`
  - 왼쪽은 `입금 처리` 입력 카드, 오른쪽은 `잔액 계산` 카드로 분리했다.
  - 잔액 계산 카드에 `전잔액 / 이번 출고액 / 입금액 / 예치금 사용 / 현잔액`을 모두 표시해 계산식이 바로 보이게 했다.
  - 예치금을 쓰는 경우 상단 안내 배지와 계산 항목이 같이 보여 실제 반영 금액을 혼동하지 않게 했다.
- 검증
  - 로컬 브라우저에서 `/invoices?from=2026-03-27&to=2026-03-27` → 수정 다이얼로그 하단 블록 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
  - 최종 운영 릴리스: `20260329210511-0109497`
- offline-crm-v2 명세표 작성 다이얼로그 상단 UX를 입력 순서 기준으로 정리했다.
  - `src/components/InvoiceDialog.tsx`
  - 다이얼로그를 `헤더 고정 + 본문 스크롤` 구조로 바꿔 상단과 본문 경계를 분명히 했다.
  - 상단 입력 영역은 `거래처 / 발행일 / 발행번호` 중심으로 재배치하고, 참고 정보는 고객 카드에서 압축해서 보여주도록 정리했다.
  - `구분 / 전잔액 / 예치금 사용 / 비고`를 한 줄 흐름으로 다시 묶었고, 예치금 요약은 아래 2개 카드로 축약했다.
  - 품목 영역에는 자동완성 규칙 안내를 넣고, 테이블을 `table-fixed`로 바꿔 열 폭 흔들림을 줄였다.
- 검증
  - 로컬 브라우저에서 `/invoices?from=2026-03-27&to=2026-03-27` → 첫 행 수정 진입으로 새 상단 레이아웃 확인
  - `npm run build` → passed
  - `npm run test:regression` → 21 passed, 1 skipped
  - 최종 운영 릴리스: `20260329210010-57b9b1a`
- offline-crm-v2 견적서 출력 미리보기의 행 높이를 줄여 일반적인 문서 밀도로 정리했다.
  - `src/lib/print.ts`
  - 견적서 품목 테이블의 강제 확장 구조를 없애고, 하단 요약/서명은 `est-footer`로 페이지 하단에 고정했다.
  - 품목 헤더/본문 패딩과 글자 크기를 줄이고, 빈 행 높이도 얇게 조정했다.
  - 거래명세표 양식과 저장 로직은 건드리지 않았다.
- 릴리스형 배포 스크립트의 추적성을 보강했다.
  - `deploy/deploy-release.sh`
  - 커밋되지 않은 변경이 포함된 상태에서 배포하면 release id에 `-dirty`가 붙도록 수정했다.
  - 앞으로 릴리스 이름만 봐도 "커밋 기준 배포인지, 임시 배포인지" 바로 구분할 수 있다.
- 검증
  - 로컬 브라우저에서 `/invoices?from=2026-03-27&to=2026-03-27` → 첫 번째 명세표 수정 → `구분=견적서` → `인쇄 미리보기`로 실제 렌더링 확인
  - `npm run build` → passed
- offline-crm-v2에 비전공자도 따라갈 수 있는 AI 표준 개발 문서를 추가했다.
  - `docs/ai-senior-workflow.md`: 작업 브리프 → 기존 정상 동작 고정 → 작은 범위 수정 → 자동 검증 → 릴리스형 배포 → 운영 스모크 체크 흐름을 설명
  - `docs/templates/ai-task-brief.md`: 작업명/목표/영향 화면/수정 파일/건드리면 안 되는 동작/검증/배포 여부만 적는 짧은 템플릿 추가
- 운영 배포를 덮어쓰기 방식에서 릴리스 승격 방식으로 전환했다.
  - `deploy/deploy-release.sh`: `/var/www/releases/crm/<release-id>`에 새 빌드를 올리고 `/var/www/crm`, `/var/www/crm-current` 심볼릭 링크를 새 릴리스로 전환
  - `deploy/rollback-release.sh`: 원하는 release id로 즉시 롤백
  - `package.json`: `npm run deploy:release`, `npm run deploy:rollback -- <release-id>` 스크립트 추가
- 첫 릴리스형 배포를 실제 운영에 적용했다.
  - Release ID: `20260329204531-3960346`
  - 운영 서버 확인: `/var/www/crm`와 `/var/www/crm-current` 모두 새 릴리스를 가리킴
  - 운영 URL `https://crm.pressco21.com`는 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답
- 검증
  - `npm run test:regression` → 21 passed, 1 skipped
  - `npm run build` → passed
  - `bash -n deploy/deploy-release.sh`
  - `bash -n deploy/rollback-release.sh`
- offline-crm-v2 운영 회귀를 실브라우저로 다시 점검했다. `2026-03-29` 기준 운영 `/invoices`, `/customers/86`에서 고객 프리필, 주소 라벨, 명세표/견적서 실행 버튼, 품목 자동완성 단가 입력, 사이드바 가이드 동선을 직접 확인했다.
- 명세표 기본값/출력 기본값이 다시 흩어지지 않도록 `src/lib/invoiceDefaults.ts`를 추가했다. `거래명세표` 기본 구분과 허용 구분 목록을 `InvoiceDialog`, `api`, `print`가 공통으로 사용하게 정리했다.
- `src/lib/print.ts`의 레거시 fallback `영수`를 `거래명세표` 기준으로 맞췄다. 구분값이 비어 있는 인쇄 경로에서도 현재 운영 기본값과 출력값이 어긋나지 않는다.
- 기존 Playwright 회귀 검증이 현재 운영 UX를 따라가지 못하던 문제를 보정했다.
  - `tests/01-customers.spec.ts`: 고객 검색 placeholder 변경 대응, 고객 상세 → 명세표 작성 시 고객/주소 라벨 프리필 검증 추가
  - `tests/02-invoices.spec.ts`: 기본 구분 `거래명세표`, 오늘 날짜 필터, 행 우측 `명세표/견적서` 버튼, 품목 자동완성 시 고객 단가 입력 + 과세 유지 검증 추가
  - `tests/helpers.ts`: `/crm-proxy` 직접 정리 헬퍼 추가, `TEST-E2E-PLAYWRIGHT-` 테스트 명세표 자동 삭제 추가
  - `package.json`: `npm run test:regression` 스크립트 추가
- 회귀 테스트가 운영 데이터를 남기지 않도록 자동 정리 경로를 넣었고, 운영에 남아 있던 예전 테스트 찌꺼기 명세표 `TEST-E2E-PLAYWRIGHT` 1건도 직접 삭제했다.
- 검증
  - `npm run test:customers` → 10 passed
  - `npm run test:invoices` → 12 passed
  - `npm run test:regression` → 22 passed
  - `npm run build` → passed
- `bash deploy/deploy.sh`로 운영 재배포 완료. 서버 `index.html`이 새 번들 `index-Br6LT5NW.js`를 가리키는 것까지 확인했다.
- offline-crm-v2 명세표 작성/관리 페이지의 기본 조회 일자를 다시 오늘로 고정했다. URL에 날짜가 없으면 `from/to` 모두 오늘 날짜로 채워지고, 초기화도 오늘 날짜로 돌아간다.
- 명세표 목록 우측 액션에 `명세표`, `견적서` 출력 버튼을 복구했다. 사용자가 같은 건에서 원하는 문서 타입을 바로 선택해 출력할 수 있다.
- `src/lib/print.ts`에 빠져 있던 견적서 전용 템플릿과 estimate 출력 분기를 복원했다. 명세표 다이얼로그 미리보기도 `구분=견적서`일 때 견적서 양식으로 열린다.
- `src/lib/api.ts`의 `normalizeReceiptType` 허용값에 `거래명세표`, `견적서`를 다시 포함시켜 저장/복원 경로에서 새 구분값이 사라지지 않게 했다.
- 로컬 브라우저에서 `/invoices` 진입 시 날짜 필터가 `2026-03-27 ~ 2026-03-27`로 기본 설정되는 것, 목록 행에 `명세표/견적서` 버튼이 함께 보이는 것, 새 명세표에서 `구분=견적서` 선택 후 미리보기 iframe이 `견 적 서` 양식으로 렌더링되는 것을 확인했다.
- `npm run build` 통과 후 `bash deploy/deploy.sh`로 운영 재배포했고 build/upload/nginx test/reload까지 모두 성공했다.
- offline-crm-v2 명세표 작성 다이얼로그의 구분 옵션에서 빠졌던 `거래명세표`와 `견적서`를 복구했다. 새 명세표 기본값도 다시 `거래명세표`로 맞췄다.
- 기존 `영수/청구/영수(청구)` 값은 운영 데이터 호환을 위해 옵션에 함께 유지했다.
- 품목 자동완성/목록 선택 시 과세 체크 상태는 현재 행 기본값을 유지하면서, 단가는 다시 고객 단가 기준으로 자동 입력되도록 `InvoiceDialog`를 보정했다.
- 로컬 브라우저에서 새 명세표 기준으로 `거래명세표/견적서` 옵션 노출과 `UV레진/구미타입/25g` 선택 시 단가 `16,400`, 과세 해제 유지 동작을 확인했다.
- `npm run build` 통과 후 `bash deploy/deploy.sh`로 운영 재배포했고 build/upload/nginx test/reload까지 모두 성공했다.
- 이번 복구분은 `[codex]` 커밋으로 정리해 원격 `main`에도 반영한다.
- offline-crm-v2 명세표 품목 자동완성/목록 선택 회귀를 복구했다. 품목 선택 시 상품 마스터의 단가/과세를 다시 덮어쓰지 않고, 행의 현재 단가/과세 기본값을 유지하도록 `InvoiceDialog`를 보정했다.
- 복수 품목 선택 추가도 같은 정책으로 맞춰 새로 들어온 행이 상품 마스터 과세/단가를 자동주입하지 않도록 정리했다.
- 로컬 브라우저에서 새 명세표 기준 `UV레진/착색제/퍼플` 자동완성 선택 후 단가 `0`, 과세 체크 해제 상태가 그대로 유지되는 것을 확인했다.
- 이번 품목 선택 회귀 복구분을 `bash deploy/deploy.sh`로 운영 재배포했고, build/upload/nginx test/reload까지 모두 성공했다.
- 이번 배포분을 커밋/푸시해 회귀 복구 상태를 원격 기준으로도 고정한다.
- offline-crm-v2 명세표 작성 다이얼로그의 주소 선택 라벨도 고객 메타 `addressLabels`를 읽도록 보정했다. 이제 `주소1`, `주소extra_es:0` 같은 내부 키 대신 고객 상세에서 저장한 주소지 명이 그대로 보인다.
- 주소가 하나뿐인 고객도 다이얼로그 거래처 카드에서 라벨 배지 + 주소 본문으로 같은 이름 기준을 쓰게 맞췄다.
- 이번 주소 라벨 표시 보정분을 `bash deploy/deploy.sh`로 운영 재배포했고, build/upload/nginx test/reload까지 모두 성공했다.
- `curl -I -L https://crm.pressco21.com` 확인 결과 운영은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답 중이다.
- offline-crm-v2 화면 가이드를 전역 플로팅 위젯에서 빼고 좌측 사이드바 하단 영역으로 옮겼다. 기본은 버튼만 보이고 클릭했을 때만 패널이 열리도록 유지했다.
- 가이드 버튼은 사이드바 하단 정보의 상단에 배치해 작업 계정 카드보다 먼저 보이게 했고, 패널은 버튼 위로 열리게 해 본문 상단 액션을 기본 상태에서 가리지 않도록 정리했다.
- 고객 상세의 `명세표 작성` 버튼이 `/invoices?new=1`만 보내던 회귀를 복구했다. 이제 `customerId/customerName`을 함께 넘기고, 명세표 다이얼로그가 새 작성 시 해당 고객을 초기 거래처로 자동 선택한다.
- 초기 고객 프리필은 새 명세표 진입에서만 적용하고, 사용자가 이후 직접 바꾼 거래처를 다시 덮어쓰지 않도록 다이얼로그 초기화와 수동 선택 경로를 분리했다.
- 로컬 브라우저에서 고객 상세(`/customers/86`) 기준으로 사이드바 하단 가이드 위치와 `명세표 작성` 진입 시 `송윤경 회장님`이 기본 선택되는 흐름을 확인했다.
- `npm run build` 통과 후 `bash deploy/deploy.sh`로 운영 재배포했고, build/upload/nginx test/reload까지 모두 성공했다.
- `curl -I -L https://crm.pressco21.com` 확인 결과 운영은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답 중이다.
- offline-crm-v2 화면 가이드 토글을 카드 하단 좌측 대신 우측 고정 토글로 재배치했다. 모바일은 우하단, 데스크톱은 우측 중앙에 붙도록 조정했다.
- 가이드 패널은 같은 우측 축에서 열리게 바꿔 고객 상세 카드/하단 요약 영역 침범을 줄였다.
- 로컬 브라우저 스냅샷으로 고객 상세 화면 기준 위치를 확인했고, 이번 위치 개선분도 운영 재배포했다.
- 운영 URL은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답 중이다.
- offline-crm-v2 고객 메모 노출 버그를 보정했다. 화면용 메모 정리 로직이 `[LEGACY_*]` / `[ACCOUNTING_*]` 숨김 메타를 줄 단위뿐 아니라 줄 중간에 섞인 경우도 제거하도록 수정했다.
- 기존에 오염된 메모를 다시 저장할 때 숨김 메타가 visible memo로 재유입되지 않도록 `mergeDisplayMemo`와 legacy memo serializer도 함께 보정했다.
- 이번 메모 버그 수정분을 `bash deploy/deploy.sh`로 운영 재배포했고, build/upload/nginx reload까지 성공했다.
- 운영 URL은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답 중이다.
- offline-crm-v2 화면 가이드를 자동 팝업 대신 기본 접힘 상태로 바꿨다. 이제 첫 진입 시 본문 버튼 클릭을 막지 않고, 가이드가 있으면 작은 힌트 점만 표시한다.
- 가이드 위젯 래퍼는 `pointer-events-none`, 실제 버튼/패널만 `pointer-events-auto`로 두어 불필요한 클릭 차단을 줄였다.
- 가이드 패널은 `max-height`와 스크롤을 적용해 화면 상단 버튼 영역을 침범하지 않도록 보정했다.
- 이번 가이드 UX 개선분을 `bash deploy/deploy.sh`로 운영 재배포했고, build/upload/nginx reload까지 성공했다.
- 운영 URL은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답 중이다.
- offline-crm-v2 주소 3개 이상 저장 보정과 가이드 버튼 도킹 위치 조정분을 `bash deploy/deploy.sh`로 운영 재배포했다.
- 재배포 후 build, 업로드, nginx config test, reload가 모두 성공했고, 운영 URL은 Basic Auth 앞단에서 `401 Unauthorized`로 정상 응답했다.
- offline-crm-v2 고객 상세 주소 저장 구조를 운영 스키마 기준으로 보정했다. `address1/address2/extra_addresses(JSON)` 조합으로 저장하도록 수정해 3번째 주소부터도 유지된다.
- 주소 읽기 헬퍼를 `src/lib/api.ts`에 추가하고 고객 상세, 명세표 작성, 명세표 목록이 같은 주소 해석 기준을 쓰도록 맞췄다.
- 운영 프록시 실검증으로 `extra_addresses: [\"A3\",\"A4\"]` 저장/조회가 되는 것을 확인했다.
- 화면 가이드 버튼은 전역 위젯이었고, 현재 고객 계열 화면에서 `left` 도킹을 쓴다. 도킹 위치를 사이드바 `w-60` + 페이지 좌측 패딩 기준인 `calc(15rem + 1.5rem)`으로 조정했다.
- 로컬 브라우저 스냅샷으로 고객 관리 화면에서 가이드 버튼 위치를 확인했다.
- offline-crm-v2 주소 라벨/분리 거래명 매칭 보정 변경분을 `bash deploy/deploy.sh`로 운영 서버에 배포했다.
- 배포 스크립트에서 build, 파일 업로드, nginx config test, reload까지 모두 성공했다.
- `curl -I -L https://crm.pressco21.com` 확인 결과 운영은 Basic Auth 앞단에서 `401 Unauthorized`로 응답해 서버 자체는 정상 응답 중이다.
- offline-crm-v2 고객 상세 기본정보 편집에서 주소별 `주소지 명 + 주소`를 함께 입력/표시할 수 있도록 개선했다.
- 주소지 명은 고객 메모 숨김 메타(`[ACCOUNTING_CUSTOMER_META]`)의 `addressLabels`로 저장해 기존 `address1~address10` 구조를 유지했다.
- 고객 목록 `분리 거래명`이 `(주)에스피랩`으로 과다 노출되던 원인을 확인했고, 괄호로 시작하는 거래명의 root 추출이 빈 문자열이 되어 `includes('')`로 전 고객에 매칭되던 조건을 보정했다.
- `src/lib/receivables.ts`의 동일 alias 추론 조건도 같이 보정해 후속 미수/연결 로직과 기준을 맞췄다.
- `npm run build` 통과로 타입체크와 프로덕션 번들 생성까지 확인했다.
- Gmail 보안메일 기반 자동입금 수집 경로를 live n8n에서 실동작 검증했다.
- CRM 설정/입금 수집함에 `Gmail 보안메일 연동` 표기를 추가하고 운영 배포했다.
- 명세표 발행 시 `items` 테이블 bulk POST 404를 재현했고, 라인아이템 저장을 개별 생성/삭제 방식으로 바꿔 운영 배포했다.
- 실제 NH 보안메일 2건(`장지호 2,000원`, `장다경 5,000원`)을 첨부 HTML 기준으로 직접 복호화해 검증했다.
- `장지호 2,000원`은 부분 입금 review, `장다경 5,000원`은 초과 입금 review로 intake 엔진이 정확히 분류함을 확인했다.
- Gmail collector가 `UNSEEN` 메일만 읽도록 돼 있어 사용자가 메일을 먼저 열면 자동수집에서 누락되는 문제를 확인했고, 해당 필터를 제거해 재배포했다.
- `DepositInbox`에서 검토 반영 후 처리 상태가 끝나지 않던 흐름을 보정했고, 초과 입금은 검토 큐에서 바로 예치금으로 적립되도록 처리 경로를 추가했다.
- Playwright 실검증 결과 `장지호 2,000원`/`장다경 5,000원` 둘 다 검토 큐에서 반영 완료되며, 장다경 초과분 `1,700원`은 예치금으로 적립됨을 확인했다.

## Next Step
- 화면 가이드는 개별 미세조정보다 `Help drawer` 패턴으로 재설계하는 안을 별도 작업으로 잡는다.
- `명세표 작성/관리` 상단 필터 영역을 실제 운영 사용감 기준으로 한 번 더 보고, 필요하면 모바일 폭에서 줄바꿈과 라벨 밀도만 미세조정한다.
- 명세표 작성 다이얼로그 상단 제목 줄의 단축키/설명 문구를 더 줄일지 검토한다.
- 목록 화면 우측 실행 버튼 묶음의 밀도와 버튼 라벨 길이도 같은 기준으로 다듬을지 검토한다.
- 실제 Safari에서 견적서 인쇄 1페이지 유지 여부를 운영 환경에서 한 번 더 확인한다.
- 인쇄 회귀까지 잡을 수 있게 견적서 DOM 기반 검증 또는 스냅샷 테스트를 추가할지 결정한다.
- 회귀 위험이 큰 흐름부터 작업 브리프를 실제로 붙여서 운영한다.
- 새 릴리스형 배포 스크립트 기준으로 다음 CRM 배포부터 `npm run deploy:release`를 기본 경로로 사용한다.
- 목록의 `명세표`/`견적서` 버튼을 실제 인쇄 직전까지 눌렀을 때 브라우저 인쇄 다이얼로그 전 단계 미리보기까지 원하는 양식으로 열리는지 한 번 더 확인
- `목록에서 선택` 다중 품목 추가 경로도 `고객 단가 자동입력 + 과세 유지` 회귀 기준으로 같은 테스트를 추가할지 결정
- 필요하면 이번 회귀 검증 스크립트(`npm run test:regression`)를 배포 전 체크리스트에 포함
- 고객 생성/수정 다이얼로그까지 주소지 명 입력 UX를 확장할지 결정한다.
- 운영 데이터에서 `customer_name`이 괄호형 법인명인 미수 명세표 몇 건을 열어 고객 목록/미수금 화면 노출이 기대대로 줄었는지 확인한다.
- 실제 농협 보안메일 3~5건으로 제목/본문 변형 포맷 추가 보정
- 고객 상세에 `입금자명 별칭`을 더 적극적으로 등록해 정확 일치 자동반영률 높이기
- NH API 승인 후 collector 수집원만 교체하고 intake 엔진은 그대로 재사용
- 자동입금 검토 큐에서 부분 입금/초과 입금을 직원이 바로 확정 처리하는 운영 검증을 이어간다.
- 자동입금 검토 큐에서 동일 고객 다중 명세표 우선순위 제안 정책을 구체화한다.

## Known Risks
- `명세표 작성/관리` 상단 필터 카드에 빠른 기간 버튼을 넣었기 때문에, 모바일에서는 버튼 줄바꿈 밀도가 사용감에 영향을 줄 수 있다. 운영 화면에서 한 번 더 보는 편이 안전하다.
- 화면 가이드는 스크롤 버그는 완화됐지만, 구조 자체는 아직 임시 정리 상태다. 장기적으로는 별도 Help drawer 패턴으로 분리하는 편이 맞다.
- 가이드 투어는 단계 변경 시에는 여전히 해당 요소로 한 번 이동한다. 이건 의도된 동작이지만, 특정 화면에서 너무 급하게 움직인다고 느끼면 이동 방식만 따로 완화할 여지가 있다.
- 새 명세표 저장 버튼 문구를 `저장`으로 단순화했기 때문에, 내부 직원이 기존 `명세표 발행` 문구에 익숙했다면 짧게 달라졌다고 느낄 수 있다. 기능 동선은 그대로다.
- 이 저장소에는 별도 CRM 로그인 화면 소스가 없어, `로그인 UI 두 번` 현상은 앱 루트 중복 마운트 기준으로만 완화했다. 만약 서버 Basic Auth 프롬프트 중복이라면 nginx/auth 레이어를 따로 봐야 한다.
- Safari 견적서 2페이지 분리는 CSS를 보수적으로 줄여 완화했지만, 실제 Safari 인쇄 엔진에서 최종 1페이지 유지 여부는 운영 브라우저에서 한 번 더 확인하는 편이 안전하다.
- `구분`을 `청구/영수` 체계로 정리했기 때문에, 과거 데이터의 `거래명세표/견적서/영수(청구)`는 저장/수정 시 정규화된다. 레거시 문구 자체를 그대로 유지해야 하는 업무가 있다면 별도 요구사항 확인이 필요하다.
- 견적서 품목 수가 매우 많아 2페이지 이상 넘어가는 케이스는 이번에 직접 실브라우저로 확인하지 않았다. 다만 구조상 첫 페이지/속지 분기 로직은 건드리지 않았다.
- 첫 릴리스형 배포는 정상 전환됐지만, 이후 운영자가 `deploy/deploy.sh` 구형 덮어쓰기 스크립트를 다시 쓰면 릴리스 구조를 우회하게 된다. 앞으로는 `deploy/deploy-release.sh`를 기본으로 써야 한다.
- `npm run deploy:rollback`은 release id를 인자로 받아야 하므로, 실제 사용 시 `npm run deploy:rollback -- <release-id>` 형식을 지켜야 한다.
- 현재 견적서 `유효기간`은 별도 데이터 필드 없이 `견적일자 + 14일` 규칙으로 계산한다. 거래처별 다른 유효기간 정책이 필요해지면 별도 필드 추가가 맞다.
- 명세표 목록 기본 날짜를 오늘로 고정했기 때문에, 사용자는 첫 진입 시 과거 문서를 바로 못 볼 수 있다. 이는 요청 의도에는 맞지만 과거 전체 조회 동선과는 트레이드오프다.
- 현재 구분 값은 `거래명세표/견적서`와 레거시 `영수/청구/영수(청구)`를 함께 허용한다. 출력물/조회 필터가 신규 값까지 모두 기대대로 다루는지 운영 재확인이 필요하다.
- 품목 선택 정책이 최근 두 번 바뀌었기 때문에, 앞으로는 `단가 자동입력 + 과세 유지`를 회귀 기준으로 테스트로 고정하는 편이 안전하다.
- 가이드 위치와 명세표 기본 고객 선택은 `2026-03-29` 운영 실브라우저에서 다시 확인했지만, 인쇄 다이얼로그 직전 단계까지의 최종 출력 smoke는 추가 여지가 있다.
- 현재 보안메일 비밀번호 규칙이 바뀌면 파서를 같이 수정해야 한다.
- 동일 입금자명/금액 중복 케이스는 계속 검토 큐로 보내는 것이 안전하다.
- 브라우저에서 메일을 먼저 열어도 놓치지 않도록 collector는 수정했지만, 이미 놓친 과거 메일은 수동 재전송 또는 첨부 HTML 재처리가 필요하다.

### [CODEX-LEAD] 등급체계 변경 가드 + WF-10 교육 live 복구 완료 (CODEX)
- 원인
  - 등급체계 변경 리스크는 실제 장애 원인이었고, 저장 enum(`SILVER/GOLD/PLATINUM`)과 표시 등급(`BLOOM/GARDEN/ATELIER/AMBASSADOR`)이 다시 어긋나면 승인/승급 workflow가 재차 깨질 수 있다.
  - live `WF-10`은 repo와 달리 아직 구버전(`score/total`) 웹훅이었고, answers 배열 방식이 실배포되지 않은 상태였다.
  - live `WF-10`의 파트너 교육 완료 PATCH URL은 table id가 아니라 `tbl_Partners` literal 경로라 `ERR_TABLE_NOT_FOUND`로 실패했다.
- 수정/배포
  - `docs/파트너클래스/partner-grade-change-playbook.md`
  - `scripts/partnerclass-grade-change-audit.js`
  - `docs/파트너클래스/README.md`
  - `파트너클래스/교육/js.js`
  - `파트너클래스/n8n-workflows/WF-10-education-complete.json`
  - live `WF-10 Education Complete (aOtPOKVwyVfCQ6fq)` 재배포 완료, 백업은 `output/n8n-backups/20260312-wf10-sync/`에 저장
- 검증
  - `node --check scripts/partnerclass-grade-change-audit.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/교육/js.js`
  - `jq empty 파트너클래스/n8n-workflows/WF-10-education-complete.json`
  - `node scripts/partnerclass-grade-change-audit.js`
  - `POST /webhook/education-complete` with `member_id=jhl9464`, `answers[15]` -> `passed=true`, `score=15`
  - `getEducationStatus(jhl9464)` -> `education_completed=Y`, `education_date=2026-03-12`, `education_score=15`
  - Playwright live 검증:
    - `2610` -> `교육을 이미 이수하셨습니다`
    - `8009` -> 강의 등록 폼 전체 노출
    - `2608` -> 온보딩 체크리스트에서 `교육 이수` 단계 `완료` 표시
- 참고
  - `파트너클래스/교육/js.js`의 Q15는 등급 순서 문항 대신 `강의 등록 전 필수 교육 이수` 문항으로 바꿨다. live 카피까지 맞추려면 메이크샵 `2610` JS 재저장이 한 번 더 필요하다.
  - 증적 스크린샷:
    - `output/playwright/mcp/2610-education-complete-jhl9464.png`
    - `output/playwright/mcp/8009-registration-form-jhl9464.png`

### [CODEX-LEAD] partner approval/auth live recovery 완료 (CODEX)
- 원인
  - live `WF-08`이 `tbl_Partners.grade` enum 제약(`SILVER/GOLD/PLATINUM`)과 충돌하는 `BLOOM`을 저장하려다 실패해서 신청은 `APPROVED`로 바뀌었지만 파트너 row 생성이 중간에 끊겼다.
  - live `WF-02`는 `applied_date` 정렬 필드와 분기 노드 문제로 `getPartnerAuth/getPartnerApplicationStatus`가 잘못 응답했다.
  - live `WF-ADMIN`은 `getApplications` 상태 필터를 무시하고 사실상 `PENDING`만 조회했다.
- 수정/배포
  - `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`
  - `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
  - `파트너클래스/n8n-workflows/WF-13-grade-update.json`
  - `scripts/partnerclass-s2-7-patch-partner-auth.js`
  - live n8n API로 4개 워크플로우를 재배포했고 백업은 `output/n8n-backups/20260312-partner-auth-fix/`에 저장했다.
- 복구 결과
  - `admin-api getApplications(status=APPROVED)`가 정상 동작하고 `jhl9464` 승인 건이 관리자 UI `8011` 승인됨 필터에 노출된다.
  - `approveApplication` 재실행으로 `jhl9464 -> PC_202603_001` 파트너 row 생성 완료 (`grade=SILVER`, `commission_rate=0.25`, `status=active`).
  - `partner-auth getPartnerAuth/getPartnerApplicationStatus/getPartnerDashboard`가 live 기준 정상 JSON 응답으로 복구됐다.
- 실사용 계정 검증
  - 파트너 `jhl9464`: `2608` 대시보드 정상 진입, `8009`는 인증 실패가 아니라 `교육 이수 후 이용 가능합니다` 게이트로 정상 차단
  - 일반 회원 `PRESSCO000`: `8010` 마이페이지 정상 진입
  - 관리자 `jihoo5755`: `8011` 관리자 대시보드 정상 진입, 승인됨 필터에서 `이재혁 / 열혈남아공방` 확인
- 참고
  - 현재 live `admin-api` 인증은 여전히 구형 토큰 `pressco21-admin-2026` 기준이다.
  - 기존에 이미 `강사회원`인 회원이 신청해도 이제 승인 복구가 가능하다. MakeShop 그룹 승격 여부와 무관하게 `tbl_Partners` row 생성/복구가 핵심이다.

### [CODEX-LEAD] Phase 3 S3-1 신규 테이블 4종 생성 완료 (CODEX)
- 스크립트 / 문서
  - `scripts/partnerclass-s3-1-create-tables.js`
    - live NocoDB meta API 기준 `create/reuse table -> add missing columns -> sample rows upsert` 자동화
  - `scripts/partnerclass-s3-1-schema-runner.js`
    - Playwright `APIRequestContext` 로 4개 신규 table, 필수 컬럼, 샘플 row 재검증
  - `docs/파트너클래스/s3-1-schema-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- live 생성 결과
  - `tbl_Seminars`: `m9gh6baz3vow966`
  - `tbl_Affiliation_Products`: `mm75dgbohhth2ll`
  - `tbl_Affiliation_Content`: `mit4xyrzn4s81b9`
  - `tbl_Vocabulary`: `mhf2e1hqj5vqmi5`
  - 기준 협회 row: `KPFA_001 / 한국꽃공예협회`
- 검증
  - `node --check scripts/partnerclass-s3-1-create-tables.js`
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node --check scripts/partnerclass-s3-1-schema-runner.js`
  - `node scripts/partnerclass-s3-1-create-tables.js`
  - `node scripts/partnerclass-s3-1-create-tables.js` 2차 재실행
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-1-schema-runner.js`
  - 결과:
    - 샘플 row 매칭:
      - seminars `2/2`
      - affiliation products `3/3`
      - affiliation content `3/3`
      - vocabulary `8/8`
    - 2차 재실행 시 신규 insert 없이 update 만 수행되어 idempotent 확인
  - 산출물:
    - `output/playwright/s3-1-schema/schema-create-results.json`
    - `output/playwright/s3-1-schema/schema-results.json`

### [CODEX-LEAD] Phase 3 S2-9 묶음 키트 + 선택형 완료 (CODEX)
- 메이크샵
  - `파트너클래스/강의등록/Index.html`, `css.css`, `js.js`
    - `kit_bundle_branduid` 입력 추가
  - `파트너클래스/상세/Index.html`, `css.css`, `js.js`
    - `강의만 수강 / 키트 포함 수강` 선택 UI 추가
    - 실상품 상세가 hydrate 로 묶음 키트 가격 보정
    - `WITH_KIT` 선택 시 선물하기 비활성, 클래스 상품 + 키트 상품 동시 장바구니 처리
  - `파트너클래스/파트너/js.js`
    - 클래스 수정 모달에 묶음 키트 branduid 편집 추가
- 워크플로우 / 서버
  - `scripts/server/partnerclass-s2-9-add-kit-bundle-field.sh`
    - `tbl_Classes.kit_bundle_branduid` 물리 컬럼, 메타, 기본 view 컬럼 추가
  - `scripts/partnerclass-s2-9-patch-workflows.js`
    - `WF-01A/WF-05/WF-16/WF-17/WF-20` S2-9 구조 패치 스크립트 추가
  - `scripts/partnerclass-s2-9-deploy-workflows.js`
    - 위 5개 WF 백업 + 재배포 자동화
  - `파트너클래스/n8n-workflows/WF-01A-class-read.json`
    - 상세 응답에 `kit_bundle_branduid` 추가
  - `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json`
    - `order_id` 기준 클래스/묶음키트 동시 주문 판정, 키트 처리 분기 추가
  - `파트너클래스/n8n-workflows/WF-16-class-register.json`
    - `kit_bundle_branduid` 저장 지원
  - `파트너클래스/n8n-workflows/WF-17-class-approve-auto.json`
    - 클래스 상품 생성 후 묶음 키트 상품 2단 생성 분기 추가
  - `파트너클래스/n8n-workflows/WF-20-class-edit.json`
    - 묶음 키트 branduid 수정/초기화 지원
- 문서 / 메모리
  - `docs/파트너클래스/kit-bundle-selection-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- 검증
  - 메이크샵 정적 검증:
    - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/상세/js.js 파트너클래스/강의등록/js.js 파트너클래스/파트너/js.js`
  - 로컬 Playwright:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-9-kit-bundle-runner.js`
    - 결과: `output/playwright/s2-9-kit-bundle/kit-bundle-results.json`, `kit-bundle-flow.png`
    - 확인값:
      - `CLASS_ONLY`: `amount=52000`, 장바구니 1건
      - `WITH_KIT`: `amount=52000`, `kit_bundle_branduid=KIT9001`, 장바구니 2건
      - `WITH_KIT` 시 선물하기 비활성
      - 실상품 상세가 hydrate 로 최종 금액 `75,000원` 확인
  - 라이브 반영:
    - `ssh ... < scripts/server/partnerclass-s2-9-add-kit-bundle-field.sh`
    - `node scripts/partnerclass-s2-9-deploy-workflows.js`
    - 활성 클래스 `CL_202602_662` 기준 `getClassDetail(id)` 응답에 `kit_bundle_branduid` 필드 포함 확인
    - n8n API 기준 `WF-17 IF Product Kind Class`, `WF-05 Filter Class Orders / Process Kit Order`, `WF-20 Process Edit` 존재 확인

### [CODEX-LEAD] Phase 3 S2-10 테스트 데이터 시뮬레이션 완료 (CODEX)
- 스크립트 / 문서
  - `scripts/partnerclass-s2-10-demo-data.js`
    - `dry-run / apply / cleanup` 3모드 지원
    - live NocoDB에 `[TEST][DEMO]` 배치 입력
    - 클래스는 `closed` 상태로 생성해 공개 노출 차단
  - `scripts/partnerclass-s2-10-demo-runner.js`
    - 로컬 fixture + Playwright 기준 수강생/파트너/관리자 3시나리오 검증
  - `docs/파트너클래스/demo-simulation-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 라이브 NocoDB 입력
  - `node scripts/partnerclass-s2-10-demo-data.js --apply`
  - 검증값:
    - `partners=5`
    - `classes=15`
    - `schedules=30`
    - `settlements=50`
    - `reviews=30`
- 로컬 Playwright
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-10-demo-runner.js`
  - 결과: `output/playwright/s2-10-demo/demo-results.json`
  - 스크린샷:
    - `demo-student-flow.png`
    - `demo-partner-flow.png`
    - `demo-admin-flow.png`
  - 확인값:
    - 학생 목록 15개, 서울 필터 후 3개
    - 상세 예약 `WITH_KIT`, 장바구니 2건
    - 파트너 액션 보드 3카드 활성
    - 관리자 정산 탭 요약/이력 + 실패 토스트 확인

### [CODEX-LEAD] Phase 3 S2-11 Phase 3-2 통합 테스트 완료 (CODEX)
- 스크립트 / 문서
  - `scripts/partnerclass-s2-11-growth-integration-runner.js`
    - `S2-10 demo runner`, `S2-8 cache runner` 재실행
    - 세일즈 랜딩 신청, 협회 B2B 제안/ROI, 혜택 허브 검증
    - live `WF-01` router/split 회귀 비교
    - live n8n execution API 기준 `L3 staticData cache miss -> hit` 검증
  - `docs/파트너클래스/phase3-2-integration-test.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check scripts/partnerclass-s2-11-growth-integration-runner.js`
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-11-growth-integration-runner.js`
  - 결과: `output/playwright/s2-11-phase3-2/phase3-2-results.json`
  - 핵심 확인값:
    - 파트너 신청 success id `APP_S2_11_001`
    - 데모 온보딩 `3/5 완료`, 첫 예약 `WITH_KIT`, 장바구니 `2건`
    - 협회 제안서 `35,280,000원 / 3단계`, 혜택 카드 `5개`
    - L1 repeat hit `100%`
    - L2 categories/affiliations repeat hit `100%`
    - L3 categories miss/hit execution `49214/49215`, affiliations `49216/49217`
    - `WF-01` router/split `getClasses/getClassDetail/getCategories/getAffiliations/getContentHub/getSchedules/getRemainingSeats` body 일치
- 문서: `docs/파트너클래스/phase3-2-integration-test.md`

### [CODEX-LEAD] Phase 3 S2-8 3계층 캐싱 도입 완료 (CODEX)
- 프론트
  - `파트너클래스/목록/js.js`
    - 목록 `5분`, 카테고리/협회 `1시간` cache 분리
    - `classCatalog_*`, `classSettings_*`, version key(`pressco21_catalog_cache_version`, `pressco21_catalog_settings_cache_version`) 도입
    - `getAffiliations` localStorage cache 추가
  - `파트너클래스/상세/js.js`
    - 후기/예약 성공 시 상세 cache 삭제 + 목록 cache prefix 삭제 + catalog version key 갱신
- 워크플로우 / 스크립트
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
    - split generator 기본 source 를 `WF-01A/B/C + router` 개별 파일 기준으로 재정렬
    - `WF-01A getCategories`, `WF-01C getAffiliations` 에 `Check Cache -> Switch Cache -> Store Cache` 구조 추가
    - cache 분기는 `IF` 대신 `Switch(HIT/MISS)` 로 안정화
  - `파트너클래스/n8n-workflows/WF-01A-class-read.json`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - detail fixture `user_id` 치환 추가
  - `scripts/partnerclass-s2-8-cache-runner.js`
- 문서 / 메모리
  - `docs/파트너클래스/cache-layering-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 검증
  - 메이크샵 정적 검증:
    - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/목록/js.js 파트너클래스/상세/js.js`
  - 로컬 Playwright:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-8-cache-runner.js`
    - 결과: `output/playwright/s2-8-cache/cache-results.json`, `cache-flow.png`
    - 확인값:
      - 첫 목록 진입 `getClassesList=1`, `getCategories=1`
      - 재진입 시 추가 호출 없음
      - 협회 탭 첫 진입 `getAffiliations=1`, 재진입 시 추가 호출 없음
      - 상세 후기 등록 후 `catalogVersion` 갱신 + `classCatalog_*` 삭제
      - TTL 강제 만료 후 `getClassesList/getCategories/getAffiliations` 각각 재호출
  - 라이브 n8n:
    - `node scripts/partnerclass-s2-4-deploy-wf01-split.js`
    - `POST /webhook/class-api-read { action: "getCategories" }` 정상
    - `POST /webhook/class-api-affiliation { action: "getAffiliations" }` 정상
    - `POST /webhook/class-api { action: "getCategories" | "getAffiliations" }` 정상
    - execution log 기준 warm miss 1회 후 cache-hit branch only 확인
      - categories miss `49046`, hit `49047`, `49051`
      - affiliations miss `49048`, hit `49049`, `49053`

### [CODEX-LEAD] Phase 3 S2-7 파트너 이탈 감지 자동화 1차 완료 (CODEX)
- 워크플로우 / 스크립트
  - `scripts/server/partnerclass-s2-7-add-last-active-field.sh`
    - `tbl_Partners.last_active_at` 물리 컬럼 추가, 기존 row 초기값 채움
  - `scripts/partnerclass-s2-7-patch-partner-auth.js`
    - `WF-02` 를 POST 전용으로 정리
    - `Switch v3.2 rules.values` 보정
    - `getPartnerDashboard` 수집 경로를 직렬화
    - `last_active_at` 갱신을 code `fetch` 대신 NocoDB credential PATCH 노드로 교체
  - `scripts/partnerclass-s2-7-generate-churn-workflow.js`
    - 신규 `WF-CHURN Partner Risk Monitor` 생성
    - `Get Partners -> Get Classes -> Get Schedules -> Get Reviews -> Get Email Logs` 직렬 수집 구조 적용
    - 이메일 로그 스키마를 `recipient / email_type / status / error_message` 기준으로 보정
    - `Telegram Summary` 에러가 최종 응답을 덮지 않도록 `Restore Final Response` 경로 추가
    - 메일 실패 시 `PARTNER_CHURN_EMAIL_FAILED` 구조화 오류 반환
  - `scripts/partnerclass-s2-7-deploy-workflows.js`
  - `scripts/partnerclass-s2-7-churn-runner.js`
  - `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`
  - `파트너클래스/n8n-workflows/WF-CHURN-partner-risk-monitor.json`
- 문서 / 메모리
  - `docs/파트너클래스/partner-churn-monitor-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 검증
  - 서버 스크립트 실행 결과 `last_active_at 채워진 파트너 수 = 6`
  - `POST /webhook/partner-auth` 정상 JSON 응답 + `last_active_at` row 갱신 확인
  - dry run
    - 현재일 `2026-03-11` → `risk_count=0`
    - 미래일 `2026-06-15` → `risk_count=1`
  - send mode
    - `PARTNER_CHURN_EMAIL_FAILED` 구조화 오류 응답 확인
    - `tbl_EmailLogs` 실패 row 적재 확인 (`PARTNER_NOTIFY / FAILED`)
  - Playwright request 검증:
    - `output/playwright/s2-7-partner-churn/churn-results.json`
