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

## OpenClaw 노드 LaunchAgent npm ENOENT

**증상**: 노드 서비스 시작 시 `spawnSync npm ENOENT`로 모든 플러그인 로딩 실패.
**원인**: LaunchAgent의 PATH에 npm 바이너리가 없음. Codex.app 번들 node는 npm을 포함하지 않음.
**해결**: plist의 PATH에 nvm bin 경로 추가: `/Users/jangjiho/.nvm/versions/node/v22.21.1/bin`을 PATH 앞에 삽입.
**발견일**: 2026-04-24 (맥북 노드 설치)
