# OpenClaw + OMX 세팅 감사 메모 (2026-04-23)

## 0. 작업 컨텍스트

- 생성 worktree: `/Users/jangjiho/workspace/pressco21-worktrees/workspace-openclaw-setup-audit`
- 브랜치: `work/workspace/openclaw-setup-audit`
- 목적: PRESSCO21 환경에서 OpenClaw/OMX(oh-my-codex)가 왜 체감 활용도가 낮은지, 현재 세팅이 실제 권장 구조와 얼마나 어긋나 있는지 점검한다.

## 1. 한 줄 결론

**지금 문제는 “OpenClaw/OMX가 아예 없는 것”이 아니라, `권장 구조`, `실제 실행 경로`, `로컬 런처`, `실험 브랜치 상태`가 서로 분리되어 있어 체감상 제대로 안 쓰이는 상태라는 점이다.**

특히 핵심 문제는 아래 4가지다.

1. **OpenClaw 개발 실행 경로가 raw Codex CLI를 직접 호출**하고 있어, OMX의 팀 실행/오버레이/프롬프트 체계를 거의 못 쓰고 있다.
2. **legacy Telegram room router가 아직 켜져 있고 실제 409 polling 충돌 로그가 발생**하고 있다.
3. **PRESSCO21용 OMX 쉬운 실행기(`p21-omx`)가 특정 실험 worktree를 기본 경로로 하드코딩**하고 있다.
4. **OMX 고도화 파일들이 현재 main 기준이 아니라 별도 실험 worktree에만 존재**해, 새로 만든 깨끗한 worktree에서는 바로 활용되지 않는다.

---

## 2. 기준 문서상 권장 구조

OpenClaw 허브 문서 기준 현재 권장 구조는 명확하다.

### 2.1 권장 구조
출처: `openclaw-project-hub/03_openclaw_docs/flora-frontdoor-local-dev-worker-setup.ko.md`

- 메인 봇 `@pressco21_openclaw_bot` → **서버 `flora-frontdoor`**
- `flora-frontdoor` → 요청을 먼저 구조화
- 개발 요청 → **Oracle dispatcher → 로컬 `flora-local-dev-worker` 큐**
- 로컬 worker → 실제 Codex/Claude CLI 실행
- `run-flora-telegram-room-router.js` → **메인 경로가 아닌 legacy 보조 수단**

즉, 문서상 기준은:

- **메인 ingress 1개**
- **개발 실행은 queue 기반 분리**
- **room router는 전용 dev bot이 있을 때만 제한적으로 사용**

---

## 3. 실제 로컬 상태 점검 결과

## 3.1 LaunchAgent 상태
`launchctl list` 기준 확인된 항목:

- `com.pressco21.flora-local-dev-worker` → 실행 중
- `com.pressco21.flora-telegram-room-router` → 실행 중
- `com.pressco21.flora-mac-harness` → 등록됨
- `com.pressco21.openclaw-auth` / `com.pressco21.openclaw-memory` → 등록됨

### 해석
권장 문서상으로는 **room router는 legacy**인데, 실제 로컬에서는 **local dev worker와 room router가 동시에 살아 있다.**

---

## 3.2 room router 실제 에러 로그
`~/Library/Logs/flora-telegram-room-router.err.log` tail 확인 결과:

- `loop-error: fetch failed`
- `loop-error: Telegram API getUpdates failed with HTTP 409`

### 해석
Telegram long polling 충돌 또는 중복 소비 상황이 실제로 발생하고 있다.
즉, **문서상 legacy로 내려간 경로가 여전히 운영 경로에 남아 있어 안정성을 깎고 있다.**

---

## 3.3 OpenClaw local dev worker가 OMX를 실제로 쓰는가?
출처: `openclaw-project-hub/04_reference_json/flora-local-dev-worker.config.json`

현재 Codex worker 설정 핵심값:

- `binaryPath`: `/Applications/Codex.app/Contents/Resources/codex`
- `executionMode`: `full-auto`
- `profile`: `""` (비어 있음)
- `extraArgs`: `[]`

### 해석
현재 local dev worker는 **raw Codex CLI**를 직접 호출한다.
즉,

- `omx`
- `p21-omx`
- OMX overlay profile
- OMX 팀 실행기
- OMX prompt/hook/상태 관리 고도화

를 **개발방 경로에서 제대로 활용하지 못하고 있다.**

이건 체감상 “오픈클로를 깔아놨는데 잘 안 쓰는 느낌”의 가장 큰 원인으로 보인다.

---

## 3.4 OMX 자체 설치 상태
실행 결과:

- `omx version` → `oh-my-codex v0.13.1`
- `codex --version` → `codex-cli 0.122.0-alpha.1`
- `omx doctor --team` → `All team checks passed.`

### 해석
OMX 자체는 **설치가 망가진 상태는 아니다.**
기본 바이너리와 팀 런타임은 살아 있다.

다만 plain `omx doctor`에서는 아래 경고가 나왔다.

- `hooks.json not found` (overlay codex-home 기준)
- `AGENTS.md not found` (overlay codex-home 기준)
- legacy skill roots 중복 경고 (`~/.agents/skills` vs canonical skill root)

즉, **“설치 자체 실패”보다는 overlay/user-scope 정리 부족**에 가깝다.

---

## 3.5 PRESSCO21용 쉬운 실행기(`p21-omx`) 상태
전역 런처 `~/.local/bin/p21-omx` 확인 결과:

- 기본 repo root가 특정 worktree로 고정돼 있음
- 현재 값: `/Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot`

### 해석
이 구조의 문제는:

1. 특정 실험 worktree에 의존한다.
2. 그 worktree가 정리되거나 이름이 바뀌면 런처가 깨진다.
3. 새로 만든 깨끗한 worktree에서는 `_tools/omx-easy.sh`가 아직 없어서 fallback 동작에 의존한다.

즉, **전역 런처가 안정된 main 기준이 아니라 실험 브랜치 산출물에 묶여 있다.**

---

## 3.6 OMX 고도화 산출물의 위치 문제
현재 `workspace-ai-team-pilot` worktree에는 아래 파일들이 존재한다.

- `_tools/omx-easy.sh`
- `_tools/install-p21-omx.sh`
- `_tools/omx-founder-facing-*`
- `_tools/omx-handoff-callsite.sh`
- `.codex/prompts/omx-company-adapter.md`
- `.codex/prompts/omx-founder-facing-output.md`
- `docs/ai-development/omx-쉬운-실행-가이드.md`
- `docs/ai-development/claude-omx-연동-활용-가이드.md`
- `docs/ai-native-upgrade/*`

그리고 그 worktree 안에서는 `p21-omx doctor`가 **정상 통과**했다.

### 해석
PRESSCO21용 OMX 개선안은 이미 어느 정도 만들어졌지만,
**아직 main 기준 운영 레이어로 승격되지 않아 실제 일상 사용에 연결되지 못한 상태**다.

즉,

- “세팅이 아예 없다”가 아니라
- **“좋은 세팅이 실험 브랜치에만 있고, 운영 진입점으로 승격되지 않았다”**

에 가깝다.

---

## 3.7 OpenClaw 콘솔 실행기 상태
`~/.local/bin/pressco-openclaw` 확인 결과:

- `oh-my-codex` 저장소의 `scripts/pressco21-openclaw-console.js`를 직접 호출
- base config는 `~/.codex/.omx-config.json`을 참조

### 해석
OpenClaw 콘솔 자체는 남아 있지만,
이 경로 역시 **PRESSCO21 project-level OMX wrapper와 직접 연결된 구조는 아니다.**

즉,

- OpenClaw 콘솔
- OMX overlay
- PRESSCO21 전용 `p21-omx`
- Telegram local dev worker

가 **하나의 일관된 실행 체인으로 통합되지 않았다.**

---

## 4. 문제를 구조적으로 다시 정리하면

## 4.1 실행 경로 분리 문제
현재 체인:

- OpenClaw frontdoor/worker 문서
- local dev worker 실제 실행
- OMX overlay
- PRESSCO21 wrapper

가 서로 다르게 움직인다.

특히 개발방 요청은 **raw Codex CLI**로 들어가고 있으므로,
사용자는 “OpenClaw/OMX를 쓴다”고 생각해도 실제로는 **Codex 기본 실행**에 가까운 체험을 하게 된다.

## 4.2 운영 구조 drift
문서상 권장 구조는

- frontdoor
- dispatcher
- local dev worker
- legacy room router 축소

인데, 실제로는 legacy room router가 계속 살아 있어 충돌 로그가 발생한다.

## 4.3 전역 런처 drift
전역 런처가 특정 실험 worktree를 기본값으로 잡고 있어,
운영 기준선(main)과 설치물 간 정렬이 약하다.

## 4.4 overlay hygiene 부족
OMX overlay는 돌아가지만,

- hooks.json
- user-scope AGENTS
- legacy skill root 정리

가 완전히 마감되지 않아 체감 완성도가 떨어진다.

---

## 5. 실무 결론

## 결론 A. “설치가 안 돼서 못 쓴다”는 절반만 맞다
완전히 틀린 말은 아니지만 정확히는:

- OMX 자체는 설치돼 있고 동작한다.
- 다만 **PRESSCO21/OpenClaw 실사용 경로에 OMX가 핵심 실행기로 연결되지 않았다.**

즉, 문제의 본질은 **설치 부재**보다는 **통합 부재**다.

## 결론 B. 가장 큰 병목은 OpenClaw → Codex 경로가 OMX를 우회하는 점이다
local dev worker가 raw Codex를 바로 호출하니,
팀 실행/오버레이/공유 프롬프트/상태 관리 이점을 거의 못 살린다.

## 결론 C. legacy router를 아직 끄지 못해 실제 충돌이 난다
room router 로그의 HTTP 409는 단순 문서 mismatch가 아니라 **실제 운영 충돌 증거**다.

## 결론 D. 좋은 세팅은 이미 일부 만들어졌지만 운영 승격이 안 됐다
`workspace-ai-team-pilot`에 있는 OMX 개선물은 방향이 좋다.
문제는 이것이 **main 기준 실행기/문서/설치 경로로 마감되지 않았다**는 점이다.

---

## 6. 권장 액션 플랜

## Phase 0 — 즉시 정리 (낮은 리스크)
1. `omx setup --scope user --force`를 한 번 실행해 overlay의 `hooks.json`, `AGENTS.md`를 정리한다.
2. `~/.agents/skills`와 canonical skill root 중복을 정리할 계획을 세운다.
3. legacy room router를 계속 쓸지, 정말 끌지 결정한다.

## Phase 1 — PRESSCO21 런처 운영 승격
1. `workspace-ai-team-pilot`의 OMX 관련 스크립트/문서를 별도 검토 후 main 기준 workspace tooling으로 병합한다.
2. `p21-omx` 설치 스크립트는 **특정 실험 worktree 경로가 아니라 main worktree 또는 현재 repo 탐색 기반**으로 고정한다.
3. 새로 만든 worktree에서도 항상 `p21-omx doctor`가 동작하도록 `_tools/omx-easy.sh`를 운영 기준으로 포함시킨다.

## Phase 2 — OpenClaw 개발방을 OMX 경로로 전환
1. `flora-local-dev-worker`의 Codex runner를 raw `codex exec` 대신 **OMX wrapper 경유**로 바꾼다.
2. 최소 기준:
   - project AGENTS 읽기
   - overlay profile 사용
   - 필요 시 team mode 확장 가능
3. 이 단계가 끝나야 OpenClaw 개발방에서도 “OMX를 제대로 쓰는 느낌”이 난다.

## Phase 3 — frontdoor 구조 정리
1. 메인 ingress는 server `flora-frontdoor` 하나로 고정한다.
2. local room router는 truly legacy/dev bot 실험용으로만 남기거나 제거한다.
3. polling 충돌(HTTP 409)이 더 이상 발생하지 않도록 LaunchAgent 구성을 정리한다.

---

## 7. 추천 다음 작업

다음 작업은 아래 순서가 가장 효율적이다.

1. **이 감사 메모 기준으로 운영 판단 확정**
   - legacy router 유지/중지
   - OpenClaw 개발방을 OMX 경로로 전환할지 확정
2. **OMX wrapper 산출물(main 승격용) 정리 workstream 진행**
3. **local dev worker Codex runner를 OMX wrapper 기반으로 바꾸는 구현 작업**
4. **OpenClaw → frontdoor → dispatcher → local OMX worker 실전 smoke test**

---

## 8. 핵심 메시지 요약

> 지금은 OpenClaw/OMX를 “안 깔아서” 못 쓰는 게 아니다.  
> **깔려는 있는데, 실제 업무 경로가 OMX를 우회하고 있고, 실험 세팅이 운영 기준선으로 승격되지 않아서 체감 활용도가 낮은 상태**다.

따라서 우선순위는 새 기능 추가보다 아래가 맞다.

1. 경로 통합
2. legacy 정리
3. 런처 운영 승격
4. OpenClaw 개발방의 OMX 전환

