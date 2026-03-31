# Flora Owner Routing Validation

## 목적

텔레그램 프론트도어 `flora-frontdoor`가 질문을 받았을 때,
단순히 좋은 답을 하는 수준이 아니라 `전문 모드 선택이 첫 문장부터 드러나는지`를 검증하기 위한 기준이다.

핵심 목표는 세 가지다.

1. 질문 도메인에 맞는 모드가 자연스럽게 선택된다.
2. 답변 첫 문장이 선택한 관점을 드러낸다.
3. 초기 문단에서 과거 메모리나 다른 시스템 문맥이 섞이지 않는다.

## 검증 대상

- `flora-frontdoor` frontdoor agent
- 라우팅 정책: [flora-specialist-routing.policy.json](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/04_reference_json/flora-specialist-routing.policy.json)
- owner 컨텍스트:
  - `routing-policy.json`
  - `routing-policy.md`
  - `assistant-brief.md`
  - `analysis.json`
  - `meta-prompt.md`

## 합격 기준

### 1. 첫 문장 규칙

각 모드의 답변 첫 문장은 아래 패턴 중 하나로 시작해야 한다.

- `지금은 총괄 관점으로 보면,`
- `지금은 파트너클래스 전략 관점으로 보면,`
- `지금은 메이크샵 스토어프론트 관점으로 보면,`
- `지금은 CRM 운영 관점으로 보면,`
- `지금은 자동화 설계 관점으로 보면,`
- `지금은 회사 전략 관점으로 보면,`

### 2. 도메인 적합성

- `storefront-ops`: 메이크샵 상세, 전환율, 구매 버튼, 신뢰 요소, 모바일 상세 구조
- `crm-ops`: 명세표, 견적서, 수금/지급, 인쇄, 고객/주문/입금 흐름
- `automation-ops`: n8n, trigger, webhook, 승인 경계, 실패 경보
- `partnerclass-strategy`: 파트너클래스, 수강생/파트너/협회, PRD, 제품 흐름
- `knowledge-strategy`: 회사 전략, 재무, 정책, 대표 판단 기준
- `executive-orchestrator`: 여러 시스템 우선순위, 핸드오프, 무엇부터 할지

### 3. memory bleed 금지

다음 패턴은 실패로 본다.

- `Source: memory/...`
- 현재 질문과 무관한 예전 프로젝트/문서명
- 첫 문단에서 다른 시스템 문맥이 불필요하게 끼어드는 경우

## 실행 방법

frontdoor 설치/갱신:

```bash
bash 06_scripts/install-flora-frontdoor-agent.sh
```

검증 실행:

```bash
bash 06_scripts/validate-flora-routing.sh
```

출력은 `output/flora-routing-validation/` 아래 Markdown 리포트로 남긴다.

## 최신 검증 결과

- 실행 시각: 2026-03-31 21:27 KST
- 대상 frontdoor: `flora-frontdoor`
- 결과: `6 / 6 PASS`
- 리포트: `output/flora-routing-validation/owner-routing-validation-20260331_212701.md`

요약:

- `storefront / crm / automation / strategy / knowledge / executive` 6개 질문 모두 기대 모드의 첫 문장으로 시작했다.
- `memoryBleed`도 전부 `false`로 확인됐다.
- 개선 포인트는 기존 `owner`를 계속 덧칠하는 것보다, `flora-frontdoor`라는 새 세션을 만들고 텔레그램 바인딩을 전환한 것이었다.

## 기본 테스트 세트

1. 메이크샵 상세페이지 전환율 질문 → `storefront-ops`
2. CRM 명세표 인쇄 질문 → `crm-ops`
3. n8n 자동화 재설계 질문 → `automation-ops`
4. 파트너클래스 Phase 3 우선순위 질문 → `partnerclass-strategy`
5. 회사 전략 판단 기준 질문 → `knowledge-strategy`
6. CRM vs n8n 전체 우선순위 질문 → `executive-orchestrator`

## 운영 메모

- 현재 specialist agent는 이미 분리 설치되어 있고, 텔레그램 frontdoor는 `flora-frontdoor`를 기준으로 검증한다.
- 따라서 1차 목표는 `frontdoor가 specialist처럼 말하게 만드는 것`이고,
  2차 목표는 필요 시 실제 internal handoff까지 확장하는 것이다.
