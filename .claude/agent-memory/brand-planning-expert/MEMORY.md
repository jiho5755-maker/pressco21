# 브랜드 기획 전문가 메모리

## 진행 상태 (2026-02-25)

### 완료된 산출물
- **Task 212 카피라이팅**: `docs/phase2/class-detail-copy.json` + `class-detail-copy-guide.md` 완료
- **Task 223 파트너 가입/등급 가이드**: `docs/phase2/partner-registration-guide.md` 완료
- **Task 221 이메일 카피라이팅**: `docs/phase2/email-templates.md` 완료 (6종 HTML)
- **Task 231 파트너 교육 아카데미**: `docs/phase2/partner-academy-guide.md` 완료
- **종합 브랜드 전략 문서**: `docs/phase2/brand-strategy-comprehensive.md` 완료 (2026-02-25)
  - 파트너 프로그램 네이밍: "PRESSCO21 블룸 파트너" 권고
  - 파트너 호칭: "꽃 선생님" (수강생 대면), "파트너 선생님" (공식)
  - 등급 하이브리드 방식: 수강생 SILVER/GOLD/PLATINUM + 파트너 Bloom/Garden/Atelier
  - 파트너 가입 여정 5단계 설계 (신청->검토->승인/거절->교육->활동)
  - 거절 커뮤니케이션 가이드 ("보완 필요" 프레임, 거절 단어 미사용)
  - 신규 이메일 2종: 신청 접수 확인(#7) + 교육 합격(#8)
  - 텔레그램 알림 4종: 신청/예약/정산완료/정산실패
  - 파트너 대시보드 UI 카피: 탭 명칭, 빈 상태, 수익 리포트, 인증 상태별
  - 클래스 목록/상세 카피: 검색없음, 마감임박, CTA 변형, 예약완료

### 확정된 브랜드 결정
- **프로그램 명칭 권고**: PRESSCO21 블룸 파트너 (Bloom Partner) -- 사용자 확정 대기
- **파트너 호칭 권고**: 꽃 선생님 / 파트너 선생님 -- 사용자 확정 대기
- **등급 하이브리드 권고**: 수강생=SILVER/GOLD/PLATINUM, 파트너=Bloom/Garden/Atelier
- **포인트 컬러**: #b89b5e (골드) -- 이메일/UI 공통
- **이메일 톤**: 초대/권유형, 과도한 판촉 배제
- **이메일 서명**: "PRESSCO21 드림"
- **이메일 헤더**: PRESSCO21 + "Forever and ever and Blooming"
- **거절 톤**: "보완 필요" 프레임, "거절/부적합/미달" 단어 사용 금지

### 다음 작업
- Phase 3 착수 시: Task 302 수업 기획 UI 카피, Task 311 리뷰 허브 카피

## 핵심 규칙
- GAS에서 `${var}` 사용 금지 -> 문자열 연결로 대체
- 모든 동적 값 `escapeHtml_()` 필수 (XSS 방지)
- 이메일 플레이스홀더: `{placeholder}` 형식
- 이메일 조건부 블록: preparations/partnerContact 값 유무로 표시/비표시
- 텔레그램 메시지: `[유형]` 태그로 첫 줄 시작, 관리자용이므로 실용 톤
- CTA 버튼: 마감임박 시에도 "서두르세요" 금지, 정보 전달만
