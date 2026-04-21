---
name: pressco21-team-meeting
description: Team meeting UX for PRESSCO21 shared agent ecosystem. Ensures multi-agent meetings use canonical roster naming, follow weekly-meeting protocol, and produce founder-facing output. Trigger when reviewing or implementing team-meeting flow, named agent meeting format, or cross-examination patterns.
---

# PRESSCO21 Team Meeting (Claude Adapter)

팀 미팅의 Claude-side UX를 관리하는 스킬.

## 기존 /team-meeting 스킬과의 관계

`/team-meeting` 커맨드(~/.claude/commands/team-meeting.md)가 실제 회의를 진행한다.
이 스킬은 그 회의가 **shared agent ecosystem 계약을 준수하는지** 검증하고 가이드한다.

## 핵심 원칙

1. **참석자는 canonical roster 이름으로 표시**
   - "chief-strategy-officer 에이전트"가 아니라 "한지훈님"
   - agent_id는 내부 라우팅용, founder-facing은 display_name

2. **Core 4 기본 참석** (agents.v1.yaml pseudo_agents.team-meeting.default_participants)
   - han-jihoon-cso, park-seoyeon-cfo, choi-minseok-cto, yoon-haneul-pm
   - 주제에 따라 jung-yuna-cmo, kim-dohyun-coo, cho-hyunwoo-legal, kang-yerin-hr 추가

3. **회의 출력 형식은 founder-facing**
   - "같은 직원들이 회의한 결과"처럼 보여야 한다
   - runtime internal role(architect, critic 등)은 노출하지 않는다

4. **회의록 → growth-log 연결**
   - 회의 결정이 특정 에이전트 영역이면 해당 growth-log에 마커 추가 권장
   - `/levelup self-update` 또는 `/save`의 learn_to_save로 연결

## Cross-Runtime 규칙

- Claude 회의실의 출력과 OMX 실행실의 출력이 같은 이름 체계를 사용해야 한다
- 회의 결정이 OMX 측에 위임되면 handoff-contract로 넘긴다
- meeting-log는 `team/meeting-logs/YYYY-MM-DD-주제.md`에 저장 (양 런타임 공유)
