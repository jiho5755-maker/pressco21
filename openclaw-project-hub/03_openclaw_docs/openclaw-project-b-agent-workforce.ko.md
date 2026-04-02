# PRESSCO21 OpenClaw 에이전트 워크포스 설계

> 상태: draft v0.1
> 작성일: 2026-03-20
> 목적: 부족한 전문인력을 OpenClaw 기반 전문 에이전트로 보완하기 위한 운영 설계

## 1. 목표

PRESSCO21은 인력이 적어서 문제가 아니라, 대표/디자인/영상/물류에 필요한 전문 역할이 몇 사람에게 과도하게 몰려 있다는 점이 병목입니다.
이 문서는 OpenClaw를 이용해 부족한 전문 역할을 에이전트로 보완하고, 사람은 승인과 최종 판단에 집중하도록 만드는 기준입니다.

## 2. 기본 원칙

1. 에이전트는 사람을 대체하지 않고 준비 작업과 초안을 맡습니다.
2. `company-admin`이 운영과 승인 경계를 통제합니다.
3. `company-core`는 회사 지식의 단일 진실 소스를 참조합니다.
4. 전문 에이전트는 직무 단위로 분리하고, 필요한 경우 스쿼드로 묶어 움직입니다.
5. 새 에이전트는 근거 문서와 승인 경계가 있는 역할만 활성화합니다.

## 3. 부족한 전문인력과 대응 에이전트

| 부족 역할 | 현재 병목 | 대응 에이전트 | 사람 승인자 |
|----------|----------|--------------|-----------|
| 상품기획자/머천다이저 | 상세페이지 기획 정리 지연 | `detail-page-planner` | 조승해, 장지호 |
| 콘텐츠 플래너 | 어떤 제품을 찍을지 계획 부재 | `video-content-planner` | 장다경 |
| CS 1차 트리아지 담당 | 전화/재고/배송 문의 반복 | `cs-triage-specialist` | 이재혁 |
| 운영 분석가 | 반복 병목과 로그 정리 부족 | `operations-analyst` | 장지호 |
| 문서 큐레이터 | 기준 문서 갱신 누락 | `knowledge-curator` | 장지호 |
| 회사 비서/코디네이터 | 회의 준비, 후속 액션 추적, 부서 간 핸드오프 누락 | `executive-assistant` | 장지호, 이진선 |
| CRM/B2B 고객 관리 담당 | 직접거래 고객 파악과 후속 액션 정리 부족 | `crm-account-manager` | 장지호 |
| 가격/마진 검토 담당 | SKU별 가격 판단과 채널 마진 점검 부족 | `pricing-margin-analyst` | 장지호, 이진선 |
| 오픈마켓 운영 준비 담당 | 자사몰 원본과 채널 등록 기준이 분산됨 | `marketplace-ops-specialist` | 장지호, 조승해 |
| 입금/현금흐름 검토 담당 | 입금 검토와 후속 연락 판단이 분산됨 | `bank-ops-assistant` | 장지호 |

제어 계층:

- `company-admin`: 운영 책임자
- `company-coach`: 업무 요청 정리자
- `company-core`: 회사 지식 계층

## 4. 전문/지원 에이전트 구성

### detail-page-planner

- 역할: 상품 특징을 상세페이지 브리프로 바꾸는 기획자
- 입력: 상품명, 카테고리, 핵심 특징, 사진/실사 보유 여부
- 출력: 섹션 구조안, 카피 포인트, 누락 자료, 승인 체크리스트

### video-content-planner

- 역할: 월간 촬영 계획과 플랫폼별 전개안을 만드는 콘텐츠 플래너
- 입력: 시즌, 제품 후보, 채널 목표, 기존 영상 링크
- 출력: 8개 촬영 계획, 제목/설명 아이디어, 릴스 재활용 우선순위

### cs-triage-specialist

- 역할: 문의를 읽고 1차 응답과 위험도를 분류하는 CS 보조자
- 입력: 문의 채널, 메시지, 주문번호, 상품명
- 출력: 답변 초안, 추가 질문, 담당자, 에스컬레이션 경로

### operations-analyst

- 역할: 파일럿 로그를 읽고 병목과 KPI 신호를 정리하는 분석가
- 입력: 일일 로그, 반복 질문, 이슈 목록
- 출력: 운영 다이제스트, 병목, 다음 액션

### knowledge-curator

- 역할: 확정된 결정을 문서 갱신 후보와 FAQ로 정리하는 큐레이터
- 입력: 확정 결정, 원문 문서, 변경 요약
- 출력: 업데이트 후보, FAQ 후보, SOP 변경 목록

### executive-assistant

- 역할: 대표와 관리자, 각 부서 사이를 연결하는 회사 비서 겸 코디네이터
- 입력: 회의 목적, 원문 메모, 참여자, 마감일, 관련 문서 링크
- 출력: 회의 브리프, 담당자별 액션리스트, 후속 질문, 마감 추적표
- 주 사용 장면: 회의 준비, 대표 지시 정리, 부서 간 요청 전달, 다음 액션 정리
- 금지: 일정/공지/대외 메시지를 사람 승인 없이 확정 발송
- 성격: 부서 specialist라기보다 공용 지원 역할이며, 필요 시 다른 전문 에이전트 호출로 분기하는 프론트도어

### crm-account-manager

- 역할: 직접거래/B2B 고객의 거래 흐름과 후속 액션을 정리하는 CRM 보조자
- 입력: 고객명, 고객 유형, 최근 거래, 최근 주문, 미수금 메모
- 출력: 고객 요약, 기회 신호, 관계 리스크, 다음 액션, 연락 스크립트

### pricing-margin-analyst

- 역할: SKU 원가와 채널별 가격 위험을 검토하는 가격/마진 분석가
- 입력: 상품명, SKU, 원가, 판매가, 채널, 목표 마진
- 출력: 마진 요약, 가격 옵션, 위험 플래그, 채널 메모

### marketplace-ops-specialist

- 역할: 메이크샵 원본과 오픈마켓 등록 준비를 정리하는 운영 보조자
- 입력: 상품명, 대상 채널, 상품 유형, 핵심 특징, 자료 상태
- 출력: 채널별 제목 초안, 등록 체크리스트, 누락 자료, 위험 플래그

### bank-ops-assistant

- 역할: 은행 입출금 이벤트를 안전하게 검토하는 현금흐름 보조자
- 입력: 거래 유형, 입금자/상대방, 금액, 고객 후보, 열린 명세표
- 출력: 매칭 판단, 후속 액션, 안내 문구 초안, 승인 체크리스트

## 5. 스쿼드 운영 방식

### product-launch-squad

- 구성: `company-coach` -> `detail-page-planner` -> `knowledge-curator` -> `company-admin`
- 목적: 신상품/키트상품/상세페이지 런칭 준비

### content-growth-squad

- 구성: `company-coach` -> `video-content-planner` -> `knowledge-curator` -> `company-admin`
- 목적: 8개 촬영 계획과 숏츠/릴스 재활용

### customer-response-squad

- 구성: `company-core` -> `company-coach` -> `cs-triage-specialist` -> `company-admin`
- 목적: 배송/재고/사용 문의의 1차 대응 정리

### operations-improvement-squad

- 구성: `operations-analyst` -> `knowledge-curator` -> `company-admin`
- 목적: 로그 분석, FAQ 축적, SOP 보강

### executive-support-squad

- 구성: `executive-assistant` -> `company-core` -> `knowledge-curator` -> `company-admin`
- 목적: 회의 준비, 후속 액션 정리, 담당자별 핸드오프, 마감 추적

### crm-growth-squad

- 구성: `crm-account-manager` -> `operations-analyst` -> `company-admin`
- 목적: 직접거래/B2B 고객 재활성화, 후속 액션 정리, 휴면 고객 점검

### pricing-control-squad

- 구성: `pricing-margin-analyst` -> `marketplace-ops-specialist` -> `company-admin`
- 목적: SKU 마진 점검, 채널별 가격/등록 준비 일치

### cashflow-review-squad

- 구성: `bank-ops-assistant` -> `crm-account-manager` -> `company-admin`
- 목적: 입금 검토, 미수금 후속, 안내 문구 초안 정리

## 6. OpenClaw 연결 방식

- 훅 이벤트는 계속 `company-admin`과 `company-coach`가 받습니다.
- 전문 에이전트는 훅 직접 수신자가 아니라, n8n 또는 수동 호출 대상 게이트웨이로 둡니다.
- 즉, OpenClaw는 제어 계층을 유지하고, 전문 작업은 세분화된 command gateway 세션으로 분산합니다.
- `executive-assistant`는 넓은 회사 요청을 처음 받는 범용 창구로 둘 수 있으며, 필요할 때 다른 전문 에이전트 호출로 분기합니다.

참조 산출물:

- `docs/reference/openclaw-pressco21-config.example.json`
- `docs/reference/openclaw-pressco21-agent-workforce.json`
- `scripts/setup-pressco21-openclaw.js`

## 7. 사람 승인 경계

- 이진선: 상품/기술/브랜드 방향 최종 확인
- 조승해: 최종 상세페이지 레이아웃
- 장다경: 최종 영상 게시
- 이재혁: 실제 CS 발송/물류 처리
- 장지호: 운영 룰, 문서 반영, 에이전트 운영 통제

에이전트 금지:

- 환불/가격/재고 직접 변경
- 외부 공지 확정
- 최종 게시와 최종 디자인 확정
- 허위 가격/품질 우위 표현

## 8. 도입 순서

1. `product-launch-squad`부터 운영
2. `executive-support-squad`를 함께 배치
3. `content-growth-squad` 추가
4. `customer-response-squad`를 읽기 전용으로 운영
5. `operations-improvement-squad`로 운영 로그를 정례화
6. `crm-growth-squad`와 `pricing-control-squad`를 순차 추가
7. `cashflow-review-squad`를 검토 전용으로 운영

## 9. 바로 다음 작업

1. 전문 에이전트 게이트웨이를 포함한 회사용 OpenClaw 설정을 생성합니다.
2. 상세페이지 브리프, 영상 계획안, CS 트리아지 플로우를 n8n 또는 수동 호출 기준으로 고정합니다.
3. 운영 다이제스트와 지식 큐레이션 플로우를 같은 포맷으로 이어서 추가합니다.
4. `executive-assistant`용 회의 브리프/액션 추적 계약을 별도 스펙으로 고정합니다.
