# AGENTS.md — PRESSCO21 Codex CLI 지침

> 이 파일은 OpenAI Codex CLI가 이 저장소에서 작업할 때 반드시 읽어야 하는 프로젝트 컨텍스트입니다.
> Claude Code는 별도의 `CLAUDE.md`를 따릅니다.

---

## 운영 모드 (2가지)

### 모드 A: 메인 프로젝트 보조 (Claude Code가 주도하는 프로젝트)

Claude Code가 기획/개발을 완료한 후, Codex CLI가 후속 관리를 담당:
- E2E/통합 테스트 작성 및 실행
- 코드 리팩토링 (로직 변경 없이 구조 개선)
- 코드 리뷰 및 개선 제안
- 간단한 버그 수정 (UI 깨짐, 오타 등)
- 문서 보완

**이 모드에서 Codex 금지 사항:**
1. n8n 워크플로우 JSON 수정 (`파트너클래스/n8n-workflows/*.json`)
2. 비즈니스 로직 임계값 변경 (수수료율, 등급 기준, 가격 정책)
3. ROADMAP.md 수정

### 모드 B: 독립 프로젝트 총괄 (Codex가 스스로 주도하는 프로젝트)

가벼운 프로젝트는 Codex CLI가 기획부터 개발/배포까지 독립 수행:
- 새 페이지/기능 개발
- API 연동
- 서버 배포 (필요 시)
- ROADMAP.md 갱신 (독립 프로젝트 한정)

**모드 B 진입 조건:**
- AI_SYNC.md Next Step에 `[CODEX-LEAD]` prefix가 붙은 태스크
- 또는 사용자가 Codex에 직접 지시한 독립 태스크

**현재 활성 모드 B 프로젝트:**
- `[CODEX-LEAD] 파트너클래스 Phase 3 전체 구현` — ROADMAP.md Phase 3 (Task S0-1 ~ S3-6, 31개)
- PRD: `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md` (v5.0)
- n8n 워크플로우 수정/배포 허용 (모드 B이므로)
- ROADMAP.md 갱신 허용 (완료 태스크 ⬜→✅)
- 서버 배포 허용

---

## 회사 지식 (작업 시작 전 참조)

회사에 대한 이해가 필요한 작업 시 아래를 먼저 읽는다:
- **회사 프로파일**: `company-profile.md` (741줄, 사업/직원/고객/브랜드/제품/역사 전부)
- **브랜드 전략**: `docs/파트너클래스/brand-strategy-comprehensive.md`
- **수정 규칙**: company-profile.md만 수정 → NocoDB/WF/HWPX에 동기화

---

## 공통 금지 사항 (모드 무관)

1. **인증키 파일 수정** — `.secrets.env`, `.secrets`, `.env.local` 수정 금지 (읽기만 가능)
2. **백업 폴더 수정** — `메인페이지/기존 코드/`, `간편 구매/기본코드/`, `간편 구매/고급형 주문서 작성/` 수정 금지
3. **강제 푸시** — `git push --force`, `git reset --hard` 금지
4. **Claude Code가 WRITE 중인 파일 수정** — AI_SYNC.md `Files In Progress` 참조

---

## 파트너클래스 공용 정체성 기준

파트너클래스 관련 기획, UX, IA, 카피, 문서 작업 전에는 아래 문서를 먼저 확인합니다.

- `docs/파트너클래스/README.md`
- `docs/파트너클래스/shared-service-identity.md`
- `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`

요약 기준:

- 1순위 고객은 수강생
- 파트너와 협회는 공급자/제휴 레이어
- 핵심 사업 목적은 높은 플랫폼 수수료가 아니라 재료/키트 판매 활성화와 자사몰 락인 강화
- 협회 레이어는 단순 게시판이 아니라 협회 제휴 유치, 협회원 전용 혜택, 시그니처 제품 노출을 위한 성장 장치

문서 간 충돌이 있으면 `shared-service-identity.md`와 `enterprise-elevation-strategy-2026-03-10.md`를 예전 구현 문서보다 우선합니다.

---

## AI Sync 프로토콜 (충돌 방지 — 가장 중요)

두 CLI가 같은 저장소에서 공존하기 위한 핵심 프로토콜입니다.

### 작업 시작 전 (필수)

1. `AI_SYNC.md` 파일을 읽는다
2. `git pull` 으로 최신 코드 동기화
3. `git status --short` 실행
4. `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`이면:
   - **같은 서브디렉토리**: 파일 수정 금지, 작업 중단
   - **다른 서브디렉토리**: 해당 서브디렉토리 파일만 수정 가능 (교차 수정 금지)
5. 소유권이 `IDLE`이면 `Session Lock`을 자신(CODEX)으로 갱신한 후 작업 시작

### 서브디렉토리 격리 규칙

두 CLI가 **다른 서브디렉토리**에서 작업할 때는 동시 작업 가능:
```
Claude Code → 파트너클래스/  (WRITE)
Codex CLI   → offline-crm-v2/ (WRITE)  ← OK, 서로 다른 디렉토리
```

**같은 서브디렉토리**에서는 절대 동시 WRITE 금지:
```
Claude Code → 파트너클래스/  (WRITE)
Codex CLI   → 파트너클래스/  (WRITE)  ← 금지!
```

### AI_SYNC.md Session Lock 형식

```markdown
- Current Owner: CODEX (또는 CLAUDE, 또는 IDLE)
- Mode: WRITE (또는 READ, 또는 —)
- Started At: 2026-03-09 18:00:00 KST
- Branch: main
- Working Scope: 작업 내용 요약
- Active Subdirectory: offline-crm-v2
```

### 작업 중

- `Files In Progress` 섹션에 수정 중인 파일 목록 기재
- 같은 파일을 Claude Code가 수정 중이면 절대 건드리지 않음
- 커밋 메시지에 `[codex]` prefix 사용: `[codex] E2E 테스트 거래내역 페이지 추가`

### 작업 종료 (필수)

1. `Last Changes` 섹션에 변경 내역 기재
2. `Next Step` 섹션에 후속 작업 기재
3. `Session Lock`을 `IDLE`로 변경
4. `git commit -m "[codex] ..."` → `git push`

### 브랜치 관리 필수 규칙

**원칙: 모든 작업물은 반드시 main에 머지되어야 "완료"**

1. **main 브랜치 커밋 원칙**: 기본적으로 main에서 작업. 브랜치는 실험/테스트 용도로만 사용
2. **브랜치 작업 시 머지 의무**: 브랜치에서 작업한 경우 `AI_SYNC.md`에 브랜치명과 목적을 반드시 기록하고, 작업 완료 후 main 머지까지 책임
3. **방치 브랜치 금지**: 브랜치에 남은 변경이 있으면 필요한 내용은 main으로 반영하고, 불필요하거나 구버전이면 정리 후 브랜치를 삭제

> 배경: `codex/partnerclass-e0-001-testdata-cleanup` 브랜치에 makeshop-skin 723개 + 문서 63개가 main에 머지되지 않은 채 방치되어 있었음. Claude Code가 분석/복원 완료했으나, 재발 방지를 위해 양쪽 모두 이 규칙을 따른다.

---

## 프로젝트 구조

```
pressco21/
  AGENTS.md              ← 이 파일 (Codex CLI 전체 지침)
  CLAUDE.md              ← Claude Code 전용 지침
  AI_SYNC.md             ← 에이전트 간 인수인계 보드 (충돌 방지 핵심)
  ROADMAP.md             ← 프로젝트 로드맵
  .secrets.env           ← 인증키 (수정 금지)

  파트너클래스/           ← 꽃 공예 클래스 플랫폼
    AGENTS.md            ← 파트너클래스 전용 Codex 지침
    n8n-workflows/       ← n8n 워크플로우 JSON
    상세/                ← 클래스 상세 페이지 (HTML/CSS/JS)
    파트너/              ← 파트너 대시보드 (HTML/CSS/JS)
    강의등록/            ← 클래스 등록 페이지
    마이페이지/          ← 수강생 마이페이지
    관리자/              ← 관리자 페이지

  offline-crm-v2/        ← 오프라인 CRM (React + TypeScript)
    AGENTS.md            ← CRM 전용 Codex 지침 (E2E 테스트 상세)
    src/                 ← 소스 코드
    tests/               ← Playwright E2E 테스트

  homepage-automation/   ← 메이크샵 홈페이지 자동화
  메인페이지/            ← 메이크샵 메인페이지
  간편 구매/             ← 간편 구매 페이지
```

---

## 서브디렉토리별 작업 지침

### offline-crm-v2 (CRM)

- 상세 지침: `offline-crm-v2/AGENTS.md` 참조
- 기술 스택: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Playwright
- 테스트 실행: `cd offline-crm-v2 && npx playwright test`
- 빌드 확인: `cd offline-crm-v2 && npm run build`
- 기존 28건 테스트 통과 유지 필수

### 파트너클래스

- 상세 지침: `파트너클래스/AGENTS.md` 참조
- 기술: Vanilla HTML/CSS/JS (빌드 도구 없음)
- **메이크샵 필수 제약**:
  - JS 내 `${variable}` → `\${variable}` 이스케이프 필수 (저장 오류 방지)
  - `<!-- -->`, `{$치환코드}` 가상 태그 절대 수정 금지
  - IIFE 패턴 필수 (전역 변수 오염 방지)
  - CSS 스코핑 필수 (컨테이너 ID/클래스로 범위 제한)

### homepage-automation / 메인페이지

- 메이크샵 D4(카멜레온) 기반
- 파트너클래스와 동일한 메이크샵 제약 적용

---

## 코딩 규칙

- **변수/함수명**: camelCase 영어
- **CSS 클래스명**: kebab-case 영어
- **한글 식별자 금지** (변수명, 함수명, 클래스명에 한국어 사용 금지)
- **주석**: 한국어
- **커밋 메시지**: `[codex] 간결한 한국어 설명`
- **var 사용 금지**: `const` / `let` 만 사용
- **반응형 브레이크포인트**: 768px / 992px / 1200px

---

## 인프라 참조 (배포 시 필요 — 모드 B 전용)

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud (158.180.77.201) |
| SSH | `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201` |
| n8n 운영 | https://n8n.pressco21.com |
| NocoDB | https://nocodb.pressco21.com |
| CRM 운영 | https://crm.pressco21.com |
| CRM 배포 | `cd offline-crm-v2 && bash deploy/deploy.sh` |

> 주의: 모드 A에서는 서버 배포를 하지 않습니다. 모드 B에서만 필요 시 사용.

## n8n 워크플로우 자동화 (모드 B에서 사용 가능)

n8n 워크플로우 JSON을 생성하거나 수정할 때는 반드시 아래를 참조:

1. **노드 구현체**: `/Users/jangjiho/Desktop/n8n-main/packages/nodes-base/` — 정확한 노드 파라미터 참조
2. **기존 WF JSON 패턴**: `n8n-automation/workflows/` — 30+ 운영 중 워크플로우
3. **WF 빌더 가이드**: `/Users/jangjiho/Desktop/n8n-main/.claude/agents/n8n-workflow-builder.md`
4. **노드 카탈로그**: `/Users/jangjiho/Desktop/n8n-main/.claude/agents/n8n-nodes-index.md`

**배포**: `bash n8n-automation/_tools/deploy.sh <WF_ID> <JSON_경로>`
**인증키**: `n8n-automation/.secrets` → `N8N_API_KEY`
**n8n-main 폴더**: 읽기 전용 지식 라이브러리. 파일 추가/수정 금지.

---

## 태스크 수행 흐름

```
1. AI_SYNC.md 확인 → 충돌 없으면 소유권 획득
2. git pull (최신 코드 동기화)
3. 모드 확인 (A: 보조 / B: 독립)
4. 작업 수행
5. 로컬에서 검증 (테스트 실행, 빌드 확인)
6. AI_SYNC.md 갱신 (Last Changes, Next Step)
7. git commit -m "[codex] ..." && git push
8. AI_SYNC.md Session Lock → IDLE
```

---

## 참고 문서

- `ROADMAP.md` — 전체 프로젝트 진행 상태
- `.secrets.env` — 환경 변수 키 이름 참조 (값은 읽기만)
- `파트너클래스/n8n-workflows/*.json` — API 엔드포인트/데이터 구조 참조
- `docs/` — 아키텍처 리뷰 등 분석 문서
