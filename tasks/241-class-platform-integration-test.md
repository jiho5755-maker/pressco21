# Task 241: 파트너 클래스 플랫폼 통합 테스트

> **상태**: ✅ 완료
> **규모**: M
> **의존성**: Task 221 ✅, Task 222 ✅, Task 231 ✅, Task 232 ✅
> **에이전트**: `주도` qa-test-expert | `협업` seo-performance-expert, makeshop-planning-expert

## 목표

Phase 2에서 개발된 파트너 클래스 플랫폼 전체를 대상으로 통합 테스트를 수행한다.
고객·파트너·관리자 세 플로우의 E2E 시나리오를 검증하고,
보안·성능·접근성·반응형 기준을 충족하는지 확인한다.

## 대상 파일 (Phase 2 결과물 전체)

| 파일 | 설명 |
|------|------|
| `파트너클래스/목록/Index.html`, `css.css`, `js.js` | 클래스 목록 페이지 (Task 211) |
| `파트너클래스/상세/Index.html`, `css.css`, `js.js` | 클래스 상세 페이지 (Task 212) |
| `파트너클래스/파트너/Index.html`, `css.css`, `js.js` | 파트너 대시보드 (Task 222) |
| `파트너클래스/class-platform-gas.gs` | GAS 백엔드 (Task 201~231) |
| `메인페이지/js.js`, `css.css` | 메인페이지 클래스 진입점 (Task 232) |
| `docs/phase2/partner-academy-guide.md` | 파트너 교육 아카데미 문서 (Task 231) |

## 구현 단계

### 1단계: 고객 플로우 E2E 테스트

- [ ] 시나리오 1: 일반 고객 원데이 클래스 구매
  - 메인페이지 → 클래스 목록 → 클래스 상세 → 예약/결제 → 확인 이메일 → D-3/D-1 리마인더 → 수강 후 후기 작성
- [ ] 클래스 목록 페이지: 필터/검색/정렬 기능 동작 확인
- [ ] 클래스 상세 페이지: 갤러리/커리큘럼/일정 선택/예약 패널 동작 확인
- [ ] 메이크샵 결제 연동: goodsNo 파라미터 정상 전달 확인

### 2단계: 파트너 플로우 E2E 테스트

- [ ] 시나리오 2: 제휴 공방 파트너 전체 플로우
  - 파트너 신청 → 교육 이수 → 강의 등록 → 대시보드 → 예약 현황 → 정산 → 적립금
- [ ] 파트너 대시보드: 4탭(내 강의/예약/수익/후기) 정상 동작
- [ ] 파트너 인증 플로우: 미로그인/비파트너/심사중/활성 상태별 분기
- [ ] 교육 이수 플로우: 퀴즈 제출 → 합격/불합격 이메일 발송

### 3단계: 보안 테스트

- [ ] 비인가 접근 차단: 파트너 대시보드 비파트너 접근 시 차단 확인
- [ ] GAS 관리자 엔드포인트: ADMIN_API_TOKEN 없이 접근 시 차단 확인
- [ ] querySelector injection 방지 (후기 답변 모달)
- [ ] URL 파라미터 검증 (class_id whitelist, date format)
- [ ] XSS 방어: escapeHtml, sanitizeText 적용 확인
- [ ] URL XSS 방지: sanitizeUrl_ (portfolio_url, instagram_url)

### 4단계: 성능 및 접근성 테스트

- [ ] Lighthouse Performance: 85+ 목표
- [ ] Lighthouse Accessibility: 90+ 목표
- [ ] Core Web Vitals: LCP, CLS, FID 측정
- [ ] GAS API 응답 시간: 평균 2초 이내
- [ ] localStorage 캐시 동작 확인 (목록 1h, 상세 5min, 메인 30min)
- [ ] IntersectionObserver 지연 로드 동작 확인

### 5단계: 반응형 테스트

- [ ] PC (1200px+): 레이아웃 정상
- [ ] 태블릿 (768~992px): 그리드 축소 정상
- [ ] 모바일 (480px 이하): sticky 예약 패널/하단 바 정상
- [ ] 파트너 대시보드: 4단계 반응형 (480/768/992/1200px)

### 6단계: API 호출 예산 검증

- [ ] 메이크샵 API 호출: 시간당 500회 이내 (한도 10% 미만 예측치 확인)
- [ ] GAS MailApp 일 100건 이내 (이메일 발송 로그 모니터링)
- [ ] CacheService TTL 적정성 확인 (클래스 5분, 카테고리 6시간)

### 7단계: 에러 핸들링 테스트

- [ ] GAS_URL 미설정 시 graceful 처리 (섹션 조용히 숨김)
- [ ] GAS 응답 실패(network error) 시 사용자 안내 메시지
- [ ] Sheets 동시 쓰기 충돌: LockService 시나리오
- [ ] 정산 FAILED 재시도: retryFailedSettlements 시나리오

### 8단계: 테스트 체크리스트 문서화

- [ ] `docs/test-checklists/phase2-integration-test.md` 작성
  - 각 시나리오별 단계별 테스트 항목 (수동/자동)
  - 합격 기준 명시
  - 배포 전 최종 점검 체크리스트

## 수락 기준

- [ ] 고객/파트너 플로우 E2E 테스트 시나리오가 상세히 문서화됨
- [ ] 보안 취약점 점검 항목이 모두 통과됨
- [ ] Lighthouse Performance 85+, Accessibility 90+ 달성 방법이 제시됨
- [ ] API 호출 예산이 메이크샵 한도 이내임이 확인됨
- [ ] `docs/test-checklists/phase2-integration-test.md` 파일 생성됨

## 테스트 체크리스트

- [ ] 클래스 목록 필터/검색 정상 동작 확인
- [ ] 클래스 상세 일정 선택 → 예약 버튼 활성화 확인
- [ ] 파트너 인증: 가상태그 → GAS 인증 → 대시보드 표시
- [ ] 교육 이수: 퀴즈 제출 → 합격 이메일 자동 발송
- [ ] 보안: 비인가 접근 차단, XSS 방어, URL 검증
- [ ] 성능: Lighthouse 기준 달성
- [ ] 반응형: PC/태블릿/모바일 전체 확인
