# 2026-04-29 세금계산서 통합 롤백 및 순서 보호 핸드오프

- handoff_id: HOFF-20260429-tax-invoice-rollback-sequence-guard
- runtime: codex
- owner_agent_id: yoon-haneul-pm
- branch: main
- created_at: 2026-04-29 13:30 KST

## summary

예치금 작업 이후 세금계산서 CRM UI/n8n 워크플로우가 사용자가 의도한 순서보다 먼저 main에 병합·배포되어, 해당 통합분만 안전하게 되돌렸다. 예치금 작업 결과는 유지한다.

## decision

현재 main은 예치금 최종 병합 상태를 기준으로 되돌렸다. 세금계산서 자동화는 별도 워크트리에서 작업이 완료된 뒤, 사용자가 요청한 순서대로 다시 통합해야 한다.

## changed_artifacts

- git backup branch: `backup/main-before-tax-invoice-rollback-20260429-1319`
- local branchpoint backup: `output/codex-backups/20260429-131923-before-tax-invoice-rollback`
- local branchpoint note: `output/codex-handoffs/20260429-131923-branchpoint-before-tax-invoice-rollback.md`
- main rollback commits:
  - `8b3828d` Revert "Merge work/n8n/barobill-tax-invoice-webhook"
  - `fa7c6c5` Revert "Merge work/offline-crm/barobill-tax-invoice-ui"
- CRM 운영 릴리스: `20260429131417-c291aee`에서 `20260429124305-6b6070a`로 롤백
- n8n workflow `cpETCDf0sSB0wRdb` 비활성화
- n8n 서버 `.env` / `docker-compose.yml`은 BaroBill 적용 전 백업으로 복구

## verification

- `git diff --name-status 8a8e25b..HEAD` 결과 없음: main 파일 트리는 예치금 최종 병합 시점과 동일
- `bash _tools/pressco21-check.sh` 통과
- `cd offline-crm-v2 && npm run lint` 통과
- `cd offline-crm-v2 && npm run build` 통과
- CRM 운영 symlink가 `20260429124305-6b6070a`를 가리키는 것 확인
- `https://n8n.pressco21.com/healthz` HTTP 200 확인
- 세금계산서 n8n webhook은 비활성 상태에서 HTTP 404 확인
- n8n 컨테이너 환경에는 `CRM_API_KEY`만 남고 `BAROBILL_*`는 제거됨 확인

## open_risks

- main 히스토리에는 세금계산서 merge commit과 revert commit이 모두 남아 있다. 따라서 나중에 같은 세금계산서 브랜치를 그대로 `git merge`하면 Git이 이미 병합된 것으로 판단하거나 원래 세금계산서 파일 변경을 다시 적용하지 않을 수 있다.
- 세금계산서 작업 완료 후 통합할 때는 아래 둘 중 하나를 사용한다.
  1. main에서 새 통합 브랜치를 만들고 `fa7c6c5`, `8b3828d`의 revert-of-revert로 세금계산서 변경을 다시 적용한 뒤, 세금계산서 워크트리의 추가 커밋을 병합한다.
  2. main에서 새 통합 브랜치를 만들고 세금계산서 관련 원본 커밋과 추가 커밋을 cherry-pick하여 새 변경 이력으로 만든다.

## next_step

1. 지금은 예치금 관련 정리만 마감한다.
2. `offline-crm-barobill-tax-invoice*`, `n8n-barobill-tax-invoice*` 워크트리는 계속 독립 작업한다.
3. 세금계산서가 별도 워크트리에서 완료되면 위 `open_risks` 절차대로 새 통합 브랜치에서 다시 main에 반영한다.
4. 그 다음 입금수집함 교정/기획 워크트리를 새로 연다.

## learn_to_save

병렬 워크트리가 존재할 때는 사용자가 명시한 순서가 있으면 완료된 워크트리라도 즉시 main 통합·배포하지 않는다. 특히 한 번 main에 merge 후 revert한 브랜치는 이후 재병합이 단순하지 않으므로, 통합 순서 변경 전에는 반드시 활성 worktree와 branch history를 먼저 확인한다.
