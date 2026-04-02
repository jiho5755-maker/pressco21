# Flora Frontdoor + Local Dev Worker 운영 기준

## 현재 권장 구조

예전 플로라의 강점은 `대표가 두서없이 말해도 먼저 정리해 주는 frontdoor 비서`였다.

그 감각을 유지하려면 텔레그램 진입점은 다시 하나로 모아야 한다.

권장 구조:

1. `@pressco21_openclaw_bot` 메인 수신은 서버 `flora-frontdoor`
2. `flora-frontdoor`는 먼저 요청을 구조화하고 specialist 모드를 고른다
3. Codex/Claude 개발 요청은 Oracle 쪽 dispatcher agent가 로컬 맥북 worker 큐에 넣는다
4. 로컬 맥북의 `flora-local-dev-worker`가 실제 Codex/Claude CLI를 실행하고 결과를 텔레그램으로 돌려준다

즉:

- 메인 비서 = 서버 frontdoor
- 로컬 개발 실행 = local dev worker
- `run-flora-telegram-room-router.js` = 메인 경로가 아닌 legacy 보조 수단

## 왜 이 구조가 맞는가

- 메인 플로라 문맥이 한 세션으로 유지된다
- `두서없는 메모 -> 요약/구조화 -> 다음 액션` 흐름을 frontdoor가 맡을 수 있다
- 로컬 개발 실행은 worker 큐로 분리돼서 Telegram polling 충돌이 없다
- Codex/Claude 개발 방도 서버 OpenClaw route로 관리할 수 있다

## 필수 원칙

### 1. 메인 봇은 하나의 ingress만 가진다

- `@pressco21_openclaw_bot`는 서버 `flora-frontdoor`가 받는다
- 로컬 room router가 같은 봇 토큰을 동시에 polling 하면 안 된다

### 2. 개발 실행은 queue 기반으로 분리한다

- Oracle dispatcher -> `/home/ubuntu/.openclaw/dev-worker-queue`
- 맥북 `flora-local-dev-worker` -> queue polling -> 로컬 CLI 실행

### 3. room router는 전용 개발 봇이 있을 때만 쓴다

- 메인 플로라 복구 목적에는 사용하지 않는다
- 꼭 필요하면 `pressco21_openclaw_bot`가 아닌 별도 dev bot을 쓴다

## 설치 순서

### A. 서버 frontdoor

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
bash 06_scripts/install-flora-frontdoor-agent.sh
```

### B. 서버 dev dispatcher

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
bash 06_scripts/install-flora-dev-dispatchers.sh
```

### C. 로컬 dev worker

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
bash 06_scripts/install-flora-local-dev-worker-launchagent.sh
```

healthcheck:

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
node 06_scripts/run-flora-local-dev-worker.js \
  --config 04_reference_json/flora-local-dev-worker.config.json \
  --healthcheck
```

## room router 정리

메인 플로라 복구를 원하면 아래를 기본값으로 본다.

- `com.pressco21.flora-telegram-room-router` launch agent 비활성화
- `run-flora-telegram-room-router.js`는 메인 봇에서 사용하지 않음
- 필요 시 전용 dev bot으로만 별도 실험

## 운영 체크리스트

- 메인 봇 Telegram binding이 `flora-frontdoor`로 묶여 있는가
- Oracle dev dispatcher가 Codex/Claude 개발 방 route를 갖고 있는가
- 로컬 `flora-local-dev-worker`가 queue/ssh/telegram healthcheck를 통과하는가
- 메인 봇을 polling 하는 로컬 프로세스가 추가로 떠 있지 않은가
