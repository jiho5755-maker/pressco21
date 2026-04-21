# Claude Agent Roster Map (Adapter-Local)

> Claude adapter 전용 매핑. shared-kernel에 `claude_agent_file`을 추가하지 않고
> adapter 내부에서 관리한다 (Proposal 1 HOLD 수용).

## Core 6

| canonical agent_id | Claude agent file | display_name | 소개할 때 |
|---|---|---|---|
| yoo-junho-paircoder | `~/.claude/agents/vibe-coder-buddy.md` | 유준호님 | 유준호님 (페어코더) |
| choi-minseok-cto | `~/.claude/agents/chief-technology-officer.md` | 최민석님 | 최민석님 (CTO) |
| park-seoyeon-cfo | `~/.claude/agents/chief-financial-officer.md` | 박서연님 | 박서연님 (CFO) |
| han-jihoon-cso | `~/.claude/agents/chief-strategy-officer.md` | 한지훈님 | 한지훈님 (CSO) |
| yoon-haneul-pm | `~/.claude/agents/project-manager.md` | 윤하늘님 | 윤하늘님 (PM) |
| team-meeting | (pseudo — `/team-meeting` skill) | 팀 회의 | 팀 회의 |

## Extended

| canonical agent_id | Claude agent file | display_name | 소개할 때 |
|---|---|---|---|
| jung-yuna-cmo | `~/.claude/agents/chief-marketing-officer.md` | 정유나님 | 정유나님 (CMO) |
| kim-dohyun-coo | `~/.claude/agents/chief-operating-officer.md` | 김도현님 | 김도현님 (COO) |
| cho-hyunwoo-legal | `~/.claude/agents/compliance-advisor.md` | 조현우님 | 조현우님 (법무) |
| kang-yerin-hr | `~/.claude/agents/hr-coach.md` | 강예린님 | 강예린님 (HR코치) |

## Claude subagent_type → canonical agent_id

Hook에서 agent-logger가 기록하는 `subagent_type`을 canonical `agent_id`로 변환하는 매핑.
session-handoff.sh가 owner_agent_id를 결정할 때 사용.

| subagent_type (Claude internal) | canonical agent_id | canonical? |
|---|---|---|
| chief-strategy-officer | han-jihoon-cso | Yes |
| chief-financial-officer | park-seoyeon-cfo | Yes |
| chief-technology-officer | choi-minseok-cto | Yes |
| chief-marketing-officer | jung-yuna-cmo | Yes |
| chief-operating-officer | kim-dohyun-coo | Yes |
| project-manager | yoon-haneul-pm | Yes |
| compliance-advisor | cho-hyunwoo-legal | Yes |
| hr-coach | kang-yerin-hr | Yes |
| vibe-coder-buddy | yoo-junho-paircoder | Yes |
| Explore | — | **No** (내부 탐색용) |
| general-purpose | — | **No** (범용 작업) |
| Plan | — | **No** (설계 모드) |
| code-inspector | — | No (2층 실무) |
| makeshop-expert | — | No (2층 실무) |
| n8n-builder | — | No (2층 실무) |
| deploy-manager | — | No (2층 실무) |

## Non-Canonical 필터링 규칙

handoff의 `owner_agent_id`와 `contributors`에는 **canonical agent만** 들어가야 한다.
non-canonical subagent_type이 가장 많이 사용된 경우:
1. canonical agent 중 가장 많이 사용된 것을 owner로 선택
2. canonical agent가 하나도 없으면 `claude-direct` 사용

이 규칙은 `session-handoff.sh`에 구현되어 있다.
