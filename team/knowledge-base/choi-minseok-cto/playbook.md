# CTO Playbook

## systemd user service에서 Docker 그룹 미인식

**증상**: systemd --user 서비스로 실행한 프로세스에 docker 그룹(988)이 없어 `docker ps` 등이 permission denied.
**원인**: user@.service가 로그인 세션보다 먼저 시작되어 supplementary groups를 못 가져옴.
**해결**: `systemctl --user daemon-reexec` 후 서비스 재시작. 이 명령이 user systemd 인스턴스를 재실행하여 현재 그룹 정보를 로드함.
**발견일**: 2026-04-23 (OpenClaw 배포)

## OpenClaw exec allowlist는 node 명령 매칭

**증상**: `gateway.nodes.denyCommands`에 `rm`, `mkfs` 등 쉘 명령을 넣었으나 "ineffective" 경고 발생.
**원인**: `denyCommands`는 OpenClaw node 명령 이름(예: `canvas.present`, `system.run`)을 매칭함. 쉘 명령 필터링이 아님.
**해결**: 쉘 명령 보안은 `tools.exec.security` (deny/allowlist/full)와 `tools.exec.ask` (off/on-miss/always)로 제어. allowlist는 `openclaw approvals allowlist add` CLI로 관리.
**발견일**: 2026-04-23 (OpenClaw 보안 하드닝)

## OpenClaw sandbox.mode=non-main은 Docker 필수

**증상**: 텔레그램 DM 시 "Failed to inspect sandbox image: permission denied" 에러로 모든 모델 호출 실패.
**원인**: `sandbox.mode: "non-main"`은 main이 아닌 에이전트(flora-frontdoor 등)를 Docker 컨테이너에서 격리 실행. Docker 소켓 접근 없으면 실행 자체가 불가.
**해결**: `sandbox.mode: "off"`로 변경. DM allowlist(2명) + exec allowlist + loopback 바인딩으로 보안 유지.
**발견일**: 2026-04-23 (텔레그램 실 테스트)

## flora-frontdoor BOOTSTRAP.md 과도하면 내부 정보 유출

**증상**: 텔레그램 응답에 git 커밋, tmux 세션, 맥북 파일 경로 등 내부 시스템 정보 노출. 질문에 답하지 않고 "인벤토리 컨텍스트" 관련 정형 응답만 반복.
**원인**: BOOTSTRAP.md에 62줄짜리 메타프롬프트가 맥북 인벤토리 기반 전문 모드 라우팅을 강제. 서버에서 실행 시 맥북 접근 불가 + 모드 선택 로직이 실제 질문을 가림.
**해결**: BOOTSTRAP.md를 10줄 이내로 간소화 — 내부 정보 노출 금지, 질문에 바로 답변, 필요 시 exec로 직접 조회.
**발견일**: 2026-04-23 (텔레그램 실 테스트)

## OpenClaw gateway.bind 유효값

**증상**: `gateway.bind: "all"`로 설정했으나 여전히 loopback에만 바인딩됨. 에러 메시지 없이 무시됨.
**원인**: 유효값은 `"loopback"`, `"lan"`, `"tailnet"`, `"auto"`, `"custom"` 5가지뿐. 기타 값은 기본값(loopback)으로 fallback.
**해결**: `"lan"` 사용 (0.0.0.0 바인딩). `"custom"`은 `gateway.customBindHost`로 특정 IP 지정.
**추가**: `tailscale.mode: "serve"` 상태에서는 bind가 loopback 아니면 config validation error 발생. serve 사용 안 하면 `tailscale.mode: "off"`로 변경 필수.
**발견일**: 2026-04-24 (맥북 노드 구현)

## OpenClaw 노드 디바이스 페어링 — paired.json 직접 편집

**증상**: `openclaw nodes approve <requestId>` CLI가 매번 "unknown requestId"로 실패.
**원인**: pending 요청 수명이 매우 짧음. CLI가 WebSocket 연결 + 인증을 완료하기 전에 요청이 만료됨.
**해결**:
1. `/tmp/capture-pending.sh`로 pending.json 데이터 캡처 (deviceId, publicKey 등)
2. Node.js 스크립트로 `~/.openclaw/devices/paired.json`에 직접 등록
3. 토큰 생성: `crypto.randomBytes(32).toString("base64url")`
4. 게이트웨이 재시작 → 노드 자동 재연결 확인
**주의**: 수동 등록 시 scopes는 `["node.exec", "node.fs", "node.browser", "node.screen", "node.camera", "node.notify", "node.location"]` 포함.
**발견일**: 2026-04-24 (맥북 노드 페어링)

## OpenClaw 2026.4 디바이스 role은 토큰이 있어야 유효

**증상**: 원격 게이트웨이에 디바이스가 `roles: ["operator", ...]`와 operator scopes로 등록되어 있는데도 클라이언트 연결이 `device is asking for a higher role than currently approved`로 차단됨.
**원인**: OpenClaw 2026.4의 WS 핸드셰이크는 `roles` 필드만 보지 않고, `tokens` 객체 안의 revoke되지 않은 토큰 role을 `roles` 승인 baseline과 교차시켜 `effective roles`를 계산한다. 수동 편집으로 `roles/scopes/approvedScopes`만 넣고 `tokens.operator`를 만들지 않으면 `effectiveRoles=[]`가 되어 `role-upgrade` 경로로 진입한다.
**근거**:
- 서버 코드: `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/device-pairing-C16oqLkv.js`의 `listEffectivePairedDeviceRoles()`는 활성 토큰 role이 없으면 빈 배열을 반환.
- 서버 코드: `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/server.impl-DLF59fRo.js`의 핸드셰이크는 `allowedRoles.size === 0` 또는 요청 role 누락 시 `requirePairing("role-upgrade")`.
- 에러 문구: `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/connect-error-details-Bgc1VkH2.js`의 `role-upgrade` requirement.
**해결 우선순위**:
1. 가능한 경우 pending request를 다시 만든 뒤 `openclaw devices approve <requestId>`로 승인한다. 승인 경로는 토큰을 생성하고 CLI 응답은 토큰을 요약/마스킹한다.
2. pending이 없고 이미 승인된 deviceId/role만 수리해야 하면, 서버에서 백업 후 `openclaw devices rotate --device <deviceId> --role operator --scope ...`로 `tokens.operator`를 생성한다. `rotate --json` 응답에는 토큰이 포함되므로 stdout을 로그/채팅에 출력하지 말고 `/dev/null` 또는 권한 600 임시파일로 처리한다.
3. 수동 JSON 편집으로 토큰을 직접 넣는 방식은 최후 수단. CLI 승인/회전 경로가 `approvedScopes`와 토큰 scope 검사를 함께 맞춘다.
**주의**: `agent` role은 OpenClaw WS protocol의 표준 role이 아니며, clawdbot CLI의 실제 요청 role은 `operator`다. operator 토큰/스코프가 먼저 정상화되어야 한다.
**발견일**: 2026-04-24 (CODEX-001 clawdbot role/schema mismatch)


## OpenClaw node exec는 Mac 쪽 allowlist와 workdir 사용이 핵심

**증상**: Flora agent가 `exec host=node node=jiho-macbook`를 사용해도 `SYSTEM_RUN_DENIED: approval required`로 실패하거나, `cd /Users/... && git ...` 형태의 명령이 승인 대기로 떨어짐.
**원인**: `system.run`은 gateway 설정뿐 아니라 node host(MacBook)의 `~/.openclaw/exec-approvals.json`을 런타임에서 평가한다. Mac node host의 기본 실행 정책은 미승인 shell 명령을 막는다. 또한 `cd ... && ...`처럼 shell built-in과 다중 명령을 묶으면 allowlist 분석이 실패하기 쉽다.
**해결**:
1. MacBook에서 `~/.openclaw/exec-approvals.json`을 백업한다.
2. 필요한 agent(`flora-frontdoor`)에 최소 read-only 패턴만 추가한다. 예: `/usr/bin/which *`, `/usr/bin/git *`, `git status*`, `git log*`, `git branch*`, `/bin/pwd`.
3. Flora skill/BOOTSTRAP에는 `exec` 도구 사용 시 `host="node"`, `node="jiho-macbook"`, `workdir="/Users/jangjiho/workspace/pressco21"`를 명시한다.
4. `cd ... && ...`로 묶지 말고 단일 read-only 명령을 순차 실행한다.
**검증**: 자연어 `pressco21 프로젝트 git status만 확인해줘`가 MacBook node exec를 통해 git status를 반환하면 기본 라우팅은 정상.
**발견일**: 2026-04-24 (CODEX-002 OpenClaw exec routing)

## OpenClaw 노드 LaunchAgent npm ENOENT

**증상**: 노드 서비스 시작 시 `spawnSync npm ENOENT`로 모든 플러그인 로딩 실패.
**원인**: LaunchAgent의 PATH에 npm 바이너리가 없음. Codex.app 번들 node는 npm을 포함하지 않음.
**해결**: plist의 PATH에 nvm bin 경로 추가: `/Users/jangjiho/.nvm/versions/node/v22.21.1/bin`을 PATH 앞에 삽입.
**발견일**: 2026-04-24 (맥북 노드 설치)

## OpenClaw 스킬 프론트매터 규칙

**증상**: 커스텀 스킬이 `openclaw skills check`에서 "Ready"이지만 에이전트 프롬프트에 로드되지 않음.
**원인**: SKILL.md 프론트매터에 `triggers:`, `exec:` 같은 비표준 필드를 사용하면 스킬 로더가 무시함. 동작하는 스킬(cs-triage 등)은 `name`과 `description`만 사용.
**해결**: `triggers`와 `exec` 정보를 `description` 필드에 텍스트로 통합. "사용 시점: ...", "exec host=node" 형태로 기술.
**발견일**: 2026-04-24 (Phase 4.5 스킬 로딩 디버깅)

## OpenClaw flora-frontdoor skills allowlist 필수

**증상**: Phase 4 스킬 4개가 에이전트 시스템 프롬프트에 누락됨 (16/20만 로드).
**원인**: `agents.list[].skills` 미설정 시 기본 스킬 해상도가 번들 스킬을 우선 로드하고, `gateway/skills-remote` bin probe 타임아웃으로 워크스페이스 커스텀 스킬이 비적격 처리됨.
**해결**: `openclaw.json`의 flora-frontdoor 에이전트에 `"skills": [20개 스킬 이름]` 명시적 allowlist 추가. 스킬 추가/삭제 시 이 목록도 갱신 필요.
**발견일**: 2026-04-24 (Phase 4.5 E2E 테스트)

## Telegram getUpdates 409는 같은 bot long-poller 중복

**증상**: Flora gateway와 로컬 라우터 로그에 `getUpdates` 409 conflict가 반복됨.
**원인**: Telegram Bot API long polling은 같은 bot token에 대해 poller 1개만 허용한다. Mac `com.pressco21.flora-telegram-room-router`와 Flora `openclaw-gateway.service`가 같은 primary bot token으로 동시에 `getUpdates`를 호출하면 양쪽 모두 409가 난다.
**구분**: `flora-local-dev-worker`는 Telegram token을 사용하지만 `getUpdates` 호출이 없으면 conflict 원인이 아니다.
**진단**:
1. 로컬 `launchctl list | grep -Ei 'flora|telegram|openclaw'`와 Flora `systemctl --user status openclaw-gateway.service`로 poller 후보를 확인한다.
2. 로컬 room-router script에 `getUpdates` 호출이 있는지 확인한다.
3. token 값은 출력하지 말고 SHA-256 앞 12자리 fingerprint만 비교한다.
4. 로컬 router log와 Flora journal의 409 cadence가 비슷하면 중복 poller 가능성이 높다.
**해결**:
1. 운영 primary bot의 단일 poller를 Flora gateway로 정한다.
2. legacy Mac room-router는 `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.pressco21.flora-telegram-room-router.plist`로 내리거나, 별도 dev bot token으로 분리한다.
3. 조치 후 2~3 polling cycle 동안 양쪽 로그에서 409가 사라지는지 확인한다.
**주의**: 토큰 공유 상태에서 poll interval만 늘려도 근본 해결이 아니다.
**발견일**: 2026-04-24 (OpenClaw Telegram 409 조사)

## OpenAI Codex OAuth refresh_token_reused는 stale profile 정리 필요

**증상**: Flora gateway가 `openai-codex/gpt-5.4`를 primary로 시도하다가 `OAuth token refresh failed`, `refresh_token_reused` 후 Gemini fallback으로 떨어짐.
**원인**: OpenAI Codex OAuth refresh token은 재사용되면 invalid 처리된다. 여러 OpenClaw agent auth profile이 같은 오래된 `openai-codex:codex-cli` refresh token을 공유하거나, `lastGood`/auth order가 fresh profile 대신 stale profile을 가리키면 반복 실패한다.
**진단**:
1. `journalctl --user -u openclaw-gateway.service`에서 `refresh_token_reused`, `Deprecated profile`, `model-fallback/decision`을 확인한다.
2. `~/.openclaw/agents/*/agent/auth-profiles.json`에서 token 값은 출력하지 말고 profile id, 만료시각, refresh fingerprint만 비교한다.
3. `~/.openclaw/agents/*/agent/auth-state.json`의 `lastGood.openai-codex`와 `openclaw models auth order get --agent <id> --provider openai-codex`를 확인한다.
**해결**:
1. `auth-profiles.json`, `auth-state.json`, `openclaw.json`을 백업한다.
2. TTY 가능한 세션에서 `openclaw models auth login --provider openai-codex`로 fresh profile을 만든다.
3. 필요한 agent에 `openclaw models auth order set --agent <agent-id> --provider openai-codex <fresh-profile-id>`로 fresh profile을 우선 지정한다.
4. stale `openai-codex:codex-cli`가 더 이상 선택되지 않는지 확인하고, GPT-5.4 요청이 fallback 없이 성공하는지 검증한다.
**주의**: 로컬 Mac `~/.codex/auth.json`이 정상이어도 Flora gateway의 OpenClaw auth store는 별도이므로 서버 쪽 profile 상태를 직접 고쳐야 한다.
**발견일**: 2026-04-24 (OpenClaw Codex OAuth 조사)

## 메이크샵 CodeMirror setValue 프리즈

**증상**: Chrome MCP로 메이크샵 D4 편집기에서 `cm.setValue(전체내용)`을 호출하면 87K+ 문서에서 페이지가 프리즈됨. 브라우저 확장프로그램 연결도 끊김.
**원인**: CodeMirror가 대용량 문서 전체를 재파싱+재렌더링하면서 메인 스레드 블로킹.
**해결**: `cm.replaceRange(새텍스트, from, to)`로 부분 수정만 사용. 전체 교체가 필요하면 줄 단위로 분할하여 순차 교체하거나, 편집기 리로드 후 서버 측에서 교체.
**추가**: CodeMirror 인스턴스는 탭 전환 시 동적 생성됨 — HTML[0], CSS[1], JS[2] 순서로 탭을 열어야 인덱스 보장.
**발견일**: 2026-04-24 (메이크샵 크롬 자동화 검증)

## 사방넷 재고 모듈 미사용

**증상**: 사방넷 재고관리 페이지에서 "자료수 0건", 상품관리에 1개만 등록.
**원인**: PRESSCO21은 사방넷을 주문 수집/배송 관리 용도로만 사용. 재고관리 모듈 미설정.
**해결**: 사방넷 자동화는 대시보드 주문 현황 조회(`tools/sabangnet-dashboard.js`)에 집중. 재고 자동화 기대치 조정.
**추가**: 로그인 URL은 `www.sabangnet.co.kr/login/login-main` → 어드민은 `sbadmin03.sabangnet.co.kr/#/dashboard`로 리다이렉트.
**발견일**: 2026-04-24 (사방넷 브라우저 자동화 검증)
