# class-platform-architect 에이전트 메모리

## 플랫폼 현황 (Phase 2 완료 기준, 2026-02-26)

### 확정된 시스템 구성
- **프론트엔드**: 메이크샵 D4 개별 페이지 5개 (2606~2610)
- **백엔드**: n8n 13개 워크플로우 + NocoDB 8개 테이블
- **서버**: Oracle Cloud (158.180.77.201), n8n.pressco21.com / nocodb.pressco21.com

### 핵심 아키텍처 결정 사항
- 모든 n8n 웹훅은 POST 전용
- NocoDB는 n8n HTTP Request 노드로만 접근 (내장 노드 미사용)
- 정산 멱등성: order_id 중복 체크 필수
- 비동기 원칙: 이메일 발송은 데이터 저장 후 실행

### 다음 개발 단계
- Phase 3: 수업 기획 도우미 (Task 301/302)
- 관리자 어드민 페이지 (partner-admin-developer 담당)
- 선행 필요: 메이크샵 편집기 js.js 재저장 4개 페이지
