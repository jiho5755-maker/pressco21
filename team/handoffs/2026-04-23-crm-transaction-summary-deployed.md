---
handoff_id: HOFF-2026-04-23-crm-transaction-summary-deployed
created_at: 2026-04-23T16:12:00+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [choi-minseok-cto, jung-yuna-cmo, kim-dohyun-coo]
branch: main
worktree_path: /Users/jangjiho/workspace/pressco21
summary: CRM 고객 상세 거래내역에서 적요 첫 줄을 INV 발행번호 대신 거래명세표 품목 요약으로 보여주는 개선을 완료했고, 사용자가 로컬 확인 후 승인하여 운영 CRM에 배포했습니다.
decision: 고객 상세 거래내역의 새 입력 CRM 출고 행은 업무 판독을 위해 품목 요약을 주정보로 표시합니다. 발행번호는 추적성을 위해 보조 텍스트로 유지합니다. 운영 배포는 릴리스형 배포로 진행해 롤백 가능한 release id를 남겼습니다.
changed_artifacts:
  - offline-crm-v2/src/lib/api.ts
  - offline-crm-v2/src/pages/CustomerDetail.tsx
  - team/handoffs/latest.md
  - team/handoffs/2026-04-23-crm-transaction-summary-items.md
verification:
  - 로컬 dev 서버 인증키 주입 후 대시보드 데이터 정상 로드 확인
  - 로컬 고객 상세 /customers/13267 거래내역에서 품목 요약 표시 확인
  - PATH=$HOME/.nvm/versions/node/v22.21.1/bin:$PATH npm run build: 성공
  - PATH=$HOME/.nvm/versions/node/v22.21.1/bin:$PATH npx eslint src/lib/api.ts src/pages/CustomerDetail.tsx: 성공
  - main push 완료: 64aaeba
  - 운영 배포 완료: Release ID 20260423160149-64aaeba
  - 서버 확인: /var/www/crm-current 및 /var/www/crm 모두 /var/www/releases/crm/20260423160149-64aaeba 참조
  - crm-auth.service active, http://127.0.0.1:9100/health ok
  - sudo nginx -t 성공
  - https://crm.pressco21.com 비인증 접근은 login redirect 정상
  - 운영 자동화 키로 /customers/13267 정적 페이지 200 및 /crm-proxy 고객 API 성공 확인
open_risks:
  - 배포 후 사용자가 직접 로그인한 운영 브라우저에서 최종 육안 확인은 아직 대기 중입니다.
  - 전체 npm run lint는 기존 선행 lint debt(App.tsx, Receivables.tsx 등)로 실패합니다. 이번 변경 파일 단독 lint는 통과했습니다.
next_step: 추가 개발 작업은 없습니다. 사용자가 운영 CRM에서 로그인 후 고객 상세 거래내역을 최종 확인하면 오늘 수정은 종료 상태입니다. 문제가 생기면 롤백 명령은 `cd offline-crm-v2 && bash deploy/rollback-release.sh 20260423160149-64aaeba`입니다.
learn_to_save:
  - CRM 로컬 dev 서버는 `.secrets.env`를 source하면 일부 외부 API secret 형식이 set -u와 충돌할 수 있으므로 필요한 `CRM_API_KEY`만 파싱해 `VITE_CRM_API_KEY`로 주입하는 방식이 안전합니다.
  - Codex 앱 내장 Node(v24)는 Rollup 네이티브 모듈 코드서명 충돌을 낼 수 있으므로 CRM 빌드/배포는 nvm Node v22.21.1 PATH를 앞에 두고 실행합니다.
  - 고객 상세 거래내역의 CRM 출고 적요는 발행번호보다 품목 요약을 우선하고, 발행번호는 보조 텍스트로 유지하는 UX가 실무 판독에 적합합니다.
---

## 담당
윤하늘님(PM)

## 참여
최민석님(CTO), 정유나님(CMO), 김도현님(COO)

## 요약
오늘 CRM 거래내역 적요 개선을 완료했습니다. 고객 상세 거래내역의 새 입력 CRM 출고 행에서 `INV-...` 번호가 주정보로 보이던 것을 `고체하바리움2kg 1개 · 솔리드글루200g 1개` 같은 품목 요약으로 바꿨습니다. 발행번호는 아래 보조 텍스트로 유지했습니다.

## 배포
- 운영 URL: https://crm.pressco21.com
- Release ID: `20260423160149-64aaeba`
- 현재 릴리스: `/var/www/releases/crm/20260423160149-64aaeba`
- 롤백: `cd offline-crm-v2 && bash deploy/rollback-release.sh 20260423160149-64aaeba`

## 확인한 것
- 로컬에서 인증키 주입 후 대시보드와 고객 상세 정상 로드 확인
- `/customers/13267` 거래내역 탭에서 품목 요약 표시 확인
- 운영 서버 릴리스 링크, 인증 서비스, nginx 설정 정상 확인
- 운영 자동화 키로 정적 페이지와 CRM API 응답 확인

## 남은 위험
사용자가 운영 CRM에 로그인해서 최종 육안 확인만 하면 됩니다. 코드/배포 관점의 남은 작업은 없습니다.

## 다음
오늘 수정은 마감 상태입니다. 다음 세션은 새 요청이 있을 때 새 worktree에서 시작하면 됩니다.
