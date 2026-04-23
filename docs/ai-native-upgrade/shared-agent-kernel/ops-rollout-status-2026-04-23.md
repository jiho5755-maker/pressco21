# Shared Agent Ecosystem 운영 롤아웃 상태 (2026-04-23)

> 목적: Shared Agent Kernel main 통합 이후, 대표가 지시한 1~4순위 후속 작업의 위치·상태·다음 액션을 정리한다.

---

## 결론

- **main에서 직접 개발하지 않는다.** main은 이미 통합 기준선이므로, 모든 후속 작업은 프로젝트별 worktree/branch에서 진행한다.
- **1순위(team memory)는 완료되어 main에 병합/push됨.**
- **2~3순위(runtime 자동 흐름/call-site)는 pressco21 wrapper 수준은 동작 검증 완료, 실제 OMX 런타임 깊은 삽입은 별도 작업으로 분리한다.**
- **4순위(worktree 정리)는 삭제 전 감사표를 먼저 보고, 대표 승인 후 삭제한다.**

---

## 작업 위치 원칙

| 작업 | 작업 위치 | 이유 |
|---|---|---|
| team/handoffs, team/knowledge-base 정리 | `work/team/*` | team 장기 기억은 workspace 도구와 분리해야 충돌이 적다 |
| Claude/OMX 공통 문서·도구 수정 | `work/workspace/*` | 루트 문서, `.claude`, `.codex`, `_tools`, `docs` 범위 |
| 실제 OMX 런타임 소스 수정 | 별도 OMX 소스 repo/worktree | pressco21이 아니라 oh-my-codex 런타임 자체 변경일 수 있음 |
| worktree/branch 삭제 | main에서 상태 확인 후 수동 승인 | 삭제는 되돌리기 어렵기 때문에 승인 필요 |

---

## 1순위 — team 기억 저장소 정리

### 상태

완료.

### 사용 브랜치

`work/team/shared-agent-memory-mainline`

### main 반영

- commit: `[codex] shared agent 팀 기억 저장소 정리`
- main merge/push 완료

### 반영 내용

- `team/handoffs/latest.md`
- `team/handoffs/2026-04-23-claude-main-integration.md`
- `team/handoffs/2026-04-23-codex-duct-tape-draft.md`
- `team/knowledge-base/shared/founder-preferences.md`
- `team/knowledge-base/*/growth-log.md`
- `team/knowledge-base/*/playbook.md`
- `team/knowledge-base/*/failures.md`
- `team/README.md`, `team/boardroom.md` Core 6 founder-facing 설명

### 검증

- `bash _tools/pressco21-check.sh` PASS
- handoff archive 2개 + latest 존재
- growth-log 9개 존재
- playbook 9개 존재
- failures 9개 존재

---

## 2순위 — 세션 시작/종료 handoff 흐름 점검

### 현재 동작

- `bash _tools/omx-handoff-reader.sh`는 `team/handoffs/latest.md`를 compact 한 줄로 읽는다.
- `team/handoffs/latest.md`가 없으면 Claude latest handoff fallback을 읽을 수 있게 설계되어 있다.
- `bash _tools/omx-cross-runtime-smoke.sh`가 Claude latest handoff bridge와 OMX founder-facing 출력 흐름을 함께 검증한다.

### 확인 명령

```bash
bash _tools/omx-handoff-reader.sh
bash _tools/omx-cross-runtime-smoke.sh
```

### 남은 일

Claude Code 쪽은 세션 시작/종료 훅이 실제로 latest handoff를 읽고 쓰는지 Claude가 최종 확인해야 한다.
Codex/OMX 쪽은 세션 시작 시 아래 명령을 운영 습관으로 사용하면 된다.

```bash
bash _tools/omx-handoff-reader.sh
```

---

## 3순위 — OMX founder-facing call-site 연결

### 현재 동작

pressco21 wrapper 수준에서는 4종 call-site가 연결되어 있다.

- `_tools/omx-team-meeting-callsite.sh`
- `_tools/omx-verification-callsite.sh`
- `_tools/omx-handoff-callsite.sh`
- `_tools/omx-execution-report-callsite.sh`

아래 smoke가 이 4개를 호출해 검증한다.

```bash
bash _tools/omx-cross-runtime-smoke.sh
```

### 남은 일

실제 `omx team`, `omx ralph`, 장시간 실행 종료 지점 등 **OMX 런타임 내부 출력 직전 단계**에 위 wrapper를 꽂는 것은 별도 작업이다.
이 작업은 pressco21 repo가 아니라 oh-my-codex 소스 repo에서 해야 할 수 있다.

### 다음 권장 브랜치

`work/workspace/omx-runtime-callsite-audit`

### 권장 산출물

- 실제 OMX 런타임 call-site 위치 목록
- pressco21 wrapper를 직접 부를 수 있는 위치/부를 수 없는 위치 구분
- 외부 OMX repo 수정이 필요한 경우 별도 브랜치/백업 지점 제안

---

## 4순위 — worktree/branch 정리 감사

### 현재 원칙

바로 삭제하지 않는다. 먼저 아래 세 그룹으로 나눈다.

| 그룹 | 의미 | 처리 |
|---|---|---|
| 삭제 후보 | main에 이미 병합됐고 깨끗한 worktree | 대표 승인 후 `git worktree remove` + branch 삭제 |
| 보존 후보 | 아직 WIP가 있거나 별도 프로젝트 | 유지 |
| 병합 후보 | 의미 있는 변경이 남아 있는 worktree | 별도 branch로 정리 후 merge |

### 2026-04-23 현재 관찰

| worktree | 상태 | 추천 |
|---|---|---|
| `workspace-claude-shared-agent-ecosystem` | clean, shared-agent core는 main 반영됨 | Claude 확인 후 삭제 후보 |
| `workspace-shared-agent-main-integration` | clean, main 반영됨 | 삭제 후보 |
| `team-shared-agent-memory-mainline` | clean, main 반영됨 | 삭제 후보 |
| `team-shared-agent-memory-bootstrap` | team WIP가 main에 대부분 반영됨 | 삭제 후보이나 diff 확인 후 승인 필요 |
| `workspace-ai-team-pilot` | 큰 WIP 있음. 덕테이프 이미지 전략 등 포함 | 삭제 금지, 별도 정리 필요 |
| `homepage-*` | 홈페이지 WIP 있음 | 삭제 금지 |
| `workspace-product-inventory-ops` | 상품/오픈마켓 WIP 있음 | 삭제 금지 |
| `workspace-openclaw-setup-audit` | 감사 문서 WIP 있음 | 확인 후 병합/삭제 결정 |
| `mcp-servers-naver-ads-mvp` | 별도 프로젝트 | 유지 또는 별도 정리 |

---

## 다음 실행 순서

1. Claude Code에게 closeout prompt를 보내 Claude worktree 삭제 가능 여부를 확인한다.
2. `workspace-ai-team-pilot` WIP 중 덕테이프 이미지 전략을 별도 workspace 브랜치로 정리한다.
3. `worktree cleanup`은 삭제 후보 목록을 대표가 승인한 뒤 실행한다.
4. OMX 실제 런타임 call-site 삽입은 별도 audit 브랜치에서 시작한다.

