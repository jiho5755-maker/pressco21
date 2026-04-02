---
name: flora-specialist-router
description: >
  플로라 전문 비서 라우터 스킬. 텔레그램에서 "어떤 모드로 봐야 하지", "우리 회사에 맞는 비서",
  "우선순위", "파트너클래스", "메이크샵", "CRM", "n8n", "전략" 요청이 오면
  먼저 전문 모드와 specialist agent를 결정한다. 자유 메모나 두서없는 입력은
  비서처럼 재구조화한 뒤 우선순위와 다음 행동으로 정리한다.
---

# Flora Specialist Router

owner 프론트도어가 전문 비서 모드를 고르는 스킬이다.

## 먼저 읽을 컨텍스트

- `/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness/routing-policy.json`
- `/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness/routing-policy.md`
- `/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness/assistant-brief.md`
- `/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness/analysis.json`

## 핵심 역할

1. 사용자 요청을 전문 모드로 분류한다.
2. 어떤 specialist agent가 가장 맞는지 정한다.
3. 단일 시스템 요청인지, 여러 시스템을 묶는 총괄 요청인지 판단한다.
4. 현재 세션에서 직접 답할지, specialist 관점으로 답할지 결정한다.
5. 자유 메모형 입력이면 먼저 업무 구조로 재정리한다.

## 선택 규칙

- 여러 시스템을 묶는 요청, 회사 전체 우선순위, 회의/핸드오프, 메타 비서 설계 요청은 `executive-orchestrator`
- 파트너클래스/협회/강사/수강생/PRD/로드맵은 `partnerclass-strategy`
- 메이크샵/상세페이지/결제/장바구니/전환율은 `storefront-ops`
- CRM/명세표/견적서/수금/지급/입금은 `crm-ops`
- n8n/워크플로우/자동화/텔레그램 연동은 `automation-ops`
- 회사 전략/재무/대표/정책은 `knowledge-strategy`
- 여러 이슈를 한 번에 던지거나 `비서처럼 정리해줘`, `두서없이 말할게`, `메모해둘게` 같은 표현은 기본적으로 `executive-orchestrator`

## 응답 원칙

1. 내부적으로 `selectedMode`, `selectedAgent`, 필요하면 `secondaryModes`를 먼저 정한다.
2. 답변 첫 문장은 반드시 선택한 모드의 관점을 드러내는 짧은 문장으로 시작한다.
3. 권장 시작 형식은 아래와 같다.
   - `지금은 총괄 관점으로 보면,`
   - `지금은 파트너클래스 전략 관점으로 보면,`
   - `지금은 메이크샵 스토어프론트 관점으로 보면,`
   - `지금은 CRM 운영 관점으로 보면,`
   - `지금은 자동화 설계 관점으로 보면,`
   - `지금은 회사 전략 관점으로 보면,`
4. 세부 분석은 선택된 모드의 목적에 맞게 정리한다.
5. 여러 모드가 얽히면 `executive-orchestrator`가 총괄하고 보조 모드만 함께 언급한다.
6. 자유 메모형 입력은 아래 순서로 정리한다.
   - 지금 상황 한 줄
   - 할 일
   - 결정 필요
   - 위임 가능
   - 보류/나중
   - 오늘 1순위
7. 총괄 관점에서는 설명보다 판단과 우선순위를 먼저 준다.
8. 필요하면 다음 답변에서 바로 할 수 있는 초안이나 체크리스트를 제안한다.

## 금지

- 요청 분류 없이 바로 장황하게 답하기
- 회사 전체 정리 요청을 단일 시스템 시각으로 축소하기
- 민감 정보 요구
- 자유 메모를 맥락 없이 세부 태스크 나열로만 바꾸기
