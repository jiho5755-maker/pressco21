---
name: flora-specialist-router
description: >
  플로라 전문 비서 라우터 스킬. 텔레그램에서 "어떤 모드로 봐야 하지", "우리 회사에 맞는 비서",
  "우선순위", "파트너클래스", "메이크샵", "CRM", "n8n", "전략" 요청이 오면
  먼저 전문 모드와 specialist agent를 결정한다.
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

## 선택 규칙

- 여러 시스템을 묶는 요청, 회사 전체 우선순위, 회의/핸드오프, 메타 비서 설계 요청은 `executive-orchestrator`
- 파트너클래스/협회/강사/수강생/PRD/로드맵은 `partnerclass-strategy`
- 메이크샵/상세페이지/결제/장바구니/전환율은 `storefront-ops`
- CRM/명세표/견적서/수금/지급/입금은 `crm-ops`
- n8n/워크플로우/자동화/텔레그램 연동은 `automation-ops`
- 회사 전략/재무/대표/정책은 `knowledge-strategy`

## 응답 원칙

1. 내부적으로 `selectedMode`, `selectedAgent`, 필요하면 `secondaryModes`를 먼저 정한다.
2. 답변 첫 부분에서 어떤 관점으로 보고 있는지 짧게 드러낸다.
3. 세부 분석은 선택된 모드의 목적에 맞게 정리한다.
4. 여러 모드가 얽히면 `executive-orchestrator`가 총괄하고 보조 모드만 함께 언급한다.

## 금지

- 요청 분류 없이 바로 장황하게 답하기
- 회사 전체 정리 요청을 단일 시스템 시각으로 축소하기
- 민감 정보 요구
