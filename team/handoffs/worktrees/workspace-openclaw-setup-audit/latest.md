---
handoff_id: HOFF-2026-04-24-claude-phase4
created_at: 2026-04-24T00:05:00+09:00
runtime: claude
owner_agent_id: choi-minseok-cto
contributors: [security-advisor, server-ops]
scope_type: worktree
project: workspace
worktree_slot: workspace-openclaw-setup-audit
repo_root: /Users/jangjiho/workspace/pressco21
branch: work/workspace/openclaw-setup-audit
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-openclaw-setup-audit
source_cwd: /Users/jangjiho/workspace/pressco21-worktrees/workspace-openclaw-setup-audit
commit_sha: 560f3c2
status: active
promoted_to_global: false
summary: >
  최민석님이 OpenClaw 맥북 노드(Phase 4)를 구현했습니다.
  Flora 서버(두뇌)와 맥북(손발) 간 Tailscale VPN으로 분산 아키텍처를 완성하여,
  텔레그램에서 맥북 파일 접근, 브라우저 자동화, Claude Code/Codex CLI 호출이 가능해졌습니다.
decision: >
  게이트웨이를 lan 모드로 변경(loopback→0.0.0.0)하되 iptables로 tailscale0+lo만 허용.
  tailscale.mode=off (tailnet에서 serve 미지원).
  디바이스 페어링은 paired.json 직접 편집 방식 채택 (CLI approve 타이밍 이슈).
changed_artifacts:
  - 560f3c2 docs: OpenClaw 맥북 노드 Phase 4 구현 결과 추가
  - Flora openclaw.json: gateway.bind=lan, tailscale.mode=off, exec.node.preferred=jiho-macbook
  - Flora iptables: tailscale0 ACCEPT + lo ACCEPT + DROP (영구 저장)
  - Flora paired.json: jiho-macbook 디바이스 등록
  - Flora skills 4개 추가: local-project-explorer, local-browser, claude-code-bridge, codex-bridge
  - 맥북 LaunchAgent: ai.openclaw.node.plist (PATH fix, token, insecure WS flag)
  - 맥북 node.json: gateway host/port/tls 설정
verification:
  - nodes status: Known 1, Paired 1, Connected 1 확인
  - system.which: git, claude, codex, npx 모두 감지
  - 게이트웨이 재시작 후 자동 재연결 정상
  - iptables 영구 저장 확인
  - 공개 IP 접근 차단 확인 (HTTP 000)
  - Tailscale IP 접근 정상 (HTTP 200)
open_risks:
  - OpenAI OAuth가 다시 만료됨 (Gemini fallback 중) — 주기적 재인증 필요
  - 텔레그램→맥북 노드 실사용 시나리오 미테스트 (system.which만 확인)
  - 맥북 슬립 시 노드 끊김 → 깨어나면 자동 재연결되지만 caffeinate 미설정
  - exec 라우팅(node preferred)이 에이전트 실행에 실제 반영되는지 실사용 검증 필요
next_step: >
  텔레그램에서 "프로젝트 상태 보여줘", "사방넷 재고 확인" 같은 실사용 시나리오를 테스트하여
  맥북 노드가 에이전트 실행에 실제로 활용되는지 확인한다.
learn_to_save:
  - "OpenClaw 노드 페어링 paired.json 직접 편집 패턴" → CTO playbook
  - "gateway.bind 유효값 목록 (loopback/lan/tailnet/auto/custom)" → CTO playbook
---

## 담당
최민석님 (CTO)

## 메모
Phase 0-3 (보안 하드닝 + 텔레그램 + 스킬 15개)에 이어
Phase 4 (맥북 노드 분산 아키텍처)까지 완료.

맥북이 꺼져도 Flora 서버의 텔레그램/모니터링/데이터 조회는 정상 동작.
맥북이 켜져있으면 파일 접근, 브라우저, Claude Code/Codex까지 원격 호출 가능.
