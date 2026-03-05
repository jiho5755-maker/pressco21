# security-hardening-expert 에이전트 메모리

## 현재 보안 구성
- 관리자 토큰: ADMIN_API_TOKEN (.secrets.env 참조, WF-08 n8n 환경변수)
- CORS 허용: foreverlove.co.kr, www.foreverlove.co.kr
- NocoDB Token: 프론트엔드에 노출 금지 (n8n 경유 필수)

## WF-CRM-PROXY 아키텍처 (2026-03-05 설계)
- 워크플로우: `파트너클래스/n8n-workflows/WF-CRM-PROXY-nocodb-proxy.json`
- 경로: POST /webhook/crm-proxy
- 인증: x-crm-key 헤더 (n8n 환경변수 CRM_API_KEY와 대조)
- 화이트리스트: customers/products/invoices/items/suppliers/txHistory
- txHistory는 읽기 전용 강제 (쓰기 요청 시 403)
- limit 상한: 200 (DoS 방지)
- recordId 숫자만 허용 (injection 방지)
- NocoDB Credential: id=JmXQGe9254wG4qVZ

## 키 로테이션 필요
- NocoDB 토큰 `SIxKK9...LGFl`: git history에 평문 노출 확인 (offline-crm/app.js 라인6)
  → 프록시 배포 후 반드시 재발급 필요
- 재발급 후: n8n Credential만 업데이트, 프론트엔드 코드 변경 불필요

## CRM API 보안 계층
```
React/Vanilla JS
  → x-crm-key 헤더 (CRM 전용 별도 키)
  → n8n WF-CRM-PROXY (테이블/메서드 화이트리스트 검증)
  → NocoDB (xc-token, n8n Credential에만 존재)
```

## 파트너 인증 플로우
1. 메이크샵 가상태그 <!--/user_id/--> 서버사이드 렌더링
2. JS에서 DOM 읽어 member_id 추출
3. n8n WF-02에 POST → tbl_Partners 조회
4. is_partner: true/false 반환

## 알려진 취약점
- member_id 위조 가능성: 프론트에서 읽은 값을 POST → 개발자도구로 조작 가능
  → 개선안: n8n에서 memberId 유효성 + NocoDB 매칭 이중 검증
- ADMIN_API_TOKEN 고정값: 주기적 교체 권고
- n8n 웹훅 URL 단순 경로: rate limiting 미적용

## 메이크샵 보안 특수 사항
- innerHTML 사용 시 DOMPurify 적용 권장
- eval(), Function() 사용 절대 금지
- 메이크샵 에디터 코드만 이스케이프 필요 (Vite 프로젝트는 불필요)

## 수정된 파일 목록 (CRM-009 보안)
- `offline-crm-v2/src/lib/api.ts`: 프록시 경유 전환 완료
- `offline-crm-v2/src/lib/constants.ts`: NocoDB 토큰/URL/projectId 제거
- `offline-crm-v2/.env.local`: VITE_N8N_WEBHOOK_URL + VITE_CRM_API_KEY
- `offline-crm/app.js`: 하드코딩 토큰 제거, 프록시 래퍼 적용
- `파트너클래스/n8n-workflows/WF-CRM-PROXY-nocodb-proxy.json`: 신규 생성
