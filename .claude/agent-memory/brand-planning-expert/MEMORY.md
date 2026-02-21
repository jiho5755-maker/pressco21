# 브랜드 기획 전문가 메모리

## 진행 상태 (2026-02-21)

### 완료된 산출물
- **Task 212 카피라이팅**: `docs/phase2/class-detail-copy.json` + `class-detail-copy-guide.md` 완료
- **Task 223 파트너 가입/등급 가이드**: `docs/phase2/partner-registration-guide.md` 완료
  - 파트너 가입 자격/절차 4단계
  - 등급별 혜택 상세 (SILVER/GOLD/PLATINUM)
  - 강의 등록 프로세스 (Forms -> 검수 -> 승인 -> 노출)
  - FAQ 5개, UI 마케팅 카피, 브랜드 톤 가이드
- **Task 221 이메일 카피라이팅**: `docs/phase2/email-templates.md` 완료
  - 6종 HTML 이메일 템플릿 (인라인 CSS, max-width 600px)
  - 1: 수강생 예약 확인, 2: D-3 리마인더, 3: D-1 리마인더
  - 4: 후기 요청(+7일, 사진 후기 1,000원 적립금), 5: 파트너 승인
  - 6: 파트너 예약 알림 (수강생 정보 마스킹)
  - GAS 구현 참조: 함수 시그니처, HTML 빌더 패턴, 조건부 블록

### 확정된 브랜드 결정
- **포인트 컬러**: #b89b5e (골드) -- 이메일/UI 공통
- **파트너 등급 UI 표시**: SILVER/GOLD/PLATINUM (수강생 대상)
- **파트너 등급 내부용**: Bloom/Garden/Atelier (파트너 내부, 미확정)
- **이메일 톤**: 초대/권유형 ("~해주세요", "~할게요"), 과도한 판촉 배제
- **이메일 서명**: "PRESSCO21 드림"
- **이메일 헤더**: PRESSCO21 + "Forever and ever and Blooming"

### 다음 작업
- Task 231 (파트너 교육 아카데미): 커리큘럼 기획, 영상 스크립트, 퀴즈 설계
- Task 232 (메인 진입점): CTA 카피, 배너 메시지

## 핵심 규칙
- GAS에서 `${var}` 사용 금지 -> 문자열 연결로 대체
- 모든 동적 값 `escapeHtml_()` 필수 (XSS 방지)
- 이메일 플레이스홀더: `{placeholder}` 형식 (GAS에서 문자열 연결로 치환)
- 이메일 조건부 블록: preparations/partnerContact 값 유무로 표시/비표시
