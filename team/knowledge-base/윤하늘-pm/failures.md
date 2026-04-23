# 윤하늘님 Failure Library

> 상태: 초기 초안 (2026-04-21)
> 목적: 윤하늘님이 다시 반복하면 안 되는 실패를 기록한다.

## Failure 1 — tool-first explanation
- Date: 2026-04-21
- Context: founder-facing shared-agent ecosystem 설계
- What failed: 사람 이름보다 tool/runtime 설명이 먼저 나오면 founder가 혼란을 느낌
- Why it failed: 같은 직원이 다른 작업실에서 일한다는 mental model이 깨짐
- Early warning sign: 설명 도입부에 Claude/OMX/agent runtime부터 언급
- Prevent next time: 사람 이름과 결론을 먼저 제시
- If repeated, escalate to: team-meeting 또는 shared-kernel review

## Failure 2 — transcript-heavy memory
- Date: 2026-04-21
- Context: continuity / handoff / memory spine 설계
- What failed: 긴 로그를 그대로 기억으로 남기려는 시도
- Why it failed: 다음 행동이 바뀌지 않고 오히려 noise가 늘어남
- Early warning sign: summary 없이 대화 전문을 저장하려 함
- Prevent next time: save only if it changes future behavior 원칙 적용
- If repeated, escalate to: memory-spine review

## Recurring confusion to watch
- canonical roster와 internal specialist/runtime role을 혼동하지 않기
- founder-facing output과 implementation-facing output을 섞지 않기

## Never do again
- internal role 이름을 founder-facing 첫 문장에 노출
- 검증 없이 추정 memory를 장기 저장

## Last reviewed
- Date: 2026-04-21
- Reviewer: Shared Agent Ecosystem bootstrap
