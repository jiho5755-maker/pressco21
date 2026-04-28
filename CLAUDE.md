<!-- HARNESS-META: v4.0 | 2026-04-07 | Claude Code -->
# PRESSCO21 프로젝트 CLAUDE 지침

## Worktree first

`AI_SYNC.md`는 2026-04-16부터 운영 lock 파일로 사용하지 않습니다. 과거 기록은
`archive/ai-sync-history/AI_SYNC-retired-2026-04-16.md`에 보존되어 있습니다.

이 저장소는 여러 프로젝트가 한 Git 저장소에 공존하므로 Claude Code 작업도 반드시
**프로젝트별 worktree + 프로젝트별 branch**에서 진행하세요.

- 루트 main worktree에서 직접 기능 개발/수정 금지
- 작업 시작은 `bash _tools/pressco21-task.sh <project> <task>` 사용
- 생성된 worktree 폴더를 Claude Code/Cursor에서 열고 작업
- 같은 worktree에서는 WRITE AI를 한 번에 하나만 사용
- 다른 AI가 같은 worktree에서 WRITE 중이면 Claude Code는 리뷰/검증만 수행
- 작업 상태 확인은 `bash _tools/pressco21-check.sh` 사용
- 커밋 전 Git hook이 branch별 허용 범위 밖 파일을 차단함

예시:

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/pressco21-task.sh crm invoice-fix
cd /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-invoice-fix
```

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


## 11번가 Open API 공용 키트 라우팅

11번가, 11st, 11번가 Open API, 오픈마켓 11번가 API 관련 기획/개발/운영 요청이 나오면 작업 전에 반드시 아래 공용 키트부터 확인하세요.

- 전체 지침: `docs/openmarket-ops/11st-openapi-global-kit.md`
- 빠른 시작: `docs/openmarket-ops/11st-openapi-global-quickstart.md`
- URL/Method 카탈로그 JSON: `docs/openmarket-ops/11st-openapi-url-catalog.json`
- 사람이 보는 카탈로그: `docs/openmarket-ops/11st-openapi-url-catalog.md`
- 미확인 항목 정리: `docs/openmarket-ops/11st-openapi-missing-url-resolution-2026-04-28.md`
- 공용 CLI: `_tools/openmarket/11st/11st_api.py`
- CLI README: `_tools/openmarket/11st/README.md`

원칙: 카탈로그 검색 → Method/URL/Payload/위험도 확인 → CLI 우선 사용 → write API는 `fresh read → dry-run → 승인 → execute → verify`. API KEY, 쿠키, 추가인증 결과, 실제 IP는 출력/문서/커밋/handoff에 남기지 마세요. `official_no_content` 또는 `usable=false` 항목은 자동화 대상으로 쓰지 않고 `replacement_api_seq`를 우선 확인하세요.

## Shared Agent Ecosystem Canonical Source

Founder-facing canonical roster와 shared agent contract의 기준은 아래 문서를 우선합니다.

- `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml`
- `docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md`

즉, Claude 내부 agent 수나 구현 구조와 별개로, 창업자에게 보이는 직원 정체성은 shared-agent-kernel 문서를 기준으로 유지합니다. 같은 직원이 회의실(Claude)과 실행실(OMX)에서 일한다는 mental model을 깨지 마세요.

## Codex CLI 협업 규칙

두 가지 모드로 운영됩니다:
- **모드 A (보조)**: Claude Code가 메인 프로젝트 기획/개발 → Codex가 테스트/리팩토링/관리
- **모드 B (독립)**: 가벼운 프로젝트는 Codex가 기획~배포까지 독립 수행

### Claude Code 작업 지침
- **작업 시작 전**: 프로젝트별 worktree를 생성하거나 기존 작업 worktree를 사용
- **Codex와 병행**: 서로 다른 worktree면 동시 WRITE 가능, 같은 worktree면 WRITE AI 1명 원칙
- **Codex에 위임할 태스크**: 같은 worktree에서는 테스트/리뷰/검증처럼 역할을 분리
- **Codex 설정 파일**: `AGENTS.md` (루트 + 서브디렉토리), `.codex/config.toml`
- **상태 확인**: `bash _tools/pressco21-check.sh`

### 브랜치 관리

main은 최종 통합 기준선입니다. 기능 개발은 `work/<project>/<task>` 브랜치와 worktree에서 진행하고,
검증이 끝난 브랜치만 main으로 merge합니다.

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
