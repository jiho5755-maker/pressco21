---
handoff_id: HOFF-2026-04-24-claude-ecosystem-repair
created_at: 2026-04-24T11:40:00+09:00
runtime: claude
owner_agent_id: choi-minseok-cto
contributors: [han-jihoon-cso, park-seoyeon-cfo, kim-dohyun-coo]
scope_type: worktree
project: workspace
worktree_slot: workspace-openclaw-setup-audit
repo_root: /Users/jangjiho/workspace/pressco21
branch: work/workspace/openclaw-setup-audit
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-openclaw-setup-audit
source_cwd: /Users/jangjiho/workspace/pressco21-worktrees/workspace-openclaw-setup-audit
commit_sha: pending
status: active
promoted_to_global: false
summary: >
  팀미팅(CSO/CTO/CFO/COO 4명)으로 AI 도구 생태계 설계 확정.
  토큰 풀 A(Anthropic)/B(GPT) 분리 + 이중 지출 금지 정책 확정.
  clawdbot 크래시 수리 완료(clipboard stub 패치), 게이트웨이 원격 설정 완료.
  디바이스 페어링 role 불일치 블로커 발견 → Codex 위임.
decision: >
  선택지 A "수리 + 제한 운영" 채택. clawdbot 페어링 + exec 라우팅은
  Codex(풀 B)에서 처리. 수리 후 2주 ROI 실측으로 전체 복원 vs 간소화 판단.
changed_artifacts:
  - clawdbot clipboard stub 패치 (macOS Sequoia 코드서명 우회)
  - clawdbot.json gateway.mode=remote, remote.url/token 설정
  - Flora paired.json에 clawdbot-macbook 디바이스 추가
  - MEMORY ai-token-efficiency.md 신규 (토큰 풀 분리 정책)
  - MEMORY openclaw-integration.md 도구 관계 테이블 갱신
  - 팀 미팅 회의록 작성
verification:
  - clawdbot --version: 2026.1.24-3 정상 출력 (크래시 해소)
  - curl WebSocket 핸드셰이크: Flora 게이트웨이 101 Switching Protocols 성공
  - Tailscale: openclaw(100.114.150.34) active, direct 연결 확인
open_risks:
  - clawdbot 페어링 role 불일치 — "device is asking for a higher role" 에러
  - clawdbot(2026.1) vs OpenClaw(2026.4) 버전 차이가 근본 원인일 수 있음
  - exec 라우팅 미착수
  - clawdbot clipboard stub는 npm update 시 덮어씌워짐 — 업데이트 후 재패치 필요
next_step: >
  Codex에서 (1) clawdbot 페어링 role 디버깅 (2) exec 라우팅 수리 (3) E2E 검증.
  HTTP 직접 호출로 clawdbot 우회하는 대안도 검토 가능.
codex_delegation:
  priority: high
  tasks:
    - id: CODEX-001
      title: clawdbot 페어링 role 디버깅
      context: >
        clawdbot.json에 gateway.mode=remote, remote.url=ws://100.114.150.34:18789,
        auth.token 설정 완료. WebSocket 연결 성공하나 "device is asking for a higher role"
        에러 발생. paired.json에 operator+agent scopes 추가했으나 해결 안됨.
        clawdbot(2026.1.24-3) vs OpenClaw(v2026.4.21) 버전 불일치가 원인 가능.
        대안: OMX 게이트웨이를 HTTP 직접 호출로 변경 (clawdbot 우회).
      files:
        - /Users/jangjiho/.clawdbot/clawdbot.json
        - /Users/jangjiho/.clawdbot/identity/device.json
        - Flora:/home/ubuntu/.openclaw/devices/paired.json
        - /Users/jangjiho/.codex/.omx-config.json
    - id: CODEX-002
      title: OpenClaw exec 라우팅 수리
      context: >
        Flora 서버의 openclaw.json tools.exec.security=full이나
        노드 라우팅 설정이 없음. 맥북 노드(jiho-macbook)는 paired.json에
        node role + exec/fs/browser scopes로 등록됨.
        openclaw exec --node jiho-macbook 명령으로 진단 시작.
      files:
        - Flora:/home/ubuntu/.openclaw/openclaw.json
        - Flora:/home/ubuntu/.openclaw/devices/paired.json
    - id: CODEX-003
      title: E2E 검증 (수리 후)
      context: >
        텔레그램 → Flora → clawdbot → OMX 알림 + exec → 맥북 스크립트 실행 전체 흐름.
learn_to_save:
  - "clawdbot clipboard macOS Sequoia stub 패치" → CTO playbook
  - "clawdbot gateway remote 설정 형식" → CTO playbook
  - "토큰 풀 A/B 분리 + 이중 지출 금지" → 전사 정책
---

## 담당
최민석님 (CTO) + 팀미팅 결과

## Codex 위임 메모
이 핸드오프의 codex_delegation 섹션에 3개 태스크(CODEX-001~003)가 있습니다.
Codex CLI에서 이 파일을 읽고 순서대로 진행하세요.
CODEX-001이 블로커이므로 이것부터 착수. 해결 안되면 HTTP 직접 호출 대안을 구현하세요.

## CODEX-001 진단 업데이트 (2026-04-24 12:20 KST)

**상태**: 원인 특정 완료, 서버 설정 쓰기는 하지 않음(leader 승인 필요).

**결론**: `device is asking for a higher role`의 직접 원인은 clawdbot 2026.1 자체 버전 차이보다 Flora의 수동 `paired.json` 엔트리가 OpenClaw 2026.4 스키마에서 불완전한 것이다. 해당 디바이스는 `roles/scopes/approvedScopes`가 있지만 `tokens.operator`가 없어 OpenClaw가 effective role을 빈 배열로 계산한다.

**증거(비밀값 미출력)**:
- Local: `clawdbot --version` → `2026.1.24-3`.
- Flora: `openclaw --version`(PATH 보정) → `OpenClaw 2026.4.21 (f788c88)`.
- Local deviceId prefix `efd4d91929d8`; local normalized public key hash와 Flora paired 엔트리 public key hash가 동일(`1c8ec84e586ff9a6`)이므로 public-key mismatch가 아님.
- Flora `/home/ubuntu/.openclaw/devices/paired.json`의 local clawdbot 엔트리: `roles=["operator","agent"]`, operator/agent scopes 존재, `tokens`는 없음. 현재 같은 deviceId의 pending request는 없음(만료/정리된 상태).
- OpenClaw source:
  - `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/device-pairing-C16oqLkv.js:59-78` — active token roles와 approved roles의 교집합만 effective role로 사용, 토큰 없으면 `[]`.
  - `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/server.impl-DLF59fRo.js:22539-22548` — `allowedRoles.size === 0` 또는 요청 role 누락이면 `requirePairing("role-upgrade")`.
  - `/home/ubuntu/.npm-global/lib/node_modules/openclaw/dist/connect-error-details-Bgc1VkH2.js:57-59,153-154` — `role-upgrade`가 "device is asking for a higher role..." 메시지로 포맷됨.

**최소 수정안(leader가 서버 백업 후 실행)**:
1. 우선 백업:
   ```bash
   ssh openclaw 'cp ~/.openclaw/devices/paired.json ~/.openclaw/devices/paired.json.bak-$(date -u +%Y%m%dT%H%M%SZ)-codex001'
   ```
2. 선호 경로: MacBook에서 한 번 더 연결을 시도해 pending request를 재생성한 뒤 Flora에서 확인/승인.
   ```bash
   # MacBook: 원래 실패하던 clawdbot gateway 작업 또는 read-only devices/status 호출 1회 실행
   # Flora:
   ssh openclaw 'export PATH=/home/ubuntu/.npm-global/bin:$PATH; openclaw devices list'
   ssh openclaw 'export PATH=/home/ubuntu/.npm-global/bin:$PATH; openclaw devices approve <requestId>'
   ```
   `approve` 경로는 토큰을 생성하지만 CLI 응답은 토큰 값을 직접 출력하지 않는 redacted paired-device summary를 반환한다.
3. pending을 만들기 어렵거나 즉시 수리해야 하는 경우:
   ```bash
   ssh openclaw 'export PATH=/home/ubuntu/.npm-global/bin:$PATH; openclaw devices rotate \
     --device efd4d91929d807bf60dbd54e1cb2b5a1b6d47e3723dab852f8473f1611cd18bd \
     --role operator \
     --scope operator.admin --scope operator.approvals --scope operator.pairing \
     --scope operator.read --scope operator.write \
     --json >/dev/null'
   ```
   `rotate --json` 응답은 토큰을 포함하므로 stdout을 채팅/로그에 출력하지 말 것. 서버에 `tokens.operator`가 생기면 다음 local handshake가 통과하면서 local `~/.clawdbot/identity/device-auth.json`에 operator device token이 저장될 것으로 예상.

**우회 판단**: HTTP/OpenClaw direct bypass는 아직 비추천. 원인이 단일 schema/token drift로 좁혀졌고, `approve` 또는 `rotate`가 더 작고 되돌리기 쉬운 수정이다. 위 경로가 실패하면 그때 bypass로 전환.
