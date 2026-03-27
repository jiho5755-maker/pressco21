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
- Started At: 2026-03-27 10:20:00 KST
- Branch: main
- Working Scope: —
- Active Subdirectory: —

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
- 운영 Basic Auth 로그인 후 품목 자동완성/목록 선택에서 단가·과세 기본값 유지가 실제 저장 직전 화면에서도 일관된지 재확인
- 운영 Basic Auth 로그인 후 사이드바 하단 가이드 버튼 위치와 클릭 시 패널 동선을 실브라우저로 한 번 더 확인
- 운영에서 고객 상세 → 명세표 작성 진입 시 실제 고객 기본 선택이 유지되는지 저장 직전 단계까지 재확인
- 운영 Basic Auth 로그인 후 고객 상세 상단 액션 버튼들이 가이드 접힘 상태에서 바로 클릭되는지 실브라우저 확인
- 고객 상세에서 주소 3개 이상을 실제 저장/새로고침으로 재검증
- 운영 Basic Auth로 로그인한 뒤 고객 상세/고객 목록 화면에서 실제 UI가 의도대로 보이는지 브라우저 확인
- 필요하면 이번 배포분을 별도 `[codex]` 커밋으로 정리하고 원격에 push
- 고객 생성/수정 다이얼로그까지 주소지 명 입력 UX를 확장할지 결정한다.
- 운영 데이터에서 `customer_name`이 괄호형 법인명인 미수 명세표 몇 건을 열어 고객 목록/미수금 화면 노출이 기대대로 줄었는지 확인한다.
- 실제 농협 보안메일 3~5건으로 제목/본문 변형 포맷 추가 보정
- 고객 상세에 `입금자명 별칭`을 더 적극적으로 등록해 정확 일치 자동반영률 높이기
- NH API 승인 후 collector 수집원만 교체하고 intake 엔진은 그대로 재사용
- 자동입금 검토 큐에서 부분 입금/초과 입금을 직원이 바로 확정 처리하는 운영 검증을 이어간다.
- 자동입금 검토 큐에서 동일 고객 다중 명세표 우선순위 제안 정책을 구체화한다.

## Known Risks
- 품목 선택 시 단가/과세 자동주입은 의도적으로 꺼둔 상태다. 추후 다시 상품 마스터값 자동반영을 원하면 단일 경로(`selectProduct`/`handleMultiPicked`) 기준으로만 되살려야 회귀를 막을 수 있다.
- 가이드 위치와 명세표 기본 고객 선택은 로컬 브라우저 기준으로는 확인했지만, 운영 Basic Auth 로그인 상태의 최종 실화면 검증은 아직 남아 있다.
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

## Last Changes (2026-03-09 ~ 2026-03-12)

### [CODEX] CRM 명세표 작성 고객 링크 404 수정 (2026-03-12)
- 원인
  - `src/pages/Invoices.tsx`의 고객 링크 조회가 live `customers` 테이블에 없는 `address3~address10` 필드를 같이 요청하고 있었다.
  - 명세표 작성 다이얼로그 진입 시 `/crm-proxy`가 `Field not found`로 404를 반환하면서 콘솔 오류가 반복됐다.
- 수정
  - `offline-crm-v2/src/pages/Invoices.tsx`
  - 고객 링크 preload 필드를 live 스키마 기준 `Id,name,book_name,legacy_id,mobile,phone1,address1,address2`로 축소했다.
- 검증
  - Playwright live 재현:
    - `https://crm.pressco21.com/invoices` 진입
    - `새 명세표 작성` 클릭
    - 수정 전 `/crm-proxy` 404 body: `Field 'address3, ... address10' not found`
  - 수정 후 재배포 + Playwright 재검증:
    - dialog count `1`
    - `/crm-proxy` 4xx `0건`
    - 명세표 작성 다이얼로그 정상 오픈 확인
- 참고
  - 현재 live 고객 주소 스키마는 `address1`, `address2`만 신뢰하는 쪽이 안전하다.
  - 다중 주소 확장은 추후 별도 주소 구조 정리 후 재도입 필요

### [CODEX-LEAD] 메이크샵 저장 후 선택형 시작 가이드 live QA 완료 (2026-03-12)
- 전제
  - 사용자가 메이크샵 디자인편집기에서 `2608`, `8009`, `2610` 최신 파일 저장을 완료한 뒤 live 재검증을 진행했다.
- 검증 결과
  - 파트너 `jhl9464`
    - `2608` 온보딩 체크리스트가 `0/4 완료`로 표시되고, `플랫폼 가이드`는 별도 완료 항목으로 노출된다.
    - `8009`는 더 이상 교육 gate 없이 강의 등록 폼 전체가 바로 열린다.
    - `2610`은 `파트너 시작 가이드`, `필수 절차는 아닙니다` 카피와 완료 힌트가 live 반영됐다.
  - 일반 회원 `PRESSCO000`
    - `8009`는 여전히 `파트너 전용 기능입니다` 게이트가 정상 노출된다.
    - `2610`은 현재 일반 로그인 회원에게도 열린다. 현재 프론트 로직은 `미로그인 차단`만 하고 별도 파트너 권한 체크는 하지 않는다.
- 증적
  - `output/playwright/mcp/2608-optional-guide-live.png`
  - `output/playwright/mcp/8009-form-live-after-guide-change.png`
  - `output/playwright/mcp/2610-optional-guide-live.png`
- 판단
  - 저장 반영 자체는 완료됐다.
  - `2610`을 `로그인 회원 공용 시작 가이드`로 둘지, `승인된 파트너 전용`으로 다시 제한할지만 다음 정책 결정 포인트다.

### [CODEX-LEAD] 파트너클래스 고객/파트너 UX 1차 고도화 (2026-03-12)
- live UX 진단
  - 고객:
    - `2606` 목록은 검색 기능이 JS에는 있는데 화면에 드러나지 않아 첫 탐색 진입성이 약했다.
    - `2607` 상세는 FAQ/문의 정보구조는 좋지만 일정이 없을 때 다음 행동이 막혀 있었다.
  - 파트너:
    - `2608` 대시보드 빈 상태가 너무 수동적이라 첫 등록 행동 유도가 약했다.
    - `8009` 강의등록은 폼이 길고 섹션이 많아 현재 어디까지 왔는지 파악하기 어려웠다.
- 변경 파일
  - `파트너클래스/목록/Index.html`
  - `파트너클래스/목록/css.css`
  - `파트너클래스/목록/js.js`
  - `파트너클래스/상세/Index.html`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
  - `파트너클래스/파트너/Index.html`
  - `파트너클래스/파트너/css.css`
  - `파트너클래스/파트너/js.js`
  - `파트너클래스/강의등록/Index.html`
  - `파트너클래스/강의등록/css.css`
  - `파트너클래스/강의등록/js.js`
- 변경 내용
  - `2606` 상단에 검색 스트립을 추가해 클래스명/지역/공방명 검색을 바로 노출하고, URL/필터칩/배지와 상태를 동기화했다.
  - `2607` 일정 미오픈 상태에서 `비슷한 클래스`, `같은 지역`, `FAQ`, `문의하기`로 이어지는 대체 CTA를 추가했다.
  - `2608` 내 강의 빈 상태에 `첫 강의 등록`, `프로필 완성`, `시작 가이드 보기` 액션을 넣어 첫 행동 진입을 줄였다.
  - `8009` 상단에 선택형 시작 가이드 callout과 실시간 진행도 helper를 추가해 필수 입력 수, 일정 수, 다음 액션을 바로 보이게 했다.
  - `상세/js.js`의 FAQ 이동 버튼은 재초기화 시 이벤트가 중복 등록되지 않도록 `_cdBound` 가드를 넣었다.
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/목록/js.js 파트너클래스/상세/js.js 파트너클래스/파트너/js.js 파트너클래스/강의등록/js.js`
  - `node --check 파트너클래스/목록/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - `node --check 파트너클래스/파트너/js.js`
  - `node --check 파트너클래스/강의등록/js.js`
- 참고
  - live 진단 증적:
    - `output/playwright/mcp/ux-audit-2606-desktop.png`
    - `output/playwright/mcp/ux-audit-2608-desktop.png`
    - `output/playwright/mcp/ux-audit-8009-desktop.png`
  - 이 UX 번들은 아직 메이크샵 디자인편집기 저장 전 기준이며, live 반영 확인은 저장 후 Playwright 재검증이 필요하다.

### [CODEX-LEAD] 파트너클래스 UX 실배포 live QA + 2607 FAQ 링크 hotfix (2026-03-12)
- live 확인 완료
  - `2606` 검색 스트립이 공개 화면에 정상 노출되고, `캔들` 검색 시 결과 `1건`과 검색 칩 동기화가 정상 동작한다.
  - `2607` 일정 미오픈 empty state가 정상 노출되고, `캔들 클래스 더 보기`, `서울 클래스 보기`, `문의하기` 링크도 정상 렌더링된다.
  - `2608` 빈 상태 액션 3종이 live 반영됐고, `첫 강의 등록` 클릭 시 `새 강의 등록 안내` 모달이 열린다.
  - `8009` 강의등록 상단 진행도 helper가 live 반영됐고, 강의명/카테고리/강의 형태 입력 시 `필수 입력 3/9 완료`까지 즉시 갱신된다.
- 발견 이슈
  - `2607`의 `FAQ 먼저 보기`는 live 저장본에서 `activateTab is not defined` 콘솔 에러가 발생했다. FAQ 탭은 열리지만 존재하지 않는 함수 호출이 남아 있었다.
- 수정
  - `파트너클래스/상세/js.js`
    - `FAQ 먼저 보기` 클릭 시 존재하지 않는 `activateTab('faq')` 대신 FAQ 탭 버튼을 직접 클릭하고 `#detailTabs`로 스크롤하도록 변경
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/상세/js.js`
  - `node --check 파트너클래스/상세/js.js`
- 증적
  - `ux-live-2606-search-strip.png`
  - `ux-live-2607-no-schedule-state.png`
  - `ux-live-2608-empty-actions.png`
  - `ux-live-8009-form-helper-initial.png`

### [CODEX-LEAD] 교육 필수 gate 제거 + 선택형 시작 가이드 전환 (2026-03-12)
- 방향 변경
  - 파트너 승인 후 `교육 이수`를 강제하지 않고, `플랫폼 시작 가이드`를 선택형 안내 서비스로 전환했다.
- 변경 파일
  - `파트너클래스/강의등록/Index.html`
  - `파트너클래스/강의등록/css.css`
  - `파트너클래스/강의등록/js.js`
  - `파트너클래스/파트너/js.js`
  - `파트너클래스/교육/Index.html`
  - `파트너클래스/교육/css.css`
  - `파트너클래스/교육/js.js`
  - `파트너클래스/n8n-workflows/WF-10-education-complete.json`
- 변경 내용
  - `8009`는 이제 승인된 파트너면 바로 폼을 사용 가능하고, 미확인 계정에는 `2610` 시작 가이드 callout 만 노출한다.
  - `2608` 온보딩은 `교육 이수`를 `플랫폼 가이드` 선택 단계로 바꿨고, 진행률/완료 판정에서 제외했다.
  - `2610`은 필수 교육 페이지가 아니라 선택형 시작 가이드로 카피/상태/결과 문구를 전환했다.
  - `WF-10`은 live 재배포까지 완료했고, pass/fail 응답이 score 기준으로 정확히 갈리도록 보강했다.
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/강의등록/js.js 파트너클래스/파트너/js.js 파트너클래스/교육/js.js`
  - `node --check 파트너클래스/강의등록/js.js`
  - `node --check 파트너클래스/파트너/js.js`
  - `node --check 파트너클래스/교육/js.js`
  - `jq empty 파트너클래스/n8n-workflows/WF-10-education-complete.json`
  - live `WF-10 Education Complete (aOtPOKVwyVfCQ6fq)` 재배포, 백업: `output/n8n-backups/20260312-wf10-optional-guide/`
  - webhook 검증:
    - `jhl9464 + 정답 15개` -> `passed=true`, 새 가이드 완료 메시지
    - `jhl9464 + score=1` -> `passed=false`, 새 재점검 메시지

### [CODEX-LEAD] `8009` 실등록 E2E 완료 + `WF-02` 대시보드 누락 live 복구 (2026-03-12)
- 정책 확정
  - `2610`은 우선 `로그인 회원 공용 시작 가이드`로 유지한다. 파트너 전용 접근 제어는 지금 단계에서 다시 넣지 않는다.
- 실등록 결과
  - 파트너 `jhl9464`로 live `8009` 강의 등록을 실제 제출했고 성공 화면에서 `class_id=CL_202603_697` 를 확인했다.
  - 제출 클래스명은 `[TEST][LIVE][20260312-1425] 강의등록 검증용 클래스`이며, 운영 QA용 임시 데이터다.
  - `admin-api getPendingClasses(status=PENDING_REVIEW)` 응답에서도 동일 row(`partner_code=PC_202603_001`, `partner_name=열혈남아공방`)가 확인돼 UI 수준이 아니라 실제 저장까지 검증됐다.
- 발견 이슈
  - 저장 직후 `2608` 대시보드는 여전히 `등록된 강의 없음`처럼 보였고, `partner-auth getPartnerDashboard` 응답도 `classes=[]` 였다.
  - 원인은 live `WF-02`의 클래스 조회가 `partner_code` relation/string shape 차이를 안전하게 처리하지 못해 방금 저장된 row를 누락한 것이었다.
  - `8009` 진행도 helper 는 약관 체크박스를 눌러도 즉시 `9/9` 로 갱신되지 않고 `8/9` 에 머물렀다. 로컬 `강의등록/js.js` 에는 `.cr-form__agree-check` listener 보강을 반영했다.
- 수정/배포
  - `scripts/partnerclass-s2-7-patch-partner-auth.js`
  - `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`
  - live `WF-02 Partner Auth API (aAc4lFdxuibp5UJ1)` 를 재배포했고, 백업은 `output/n8n-backups/20260312-wf02-dashboard-fix/` 에 저장했다.
- 재검증
  - `getPartnerDashboard(jhl9464, 2026-03)` -> `classes[0].class_id=CL_202603_697`, `status=INACTIVE`
  - Playwright live 기준 `2608`에 `[TEST][LIVE][20260312-1425] 강의등록 검증용 클래스` 카드가 다시 노출되고, UI 뱃지는 `심사중`으로 표시된다.
  - 사용자 저장 후 Playwright 재검증에서 `8009` live 진행도 helper 가 약관 체크 직후 `필수 입력 9/9 완료`로 즉시 갱신되는 것까지 확인했다.
  - 같은 세션에서 `2608` 대시보드의 `CL_202603_697` 카드가 계속 유지되는 것도 재확인했다.
- 검증/증적
  - `node --check 파트너클래스/강의등록/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/강의등록/js.js`
  - `jq empty 파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`
  - `output/playwright/mcp/8009-helper-still-8-of-9-live.png`
  - `output/playwright/mcp/2608-dashboard-class-after-wf02.png`
  - `output/playwright/mcp/8009-helper-9-of-9-live-ok.png`

### [CODEX] Claude Code 전략 handoff 문서화 (2026-03-12)
- 문서
  - `docs/파트너클래스/claude-strategy-handoff-2026-03-12.md`
  - `docs/파트너클래스/README.md`
- 내용
  - 2026-03-12 live 기준선, 실사용 검증 결과, 현재 문제점과 아쉬운 점, Claude Code가 다시 전략을 짤 때 봐야 할 질문을 한 문서로 정리했다.
  - 다음 단계의 기획 리드는 다시 Claude Code가 맡는 것으로 가정하고, `Next Step`의 첫 항목을 Claude용 전략 재수립 태스크로 바꿨다.
  - 판단 기준 문서 우선순위는 `shared-service-identity.md` -> `enterprise-elevation-strategy-2026-03-10.md` -> `PRD-파트너클래스-플랫폼-고도화.md` 순서를 다시 명시했다.

### [CODEX-LEAD] 파트너/회원/관리자 실계정 live QA 및 승인 데이터 불일치 확인 (2026-03-12)
- 사용 계정
  - 관리자: `jihoo5755`
  - 파트너 후보: `jhl9464`
  - 일반 회원: `PRESSCO000`
- 확인 결과
  - 관리자 계정은 수정된 비밀번호로 live 로그인 가능하며 `8011` 진입 정상.
  - 파트너 계정 `jhl9464`는 메이크샵 로그인 정상, hidden DOM 기준 `group_name=강사회원`, `group_level=2` 로 회원그룹 변경도 반영됨.
  - 그러나 `2608` 진입 시 `getPartnerAuth` 호출이 실패하고 `파트너 전용 페이지입니다` 안내만 노출됨.
  - `partner-auth` 직접 호출 결과 `getPartnerAuth`, `getPartnerApplicationStatus`, `getPartnerDashboard` 는 `HTTP 200`이지만 body가 비어 있고, `getEducationStatus` 만 `{"is_partner":false,"member_id":"jhl9464"}` 를 반환함.
  - `8011` UI와 `admin-api getApplications` 응답 어디에도 `jhl9464` 신청 건은 보이지 않았다. 필터를 `PENDING/APPROVED/REJECTED` 로 바꿔도 동일했다.
  - `8009`는 파트너 인증 실패 warning 이 찍히는데도 폼 자체는 계속 노출된다.
  - 일반 회원 `PRESSCO000`은 로그인 정상, `8010` 빈 수강내역 화면 정상, `2607&class_id=CL_202602_001` 상세 진입 정상 확인.
- 판단
  - 현재 live 는 `메이크샵 회원그룹 변경`과 `파트너 데이터 소스(tbl_Partners 또는 동등 데이터)` 생성이 분리돼 있다.
  - `jhl9464`는 메이크샵상 강사회원으로 승격됐지만 파트너 인증 데이터에는 아직 없는 상태라 `2608` 접근이 막힌다.

### [CODEX] CRM 자동입금 준비/입금 수집함 1차 완료 (2026-03-12)
- 반영 파일
  - `offline-crm-v2/src/pages/Settings.tsx`
  - `offline-crm-v2/src/pages/DepositInbox.tsx`
  - `offline-crm-v2/src/lib/autoDeposits.ts`
  - `offline-crm-v2/src/lib/appGuide.ts`
  - `offline-crm-v2/src/components/layout/AppGuideWidget.tsx`
  - `offline-crm-v2/src/components/layout/Sidebar.tsx`
  - `offline-crm-v2/src/App.tsx`
- 내용
  - 자동입금 준비 설정(은행/계좌/수집방식/자동매칭 기준) 저장 및 요약 카드 추가
  - `입금 수집함` 신규 페이지 추가
  - 농협 CSV/XLSX 업로드 → 자동 후보 매칭 → 입금 반영 흐름 구현
  - 단계형 화면 가이드에 `입금 수집함` 추가
- 검증
  - `npm run build`
  - Playwright 실검증
    - 설정 > 자동입금 준비 값 저장/재조회 확인
    - 입금 수집함 업로드 후 `정확 후보` 매칭 확인
    - 테스트 명세표 `1,100원` 자동 입금 반영 후 수금 관리에서 미수 해소 확인
  - `bash deploy/deploy.sh`
- 배포
  - `https://crm.pressco21.com`

### [CODEX] CRM 자동입금 검토 큐 UI + `/crm-proxy` 연동 완료 (2026-03-12)
- 변경 파일
  - `offline-crm-v2/src/lib/api.ts`
  - `offline-crm-v2/src/lib/autoDeposits.ts`
  - `offline-crm-v2/src/pages/DepositInbox.tsx`
  - `파트너클래스/n8n-workflows/WF-CRM-PROXY-nocodb-proxy.json`
- 변경 내용
  - `입금 수집함`에 `자동입금 검토 큐` 섹션 추가
  - 부분 입금/초과 입금/미매칭 건을 CRM 화면에서 직접 확인하고 `검토 반영`, `검토 제외` 가능
  - review queue 조회를 direct n8n webhook 대신 기존 same-origin `/crm-proxy` 경유로 변경
  - `/crm-proxy`에 `autoDepositReviewQueue` 가상 테이블 액션을 추가해 queue `list/dismiss`를 프록시 처리
- 검증
  - `npm run build`
  - `bash deploy/deploy.sh`
  - Playwright 실브라우저 검증
    - 운영 `https://crm.pressco21.com/deposit-inbox`
    - `자동입금 검토 큐` 섹션/빈 상태 정상 렌더링 확인
    - review row(`신재승`) 노출 후 `검토 제외` 처리 확인
    - 임시 고객/명세표(`검토큐테스트289830`) 생성 → 부분 입금 review candidate 생성 → UI에서 `검토 반영` 실행
    - 반영 후 invoice `paid_amount=300`, queue item `dismissed` 확인
  - 테스트 고객/명세표/queue 정리 완료

### [CODEX-LEAD] 파트너클래스 live admin/account feasibility 점검 (2026-03-11)
- 확인 내용
  - NHN Commerce 개발자센터 최신 Open API 스펙 PDF(`godomall5_openAPI_spec_v1.0_20250616.pdf`) 다운로드 경로와 로컬 레퍼런스 `makeshop-references/open-api.md`를 대조했다.
  - 로컬 기준 회원 API는 `GET type=user` 조회와 `type=user_group_change`/`type=user process=modify` 성격의 수정만 확인되며, 신규 회원 생성 엔드포인트는 문서화되지 않았다.
  - Playwright MCP로 `jihoo5755` 계정 로그인 후 live `8011` 접근을 재검증했다.
  - hidden DOM 기준 `user_id=jihoo5755`, `group_name=관리자`, `group_level=10` 으로 치환되며 `8011` 메인 대시보드와 신청/정산 집계가 정상 로드됐다.
  - 같은 계정으로 `2608`은 파트너 비인가 안내가 노출됐고, `8010`은 로그인 회원의 빈 수강내역 화면이 노출됐다.
  - `8009`는 파트너 인증 체크 실패 warning 이 있으나 현재 live 에서는 폼이 계속 렌더링된다.
- 판단
  - 파트너/회원 테스트 계정은 Open API로 자동 생성하기보다, 메이크샵에서 일반 회원을 수동 생성한 뒤 필요 시 그룹 변경으로 운영하는 쪽이 현재 구조에 맞다.
  - 관리자 어드민은 현재 메이크샵 로그인 세션 + 회원그룹(`관리자/운영자/대표` 또는 `group_level >= 9`)에 직접 묶여 있다.

### [CODEX-LEAD] offline-crm-v2 P1 3차 구현 완료: 환불대기 처리 화면/즉시 반영 보정 (2026-03-11)
- 변경 파일
  - `offline-crm-v2/src/pages/Receivables.tsx`
- 변경 내용
  - `환불대기` 전용 탭 추가
  - 초과 입금으로 생성된 환불대기 고객 목록/합계 표시
  - `환불 처리` 다이얼로그에서 부분 환불, 잔액 계산, `환불대기 해제` 지원
  - 고객 메모 기반 회계 메타를 캐시에 즉시 반영해 환불 후 금액이 새로고침 없이 바로 줄어들도록 보정
  - URL `tab=refund` 동기화 누락 수정
- 검증
  - `npm run build`
  - `bash deploy/deploy.sh`
  - Playwright 실검증
    - `1,100원 미수 -> 1,500원 입금 -> 초과 400원 환불대기 등록`
    - 환불대기 탭에서 `300원 환불 완료` 후 즉시 `100원`으로 감소 확인
    - `환불대기 해제` 후 목록 제거 확인
    - 고객 상세 `거래내역`에 `환불대기`, `환불` 행 노출 확인
  - 테스트용 `TEST-ACCOUNTING-REFUND-*` 데이터 정리 완료

### [CODEX-LEAD] offline-crm-v2 P1 1차 구현 완료: 초과 입금/예치금/환불대기/거래원장 확장 (2026-03-11)
- 변경 파일
  - `offline-crm-v2/src/lib/accountingMeta.ts`
  - `offline-crm-v2/src/lib/reporting.ts`
  - `offline-crm-v2/src/lib/api.ts`
  - `offline-crm-v2/src/pages/Receivables.tsx`
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - `offline-crm-v2/src/pages/Transactions.tsx`
  - `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - `offline-crm-v2/src/pages/Invoices.tsx`
  - `offline-crm-v2/src/components/TransactionDetailDialog.tsx`
- 변경 내용
  - 고객 메모/명세표 메모 기반 회계 메타 유틸 추가:
    - 고객 단위 `예치금`, `환불대기`, 정산 이벤트 저장
    - 명세표 단위 `예치금 사용액` 저장
    - 화면 표시 시 숨김 메타 라인 자동 제거
  - 수금 관리 `입금 확인`에 초과 입금 처리 추가:
    - 미수 초과액 감지
    - `예치금 보관` / `환불대기 등록` 선택
    - 고객 메모에 이벤트와 작업 계정 로그 저장
  - 고객 상세 정산 카드 확장:
    - `예치금`
    - `환불대기`
  - 거래원장/거래내역 확장:
    - `예치금 적립`
    - `예치금 사용`
    - `환불대기`
    - `환불`
  - 명세표 작성 화면 1차 확장:
    - 고객 예치금 잔액 표시
    - 예치금 사용 입력 필드 추가
    - 인쇄/상세 메모에는 숨김 메타를 노출하지 않도록 정리
- 검증
  - `npm run build`
  - `bash deploy/deploy.sh`
  - 로컬 Playwright 실검증:
    - `TEST-ACCOUNTING-*` 임시 고객/명세표 생성 후 수금 관리에서 `1,100원 미수 -> 1,500원 입금 -> 초과 400원 예치금 보관` 토스트 확인
    - 고객 상세에서 `예치금 400원` 카드 반영 확인
    - 고객 상세 거래내역에서 `예치금 적립` 행 노출 확인
  - 테스트 데이터 정리:
    - `TEST-ACCOUNTING-*` 고객/명세표/품목 전부 삭제 완료
- 배포
  - `https://crm.pressco21.com` 재배포 완료

### [CODEX-LEAD] offline-crm-v2 P1 2차 구현 완료: 예치금 사용 저장 클로저 보정 + E2E 재검증 (2026-03-11)
- 변경 파일
  - `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - `AI_SYNC.md`
- 변경 내용
  - `Ctrl+Enter` 저장 단축키가 예전 `handleSave` 클로저를 잡고 있던 문제 수정
  - 최신 입력값 기준으로 저장되도록 `saveActionRef / closeActionRef` 구조로 변경
  - 이 보정으로 예치금 사용, 품목 금액, 현재 잔액이 저장 시점 최신 상태로 반영되도록 정리
- 검증
  - `npm run build`
  - `bash deploy/deploy.sh`
  - 로컬 Playwright 실검증:
    - `1,100원 미수 -> 1,500원 입금 -> 초과 400원 예치금 적립`
    - 신규 명세표에서 `예치금 사용 300원`
    - 고객 상세 `예치금 100원`
    - 고객 거래내역 `예치금 적립`, `예치금 사용` 둘 다 표시 확인
  - 테스트 데이터 정리:
    - `TEST-ACCOUNTING-*` 고객/명세표/품목 전부 삭제 완료
- 배포
  - `https://crm.pressco21.com` 재배포 완료

### [CODEX] Playwright MCP 안정화 및 세션 재기동 가이드 추가 (2026-03-11)
- 목적
  - Codex 내장 Playwright MCP가 `Transport closed`로 끊기던 이슈를 다음 세션에서 바로 복구 가능하게 정리
- 확인 결과
  - `@playwright/mcp` 자체 설치 문제는 아니었고, 기본 브라우저 경로에서 `chrome-headless-shell` 크래시 흔적 확인
  - macOS crash report:
    - `~/Library/Logs/DiagnosticReports/Retired/chrome-headless-shell-2026-03-10-*.ips`
  - 현재 대화 세션의 MCP 런타임은 이미 죽어 있어 tool call은 계속 `Transport closed`가 날 수 있음
  - 새 Codex 세션에서는 Playwright MCP 정상 기동 확인:
    - `https://example.com` title 확인
    - `https://www.foreverlove.co.kr/shop/page.html?id=2606` title 확인
- 로컬 설정 기준
  - global codex config:
    - `~/.codex/config.toml`
  - project local mcp config:
    - `.mcp.json`
  - 권장 args:
    - `-y @playwright/mcp@0.0.68 --browser chrome --headless --isolated --output-dir /Users/jangjiho/workspace/pressco21/output/playwright/mcp`
- 새 문서
  - `docs/playwright-mcp-setup.md`
    - 원인
    - 잔여 프로세스 정리 명령
    - `codex mcp list/get` 확인 명령
    - 새 세션 `codex exec` 검증 예시
- 검증 명령
  - `codex mcp list`
  - `codex mcp get playwright`
  - `codex exec --dangerously-bypass-approvals-and-sandbox -C /Users/jangjiho/workspace/pressco21 -m gpt-5.4 "Use the Playwright MCP tool to open https://example.com and reply with only the page title."`
  - `codex exec --dangerously-bypass-approvals-and-sandbox -C /Users/jangjiho/workspace/pressco21 -m gpt-5.4 "Use the Playwright MCP tool to open https://www.foreverlove.co.kr/shop/page.html?id=2606 and reply with only the page title."`
- 커밋
  - `5920fdb` `[codex] docs: record playwright mcp setup`

### [CODEX] offline-crm-v2 회계 고도화 PRD/로드맵 수립 완료 (CODEX)
- 문서
  - `offline-crm-v2/docs/accounting-upgrade-prd-2026-03-11.md`
  - `offline-crm-v2/docs/accounting-upgrade-roadmap-2026-03-11.md`
- 기준점 백업
  - Git tag: `crm-backup-before-accounting-upgrade-20260311`
  - 기준 커밋: `3eee628`
  - 원격 푸시 완료
- 결정
  - 목표 3개를 공식화
    - 회계 운영 프로그램 고도화
    - 직원 사용 가이드 투어
    - 원장님 농협 계좌 입금 자동 반영
  - 구현 순서는 `수금/지급 처리 엔진 분리 -> 화면 구조 재설계 -> 직원 가이드 투어 -> 농협 계좌 자동화`
  - 자동 수금은 첫 단계에서 완전 자동이 아니라 `후보 매칭 + 승인 가능한 반자동`을 원칙으로 함

### [CODEX] offline-crm-v2 Phase 1 지급 처리 엔진 + Phase 2 화면 구조 1차 완료 (CODEX)
- 코드
  - `offline-crm-v2/src/lib/legacySnapshots.ts`
    - 기존 장부 미지급금 메모 파서/직렬화 추가
    - 지급 반영액을 차감한 현재 줄 돈 계산 지원
  - `offline-crm-v2/src/pages/Receivables.tsx`
    - 기존 장부 지급 확인/취소 다이얼로그 추가
    - 대시보드/고객상세/거래원장과 동일한 지급 로그 무효화 처리 연결
    - `/receivables`를 수금 관리, `/payables`를 지급 관리 진입점으로 분리
    - 지급 관리 기본 탭/화면 문구/카드 구조 1차 정리
    - 고객별 지급 요약 카드 쿼리 의존성 보정
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
    - 고객 상세 빠른 액션에 `수금 관리`, `지급 관리` 분리
    - 기존 장부 원본 탭에 지급 확인/취소/이력 UI 추가
    - 거래내역 필터에 `지급` 포함
  - `offline-crm-v2/src/pages/Transactions.tsx`
    - 기존 장부 지급 이력을 `지급` 행으로 병합
    - 거래/명세표 조회에서 지급 검색/상세 가능
  - `offline-crm-v2/src/components/TransactionDetailDialog.tsx`
    - 지급 거래 상세에서 `정산 보기` 클릭 시 `/payables`로 이동
  - `offline-crm-v2/src/pages/Dashboard.tsx`
    - 기존 장부 지급 반영 후 총 미지급금 카드가 즉시 줄어들도록 계산 보정
  - `offline-crm-v2/src/App.tsx`
  - `offline-crm-v2/src/components/layout/Sidebar.tsx`
    - `수금 관리`, `지급 관리` 별도 메뉴 진입 추가
- 검증
  - `npm run build`
  - Playwright MCP 실사용 검증
    - `강민숙 님` 기준 `기존 장부 지급 확인 100원 -> 지급 관리/거래원장/고객상세 반영 -> 취소 -> 200원 원복`
    - 지급 거래 상세 팝업의 `정산 보기`가 `/payables?customerId=...&tab=payable`로 이동하는 것 확인
    - `/payables` 진입 시 메뉴/제목/카드/탭이 지급 업무 기준으로 보이는 것 확인
- 배포
  - `offline-crm-v2` `bash deploy/deploy.sh` 재배포 완료

### [CODEX] offline-crm-v2 Phase 3 실수 방지 UX + Phase 4 인앱 가이드 투어 1차 완료 (CODEX)
- 코드
  - `offline-crm-v2/src/components/layout/Layout.tsx`
  - `offline-crm-v2/src/components/layout/AppGuideWidget.tsx`
  - `offline-crm-v2/src/lib/appGuide.ts`
    - 수금 관리, 지급 관리, 고객 관리, 거래원장 전용 화면 가이드 정의
    - 화면별 최초 진입 가이드와 다시보기 상태 localStorage 관리
  - `offline-crm-v2/src/pages/Receivables.tsx`
    - 수금/지급 다이얼로그에 처리 전 확인 문구 추가
  - `offline-crm-v2/src/pages/Settings.tsx`
    - `화면 가이드 다시보기 초기화` 기능 추가
- 검증
  - `npm run build`
  - Playwright MCP 검증
    - `/receivables` 최초 진입 시 `수금 관리 가이드` 자동 노출 확인
    - `/settings`에서 `화면 가이드 다시보기 초기화` 실행 후 성공 토스트 확인
    - `화면 가이드` 플로팅 버튼이 유지되는 것 확인
- 배포
  - `offline-crm-v2` `bash deploy/deploy.sh` 재배포 완료

### [CODEX] offline-crm-v2 초단순 실무형 회계프로그램 PRD v2 + P1 기능명세 완료 (CODEX)
- 문서
  - `offline-crm-v2/docs/accounting-upgrade-prd-v2-2026-03-11.md`
    - 기존 기능을 유지하면서 `쉬운 입력 + 정확한 돈 관리 + 제출 가능한 장부 출력` 중심으로 재정의
    - 핵심 화면을 `고객 관리 / 수금 관리 / 지급 관리 / 거래원장` 4축으로 정리
    - 돈 개념을 `받을 돈 / 줄 돈 / 예치금 / 환불대기` 4개로 단순화
  - `offline-crm-v2/docs/accounting-upgrade-p1-spec-2026-03-11.md`
    - 초과 입금 처리
    - 예치금
    - 환불대기
    - 명세표 예치금 사용
    - 거래원장 유형 확장
    을 구현 단위로 상세화
- 결정
  - 복잡한 ERP 방향은 지양
  - 기존 기능은 유지
  - 세무 제출용 출력과 실수 방지 중심으로 확장

### [CODEX-LEAD] Phase 3 S3-3 키트 구독 파일럿 완료 (CODEX)
- 메이크샵
  - `파트너클래스/마이페이지/Index.html`
  - `파트너클래스/마이페이지/css.css`
  - `파트너클래스/마이페이지/js.js`
    - 수강생 마이페이지에 `진행 중인 구독 / 시작 가능한 클래스 / 신청 폼` 3레이어 추가
    - 완료 수업 + 키트 데이터 기반 구독 추천, 신청, 해지 플로우 구현
- 워크플로우 / 스크립트
  - `scripts/partnerclass-s3-3-create-subscriptions-table.js`
  - `scripts/partnerclass-s3-3-generate-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-deploy-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-subscription-runner.js`
  - `파트너클래스/n8n-workflows/WF-SUB-subscription-kit-pilot.json`
    - live NocoDB `tbl_Subscriptions` 생성: `mtyaeamavml7www`
    - live `WF-SUB Subscription Kit Pilot` 배포: `BpyDxiaCb1PwVInY`
    - 지원 action: `listSubscriptions / createSubscription / cancelSubscription / runMonthlyBatch`
    - 월간 배치 자동 생성은 `SUBORD_YYYYMM_SUBS_*` 내부 주문 ref 기준으로 고정
- 문서 / 메모리
  - `docs/파트너클래스/subscription-pilot-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://www.w3.org/2000/svg` 는 SVG namespace false positive
  - `node --check`
    - `파트너클래스/마이페이지/js.js`
    - `scripts/partnerclass-s3-3-create-subscriptions-table.js`
    - `scripts/partnerclass-s3-3-generate-subscription-workflow.js`
    - `scripts/partnerclass-s3-3-deploy-subscription-workflow.js`
    - `scripts/partnerclass-s3-3-subscription-runner.js`
  - Playwright:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-3-subscription-runner.js`
    - 로컬 UI 결과:
      - 진행 중 구독 `1 -> 2 -> 1`
      - 생성 메시지 `월간 키트 구독이 시작되었습니다. 다음 발송일은 2026.03.25 입니다.`
      - 해지 메시지 `구독이 해지되었습니다. 마지막 생성 주문 이력은 유지됩니다.`
    - live API 결과:
      - create `201`
      - list active `1`
      - dry run generated `1`
      - batch generated `1`
      - last order ref `SUBORD_202603_SUBS_*`
      - cancel `200`
    - 산출물:
    - `output/playwright/s3-3-subscription/table-create-results.json`
      - `output/playwright/s3-3-subscription/subscription-results.json`
      - `output/playwright/s3-3-subscription/mypage-subscription-flow.png`

### [CODEX-LEAD] Phase 3 S3-4 서버 확장성 검증 완료 (CODEX)
- 스크립트 / 문서 / 메모리
  - `scripts/partnerclass-s3-4-scalability-runner.js`
    - live 서버 스냅샷, live row count, `class-api` read 부하 테스트, server-side SQLite 10만 row benchmark 자동 수집
  - `docs/파트너클래스/scalability-verification-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/devops-monitoring-expert/MEMORY.md`
- 검증
  - `node --check scripts/partnerclass-s3-4-scalability-runner.js`
  - `node scripts/partnerclass-s3-4-scalability-runner.js`
  - 결과:
    - live row count:
      - partners `11`
      - classes `26`
      - schedules `36`
      - settlements `114`
      - reviews `32`
      - subscriptions `0`
    - load test:
      - `10c/5s`: success `32/32`, avg `1733.03ms`, p95 `2283ms`
      - `50c/5s`: success `50/50`, avg `6845.9ms`, p95 `7287ms`
      - `100c/10s catalog`: success `1/100`, successRate `1.00%`
      - `100c/10s detail`: success `0/100`, successRate `0.00%`
      - `100c/10s mixed`: success `0/100`, successRate `0.00%`
    - post-load:
      - `n8n` memory `320.7MiB -> 717.1MiB`
      - `nocodb` memory `247.3MiB -> 340.2MiB`
      - load average `0.03 -> 2.35`
    - synthetic SQLite 100k:
      - insert `402.69ms`
      - indexed catalog/detail/partner query avg `0.04ms / 0.03ms / 0.03ms`
  - 판정:
    - 현재 병목은 RAM보다 `n8n public read queue + webhook orchestration`
    - Oracle Free Tier는 즉시 교체 대상이 아니지만 `100 concurrent read stable` 기준으로는 아직 엔터프라이즈급 아님
  - 산출물:
    - `output/playwright/s3-4-scalability/scalability-results.json`

### [CODEX-LEAD] Phase 3 S3-5 SNS/YouTube 콘텐츠 재활용 SOP 완료 (CODEX)
- 워크플로우 / 스크립트
  - `scripts/lib/partnerclass-content-import-handler.js`
  - `scripts/lib/partnerclass-content-hub-response.js`
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
  - `scripts/partnerclass-s3-5-generate-content-import-workflow.js`
  - `scripts/partnerclass-s3-5-deploy-content-import-workflow.js`
  - `scripts/partnerclass-s3-5-content-import-runner.js`
  - `파트너클래스/n8n-workflows/WF-CONTENT-affiliation-content-import.json`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
    - `WF-CONTENT Affiliation Content Import` live 배포: `gWllBlMjRvePQZg3`
    - `WF-01C Affiliation Read API` live 재배포: `AbazwCdqQ9XdA48G`
    - `WF-01 Class API` live 재배포: `WabRAcHmcCdOpPzJ`
- 문서 / 메모리
  - `docs/파트너클래스/content-repurposing-sop-guide.md`
  - `docs/파트너클래스/content-hub-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check`
    - `scripts/lib/partnerclass-content-hub-response.js`
    - `scripts/lib/partnerclass-content-import-handler.js`
    - `scripts/partnerclass-s2-4-generate-wf01-split.js`
    - `scripts/partnerclass-s3-5-generate-content-import-workflow.js`
    - `scripts/partnerclass-s3-5-deploy-content-import-workflow.js`
    - `scripts/partnerclass-s3-5-content-import-runner.js`
  - workflow code string syntax check:
    - `WF-01C Build Content Hub Response`
    - `WF-CONTENT Import From Schedule / Import From Webhook`
  - Playwright + live API:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-5-content-import-runner.js`
    - dry run:
      - `youtube_count=3`
      - preview 3건 확인
    - apply:
      - `created=3`
      - imported title 3건 live 저장
    - content hub:
      - `imported_content_count >= 1`
      - `trendTitles` 에 실제 YouTube 제목 반영 확인
  - 산출물:
    - `output/playwright/s3-5-content-import/content-import-results.json`
    - `output/playwright/s3-5-content-import/content-import-hub.png`

### [CODEX-LEAD] Phase 3 S3-6 12개월 연간 이벤트 캘린더 완료 (CODEX)
- 워크플로우 / 스크립트
  - `scripts/lib/partnerclass-annual-event-templates.js`
  - `scripts/lib/partnerclass-seminar-response.js`
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
  - `scripts/partnerclass-s3-6-sync-event-calendar.js`
  - `scripts/partnerclass-s3-6-generate-event-workflows.js`
  - `scripts/partnerclass-s3-6-deploy-event-workflows.js`
  - `scripts/partnerclass-s3-6-event-calendar-runner.js`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
  - `파트너클래스/n8n-workflows/WF-EVENT-yearly-calendar-admin.json`
  - `파트너클래스/n8n-workflows/WF-EVENT-d14-auto-alert.json`
    - `WF-01C Affiliation Read API` live 재배포: `AbazwCdqQ9XdA48G`
    - `WF-01 Class API` live 재배포: `WabRAcHmcCdOpPzJ`
    - `WF-EVENT Yearly Calendar Admin` live 배포: `h90HfqDSZHp318oR`
    - `WF-EVENT D14 Auto Alert` live 배포: `4kLd9MDEIPgSgf2g`
- 메이크샵
  - `파트너클래스/목록/js.js`
    - `협회·세미나 / 혜택·이벤트` 탭에서 `class-api getSeminars` 실데이터 우선 사용
  - `파트너클래스/어드민/Index.html`
  - `파트너클래스/어드민/css.css`
  - `파트너클래스/어드민/js.js`
    - 협회 관리 탭에 연간 이벤트 캘린더 관리 섹션 추가
- 문서 / 메모리
  - `docs/파트너클래스/annual-event-calendar-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- 검증
  - `node --check`
    - `scripts/lib/partnerclass-annual-event-templates.js`
    - `scripts/lib/partnerclass-seminar-response.js`
    - `scripts/partnerclass-s3-6-sync-event-calendar.js`
    - `scripts/partnerclass-s3-6-generate-event-workflows.js`
    - `scripts/partnerclass-s3-6-deploy-event-workflows.js`
    - `scripts/partnerclass-s3-6-event-calendar-runner.js`
    - `scripts/partnerclass-s2-4-generate-wf01-split.js`
    - `파트너클래스/목록/js.js`
    - `파트너클래스/어드민/js.js`
  - 메이크샵 정적 검증:
    - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/목록/js.js 파트너클래스/어드민/js.js 파트너클래스/어드민/Index.html 파트너클래스/어드민/css.css`
  - 라이브 검증:
    - `syncAnnualCalendar(year=2026, dry_run=false)` -> `updated=12`, `months_covered=1~12`
    - `class-api getSeminars(year=2026)` -> `total=14`, `months_covered=1~12`
    - `runD14Alerts(today=2026-03-11, dry_run=true)` -> `due_event_count=1`, `partner_target_count=6`, `admin_target_count=1`
  - Playwright:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-6-event-calendar-runner.js`
  - 산출물:
    - `output/playwright/s3-6-event-calendar/event-calendar-results.json`
    - `output/playwright/s3-6-event-calendar/admin-event-calendar.png`

### [CODEX] offline-crm-v2 작업 계정 분리 로그 보강 완료 (CODEX)
- CRM
  - `offline-crm-v2/src/lib/settings.ts`
  - `offline-crm-v2/src/lib/legacySnapshots.ts`
  - `offline-crm-v2/src/pages/Settings.tsx`
  - `offline-crm-v2/src/pages/Receivables.tsx`
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - `offline-crm-v2/src/pages/Transactions.tsx`
  - `offline-crm-v2/src/components/layout/Sidebar.tsx`
- 구현
  - 작업 계정 2개를 로컬 설정에 등록하고 현재 작업 계정을 선택하는 구조 추가
  - 기존 장부 수금 로그에 `계정`, `입력자`, `시각`을 함께 저장하도록 메타 스키마 확장
  - 미수금 관리, 고객 상세, 거래/명세표 조회에서 분리된 작업 계정 로그가 그대로 보이도록 연결
  - 사이드바 하단에 현재 작업 계정 표시 추가
- 검증
  - `npm run build`
  - `bash deploy/deploy.sh`
  - 운영 반영: `https://crm.pressco21.com`

### [CODEX-LEAD] Phase 3 S3-2 등급별 비금전적 인센티브 완료 (CODEX)
- 메이크샵
  - `파트너클래스/파트너/Index.html`
  - `파트너클래스/파트너/css.css`
  - `파트너클래스/파트너/js.js`
    - 수익 탭 내부 `등급 혜택` 패널 추가
    - 현재 등급 배지, 현재 혜택 하이라이트, 상위 등급 비교 카드 3장 노출
  - `파트너클래스/목록/css.css`
  - `파트너클래스/목록/js.js`
    - `GARDEN` 이상 등급 칩 추가
    - 추천 레일 우선순위를 `partner_grade > avg_rating > class_count > total_remaining` 로 정렬
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
    - 연관 클래스 추천 점수에 등급 가중치 추가
    - `GARDEN` 이상 등급 태그 우선 노출
  - `파트너클래스/콘텐츠허브/css.css`
  - `파트너클래스/콘텐츠허브/js.js`
    - 파트너 스토리 등급 우선 정렬
    - `추천 파트너 / 인터뷰 후보 / 멘토 파트너` 스포트라이트 라벨 추가
- 스크립트 / 문서 / 메모리
  - `scripts/partnerclass-s3-2-incentive-runner.js`
  - `docs/파트너클래스/grade-incentive-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://www.w3.org/2000/svg` 는 SVG namespace false positive
  - `node --check`:
    - `파트너클래스/파트너/js.js`
    - `파트너클래스/목록/js.js`
    - `파트너클래스/상세/js.js`
    - `파트너클래스/콘텐츠허브/js.js`
    - `scripts/partnerclass-s3-2-incentive-runner.js`
  - Playwright:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-2-incentive-runner.js`
    - 결과:
      - `ATELIER PARTNER` 배지 노출
      - 혜택 레일 첫 카드 `앰배서더 온라인 세미나`
      - 상세 연관 추천 첫 태그 `ATELIER`
      - 콘텐츠 허브 첫 스토리 `AMBASSADOR / 멘토 파트너`
    - 산출물:
      - `output/playwright/s3-2-incentives/incentive-results.json`
      - `output/playwright/s3-2-incentives/partner-grade-benefits.png`
      - `output/playwright/s3-2-incentives/list-benefit-priority.png`
      - `output/playwright/s3-2-incentives/detail-related-priority.png`
      - `output/playwright/s3-2-incentives/content-hub-story-priority.png`

### [CODEX-LEAD] Phase 3 S3-1 신규 테이블 4종 생성 완료 (CODEX)
- 스크립트 / 문서
  - `scripts/partnerclass-s3-1-create-tables.js`
  - `scripts/partnerclass-s3-1-schema-runner.js`
  - `docs/파트너클래스/s3-1-schema-guide.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 구현
  - live NocoDB meta API 로 `tbl_Seminars`, `tbl_Affiliation_Products`, `tbl_Affiliation_Content`, `tbl_Vocabulary` 4개 테이블 생성
  - 기존 테이블이 있으면 재사용하고 누락 컬럼은 add-column API 로 보강하는 idempotent 구조로 고정
  - 샘플 row 는 `KPFA_001 / 한국꽃공예협회` 기준으로 upsert
- 검증
  - `node scripts/partnerclass-s3-1-create-tables.js`
  - `node scripts/partnerclass-s3-1-create-tables.js` 2차 재실행
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-1-schema-runner.js`
  - 결과:
    - 4개 테이블 생성 완료
    - 샘플 row 매칭: seminars `2/2`, affiliation products `3/3`, affiliation content `3/3`, vocabulary `8/8`
    - 2차 재실행 시 추가 insert 없이 update 만 수행되어 idempotent 확인

### [CODEX-LEAD] Phase 3 S2-6 커뮤니티 리텐션 1차 완료 (CODEX)
- 프론트
  - `파트너클래스/마이페이지/Index.html`
  - `파트너클래스/마이페이지/css.css`
  - `파트너클래스/마이페이지/js.js`
    - 예약 리스트 위에 리텐션 영역 추가
    - 월간 수강 리포트, 연속 수강 배지, 완료 축하/후기 감사 notice 구현
    - 후기 후 감사 메시지 dismiss, 최근 완료 클래스 기반 notice, 3/5/10회 배지 구조 추가
  - `파트너클래스/상세/js.js`
    - 후기 등록 성공 시 `pressco21_review_thanks_v1` localStorage hook 저장
- 워크플로우 / 스크립트
  - `파트너클래스/n8n-workflows/WF-RETENTION-student-lifecycle.json`
  - `scripts/partnerclass-s2-6-generate-retention-workflow.js`
  - `scripts/partnerclass-s2-6-deploy-retention.js`
  - `scripts/partnerclass-s2-6-retention-runner.js`
    - 신규 `WF-RETENTION Student Lifecycle` 배포
    - 매일 09:15 스케줄 + `/webhook/student-retention` 수동 dry run 경로 추가
    - 전일 수강 완료 / 30일 휴면 대상을 읽고 `COMPLETE_SENT`, `DORMANT_30_SENT` 플래그 기준으로 자동화
    - NocoDB 날짜 필터 제약을 피해 `status=COMPLETED` 집합 조회 후 Code 노드에서 날짜 재필터링
- 문서 / 메모리
  - `docs/파트너클래스/community-retention-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/마이페이지/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - `node --check scripts/partnerclass-s2-6-generate-retention-workflow.js`
  - `node --check scripts/partnerclass-s2-6-deploy-retention.js`
  - `node --check scripts/partnerclass-s2-6-retention-runner.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `xmlns=\"http://www.w3.org/2000/svg\"` 는 false positive
  - 라이브 dry run:
    - 완료 경로 `completion_raw_count=1`, `completion_count=0`, `completion_skipped_missing_email=1`
    - 휴면 경로 `dormant_raw_count=1`, `dormant_count=0`, `dormant_skipped_missing_email=1`
  - Playwright 검증:
    - `output/playwright/s2-6-retention/retention-results.json`
    - `output/playwright/s2-6-retention/mypage-retention.png`
    - `retentionVisible=true`, `streakCount=3`, `earnedBadges=Starter Loop`, `consoleErrors=[]`

### [CODEX-LEAD] Phase 3 S2-5 콘텐츠 허브 4영역 완료 (CODEX)
- 프론트
  - `파트너클래스/콘텐츠허브/Index.html`
  - `파트너클래스/콘텐츠허브/css.css`
  - `파트너클래스/콘텐츠허브/js.js`
    - 히어로, 요약 수치, 4개 섹션(`클래스 하이라이트 / 파트너 인터뷰 / 꽃 트렌드 / 초보자 가이드`), 하단 CTA 구현
    - 스크롤 내비게이션, 로딩/에러/재시도 상태, `2606/2607/2609` 연결 구조 정리
- API / 스크립트
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
    - `action=getContentHub` 추가
    - 기존 `tbl_Classes + tbl_Partners` 데이터에서 `summary / featured_message / highlights / partner_stories / trends / guides` 합성
    - 등급 alias `SILVER/GOLD/PLATINUM -> BLOOM/GARDEN/ATELIER` 정규화
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `content-hub.html` fixture 추가
- 문서 / 메모리
  - `docs/파트너클래스/content-hub-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-planning-expert/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 검증
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `node --check 파트너클래스/콘텐츠허브/js.js`
  - `node --check scripts/partnerclass-s2-4-generate-wf01-split.js`
  - `node --check scripts/build-partnerclass-playwright-fixtures.js`
  - 라이브 `class-api action=getContentHub` 응답 확인
    - `summary.total_classes=7`
    - `summary.total_partners=3`
    - `summary.total_beginner_classes=5`
    - `summary.total_regions=2`
  - Playwright 실데이터 주입 검증:
    - `output/playwright/s2-5-content-hub/content-hub-results.json`
    - `output/playwright/s2-5-content-hub/content-hub-page.png`

### [CODEX-LEAD] Phase 3 S2-4 WF-01 God Workflow 분리 완료 (CODEX)
- n8n 워크플로우
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
    - 기존 `/webhook/class-api` 라우터 유지, action 기준 하위 WF 전달 구조로 변경
  - `파트너클래스/n8n-workflows/WF-01A-class-read.json`
    - `getClasses / getClassDetail / getCategories` 전담 read WF 추가
  - `파트너클래스/n8n-workflows/WF-01B-schedule-read.json`
    - `getSchedules / getRemainingSeats` 전담 read WF 추가
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
    - `getAffiliations` 전담 read WF 추가
- 자동화 스크립트
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
    - monolith source 기준으로 router/A/B/C JSON 생성
  - `scripts/partnerclass-s2-4-deploy-wf01-split.js`
    - n8n public API create/update/activate + backup 자동화
- 운영 배포 결과
  - `WF-01A Class Read API` → `Ebmgvd68MJfv5vRt`
  - `WF-01B Schedule Read API` → `XQrogmHQABMM0atp`
  - `WF-01C Affiliation Read API` → `AbazwCdqQ9XdA48G`
  - 라우터 `WF-01 Class API` → `WabRAcHmcCdOpPzJ` 유지
- 문서 / 메모리
  - `docs/파트너클래스/WF-01-split-guide.md` 신규 추가
  - `docs/파트너클래스/WF-01-switch-map.md`
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/n8n-debugger/MEMORY.md`
  - `.claude/agent-memory/qa-test-expert/MEMORY.md`
- 검증
  - baseline 비교:
    - `output/playwright/s2-4-wf01/baseline/pre-split-baseline.json`
    - `output/playwright/s2-4-wf01/compare.json`
    - `getClasses / getClassDetail / getCategories / getAffiliations / INVALID_ACTION` 본문 동일 확인
  - 신규 action:
    - `getSchedules(id=CL_202602_662)` → `200 / success=true`
    - `getRemainingSeats(id=CL_202602_662)` → `200 / success=true`
  - Playwright request 검증:
    - `output/playwright/s2-4-wf01/playwright-results.json`

### [CODEX-LEAD] Phase 3 S2-3 IA 확장 완료 (CODEX)
- 프론트
  - `파트너클래스/목록/Index.html`
  - `파트너클래스/목록/css.css`
  - `파트너클래스/목록/js.js`
    - `전체 클래스 / 협회·세미나 / 혜택·이벤트` 3탭 구조 추가
    - `리스트 보기 / 지도 보기` 토글, 파트너맵 shell 연동, 협회 세미나 피드, 혜택 허브 카드 추가
    - `content_type`, `delivery_mode`, `class_format` 우선 사용 + `type/tags/affiliation_code` 폴백 추론 추가
  - `파트너클래스/상세/Index.html`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
    - `GENERAL / AFFILIATION / EVENT` 별 상단 identity, trust chip, 예약 노트, 탐색 링크 분기 추가
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `partnermap-shell.html` fixture 추가
- 문서 / 메모리
  - `docs/파트너클래스/nationwide-discovery-ia-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-planning-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/목록/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - `node --check scripts/build-partnerclass-playwright-fixtures.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 fixture 검증
    - 목록 탭 3개, 지도 보기 전환, 온라인 전용 시 지도 비활성화 확인
    - 협회 세미나 2건, 혜택 카드 6건, 오프라인 스포트라이트 3건 확인
    - 상세 `GENERAL / AFFILIATION / EVENT` 각 identity 카피와 trust chip 분기 확인
  - 산출물
    - `output/playwright/s2-3-ia/s2-3-results.json`
    - `output/playwright/s2-3-ia/*.png`

### [CODEX-LEAD] Phase 3 S2-2 협회 B2B 영업 도구 완료 (CODEX)
- 프론트
  - `파트너클래스/협회제안서/Index.html`
  - `파트너클래스/협회제안서/css.css`
  - `파트너클래스/협회제안서/js.js`
    - 협회명/로고/인센티브 구간을 URL 파라미터로 커스터마이징하는 디지털 제안서 페이지 추가
    - ROI 시뮬레이터(`협회원 수 / 월 예상 수강 인원 / 평균 재료 구매액`) 즉시 계산 구현
  - `파트너클래스/어드민/Index.html`
  - `파트너클래스/어드민/css.css`
  - `파트너클래스/어드민/js.js`
    - 협회 탭에 `제안서 URL 생성` 카드 추가
    - 협회 선택, 협회명/로고/예상 수치 입력, preview/copy 버튼, 생성 URL textarea 추가
    - 협회 테이블에 `불러오기` 액션 추가
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `affiliation-proposal.html` fixture 빌드 추가
- 문서 / 메모리
  - `docs/파트너클래스/affiliation-b2b-proposal-tool-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check 파트너클래스/협회제안서/js.js`
  - `node --check 파트너클래스/어드민/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - Playwright 로컬 검증
    - 어드민 협회 셀렉트 옵션 3개, 협회 행 2개 렌더링
    - 협회 선택 후 맞춤 URL 자동 생성
    - 새 탭 제안서 미리보기에서 협회명/할인율/로고 반영
    - ROI 입력 변경 후 연간 구매액 즉시 갱신 확인
  - 산출물
    - `output/playwright/s2-2-affiliation-proposal/affiliation-proposal-results.json`
    - `output/playwright/s2-2-affiliation-proposal/*.png`

### [CODEX-LEAD] Phase 3 S2-1 파트너 신청 세일즈 랜딩 리디자인 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너신청/Index.html`
    - 2609 상단 구조를 `세일즈 랜딩 + 신청 전환` 흐름으로 전면 개편
    - 히어로, 운영 지원 4카드, 비교 테이블, 적합 파트너/신청 흐름, 성장 경로, 사회적 증거, 신청 프로세스, 하단 고정 CTA 추가
  - `파트너클래스/파트너신청/css.css`
    - 상단 세일즈 레이어, 비교표, 성장 카드, 모바일 반응형, 하단 고정 CTA 스타일 추가
  - `파트너클래스/파트너신청/js.js`
    - `js-scroll-link + data-target` 스크롤 CTA 바인딩 추가
    - 개인정보 동의 체크박스 에러 초기화 보강
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `output/playwright/fixtures/partnerclass/apply.html` fixture 빌드 추가
- 문서 / 메모리
  - `docs/파트너클래스/partner-apply-sales-landing-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/brand-planning-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너신청/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - Playwright 로컬 검증
    - 데스크톱: 비교표 5행, 성장 카드 4개, 지원 카드 4개, CTA -> 폼 `formTop ~= 106px`
    - 모바일: 하단 고정 CTA 표시, 상단 점프 버튼 3개, CTA -> 폼 `formTop ~= 16px`
  - 산출물
    - `output/playwright/s2-1-partner-apply/partner-apply-results.json`
    - `output/playwright/s2-1-partner-apply/*.png`

### [CODEX-LEAD] Phase 3 S1-9 Phase 3-1 통합 테스트 완료 (CODEX)
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - 메이크샵 분리 파일(HTML/CSS/JS)을 Playwright용 단일 페이지 fixture로 조립
  - `scripts/partnerclass-phase3-integration-runner.js`
    - 목록/상세/마이페이지/파트너/어드민을 한 번에 순회하는 로컬 Playwright 통합 러너 추가
- 문서 / 메모리
  - `docs/파트너클래스/phase3-1-integration-test.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `NODE_PATH=.playwright-tools/node_modules node scripts/partnerclass-phase3-integration-runner.js`
  - 결과:
    - 목록 3개 -> `서울 + 오프라인` 1개
    - 상세 재료 카드 2개 + FAQ `환불` 1개 + 장바구니 담기 1회
    - 마이페이지 완료 1건 + 재료 칩 2개 + 같은 강사 추천 2개
    - 파트너 온보딩 `3/5`, 액션 보드 `1/2/2`, 키트 프리필 2행, 액션 카드 3종 이동
    - 어드민 정산 합계 `136,000원 / 34,000원`, 실행 실패 토스트 확인
  - 산출물
    - `output/playwright/s1-9-phase3-1/phase3-1-results.json`
    - `output/playwright/s1-9-phase3-1/*.png`

### [CODEX-LEAD] Phase 3 S1-8 파트너 대시보드 액션 보드 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너/Index.html`
    - 온보딩 카드 아래, 기존 KPI 카드 위에 액션 보드 섹션 추가
    - `오늘 수업 / 키트 준비 / 미답변 후기` 3개 카드와 설명 문구 추가
  - `파트너클래스/파트너/css.css`
    - 액션 보드 카드, 빈 상태, 반응형 레이아웃 스타일 추가
  - `파트너클래스/파트너/js.js`
    - `actionBoardState`, `actionBoardLoadToken` 기반 집계/렌더링 상태 추가
    - `getPartnerDashboard`, `getClassDetail`, `getPartnerBookings`, `getPartnerReviews` 응답을 조합해 3개 카드 수치를 계산
    - 카드 클릭 시 `일정 관리 / 예약 현황 / 후기 관리` 탭으로 이동하고 필요한 필터와 첫 클래스를 자동 세팅
    - 클래스 수정, 상태 변경, 일정 추가/삭제, 후기 답변 후 액션 보드가 즉시 다시 계산되도록 연결
- 문서 / 메모리
  - `docs/파트너클래스/dashboard-action-board-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 목킹 검증
    - populated 시나리오 `오늘 수업 1건 / 키트 준비 2건 / 미답변 후기 3건` 확인
    - `오늘 수업` 클릭 시 `일정 관리` 탭 + 첫 클래스 자동 선택 확인
    - `키트 준비` 클릭 시 `예약 현황` 탭 + `custom` 기간 + 클래스 자동 선택 확인
    - `미답변 후기` 클릭 시 `후기 관리` 탭 이동 확인
    - empty 시나리오 `0건` 수치와 새 강의 등록 유도 문구 확인
  - 산출물
    - `output/playwright/s1-8-action-board/action-board-populated.png`
    - `output/playwright/s1-8-action-board/action-board-empty-state.png`

### [CODEX] offline-crm-v2 운영 안정화/UX 고도화 완료 (CODEX)
- CRM 데이터/정합성
  - 레거시 미수금 방향을 `받아야 할 돈=양수` 기준으로 통일하고 고객 잔액 재계산 로직을 보정.
  - 레거시 미수와 CRM 미수를 합산 기준으로 맞추고, `서상견 님`, `신재승 회장님` 포함 전수 대조를 완료.
  - 분리 거래명(`서상견 님 (단양)` 등)은 고객관리에서 별도 고객으로 유지하도록 정리.
- 수금/미수 UX
  - 레거시 미수 입금 확인, 최대 입금액 차단, 취소 기능, 작업자명/시각 기록을 추가.
  - 고객 상세/미수금/거래내역/거래·명세표 조회에 레거시 수금 이력을 `입금` 행으로 노출.
  - 레거시 수금 반영 시 대시보드/미수금/거래·명세표 조회가 새로고침 없이 즉시 갱신되도록 캐시 무효화 보강.
- 명세표/송장 UX
  - 송장 자동 다운로드가 명세표의 선택 주소를 우선 사용하고, 전화/휴대폰/주소를 고객 정보로 자동 채우도록 수정.
  - 주소 선택 영역에 `선택된 주소로 송장 다운로드` 안내를 추가.
- 고객 상세/제출용 문서
  - 고객 상세 거래내역 탭에 기간/유형/키워드 필터, 엑셀 다운로드, 고객 제출용 인쇄 양식 추가.
  - 고객 상세 상단에 `미수금 보기`, `거래/명세표 조회`, `명세표 작성` 빠른 액션을 추가.
- 검증/배포
  - 각 수정 단계마다 `npm run build` 통과 확인.
  - 운영 `https://crm.pressco21.com`에 반복 배포 완료.

### [CODEX] offline-crm-v2 서상견 운영 데이터 긴급 복구 (CODEX)
- 실행 일시: 2026-03-11 16:45 KST ~ 2026-03-11 16:58 KST
- 원인
  - 2026-03-11 오늘자 운영 데이터 수정으로 `서상견 님` 대표 고객과 `서상견 님 (단양)` 분리 고객/명세표가 훼손됨.
- 복구 내용
  - 서버 DB 사전 백업 추가: `~/nocodb/nocodb_data/noco.db.pre-seosanggyeon-restore-20260311-1654`
  - `nc__w6f___tbl_Customers`
    - `15827`을 `서상견 님` + `book_name=서상견 님 (단양,김순자)` 상태로 복구
    - 삭제된 분리 고객 `15838` (`서상견 님 (단양)`) 재삽입
  - `nc__w6f___tbl_Invoices`
    - 삭제된 `INV-20260310-095155`, `INV-20260310-095704` 재삽입
  - `nc__w6f___tbl_InvoiceItems`
    - 삭제된 품목 행 `117~127` 재삽입
- 검증
  - 운영 DB 직접 조회로 고객 `15827`, `15838` 및 명세표 `15`, `16` 복구 확인
  - CRM 프록시 API 조회로 `서상견 님`, `서상견 님 (단양)`, 두 명세표 노출 확인
  - `bash deploy/deploy.sh` 재실행 완료

### [CODEX-LEAD] Phase 3 S1-7 파트너 온보딩 체크리스트 UX 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너/Index.html`
    - 헤더 아래 온보딩 카드, 진행률 바, `체크리스트 보기 / 다음 할 일` CTA 추가
    - 온보딩 모달, 완료 모달 추가
  - `파트너클래스/파트너/css.css`
    - 온보딩 카드/모달/단계 리스트/완료 상태 스타일 추가
    - `992px / 768px / 480px` 반응형 레이아웃 보강
  - `파트너클래스/파트너/js.js`
    - 온보딩 상태 계산 로직 추가
    - 단계 체계를 `프로필 / 교육 / 강의 / 일정 / 키트` 5단계로 고정
    - `getPartnerAuth`, `getEducationStatus`, `getPartnerDashboard`, `getClassDetail` 응답을 조합해 완료 상태를 계산
    - 현재 단계 CTA를 프로필 모달, 교육 페이지, 강의 등록 모달, 일정 탭, 클래스 수정 모달에 연결
    - 일정 추가, 클래스 수정, 프로필 저장 후 체크리스트를 즉시 다시 계산하도록 연결
- 문서 / 메모리
  - `docs/파트너클래스/onboarding-checklist-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 목킹 검증
    - 미완료 파트너 `3/5 완료` 확인
    - 모달 CTA `일정 등록하기` 클릭 시 `일정 관리` 탭 전환 + 첫 강의 자동 선택 + 일정 폼 노출 확인
    - 완료 파트너 체크리스트 카드 숨김 + 완료 모달 자동 노출 확인
  - 산출물
    - `output/playwright/s1-7-onboarding/incomplete-onboarding-schedule.png`
    - `output/playwright/s1-7-onboarding/complete-onboarding-modal.png`

### [CODEX-LEAD] Phase 3 S1-6 상세 FAQ 15개 확장 완료 (CODEX)
- 프론트
  - `파트너클래스/상세/Index.html`
    - FAQ 탭 상단에 설명 문구, 검색 입력, 카테고리 필터, 결과 요약 영역 추가
    - FAQ 빈 상태 영역 추가
  - `파트너클래스/상세/css.css`
    - 검색 바, 카테고리 칩, FAQ 카드형 아코디언, 빈 상태, 문의 블록 레이아웃 스타일 추가
    - 기존 FAQ 셀렉터와 실제 JS 클래스명이 어긋나던 부분을 `faq-item__*` 기준으로 정리
  - `파트너클래스/상세/js.js`
    - FAQ 기본값을 15개로 확장 (`수강 4 / 키트·배송 5 / 파트너 2 / 정산 3 / 기타 1`)
    - `faq_items`, `faqItems` 계열 데이터를 우선 사용하고 부족하면 공통 FAQ로 fallback 하도록 구현
    - 카테고리 필터, 실시간 검색, 결과 요약 문구, 1개씩 열리는 아코디언 동작 추가
    - `FAQPage` JSON-LD 생성 기준을 커리큘럼 변환에서 실제 FAQ 데이터 기준으로 변경
- 문서 / 메모리
  - `docs/파트너클래스/faq-expansion-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/상세/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace 기준 false positive 확인
  - Playwright 로컬 목업 검증
    - FAQ 15개 렌더링 확인
    - `정산` 필터 3개 확인
    - `환불` 검색 결과 1개 확인
    - `정산 + 배송` 조합 빈 상태 확인
  - 산출물
    - `output/playwright/s1-6-detail-faq/default-faq-panel.png`
    - `output/playwright/s1-6-detail-faq/faq-empty-state.png`

### [CODEX-LEAD] Phase 3 S1-5 정산 자동화 WF-SETTLE 구현 (CODEX)
- 백엔드
  - `파트너클래스/n8n-workflows/WF-SETTLE-partner-settlement.json`
    - 신규 워크플로우 `WF-SETTLE Partner Settlement` 생성 및 활성화 (`CGdB7kIdTRjO6ZVr`)
    - `getSettlementHistory`, `runSettlementBatch` 액션 구현
    - 월/반기 필터를 NocoDB `like` 쿼리 대신 코드 단계에서 처리하도록 보정
    - 메일 발송 실패를 `success: false`, `SETTLEMENT_EMAIL_FAILED` 로 그대로 반환하도록 수정
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
    - `getSettlements`가 `PENDING_SETTLEMENT / COMPLETED` 상태값을 정상 구분하도록 수정
    - `commission_rate 0.1` 같은 레거시 저장값을 `%` 기준으로 정규화해 응답
- 프론트
  - `파트너클래스/어드민/Index.html`
    - 정산 탭에 `월`, `전반/후반`, `정산 실행` 컨트롤 추가
    - `정산서 발송 이력` 테이블 섹션 추가
  - `파트너클래스/어드민/js.js`
    - `settlement-batch` 전용 호출 헬퍼 추가
    - 정산 이력 로딩, 실행 버튼, 실패 토스트, 이력 메타 문구 연결
    - 정산 목록의 수수료율/지급액 표시를 레거시 값까지 보정
- 문서 / 메모리
  - `docs/파트너클래스/settlement-automation-guide.md` 신규 추가
  - `docs/파트너클래스/commission-policy.md`를 canonical 등급 기준으로 정리
  - `docs/파트너클래스/README.md`, `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- 라이브 검증
  - `admin-api getSettlements(status=COMPLETED)` 성공, 총 1건 확인
  - `settlement-batch getSettlementHistory(month=2026-03)` 성공
  - `runSettlementBatch(month=2026-03, cycle=FIRST_HALF)`는 의도적으로 실패 반환 확인
    - 원인: 운영 SMTP credential `PRESSCO21-SMTP-Naver` 가 `535 Username and Password not accepted`
- Playwright 검증
  - 로컬 목업 관리자 페이지에서 `정산 현황` 탭 렌더링, 이력 테이블, 정산 실행 모달, 실패 토스트까지 확인
  - 스크린샷: `output/playwright/s1-5-admin-ui/admin-settlement-panel.png`

### [CODEX-LEAD] Phase 3 S1-4 수강완료 -> 재구매 동선 완료 (CODEX)
- 프론트
  - `파트너클래스/마이페이지/Index.html`
    - 헤더와 빈 상태 문구를 `후기 -> 재료 재구매 -> 다음 수업` 흐름 기준으로 갱신.
    - 루트 컨테이너에 `#partnerclass-my-bookings` ID를 추가해 메이크샵 스타일 충돌을 차단.
  - `파트너클래스/마이페이지/css.css`
    - 완료 카드용 후기 히어로, 키트 재구매 패널, 같은 강사 추천 카드, 요약 카드/섹션 레이아웃을 새로 구성.
    - 모든 셀렉터를 `#partnerclass-my-bookings` 기준으로 스코핑.
  - `파트너클래스/마이페이지/js.js`
    - `WF-19 my-bookings` 응답을 `다가오는 수업 / 수강 완료 후 다시 보기`로 분리 렌더링.
    - `WF-01 class-api getClasses/getClassDetail`를 추가 호출해 같은 강사 추천과 `kit_items` 기반 재구매 칩을 합성.
    - 완료 카드에 `후기 작성하기`, `수업 다시 보기`, `이 수업 재료 다시 보기`, `같은 강사의 다른 클래스` 동선을 연결.
- 워크플로우
  - `파트너클래스/n8n-workflows/WF-12-review-requests.json`
    - 수강생 후기 요청 CTA를 클래스 상세 `2607`로 직접 연결.
    - 이메일 본문에 `내 수강 내역(2609)` 복귀 문구를 추가.
  - 운영 반영
    - WF-12 (`zUxqaEHZpYwMspsC`) 백업 후 n8n API로 업데이트 완료.
    - 업데이트 확인: `active=true`, `reviewUrlChanged=true`, `myPageChanged=true`
- 문서/메모리
  - `docs/파트너클래스/repurchase-path-guide.md`
    - S1-4 데이터 조합 방식, 화면 구조, WF-12 연결, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 가이드 문서 연결.
  - `ROADMAP.md`
    - S1-4를 `✅ 완료`로 변경하고 운영 메모/검증 결과 반영.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
    - S1-4 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/마이페이지/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace(`xmlns`) 기준 false positive 확인
  - `node`로 `WF-12-review-requests.json` 파싱 + `wf12-build-emails` 구문 검사
  - Playwright 로컬 모킹 검증:
    - 전체 `2`, 완료 섹션 `1`, `후기 작성하기`, `로즈 패키지`, `같은 강사의 다른 클래스` 확인
    - 스크린샷: `output/playwright/s1-4-20260310/mypage-repurchase-flow.png`

### [CODEX-LEAD] Phase 3 S1-3 목록 신뢰 배지 + 퀵 필터 완료 (CODEX)
- 프론트
  - `파트너클래스/목록/Index.html`
    - 상단 퀵 필터 레일 추가: 카테고리 / 지역 / 형태 / 가격대 / 난이도.
  - `파트너클래스/목록/css.css`
    - 퀵 필터 레일 스타일, 카드 신뢰 배지 스타일, 카드 하단 지도 CTA 스타일 추가.
    - 카드 구조를 `링크 본문 + 오프라인 지도 액션` 구조에 맞게 보정.
  - `파트너클래스/목록/js.js`
    - 신뢰 배지 6종 계산 로직 추가.
    - `pressco21_catalog_filters_v1` localStorage 복원 로직 추가.
    - `오프라인 -> 원데이/정기`, `온라인 -> 온라인` 매핑 퀵 필터 추가.
    - 오프라인 카드에 `가까운 공방 보기` Google Maps 검색 링크 추가.
    - 협회 탭 금액 포맷 함수 충돌 수정, `normalizedContains()` 누락 보완, 최근 본 클래스 추적에서 외부 지도 링크 제외.
- 문서/메모리
  - `ROADMAP.md`
    - S1-3를 `✅ 완료`로 변경하고 운영 메모와 Playwright 검증 결과 반영.
  - `docs/파트너클래스/list-badge-filter-guide.md`
    - 배지 기준, 퀵 필터 저장 키, 지도 진입점, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 목록 UX 가이드 문서 연결.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
    - S1-3 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/목록/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace(`xmlns`) 기준 false positive 확인
  - Playwright 로컬 모킹 검증:
    - 초기 `총 4개의 클래스`, 배지 6종 전체 확인
    - `서울 + 오프라인 + 입문 + 5만원 이하` 조합 결과 1건 확인
    - 새로고침 후 필터 복원 확인
    - `온라인` 전환 시 지도 CTA 제거 확인
  - 스크린샷 산출물:
    - `output/playwright/s1-3-20260310/list-quick-filter-state.png`

### [CODEX-LEAD] Phase 3 S1-2 상세 UX 고도화 완료 (CODEX)
- 프론트
  - `파트너클래스/상세/Index.html`
    - 상단 `Trust Summary Bar` 영역 추가.
    - `이 가격에 포함된 것` 섹션 추가.
    - 데스크탑 `키트만 구매` 링크와 모바일 하단 3계층 CTA 추가.
  - `파트너클래스/상세/css.css`
    - 상단 고정 신뢰 바 스타일 추가.
    - 포함 내역 카드 스타일 추가.
    - 데스크탑/모바일 CTA 계층 스타일 분리.
    - 모바일 하단 고정 바를 `총 결제 예상 + 예약하기 / 선물하기 + 키트만 구매` 2줄 구조로 재구성.
  - `파트너클래스/상세/js.js`
    - `수강 / 평점 / 후기` 요약 바 렌더링 추가.
    - `강의 / 재료키트 / 수료증` 포함 내역 판단/렌더링 추가.
    - 데스크탑/모바일 `예약하기`, `선물하기`, `키트만 구매` 버튼 상태 동기화 추가.
    - 모바일 하단 바 금액이 선택 인원에 맞춰 갱신되도록 수정.
- 문서/메모리
  - `ROADMAP.md`
    - S1-2를 `✅ 완료`로 변경하고 운영 메모 추가.
  - `docs/파트너클래스/detail-ux-upgrade-guide.md`
    - 상세 UX 변경 목적, CTA 계층, 포함 내역 상태 기준, Playwright 검증 산출물 정리.
  - `docs/파트너클래스/README.md`
    - 새 상세 UX 가이드 문서 연결.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
    - S1-2 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/상세/js.js`
  - Playwright 로컬 모킹 검증:
    - desktop: `Trust Summary Bar`, 포함 내역 3카드, 데스크탑 CTA 3계층 확인
    - mobile: 하단 고정 바 노출, `예약하기 / 선물하기 / 키트만 구매` 확인
  - 스크린샷 산출물:
    - `output/playwright/s1-2-20260310/detail-desktop-trust-bar.png`
    - `output/playwright/s1-2-20260310/detail-mobile-cta.png`

### [CODEX-LEAD] Phase 3 S1-1 키트 연동 Step 1 완료 (CODEX)
- 프론트
  - `파트너클래스/강의등록/Index.html`, `css.css`, `js.js`
    - 키트 항목 입력을 `상품명 / 자사몰 상품 링크 / 예상 판매가 / 1인 기준 수량` 구조로 변경.
    - `branduid`만 넣어도 링크로 정규화되도록 검증/수집 로직 보강.
  - `파트너클래스/파트너/css.css`, `js.js`
    - 클래스 수정 모달도 같은 키트 구조를 사용하도록 통일.
    - legacy `product_code` 데이터를 링크형으로 보정 로드.
  - `파트너클래스/상세/Index.html`, `css.css`, `js.js`
    - 재료 섹션을 카드형 UI로 재구성.
    - `재료 한번에 담기`, `상품 보기`, `장바구니 담기` CTA 추가.
    - `kit_items` 우선, legacy `materials_product_ids` fallback 구조로 렌더링.
- 워크플로우/서버
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
    - 상세 응답의 `kit_items`를 `product_url`, `price`, `quantity`, `branduid` 기준으로 정규화.
  - `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json`
    - 키트 주문 텔레그램 알림에 상품 링크와 예상 판매가를 포함.
  - `파트너클래스/n8n-workflows/WF-16-class-register.json`
    - 키트 링크 입력 검증 추가.
    - 라이브 DB 제약에 맞춰 INSERT는 `status=INACTIVE`, 소문자 `level`, `region 미저장`으로 저장하고 성공 응답은 `PENDING_REVIEW`로 통일.
  - `파트너클래스/n8n-workflows/WF-20-class-edit.json`
    - 수정 API도 같은 키트 구조를 검증/정규화.
  - 운영 n8n 재배포 완료:
    - `WF-01=WabRAcHmcCdOpPzJ`
    - `WF-05=W3DFBCKMmgylxGqD`
    - `WF-16=I4zkrUK036YEiUHe`
    - `WF-20=EHjVijWGTkUkYNip`
- 문서/메모리
  - `ROADMAP.md`
    - S1-1을 `✅ 완료`로 변경하고 라이브 DB 제약 메모 추가.
  - `docs/파트너클래스/kit-link-integration-guide.md`
    - 표준 키트 JSON 구조, 화면/워크플로우 반영 범위, 라이브 제약, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 가이드 문서를 문서 인덱스에 추가.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
    - S1-1 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/강의등록/js.js`
  - `node --check 파트너클래스/파트너/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - 라이브 API:
    - `class-register` 정상 등록 성공
    - `class-register` 잘못된 키트 링크 `HTTP 400 / INVALID_PARAMS`
    - `class-edit` 정상 수정 성공
    - `class-edit` 잘못된 키트 항목 `HTTP 400`
    - `class-api getClassDetail`의 `kit_items` 정규화 확인
  - Playwright 로컬 검증:
    - 상세 페이지 재료 섹션 제목/카드/`재료 한번에 담기` CTA 확인
    - 강의 등록 페이지 키트 토글, 4개 입력 라벨, 기본 항목 1개 자동 생성 확인

### [CODEX] CRM 레거시 수금 처리 + 택배송장 자동입력 보강 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 고객 메모에 `[LEGACY_RECEIVABLE_META]` JSON을 저장해 레거시 수금 누적액을 관리하는 helper를 추가.
  - 레거시 baseline 계산 시 누적 수금액을 차감하도록 변경.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - `레거시 잔액` 탭에 `입금 확인` 버튼과 레거시 수금 전용 다이얼로그를 추가.
  - 저장 시 고객 메모 메타데이터를 갱신하고 고객 미수 통계를 재계산하도록 연결.
- `offline-crm-v2/src/lib/api.ts`
  - 명세표에 `customer_address_key` 필드를 허용해 선택 주소를 저장할 수 있게 보강.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 명세표 저장 시 선택 주소 키를 함께 저장.
  - 주소 전환 시 `customer_address_key`도 같이 갱신.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - 택배송장 자동 다운로드 시 받는분 전화/핸드폰을 같은 휴대폰 번호로 채우고, 주소는 명세표에 저장된 선택 주소 기준으로 채우도록 변경.
  - 수량은 항상 `1`, 배송메세지는 빈값으로 고정.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - `cd offline-crm-v2 && bash deploy/deploy.sh`
  - 결과: 성공, 운영 반영 완료

### [CODEX] CRM 레거시/CRM 미수금 집계 통합 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 레거시 미수 baseline을 스냅샷만으로 동기 계산할 수 있는 helper를 추가.
  - `분리 거래명 별도 고객` 메모가 있는 CRM 전용 고객은 부모 레거시 baseline을 상속하지 않도록 유지.
- `offline-crm-v2/src/lib/receivables.ts`
  - `legacyBaseline`, `crmRemaining`, `totalRemaining`, `source`를 함께 가지는 고객별 미수 ledger builder를 추가.
- `offline-crm-v2/src/pages/Dashboard.tsx`
  - 대시보드 미수금 총액을 `레거시 미수 + CRM 열린 명세표 미수` 합산으로 변경.
  - KPI 보조문구에 `레거시 / CRM` 분해값을 표시.
- `offline-crm-v2/src/pages/Customers.tsx`
  - 고객관리 `미수금` 컬럼이 CRM 명세표만이 아니라 레거시 미수까지 포함한 총 미수금을 표시하도록 변경.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 미수금 탭을 `전체 / CRM 명세표 / 레거시 잔액` 3개 탭으로 분리.
  - `전체` 탭은 고객 단위 총 미수, `CRM` 탭은 기존 입금 처리 명세표, `레거시` 탭은 원장 기준 고객별 미수를 노출.
  - 총액 요약은 `레거시 + CRM` 합산으로 통일.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - `cd offline-crm-v2 && bash deploy/deploy.sh`
  - 결과: 성공, 운영 반영 완료

### [CODEX-LEAD] 전국 탐색 허브 + 파트너맵 통합 방향 반영 (CODEX)
- `docs/파트너클래스/shared-service-identity.md`
  - 파트너클래스를 `전국 오프라인/온라인 클래스를 카테고리와 지역 기준으로 탐색하는 허브`로 명시.
  - 파트너맵을 별도 서비스가 아니라 오프라인 클래스 탐색을 강화하는 지리적 뷰로 통합한다는 원칙을 추가.
- `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`
  - 수강생 핵심 경험을 `카테고리 -> 지역 -> 형태(오프라인/온라인)` 탐색 흐름으로 재정의.
  - 오프라인 클래스는 파트너맵과 통합된 리스트/지도 전환, 온라인 클래스는 지도 없는 비교 흐름으로 보는 전략을 추가.
- `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md`
  - 목적과 수강생 여정에 `전국 오프라인/온라인 탐색 허브` 관점을 반영.
  - 파트너맵 통합을 수강생 여정의 공식 전제로 명시.
- `ROADMAP.md`
  - `S1-3`에 `형태(오프라인/온라인)` 퀵 필터와 오프라인 클래스 지도 진입점을 반영.
  - `S2-3`을 `파트너맵 통합`까지 포함하는 IA 확장 태스크로 강화.
- `docs/파트너클래스/phase3-non-technical-test-guide.md`
  - 비전공자 테스트 가이드에 `온라인/오프라인 전환`, `지도/리스트 일관성`, `지역 기반 오프라인 탐색` 확인 포인트를 추가.

### [CODEX-LEAD] Phase 3 비전공자 테스트 가이드 추가 (CODEX)
- `docs/파트너클래스/phase3-non-technical-test-guide.md`
  - Phase 3 전체 방향을 비전공자도 이해할 수 있도록 `수강생 / 파트너 / 협회` 3개 관점으로 다시 설명.
  - Phase 3-0 ~ 3-3을 기술 용어 대신 "무엇이 바뀌는지 / 왜 중요한지 / 화면에서 뭘 봐야 하는지 / 합격과 불합격 신호" 중심으로 정리.
  - 향후 테스트 시 `상세 신뢰감`, `목록 탐색감`, `재구매 흐름`, `파트너 온보딩/대시보드`, `협회/세미나`, `협회원 혜택`을 어떻게 봐야 하는지 체크포인트를 문서화.
- `docs/파트너클래스/README.md`
  - 현재 유지 문서 목록에 비전공자용 테스트 가이드를 추가해 문서 진입점에서 바로 찾을 수 있게 정리.

### [CODEX-LEAD] Phase 3 S0-1 NocoDB 일일 자동 백업 구축 완료 (CODEX)
- `scripts/server/nocodb-daily-backup.sh`
  - NocoDB DB 파일 + `nocodb_data` 볼륨 tar.gz + compose 파일 + `n8n/.env`를 일일 백업하도록 저장소 기준 스크립트를 추가.
  - 7일 롤링 삭제, 월간 아카이브, 실패 시 `telegram-notify.sh`와 `backup-notify` webhook 호출, `PRESSCO21_BACKUP_FORCE_FAIL=1` 테스트 플래그를 포함.
- `scripts/server/install-nocodb-backup-cron.sh`
  - 로컬 저장소에서 서버 `/home/ubuntu/scripts/backup.sh`로 반영하고 crontab을 재설치하는 스크립트를 추가.
- 서버 반영
  - `/home/ubuntu/scripts/backup.sh` 재설치
  - crontab 백업/정리 라인을 `20??????_??????` 패턴 기준으로 재설치
- 검증
  - 수동 백업 실행: `/home/ubuntu/backups/20260310_101318` 생성 확인
  - 생성 파일: `noco_*.db`, `nocodb_data_*.tar.gz`, compose 3종, `n8n_env_*.bak`, manifest

### [CODEX-LEAD] Phase 3 S0-2 상태값 정규화 완료 (CODEX)
- `파트너클래스/n8n-workflows/WF-01-class-api.json`
  - `getClasses/getClassDetail/getCategories` 응답을 canonical status/level/region 기준으로 정규화.
  - `getClasses`가 `입문/beginner/BEGINNER`, `서울/SEOUL` 같은 혼합 입력을 동일하게 처리하도록 보정.
  - 목록 응답에 `region`, `status`, `partner_grade`, `remaining seats` 집계를 포함한 뒤 라이브 재배포 완료.
- `파트너클래스/n8n-workflows/WF-06-class-management.json`
  - 클래스 상태 변경 API가 legacy status를 받아도 `ACTIVE/PAUSED/ARCHIVED` canonical 값으로 저장/응답하도록 정리.
- `파트너클래스/n8n-workflows/WF-16-class-register.json`
  - 강의 등록 시 difficulty/region을 canonical 값으로 저장하고 `PENDING_REVIEW` 상태로 생성하도록 수정.
  - `Create Initial Schedules`와 관리자 알림 메시지 노드 문법 오류를 같이 정리.
- `파트너클래스/n8n-workflows/WF-17-class-approve-auto.json`
  - `ACTIVE` 전환 감지 기준으로 메이크샵 상품 자동 등록을 수행하도록 수정.
- `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
  - `getPendingClasses`가 legacy/new status를 모두 읽고 canonical 값으로 응답하도록 수정.
  - `approveClass/rejectClass`가 `ACTIVE/REJECTED`를 저장하도록 정리.
- `파트너클래스/목록/js.js`
  - filter/query 파라미터를 canonical level/region으로 정규화하고, 카드 지역/난이도 표시 보정을 추가.
- `파트너클래스/상세/js.js`
  - related classes와 난이도/지역 링크 문맥이 canonical 값과 legacy 입력을 모두 처리하도록 수정.
- `파트너클래스/파트너/js.js`
  - 대시보드 상태 토글/배지 표시를 canonical class status 기준으로 변경.
  - legacy grade(`SILVER/GOLD/PLATINUM`)를 `BLOOM/GARDEN/ATELIER`로 alias 처리.
- `파트너클래스/강의등록/js.js`
  - 폼 제출 difficulty를 canonical uppercase 값으로 전송하도록 수정.
- `scripts/server/partnerclass-s0-2-normalize-nocodb.sh`
  - 컨테이너 sqlite3 부재 환경에서도 호스트 mount DB로 fallback 되도록 보강.
  - 라이브 NocoDB에서 `tbl_Classes.level/status/region`, `tbl_Applications.status`, `tbl_Settlements.status` 정규화 실행 완료.
- 서버/배포
  - n8n 운영 반영: `WF-01=WabRAcHmcCdOpPzJ`, `WF-06=ty68eBtMnlH2lz7x`, `WF-16=I4zkrUK036YEiUHe`, `WF-17=N3p7L6wo0nuT5cqM`, `WF-ADMIN=SMCKmeLSfxs1e1Ef`
  - 사전 백업: `/home/ubuntu/backups/20260310_113500`
  - n8n 현재 정의 백업: `output/n8n-backups/20260310-s0-2/`
- 검증
  - workflow JSON 전체 `JSON.parse` 및 모든 `jsCode` `AsyncFunction` 컴파일 통과
  - `bash -n scripts/server/partnerclass-s0-2-normalize-nocodb.sh`
  - 라이브 `class-api`:
    - `getClasses level=입문/beginner/BEGINNER` 모두 `total=5`
    - `getClasses region=서울/SEOUL` 모두 `total=5`
    - 기본 목록 `total=7`, status=`ACTIVE`만 반환
    - `getClassDetail` 응답 `status=ACTIVE`, `level=BEGINNER`, `region=SEOUL`, `partner.grade=BLOOM` 확인
  - 라이브 상세 → 입문 링크 클릭 시 목록 `총 5개의 클래스` 확인 (Playwright MCP)
  - 라이브 목록 첫 진입 `총 7개의 클래스` / 상세 진입 확인 (Playwright MCP)
  - 7일 정리 검증: 더미 디렉토리 `20260228_000000` 생성 후 cleanup 명령으로 삭제 확인
  - 실패 알림 검증: `PRESSCO21_BACKUP_FORCE_FAIL=1 bash /home/ubuntu/scripts/backup.sh` 실행 시 `WF-BACKUP Backup Notify` 실행 로그 확인
- `docs/파트너클래스/backup-restore-guide.md`
  - 저장소 기준 스크립트 경로, 재설치 명령, 수동/실패 테스트 방법을 반영.
- `ROADMAP.md`
  - Task `S0-1`을 `✅ 완료`로 갱신하고 검증 결과를 변경 이력에 기록.

### [CODEX-LEAD] Phase 3 S0-3 WF-ADMIN 중복 ID 정리 + S0-4 Switch 문서화 완료 (CODEX)
- 운영 n8n
  - inactive `WF-ADMIN Admin API` 중복 4건 삭제 완료:
    - `LwkPImRkhuoN3krF`
    - `FgTVuCi37J68QVYa`
    - `ggzThCFb4LG1uHJl`
    - `YT6cKPhozRLpKS7u`
  - 유지 ID: `SMCKmeLSfxs1e1Ef` 1건만 ACTIVE
  - 삭제 전 백업: `output/n8n-backups/20260310-s0-3/`
- `파트너클래스/어드민/js.js`
  - 강의 승인 탭 기본/재조회 status를 `PENDING_REVIEW` 기준으로 맞춤.
  - legacy `INACTIVE` 필터값이 들어와도 `PENDING_REVIEW`로 정규화하는 helper 추가.
  - 상태 라벨 맵을 `ACTIVE / PENDING_REVIEW / PAUSED / ARCHIVED / REJECTED` 기준으로 정리.
- `docs/파트너클래스/WF-01-switch-map.md`
  - `getClasses`, `getClassDetail`, `getCategories`, `getAffiliations` 4개 action의 입력 파라미터, 응답 구조, 호출 페이지, unknown action 처리 경로 문서화.
- `docs/파트너클래스/README.md`
  - `WF-01-switch-map.md`를 유지 문서 목록에 추가.
- 검증
  - 운영 n8n 목록 조회 결과 `WF-ADMIN Admin API`는 `SMCKmeLSfxs1e1Ef` 1건만 남음
  - 라이브 `admin-api` 읽기 호출:
    - `getApplications status=PENDING` 정상 응답
    - `getPendingClasses status=PENDING_REVIEW` 정상 응답
  - `node --check 파트너클래스/어드민/js.js`

### 파트너클래스 공용 메모리 및 문서 정리 (CODEX)
- `.claude/agent-memory/class-platform-architect/MEMORY.md`
- `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - Claude Code가 바로 같은 방향으로 대화할 수 있도록 파트너클래스 정체성, IA 3레이어, 우선 고객, 수익 구조, KPI 기준을 공용 메모리로 반영.
- `docs/파트너클래스/README.md`
  - 현재 기준으로 먼저 읽어야 할 문서, 판단 우선순위, 운영 가이드, 참고용 아카이브를 한 장으로 정리.
- `CLAUDE.md`, `AGENTS.md`, `파트너클래스/AGENTS.md`, `파트너클래스/GUIDE.md`
  - 파트너클래스 작업 시 `README -> shared-service-identity -> enterprise-elevation-strategy` 순서로 문맥을 잡도록 진입점을 통일.
- `docs/파트너클래스/archive/2026-03-10/`
  - 임시 handoff, 상세 상용화 감사, 구형 플랫폼 개요 가이드를 아카이브로 이동해 현재 문서 묶음과 분리.
- `docs/n8n-automation-efficiency-review-2026-03-09.md`
  - 구형 `platform-overview-guide.md` 대신 새 문서 인덱스를 참조하도록 정리.

### 파트너클래스 공용 정체성 문서 연결 (CODEX)
- `docs/파트너클래스/shared-service-identity.md`
  - Claude Code와 Codex CLI가 공통으로 따라야 할 파트너클래스 정체성 기준을 짧은 문서로 정리.
  - `수강생 1순위`, `파트너/협회는 공급자 레이어`, `재료/키트 판매 활성화`, `협회 제휴/협회원 락인`을 공용 판단 기준으로 명시.
- `CLAUDE.md`
  - 파트너클래스 작업 전 공용 정체성 문서와 상세 전략 문서를 먼저 읽도록 섹션 추가.
- `AGENTS.md`
  - Codex 작업 시 파트너클래스 관련 기획/UX/카피/문서 작업 전에 공용 정체성 문서를 우선 참조하도록 명시.
- `파트너클래스/AGENTS.md`
  - 파트너클래스 전용 지침 상단에 공용 정체성 문서 경로와 핵심 기준 요약 추가.

### CRM 미수 상위 20건 대조 감사 (CODEX)
- `offline-crm-v2/docs/top-20-receivables-reconciliation-2026-03-10.md`
  - CRM `outstanding_balance > 0` 상위 20건을 레거시 백업 잔액과 CRM 미수 명세표 기준으로 대조.
  - 결과는 `20/20 정합`, 이 중 `18건`은 레거시 잔액과 완전 일치, `2건`은 `레거시 baseline + CRM 미수 명세표`로 설명 가능함을 문서화.
  - 따라서 상위 미수 고객 기준으로는 `얼마에요 원본`과 CRM 미수금이 실질적으로 같은 체계로 유지된다고 판정.

### CRM 잔액 재계산 로직 보정 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 레거시 거래처 스냅샷 타입, 공통 매칭 로직, 스냅샷 캐시 fetch, baseline 잔액 조회 helper를 분리.
- `offline-crm-v2/src/lib/api.ts`
  - `recalcCustomerStats()`가 CRM 미수만 덮어쓰지 않고 `legacy baseline + CRM 미수`로 `outstanding_balance`를 재계산하도록 수정.
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - 고객 상세의 레거시 원본 매칭 로직도 새 공통 helper를 사용하도록 정리해 화면과 재계산이 같은 기준을 공유.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - 결과: 성공

### 파트너클래스 엔터프라이즈 고도화 전략 문서화 (CODEX)
- `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`
  - 현재 PRD/로드맵의 비전과 2026-03-10 라이브 UI 상태를 교차 검토해 서비스 목적 재정의 초안을 문서화.
  - 대표/운영/파트너/수강생 인터뷰 프레임, JTBD 산출물, 엔터프라이즈급 UX 우선순위, 4단계 실행 순서를 정리.
  - 라이브 기준 핵심 갭을 `운영 OS 비전 대비 카탈로그형 UX`, `용어 혼재`, `운영 가치 전달 부족`으로 명시.
  - 추가로 대표 1차 답변을 반영해 `수강생 중심`, `파트너/협회는 공급자 레이어`, `직접 수익보다 재료/키트 활성화` 방향으로 전략 축을 재정렬.
  - 협회 콘텐츠는 별도 서비스가 아니라 같은 허브 안의 분리된 탐색 레이어로 두는 구조, 파트너 대시보드 핵심 KPI 후보 3종도 함께 정리.
  - 후속으로 `협회 제휴를 유치하는 B2B 미끼`, `협회원 전용 제품/혜택을 통한 자사몰 락인`, `협회 일정/세미나/시그니처 상품 허브` 구조까지 전략에 반영.

### CRM 잔액 불일치 6건 원인 분석 (CODEX)
- `offline-crm-v2/docs/legacy-balance-analysis-2026-03-10.md`
  - 잔액 불일치 6건을 고객별로 대조한 결과, 전부 `레거시 tradebook.balance + CRM 미수 명세표 합계 = 현재 CRM 고객 잔액` 공식을 만족함을 정리.
  - 따라서 현재 6건은 이관 누락이 아니라 `레거시 baseline을 유지한 운영 잔액` 케이스로 판정.
  - 동시에 `recalcCustomerStats()`가 레거시 baseline을 합산하지 않아 재계산 시 잔액을 훼손할 수 있는 구조적 리스크도 문서화.
- 검증
  - 인라인 재검증 결과 6건 모두 `formula_match = true`

### 파트너클래스 라이브 회귀 스크립트 보강 (CODEX)
- `scripts/partnerclass-live-smoke.js`
  - 게스트 시나리오에 `2609/2608/8009/8010/2610` 로그인 안내 링크 회귀와 `2607 상세 후기 로그인 경로` 검증을 추가.
  - 상세 분류 링크를 실제 목록 필터 결과까지 따라가는 회귀 시나리오를 추가하고, 모바일/데스크탑 중복 링크는 visible anchor만 수집하도록 보강.
  - 파트너 자격증명이 없을 때 멤버 전용 시나리오는 `skip` 처리하고, 관리자 API 읽기 전용 검증은 `0건`도 정상 응답으로 간주하도록 수정.
  - 멤버 전용 상세 `선물하기 -> 선물 주문서` 시나리오를 추가해 자격증명 주입 시 바로 재검증할 수 있게 정리.
- 검증
  - `node --check scripts/partnerclass-live-smoke.js`
  - `NODE_PATH=/Users/jangjiho/workspace/pressco21/offline-crm-v2/node_modules node scripts/partnerclass-live-smoke.js`
  - 결과: `14건 중 12건 성공 / 1건 실패 / 1건 건너뜀`
  - 확인된 라이브 실패: `상세 분류 링크 회귀`
    - `https://n8n.pressco21.com/webhook/class-api` 기준 `{"action":"getClasses","level":"입문"}` 는 `total=0`
    - 동일 API에서 `{"action":"getClasses","level":"beginner"}` 는 `total=5`
    - 즉, 라이브 목록/API 레벨 필터 어휘가 아직 영문(`beginner`) 기준이라 상세의 한글 레벨 링크와 실제 결과가 불일치함

### CRM 데이터 정합성 P1 재감사 (CODEX)
- `offline-crm-v2/scripts/repair_legacy_backup.py`
  - blank legacy 고객 관련 거래만 선별 조회하도록 바꿔 dry-run 시간이 길어지지 않게 정리.
  - customer patch를 현재 값과 diff 비교 후 압축하도록 보강해 no-op 업데이트를 요약에서 제거.
  - 최신 dry-run 기준 실제 남은 보정은 `customer_updates 6`, `customer_creates 0`, `tx_updates 0`, `product_creates 0`.
- `offline-crm-v2/docs/legacy-backup-audit-2026-03-10.md`
  - 예전 문서에 남아 있던 `누락 고객 15건 / 분리 거래 237건 / 품목 1건 누락`을 재검증 결과 기준으로 정정.
  - 현재 P1 실잔여 이슈를 `outstanding_balance 6건`으로 축소하고, 이를 이관 실패가 아니라 잔액 정책 미확정 이슈로 재분류.
- 검증
  - `cd offline-crm-v2 && python3 scripts/repair_legacy_backup.py`
  - 결과: `customer_updates 6 / customer_creates 0 / tx_updates 0 / product_creates 0`

### CRM 얼마에요 대체 평가 + E2E 기준선 복구 (CODEX)
- `offline-crm-v2/docs/crm-replacement-assessment-2026-03-10.md`
  - 현재 CRM의 `얼마에요` 대체 수준을 `부분 대체 성공, 완전 대체 미완료`로 판정하고 데이터/회계/UX/QA 기준을 문서화.
  - 다음 단계 우선순위를 `기준선 복구 -> 데이터 진실원 확정 -> 회계 정확도 보강 -> UX 정제` 순으로 정리.
- `offline-crm-v2/tests/01-customers.spec.ts`
  - 고객 목록 액션 컬럼 추가 반영으로 헤더 기대값을 `7 -> 8`로 갱신.
- `offline-crm-v2/tests/02-invoices.spec.ts`
  - 페이지 제목을 현재 UI 기준 `명세표 작성/관리`로 갱신.
  - 송장 버튼 명칭, 품목 placeholder, 토스트 기반 유효성 경고, 거래 상세 -> 수정 열기 흐름을 반영해 명세표 테스트를 현재 동작 기준으로 복구.
  - 과세 체크 후 세액 계산을 검증하도록 T2-07을 보강.
- `offline-crm-v2/tests/03-dashboard.spec.ts`
  - 사이드바 메뉴 기대값을 현재 구조 `명세표 작성 / 거래/명세표 조회 / 캘린더 / 설정` 포함 기준으로 갱신.
- 검증
  - `cd offline-crm-v2 && npx playwright test tests/01-customers.spec.ts tests/02-invoices.spec.ts tests/03-dashboard.spec.ts`
  - 결과: `28 passed (28.3s)`

### 파트너클래스 handoff 백업
- 재시작용 handoff 문서를 [docs/파트너클래스/archive/2026-03-10/partnerclass-handoff-2026-03-10.md](/Users/jangjiho/workspace/pressco21/docs/파트너클래스/archive/2026-03-10/partnerclass-handoff-2026-03-10.md)에 보관.
- 전역 Codex 메모리에도 `pressco21-partnerclass-handoff-2026-03-10.md`로 핵심 요약을 백업.
- 다음 세션에서는 `AI_SYNC.md`와 handoff 문서만 읽어도 `메이크샵 저장 확인 -> 라이브 재검증 -> Atlas 연결 검토` 순서로 바로 이어갈 수 있게 정리.

### 파트너클래스 UX 긴급 수정
- 라이브 재현
  - `output/playwright/partnerclass-ux-20260310/ux-audit-results.json` 기준으로 `파트너신청(2609)` 로그인 버튼이 `/member/login.html`로 연결되어 `net::ERR_ABORTED`로 실패하는 문제를 재현.
  - `상세(2607)` 선물하기가 메이크샵 선물 주문서가 아니라 일반 `shopdetail.html?branduid=...`로만 이동하는 흐름을 재현.
  - 상세의 `클래스 더 둘러보기` 링크가 `level=beginner`, `region=서울 강남구`처럼 목록 필터와 맞지 않는 값으로 생성되는 문제를 확인.
- 프론트 수정
  - `파트너클래스/파트너신청/Index.html`, `파트너클래스/파트너신청/js.js`
    - 로그인 버튼 기본 링크와 JS 폴백을 `/shop/member.html?type=login` 기반으로 교체하고 현재 페이지 `returnUrl`을 붙이도록 수정.
  - `파트너클래스/파트너/Index.html`, `파트너클래스/파트너/js.js`
    - 파트너 대시보드 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/강의등록/Index.html`, `파트너클래스/강의등록/js.js`
    - 강의등록 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/마이페이지/Index.html`
    - 마이페이지 로그인 안내 링크를 메이크샵 실제 로그인 경로로 교체.
  - `파트너클래스/교육/Index.html`, `파트너클래스/교육/js.js`
    - 교육 페이지 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/상세/js.js`
    - 공통 `buildLoginUrl()` 헬퍼 추가로 리뷰 작성/예약/선물하기 로그인 이동 경로를 일관화.
    - 상세 분류 링크에서 난이도 영문값(`beginner/intermediate/advanced`)을 목록 필터 값(`입문/중급/심화`)으로 정규화.
    - 상세 지역 링크를 목록 필터 체계(`서울/경기/인천/부산/대구/기타`)에 맞게 정규화.
    - 선물하기는 메이크샵 상품 상세를 먼저 조회해 native gift 링크가 있으면 그대로 사용하고, 없으면 `basket.action.html -> /shop/order.html + add_rand_url` 흐름으로 연결되도록 수정.
    - 선물하기 처리 중 중복 클릭을 막는 loading 상태와 오류 토스트 복구 처리 추가.
  - `파트너클래스/상세/css.css`
    - 선물하기 버튼 loading 스피너 스타일 추가.
- 검증
  - `node --check 파트너클래스/파트너신청/js.js` → `OK`
  - `node --check 파트너클래스/파트너/js.js` → `OK`
  - `node --check 파트너클래스/강의등록/js.js` → `OK`
  - `node --check 파트너클래스/교육/js.js` → `OK`
  - `node --check 파트너클래스/상세/js.js` → `OK`
  - `curl -I https://www.foreverlove.co.kr/member/login.html` → `204`
  - `curl -I https://www.foreverlove.co.kr/shop/member.html?type=login` → `200`
  - `curl https://www.foreverlove.co.kr/shop/shopdetail.html?branduid=12195642` 점검 기준, 클래스 실상품은 현재 native `.btn-gift` 노출이 없어 프론트가 우선 `basket.action` 선물 흐름으로 폴백하도록 맞춤.

### CRM 수정
- `offline-crm-v2/docs/crm-handoff-2026-03-09.md`, `.claude/agent-memory/accounting-specialist/MEMORY.md`
  - 최근 CRM 인쇄/고객수정/과세 기본값/캘린더/미수금 복구 작업을 다음 에이전트가 바로 이어받을 수 있도록 handoff 문서와 accounting 메모리를 정리.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 운영 `invoices` 스키마에 없는 `paid_date`, `payment_method` 필드 조회 때문에 페이지 전체가 실패하던 문제 수정.
  - 미수금 조회는 다시 안정적인 `payment_status in (unpaid, partial)` 기준 전체 조회로 바꾸고, `asOf` 날짜는 프론트에서 필터링하도록 조정.
  - 입금 확인 저장 payload에서도 스키마에 없는 `paid_date` 전송을 제거.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 운영 `invoice_date` 필드가 NocoDB 서버측 `gte/lte` 날짜 비교를 지원하지 않아 월간/기간 쿼리가 실패하던 문제 수정.
  - 캘린더는 전체 명세표를 한 번 읽고 프론트에서 월/기간/전년동월 범위를 필터링하도록 변경.
  - `기준일 미수 후속`도 서버 날짜 조건이 아니라 현재 미수 명세표 전체를 읽은 뒤 기준일 이전 건만 프론트에서 골라 표시하도록 조정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 운영 스키마에 없는 `paid_date`를 복사/저장 payload에 섞지 않도록 정리.
- 운영 검증
  - `curl`로 운영 `crm-proxy` 응답을 직접 확인해 2026-03-09 명세표 8건, 현재 미수 6건 존재를 검증.
  - 로컬 Vite 프록시(`http://127.0.0.1:4173`)에서 실제 화면 검증:
    - `미수금 관리` 정상 로드, 총 `1,704,700원 / 6건`
    - `캘린더` 2026년 3월 정상 로드, `명세표 8건 / 1,810,260원`, `03-09`에 `8건 / 181만원`
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.
- `offline-crm-v2/src/lib/api.ts`
  - `fetchAllPages` 기반 `getAllInvoices`, `getAllCustomers` 추가로 캘린더/미수금의 500/1000건 샘플 조회를 전체 조회로 교체할 수 있게 정리.
  - `Invoice.paid_date` 타입을 `string | null`로 확장해 저장 시 비우기/설정이 명시적으로 가능하도록 수정.
- `offline-crm-v2/src/lib/reporting.ts`
  - 기준일 기준 `paid_amount`, `remaining_amount`, `payment_status` 계산 helper 추가.
  - 기간 리포트에서 전년 동월 CRM 명세표 매출을 함께 반영할 수 있도록 `previousYearInvoiceSales` 입력 지원 추가.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 월간 달력 조회를 `calendar-month-invoices` 전체 조회로 교체해 월 500건 제한 문제 수정.
  - 기간 리포트를 최신 1000건 샘플이 아니라 선택 기간 전체 명세표 기준으로 계산하도록 수정.
  - `전년동월 대비` 계산에 전년 동월 CRM 명세표 매출을 포함하도록 수정.
  - `기준일 미수 후속`을 현재 `payment_status`가 아닌 `paid_date` 기반 기준일 미수 계산으로 교체.
  - `재방문 추천`은 과거 기준일 재현이 불가능한 현재 데이터 필드(`last_order_date`)를 쓰고 있어, 의미를 `현재 기준 재방문 추천`으로 명시하고 조회도 전체 고객 기준으로 교체.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 미수금 목록/에이징/총액을 현재 상태값이 아니라 기준일 기준 as-of 계산으로 재구성.
  - 과거 기준일에서는 조회 전용 안내를 표시하고 `입금 확인` 버튼을 비활성화해, 과거 스냅샷 화면에서 현재 레코드를 잘못 수정하는 위험을 차단.
  - 엑셀 내보내기도 선택 기준일 기준 경과일수/입금액/미수금이 반영되도록 수정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 명세표 저장 시 `paid_amount > 0`이면 `paid_date`가 자동 기록되고, 0원이면 `paid_date`가 비워지도록 정리.
  - 명세표 복사 시 기존 수금일이 따라오지 않도록 `paid_date` 초기화 추가.
- `offline-crm-v2/src/lib/excel.ts`
  - `exportReceivables`가 선택 기준일을 받아 경과일수를 계산하도록 확장.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 정합성 수정 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 날짜 클릭 시 `바로 실행 / 당일 명세표 / 기준일 미수 후속 / 재방문 추천` 패널 추가.
  - `명세표 보기`, `미수 보기`, `이 날짜로 새 명세표 발행` 버튼을 실제 라우트 이동과 연결.
  - 기준일 이전 미수 명세표 상위 목록과 45일 이상 무주문 거래처 추천 로직 추가.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - `date` query param 연동 및 발행일 필터 UI 추가.
  - `new=1&date=YYYY-MM-DD` 진입 시 해당 날짜를 기본값으로 새 명세표 다이얼로그가 열리도록 수정.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - `asOf` query param 연동 및 `기준일` 필터 UI 추가.
  - 에이징/총 미수금/목록이 현재 시점이 아니라 선택 기준일 기준으로 계산되도록 수정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - `initialInvoiceDate` prop 추가로 외부에서 새 명세표 기본 발행일을 주입할 수 있도록 수정.
  - 명세표 저장 후 `calendar-*` query까지 invalidate 하도록 보강.
- `offline-crm-v2/src/lib/reporting.ts`
  - 기간 리포트 공통 helper 추가: 프리셋(`이번달/지난달/이번분기/올해`), 기간 범위 계산, 금액 포맷, 수금률/전년동월 색상 규칙, 기간 통합 매출 계산, 일별 차트 데이터 생성.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 캘린더 상단에 `기간 매출 리포트` 섹션 추가.
  - Dashboard와 동일한 계산식으로 `수금률`, `전년동월 대비/기간 매출`, `평균 객단가`, `일별 매출 차트`를 표시하도록 수정.
  - 월간 달력은 `명세표 기준`, 상단 리포트는 `레거시 거래내역 + CRM 명세표 통합 기준`으로 역할을 분리해 안내 문구 추가.
  - 날짜 셀에 `미수 건수`를 노출하고, 우측 패널에 선택 날짜 실행 요약 / 월간 요약 / 매출 상위 날짜 카드 추가.
  - 월별 명세표 조회 범위도 실제 말일 기준으로 보정.
- `offline-crm-v2/src/pages/Dashboard.tsx`
  - 기간 리포트가 새 공통 helper를 사용하도록 정리해 Calendar와 동일한 계산 로직을 공유하도록 수정.
- `offline-crm-v2/src/pages/Calendar.tsx`, `offline-crm-v2/src/pages/Dashboard.tsx`
  - 캘린더 페이지의 현재 구조와 데이터 연결 상태를 점검.
  - 대시보드의 기간 리포트/통합 매출 계산 로직과 캘린더의 단순 월별 명세표 집계를 비교해 개선 방향 제안 준비.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 거래처 검색 결과가 0건일 때 드롭다운 위치에 `검색 결과가 없습니다` 안내 문구를 표시하도록 추가.
  - 새 명세표에서 최근 명세표 기준 최근 거래처 6개를 빠른 선택 버튼으로 노출하고, 클릭 시 고객 정보를 hydrate하도록 추가.
  - 새 명세표 전용 `임시저장` 버튼과 `임시저장본 불러오기/삭제` 배너 추가.
  - 실제 발행 완료 시 임시저장본은 자동 삭제되도록 처리.
  - 검색 debounce 전에는 `검색 결과 없음` 메시지가 성급하게 뜨지 않도록 조건 보정.
- `offline-crm-v2/src/App.tsx`
  - Sonner 토스트 위치를 우측 상단에서 우측 하단으로 변경.
  - 토스트 본문 클릭 시 즉시 닫히도록 전역 click-dismiss 처리 추가.
- `offline-crm-v2/src/lib/settings.ts`
  - 저장된 CRM 설정에서 `default_taxable`를 boolean으로 정규화해 읽는 helper 추가.
- `offline-crm-v2/src/components/ProductDialog.tsx`
  - 새 제품 등록 시 `is_taxable` 기본값이 설정값(`default_taxable`)을 따르도록 수정.
  - `default_taxable`가 `0/1`, `true/false`, 문자열로 들어와도 boolean으로 정규화되도록 보강.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 새 명세표 첫 행, 행 추가, 품목 선택 모달 추가 시 `default_taxable` 설정을 기본 과세값으로 사용하도록 수정.
  - 거래처 자동완성에 `↑/↓/Enter/Escape/Tab` 키보드 탐색, 활성 항목 하이라이트, 스크롤 추적 추가.
  - 거래처명을 다시 입력할 때 이전 선택 고객의 `customer_id`/고객 카드/사업자 스냅샷이 남지 않도록 stale 상태 초기화.
  - 빈 placeholder 품목만 있는 명세표는 저장되지 않도록 검증 추가.
  - 마지막 품목 행 삭제 시에는 기본 과세값이 반영된 빈 행 1개를 유지하도록 조정.
- `offline-crm-v2/src/pages/Settings.tsx`
  - `새 품목 기본값: 과세 (10%)` 체크박스의 fallback 기본값을 해제 상태로 조정.
  - 현재 운영 설정 레코드의 `default_taxable` 값이 `0`인 것도 확인.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - 명세표 다이얼로그를 닫을 때 `selectedId/copySourceId`를 같이 초기화.
  - `dialogOpen`일 때만 `InvoiceDialog`를 마운트하도록 바꿔 새 명세표 재오픈 시 이전 거래처 상태가 남지 않게 수정.
  - 명세표 삭제 후 `calendar-*` query까지 invalidate 하도록 보강.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 입금 확인 저장 후 `calendar-*` query까지 invalidate 하도록 보강.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 2단계 기능 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 1단계 기능 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.

### 운영/아키텍처 문서화
- `docs/n8n-automation-efficiency-review-2026-03-09.md`
  - PRESSCO21 전반에서 `n8n`이 필요한 영역과 비효율 영역을 분리해 정리.
  - `유지 / 하이브리드 / 이관` 분류, 워크플로우 설계 가드레일, Claude Code 실행 판단 체크리스트 추가.
  - 우선순위를 `offline-crm-v2 프록시 이관`과 `WF-05 분할` 중심으로 명시.

### Phase 0 완료
- `파트너클래스/n8n-workflows/WF-01-class-api.json` — POST 전환, Switch v3.2, 순차 연결, tbl_Schedules schedules[] 확장
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` — 수수료율 BLOOM/GARDEN/ATELIER/AMBASSADOR 배포
- `파트너클래스/상세/js.js` — GRADE_MAP, 필드명(partner_name/location), flatpickr 일정 기반 + 시간슬롯 UI
- `파트너클래스/상세/css.css` — 시간대 슬롯 CSS 추가
- `파트너클래스/파트너/js.js` — 등급 게이지 BLOOM→AMBASSADOR, 클래스 수정 모달, WF-20/WF-18 엔드포인트 추가

### Phase 1 핵심 태스크 완료
- `파트너클래스/n8n-workflows/WF-18-schedule-management.json` — 일정 관리 API (서버 기존 배포 확인)
- `파트너클래스/n8n-workflows/WF-19-my-bookings.json` — 수강생 예약 확인 API (신규 배포)
- `파트너클래스/n8n-workflows/WF-20-class-edit.json` — 클래스 수정 API (신규 배포)
- `ROADMAP.md` — Phase 0 ✅, Phase 1 Task 001~004 ✅ 반영

### Phase 1 보강 작업 완료
- `파트너클래스/파트너/js.js` — 일정 관리 탭(schedules) 추가: loadScheduleTab, renderScheduleList, saveNewSchedule, deleteSchedule
- `파트너클래스/파트너/Index.html` — 일정 관리 탭 버튼 + 패널(pdTabSchedules) 추가
- `파트너클래스/파트너/css.css` — 일정 카드 + 일정 추가 폼 스타일 추가
- `파트너클래스/강의등록/js.js` — 초기 수업 일정 입력 UI (날짜/시간/정원) + collectSchedules()
- `파트너클래스/강의등록/Index.html` — 일정 입력 섹션 HTML 추가
- `파트너클래스/강의등록/css.css` — 일정 입력 스타일 추가
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` — "Update Booked Count" 노드 추가 (Create Settlement → booked_count 증가 → Aggregate)
- `파트너클래스/n8n-workflows/WF-16-class-register.json` — "Create Initial Schedules" 노드 추가 + Validate Input에 schedules[] 파싱

### Phase 1 Task 005 완료: 재료키트 자동 배송
- NocoDB tbl_Classes에 kit_enabled(Number), kit_items(LongText) 필드 추가
- `파트너클래스/강의등록/Index.html` — 키트 토글 + 키트 항목 입력 UI 추가
- `파트너클래스/강의등록/js.js` — bindKitToggle, addKitItem, collectKitItems 함수 추가
- `파트너클래스/강의등록/css.css` — 키트 토글/항목 스타일 추가
- `파트너클래스/상세/js.js` — "재료키트 포함" 배지 추가
- `파트너클래스/상세/css.css` — info-badge--kit 스타일 추가
- `파트너클래스/파트너/js.js` — 클래스 수정 모달에 키트 토글/항목 편집 추가
- `파트너클래스/파트너/css.css` — 키트 편집 UI 스타일 추가

### 수강생 마이페이지 UI 완료
- `파트너클래스/마이페이지/Index.html` — 로그인 안내, 요약 카드, 예약 카드, 빈 상태
- `파트너클래스/마이페이지/js.js` — WF-19 API 연동, 예약 카드 렌더링
- `파트너클래스/마이페이지/css.css` — 반응형 스타일

### 서버 배포 (n8n)
- WF-01 재배포 (kit_enabled 필드 추가)
- WF-05 재배포 (Process Kit Order 텔레그램 알림 노드 추가)
- WF-16 재배포 (kit_enabled/kit_items 저장)
- WF-20 재배포 (kit 필드 수정 허용)
- WF-19 배포 완료 (ID: Zvk8akZ20VnfsQeN)

### 파트너클래스 통합 테스트 (CODEX)
- 실행 일시: 2026-03-09 20:13~20:29 KST
- 실행 계정: `jihoo5755` (파트너 회원)
- 확인된 수강생 마이페이지 ID: `8010`
- 실제 검증 도메인: `https://www.foreverlove.co.kr`
- 메이크샵 관련 공식 운영/배포 기준 도메인: `https://www.foreverlove.co.kr`
- 산출물 경로: `output/playwright/partnerclass-20260309/`

#### Phase 1 검증
- 목록 `id=2606`
  - 클래스 6건 렌더링 확인, 첫 카드 `압화 아트 기초 클래스`에 `잔여 20석` 배지 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/list-page.png`
- 상세 `id=2607&class_id=CL_202602_001`
  - 목록 카드 클릭으로 진입 확인
  - flatpickr 예약 가능 날짜 `2026-03-15`, `2026-03-20` 확인
  - 시간슬롯/잔여석 확인: `2026-03-15 14:00 잔여 8석`, `2026-03-20 10:00 잔여 6석` 2건
  - FAQ 탭 5개 아코디언 열기/닫기 정상 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/detail-date-timeslot.png`, `output/playwright/partnerclass-20260309/detail-faq-expanded.png`
- 목록 `협회 제휴` 탭
  - `한국꽃공예협회` 카드와 제휴 인센티브 섹션 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/list-association-tab.png`

#### Phase 2 검증
- 파트너 대시보드 `id=2608`
  - 로그인 후 `BLOOM PARTNER` 헤더, 등급 진행률 게이지, 4등급 승급 조건 테이블 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/partner-dashboard-grade-report.png`
- 강의등록 `id=8009`
  - 파트너 로그인 상태에서 등록 폼 전체 렌더링 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/class-register-form.png`
- 어드민 `id=8011`
  - 파트너 계정으로 접근 시 `접근 권한이 없습니다` 가드 화면 노출 확인
  - 관리자 전용 양성 시나리오는 관리자 계정 미제공으로 미검증
  - 스크린샷: `output/playwright/partnerclass-20260309/admin-access-denied.png`

#### Phase 3 검증
- 마이페이지 `id=8010`
  - 비로그인 상태: 로그인 안내 화면 확인
  - 로그인 후: 예약 요약 카드(`전체/예정/완료 = 0`)와 빈 상태 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/mypage-8010-login-required.png`, `output/playwright/partnerclass-20260309/mypage-empty-state.png`
- 잔여석 정합성
  - 목록 배지 `20석` = 상세 시간슬롯 합계 `8 + 6 + 6 = 20석`
  - 결과: PASS

#### 실패/이슈
- 상세 페이지 콘솔 에러
  - `https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js` 무결성 해시 불일치로 차단
  - 에러 메시지: `Failed to find a valid digest in the 'integrity' attribute ... The resource has been blocked.`
  - 로그: `output/playwright/partnerclass-20260309/detail-console.log`

### 파트너클래스 확장 통합 테스트 (CODEX)
- 실행 일시: 2026-03-09 23:05 KST ~ 2026-03-10 00:08 KST
- 실행 계정: `jihoo5755` (파트너 회원)
- 실행 도메인: `https://www.foreverlove.co.kr`
- 자동화 스크립트: `scripts/partnerclass-live-smoke.js`
- 결과 문서: `docs/파트너클래스/partnerclass-live-test-matrix-2026-03-09.md`
- 산출물 경로: `output/playwright/partnerclass-20260309-ext/`

#### 확장 시나리오 결과
- 총 15건 중 12건 PASS, 3건 FAIL
- PASS
  - 목록 기본 렌더링, 협회 제휴 탭
  - 상세 진입, flatpickr 일정/시간슬롯, FAQ 5개, 잔여석 정합성, 비정상 `class_id` 처리
  - 파트너 대시보드 탭 전환/CSV 예외 처리
  - 강의등록 폼 검증/일정 추가/키트 토글
  - 마이페이지 비로그인 안내, 로그인 후 빈 상태
  - 관리자 비권한 차단, 관리자 API 읽기 전용 조회, 관리자 양성 UI 시뮬레이션
- FAIL
  - 목록 찜 필터 저장 실패
    - 에러: `찜 필터 결과가 1건이 아닙니다. count=0, wishedClassId=CL_202602_002, wishlist=null, rendered=`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-목록-정렬-서울-필터-찜-필터.png`
  - 파트너 일정 관리 탭 활성화 실패
    - 에러: `page.waitForFunction: Timeout 15000ms exceeded.`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-파트너-일정-관리-탭.png`
  - 파트너 등급/수수료율 정합성 불일치
    - 에러: `수수료율 불일치: ui=25, api=20, badge=BLOOM PARTNER`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-파트너-등급-게이지-승급표-정합성.png`

#### API 교차 검증
- `getPartnerAuth(member_id=jihoo5755)` → `partner_code=PC_202602_001`, `grade=SILVER`, `commission_rate=20`
- `getPartnerDashboard` → 클래스 3건 확인
- `getMyBookings(member_id=jihoo5755)` → `bookings=[]`, `total=0`
- `getApplications` 5건, `getPendingClasses` 1건, `getSettlements(limit=5)` 5건, `getAffiliations` 1건

#### 관리자 양성 시뮬레이션
- 실관리자 계정 없이 `adMemberId`, `adGroupName`, `adGroupLevel`를 `DOMContentLoaded` 전에 주입해 관리자 UI를 양성 상태로 재현
- 요약 카드 `5`건, 어드민 탭 4종 렌더링과 전환 확인
- 스크린샷: `output/playwright/partnerclass-20260309-ext/admin-simulated-dashboard.png`

### 파트너클래스 실패 수정 (CODEX)
- 실행 일시: 2026-03-10 00:17 KST ~ 2026-03-10 00:45 KST
- 수정 파일
  - `파트너클래스/목록/js.js`
  - `파트너클래스/파트너/js.js`
  - `scripts/partnerclass-live-smoke.js`
- 수정 내용
  - 목록 찜 버튼 HTML에서 인라인 `onclick` 제거
  - 파트너 대시보드가 구등급(`SILVER/GOLD/PLATINUM`)과 신등급(`BLOOM/GARDEN/ATELIER/AMBASSADOR`)이 섞인 데이터를 받을 때 실제 `commission_rate` 기준으로 표시 등급/수수료율을 해석하도록 보정
  - 라이브 스모크 스크립트에서 서울 필터 대기, 구등급 표시 검증, 일정 관리 새 세션 검증을 강화
- 검증 메모
  - 라이브 `foreverlove.co.kr`는 아직 리포지토리 소스가 반영되지 않아 전체 재실행 시 기존 실패가 그대로 재현됨
  - 대신 로컬 소스 주입/모의 응답 검증으로 수정 효과를 확인
    - 목록 찜 저장: mocked local origin에서 `wishlist=[\"CL_1\"]`, `active=true` 확인
    - 파트너 등급 표시: mocked partner dashboard에서 `badge=GARDEN PARTNER`, `commission=20%`, `currentRow=GARDEN`, `tierRows=4` 확인
  - 일정 관리 탭은 라이브 집중 재현에서 fresh session 기준 정상 활성화 확인
  - 다음 단계는 메이크샵 실제 반영 후 라이브 URL 재검증

### 파트너클래스 라이브 재검증 (CODEX)
- 실행 일시: 2026-03-10 01:02 KST ~ 2026-03-10 01:05 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 11건 성공, 4건 실패
  - 이전 실패 항목 중 `목록 정렬/서울 필터/찜 필터`, `파트너 대시보드 탭 전환/CSV 다운로드`는 라이브 통과 확인
  - 결과 파일: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
- 실패 상세
  - `파트너 일정 관리 탭`
    - 에러: `page.waitForFunction: Timeout 15000ms exceeded.`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-일정-관리-탭.png`
  - `파트너 등급 게이지/승급표 정합성`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#pdMainArea') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-등급-게이지-승급표-정합성.png`
  - `강의 등록 폼 검증/일정 추가/키트 토글`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#crRegisterForm') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-강의-등록-폼-검증-일정-추가-키트-토글.png`
  - `마이페이지 로그인 상태 빈 화면`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#mbMainArea') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-마이페이지-로그인-상태-빈-화면.png`

### 파트너클래스 잔여 실패 수정 (CODEX)
- 실행 일시: 2026-03-10 01:09 KST ~ 2026-03-10 01:27 KST
- 수정 파일
  - `scripts/partnerclass-live-smoke.js`
  - `파트너클래스/파트너/js.js`
- 수정 내용
  - 라이브 스모크 로그인 대기를 `load` 기준에서 `domcontentloaded` 기준으로 완화
  - 일정 관리 검증을 같은 로그인 세션의 새 페이지로 분리해 중복 로그인으로 기존 세션이 무효화되는 문제 제거
  - 일정 탭 클릭을 DOM `element.click()` 기반으로 바꾸고, 실패 시 디버그 상태를 남기도록 보강
  - 파트너 일정 관리 코드에 누락된 `apiCall()` helper 복원
  - WF-18 응답 구조(`data.schedules`)에 맞게 일정 목록 파싱 보정
  - 일정 추가/삭제 payload를 `member_id` 기준으로 수정해 WF-18 입력 스펙과 일치시킴
- 검증 메모
  - 라이브 재실행 결과: 총 15건 중 14건 성공, 1건 실패
  - 해결된 항목
    - `파트너 등급 게이지/승급표 정합성`
    - `강의 등록 폼 검증/일정 추가/키트 토글`
    - `마이페이지 로그인 상태 빈 화면`
  - 남은 항목
    - `파트너 일정 관리 탭`
      - 라이브 현상: 강의 선택 후 로딩 오버레이가 내려오지 않음
      - 원인: 프론트 `apiCall` 미정의로 `ReferenceError` 발생 후 오버레이가 유지되는 구조 확인
  - 현재 리포지토리에는 일정 관리 버그 수정이 반영되었고, 메이크샵 최신 배포 후 라이브 재검증 필요

### 파트너클래스 라이브 최종 재검증 (CODEX)
- 실행 일시: 2026-03-10 01:33 KST ~ 2026-03-10 01:38 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 14건 성공, 1건 실패
  - 실패 항목: `파트너 일정 관리 탭`
  - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-일정-관리-탭.png`
- 원인 분석
  - 스크린샷상 일정 목록 자체는 렌더링되지만 로딩 오버레이가 계속 남아 있음
  - `파트너클래스/파트너/js.js`의 `showLoading(false)` 호출이 실제로는 오버레이를 다시 표시하는 구조여서 일정 관리 시나리오가 타임아웃됨
- 후속 수정
  - `파트너클래스/파트너/js.js`
    - `showLoading(show)`가 `false`일 때 `pdLoadingOverlay`를 숨기도록 보정
  - 이 수정은 리포지토리에 반영됐고, 메이크샵 최신 배포 후 다시 라이브 확인 필요

### 파트너클래스 라이브 최종 확인 완료 (CODEX)
- 실행 일시: 2026-03-10 01:41 KST ~ 2026-03-10 01:43 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 15건 성공, 0건 실패
  - 결과 파일: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
  - 마지막 실패였던 `파트너 일정 관리 탭`도 `강의 옵션 3건, 일정 추가 폼 열기/취소 확인`으로 통과
- 비고
  - 현재 파트너클래스 라이브 스모크 기준 블로커 없음

### Codex 스킬 생성 (CODEX)
- 실행 일시: 2026-03-10 01:44 KST ~ 2026-03-10 01:48 KST
- 생성 파일
  - `codex-skills/partnerclass-live-qa/SKILL.md`
  - `codex-skills/partnerclass-live-qa/references/runbook.md`
  - `codex-skills/partnerclass-live-qa/agents/openai.yaml`
- 내용 요약
  - 파트너클래스 라이브 배포 검증 전용 repo-local Codex 스킬 추가
  - 배포 후 스모크 실행, 결과 JSON 확인, 스크린샷 증빙, `AI_SYNC.md` 갱신 흐름을 한 번에 안내
  - 세션 무효화, Makeshop 반영 필요, 일정 관리 디버깅 포인트 같은 반복 함정을 런북으로 정리
- 검증
  - `quick_validate.py codex-skills/partnerclass-live-qa` 통과

### 메이크샵 전역 Codex 스킬 생성/설치 (CODEX)
- 실행 일시: 2026-03-10 01:41 KST ~ 2026-03-10 02:05 KST
- 기준 문서
  - `/Users/jangjiho/workspace/AGENTS.md`
- 생성 파일
  - `codex-skills/makeshop-d4-dev/SKILL.md`
  - `codex-skills/makeshop-d4-dev/references/makeshop_d4_rules.md`
  - `codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py`
  - `codex-skills/makeshop-d4-dev/agents/openai.yaml`
- 내용 요약
  - 메이크샵 D4 개발 전용 Codex 스킬 추가
  - `${}` 이스케이프, `var` 강제, IIFE, CSS 컨테이너 스코핑, 가상태그 보존, HTTPS CDN, 이모지 금지 규칙을 스킬과 레퍼런스로 정리
  - 번들 검수 스크립트로 raw `${`, `let/const`, `http://`, 잘못된 가상태그 종료, 이모지, JS IIFE 누락을 빠르게 탐지하도록 구성
  - 전역 설치 경로: `/Users/jangjiho/.codex/skills/makeshop-d4-dev`
- 검증
  - `generate_openai_yaml.py codex-skills/makeshop-d4-dev ...` 통과
  - `quick_validate.py codex-skills/makeshop-d4-dev` 통과
  - `PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m py_compile codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py` 통과
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py /tmp/makeshop-sample.js` → `OK`

### 실관리자 계정 어드민 양성 검증 (CODEX)
- 실행 일시: 2026-03-10 02:11 KST ~ 2026-03-10 02:15 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 실행 방식
  - Playwright 실브라우저 로그인 후 관리자 페이지 직접 진입
- 결과
  - FAIL
  - 로그인은 성공했지만 어드민 메인 영역은 열리지 않았고 비인가 안내가 그대로 표시됨
  - 페이지 가상태그 값 확인:
    - `member = jihoo5755`
    - `groupName = 테스트 관리자`
    - `groupLevel = 10`
  - 현재 어드민 프론트는 `group_level`이 아니라 `group_name`이 `관리자`, `운영자`, `대표` 중 하나인지로만 권한 판정
- 실패 상세
  - 에러 메시지: `접근 권한이 없습니다 / 이 페이지는 관리자 전용입니다.`
  - 스크린샷: `output/playwright/admin-positive-20260310/admin-positive-denied.png`
  - 상태 파일: `output/playwright/admin-positive-20260310/admin-positive-state.json`

### 어드민 권한 판정 보강 (CODEX)
- 실행 일시: 2026-03-10 02:18 KST ~ 2026-03-10 02:20 KST
- 수정 파일
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - 기존 `group_name` 정확 일치(`관리자`, `운영자`, `대표`) 규칙은 유지
  - 추가로 `group_level`에서 숫자를 추출해 `9 이상`이면 관리자 권한으로 허용하도록 보강
  - 따라서 `groupName=테스트 관리자`, `groupLevel=10` 같은 케이스도 통과 가능
- 검증
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`
  - 로직 샘플 검증
    - `테스트 관리자 / 10` → `true`
    - `관리자 / 1` → `true`
    - `일반회원 / 3` → `false`

### 실관리자 계정 어드민 양성 재검증 PASS (CODEX)
- 실행 일시: 2026-03-10 02:24 KST ~ 2026-03-10 02:26 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과
  - PASS
  - 로그인 후 어드민 메인 진입 성공
  - 페이지 가상태그 값 확인:
    - `member = jihoo5755`
    - `groupName = 관리자`
    - `groupLevel = 10`
  - 비인가 영역 숨김, 메인 대시보드 표시 확인
  - 요약 카드 수치 확인:
    - 파트너 신청 대기 `5`
    - 강의 승인 대기 `1`
    - 정산 대기 `12`
  - 4개 탭 모두 전환 및 패널 표시 확인:
    - `applications` 5행
    - `classes` 1행
    - `settlements` 12행
    - `affiliations` 3행
- 산출물
  - 상태 파일: `output/playwright/admin-positive-20260310/admin-positive-state.json`
  - 메인 스크린샷: `output/playwright/admin-positive-20260310/admin-positive-main.png`
  - 탭 스크린샷:
    - `output/playwright/admin-positive-20260310/admin-tab-applications.png`
    - `output/playwright/admin-positive-20260310/admin-tab-classes.png`
    - `output/playwright/admin-positive-20260310/admin-tab-settlements.png`
    - `output/playwright/admin-positive-20260310/admin-tab-affiliations.png`

### 어드민 쓰기 액션 실브라우저 확장 검증 및 프론트 보강 (CODEX)
- 실행 일시: 2026-03-10 08:37 KST ~ 2026-03-10 09:20 KST
- 수정 파일
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - 모달 확인 버튼이 `hideModal()`에서 `modalCallback`을 먼저 지워 승인/거부 콜백이 죽던 문제 수정
  - `rejectApplication` payload를 `application_id`에서 `row_id`로 수정
  - `approveClass` / `rejectClass` payload를 `class_row_id`에서 `row_id`로 수정
  - 정산 체크박스 값을 NocoDB row `Id`가 아니라 `settlement_id`로 렌더링하고, 일괄 정산 payload도 문자열 배열 그대로 전달하도록 수정
  - 액션 후 재조회 필터값을 `pending/inactive` 소문자에서 `PENDING/INACTIVE`로 수정
  - 빈 응답 시에도 원인 파악이 가능하도록 에러 토스트 메시지 구체화
- 검증
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`

### 어드민 쓰기 액션 실검증 결과 (CODEX)
- 실행 일시: 2026-03-10 08:55 KST ~ 2026-03-10 09:18 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과 요약
  - `rejectApplication` PASS
  - `approveApplication` FAIL
  - `rejectClass` FAIL
  - `completeSettlement` FAIL
- PASS 상세
  - `rejectApplication`
  - 대상: `row_id=5`, `member_id=test_email_check_002`
  - 결과: 신청 대기 건수 `5 -> 4` 감소
  - API 응답: `200`, `{\"success\":true,\"data\":{\"status\":\"rejected\"}}`
  - 스크린샷: `output/playwright/admin-write-20260310/write-reject-application.png`
- FAIL 상세
  - `approveApplication`
  - UI 에러: `승인 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - n8n 원인
    - `WF-ADMIN Admin API` 실행 `21002`: `HTTP Call WF-08 Approve`에서 `Invalid JSON in response body`
    - `WF-08 Partner Approve` 실행 `21003`: `Field 'applied_date' not found`
    - 실제 조회 쿼리: `(member_id,eq,undefined)~and(status,eq,PENDING)` + `sort=-applied_date`
  - 스크린샷: `output/playwright/admin-write-20260310/write-approve-application.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - `rejectClass`
  - UI 에러: `거부 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - n8n 원인
    - `WF-ADMIN Admin API` 실행 `21015`
    - NocoDB PATCH payload가 `status: "rejected"`를 보내지만, 실제 허용 옵션은 `active, paused, closed, INACTIVE`
    - 오류 메시지: `Invalid option(s) "rejected" provided for column "status"`
  - 스크린샷: `output/playwright/admin-write-20260310/write-reject-class.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - `completeSettlement`
  - UI 에러: `정산 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - 원인 분리
    - 라이브 정적 JS `/shopimages/jewoo/template/work/49407/page.8011.js?t=202603100225`가 아직 구버전이라 체크박스 값을 `settlement_id`가 아닌 row `Id` (`47`)로 전송
    - `WF-ADMIN Admin API` 실행 `21028`에서 `settlementIds=["47"]`로 들어가 `Cannot read properties of undefined (reading 'map')` 발생
  - 스크린샷: `output/playwright/admin-write-20260310/write-complete-settlement.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`

### 어드민 잔여 오류 2건 수정 반영 (CODEX)
- 실행 일시: 2026-03-10 09:22 KST ~ 2026-03-10 09:40 KST
- 수정 파일
  - `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
  - `파트너클래스/어드민/Index.html`
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - `WF-08 Partner Approve`
    - 신청 조회 정렬 필드를 존재하지 않는 `applied_date`에서 `CreatedAt`으로 수정
    - 관리자 화면에서 전달하는 숫자형 row id(`application_id=4`)도 조회 가능하도록 `Id` 또는 `application_id` 매칭 where 식으로 보강
  - `WF-ADMIN Admin API`
    - `approveApplication -> WF-08` 내부 호출에 `Authorization: Bearer {{ ADMIN_API_TOKEN }}` 및 `Content-Type: application/json` 헤더 추가
    - 내부 호출 응답을 `fullResponse + neverError`로 받아서, `WF-08`이 실패해도 관리자 UI가 JSON 에러 메시지를 읽을 수 있게 응답 정규화
    - `getPendingClasses`가 실제로 `status` 파라미터(`INACTIVE`, `active`, `closed`)를 반영하도록 수정
    - `rejectClass` 상태값을 NocoDB 허용 enum에 맞춰 `rejected`에서 `closed`로 수정
  - 어드민 프론트
    - 강의 승인 탭의 `거부됨` 필터 값을 `rejected`에서 `closed`로 수정
    - 상태 라벨 매핑에 `closed -> 거부` 추가
- 검증
  - `jq empty 파트너클래스/n8n-workflows/WF-08-partner-approve.json` → `OK`
  - `jq empty 파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json` → `OK`
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`
  - `Index.html`는 기존 문서 내 `http://` 링크 1건 때문에 가드 스크립트 경고가 있었고, 이번 수정과 무관하여 유지

### 어드민 정산 재검증 PASS (CODEX)
- 실행 일시: 2026-03-10 09:18 KST ~ 2026-03-10 09:19 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과
  - `completeSettlement` PASS
  - 체크박스 값이 row `Id`가 아니라 `settlement_id=STL_20260302_966532`로 전송되는 것 확인
  - API 응답: `200`, `{\"success\":true,\"data\":{\"completed_count\":1,\"total_paid\":117000,\"not_found_ids\":[]}}`
  - 토스트: `1건 정산 완료`
- 산출물
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - 스크린샷: `output/playwright/admin-write-20260310/complete-settlement-result.png`

### 어드민 승인/거부 최종 n8n 직접 배포 PASS (CODEX)
- 실행 일시: 2026-03-10 09:48 KST ~ 2026-03-10 09:56 KST
- 직접 배포 경로
  - 기준 디렉토리: `/Users/jangjiho/Desktop/n8n-main`
  - 배포 스크립트: `pressco21/_tools/deploy.sh`
- 수정 및 배포 파일
  - `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
- 수정 내용
  - `WF-08 Partner Approve`
    - NocoDB 신청 업데이트 PATCH 경로를 존재하지 않는 `tbl_Applications`에서 실제 테이블 ID `mkciwqtnqdn8m9c`로 수정
  - `WF-ADMIN Admin API`
    - `approveApplication -> WF-08` 내부 호출 `Authorization` 헤더를 문자열 `Bearer {{ $env.ADMIN_API_TOKEN }}`에서 실제 표현식 `={{ 'Bearer ' + $env.ADMIN_API_TOKEN }}`으로 수정
- 라이브 검증 결과
  - `approveApplication` PASS
  - 대상: `row_id=4`, `member_id=test_email_check_001`
  - 결과: 신청 대기 건수 `4 -> 3` 감소, 목록에서 대상 행 제거 확인
  - API 응답: `200`, `{\"success\":true,\"data\":{},\"timestamp\":\"2026-03-10T00:55:58.860Z\"}`
  - 토스트: `파트너 승인 완료`
  - `rejectClass` PASS 상태 유지
- 산출물
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - 스크린샷: `output/playwright/admin-write-20260310/approve-application-result.png`

### 파트너클래스 UX 보강 및 메인페이지 별도 프로젝트 생성 (CODEX)
- 실행 일시: 2026-03-10 12:28 KST ~ 2026-03-10 13:35 KST
- 수정/추가 파일
  - `파트너클래스/n8n-workflows/WF-07-partner-apply.json`
  - `파트너클래스/파트너신청/js.js`
  - `파트너클래스/상세/js.js`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/목록/js.js`
  - `메인페이지/파트너클래스-홈개편/Index.html`
  - `메인페이지/파트너클래스-홈개편/css.css`
  - `메인페이지/파트너클래스-홈개편/js.js`
  - `docs/파트너클래스/affiliation-db-guide.md`
- 작업 내용
  - `WF-07 partner-apply`
    - 중복 신청/기등록 파트너 분기에서 IF 체인을 `Switch` 기반으로 정리하고, 409 JSON 응답이 깨지지 않도록 응답 코드를 숫자형으로 정리.
    - `partner-apply` 웹훅 라이브 재호출 시 `HTTP 409`, `ALREADY_PARTNER` JSON 응답 확인.
  - `파트너신청/js.js`
    - `response.json()` 실패 시 raw text를 먼저 읽고 안전하게 파싱하도록 수정해 `SyntaxError: The string did not match the expected pattern.` 오류를 프론트에서 흡수.
  - `상세/js.js`, `상세/css.css`
    - 상세 기본 정보 배지를 링크형으로 보강하고, 지역/카테고리/수업형태로 목록에 다시 탐색하는 링크 추가.
    - 관련 클래스 추천이 카테고리 누락 시에도 죽지 않도록 점수 기반 추천으로 변경.
    - 선물하기는 수동 `gift=Y` 이동 대신 메이크샵 상품 메타를 확인한 후 네이티브 장바구니 POST로 연결하고, 설정 미비 상품은 상세로 안전하게 폴백.
  - `목록/js.js`
    - `tab=affiliations` URL 파라미터를 읽어 협회 제휴 탭을 바로 여는 딥링크 지원 추가.
    - 탭 전환 시 URL에도 `tab=affiliations`를 반영하도록 정리.
  - `메인페이지/파트너클래스-홈개편`
    - 기존 메인페이지 코드를 복사한 별도 프로젝트 폴더 생성.
    - `YouTube` 섹션 아래에 파트너클래스 허브 블록을 동적으로 삽입하도록 재구성:
      - 빠른 필터 칩
      - 전체 클래스 / 협회 제휴 CTA
      - 강사 지원 / 예약 확인 서비스 패널
      - 추천 클래스 4건 카드와 실시간 메트릭
    - 카테고리 아이콘에 `원데이 클래스` 진입점 추가.
    - `Event` 섹션을 `강사 파트너 지원 / 협회·기관 제휴 / 예약 확인` 3축 카드로 재구성.
  - 운영 가이드
    - `docs/파트너클래스/affiliation-db-guide.md`에 제휴업체 자료 수령 후 DB 정리, QA 접두사 규칙, 메인 노출 제어 필드 가이드 작성.
- 검증
  - `node --check 메인페이지/파트너클래스-홈개편/js.js` → `OK`
  - `node --check 파트너클래스/목록/js.js` → `OK`
  - `node --check 파트너클래스/상세/js.js` → `OK`
  - `node --check 파트너클래스/파트너신청/js.js` → `OK`
  - `curl -i -X POST https://n8n.pressco21.com/webhook/partner-apply ...` → `409 Conflict`, `ALREADY_PARTNER` JSON 응답 확인

### CRM 레거시/명세표 복구 및 검증 (CODEX)
- 실행 일시: 2026-03-10 13:41 KST ~ 2026-03-10 14:55 KST
- 복구 내용
  - 운영 NocoDB 안전 백업 추가: `~/nocodb/nocodb_data/noco.db.pre-recovery-20260310-134105`
  - 감사 로그 기준 `tbl_Invoices 16건`, `tbl_InvoiceItems 127건` 복구
  - `txHistory.customer_name` 공란 중 고객 매핑 가능 237건 정규화 완료
  - `서상견 님` `legacy_book_id=721`의 2023~2025 거래가 DB/화면에서 직접 검색되도록 보정
  - 복구된 CRM 명세표 기준 고객 통계/미수금 일부 재산출
- 운영 검증
  - `거래/명세표 조회`에서 `2026-03-10` CRM 명세표 노출 확인
  - `명세표 작성`에서 `INV-20260310-095704` 포함 최신 명세표 노출 확인
  - `미수금`에서 `서상견 님 (단양)`, `권금희 회장님 (전주)`, `대아수목원` 노출 확인
  - `서상견` 검색 + `2023-01-01 ~ 2025-12-31` 범위에서 레거시 거래 노출 확인
- 추가 파일
  - `offline-crm-v2/docs/legacy-backup-audit-2026-03-10.md`
  - `offline-crm-v2/public/data/legacy-customer-snapshots.json`
  - `offline-crm-v2/scripts/export_legacy_customer_snapshots.py`
  - `offline-crm-v2/scripts/repair_legacy_backup.py`
  - `offline-crm-v2/scripts/restore_crm_invoices_from_audit.sql`
  - `offline-crm-v2/scripts/fill_txhistory_customer_names.sql`
  - `offline-crm-v2/scripts/recompute_invoice_customer_stats.sql`
  - `offline-crm-v2/src/components/TransactionDetailDialog.tsx`
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - `offline-crm-v2/src/pages/Transactions.tsx`
  - `offline-crm-v2/src/lib/api.ts`

### [CODEX-LEAD] Phase 3 메이크샵 실배포 준비 + 라이브 스모크 보강 (CODEX)
- 실행 일시: 2026-03-11 23:08 KST ~ 2026-03-11 23:18 KST
- 변경 파일
  - `scripts/partnerclass-live-smoke.js`
  - `파트너클래스/상세/js.js`
  - `docs/파트너클래스/phase3-makeshop-live-deploy-checklist-2026-03-11.md`
  - `docs/파트너클래스/README.md`
  - `codex-skills/partnerclass-live-qa/references/runbook.md`
- 변경 내용
  - 라이브 스모크 러너를 현재 운영 DOM 구조에 맞게 보정:
    - 목록 카드가 `a > article.class-card` 구조여도 상세 진입 가능하도록 수정
    - 첫 카드가 예약 불가 테스트 클래스여도 `datePicker` 활성 상태인 첫 상세를 골라 일정/FAQ 시나리오를 수행하도록 변경
    - 상세 FAQ 기대값을 `5개 고정`에서 `검색 입력 visible + 카테고리 칩 6개 이상 + FAQ 10~15개` 기준으로 상향
  - Phase 3 메이크샵 실배포 체크리스트 문서 추가:
    - 고정 page id `2606/2607/2608/2609/2610/8009/8010/8011`
    - 신규 page id 필요 자산 `콘텐츠허브`, `협회제안서`
    - 메인페이지 `메인페이지/파트너클래스-홈개편` 별도 반영 메모
  - 상세 지역 링크 정규화 보정:
    - `서울시`, `경기도`, `제주특별자치도` 등 운영 location 문자열이 `서울`, `경기`, `제주`로 매핑되도록 `getPrimaryRegion`, `getRegionFilterValue` 보정
    - 상세 탐색 링크가 `/shop/page.html?id=2606&region=기타`로 잘못 나가던 케이스를 저장소 코드에서 수정
- 검증
  - `node --check scripts/partnerclass-live-smoke.js`
  - `node --check 파트너클래스/상세/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/상세/js.js`
  - 라이브 스모크:
    - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-live-smoke.js`
    - 결과: `11 PASS / 2 FAIL / 1 SKIP`
    - 산출물: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
    - 주요 실패:
      - `상세 FAQ/잔여석 정합성`: 라이브 `2607`에 FAQ 검색 입력/확장 UI가 아직 없어 최신 상세 UI가 실배포되지 않은 상태로 판단
      - `상세 분류 링크 회귀`: 라이브 `CL_202602_662`가 `region=기타` 링크를 생성. 저장소 코드는 수정 완료됐지만 메이크샵 `2607`에는 아직 미반영
    - 스킵:
      - 파트너 로그인 시나리오 전체는 `PARTNER_MEMBER_ID`, `PARTNER_MEMBER_PASSWORD` 미제공으로 건너뜀

### [CODEX-LEAD] Phase 3 메이크샵 실배포 후 Playwright MCP 라이브 확인 (CODEX)
- 실행 일시: 2026-03-11 23:34 KST ~ 2026-03-11 23:39 KST
- 검증 방식
  - 내장 Playwright MCP로 `foreverlove.co.kr` 라이브 페이지 직접 탐색
  - 저장 직후 핵심 공개 페이지와 이전 실패 지점을 우선 확인
- 확인 결과
  - `2607 상세`
    - `CL_202602_001`에서 Trust Summary Bar, 포함 내역, `FAQ/문의` 탭 확장 UI live 반영 확인
    - FAQ 검색 입력 visible, 카테고리 칩 `6개`, FAQ `15개` 확인
    - 스크린샷: `output/playwright/mcp/2607-faq-after-live-deploy.png`
  - `2607 상세`
    - `CL_202602_662`에서 지역 탐색 링크가 `/shop/page.html?id=2606&region=%EC%84%9C%EC%9A%B8` 로 생성되는 것 확인
    - 링크 클릭 후 `2606` 서울 필터 결과 `5건` 확인
  - `2606 목록`
    - 클래스 카드 `7건`, `협회 제휴`, `혜택` 탭 DOM 존재 확인
  - `2609`, `2608`, `8009`
    - 로그인 버튼 실제 클릭 시 모두 `/shop/member.html?type=login&returnUrl=...` 로 이동 확인
  - `8010`
    - 비로그인 안내 영역 노출 확인
  - `8011`
    - 비권한 차단 화면 노출 확인
- 잔여 이슈
  - 콘솔 에러:
    - Kakao SDK integrity mismatch 로 `kakao.min.js` 차단
    - Channel.io boot `401`
  - 파트너 로그인/실관리자 양성 시나리오는 계정이 없어 이번 MCP 확인 범위에서 제외

## Next Step

- 파트너클래스 다음 고도화 전략을 Claude Code가 재수립
  - 먼저 `docs/파트너클래스/claude-strategy-handoff-2026-03-12.md`, `docs/파트너클래스/shared-service-identity.md`, `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`, `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md` 순서로 읽기
  - 현재 문제를 `고객 선택`, `파트너 첫 운영`, `관리자 운영 효율`, `운영 신뢰성` 4축으로 재분류
  - Quick wins / Mid-term / Structural bets 3단 구조로 새 전략안 작성
- [CODEX] 자동입금 검토 큐에서 고객 직접 재지정/명세표 직접 선택까지 가능한 2차 UI 보강
- [CODEX] 실제 NH 입금 알림 메일 샘플 3~5건 수집 후 Gmail 파서 정규식 보정
- [CODEX-LEAD] 관리자 기준 테스트 강의 `CL_202603_697` 를 승인/반려/삭제 중 어떤 상태로 정리할지 결정하고, 선택한 흐름으로 후속 E2E를 1회 더 검증
- [CODEX-LEAD] `WF-10` 내부 legacy 메일/텔레그램 노드는 현재 미사용 연결 상태이므로, 다음 정리 시 node 제거 또는 선택형 가이드 카피로 교체
- [CODEX-LEAD] CRM 자동입금 2차: 업로드 파일 포맷 자동 판별 확장, 검토 필요 후보 수동 고객 지정, 반영 이력 다운로드 추가
- [CODEX-LEAD] CRM 예치금/환불대기 2차: 명세표 작성에서 예치금 자동 제안 강화 및 환불대기 인쇄/엑셀 출력 보강
- [CODEX-LEAD] CRM 회계 UX 2차: 입금 수집함과 수금 관리 간 상호 이동, 가이드 투어가 화면 액션을 덜 가리도록 위치/자동 접힘 개선

- [CODEX-LEAD] offline-crm-v2 P1 4차: `환불대기`를 `지급 관리` 화면과 공급처/고객 정산 흐름에 자연스럽게 통합
- [CODEX-LEAD] offline-crm-v2 Phase 2: 단계형 내비게이션 가이드 투어로 전환
- [CODEX-LEAD] offline-crm-v2 농협 입금 자동화 1차 기술 검토: 수집 경로, 보안, 승인 큐 구조
- [CODEX] CRM 수금/지급 실제 로그인 계정 체계가 필요해지면 localStorage 작업 계정 방식에서 서버 세션 기반 로그로 승격
- [CODEX] CRM 운영 사용 중 신규 분리 고객/분리 거래명 케이스가 생기면 동일 정책으로 누적 정리
- [CODEX] CRM 운영 데이터 직접 수정 사고 대비 `서상견`과 같은 핵심 분리 고객 복구 절차를 스크립트화하거나 관리자 백업 체크리스트로 문서화
- [CODEX] CRM 고객 제출용 거래내역 확인서 실제 대외 전달 1회 검토 후 문구/표현 미세조정
- [CODEX] CRM 송장 자동 다운로드 결과물을 실제 택배 업로드 양식에 1회 대입 검증
- [CODEX-LEAD] 등급 리뉴얼 확정 시 `scripts/partnerclass-grade-change-audit.js`를 먼저 실행하고 `partner-grade-change-playbook.md` 순서대로 schema/workflow/UI를 갱신
- [CODEX-LEAD] 관리자 운영을 메이크샵 내부 세션으로 계속 둘지, 분리 어드민으로 승격할지 결정 시 권한모델/감사로그/배포비용 비교안 문서화
- [CODEX-LEAD] 신규 page id 대상 `콘텐츠허브`, `협회제안서`, 메인페이지 `메인페이지/파트너클래스-홈개편` 실반영 여부 결정
- [CODEX] 카카오 SDK JS key / integrity mismatch 정리

### [CODEX-LEAD] 파트너클래스 Phase 3 전체 구현 (독립 프로젝트)

> **이 태스크는 모드 B (독립)입니다. Codex가 기획~구현~배포~검증까지 독립 수행합니다.**
> **n8n 워크플로우 JSON 수정, 서버 배포 모두 허용됩니다.**

#### 읽어야 할 문서 (작업 전 필수)

1. `ROADMAP.md` — Phase 3 섹션 (Task S0-1 ~ S3-6, 총 31개 태스크)
2. `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md` — PRD v5.0 (기능 명세, 수락 기준)
3. `docs/파트너클래스/shared-service-identity.md` — 서비스 정체성 (판단 기준)
4. `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md` — 상세 전략
5. `docs/파트너클래스/README.md` — 문서 인덱스 및 우선순위

#### 현재 다음 태스크

- Phase 3 S0-1 ~ S3-6 구현은 모두 완료
- 다음 실제 진행은 `메이크샵 디자인편집기 실배포 + 운영 브라우저 재검증` 묶음
- 다음 세션 시작 직후 할 일
  - 현재 대화 세션의 MCP는 stale 상태일 수 있으므로 Codex 새 세션 또는 앱 재시작 후 진행
  - `codex mcp get playwright`로 설정 확인
  - 필요 시 `docs/playwright-mcp-setup.md` 절차대로 잔여 프로세스 정리
  - 이후 라이브 검증은 가능하면 내장 Playwright MCP 기준으로 재개
- 운영 blocker 추적:
  - `S2-7 파트너 이탈 감지 자동화` SMTP + Telegram credential
  - `S1-5 정산 자동화 WF-SETTLE` SMTP credential
  - `S3-6 연간 이벤트 캘린더` 실제 메일 발송은 같은 SMTP 상태 영향을 받음

#### 실행 순서

ROADMAP.md의 **Task 의존성 그래프**를 따라 순서대로 진행합니다:

```
Phase 3-0 (긴급 안정화, 1~2주) — 즉시 착수
  S0-1 NocoDB 일일 자동 백업 → 의존성 없음 (최우선)
  S0-2 상태값 정규화 6개 도메인 → S0-1 완료 후
  S0-3 WF-ADMIN 중복 ID 정리 → 독립 (S0-1과 병렬 가능)
  S0-4 WF-01 Switch 케이스 문서화 → 독립 (S0-1과 병렬 가능)

Phase 3-1 (수익 엔진, 3~6주) — Phase 3-0 완료 후
  S1-1 키트 연동 Step 1 (자사몰 링크) → S0-2 후
  S1-2 상세 UX 고도화 → 독립
  S1-3 목록 배지 + 퀵필터 → S0-2 후
  S1-4 재구매 동선 → S1-1 후
  S1-5 정산 자동화 WF-SETTLE → S0-2 후
  S1-6 CS FAQ 15개 확장 → 독립
  S1-7 파트너 온보딩 체크리스트 → 독립
  S1-8 대시보드 액션 보드 → S1-1 + S1-5 후
  S1-9 통합 테스트 → S1-1~S1-8 모두 후

Phase 3-2 (성장 가속, 7~12주) — Phase 3-1 완료 후
  S2-1 ~ S2-11 (ROADMAP.md 참조)

Phase 3-3 (스케일업, 13~24주) — Phase 3-2 완료 후
  S3-1 ~ S3-6 (ROADMAP.md 참조)
```

#### 대표 의사결정 사항 (코드에 반영 필수)

| 항목 | 결정 | 구현 시 주의 |
|------|------|-------------|
| 키트 전략 | 선제작 없음. 파트너 재료 → 자사몰 상품 URL 링크 → 묶음 키트 상품 | `kit_items`에 `product_url` 필드 추가 |
| 수수료 정책 | **온라인 비공개**. 프론트엔드에 수수료율 절대 노출 금지 | 파트너 대시보드의 수수료율 표시 제거 |
| 협회 전략 | 1차: 어머니 협회 + 기존 고객 → 2차: 부케 협회 | 어머니 협회 데이터 우선 세팅 |
| 상태값 | 6개 도메인 전체 UPPERCASE 통일 | S0-2에서 일괄 변환 |
| 테스트 데이터 | Phase 2까지 데모 데이터 필요 (파트너 섭외용) | S2-10에서 리얼한 더미 생성 |

#### 태스크별 작업 흐름

```
1. ROADMAP.md에서 다음 태스크 확인 (의존성 체크)
2. PRD v5.0에서 해당 기능 명세와 수락 기준 확인
3. 기존 코드 학습 (해당 페이지/WF 코드 읽기)
4. 구현
5. 검증 (Playwright MCP E2E 또는 curl 테스트)
6. ROADMAP.md 태스크 상태 ⬜ → ✅ 업데이트
7. AI_SYNC.md Last Changes 갱신
8. git commit -m "[codex] S0-1: NocoDB 일일 자동 백업 구축" && git push
9. 다음 태스크로 이동
```

#### 기술 제약 (필수 준수)

- 메이크샵 D4: Vanilla HTML/CSS/JS만 사용, `${var}` → `\${var}` 이스케이프, 가상태그 보존, IIFE, CSS 스코핑
- n8n: Switch v3.2 + `rules.values` 형식, 배포 후 재활성화 필수
- NocoDB: `xc-token` 헤더, 컬럼 추가는 `POST /api/v2/meta/tables/{tableId}/columns`
- 서버: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- 반응형: 768px / 992px / 1200px

#### 이전 Codex 보조 태스크 (우선순위 낮음, 여유 시 처리)

- [CODEX] CRM 미수 정합성 전수 비율 산출
- [CODEX] CRM 중복 고객 통합 정책 정리
- [CODEX] 메이크샵 저장 후 로그인 링크 라이브 재검증
- [CODEX] 상세 분류 링크 ↔ 목록 필터 일치 회귀 테스트
- [CODEX] 카카오 SDK integrity 해시 갱신

### Claude Code 태스크 (대기)
- 없음 (Phase 3 전체를 Codex에 위임)

## Known Risks

- 농협 입금 자동화는 아직 실제 연동 방식이 확정되지 않았으므로, NH 오픈 API/계좌 조회 대행/파일 업로드 중 어떤 수집 경로를 쓸지 결정이 필요함
- 회계 고도화 범위가 커서 중간 단계에서는 `기존 장부 기준 처리`와 `새 입력 처리`가 잠시 공존할 수 있음
- CRM 작업 계정 로그는 아직 실제 로그인 인증이 아니라 브라우저별 로컬 설정 기반이므로, 같은 PC/브라우저를 여러 사람이 공유하면 현재 선택된 작업 계정으로 기록됨
- CRM 운영 반영은 완료했지만, Basic Auth 자격증명 제약으로 운영 브라우저 화면의 최종 시각 검증은 아직 못 했음
- CRM 운영 DB를 사용자가 직접 수정할 수 있는 상태라, 동일한 데이터 훼손이 반복되면 고객/명세표 수동 복구가 다시 필요할 수 있음
- CRM 미수금 `전체`/`레거시` 탭은 고객 단위 집계이고 `CRM` 탭만 명세표 단위라, 엑셀 내보내기 포맷은 아직 CRM 명세표 기준만 지원함
- CRM `지급 관리` 1차는 기존 장부 기준 줄 돈을 다루는 단계이며, 공급처별 독립 지급 원장/지급 예정일/상태 배지는 아직 Phase 3 이후 작업이 필요함
- CRM 인앱 가이드는 현재 화면 단위 1차 버전이라, 역할별 분기와 단계형 투어는 아직 추가 구현이 필요함
- 예치금/환불대기/초과 입금 처리는 1차 구현이 들어갔지만, 명세표 저장 후 `예치금 사용` 이벤트가 모든 입력 경로에서 안정적으로 누적되는지는 추가 E2E 보강이 더 필요함
- 메이크샵 디자인편집기 저장 후 Playwright MCP 기준으로 `2606/2607/2608/2609/8009/8010/8011` 공개 화면 반영은 확인됐고, 실계정 기준 `2608/8009/8010/8011` 및 `2610 선택형 시작 가이드`, `8009` 실제 강의 등록 저장까지 검증이 끝났다. 남은 범위는 예약/주문/관리자 승인 이후의 deeper E2E다.
- 클래스 실상품 `branduid=12195642` 기준 상품 상세에는 native `.btn-gift` 링크가 노출되지 않아, 상품 설정상 선물하기가 비활성인 경우 프론트는 `basket.action` 기반 선물 주문 진입으로만 폴백함
- `메인페이지/파트너클래스-홈개편`은 기존 메인페이지를 복사한 별도 프로젝트 폴더이며, 아직 실제 메이크샵 메인에 저장되지는 않음
- 상세 페이지 선물하기는 메이크샵 네이티브 장바구니 POST로 맞췄지만, 실제 선물 가능 상품 설정 여부에 따라 최종 동작이 달라질 수 있어 실상품 1건 재검증 필요
- S3-2 등급 인센티브는 메이크샵 저장 후 공개 화면 기준 live 반영이 확인됐지만, 파트너 로그인 상태의 최종 확인은 아직 남아 있음
- S3-3 구독 파일럿의 월간 자동 생성은 내부 운영용 `SUBORD_*` ref 기준이며, 메이크샵 실제 정기결제/주문 생성과는 아직 연결되지 않음
- S3-3 마이페이지 구독 UI는 저장 반영 이후 비로그인 게이트까지는 확인됐지만, 실제 회원 로그인 상태의 운영 화면 검증은 다시 필요함
- `파트너신청/js.js`, `상세/js.js`, `상세/css.css`, `목록/js.js`는 현재 메이크샵 저장 반영이 확인됐다.
- 라이브 `admin-api`는 현재 리포지토리의 랜덤 `ADMIN_API_TOKEN`이 아니라 구형 토큰 `pressco21-admin-2026` 기준으로만 인증이 통과함
- `파트너클래스/어드민/js.js`는 메이크샵 저장 반영이 확인됐지만, `PENDING_REVIEW` 정렬 보정은 실관리자 권한으로 최종 확인이 필요하다.
- S1-1 프론트 변경(강의등록/상세/파트너 수정 모달)은 저장 반영 후 공개 화면 기준으로 확인됐지만, 파트너 로그인 상태의 동작 검증은 남아 있음
- `8009`는 파트너 `jhl9464` 기준 실제 강의 등록 저장까지 검증돼 `CL_202603_697` 를 생성했고, 약관 체크 시 진행도 helper `9/9` 즉시 반영까지 live 확인이 끝났다.
- UX 1차 개선분(`2606/2607/2608/8009`)은 `2607 FAQ 먼저 보기` hotfix까지 포함해 live 반영 확인이 끝났다.
- `2610`은 현재 `로그인 회원 공용 시작 가이드` 정책으로 유지한다. 승인된 파트너 전용 제한은 다음 정책 변경이 생길 때만 다시 넣는다.
- S1-2 상세 프론트 변경(Trust Summary Bar, 포함 내역, 모바일 CTA 바)은 live 반영을 확인했다. 다만 예약/선물하기의 로그인 상태별 최종 동작 검증은 남아 있음
- S1-7 파트너 대시보드 온보딩 카드/모달은 실제 파트너 세션에서 기본 렌더링과 `교육 이수` 완료 상태까지 확인했지만, 프로필 편집/다음 액션 CTA의 실동작은 추가 검증이 필요함
- S1-8 파트너 대시보드 액션 보드는 실제 파트너 세션에서 기본 렌더링까지 확인했지만, 예약/수익/후기 데이터가 생긴 상태의 카드 동작은 추가 검증이 필요함
- S1-4 마이페이지 프론트 변경(`파트너클래스/마이페이지/*`)은 저장 반영 후 비로그인 게이트는 확인됐지만, 실제 회원 세션 기준 검증이 필요함
- S1-9 통합 테스트는 로컬 fixture + Playwright 러너 기준으로는 통과했지만, 메이크샵 디자인편집기 실배포 후 동일 흐름을 라이브에서 한 번 더 확인해야 함
- S2-1 파트너 신청 세일즈 랜딩(2609)은 로그인 게이트와 실제 로그인 이동은 live 에서 확인됐다. 비로그인 상태에서는 게이트가 우선 노출되므로, 모바일 하단 고정 CTA의 실사용 확인은 별도 조건에서 다시 봐야 한다.
- S2-2 협회 제안서 페이지와 어드민 URL 생성기는 로컬 fixture 기준으로 검증됐지만, 실배포 전까지는 실제 MakeShop page id가 없어서 라이브 URL은 확정되지 않음
- S2-3 전국 탐색 IA 확장은 live `2606/2607` 공개 화면 기준으로는 반영이 확인됐지만, `/partnermap` 실자산 연동과 로그인 흐름 검증은 남아 있음
- S2-8 목록/상세 캐시 분리와 version key 무효화는 live 반영 이후 같은 브라우저 복귀/액션 후 무효화 시나리오를 한 번 더 확인해야 함
- S2-9 묶음 키트 선택형은 공개 화면 반영은 확인됐지만, 실제 로그인 상태 주문/장바구니 기준 검증은 아직 남아 있음
- S2-9 라이브 활성 클래스 중 `kit_enabled=1` 실제 운영 데이터가 아직 없어, 묶음 키트 상품 자동 생성과 실제 주문 후처리는 현재 구조 검증까지만 끝난 상태임
- S2-10 데모 배치는 live NocoDB에 입력됐지만 클래스 상태를 `closed` 로 묶어 공개 노출은 막았다. 실제 메이크샵 live 화면에서 데모로 쓰려면 디자인편집기 반영 또는 별도 demo page 구성이 추가로 필요하다.
- S2-10 파트너 액션보드 숫자는 내부 계산상 `예약 건수`와 `수업 수`가 섞일 수 있어, 현재 데모 수락 기준은 숫자 자체보다 카드 활성과 탭 이동에 둔다.
- S2-11 Phase 3-2 통합 테스트는 메이크샵 저장 후 실제 `2606/2607/2608/2609` 공개 흐름까지는 live 브라우저에서 다시 확인했다. 남은 범위는 로그인 세션과 운영 계정 기반 최종 검증이다.
- S3-1 신규 테이블 4종은 live NocoDB 기준으로 생성/검증까지 끝났지만, `.secrets.env` 수정 금지 원칙 때문에 새 table id 는 코드/문서에서만 관리되고 환경변수로는 아직 승격하지 않았다.
- S2-4 분리 후 `getSchedules / getRemainingSeats` 는 운영에서 준비 완료됐지만, 아직 프론트 호출처는 없다. S2-5 이후 콘텐츠/협회 read action 추가 시 `WF-01C` 또는 별도 WF 로 확장 방향을 유지해야 한다.
- S3-6 연간 이벤트 캘린더는 live `syncAnnualCalendar`, `getSeminars`, `runD14Alerts dry_run` 까지 통과했고 auto workflow 도 active 이지만, 실제 메일 발송은 운영 SMTP credential 상태에 따라 실패할 수 있다. 메이크샵 실배포 전까지는 협회/세미나 탭의 최종 시각 검증도 남아 있다.
- S2-6 리텐션 자동화는 dry run 과 스케줄 경로 기준으로는 검증됐지만, 운영 레거시 완료 예약 일부에 `student_email`, `student_name` 이 비어 있어 실제 발송 대상 수가 `skip` 으로 잡히는 상태다.
- S2-6 `student-retention` 웹훅은 수동 실호출 시 `200` 빈 본문 케이스가 남아 있어, 현재 운영 기준선은 dry run 응답과 예약 실행 로그다.
- S2-7 파트너 이탈 감지 자동화는 현재 dry run, risk 판정, `last_active_at` 갱신, 실패 로그 저장까지 검증됐지만 운영 `PRESSCO21 SMTP` credential 이 `535` 로 실패해 실제 파트너 메일은 발송되지 않는다.
- S2-7 `Telegram Summary` 는 최종 응답을 더 이상 덮지 않지만, 운영 `TELEGRAM_CHAT_ID` 가 비어 있어 실제 관리자 전송은 실패한다.
- S1-5 정산 자동화는 라이브 집계/이력/API 응답까지는 검증됐지만, 운영 SMTP credential `PRESSCO21-SMTP-Naver` 가 `535` 로 실패해 실제 파트너 메일 발송은 아직 불가함
- `scripts/partnerclass-live-smoke.js` 는 최신 상세 DOM 기준(`FAQ 검색 입력 + 카테고리 칩 6개 이상 + FAQ 10~15개`)으로 갱신됐고, Playwright MCP 기준으로 현재 live `2607`에서도 이 기준을 충족함을 확인했다.
- 라이브 `tbl_Classes` INSERT는 현재 `status=INACTIVE`, 소문자 `level`, `region 미저장` 제약이 있어, WF-16/WF-20을 수정할 때 이 우회 로직을 유지해야 함
- `PRD-파트너클래스-플랫폼-고도화.md`, `commission-policy.md`, 일부 구현 문서는 아직 예전 등급/수수료 표현이 남아 있으므로 서비스 방향 판단은 `docs/파트너클래스/README.md`와 `shared-service-identity.md`를 우선해야 함
- 등급체계가 리뉴얼되면 저장 enum, 표시 등급, 수수료율, 교육 퀴즈, 메일 카피가 함께 바뀌어야 한다. 현재 기준 변경 포인트는 `docs/파트너클래스/partner-grade-change-playbook.md`와 `scripts/partnerclass-grade-change-audit.js`에 정리했다.
- `2610`은 현재 로그인 회원이면 일반 회원(`PRESSCO000`)에게도 열린다. 이는 의도된 현재 정책이며, 파트너 전용 페이지가 필요해질 때만 접근 제어를 다시 넣으면 된다.
- 로그인 후 hidden 상태로 남던 3개 시나리오는 스모크 구조 수정으로 해소됐으며, 동일 계정 중복 로그인 시 기존 세션이 끊길 수 있음
- 운영 `invoices` 테이블에는 아직 `paid_date`, `payment_method` 컬럼이 없어서, 과거 기준일 미수 재현은 현재 미수 스냅샷 기반 참고 수준에 머뭄.
- 운영 `invoice_date`는 서버측 날짜 비교(`gte/lte`)가 안정적으로 동작하지 않아, 캘린더는 전체 명세표를 읽은 뒤 프론트에서 월/기간 필터링하는 구조를 사용 중.
- 거래처 자동완성 exact-name hydrate는 유지되어, 동일 상호 고객이 여러 명인 케이스는 기존처럼 `customer_id` 연결 품질에 영향을 받음.
- 임시저장은 현재 `새 명세표` 1건만 로컬에 보관하는 구조라, 여러 개의 임시 명세표를 병렬로 쌓아두는 용도는 아님.
- 카카오 SDK JS Key가 플레이스홀더(`YOUR_KAKAO_JS_KEY_HERE`) 상태
- 상세 페이지 카카오 SDK `integrity` 값이 현재 응답 해시와 달라 공유 SDK 로딩이 차단됨
- tbl_Schedules에 중복 일정 테스트 데이터 있음 (SCH_20260320_03, SCH_20260320_77 — 같은 날짜/시간)
- WF-18의 schedule_id 생성이 2자리 랜덤으로 충돌 가능성 있음 (6자리로 확장 권장)
- WF-20의 `require('https')` 방식은 동작하지만 비권장
- 기존 tbl_Partners의 grade 필드가 SILVER로 되어 있어 프론트에서 BLOOM 매핑 처리 중
- `docs/n8n-automation-efficiency-review-2026-03-09.md`는 분석/제언 문서이며, 아직 실제 이관이나 워크플로우 분할은 수행되지 않음
- `codex-skills/partnerclass-live-qa`는 repo-local 스킬이라, 자동 트리거를 원하면 전역 Codex 스킬 디렉터리로 별도 설치가 필요함
- 메이크샵 Open API 최신 로컬/공식 스펙 기준 회원 생성 엔드포인트가 문서화돼 있지 않아, 일반 회원/파트너 테스트 계정은 수동 생성 후 제공받아야 한다.
- `jihoo5755`는 live 기준 `group_name=관리자`, `group_level=10` 으로 `8011` 접근이 가능하지만, 현재 `2608` 파트너 인증 데이터와는 연결되지 않는다.
- `makeshop-d4-dev`는 `/Users/jangjiho/workspace/AGENTS.md`를 기준 문서로 참조하므로, 해당 경로가 바뀌면 스킬 안내도 함께 갱신해야 함
- 어드민 권한 판정은 이제 `group_name` 일치 또는 `group_level >= 9`면 통과하므로, 다른 최고등급 회원이 의도치 않게 열리지 않는지 운영 정책 확인 필요
- 현재 이 대화 세션의 내장 Playwright MCP는 stale 상태일 수 있다. 설정은 복구됐지만, 같은 세션에서는 여전히 `Transport closed`가 날 수 있으므로 새 Codex 세션 또는 앱 재시작 후 재검증하는 편이 안전하다.
- `교육 필수 gate 제거`와 `2610 회원 공용 시작 가이드` 전환, `8009` 약관 체크 helper 반영까지 모두 live 저장 확인이 끝났다.
- 테스트 강의 `CL_202603_697` 는 현재 live `PENDING_REVIEW` 상태의 QA용 데이터다. 관리자 정리 전까지는 파트너 대시보드 `2608` 에 `심사중` 카드로 계속 보인다.
- live `WF-10`은 선택형 가이드 응답과 score 판정까지 반영됐지만, 내부에 미사용 `Build Certificate Email / Build Retry Email / Build Pass Telegram` 노드는 아직 JSON에 남아 있다.
