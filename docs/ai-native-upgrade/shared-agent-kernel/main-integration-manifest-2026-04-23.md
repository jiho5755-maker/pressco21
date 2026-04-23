# Shared Agent Ecosystem — main 통합 매니페스트

> 작성: Claude Code (work/workspace/claude-shared-agent-ecosystem)
> 날짜: 2026-04-23
> 목적: Claude 브랜치와 OMX 브랜치의 shared-agent 관련 변경만 main에 안전하게 통합

---

## 결론

Claude 브랜치에는 shared-agent 핵심 파일(스킬 5개 + 설계 문서 45개 + PRD + scope-guard 수정)과 함께, 이번 통합에 포함하면 안 되는 파일(offline-crm 6개 + n8n 1개 + 브랜드 디자인 3개)이 섞여 있다. cherry-pick 또는 경로 지정 checkout으로 MERGE_CORE만 추출해야 한다.

OMX 브랜치(ai-team-pilot)가 `_tools/omx-*` 22개 파일의 source of truth이므로, Claude가 작성한 `_tools/omx-handoff-reader.sh`는 OMX 최신본으로 대체해야 한다.

AGENTS.md의 Shared Agent Kernel 섹션은 양쪽이 거의 동일하나, Claude 쪽이 `failures.md` 언급과 `omx-handoff-reader.sh` 참조를 추가로 포함한다. 두 쪽을 병합한 최종본을 사용해야 한다.

---

## MERGE_CORE

shared-agent 통합에 반드시 포함해야 하는 파일 (62개):

### Claude 스킬 (5 유닛, 8 파일)
```
.claude/skills/pressco21-claude-ecosystem/SKILL.md
.claude/skills/pressco21-core-personas/SKILL.md
.claude/skills/pressco21-core-personas/claude-agent-roster-map.md
.claude/skills/pressco21-core-personas/founder-facing-output-examples.md
.claude/skills/pressco21-core-personas/founder-facing-wording-rules.md
.claude/skills/pressco21-memory-sync/SKILL.md
.claude/skills/pressco21-session-continuity/SKILL.md
.claude/skills/pressco21-session-continuity/self-smoke-runbook.md
.claude/skills/pressco21-team-meeting/SKILL.md
```

### Shared Agent Kernel 설계 문서 (51 파일)
```
docs/ai-native-upgrade/shared-agent-kernel/README.md
docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml
docs/ai-native-upgrade/shared-agent-kernel/canonical-roster-migration-plan-v1.md
docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md
docs/ai-native-upgrade/shared-agent-kernel/handoff-examples-v1.md
docs/ai-native-upgrade/shared-agent-kernel/memory-spine-spec-v1.md
docs/ai-native-upgrade/shared-agent-kernel/runtime-divergence-matrix-v1.md
docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md
docs/ai-native-upgrade/shared-agent-kernel/cross-runtime-output-comparison-v1.md
docs/ai-native-upgrade/shared-agent-kernel/cross-runtime-review-checklist-v1.md
docs/ai-native-upgrade/shared-agent-kernel/shared-agent-bridge-runbook-v1.md
docs/ai-native-upgrade/shared-agent-kernel/claude-adapter-*-2026-04-21.md (4 파일)
docs/ai-native-upgrade/shared-agent-kernel/claude-compact-update-2026-04-21.md
docs/ai-native-upgrade/shared-agent-kernel/claude-founder-facing-output-examples-v1.md
docs/ai-native-upgrade/shared-agent-kernel/claude-next-tasks-2026-04-21.md
docs/ai-native-upgrade/shared-agent-kernel/claude-prompt-packet-2026-04-21.md
docs/ai-native-upgrade/shared-agent-kernel/omx-*-v1.md (20+ 파일)
docs/ai-native-upgrade/shared-agent-kernel/proposals/ (2 파일)
docs/ai-native-upgrade/shared-agent-kernel/templates/ (6 파일)
docs/ai-native-upgrade/shared-agent-kernel/fixtures/ (5 파일)
```

### PRD
```
docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md
```

### 인프라 수정
```
_tools/project-scope.sh          (scope-guard: team/handoffs/ + team/knowledge-base/ 허용)
_tools/git-hooks/pre-commit      (scope-guard exit code 전파 수정)
.gitignore                       (shared-agent 관련 변경이 있다면)
AGENTS.md                        (Shared Agent Kernel 섹션 추가)
```

---

## MERGE_OPTIONAL

유용하지만 shared-agent 통합과 직접 관련은 약한 파일 (4개):

```
docs/brand-design-guide-for-designers.md     (브랜드 디자인 가이드)
docs/generate-brand-guide-docx.py             (Word 가이드 생성기)
docs/generate-figma-setup-guide.py            (Figma 세팅 가이드 생성기)
docs/ai-native-upgrade/shared-agent-kernel/omx-setup-prompt-2026-04-23.md  (OMX 세팅 프롬프트, 이미 실행됨)
```

---

## TEAM_BRANCH_ONLY

team 프로젝트 브랜치(`work/team/*`)에서 별도로 다뤄야 하는 파일 (24개):

```
team/handoffs/latest.md
team/knowledge-base/강예린-hr/playbook.md
team/knowledge-base/강예린-hr/failures.md
team/knowledge-base/김도현-coo/playbook.md
team/knowledge-base/김도현-coo/failures.md
team/knowledge-base/김도현-coo/growth-log.md        (디자인 기획 학습 추가)
team/knowledge-base/박서연-cfo/playbook.md
team/knowledge-base/박서연-cfo/failures.md
team/knowledge-base/박서연-cfo/growth-log.md        (디자인 기획 학습 추가)
team/knowledge-base/유준호-페어코더/playbook.md
team/knowledge-base/유준호-페어코더/failures.md
team/knowledge-base/윤하늘-pm/playbook.md
team/knowledge-base/윤하늘-pm/failures.md
team/knowledge-base/정유나-cmo/playbook.md
team/knowledge-base/정유나-cmo/failures.md
team/knowledge-base/정유나-cmo/growth-log.md        (디자인 기획 학습 추가)
team/knowledge-base/조현우-법무/playbook.md
team/knowledge-base/조현우-법무/failures.md
team/knowledge-base/최민석-cto/playbook.md
team/knowledge-base/최민석-cto/failures.md
team/knowledge-base/최민석-cto/growth-log.md        (디자인 기획 학습 추가)
team/knowledge-base/한지훈-cso/playbook.md
team/knowledge-base/한지훈-cso/failures.md
team/knowledge-base/한지훈-cso/growth-log.md        (디자인 기획 학습 추가)
```

참고: OMX 브랜치(ai-team-pilot)도 6개 growth-log를 수정했다. 양쪽 growth-log append를 모두 보존해야 한다.

---

## EXCLUDE_FROM_THIS_MERGE

이번 통합에서 반드시 제외 (7개):

```
offline-crm-v2/deploy/deploy.sh
offline-crm-v2/deploy/nginx-crm-secure.conf
offline-crm-v2/src/components/InvoiceDialog.tsx
offline-crm-v2/src/components/TransactionDetailDialog.tsx
offline-crm-v2/src/lib/accountingMeta.ts
offline-crm-v2/src/lib/autoDeposits.ts
offline-crm-v2/src/lib/reporting.ts
offline-crm-v2/src/pages/CustomerDetail.tsx
offline-crm-v2/src/pages/DepositInbox.tsx
offline-crm-v2/src/pages/Receivables.tsx
offline-crm-v2/src/pages/Transactions.tsx
n8n-automation/workflows/automation/daily-sales-all-channels.json
```

---

## 충돌 예상 파일

| 파일 | Claude 변경 | OMX 변경 | 해결 방법 |
|------|-----------|---------|----------|
| `AGENTS.md` | Shared Agent Kernel 섹션 추가 | 동일 섹션 추가 (약간 다름) | 아래 "최종 문구" 사용 |
| `_tools/project-scope.sh` | team/handoffs/ + knowledge-base/ 허용 | 다른 수정 가능 | 양쪽 변경 수동 병합 |
| `_tools/omx-handoff-reader.sh` | Claude가 작성 | **OMX 최신본 우선** | OMX 버전 사용 |
| growth-log.md (5개) | 디자인 기획 학습 append | 다른 학습 append | 양쪽 append 모두 보존 |

### OMX 최신본 우선 파일

아래 파일은 OMX 워크트리(`workspace-ai-team-pilot/_tools/`)의 버전을 사용해야 한다. Claude 버전이 있으면 OMX로 대체한다:

```
_tools/omx-handoff-reader.sh           ← Claude 버전 존재, OMX 최신본 우선
_tools/omx-founder-facing-render.sh    ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-live.sh      ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-smoke.sh     ← Claude 없음, OMX에서 가져옴
_tools/omx-latest-handoff-bridge.py    ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-render.py    ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-normalize.py ← Claude 없음, OMX에서 가져옴
_tools/omx-callsite-template.sh        ← Claude 없음, OMX에서 가져옴
_tools/omx-claude-handoff-smoke.py     ← Claude 없음, OMX에서 가져옴
_tools/omx-cross-runtime-smoke.sh      ← Claude 없음, OMX에서 가져옴
_tools/omx-easy.sh                     ← Claude 없음, OMX에서 가져옴
_tools/omx-execution-report-callsite.sh ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-emit.sh      ← Claude 없음, OMX에서 가져옴
_tools/omx-founder-facing-lib.sh       ← Claude 없음, OMX에서 가져옴
_tools/omx-handoff-callsite.sh         ← Claude 없음, OMX에서 가져옴
_tools/omx-runtime-integration-demo.sh ← Claude 없음, OMX에서 가져옴
_tools/omx-team-meeting-callsite.sh    ← Claude 없음, OMX에서 가져옴
_tools/omx-verification-callsite.sh    ← Claude 없음, OMX에서 가져옴
```

---

## AGENTS.md Shared Agent Kernel 최종 문구 추천

Claude 버전에 `failures.md` 언급과 `omx-handoff-reader.sh` 참조가 포함되어 있어 더 완전하다. OMX 버전에는 이것이 빠져 있다. 추천 최종본:

```markdown
## AI 에이전트 조직 (Shared Agent Kernel)

이 저장소의 AI 에이전트는 Claude Code와 Codex/OMX가 공유하는 조직이다.
두 런타임 모두 같은 직원 이름, 같은 handoff 형식, 같은 출력 규격을 따른다.

### Canonical Roster (9명 C-Suite)

| agent_id | display_name | title |
|----------|-------------|-------|
| han-jihoon-cso | 한지훈님 | CSO (전략참모) |
| park-seoyeon-cfo | 박서연님 | CFO (재무총괄) |
| jung-yuna-cmo | 정유나님 | CMO (마케팅총괄) |
| kim-dohyun-coo | 김도현님 | COO (운영총괄) |
| choi-minseok-cto | 최민석님 | CTO (기술총괄) |
| yoon-haneul-pm | 윤하늘님 | PM (프로젝트매니저) |
| cho-hyunwoo-legal | 조현우님 | 법무고문 |
| kang-yerin-hr | 강예린님 | HR코치 |
| yoo-junho-paircoder | 유준호님 | 페어코더 |

상세: `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml`

### Founder-Facing 출력 규칙

1. 출력에서 사람 이름이 먼저 온다 (예: "최민석님이 검증했습니다")
2. runtime 이름(claude, codex-omx)은 직접 노출하지 않는다
3. internal role (architect, critic)은 founder에게 보이지 않는다
4. 이모지를 사용하지 않는다
5. 한국어로 출력한다

상세: `docs/ai-native-upgrade/shared-agent-kernel/omx-output-formatter-spec-v1.md`

### Cross-Runtime Handoff

세션 종료 시 `team/handoffs/latest.md`에 handoff를 기록한다.
다음 세션(어느 런타임이든)이 이 파일을 읽고 작업을 이어받는다.

읽기 도구: `bash _tools/omx-handoff-reader.sh`

필수 필드: handoff_id, runtime, owner_agent_id, summary, decision, changed_artifacts, verification, open_risks, next_step, learn_to_save

상세: `docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md`

### 성장 기록

각 에이전트의 학습 이력은 `team/knowledge-base/{이름}/growth-log.md`에 기록한다.
세션에서 발견한 유용한 패턴은 `learn_to_save`로 handoff에 남기고, 반복 가능한 것은 `playbook.md`로 승격한다.
실패 교훈은 `failures.md`에 기록한다.
```

차이점:
- Claude 추가: `읽기 도구: bash _tools/omx-handoff-reader.sh` (OMX에 없음)
- Claude 추가: `실패 교훈은 failures.md에 기록한다.` (OMX에 없음)
- 나머지 동일

---

## main 통합 순서 (권장)

1. **통합 브랜치 생성**: main에서 `work/workspace/shared-agent-main-integration` 생성
2. **OMX 변경 먼저 적용**: ai-team-pilot 브랜치에서 `_tools/omx-*`, AGENTS.md, `_tools/project-scope.sh` cherry-pick
3. **Claude MERGE_CORE 적용**: claude 브랜치에서 `.claude/skills/`, `docs/ai-native-upgrade/`, `_tools/git-hooks/pre-commit` cherry-pick
4. **AGENTS.md 충돌 해결**: 위 최종 문구 사용
5. **scope-guard 충돌 해결**: Claude의 team/handoffs/ + team/knowledge-base/ 허용을 OMX 버전에 추가
6. **team 변경은 별도**: `work/team/shared-agent-knowledge-init` 브랜치에서 playbook/failures/growth-log 적용
7. **smoke test 실행**: `bash _tools/omx-cross-runtime-smoke.sh` + `bash _tools/omx-handoff-reader.sh`
8. **main merge**: 통합 브랜치 → main (--no-ff)

---

## Claude 쪽 smoke/검증 결과

| 항목 | 결과 |
|------|------|
| Hook 7개 syntax check | 7/7 pass |
| `/save` 스킬 handoff-contract 준수 | 13/13 필드 적합 |
| `omx-handoff-reader.sh` 실행 | pass (compact 출력 정상) |
| scope-guard `team/handoffs/` 허용 | pass |
| growth-log 5명 append | pass (원본 보존 + 추가분 정상) |
| playbook + failures 18개 생성 | pass |

---

## OMX 쪽에서 반드시 유지해야 할 파일 목록

아래 22개 `_tools/omx-*` 파일은 OMX가 source of truth이다. 통합 시 OMX 버전을 사용한다:

```
_tools/omx-bootstrap.sh
_tools/omx-callsite-template.sh
_tools/omx-claude-handoff-smoke.py
_tools/omx-common.sh
_tools/omx-cross-runtime-smoke.sh
_tools/omx-easy.sh
_tools/omx-execution-report-callsite.sh
_tools/omx-founder-facing-emit.sh
_tools/omx-founder-facing-lib.sh
_tools/omx-founder-facing-live.sh
_tools/omx-founder-facing-normalize.py
_tools/omx-founder-facing-render.py
_tools/omx-founder-facing-render.sh
_tools/omx-founder-facing-smoke.sh
_tools/omx-handoff-callsite.sh
_tools/omx-handoff-reader.sh
_tools/omx-latest-handoff-bridge.py
_tools/omx-n8n.sh
_tools/omx-run.sh
_tools/omx-runtime-integration-demo.sh
_tools/omx-team-meeting-callsite.sh
_tools/omx-verification-callsite.sh
```
