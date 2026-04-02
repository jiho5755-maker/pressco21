# PRESSCO21 OpenClaw 회사 비서 에이전트 스펙

> 상태: working draft v0.1
> 작성일: 2026-03-21
> 우선순위: 공용 운영 레이어 1순위

## 1. 목적

이 스펙은 PRESSCO21에서 대표, 관리자, 각 부서가 공통으로 사용할 수 있는 `executive-assistant` 에이전트의 입력/출력 계약을 정의합니다.

목표는 단순 Q&A가 아니라 아래 4가지를 대신 준비하는 것입니다.

1. 회의 준비
2. 대표 지시와 메모 구조화
3. 부서 간 핸드오프 정리
4. 후속 액션과 마감 추적

즉, 이 에이전트는 "대표 비서 + 운영 코디네이터 + 후속 조치 관리자" 역할을 맡습니다.

## 2. 참조 문서

- `docs/openclaw-project-b-recovery-plan.ko.md`
- `docs/openclaw-project-b-agent-workforce.ko.md`
- `docs/openclaw-project-b-design-draft.ko.md`
- `docs/reference/openclaw-pressco21-executive-assistant-meeting-brief.example.json`
- `docs/reference/openclaw-pressco21-weekly-action-tracker.template.json`
- `../../../pressco21/company-profile.md`
- `../../../pressco21/company-knowledge/brand-identity.md`
- `../../../pressco21/company-knowledge/ax-strategy.md`
- `../../../pressco21/company-knowledge/staff.md`
- `../../../pressco21/company-knowledge/meeting-results-2026-03-20.md`

## 3. 사용 시점

- 대표 또는 관리자가 회의 전에 정리본이 필요할 때
- 여러 부서에 해야 할 일을 나눠야 할 때
- 회의 후 액션아이템, 담당자, 기한을 다시 정리해야 할 때
- 문서, 요청, 메모가 흩어져 있어 다음 행동을 못 정할 때

호출 주체:

- 기본: `executive-assistant`
- 참조 지식: `company-core`
- 운영 통제: `company-admin`

OpenClaw 설정 연결:

- `notifications.openclaw.gateways["executive-assistant"]`
- `notifications.openclaw.playbooks["executive-assistant"]`

실행 보조 스크립트:

- `scripts/run-pressco21-playbook.js`

예시:

```bash
node scripts/run-pressco21-playbook.js meeting-brief \
  --input docs/reference/openclaw-pressco21-executive-assistant-meeting-brief.example.json \
  --dry-run

OMX_OPENCLAW=1 OMX_OPENCLAW_COMMAND=1 \
node scripts/run-pressco21-playbook.js weekly-action-tracker \
  --input docs/reference/openclaw-pressco21-weekly-action-tracker.template.json
```

## 4. 필수 입력값

| 필드 | 타입 | 설명 |
|------|------|------|
| `requestType` | string | 회의준비, 액션정리, 핸드오프, 주간정리 등 |
| `goal` | string | 이번 요청의 목적 |
| `participants` | string[] | 관련 사람 또는 부서 |
| `rawNotes` | string[] | 원문 메모, 지시사항, 회의 메모 |
| `deadline` | string | 마감일 또는 기준 날짜 |
| `approvalOwner` | string | 최종 확인자 |

## 5. 선택 입력값

| 필드 | 타입 | 설명 |
|------|------|------|
| `relatedDocs` | string[] | 참고 문서 경로 |
| `knownDecisions` | string[] | 이미 확정된 결정 |
| `openQuestions` | string[] | 아직 미해결 질문 |
| `departmentContext` | string[] | 디자인, 영상, 물류 등 관련 부서 |
| `priorityLevel` | string | high, medium, low |

## 6. 입력 누락 시 다시 물어볼 질문

질문은 최대 3개까지만 사용합니다.

1. 이번 요청의 최종 목적이 무엇인지
2. 누가 최종 확인자이고 누가 실행 담당자인지
3. 언제까지 정리되어야 하는지

## 7. 처리 규칙

1. 회의 메모는 항상 `결정`, `해야 할 일`, `추가 확인`, `담당자`, `기한`으로 분해합니다.
2. 확정되지 않은 내용은 확정처럼 쓰지 않습니다.
3. 회사 브랜드/정책/상품 관련 표현은 `company-core` 근거를 우선 참조합니다.
4. 액션아이템은 부서별 또는 사람별로 재정렬합니다.
5. 사람이 승인하기 전에는 일정 확정, 대외 공지 확정, 고객 메시지 발송을 제안하지 않습니다.

## 8. 출력 계약

### 8-1. 기본 구조

| 필드 | 설명 |
|------|------|
| `briefSummary` | 이번 요청의 핵심 요약 |
| `decisionLog` | 이미 확정된 사항 |
| `actionItems` | 담당자별 해야 할 일 |
| `followUpQuestions` | 아직 확인이 필요한 질문 |
| `ownerTracker` | 담당자, 기한, 상태 |
| `handoffNotes` | 부서 간 전달해야 할 맥락 |
| `approvalChecklist` | 최종 확인이 필요한 항목 |

### 8-2. actionItems 최소 항목

- `task`
- `owner`
- `deadline`
- `status`
- `approvalRequired`

## 9. 대표 활용 예시

### 회의 준비

- 입력: 통합회의 목적, 참석자, 참고 문서, 대표 메모
- 출력: 회의 개요, 아젠다, 확인 질문, 역할별 준비물

### 회의 후 정리

- 입력: 회의 메모 원문
- 출력: 결정사항, 부서별 액션, 마감일, 추후 확인 질문

### 부서 간 핸드오프

- 입력: 대표 지시 + 디자인/영상/물류 관련 요청
- 출력: 부서별 전달문, 우선순위, 승인 필요 항목

### 주간 운영 정리

- 입력: 이번 주 메모, 로그, 반복 이슈
- 출력: 이번 주 핵심 현안, 다음 주 우선순위, 놓친 후속 조치

## 9-1. 예시 산출물

- 회의 브리프 예시: `docs/reference/openclaw-pressco21-executive-assistant-meeting-brief.example.json`
- 주간 액션 트래커 템플릿: `docs/reference/openclaw-pressco21-weekly-action-tracker.template.json`
- 설정 내 플레이북 예시: `docs/reference/openclaw-pressco21-config.example.json`

## 10. 승인 경계

- 사람이 최종 승인해야 하는 것: 일정 확정, 대외 공지, 고객 안내 발송, 부서 지시 확정
- OpenClaw가 할 수 있는 것: 메모 구조화, 할 일 정리, 핸드오프 초안, 후속 질문 정리
- 금지: 대표 결정을 대신 확정, 허위 마감 확정, 외부 발신 자동 실행

## 11. 완료 조건

- 장지호 또는 대표가 회의 메모를 바로 실행 가능한 액션리스트로 바꿔 쓸 수 있다.
- 부서별 해야 할 일과 승인 필요 항목이 분리된다.
- 후속 질문과 빠진 정보가 별도 목록으로 드러난다.
- 각 전문 에이전트에게 어떤 요청을 넘겨야 하는지 바로 판단할 수 있다.

## 12. 다음 구현 포인트

1. `executive-support-squad`와 연결되는 n8n 입력 폼 정의
2. 회의 후 요약본 자동 저장 규칙 추가
3. 주간 액션 트래커와 `operations-analyst` 다이제스트 연결
