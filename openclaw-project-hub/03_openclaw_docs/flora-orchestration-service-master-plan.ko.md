# Flora 종합 오케스트레이션 서비스 마스터 플랜 v0.1

_상태: working draft / canonical planning bridge_  
_대상: 지호님, 플로라, Codex, Claude Code, 향후 개발 에이전트_

## 1. 이 문서의 역할

이 문서는 PRESSCO21에서 플로라를

- `대표 개인 비서`
- `대표 업무 코파일럿`
- `팀 업무 배정/추적 비서`
- `일정 조율과 승인 흐름을 돕는 운영 오케스트레이터`

까지 단계적으로 키우기 위한 **상위 기준 문서**다.

핵심 목적은 새 기획을 하나 더 늘리는 것이 아니라,
이미 있는 PRD, 계획서, 운영 문서, 설치 문서의 역할을 다시 정리해서
앞으로 무엇을 기준으로 진행할지 고정하는 데 있다.

---

## 2. 왜 이 문서가 필요한가

현재 플로라 관련 자료는 이미 많다.
문제는 자료가 부족해서가 아니라, 아래처럼 성격이 다른 문서가 함께 쌓여 있어
나중에 다시 읽을 때 기준선이 흔들릴 수 있다는 점이다.

- 상위 아키텍처 문서
- OpenClaw 복구 계획 문서
- executive-assistant 스펙 문서
- frontdoor 운영 문서
- Mac harness PRD
- 각 프로젝트별 PRD
- 실제 구현/설치/동기화 스크립트

따라서 앞으로는

1. `무엇이 최상위 기준 문서인지`
2. `무엇이 구현 스펙인지`
3. `무엇이 실행 절차 문서인지`
4. `무엇이 과거 복구용 참고 문서인지`

를 분리해서 봐야 한다.

---

## 3. 최종 목표

플로라의 최종 목표는 아래 한 문장으로 정의한다.

> 대표가 두서없이 던진 메모와 회사 운영 이슈를  
> 실행 가능한 업무, 담당자, 승인 흐름, 일정, 브리핑으로 바꾸고  
> 다시 결과까지 추적하는 `회사 종합 오케스트레이션 서비스`를 만든다.

쉽게 말하면:

- 지금은 `정리 잘하는 AI 비서`
- 앞으로는 `업무를 받아서 나누고, 넘기고, 챙기고, 다시 브리핑하는 운영실장`

으로 진화시키는 프로젝트다.

---

## 4. 이번 문서 기준의 최종 서비스 범위

최종적으로 플로라는 아래 5층 구조를 갖는다.

### 4.1 대표 Frontdoor

- 텔레그램에서 자유 메모를 받는다
- 먼저 상황을 한 줄로 정리한다
- 오늘 우선순위와 다음 행동을 제안한다
- 필요 시 전문 모드 또는 실행 경로로 넘긴다

### 4.2 업무 원장

- 할 일
- 대기 중인 일
- 후속 체크
- 담당자
- 승인 필요 여부
- 관련 프로젝트
- 원문 메모
- 상태 변경 로그

를 한 곳에서 추적한다.

### 4.3 팀 오케스트레이션

플로라는 최소한 아래 역할군의 업무를 나눌 수 있어야 한다.

- 대표 / 지호님
- 웹디자인/디자인기획
- 영상기획
- 물류운영

향후 직원 확장 시에도 같은 모델을 재사용한다.

### 4.4 일정/승인 조율

- 누가 해야 하는지
- 언제까지 봐야 하는지
- 누구 승인이 필요한지
- 대기 중 병목이 어디인지

를 보여준다.

### 4.5 브리핑 계층

- 오늘 꼭 볼 것
- 승인 대기
- 팀별 미완료
- 개발 진행 중
- 일정 충돌/과부하

를 비서형 말투로 요약한다.

---

## 5. 저비용 기준 제품 전략

현재 단계의 기본 전략은 아래로 고정한다.

### 5.1 메인 채널

- 메인 입력 채널은 `Telegram`
- 메인 비서는 `flora-frontdoor`
- 개발 실행은 `server dispatcher -> local dev worker`

### 5.2 UI/UX 고도화 방식

- 별도 SaaS를 새로 만들지 않는다
- Telegram Mini App을 사용해 UI를 덧씌운다
- 기존 `flora-todo-mvp`를 화면 베이스로 최대한 재사용한다

### 5.3 Slack 정책

- Slack은 현재 메인 채널로 채택하지 않는다
- 정말 팀 공유가 필요한 시점에만 `보조 브리핑 채널`로 검토한다
- 현재 단계에서는 텔레그램 하나를 완성하는 편이 비용과 운영 복잡도 측면에서 유리하다

### 5.4 외부 검증 플로우 비교 결론

현재 설계가 실무적으로 맞는지 보기 위해,
널리 쓰이는 업무관리 서비스들의 핵심 플로우를 비교 기준으로 삼는다.

#### A. Asana형 플로우

핵심 패턴:

- request intake
- task/project 생성
- custom field
- rule 자동화
- approval
- timeline

플로라에 주는 시사점:

- 단순 메모 정리만으로는 부족하다
- 요청을 정식 업무로 바꾸는 intake 단계가 필요하다
- owner, due date, priority, approval status 같은 구조 필드가 필요하다
- 나중에는 timeline 또는 일정 레이어가 필요하다

#### B. Linear형 플로우

핵심 패턴:

- triage
- issue
- team
- cycle
- project

플로라에 주는 시사점:

- 개발 실행 큐에는 잘 맞는다
- 하지만 대표 비서/팀 운영 전체를 담기에는 너무 엔지니어링 중심이다
- 따라서 `개발방/개발 요청함`에는 참고하되, 메인 업무 원장 모델로 그대로 쓰지는 않는다

#### C. Trello형 플로우

핵심 패턴:

- quick capture
- inbox/card
- assignee
- due date
- activity log

플로라에 주는 시사점:

- 비전공자가 쓰기 편한 UX는 복잡한 테이블보다 `카드 기반 quick capture`에 가깝다
- Mini App 초기 UX는 Trello처럼 가볍고 단순한 카드/리스트 중심이 맞다

#### D. ClickUp형 플로우

핵심 패턴:

- tasks
- docs
- calendar
- forms
- chat

플로라에 주는 시사점:

- 장기적으로는 `업무 + 문서 + 브리핑 + 캘린더`가 한 레이어에서 연결되는 것이 맞다
- 하지만 ClickUp처럼 처음부터 모든 것을 한 앱에 다 넣으면 복잡도가 급격히 올라간다
- 따라서 1차는 `task ledger + briefing + Mini App`, 2차에 문서/캘린더를 붙인다

#### 최종 비교 결론

플로라의 최적 방향은 아래 조합이다.

- `입력 흐름`은 Telegram frontdoor
- `업무 원장 구조`는 Asana/Trello형
- `개발 요청 흐름`은 Linear형 일부 차용
- `장기 통합 방향`은 ClickUp형 일부 차용

즉,

- 지금 방향은 맞다
- 다만 `메모 -> 업무화 -> 배정 -> 승인 -> 일정 -> 브리핑`의 구조 필드를 더 빨리 붙여야 한다

---

## 5.5 외부 비교 기준으로 추가된 필수 요구사항

외부 검증 플로우와 비교했을 때,
현재 설계에 반드시 추가해야 할 최소 기능은 아래다.

1. `Request Intake`
   - 자유 메모와 정식 업무 요청을 구분하는 진입 레이어
   - Telegram 메시지와 Mini App quick form 둘 다 지원

2. `Assignment`
   - 담당자
   - 담당 팀
   - 전달 시각
   - 현재 상태

3. `Approval`
   - 대표 승인 필요 여부
   - 누가 승인권자인지
   - 승인 전/후 상태

4. `Event Log`
   - 누가 언제 무엇을 바꿨는지
   - 추후 "왜 이렇게 됐는지"를 복구할 수 있어야 한다

5. `Calendar / Schedule Layer`
   - due date만 있는 수준에서 끝내지 말고
   - 일정 충돌과 재확인 시점까지 보여줘야 한다

6. `Update / Briefing Loop`
   - 업무 생성 후 끝나는 것이 아니라
   - 오늘 브리핑, 미완료 브리핑, 승인 대기 브리핑으로 다시 돌아와야 한다

---

## 6. 기존 문서 교통정리

이 문서부터는 아래 우선순위로 문서를 읽는다.

### 6.1 최상위 기준 문서

아래 문서는 앞으로도 계속 살아 있는 상위 기준으로 본다.

1. `03_openclaw_docs/company-integrated-os-architecture.ko.md`
2. `03_openclaw_docs/openclaw-project-hub-canonical-policy.ko.md`
3. `03_openclaw_docs/company-role-permission-model.ko.md`
4. `03_openclaw_docs/flora-orchestration-service-master-plan.ko.md` ← 이 문서

역할:

- source-of-truth 경계
- 계층 구조
- 권한 원칙
- 플로라 종합 서비스 방향

### 6.2 플로라 서비스 기준 문서

아래 문서는 플로라 서비스의 현재 직접 기준으로 본다.

1. `03_openclaw_docs/flora-frontdoor-executive-brief.ko.md`
2. `03_openclaw_docs/flora-specialist-routing-policy.ko.md`
3. `03_openclaw_docs/flora-frontdoor-local-dev-worker-setup.ko.md`
4. `03_openclaw_docs/flora-frontdoor-tuning-log.ko.md`
5. `03_openclaw_docs/openclaw-flora-mac-copilot-harness-prd.ko.md`

역할:

- frontdoor 말투와 운영원칙
- specialist 라우팅
- 로컬/원격 실행 구조
- 튜닝 피드백
- 로컬 프로젝트 인지 하네스

### 6.3 OpenClaw 복구/참고 문서

아래 문서는 중요하지만 성격상 `현재 운영 기준`보다 `구조 복구 참고`에 가깝다.

1. `03_openclaw_docs/openclaw-project-b-recovery-plan.ko.md`
2. `03_openclaw_docs/openclaw-project-b-executive-assistant-spec.ko.md`
3. `03_openclaw_docs/openclaw-project-b-agent-workforce.ko.md`
4. `03_openclaw_docs/openclaw-project-b-design-draft.ko.md`
5. `03_openclaw_docs/openclaw-project-b-*.ko.md`

역할:

- 원래 의도 복원
- squad 구조 참고
- executive-assistant 출력 계약 참고

주의:

- 이 문서들은 앞으로도 참고하지만,
- 현재 실제 플로라 운영 기준은 frontdoor 구조와 이 마스터 플랜에 맞춘다.

### 6.4 프로젝트별 구현 문서

아래는 각 시스템 구현 기준이다.

- `flora-todo-mvp/README.md`
- `offline-crm-v2/package.json`, `offline-crm-v2/AGENTS.md`, CRM PRD
- 파트너클래스 PRD/문서
- n8n workflow 문서

원칙:

- 회사 공통 방향은 허브 문서를 우선
- 구현 세부는 각 프로젝트 문서를 우선

---

## 7. 앞으로 폐기하지 않되, 덮어읽지 말아야 할 것

아래 실수는 금지한다.

1. 새 목표가 생길 때마다 새 PRD를 독립적으로 계속 만들기
2. 같은 개념을 다른 이름으로 반복 문서화하기
3. frontdoor, executive-assistant, owner, secretary, orchestrator를 문서마다 다른 뜻으로 쓰기
4. 플로라 비전 문서와 실제 설치/운영 문서를 섞기
5. todo 앱을 장기 원장인지 임시 앱인지 정하지 않은 채 기능만 계속 붙이기

앞으로 새 문서는 반드시 아래 셋 중 하나로 만든다.

- `상위 기준 문서`
- `구현 스펙 문서`
- `실행/설치/운영 절차 문서`

---

## 8. 용어 통일

앞으로는 아래 용어를 기준으로 통일한다.

### 8.1 Flora Frontdoor

정의:

- 대표의 자유 메모를 가장 먼저 받는 메인 비서
- 텔레그램 메인 ingress
- 정리, 우선순위화, 분류, 첫 응답 담당

### 8.2 Executive Orchestration

정의:

- 회의 준비
- 대표 지시 정리
- 팀 핸드오프 정리
- 승인 필요 항목 분리
- 후속 조치 추적

을 묶어 부르는 상위 업무 레이어

### 8.3 Task Ledger

정의:

- 업무 원장
- task, reminder, follow-up, assignment, approval, event log를 포함하는 운영 원장

현재 후보:

- `flora-todo-mvp`

### 8.4 Dev Execution

정의:

- 실제 개발 실행 경로
- 현재는 `server dispatcher -> local dev worker -> Codex/Claude CLI`

### 8.5 Mini App Workspace

정의:

- Telegram 안에서 비전공자도 쉽게 보는 UI 레이어
- 말하는 채팅창이 아니라, 정리된 업무를 확인하고 버튼으로 처리하는 화면

---

## 9. 최종 서비스의 단계별 진화 경로

### Phase 1. 대표 개인 비서 완성

목표:

- 자유 메모를 정리한다
- 우선순위를 준다
- 개발 요청을 넘긴다
- todo 원장에 적재한다

현재 상태:

- 일부 달성

이번 단계의 완료 기준:

- Telegram 메모 -> frontdoor 정리 -> task ledger 적재 -> 브리핑 반영

### Phase 2. 대표 비서 + 팀 전달 비서

목표:

- 업무를 사람 기준으로 나눈다
- 누구에게 넘겨야 할지 정한다
- 전달문 초안을 만든다

1차 대상 역할:

- 웹디자인/디자인기획
- 영상기획
- 물류운영

완료 기준:

- 하나의 메모에서 담당자별 action item이 나뉜다
- 각 항목에 owner와 deadline 후보가 붙는다

### Phase 3. 팀 업무 오케스트레이션

목표:

- 팀별 inbox/queue를 갖는다
- 승인 대기와 병목을 보이게 한다
- 일정 조율까지 붙인다

완료 기준:

- 대표만 보는 todo가 아니라
- 사람별, 팀별, 승인별 보드가 생긴다

### Phase 4. Telegram Mini App 운영실장 UI

목표:

- 비전공자도 화면으로 쉽게 쓴다
- 채팅은 입력
- Mini App은 확인/처리/조율 화면으로 쓴다

핵심 화면:

1. 홈
2. 빠른 메모
3. 오늘 브리핑
4. 승인 대기
5. 팀별 업무함
6. 개발 요청함

### Phase 5. 회사 종합 오케스트레이션 서비스

목표:

- CRM
- 메이크샵
- 파트너클래스
- 물류
- 콘텐츠
- 문서/회의

를 한 운영 레이어에서 본다.

완료 기준:

- 플로라가 `오늘 회사 기준으로 뭐가 먼저인지`를 사람과 시스템을 함께 보고 말할 수 있다.

---

## 10. 최종 서비스의 핵심 사용자

### 10.1 1차 핵심 사용자

- 장지호

역할:

- owner
- 최고 권한 사용자
- 운영/시스템 관리자
- 초기 제품 튜너

### 10.2 2차 확장 사용자

- 이진선 대표

역할:

- 쉬운 언어 브리핑
- 승인/확인 중심
- 음성/메모 기반 사용

### 10.3 3차 팀 사용자

아래 인원 또는 해당 역할군

- 장다경: 영상기획 팀장
- 이재혁: 물류운영 과장
- 조승해 또는 웹디자인 담당

원칙:

- 처음부터 전원에게 여는 것이 아니라
- 대표/지호님 중심으로 충분히 다듬은 뒤 역할군별로 연다

---

## 11. 핵심 데이터 모델 방향

장기적으로 플로라는 최소 아래 엔터티를 가져야 한다.

### 11.1 업무 엔터티

- task
- reminder
- follow-up
- briefing

### 11.2 사람/팀 엔터티

- staff
- team
- role

### 11.3 오케스트레이션 엔터티

- assignment
- approval
- handoff
- meeting item
- event log

### 11.4 시스템 연결 엔터티

- source system
- project
- source message
- linked record

이 방향은 지금 `flora-todo-mvp`에서 다음 단계로 확장할 때의 기준으로 삼는다.

---

## 12. 당장 하지 말아야 할 구현

1. 여러 메신저를 동시에 메인 채널로 키우기
2. 직원 전용 권한을 처음부터 세밀하게 쪼개기
3. 자동 승인/자동 발신/자동 지시 확정
4. 새 앱을 따로 또 만들어 원장을 분산시키기
5. Mini App부터 화려하게 만들고 실제 오케스트레이션 로직은 비워두기

원칙:

- 먼저 `비서가 실제로 일 정리를 잘하는가`
- 그 다음 `원장에 잘 남는가`
- 그 다음 `사람에게 잘 넘겨지는가`
- 마지막에 `UI가 쉬운가`

순서로 간다.

---

## 13. 다음 구현 우선순위

### Priority 1. Frontdoor -> Task Ledger 닫힌 루프

- 메모를 구조화만 하지 말고 실제 원장까지 적재
- source message와 task를 함께 남김
- 브리핑에서 다시 읽을 수 있게 연결

### Priority 2. 비서형 말투 규칙 고정

- 설명형 답변을 줄인다
- 실제 대표 비서 말투로 통일
- `상황 한 줄 -> 우선순위 -> 위임 -> 다음 행동`

### Priority 3. Assignment/Approval/Event Log 도입

- 개인 todo를 팀 업무 원장으로 올린다

### Priority 4. Telegram Mini App MVP

- 홈
- 빠른 메모
- 오늘 브리핑
- 승인 대기

### Priority 5. 팀별 파일럿

- 디자인/영상/물류 역할군에 제한적으로 열어본다

---

## 14. 이 문서 이후 새 문서 작성 규칙

앞으로 플로라 관련 새 문서를 만들 때는 제목 앞 또는 첫 문단에 아래 중 하나를 반드시 적는다.

- `상위 기준 문서`
- `구현 스펙`
- `운영 절차`
- `참고/복구 기록`

그리고 새 문서는 반드시 이 문서와의 관계를 적는다.

예:

- `이 문서는 flora-orchestration-service-master-plan의 Phase 2 구현 스펙이다`
- `이 문서는 frontdoor 운영 절차 문서다`
- `이 문서는 과거 Project B 복구 참고 문서다`

---

## 15. 현재 결론

플로라 프로젝트는 앞으로 아래 한 줄로 이해하면 된다.

> `Telegram frontdoor + task ledger + team assignment + approval/schedule orchestration + Mini App UI`

즉,

- 말은 텔레그램에서 받고
- 일은 원장에 남기고
- 사람에게 나누고
- 승인과 일정을 조율하고
- Mini App으로 쉽게 쓰게 만드는 것

이것이 앞으로의 기준 방향이다.
