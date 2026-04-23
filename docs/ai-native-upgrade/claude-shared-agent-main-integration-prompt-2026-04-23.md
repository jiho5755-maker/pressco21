# Claude 요청 — Shared Agent Ecosystem main 통합 준비

현재 목표는 Claude 쪽 shared-agent 세팅과 OMX 쪽 shared-agent 세팅을 main에 안전하게 통합하는 것입니다.

중요:
- 현재 Claude 브랜치 `work/workspace/claude-shared-agent-ecosystem`를 main에 통째 merge하지 않습니다.
- 해당 브랜치에는 `offline-crm-v2/**`, `n8n-automation/**`, `team/**`, 브랜드 디자인 문서가 섞여 있으므로, shared-agent 통합에 필요한 경로만 export해야 합니다.
- OMX 쪽은 `/Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot`에서 별도 구현을 진행했습니다.
- 최종 목표는 main에 “공통 에이전트 계약층 + Claude 어댑터 + OMX 어댑터”를 올리는 것입니다.

---

## Claude가 해야 할 일

### 1. 현재 Claude 브랜치 diff를 경로별로 분류해 주세요

아래 네 그룹으로 나눠 주세요.

#### `MERGE_CORE`

main에 반드시 들어가야 하는 shared-agent 핵심 파일입니다.

예:
- `.claude/skills/pressco21-*`
- `docs/ai-native-upgrade/shared-agent-kernel/**`
- shared-agent 관련 AGENTS/운영 지침

#### `MERGE_OPTIONAL`

유용하지만 이번 shared-agent 통합과 직접 관련은 약한 파일입니다.

예:
- 브랜드 디자인 파이프라인 문서
- 이번 shared-agent main 통합과 직접 연결되지 않는 보조 문서

#### `TEAM_BRANCH_ONLY`

team 프로젝트 브랜치에서 별도로 다뤄야 하는 파일입니다.

예:
- `team/**`
- `team/knowledge-base/**`
- `team/handoffs/**`

#### `EXCLUDE_FROM_THIS_MERGE`

이번 shared-agent 통합에서 제외해야 하는 파일입니다.

필수 제외:
- `offline-crm-v2/**`
- `n8n-automation/**`
- 이번 shared-agent 통합과 무관한 변경

---

### 2. 아래 파일은 Claude 쪽에서 직접 수정하지 말고, OMX 쪽 최신본을 우선해야 합니다

OMX 쪽 최신 구현 위치:

`/Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot`

OMX 최신본 우선 파일:
- `_tools/omx-handoff-reader.sh`
- `_tools/omx-founder-facing-render.sh`
- `_tools/omx-founder-facing-live.sh`
- `_tools/omx-founder-facing-smoke.sh`
- `_tools/omx-latest-handoff-bridge.py`
- `_tools/omx-founder-facing-render.py`
- `_tools/omx-founder-facing-normalize.py`

Claude 쪽에 같은 목적의 파일이 있으면 “OMX 최신본 우선”이라고 표시해 주세요.

---

### 3. AGENTS.md Shared Agent Kernel 섹션을 비교해 주세요

Claude 브랜치와 OMX 워크트리의 `AGENTS.md` 섹션을 비교해서 최종 문구를 추천해 주세요.

특히 성장 기록 섹션은 아래 요소가 모두 들어가야 합니다.

- `team/knowledge-base/{이름}/growth-log.md`
- `learn_to_save`
- `playbook.md`
- `failures.md`

추천 최종 문구 예시:

```markdown
### 성장 기록

각 에이전트의 학습 이력은 `team/knowledge-base/{이름}/growth-log.md`에 기록한다.
세션에서 발견한 유용한 패턴은 `learn_to_save`로 handoff에 남기고, 반복 가능한 것은 `playbook.md`로 승격한다.
실패 교훈은 `failures.md`에 기록한다.
```

---

### 4. 통합 manifest 문서를 만들어 주세요

다음 파일을 새로 작성해 주세요.

`docs/ai-native-upgrade/shared-agent-kernel/main-integration-manifest-2026-04-23.md`

포함 내용:
- 이번 통합의 목적
- `MERGE_CORE` 경로 목록
- `MERGE_OPTIONAL` 경로 목록
- `TEAM_BRANCH_ONLY` 경로 목록
- `EXCLUDE_FROM_THIS_MERGE` 경로 목록
- 예상 충돌 파일
- Claude가 권장하는 병합 순서
- Claude 쪽 smoke/검증 결과
- OMX 쪽에서 반드시 유지해야 할 파일 목록

---

### 5. 작업 후 handoff를 남겨 주세요

`team/handoffs/latest.md`에는 직접 덮어쓰기 전에, 현재 handoff가 있으면 내용을 확인하고 아래 필드를 포함해 주세요.

필수 필드:
- `handoff_id`
- `runtime: claude`
- `owner_agent_id`
- `contributors`
- `branch`
- `worktree_path`
- `summary`
- `decision`
- `changed_artifacts`
- `verification`
- `open_risks`
- `next_step`
- `learn_to_save`

---

## 절대 하지 말 것

- main에 직접 merge하지 마세요.
- `offline-crm-v2/**` 변경을 이번 shared-agent 통합에 섞지 마세요.
- `n8n-automation/**` 변경을 이번 shared-agent 통합에 섞지 마세요.
- OMX 쪽 최신 `_tools/omx-*` 파일을 Claude 쪽 오래된 버전으로 덮어쓰지 마세요.

---

## 최종 출력 형식

다음 구조로 답변해 주세요.

```markdown
## 결론

## MERGE_CORE

## MERGE_OPTIONAL

## TEAM_BRANCH_ONLY

## EXCLUDE_FROM_THIS_MERGE

## 충돌 예상 파일

## main 통합 순서

## Claude 쪽에서 추가로 필요한 작업

## OMX 쪽에 요청할 작업
```

