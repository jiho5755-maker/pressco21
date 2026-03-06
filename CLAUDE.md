# PRESSCO21 프로젝트 CLAUDE 지침

## AI handoff first

이 저장소와 하위 폴더에서 작업을 시작하기 전에 반드시 루트의 `AI_SYNC.md`와 `git status --short`를 먼저 확인하세요.

- `AI_SYNC.md`의 `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일 수정 금지
- 첫 수정 전에 `AI_SYNC.md`의 `Session Lock`과 `Files In Progress` 갱신
- 작업 종료 전 `Last Changes`와 `Next Step` 갱신
- `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행

## 백업/참조용 폴더 (수정 금지)

다음 폴더들은 리뉴얼 전 원본 백업입니다. 절대 수정하지 마세요:
- `메인페이지/기존 코드/` — 메인페이지 리뉴얼 전 원본
- `간편 구매/기본코드/` — 간편 구매 기본형 원본
- `간편 구매/고급형 주문서 작성/` — 간편 구매 고급형 원본

모든 개선 작업은 해당 프로젝트 폴더의 실제 파일에서만 진행합니다.

## 인증키 관리

프로젝트의 모든 인증키(API 토큰, 비밀번호 등)는 루트의 `.secrets.env` 파일에서 중앙 관리합니다.
이 파일은 `.gitignore`에 의해 git에 추적되지 않습니다.

코드/문서에는 키 직접 기재 금지 → `.secrets.env 참조` 또는 `$env.VAR_NAME` 형식으로 대체.

## 메이크샵 HTML 수정 주의사항

- `메인페이지/Index.html`: 원본 가상태그 손상 3곳 존재. 수정 시 파서 검증 오류 발생. 모든 개선은 `js.js` 동적 적용으로.
- HTML에 `<!--/가상태그/-->` 중첩 주의: if_not_soldout 내부 if_login 삽입 시 전체 템플릿 깨짐 확인됨.

## 에이전트 팀 조직도

프로젝트 에이전트 28개(기존 19 + 신규 9) → 글로벌 C-Suite 8개 매핑

### CSO 전략참모실 (글로벌: chief-strategy-officer)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| product-rd-specialist | opus | 신상품 기획, 트렌드, 라인업 전략 |
| overseas-sourcing-specialist | sonnet | 1688 소싱, 관세/통관 |

### CFO 재무본부 (글로벌: chief-financial-officer)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| accounting-specialist | sonnet | 거래명세표, 장부, 세무사 연계 |
| product-cost-analyst | opus | COGS, 환율/관세 |
| sales-margin-strategist | opus | 8채널 마진, 판매가 시뮬레이션 |

### CMO 마케팅본부 (글로벌: chief-marketing-officer)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| content-strategist | opus | 교육 콘텐츠, 캘린더 |
| ad-operations-specialist | sonnet | 광고 운영, ROAS |
| community-manager | sonnet | 커뮤니티, 전환 |
| sales-partnership-specialist | sonnet | B2B 영업, 제휴 |
| brand-planning-expert | opus | 브랜드, 카피 |
| seo-performance-expert | sonnet | SEO, GA4, 성능 |

### COO 운영본부 (글로벌: chief-operating-officer)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| customer-experience-specialist | sonnet | CS 매뉴얼, VOC |
| inventory-logistics-specialist | sonnet | 사방넷 재고, 물류 |
| ecommerce-business-expert | opus | 비즈니스 모델, 정산 |
| devops-monitoring-expert | sonnet | 서버/인프라 |

### CTO 기술본부 (글로벌: chief-technology-officer)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| makeshop-planning-expert | opus | 메이크샵 API 기획 |
| makeshop-ui-ux-expert | opus | UI/UX 구현 |
| makeshop-code-reviewer | opus | 코드 리뷰 |
| class-platform-architect | opus | 파트너클래스 아키텍처 |
| gas-backend-expert | opus | GAS/n8n 백엔드 |
| n8n-debugger | opus | 워크플로우 디버깅 |
| partner-admin-developer | opus | 관리자 UI |
| qa-test-expert | sonnet | QA 테스트 |
| security-hardening-expert | opus | 보안 강화 |
| data-integrity-expert | opus | 데이터 정합성 |

### PM 프로젝트관리실 (글로벌: project-manager)
| 프로젝트 에이전트 | 모델 | 역할 |
|-----------------|------|------|
| development-planner | opus | 로드맵 |
| prd-generator | sonnet | PRD 생성 |
| prd-validator | opus | PRD 검증 |
