# 파트너클래스 플랫폼 가이드

> PRESSCO21 파트너 클래스 플랫폼 — 메이크샵 6페이지 + n8n 19개 WF + NocoDB 6개 테이블

## 메이크샵 페이지 ID 매핑

| 폴더 | 메이크샵 페이지 ID | URL | 역할 |
|------|------------------|-----|------|
| `목록/` | 2606 | `/shop/page.html?id=2606` | 클래스 목록 |
| `상세/` | 2607 | `/shop/page.html?id=2607` | 클래스 상세 + 예약 결제 |
| `파트너/` | 2608 | `/shop/page.html?id=2608` | 파트너 대시보드 |
| `파트너신청/` | 2609 | `/shop/page.html?id=2609` | 파트너 신청 폼 |
| `교육/` | 2610 | `/shop/page.html?id=2610` | 파트너 교육 + 퀴즈 |
| `강의등록/` | 8009 | `/shop/page.html?id=8009` | 강의 등록 폼 |

> **URL 규칙**: 항상 절대경로 `/shop/page.html?id=XXXX` 사용. `../폴더/` 상대경로 사용 금지.

## n8n 워크플로우 목록

### 파트너클래스 WF (WF-01~WF-17 + 3개)

| WF | 파일 | 웹훅 경로 | 역할 |
|----|------|---------|------|
| WF-01 | `WF-01-class-api.json` | `POST /class-api` | 클래스 목록/상세 조회 |
| WF-02 | `WF-02-partner-auth-api.json` | `POST /partner-auth` | 파트너 인증/대시보드 |
| WF-03 | `WF-03-partner-data-api.json` | `POST /partner-data` | 파트너 예약/리뷰 조회 |
| WF-04 | `WF-04-record-booking.json` | `POST /record-booking` | 예약 기록 |
| WF-05 | `WF-05-order-polling-batch.json` | 스케줄(5분) | 주문 폴링 + 정산 |
| WF-06 | `WF-06-class-management.json` | `POST /class-management` | 클래스 상태 관리 |
| WF-07 | `WF-07-partner-apply.json` | `POST /partner-apply` | 파트너 신청 접수 |
| WF-08 | `WF-08-partner-approve.json` | `POST /partner-approve` | 파트너 승인 |
| WF-09 | `WF-09-review-reply.json` | `POST /review-reply` | 리뷰 답글 |
| WF-10 | `WF-10-education-complete.json` | `POST /education-complete` | 교육 이수 처리 |
| WF-11 | `WF-11-reserve-process.json` | — | 적립금 지급 |
| WF-12 | `WF-12-email-notification.json` | — | 이메일 알림 |
| WF-13 | `WF-13-telegram-alert.json` | — | 텔레그램 알림 |
| WF-15 | `WF-15-review-submit.json` | `POST /review-submit` | 수강 후기 제출 |
| WF-16 | `WF-16-class-register.json` | `POST /class-register` | 강의 등록 |
| WF-17 | `WF-17-makeshop-auto-register.json` | NocoDB Webhook | 클래스 승인 시 메이크샵 자동 등록 |
| WF-APPROVE | `WF-APPROVE-nocodb-auto-approve.json` | `POST /nocodb-approve` | NocoDB 파트너 승인 처리 |
| WF-REFUND | `WF-REFUND-cancel-booking.json` | `POST /cancel-booking` | 예약 취소/환불 |
| WF-ERROR | `WF-ERROR-handler.json` | — | 에러 핸들러 |

### YouTube 자동화 WF (메인페이지/유튜브 자동화/)

| WF | 역할 |
|----|------|
| WF-YT | YouTube 영상 조회 API |
| WF-YT-SYNC | 채널 영상 동기화 (스케줄) |
| WF-YT-COMMENTS | 댓글 파싱 + 재료 추출 |
| WF-YT-CATALOG | 메이크샵 상품 카탈로그 동기화 |
| WF-YT-AI-MATCH | AI 재료 매칭 (Gemini, 매일 04:00 KST) |

## NocoDB 테이블 구조

**Base ID**: `poey1yrm1r6sthf` (파트너클래스) / `pa0dvaitqtslfrx` (YouTube)

| 테이블 | 모델 ID | 역할 |
|--------|---------|------|
| tbl_Partners | `mp8t0yq15cabmj4` | 파트너 정보, 등급, 수수료율 |
| tbl_Classes | `mpvsno4or6asbxk` | 클래스 정보, 메이크샵 상품 ID |
| tbl_Applications | `mkciwqtnqdn8m9c` | 파트너 신청 접수 |
| tbl_Settlements | `mcoddguv4d3s3ne` | 정산 내역 |
| tbl_Reviews | `mbikgjzc8zvicrm` | 수강 후기 |
| tbl_Settings | `mgde3g9ubqofavz` | 플랫폼 설정 |

## 서버 접속

인증키는 루트 `.secrets.env` 파일 참조.

| 항목 | 주소 |
|------|------|
| n8n | https://n8n.pressco21.com |
| NocoDB | https://nocodb.pressco21.com |
| SSH 호스트 | 158.180.77.201 (`.secrets.env SSH_HOST`) |

## 샘플 클래스 메이크샵 상품 ID (branduid)

| 클래스 ID | branduid | 가격 |
|-----------|----------|------|
| CL_202602_001 | 12195513 | 50,000원 |
| CL_202602_002 | 12195514 | 85,000원 |
| CL_202602_003 | 12195516 | 65,000원 |
| CL_202602_004 | 12195517 | 75,000원 |
| CL_202602_005 | 12195515 | 45,000원 |
| CL_202602_006 | 12195518 | 95,000원 |

## 파트너 등급 체계

| 등급 | 수수료율 | 적립금 지급률 | 조건 |
|------|---------|-------------|------|
| STANDARD | 35% | 65% | 초기 |
| SILVER | 20% | 80% | 승인 후 기본 |
| GOLD | 25% | 75% | — |
| PLATINUM | 30% | 70% | 최고 등급 |

> 상세 문서: `docs/파트너클래스/commission-policy.md`

## 관련 문서

- 플랫폼 개요: `docs/파트너클래스/platform-overview-guide.md`
- 배포 가이드: `docs/파트너클래스/phase2-deploy-guide.md`
- 운영 가이드: `docs/파트너클래스/nocodb-admin-guide.md`
- E2E 테스트: `docs/파트너클래스/phase2-e2e.md`
- 메이크샵 개발 가이드: `docs/makeshop-dev-guide.md`
