# PRESSCO21 회사 지식 허브

이 폴더는 PRESSCO21의 모든 회사 지식을 한 곳에서 열람/수정할 수 있도록 모은 곳입니다.

## 마스터 문서 (단일 진실 소스)

**`../company-profile.md`** (773줄)
- 회사 기본정보, 재무, 조직, 제품, 브랜드, CEO 이력 등 전부 포함
- 이 파일이 변경되면 NocoDB, n8n WF, HWPX 스킬에 동기화 필요
- AI가 회사에 대해 알아야 할 때 가장 먼저 읽는 파일

## 이 폴더 구조

```
company-knowledge/
├── README.md              ← 이 파일
├── collection-status.md   ← 회사 정보 수집 현황 체크리스트
│
├── 브랜드/
│   ├── brand-decisions.md              ← 브랜드 컬러/타이포/컴포넌트 확정 기준
│   ├── brand-heritage.md               ← 원장님 브랜드 스토리 8개 앵글
│   ├── brand-strategy-comprehensive.md ← 파트너클래스 브랜드 전략
│   └── member-grade-brand-strategy.md  ← 회원 등급별 브랜드 전략
│
├── 비즈니스전략/
│   ├── business-context.md             ← 고객 세그먼트, 시즌별 상품, 카테고리
│   ├── 마진전략-종합설계서.md             ← 원가/마진 시뮬레이션, 채널별 가격
│   ├── 원가관리체계-완성본.md             ← COGS 구조, SKU, 환율/관세
│   └── PRESSCO21-이커머스-사업전략.md     ← 매출 전략, 3년 비전
│
└── 직원/
    └── staff-profiles.md               ← 전직원 종합 프로필 (인적사항+업무+역량+AI권한)
```

## 수정 규칙

1. **회사 기본정보** (사업자번호, 주소, 직원, 매출 등) → `../company-profile.md`에서 수정
2. **브랜드 기준** (컬러, 폰트, 레이아웃) → `브랜드/brand-decisions.md`에서 수정
3. **가격/마진** → `비즈니스전략/마진전략-종합설계서.md`에서 수정
4. **직원 정보** → `직원/staff-profiles.md`에서 수정

수정 후 원본 위치에도 동기화해야 합니다:
- `브랜드/brand-decisions.md` 원본: `~/.claude/skills/makeshop-developer/references/`
- `비즈니스전략/business-context.md` 원본: `~/.claude/skills/makeshop-developer/references/`
- 나머지는 `pressco21/docs/`에 원본이 있음

> 이 폴더가 **원본**입니다. 다른 위치(skills/references, docs/ 등)에는 심링크가 걸려 있어서
> 여기서 수정하면 모든 곳에 자동 반영됩니다. 별도 동기화 작업 불필요.
