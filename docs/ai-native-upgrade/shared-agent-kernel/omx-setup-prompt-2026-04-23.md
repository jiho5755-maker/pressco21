# OMX AI OS Setup Prompt (2026-04-23)

> 이 프롬프트를 Codex CLI 세션에 붙여넣으면 OMX 측 AI OS 세팅을 시작합니다.
> 브랜치: `work/workspace/codex-shared-agent-ecosystem` (새로 생성 필요)

---

## 배경

PRESSCO21은 8명 직원의 꽃 공예 회사다. 35명 AI 에이전트가 부족 인력을 채우고 있으며, Claude Code와 Codex/OMX 두 런타임에서 같은 에이전트 조직을 공유한다.

Claude Code 측은 세팅이 완료됐다:
- 7 hooks (session-start, session-handoff, levelup-auto, agent-logger, bash-guard, makeshop-edit-guard, notify-telegram)
- 9 C-Suite agents + 26 실무 agents (canonical naming, wording rules)
- /save 스킬 (handoff 기록 + memory 승격 + founder-facing 요약)
- cross-runtime handoff contract v1 확정

**Codex/OMX 측은 아직 shared-kernel을 인지하지 못하고 있다. 이 세팅을 완료해야 한다.**

---

## 참조 문서 (반드시 먼저 읽기)

모두 `docs/ai-native-upgrade/shared-agent-kernel/` 아래에 있다:

| 문서 | 용도 |
|------|------|
| `README.md` | 전체 구조 개요 |
| `agents.v1.yaml` | canonical 9명 roster (agent_id, display_name, title) |
| `handoff-contract-v1.md` | cross-runtime handoff 표준 스키마 |
| `runtime-divergence-matrix-v1.md` | shared vs Claude-only vs OMX-only 구분 |
| `omx-output-formatter-spec-v1.md` | OMX founder-facing 출력 규격 (4종 context_type) |
| `omx-founder-facing-output-examples-v1.md` | 출력 예시 |
| `omx-founder-facing-smoke-tests-v1.md` | 5개 smoke test |
| `omx-live-wrapper-completion-checklist-v1.md` | 완료 체크리스트 (9/14 done) |
| `omx-runtime-insertion-tasklist-v1.md` | 4개 call-site 연결 순서 |
| `omx-live-insertion-pseudocode-v1.md` | 삽입 의사코드 |

---

## 해야 할 작업 (4개)

### Task 1: AGENTS.md에 Shared Agent Kernel 섹션 추가

현재 AGENTS.md는 모드 A/B, 프로젝트 구조, 코딩 규칙만 있다. 아래 섹션을 추가해야 한다:

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

필수 필드: handoff_id, runtime, owner_agent_id, summary, decision, changed_artifacts, verification, open_risks, next_step, learn_to_save

상세: `docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md`

### 성장 기록

각 에이전트의 학습 이력은 `team/knowledge-base/{이름}/growth-log.md`에 기록한다.
세션에서 발견한 유용한 패턴은 `learn_to_save`로 handoff에 남기고, 반복 가능한 것은 `playbook.md`로 승격한다.
```

### Task 2: OMX Founder-Facing 출력 도구 작성

`_tools/omx-founder-facing-render.sh`를 실제로 작성한다.

입력: JSON (context_type, owner_agent_id, summary, findings, risks, next_steps)
출력: founder-facing markdown

`agents.v1.yaml`에서 display_name을 lookup하고, `omx-output-formatter-spec-v1.md`의 4종 출력 규격(team_meeting, verification, handoff, execution_report)을 따른다.

### Task 3: Handoff Reader 스크립트 작성

`_tools/omx-handoff-reader.sh`를 작성한다.

기능:
1. `team/handoffs/latest.md` 읽기
2. YAML frontmatter 파싱 (summary, next_step, open_risks, owner_agent_id, runtime)
3. owner_agent_id를 display_name으로 변환
4. compact 한 줄 출력:
   ```
   [3시간 전] 최민석님(CTO): 디자인 파이프라인 기획 완료 → 이어서: 디자이너 FigJam 기입
   ```

이 스크립트는 Codex 세션 시작 시 이전 Claude 세션의 작업을 파악하는 데 사용된다.

### Task 4: Smoke Test 실행

5개 smoke test를 실행하고 결과를 기록한다 (`omx-founder-facing-smoke-tests-v1.md` 참조):

1. team_meeting 출력에 canonical name이 title/첫 3줄에 있는가
2. verification 출력에 결론/확인/리스크/다음 섹션이 있는가
3. handoff 출력에 display_name이 사용되는가
4. Core 6 naming이 canonical roster와 일치하는가
5. continuity — next action이 가시적인가

---

## 성공 기준

- [ ] AGENTS.md에 "AI 에이전트 조직" 섹션이 추가됨
- [ ] `_tools/omx-founder-facing-render.sh`가 4종 context_type을 처리함
- [ ] `_tools/omx-handoff-reader.sh`가 Claude의 latest.md를 파싱하여 compact 출력함
- [ ] smoke test 5/5 pass
- [ ] handoff에 `runtime: codex-omx`로 기록됨

---

## 주의사항

- `docs/ai-native-upgrade/shared-agent-kernel/` 문서를 수정하지 않는다 (읽기 전용 참조)
- `team/handoffs/latest.md`는 Claude가 마지막으로 기록한 것이다. OMX가 새 세션을 끝낼 때 덮어쓴다
- `agents.v1.yaml`의 agent_id와 display_name 매핑을 하드코딩하지 말고 YAML에서 읽는다
- 기존 `_tools/omx-run.sh`, `omx-common.sh` 패턴을 따른다
