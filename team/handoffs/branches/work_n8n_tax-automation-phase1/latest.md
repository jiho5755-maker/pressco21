---
handoff_id: HOFF-2026-04-30-claude-901
created_at: 2026-04-30T02:23:26+09:00
runtime: claude
owner_agent_id: park-seoyeon-cfo
contributors: [cho-hyunwoo-legal, choi-minseok-cto, han-jihoon-cso, kim-dohyun-coo, jung-yuna-cmo]
scope_type: worktree
project: n8n
worktree_slot: n8n-tax-automation-phase1
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
branch: work/n8n/tax-automation-phase1
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
source_cwd: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
commit_sha: 14d30d8
status: active
promoted_to_global: false
summary: 팀미팅(5명)으로 세무 자동화 설계를 고도화했습니다. 차량 운행일지 방침을 관례 수준으로 조정하고, 텔레그램 봇 DM을 증빙 입력 경로로 확정하고, 머니핀/자비스 DIY 가능성을 분석하여 8개 기능 중 6개 자체 구현 가능을 확인했습니다.
decision: |
  1. 차량 운행일지: 계기판 연 2회 촬영 + 합리적 채우기 (관례 수준)
  2. 텔레그램: 기존 봇(@Pressco21_makeshop_bot) DM에 세무 명령어 추가 (새 그룹 X)
  3. 매출-매입 대사(WF-TAX-009): 매입이 일부만 잡혀서 보류
  4. 세무 SaaS DIY: 세무사 대체 아님, 초안 품질 향상 목적. 8개 중 6개 DIY 가능
  5. fswatch 제거 확정, 텔레그램이 유일한 증빙 입력 경로
  6. NocoDB 별도 베이스(tax_automation) Postgres DB 분리
  7. 홈택스 매입: 분기 1회 엑셀 다운로드 → n8n 파싱 → NocoDB (반자동)
  8. 캐시노트(무료) 가입 → 카드 매입 가시성 즉시 확보 권고
changed_artifacts:
  - (코드 변경 없음 — 팀미팅 + 설계 고도화 세션)
verification:
  - CSO/CFO/CTO/COO/법무 5명 팀미팅 의견 종합 완료
  - 머니핀/자비스 기능 8개 분해 → DIY 가능성 판정 완료
  - 무료/저비용 외부 서비스 조사 완료 (홈택스/캐시노트/오픈뱅킹/공공데이터 등)
open_risks:
  - 세무사 확인 3건 미해결 (중기감면, 고용증대공제 경정청구, 벤츠 감가상각)
  - Oracle n8n → 미니서버 Nextcloud WebDAV 네트워크 경로 미검증
  - 수입신고번호 목록 미확보 (UNI-PASS API049 조회 불가)
  - 홈택스 사업용카드 등록 여부 미확인
  - 구현 0% (설계/고도화만 완료)
next_step: NocoDB tax_automation 베이스 + 3테이블 생성 후, WF-TAX-005(텔레그램 봇 DM 세무 허브) 구현 착수. 선행으로 캐시노트 가입과 홈택스 사업용카드 등록 확인.
learn_to_save:
  - "지호님은 법적 리스크 fm보다 실무 관례 수준의 팁을 선호 — 세무/법무 자문 시 관례적 운영 관점도 함께 제시"
  - "텔레그램 세무 증빙은 봇 DM(1:1) 방식 확정 — 그룹방은 금액 노출 등 민감, 새 봇 불필요"
---

## 담당
박서연님(CFO) 주도, 5명 임원 팀미팅

## 이번 세션 핵심

### 팀미팅 1차: 세무 자동화 고도화
- CSO: 증빙 수집 너머 매출-매입 연결, 인건비/급여 구조화, 정부지원사업 연계 제안
- CFO: 부가세 예상 자동계산, 세금 캘린더(WF-TAX-010), 접대비 소진율 모니터링 제안
- CTO: fswatch 제거, NocoDB 별도 베이스, Nextcloud WebDAV 네트워크 검증 필요 지적
- COO: 원장님/사장님 UX 단순화(사진만 보내기 → OCR 분류), 월말 일괄 정리 제안
- 법무: 운행일지 자동 생성 법적 리스크(상), 스포티지 비용 미계상 현행 유지 권고

### 지호님 방침 확정
- 차량 운행일지: 법적 fm보다 관례 수준으로. 계기판 2회 + 합리적 채우기
- 텔레그램: 기존 봇 DM에 명령어 추가. 원장님도 명령어 정도는 가능
- 매출-매입 대사: 매입 일부만 잡히므로 보류

### 팀미팅 2차: 외부 서비스 + SaaS DIY
- 한국 세무/금융 서비스는 API가 거의 없음 (n8n 연동 가능: UNI-PASS, 공공데이터포털뿐)
- 캐시노트(무료): 카드 매입 가시성 즉시 확보 가능
- 머니핀/자비스 DIY: 8개 기능 중 6개 자체 구현 가능
  - 이미 완료: 매출 수집 (F23)
  - DIY 가능: 매입 수집(반자동), 부가세 예상, 종소세 예상, 급여 계산, 증빙 수집
  - 세무사 영역: 복식부기 확정, 세금계산서 발행
- 핵심: 세무사 대체가 아니라 "영수증 봉투 → 정리된 초안+증빙 폴더" 품질 향상

### 수정된 WF 로드맵 (Phase 1~4)
- Phase 1: WF-TAX-005 텔레그램 허브 + NocoDB 테이블
- Phase 2: 홈택스 엑셀 파싱 + UNI-PASS WF 배포
- Phase 3: 부가세/종소세 예상 + 세금 캘린더 + 접대비 추적
- Phase 4: 급여대장 자동 + 거래처-계정과목 매핑
