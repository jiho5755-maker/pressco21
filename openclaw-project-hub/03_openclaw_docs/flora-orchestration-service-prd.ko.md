# PRD: Flora 종합 오케스트레이션 서비스 v0.1

> 버전: v0.1  
> 작성일: 2026-04-03  
> 상태: Draft  
> 성격: 플로라 서비스 정본 PRD  
> 상위 기준 문서: [flora-orchestration-service-master-plan.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-orchestration-service-master-plan.ko.md)  
> 관련 기존 문서:
> - [openclaw-project-b-executive-assistant-spec.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-project-b-executive-assistant-spec.ko.md)
> - [openclaw-flora-mac-copilot-harness-prd.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/openclaw-flora-mac-copilot-harness-prd.ko.md)
> - [PRD-플로라-AI비서-고도화.md](/Users/jangjiho/workspace/pressco21/docs/PRD-플로라-AI비서-고도화.md)

---

## 1. 프로젝트 정의

### 1.1 한 줄 정의

Flora 종합 오케스트레이션 서비스는
대표의 자유 메모와 회사 운영 이슈를
`업무`, `담당자`, `승인`, `일정`, `브리핑`으로 바꾸고
다시 결과까지 추적하는 PRESSCO21 전용 운영실장 시스템이다.

### 1.2 왜 지금 필요한가

현재 PRESSCO21 운영은 아래처럼 흩어져 있다.

- 대표 메모와 지시는 텔레그램/머릿속/문서에 분산
- 실무 작업은 CRM, 메이크샵, n8n, 문서, 로컬 개발 폴더에 분산
- 개발 실행은 가능하지만, 대표 비서형 intake와 task 추적이 완전히 붙어 있지 않음
- `할 일`은 남아도 `누가`, `언제`, `승인 필요`, `대기 병목`이 함께 정리되지 않음
- 외부에 있을 때 휴대폰만으로 처리하고 싶은 운영 업무가 많지만, 아직은 노트북이나 관리자 페이지 직접 접속 의존이 큼

지금 필요한 것은 새 SaaS를 하나 더 늘리는 것이 아니라,
이미 있는 `Telegram + flora-frontdoor + flora-todo-mvp + dev worker + n8n`
조합을 하나의 서비스처럼 묶는 것이다.

### 1.3 이 PRD의 목표

이 PRD는 아래 3가지를 동시에 고정한다.

1. 플로라를 `개인 비서`에서 `회사 운영 오케스트레이터`로 키우는 제품 방향
2. 저비용 기준에서 어떤 기능을 먼저 붙일지에 대한 우선순위
3. `무엇이 구현 1순위인지`를 문서상 명확히 정리하는 기준선

### 1.4 문서 구조 원칙

이 문서는 플로라 서비스의 `통합 PRD`다.

- 모바일 중심 운영 자동화는 별도 제품이 아니라 이 PRD 안의 핵심 기능 축이다
- Telegram Mini App, 메일 자동화, 브라우저 자동화, 개발 실행 연결은 모두 이 PRD의 하위 범위다
- 별도 문서는 필요할 때만 `단계별 구현 스펙` 또는 `기능 상세 스펙`으로 만든다
- 별도 문서가 생겨도 제품 정의, 범위, 우선순위 판단은 이 PRD를 우선한다

즉,

`플로라 PRD는 하나로 유지하고, 필요한 경우에만 하위 스펙이 이 문서를 참조하는 구조`를 기준으로 한다.

---

## 2. 제품 비전

### 2.1 최종 비전

대표가 텔레그램에 아무 말이나 던지면,
플로라가 먼저 비서처럼 정리하고,
업무 원장에 적재하고,
필요한 사람에게 나누고,
승인과 일정을 조율하고,
다시 오늘 브리핑과 미완료 브리핑으로 돌아오며,
필요한 운영 자동화는 서버 실행기로 대신 처리하는 구조를 만든다.

### 2.2 핵심 문장

`플로라는 대화를 잘하는 AI가 아니라, 업무를 받아 정리하고 흘려보내고 다시 챙기는 회사 운영 인터페이스다.`

추가로,

`플로라는 휴대폰에서 명령하고, 서버가 대신 실행하며, 위험한 액션은 승인 후에만 나가는 모바일 중심 운영 자동화 인터페이스다.`

### 2.3 벤치마크 기반 제품 방향

외부 검증 플로우를 기준으로 보면,
플로라는 아래 조합을 목표로 한다.

- Telegram: 입력 채널과 Mini App 진입점
- Asana/Trello형: 업무 원장, 담당자, 마감, 활동 흐름
- Linear형 일부: 개발 요청 triage와 execution queue
- ClickUp형 일부: 장기적으로 업무/문서/브리핑/캘린더 연결

즉,

- 입력은 Telegram
- 운영 원장은 task 중심
- 개발 요청은 execution queue
- 최종 UX는 Mini App

로 정리한다.

---

## 3. 사용자와 활용 시나리오

### 3.1 1차 핵심 사용자

#### 장지호

- 역할: owner / 운영 관리자 / 제품 튜너
- 목적:
  - 머릿속 메모 정리
  - 회사 전체 우선순위 판단
  - 개발/문서/운영 요청 연결
  - 팀별 업무 분해와 추적

### 3.2 2차 사용자

#### 이진선 대표

- 역할: 승인자 / 쉬운 언어 브리핑 수신자
- 목적:
  - 지금 뭐가 중요한지 간단히 보기
  - 확인/승인/지시만 빠르게 하기

### 3.3 3차 팀 사용자

#### 디자인/영상/물류 역할군

- 장다경: 영상기획 팀장
- 조승해 또는 웹디자인 담당
- 이재혁: 물류운영 과장

목적:

- 자기 업무 큐 보기
- 대표 요청을 이해하기 쉬운 형태로 받기
- 상태를 갱신하고 대기/막힘을 표시하기

---

## 4. 문제 정의

### 4.1 현재 가장 큰 문제

현재는 `좋은 답변`은 가능해졌지만,
아래의 운영 루프가 아직 완전히 닫히지 않았다.

1. 메모를 받음
2. 정리함
3. 업무 원장에 남김
4. 담당자에게 넘김
5. 승인/대기/병목을 추적함
6. 다시 브리핑함

즉, `비서형 응답`은 살고 있지만 `운영실장형 추적`은 아직 약하다.

### 4.2 실제 현장 문제

- 대표가 자유 메모를 많이 던지는데, 나중에 업무 원장으로 닫히지 않는 경우가 있음
- 할 일은 생겨도 담당자와 승인 흐름이 분리되지 않음
- 개발 요청은 실행 가능하지만, 회사 전체 운영 업무와 하나의 레이어로 연결되지 않음
- 비전공자가 쓰기엔 채팅만으로는 현재 상태를 한눈에 보기가 어려움

---

## 5. 범위와 비범위

### 5.1 이번 프로그램의 범위

- `flora-frontdoor` 비서형 intake 고도화
- Telegram 메인 입력 채널 유지
- `flora-todo-mvp`를 task ledger 후보로 사용
- source message와 task 연결 강화
- assignment / approval / briefing / event log 레이어 설계
- Telegram Mini App 기반 UI/UX 고도화
- 개발 요청함과 회사 운영 업무를 한 서비스 안에서 조율
- 모바일 중심 운영 자동화 설계
- 서버 실행기 기반 메일/브라우저 자동화 설계
- 승인 후 발송/실행 플로우 설계

정리 기준:

- `모바일 중심 운영`은 독립 서비스가 아니다
- `메일 발송 자동화`도 독립 제품이 아니라 플로라 오케스트레이션의 실행 기능이다
- `Codex/Claude 개발 지휘`도 별도 제품이 아니라 같은 서비스 안의 execution 레이어다

### 5.2 이번 버전의 비범위

- 여러 메신저 동시 메인 운영
- Slack 중심 재설계
- 모든 직원에게 즉시 전면 오픈
- 자동 승인 / 자동 발신 / 자동 지시 확정
- 별도 고비용 SaaS 도입
- 처음부터 완전한 ERP/그룹웨어 수준의 조직관리
- 크롬 확장 의존 자동화를 메인 실행 경로로 채택

---

## 6. 제약 조건

### 6.1 비용 제약

- 무료 또는 아주 저비용이 우선이다
- 기존 OpenClaw, Telegram, 로컬 맥북, Oracle, n8n, flora-todo-mvp를 우선 활용한다
- 새로운 외부 SaaS는 당장 메인 경로로 쓰지 않는다

### 6.2 운영 제약

- 맥북은 local cockpit이며 public ingress를 직접 늘리지 않는다
- Oracle은 public execution surface로 유지한다
- 로컬 dev worker는 맥북이 켜져 있어야 응답이 가능하다

### 6.3 조직 제약

- 처음부터 직원 전체에 열면 UX와 권한이 너무 복잡해진다
- owner/대표 중심으로 충분히 다듬은 뒤 팀별 역할군으로 확장한다

---

## 7. 제품 원칙

1. `비서형 판단 우선`
   - 설명보다 우선순위, 위임, 다음 행동이 먼저 나와야 한다.
2. `메모는 반드시 원장으로 닫는다`
   - 좋은 답변으로 끝내지 않고 업무 원장에 남겨야 한다.
3. `담당자와 승인 흐름을 같이 본다`
   - 그냥 task만 있으면 운영실장이 아니다.
4. `입력은 쉽게, 구조는 내부에서`
   - 사용자는 자유 메모를 쓰고, 구조화는 시스템이 담당한다.
5. `채팅과 화면을 분리한다`
   - Telegram은 입력
   - Mini App은 확인/처리/조율
6. `저비용 재사용 우선`
   - 기존 flora-todo-mvp, OpenClaw, n8n을 재사용한다.
7. `source-of-truth를 분산시키지 않는다`
   - 새 앱을 늘려 또 다른 진실원을 만들지 않는다.
8. `자동화는 서버가 실행한다`
   - 휴대폰 중심 사용성을 위해 운영 자동화는 로컬 노트북보다 상시 실행 서버가 맡는다.
9. `위험한 액션은 승인 후에만 실행한다`
   - 메일 발송, 고객 안내, 외부 시스템 수정은 초안/미리보기/승인 절차를 거친다.

## 7.1 운영 필수 요구사항

시니어 개발자 관점에서, 아래 4가지는 초기부터 빠지면 안 된다.

### A. 안정 ID / 멱등성

- Telegram/외부 입력은 가능한 한 `sourceChannel + sourceMessageId`를 안정 키로 쓴다
- 발신단이 Telegram message id를 주지 못하면 `userChatId + sourceCreatedAt` 기반 fallback을 강제한다
- source_message upsert와 task ingest는 재시도해도 중복 폭증이 나지 않아야 한다

### B. 최소 상태 머신

초기 상태는 아래 기준으로 고정한다.

- task status: `todo | waiting | needs_check | in_progress | done | cancelled`
- briefing bucket: `today | waiting | approval | dev`
- execution route: `manual | dev-worker | server-automation | review`

초기부터 이 상태 이름을 통일하지 않으면 UI, 브리핑, 자동화가 빠르게 서로 어긋난다.

### C. 자동화 안전 / 감사

- 외부 발신, 외부 상태 변경, 고객 안내는 반드시 `초안 -> 승인 -> 실행 -> 기록`을 따른다
- 누가 승인했고 언제 실행됐는지 event log 또는 동등한 audit trail이 남아야 한다
- Playwright 자동화는 API 부재 시 보조 수단으로만 쓴다

### D. 운영 관측성 / 복구성

- source_messages, ingest 결과, automation 실행 결과를 검색/복구할 수 있어야 한다
- 실패 시 `어디까지 저장됐고 어디서 끊겼는지`를 바로 볼 수 있어야 한다
- "응답은 했는데 원장 적재는 실패" 같은 half-success를 운영에서 식별 가능해야 한다

---

## 8. 목표 아키텍처

### 8.1 전체 구조

```text
Telegram DM/Group
        ↓
flora-frontdoor
        ↓
Request Intake / Secretary Response
        ↓
Task Ledger (flora-todo-mvp 확장)
        ↓
Assignment / Approval / Event Log / Briefing
        ↓
Mini App Workspace
        ↓
Server Automation Layer
        ↓
Dev Queue / CRM / MakeShop / n8n / 메일 발송 / 브라우저 자동화 / 문서 작업
```

### 8.2 계층 역할

#### A. Frontdoor 계층

- 자유 메모 수신
- secretary-style 응답
- specialist 분기
- intake 결정

#### B. Task Ledger 계층

- task / reminder / follow-up / source_message
- assignment / approval / event log
- dashboard / review / search

#### C. Execution 계층

- Codex/Claude 개발 실행
- CRM/메이크샵/n8n 관련 후속 액션
- 문서 초안/브리프 생성
- 서버형 메일 발송
- 서버형 Playwright 브라우저 자동화

#### D. Server Automation 계층

- API/SMTP 우선 실행
- API가 없는 관리자 페이지는 Playwright로 보조
- 휴대폰에서 승인받은 액션만 실행
- 실행 결과를 다시 task ledger와 briefing에 남김

#### D. UI 계층

- Telegram chat
- Telegram Mini App

### 8.3 문서 계층

플로라 문서 체계는 아래 순서를 따른다.

1. `flora-orchestration-service-master-plan.ko.md`
2. `flora-orchestration-service-prd.ko.md`
3. 단계별 구현 스펙

원칙:

- 제품 정의와 범위 판단은 이 PRD에서 한다
- 메일 자동화, 승인 플로우, Mini App, task ledger는 각각 따로 흩어진 PRD를 만들지 않는다
- 세부 설계가 필요하면 `Phase N spec`이나 `feature spec`으로만 내린다

---

## 9. 핵심 기능

### 9.1 Request Intake

자유 메모와 정식 업무 요청을 구분하는 진입 레이어가 필요하다.

입력 경로:

- Telegram 자유 메모
- Mini App 빠른 메모
- 향후 폼 기반 요청

출력:

- 상황 한 줄
- 오늘 우선순위
- 업무 후보
- 결정 필요
- 위임 후보
- 보류 항목

### 9.2 Task Ledger

최소한 아래 정보를 가져야 한다.

- title
- source text
- source message id
- source channel
- priority
- status
- due date
- waiting_for
- related project
- assignment owner
- assignment team
- approval required
- approval owner
- event log

### 9.3 Assignment

업무는 최소 아래 역할군으로 나눌 수 있어야 한다.

- owner / 대표
- 디자인/웹
- 영상기획
- 물류운영
- 개발

### 9.4 Approval

대표 승인/확인 단계가 필요한 업무를 분리해야 한다.

예:

- 대외 발신
- 공식 일정 확정
- 고객 안내 메시지
- 부서 지시 확정

### 9.5 Briefing

브리핑은 최소 아래로 나눠야 한다.

- 오늘 꼭 볼 것
- 승인 대기
- 대기/병목
- 팀별 미완료
- 개발 진행 중

### 9.6 Mini App Workspace

비전공자도 한눈에 쓰게 만드는 화면 레이어

초기 핵심 화면:

1. 홈
2. 빠른 메모
3. 오늘 브리핑
4. 승인 대기
5. 팀별 업무함
6. 개발 요청함

### 9.7 모바일 운영 자동화

플로라는 휴대폰 중심 사용을 위해 아래 자동화를 지원해야 한다.

#### A. 메일 초안 -> 승인 -> 발송

- 고객사/거래처 메일 초안 생성
- 보내기 전 미리보기 제공
- 승인 후 SMTP/API 발송
- 발송 결과를 task ledger에 기록

#### B. 브라우저 조회 자동화

- 관리자 페이지 상태 조회
- 반복 로그인/복사/확인 작업 대행
- 결과를 텔레그램/미니앱으로 요약

#### C. 브라우저 실행 자동화

- API가 없는 업무는 Playwright로 자동화
- 단, 고객 안내/상태 변경/외부 발송은 승인 전 자동 실행 금지

### 9.8 자동화 실행 우선순위

자동화 구현 순서는 아래를 따른다.

1. API / SMTP / n8n
2. Playwright 브라우저 자동화
3. 크롬 확장 의존 자동화

원칙:

- 가장 안정적인 경로를 먼저 쓴다
- 확장프로그램 의존은 마지막 수단으로만 쓴다

### 9.9 운영 품질 게이트

각 Phase는 아래 품질 게이트를 통과해야 `완료`로 본다.

1. 입력 1건이 원장까지 실제로 닫힌다
2. 재시도 1회에서 중복 폭증이 없다
3. 실패 시 recovery 경로가 있다
4. 비전공자 기준으로 다음 행동이 명확하다
5. 위험 자동화는 승인 없이 실행되지 않는다

---

## 10. 대표 시나리오

### 10.1 자유 메모 정리

입력:

`오늘 협회 제안서도 봐야 하고 CRM 거래명세서도 확인해야 하고 메이크샵 상세도 수정해야 하고 샘플 발주도 봐야 해`

결과:

- 상황 한 줄
- 오늘 우선순위
- 업무 원장 적재
- 디자인/물류/개발 후보 분리

### 10.2 팀 전달

입력:

`이건 장다경이 영상 초안 잡고, 조승해가 상세 배너 쪽 먼저 보고, 물류는 이재혁이 샘플 출고 확인하면 될 듯`

결과:

- 업무 3개로 분해
- owner/team 배정
- 전달문 초안
- 승인 필요 여부 표시

### 10.3 개발 연결

입력:

`CRM 거래명세서 인쇄 흐름 점검하고 수정 필요하면 바로 잡아줘`

결과:

- 개발 요청함 등록
- Codex 방/dispatcher로 전달
- 실행 중 상태 추적

### 10.4 대표 브리핑

출력:

- 오늘 막아야 할 것 3개
- 승인 대기 2개
- 물류 대기 1개
- 개발 확인 필요 1개

### 10.5 외부에서 휴대폰만으로 메일 발송

입력:

`A 고객에게 일정 변경 안내 메일 초안 만들고 보내기 준비해줘`

결과:

- 고객/문맥 확인
- 메일 초안 생성
- 승인 버튼 제공
- 승인 후 서버가 발송
- 발송 결과를 원장에 기록

### 10.6 외부에서 관리자 페이지 조회

입력:

`메이크샵 관리자에서 B 주문 상태 확인해서 알려줘`

결과:

- 플로라가 적절한 실행 경로를 고름
- API가 있으면 API로
- 없으면 서버 Playwright로 조회
- 결과를 텔레그램 요약 + 업무 원장 기록

---

## 11. 단계별 로드맵

### Phase 1. Frontdoor -> Task Ledger 닫힌 루프

목표:

- Telegram 메모를 실제 업무 원장까지 적재
- source message와 task를 같이 남김
- secretary-style 응답 유지

완료 기준:

- 메인 플로라 메모 1건이 응답 + 원장 적재 + 브리핑 반영까지 이어진다

### Phase 2. Assignment / Approval / Event Log

목표:

- 개인 todo를 협업 오케스트레이션 원장으로 확장

완료 기준:

- task에 담당자/팀/승인 상태가 붙고
- 상태 변경 이력이 남는다

### Phase 3. Mini App MVP

목표:

- 비전공자용 UI 첫 버전 출시

완료 기준:

- 홈
- 빠른 메모
- 오늘 브리핑
- 승인 대기

4개 화면이 Telegram 안에서 동작한다

### Phase 4. 모바일 운영 자동화

목표:

- 휴대폰만으로 메일/조회/승인/간단 실행이 가능하게 한다

완료 기준:

- 메일 초안 -> 승인 -> 발송
- 관리자 페이지 조회 자동화
- 실행 결과 logging

### Phase 5. 팀 파일럿

목표:

- 디자인/영상/물류 역할군 제한 오픈

완료 기준:

- 1개 역할군 이상이 실제 업무함을 사용해 상태 갱신을 한다

### Phase 6. 회사 종합 오케스트레이션

목표:

- CRM / 메이크샵 / 파트너클래스 / 문서 / 개발 / 물류를 한 레이어에서 본다

완료 기준:

- 플로라가 사람과 시스템을 함께 고려해 오늘 회사 우선순위를 제시한다

---

## 12. 성공 지표

### 12.1 Phase 1 성공 지표

- Telegram 메모 중 원장 미적재 비율 감소
- 아침 브리핑에 실제 전날 메모가 반영됨
- 개발 요청의 누락 감소

### 12.2 Phase 2 성공 지표

- task 중 owner 없는 비율 감소
- 승인 필요 건이 별도 큐로 보임
- 병목/대기 업무를 다시 찾는 시간 감소

### 12.3 Phase 3 성공 지표

- 비전공자도 Mini App에서 상태를 이해하고 누를 수 있음
- “채팅 다시 검색” 빈도 감소

### 12.4 Phase 4 성공 지표

- 외부에서 휴대폰만으로 처리 가능한 운영 업무 수 증가
- 노트북 열지 않고 끝낸 메일/조회/승인 건수 증가
- 자동화 실행 후 수동 재확인 비용 감소

---

## 13. 이번 PRD에서 먼저 닫아야 할 의사결정

1. `flora-todo-mvp`를 장기 task ledger 후보로 확정할지
2. assignment / approval / event log를 별도 테이블로 바로 만들지, 1차는 detailsJson으로 갈지
3. 대표 승인 큐를 어떤 기준으로 분리할지
4. Telegram Mini App의 첫 화면을 `홈`으로 할지 `빠른 메모`로 할지
5. 팀 파일럿의 첫 대상 역할군을 어디로 할지
6. 메일/브라우저 자동화 중 어떤 업무부터 모바일 자동화 파일럿으로 붙일지

현재 추천:

1. `flora-todo-mvp`를 task ledger 후보로 유지
2. 1차는 저비용 기준으로 detailsJson + metadata를 활용하고, 2차에 정규화
3. 승인 큐는 `대외 발신 / 공식 일정 / 고객 안내 / 부서 지시 확정` 기준으로 시작
4. 첫 화면은 `홈`
5. 팀 파일럿 첫 대상은 `물류운영` 또는 `디자인/웹` 중 하나
6. 모바일 자동화 첫 파일럿은 `메일 초안 -> 승인 -> 발송`과 `읽기 전용 관리자 조회`

---

## 14. 다음 구현 문서

이 PRD 이후 바로 따라야 할 구현 스펙은 아래다.

- [flora-frontdoor-task-ledger-phase1-spec.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-task-ledger-phase1-spec.ko.md)

이 스펙은 Phase 1의 `Frontdoor -> Task Ledger 닫힌 루프`를 실제로 구현하기 위한 첫 번째 구현 문서다.

앞으로 추가되는 문서는 아래 규칙을 따른다.

- 새 `독립 PRD`를 계속 늘리지 않는다
- 통합 PRD 아래에 `Phase spec` 또는 `Feature spec`만 추가한다
- 모바일 운영 자동화도 별도 제품 PRD가 아니라, 필요 시 이 PRD를 참조하는 하위 스펙으로만 분리한다
