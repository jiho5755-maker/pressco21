---
handoff_id: HOFF-2026-04-25-telegram-bank-room-governance-execution
enabled: true
created_at: 2026-04-25T10:19:05+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [choi-minseok-cto, park-seoyeon-cfo, cho-hyunwoo-legal]
branch: work/workspace/telegram-bank-room-governance
summary: 원장님 은행·자산 관제방 설계안에 신규 Telegram 방/토픽 ID 확보 계획, 파일럿 계좌 1~2개 역할 기준, 실서비스 변경 전 승인 게이트를 추가했습니다. 라이브 Telegram, n8n, CRM은 변경하지 않았습니다.
decision: 신규 방 이름은 `P21 원장님 은행·자산 관제실`을 기본안으로 하고, 파일럿 A는 기존 CRM 입금 수집에서 검증된 매출입금 계좌의 읽기 복제로 시작합니다. 파일럿 B는 원장님이 보안 채널에서 지정하는 비CRM 운영비/개인/카드성 계좌 1개로 제한합니다. raw 계좌값, chat ID, thread ID, token은 문서/채팅/커밋에 남기지 않습니다.
changed_artifacts:
  - docs/ai-development/telegram-bank-asset-hub-governance-2026-04-25.md
  - team/handoffs/2026-04-25-telegram-bank-room-governance.md
  - team/handoffs/latest.md
verification:
  - 기존 핸드오프 `output/codex-handoffs/20260425-101310-telegram-bank-room-governance.md`를 `bash _tools/codex-resume.sh --handoff ...`로 복원했습니다.
  - 설계 문서에 Telegram-like negative ID와 bot token 형태 문자열이 새로 기록되지 않았는지 스크립트로 확인했습니다.
  - `git diff --check` 통과.
  - `bash _tools/pressco21-check.sh` 통과. 브랜치 scope는 workspace이고 `docs/`, `team/handoffs/` 수정 허용 범위입니다.
open_risks:
  - 실제 신규 방 생성, 토픽 생성, raw ID 확보, 파일럿 계좌 별칭 확정은 아직 수행하지 않았습니다.
  - raw ID와 실제 계좌 식별값은 반드시 보안 채널/비밀 저장소에서만 다뤄야 합니다.
  - 기존 직원 포함 `은행 알림` 방과 CRM 입금 자동화는 계속 변경 금지입니다.
next_step: 원장님과 장지호가 신규 방을 만들고 Topics를 켠 뒤 `00_전체요약`, `99_미분류_검토`, 파일럿 계좌 토픽에 등록 메시지를 1회씩 보내 raw ID를 비밀 저장소에 저장합니다. 그 다음 Gate A 승인 메모를 남기고, 별도 승인 전까지 n8n 운영 WF는 활성화하지 않습니다.
learn_to_save:
  - 금융/Telegram 관제 설계 문서는 raw ID 확보 절차와 실제 값 저장 위치를 분리해야 안전합니다. Git 문서에는 환경변수명과 확보 상태만 남깁니다.
  - CRM 입금 자동화와 자산 관제방은 같은 거래를 볼 수 있어도 책임이 다릅니다. 파일럿은 읽기 복제로 시작하고 CRM 자동반영 호출을 금지해야 합니다.
  - 실서비스 변경 승인은 방/토픽 생성 승인, 파일럿 자동화 연결 승인, 확대 승인으로 나누면 안전합니다.
---

# 원장님 은행·자산 관제방 후속 핸드오프

## 담당
윤하늘님(PM)

## 참여
최민석님(CTO), 박서연님(CFO), 조현우님(법무고문)

## 요약
원장님 은행·자산 관제방 설계안에 실행 기준을 보강했습니다. 핵심은 신규 Telegram 방/토픽 ID를 어떻게 확보할지, 파일럿 계좌를 어떤 역할 기준으로 1~2개만 시작할지, 실서비스 변경 전 어떤 승인을 받아야 하는지입니다.

## 이번 결정
- 신규 방 기본 이름: `P21 원장님 은행·자산 관제실`
- 파일럿 A: 기존 CRM 입금 수집에서 검증된 매출입금 계좌의 읽기 복제
- 파일럿 B: 원장님이 보안 채널에서 지정하는 비CRM 운영비/개인/카드성 계좌 1개
- raw 계좌값, chat ID, thread ID, token은 Git 문서와 채팅에 기록하지 않음
- 기존 `은행 알림` 방, Bank bot 기존 라우팅, CRM 입금 자동화는 변경하지 않음

## 다음 실행
1. 신규 방 생성
2. Topics ON
3. `00_전체요약`, `99_미분류_검토`, 파일럿 계좌 토픽 생성
4. 각 토픽에 등록 메시지 1회 발송
5. raw ID는 비밀 저장소에 저장하고 문서에는 `확보됨`만 기록
6. Gate A 승인 메모 작성
7. 별도 Gate B 승인 전까지 운영 n8n 파일럿 WF 활성화 금지

## 검증
- 설계 문서에 raw Telegram ID/token 형태 문자열이 남지 않았는지 검사했습니다.
- `git diff --check` 통과했습니다.
- `bash _tools/pressco21-check.sh` 통과했습니다.
