<!-- HARNESS-META: v4.0 | 2026-04-07 | Claude Code -->
# PRESSCO21 프로젝트 CLAUDE 지침

## AI handoff first

이 저장소와 하위 폴더에서 작업을 시작하기 전에 반드시 루트의 `AI_SYNC.md`와 `git status --short`를 먼저 확인하세요.

- `AI_SYNC.md`의 `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일 수정 금지
- 첫 수정 전에 `AI_SYNC.md`의 `Session Lock`과 `Files In Progress` 갱신
- 작업 종료 전 `Last Changes`와 `Next Step` 갱신
- `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행

## 파트너클래스 공용 기준

파트너클래스 관련 기획, 카피, UX, IA, 운영 전략 작업을 할 때는 아래 문서를 먼저 읽고 그 기준을 우선 적용하세요.

- 문서 인덱스: `docs/파트너클래스/README.md`
- 공용 정체성 문서: `docs/파트너클래스/shared-service-identity.md`
- 상세 전략 문서: `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`

핵심 원칙:

- 1순위 고객은 수강생
- 파트너와 협회는 공급자/제휴 레이어
- 핵심 사업 목적은 플랫폼 수수료 극대화가 아니라 재료/키트 판매 활성화와 자사몰 락인 강화
- 협회 기능은 부가 게시판이 아니라 제휴 유치와 협회원 락인 장치

문서가 충돌하면 `shared-service-identity.md`와 `enterprise-elevation-strategy-2026-03-10.md`를 예전 구현 문서보다 우선합니다.

## Codex CLI 협업 규칙

두 가지 모드로 운영됩니다:
- **모드 A (보조)**: Claude Code가 메인 프로젝트 기획/개발 → Codex가 테스트/리팩토링/관리
- **모드 B (독립)**: 가벼운 프로젝트는 Codex가 기획~배포까지 독립 수행

### Claude Code 작업 지침
- **작업 시작 전**: `AI_SYNC.md`에서 Codex가 WRITE 모드인지 확인. 같은 서브디렉토리면 수정 금지
- **작업 완료 후**: `AI_SYNC.md` Session Lock을 IDLE로 돌리고 Last Changes/Next Step 갱신
- **Codex에 위임할 태스크**: AI_SYNC.md Next Step에 prefix로 기재:
  - `[CODEX]` — 보조 작업 (테스트, 리팩토링 등)
  - `[CODEX-LEAD]` — 독립 프로젝트 (기획~배포 위임)
- **Codex 설정 파일**: `AGENTS.md` (루트 + 서브디렉토리), `.codex/config.toml`
- **서브디렉토리 격리**: 서로 다른 서브디렉토리면 동시 WRITE 가능

### 브랜치 관리

모든 작업은 main 커밋 기본. 브랜치는 실험용만. 미머지 브랜치는 AI_SYNC.md에 기록.

## 메이크샵 스킨 정본 규칙 (2026-04-02~)

**`makeshop-skin/`이 유일한 정본입니다.** 모든 메이크샵 개발은 이 폴더에서 합니다.

| 구 폴더 (참조 전용) | 정본 (개발용) |
|-------------------|-------------|
| `메인페이지/` | `makeshop-skin/main/` |
| `파트너클래스/` 10개 폴더 | `makeshop-skin/pages/partnerclass-*/` |
| `간편 구매/` | `makeshop-skin/pages/quick-order/` |
| `브랜드스토리/브랜드페이지/` | `makeshop-skin/pages/brand/` |
| `파트너맵/` | `makeshop-skin/pages/partner-map/` |
| `레지너스 화이트페이퍼/` | `makeshop-skin/pages/resiners/` |
| `1초 로그인(킵그로우)/` | `makeshop-skin/member/login*.{html,css,js}` |

- **개발**: `makeshop-skin/{경로}` 파일 수정
- **배포**: 편집기 push (clipboard API) → SYNC-STATUS.md 갱신
- **검증**: `curl`로 서버 파일 줄 수 대조
- 구 폴더(`메인페이지/`, `파트너클래스/`)는 참조/이력용으로만 유지, 직접 수정 금지
- `git commit` 시 `SYNC-STATUS.md`가 함께 staging 안 되면 pre-commit이 경고

## 백업/참조용 폴더 (수정 금지)

다음 폴더들은 리뉴얼 전 원본 백업입니다. 절대 수정하지 마세요:
- `메인페이지/기존 코드/` — 메인페이지 리뉴얼 전 원본
- `간편 구매/기본코드/` — 간편 구매 기본형 원본
- `간편 구매/고급형 주문서 작성/` — 간편 구매 고급형 원본

## 인증키 관리

프로젝트의 모든 인증키(API 토큰, 비밀번호 등)는 루트의 `.secrets.env` 파일에서 중앙 관리합니다.
이 파일은 `.gitignore`에 의해 git에 추적되지 않습니다.

코드/문서에는 키 직접 기재 금지 → `.secrets.env 참조` 또는 `$env.VAR_NAME` 형식으로 대체.

## 메이크샵 HTML 수정 주의사항

- `메인페이지/Index.html`: 원본 가상태그 손상 3곳 존재. 수정 시 파서 검증 오류 발생. 모든 개선은 `js.js` 동적 적용으로.
- HTML에 `<!--/가상태그/-->` 중첩 주의: if_not_soldout 내부 if_login 삽입 시 전체 템플릿 깨짐 확인됨.

## 에이전트 조직도 (25개, 3-Tier)

opus 10 / sonnet 10 / haiku 5. T1=7상시, T2=8트리거, T3=10위임.
에이전트 파일: `~/.claude/agents/` | 라우팅: `~/.claude/rules/agent-routing.md`
