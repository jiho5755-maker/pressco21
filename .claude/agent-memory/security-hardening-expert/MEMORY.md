# security-hardening-expert 에이전트 메모리

## 현재 보안 구성
- 관리자 토큰: `pressco21-admin-2026` (WF-08, n8n 환경변수)
- CORS 허용: foreverlove.co.kr, www.foreverlove.co.kr
- NocoDB Token: 프론트엔드에 노출 금지 (n8n 경유 필수)

## 파트너 인증 플로우
1. 메이크샵 가상태그 <!--/user_id/--> → 서버사이드 렌더링
2. JS에서 DOM 읽어 member_id 추출
3. n8n WF-02에 POST → tbl_Partners 조회
4. is_partner: true/false 반환

## 알려진 취약점 (Phase 2 기준)
- member_id 위조 가능성: 프론트에서 읽은 값을 POST로 전송 → 개발자도구로 조작 가능
  → 개선안: n8n에서 memberId 유효성 + NocoDB 매칭 이중 검증
- ADMIN_API_TOKEN 고정값: 주기적 교체 권고

## 메이크샵 보안 특수 사항
- `${var}` → `\${var}` 이스케이프 (치환코드 오인 방지)
- innerHTML 사용 시 DOMPurify 적용 권장
- eval(), Function() 사용 절대 금지
