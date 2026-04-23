# Cross-Runtime Handoff Contract v1

## 목적
Claude Code와 Codex/OMX가 같은 회사 에이전트를 공유하는 환경에서, 대화 transcript 없이도 작업을 깔끔하게 넘길 수 있는 compact handoff 표준을 정의한다.

## 원칙
- handoff는 **작업을 재개하기 위한 압축 계약서**다.
- 긴 채팅 로그보다 **status / risk / evidence / next step**가 중요하다.
- founder-facing summary와 implementation-facing detail을 함께 담되 짧아야 한다.

---

## 최소 필드

```yaml
handoff_id:
created_at:
runtime:            # claude | codex-omx
owner_agent_id:
contributors:
branch:
worktree_path:
summary:
decision:
changed_artifacts:
verification:
open_risks:
next_step:
learn_to_save:
```

---

## 필드 정의

### `owner_agent_id`
현재 작업의 대표 얼굴로 보이는 회사 agent id.
예: `yoo-junho-paircoder`, `choi-minseok-cto`

### `contributors`
내부적으로 관여한 다른 회사 agent id 목록.
예: `['park-seoyeon-cfo', 'yoon-haneul-pm']`

### `runtime`
실제 작업이 주로 수행된 작업실.
- `claude`
- `codex-omx`

### `summary`
창업자가 읽어도 바로 이해 가능한 1~3문장 요약.

### `decision`
이번 작업에서 확정한 기준이나 경계.

### `changed_artifacts`
파일/문서/설정/운영 상태 등 실제 바뀐 것.

### `verification`
무엇으로 확인했는지.
예:
- 문서 정합성 확인
- 공식 문서 대조
- 스크립트 실행
- 리뷰 완료

### `open_risks`
다음 세션이 반드시 의식해야 할 미해결 위험.

### `next_step`
다음 세션의 첫 행동을 한 문장으로.

### `learn_to_save`
성장 로그 / playbook / founder preference로 승격할 후보.

---

## founder-facing 출력 형식

### Summary
- 이번에 무엇을 했는가

### Why it matters
- 왜 중요한가

### Verified
- 무엇으로 확인했는가

### Risk
- 남은 위험

### Next
- 다음에 무엇을 하면 되는가

---

## cross-runtime 규칙
1. handoff의 주체는 always company agent id 기준이다.
2. runtime internal role 이름은 handoff 핵심 필드에 직접 노출하지 않는다.
3. 같은 작업을 다른 runtime으로 넘길 때도 branch/worktree/scope를 명시한다.
4. learn_to_save는 0~3개만 남긴다.
5. handoff는 raw log dump가 아니라 compressed action brief여야 한다.
