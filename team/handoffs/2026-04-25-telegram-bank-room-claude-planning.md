---
handoff_id: HOFF-2026-04-25-telegram-bank-room-claude-planning
enabled: true
created_at: 2026-04-25T10:32:19+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [choi-minseok-cto, park-seoyeon-cfo, cho-hyunwoo-legal]
branch: work/workspace/telegram-bank-room-governance
summary: 원장님 은행·자산 관제방 안건을 Codex 팀미팅으로 검토했고, 전원 조건부 찬성 결론을 냈습니다. Gate A(신규 방/토픽 생성과 더미 등록 메시지)는 진행 가능하나, Gate B(실거래 자동화 연결)는 Claude Code 팀미팅에서 더 정교한 기획 후 별도 승인하는 것이 좋습니다.
decision: 방 분리 방향은 타당합니다. 다만 실거래 연결 전 전용 Finance bot, 최소 원장/중복방지 저장소, raw 값 무기록 원칙, n8n 로그/스크린샷/임시파일 노출 방지, 7일 파일럿 정량 중단 기준을 보강해야 합니다. 기존 직원 포함 `은행 알림` 방, 기존 Bank bot 라우팅, WF-CRM 입금 자동반영 엔진, 기존 CRM 메시지 포맷은 계속 변경 금지입니다.
changed_artifacts:
  - docs/ai-development/telegram-bank-asset-hub-governance-2026-04-25.md
  - team/handoffs/2026-04-25-telegram-bank-room-governance.md
  - team/handoffs/2026-04-25-telegram-bank-room-claude-planning.md
  - team/handoffs/latest.md
verification:
  - Codex 팀미팅: 윤하늘님(PM), 최민석님(CTO), 박서연님(CFO), 조현우님(법무고문) 관점 검토 완료.
  - 팀미팅 결론: 전원 조건부 찬성, Gate A 진행 가능, Gate B는 보강 후 별도 승인.
  - 이전 커밋 `8f2e7f4 [codex] 은행 자산 관제 실행 기준 보강`에서 실행 기준 문서화 완료.
  - raw Telegram ID/token 형태 문자열은 문서에 기록하지 않는 원칙을 유지해야 합니다.
open_risks:
  - 실제 신규 방 생성, 토픽 생성, raw ID 확보, 파일럿 계좌 별칭 확정은 아직 수행하지 않았습니다.
  - 팀미팅 결과상 현재 문서만으로는 Gate B 실거래 자동화 연결을 바로 진행하지 않는 것이 맞습니다.
  - Claude Code가 상세 기획 시에도 금융정보, 토큰, chat/thread ID 원문을 문서·채팅·커밋·스크린샷에 남기면 안 됩니다.
next_step: Claude Code 팀미팅으로 Gate B 이전 상세 기획을 다시 수행합니다. 특히 원장 선행 여부, 7일 파일럿 정량 기준, 전용 Finance bot 생성/권한, n8n 로그 마스킹과 보존기간, 롤백 절차, Gate A 승인 문구를 재정리한 뒤 대표 승인안을 제안합니다.
learn_to_save:
  - 금융 관제 자동화는 방 생성과 실거래 연결을 반드시 분리 승인해야 합니다.
  - Telegram은 관제 화면일 뿐 정본이 아니며, 실거래 파일럿 전 최소 원장/중복방지 저장소가 필요합니다.
  - 기존 CRM 입금 자동화와 직원 포함 은행 알림방은 불변 경계로 두고, 신규 자산 관제는 전용 bot과 별도 WF로만 다뤄야 합니다.
---

# Claude Code 재기획용 핸드오프

## 담당
윤하늘님(PM)

## 참여
최민석님(CTO), 박서연님(CFO), 조현우님(법무고문)

## Codex 팀미팅 결론
전원 **조건부 찬성**입니다.

괜찮은 안이지만, 바로 실거래 자동화까지 가면 안 됩니다. 지금 승인 가능한 범위는 **Gate A**입니다.

## Gate A에서 가능한 일
- 신규 `P21 원장님 은행·자산 관제실` 방 생성
- Topics ON
- 원장님, 장지호, 전용 Finance bot만 초대
- `00_전체요약`, `99_미분류_검토`, 파일럿 토픽 생성
- 더미 등록 메시지로 토픽 매핑 확인
- raw 값 없는 Gate A 승인 메모 작성

## Gate B 전에 Claude Code가 재기획할 항목
1. 실거래 전 최소 원장/중복방지 저장소를 어떻게 둘지
2. 전용 Finance bot 생성과 권한 범위
3. n8n 실행 로그, 스크린샷, 임시 파일에 raw 값이 남지 않는 방식
4. 7일 파일럿 정량 기준
   - 기존 CRM 영향 1건이라도 즉시 중단
   - 민감정보 노출 1건이라도 즉시 중단
   - 토픽 오배정 반복 시 중단 또는 수동 모드 전환
   - 잔액 불일치가 다음날까지 원인 미확인 상태면 확대 보류
5. 롤백 절차
   - 파일럿 WF 비활성화
   - bot 권한 제거
   - 신규 방 발송 중지
6. 대표 승인 문구
   - Gate A 승인과 Gate B 승인을 명확히 분리

## 절대 변경 금지
- 기존 직원 포함 `은행 알림` 방 설정
- 기존 Bank bot 라우팅
- WF-CRM 입금 자동반영 엔진
- 기존 CRM 메시지 포맷
- raw 계좌번호, 실잔액, token, chat ID, thread ID를 문서·채팅·커밋·스크린샷에 기록
- 승인 전 운영 n8n WF 활성화

## Claude Code에게 넘길 추천 프롬프트

```text
원장님 은행·자산 관제방 설계를 Claude Code 팀미팅으로 다시 기획해줘.
참조 문서:
- docs/ai-development/telegram-bank-asset-hub-governance-2026-04-25.md
- team/handoffs/latest.md

Codex 팀미팅 결론은 전원 조건부 찬성이고, Gate A는 진행 가능하지만 Gate B 실거래 자동화 연결 전 보강이 필요하다는 내용이야.
특히 전용 Finance bot, 최소 원장/중복방지 저장소, n8n 로그 마스킹, 7일 파일럿 정량 기준, 롤백 절차, 대표 승인 문구를 다시 기획해줘.

주의:
- 금융정보·토큰·chat/thread ID 원문 노출 금지
- 기존 직원 포함 은행 알림방과 CRM 입금 자동화는 변경 금지
- 실서비스 변경은 대표 승인 전 금지
```
