# partner-admin-developer 에이전트 메모리

## 현재 관리자 운영 현황 (Phase 2 기준)
- 파트너 승인: curl -X POST .../webhook/partner-approve (수동)
- 클래스 관리: NocoDB GUI 직접 편집
- 정산 현황: NocoDB tbl_Settlements 테이블 직접 조회

## 어드민 개발 우선순위 (계획)
1. 파트너 신청 승인/거부 UI (가장 긴급)
2. 정산 모니터링 대시보드
3. 클래스 상태 관리 UI
4. 파트너 등급 관리

## 메이크샵 관련 제약
- 어드민 페이지도 메이크샵 개별 페이지로 등록 (신규 ID 필요)
- HTML에 css.css, js.js script 태그 포함 금지 (404 발생)
- 관리자 group_level = 9 (메이크샵 관리자 그룹)

## API 연동 패턴
- 파트너 승인: WF-08 POST /partner-approve (Authorization: Bearer pressco21-admin-2026)
- NocoDB 직접 접근은 보안상 금지 → n8n 경유 권장
