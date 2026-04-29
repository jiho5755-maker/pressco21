---
handoff_id: HOFF-2026-04-29-claude-821
created_at: 2026-04-29T19:32:23+09:00
runtime: claude
owner_agent_id: park-seoyeon-cfo
contributors: [cho-hyunwoo-legal, choi-minseok-cto, han-jihoon-cso]
scope_type: worktree
project: n8n
worktree_slot: n8n-tax-automation-phase1
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
branch: work/n8n/tax-automation-phase1
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
source_cwd: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
commit_sha: fae54e1
status: active
promoted_to_global: false
summary: 박서연님(CFO)이 3개년 세무 자료(재무제표, 종소세 신고서, 부가세 신고서, 급여대장, 감가상각명세서) 기반 정밀 절세 컨설팅을 수행하고, 최민석님(CTO)이 세무 증빙 자동화 시스템 아키텍처를 확정했습니다. 조현우님(법무)이 9개 절세 방안의 법적 리스크를 검토했습니다.
decision: 세무 증빙 저장소는 Nextcloud(미니서버)를 사용한다. Google Drive 대신 자체 인프라 활용. 텔레그램 사진 전송 → n8n → Nextcloud 자동 업로드 구조 확정. 차량 운행일지는 연 2회 계기판 기록으로 자동 생성. 스포티지 주유비는 개인부담(비용 미계상).
changed_artifacts:
  - ~/Downloads/종합소득세자료 (2)/2026/11_추가확보자료/차량운행일지/ (4대분 운행일지 생성)
  - 팀미팅 3회 수행 (절세전략, 정밀시뮬레이션, 자동화기획)
verification:
  - 2024년 종소세 신고서 실측 데이터로 시뮬레이션 (과세표준 65,284,323원, 결정세액 7,518,237원 확인)
  - 2025년 부가세 1기+2기 확정 매출 1,160,513,300원으로 추정
  - 해외송금 29건 3.89억원 매입 확인
  - n8n Nextcloud 노드 Upload 기능 존재 확인
  - 미니서버 Tailscale 연결 상태 확인 (pressco21-backup, 100.76.25.105)
open_risks:
  - 중소기업특별세액감면 적용 여부 미확인 (세무사 확인 필요, 미적용 시 연 ~400만원 손실)
  - 고용증대세액공제 2024년 경정청구 가능 여부 미확인 (최대 1,100만원)
  - 벤츠 감가상각 61M 미처리 원인/향후 처리 세무사 확인 필요
  - Nextcloud credential을 n8n에 아직 등록하지 않음
  - NocoDB tax_automation 테이블 미생성 상태
next_step: NocoDB 세무 테이블 3개(tax_documents, tax_imports, tax_vehicles) 생성 후, n8n WF-TAX-005 텔레그램 허브(사진 수신 → Nextcloud 업로드 → NocoDB 저장) 구축 착수.
learn_to_save:
  - 대표는 증빙 수집의 번거로움을 극도로 싫어함 — 텔레그램 한 줄 + 사진이 최대 허용 노력. 이 이상 요구하면 사용 안 함
  - 차량 운행일지 일일 기록 거부 — 연 2회 계기판 기록 + 자동 생성이 수용된 방식
  - 스포티지는 원장님 큰딸(장민아) 사용, 주유비 회사 부담 안 함 — 향후 차량 비용 처리 시 참고
---

## 담당
박서연님(CFO) 주도, 최민석님(CTO) 기술 설계, 조현우님(법무) 리스크 검토

## 세션 내용

### 1. 절세 컨설팅 (3개년 실측 데이터 기반)

2024년 확정 재무:
- 매출 9.46억, 소득금액 6,978만원, 과세표준 6,528만원(24%), 납부세액 295만원
- 노란우산공제 300만원 적용 중이었으나 해지함

2025년 추정:
- 매출 11.61억 (+22.7%), 해외송금 매입 3.89억(29건)
- 소득율 6% 가정 시 과세표준 ~7,813만원(24%), 납부액 ~648만원
- 소득율 7.3% 가정 시 과세표준 ~9,322만원(35%), 납부액 ~1,063만원
- 중소기업특별세액감면 10% 적용 가정 포함

### 2. 절세 방안 9개 도출 + 법적 리스크 판정

| 방안 | 절감액 | 법무판정 |
|------|--------|---------|
| 중소기업특별세액감면 | ~400만 | 합법 |
| 고용증대세액공제(2024경정) | ~700-1,100만 | 주의 |
| 접대비 한도 활용 | ~350만 | 주의 |
| 경조사비 | ~175만 | 주의 |
| IRP(원장님) | ~119만 | 합법 |
| 인적공제 추가 | ~52-105만 | 합법 |
| 차량 운행일지 | ~120만 | 주의 |

### 3. 자동화 시스템 아키텍처 확정

- 저장소: Nextcloud(미니서버) — Google Drive 대신 자체 인프라
- NocoDB: tax_documents, tax_imports, tax_vehicles 3개 테이블
- n8n WF: TAX-001~008 (UNI-PASS, 텔레그램허브, 폴더감시, 리마인더, 패키징 등)
- 텔레그램 명령어: /접대, /경조사, /차량, /기부, /세무현황
- 차량 운행일지: 연 2회 계기판 → 자동 생성

### 4. 인터뷰 결과 확정사항

- 접대비: 카드 결제 + 텔레그램 즉시 기록 방식
- 차량: 레이(업무), 벤츠/카니발(겸용), 스포티지(큰딸, 주유비 개인부담)
- IRP: 원장님(65세) 명의로 가입 의미 있음 (바로 연금 수령 가능)
- 경조사: 최대한 채울 의향 (연 40-50건, 800-1,000만원)
- 기부: 매년 할 의향, 소득금액 30% 한도 (2,100-3,000만원)
- 법인전환: 장기적으로 검토, 승계(지호님) 포함 복합 플랜 필요

## 세무사 상담 체크리스트

1. 중소기업특별세액감면 적용 여부 확인
2. 고용증대세액공제(송미, 2024.11입사) 2024년 적용 여부 → 미적용 시 경정청구
3. 벤츠 감가상각 61M 미처리 원인
4. 해외송금 29건(3.89억) 매입원가 전부 반영 확인
5. 차량 운행일지 제출 시 추가 비용 인정 범위
6. 법인 전환 시기 상담
