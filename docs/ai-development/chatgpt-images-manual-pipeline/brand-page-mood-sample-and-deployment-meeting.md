# 브랜드페이지 무드샘플 이미지 + 배포 구조 팀회의

작성일: 2026-04-23  
대상: `브랜드스토리/브랜드페이지/`  
운영 참고 URL: https://jiho5755-maker.github.io/brand-intro-page/%EB%B8%8C%EB%9E%9C%EB%93%9C%ED%8E%98%EC%9D%B4%EC%A7%80/

## 0. 회의 결론

사진 원본을 아직 못 고른 상태라면, 바로 실물 사진 리디자인에 들어가지 말고 **덕테이프 무드샘플 6장**을 먼저 만든다. 이 샘플은 운영 반영용이 아니라 “이 페이지가 어떤 사진 언어로 가야 하는지”를 보는 시안이다.

배포는 현재 GitHub Pages URL을 계속 최종 운영처럼 쓰기보다 아래 2단 구조가 안전하다.

1. **리디자인 프리뷰/검수용**: Cloudflare Pages 또는 Netlify Preview
2. **최종 운영용**: 메이크샵 브랜드페이지 + CDN 이미지 경로

GitHub Pages는 임시 참고/히스토리 용도로만 두는 편이 좋다.

## 1. 지금 바로 만들 무드샘플 6장

| 순서 | 샘플명 | 목적 | 최종 사용 여부 |
|---|---|---|---|
| 1 | Heritage Hero Mood | 첫 화면 방향성 확인 | 최종 반영 전 실물 기반으로 재작업 |
| 2 | Pressed Flower Research Table | 철학/연구 톤 확인 | 실물 압화 사진 기반으로 재작업 |
| 3 | Transparent Specimen Studio | 혁신 섹션 조명/배경 확인 | 실제 투명 표본 사진 기반으로 재작업 |
| 4 | Education Hands Moment | 교육 섹션 손/작품 구도 확인 | 실제 교육 사진 있으면 대체 |
| 5 | Publications Archive Table | 저서 섹션 편집사진 방향 확인 | 실제 책 표지 기반으로 재작업 |
| 6 | Gallery Catalog System | 갤러리 썸네일 통일 규칙 확인 | 실제 gallery 원본 기반으로 재작업 |

주의: 무드샘플에는 실제 수상, 실제 기관, 실제 인물, 실제 책 제목, PRESSCO21 로고를 넣지 않는다. 방향성만 본다.

## 2. ChatGPT Images 2.0 무드샘플 프롬프트

아래 프롬프트는 ChatGPT Pro 웹/앱에서 그대로 붙여넣는다. 가능하면 `Images with thinking`이 가능한 모델 흐름에서 사용한다.

### 2-1. Heritage Hero Mood

```text
Create a premium editorial hero image for a Korean pressed-flower craft heritage brand.
This is a mood sample only, not a real documentary photo.
Scene: a quiet archive-like flower craft studio table, preserved pressed flowers, old notebooks, delicate tools, soft natural light, subtle sage green and cream palette.
Mood: 26 years of craftsmanship, long-term botanical research, warm but highly professional, understated luxury.
Composition: wide 16:9 hero image, main visual on the right, clean negative space on the left for Korean headline text to be added later.
No text, no logo, no certificate, no real institution names, no people’s faces.
Avoid fantasy flowers, over-saturated colors, plastic texture, fake luxury, excessive glow.
Photorealistic, refined, calm, premium Korean brand editorial style.
```

### 2-2. Pressed Flower Research Table

```text
Create a photorealistic mood image for a pressed-flower research and craftsmanship section.
This is a mood sample only.
Scene: close-up of pressed flowers arranged on archival paper, tweezers, a small glass dish, handwritten botanical notes with no readable text, warm natural light from a window.
Mood: sincere, quiet, handmade, years of practice, delicate Korean craft.
Composition: 4:5 vertical image for a brand story section, enough blank space on one side for layout text.
No readable words, no logo, no fake certificates, no human face.
Keep flowers realistic, not fantasy; avoid artificial neon colors.
```

### 2-3. Transparent Specimen Studio

```text
Create a clean studio mood image for transparent botanical specimen technology.
This is a mood sample only.
Scene: a transparent preserved plant specimen in clear acrylic or glass-like material, placed on a minimal cream background with soft shadow and controlled reflection.
Mood: precise, scientific, elegant, public-institution quality, calm trust.
Composition: 1:1 square, subject centered, minimal background.
No text, no fake patent number, no institution logo, no certificate mark.
Avoid sci-fi look, avoid unrealistic glowing plants, avoid plastic-looking flowers.
Photorealistic product/editorial style.
```

### 2-4. Education Hands Moment

```text
Create a warm editorial mood image for a pressed-flower education section.
This is a mood sample only, not an actual class record.
Scene: adult hands gently arranging pressed flowers on paper at a workshop table, simple tools nearby, soft daylight, finished small craft piece visible.
Mood: learning, growth, care, warm teaching, accessible craft.
Composition: 4:5 vertical image, hands natural and anatomically correct, no faces.
No text, no logo, no real classroom name, no fake students.
Avoid exaggerated hands, too many objects, messy background.
Photorealistic and natural.
```

### 2-5. Publications Archive Table

```text
Create a premium editorial mood image for a publications/books section of a flower craft brand.
This is a mood sample only.
Scene: several neutral blank craft books on a cream table, pressed flowers, thin paper, a magnifying glass or small tool, soft archive lighting.
Mood: published expertise, accumulated knowledge, calm authority.
Composition: 1:1 square or 4:5 vertical, books as elegant objects, no readable book titles.
No text, no real book cover, no logo, no fake publisher name.
Avoid random letters or gibberish on books; use blank covers or unreadable abstract cover texture.
```

### 2-6. Gallery Catalog System

```text
Create a mood sample for a curated pressed-flower artwork gallery grid.
This is not a real artwork record; it is a visual direction sample.
Scene: four framed pressed-flower artworks displayed like a premium exhibition catalog, consistent cream background, soft shadows, balanced spacing.
Mood: curated, museum-like, refined, delicate botanical art.
Composition: square 1:1 image showing a consistent gallery thumbnail system.
No readable text, no logo, no fake artist signature.
Avoid overly ornate frames, fantasy flowers, inconsistent lighting.
Photorealistic catalog/editorial style.
```

## 3. 무드샘플을 보고 결정할 것

무드샘플 6장을 만든 뒤 아래만 판단한다.

1. Hero는 밝은 아카이브 톤이 좋은가, 어두운 장인정신 톤이 좋은가?
2. 압화 연구 이미지는 손이 있는 게 좋은가, 손 없이 재료 중심이 좋은가?
3. 투명 표본은 제품사진처럼 미니멀한가, 연구실 맥락이 있는가?
4. 교육 섹션은 실제 현장감이 필요한가, 손 중심 클로즈업이 충분한가?
5. 저서 섹션은 책 표지 그대로 보여줄지, 책을 오브젝트화할지?
6. 갤러리는 작품을 크게 보여줄지, 전시 카탈로그처럼 통일할지?

## 4. 배포 구조 팀회의

### 4-1. 현재 확인된 상태

- 운영 URL은 `jiho5755-maker.github.io/brand-intro-page/...` 형태의 GitHub Pages로 보인다.
- 현재 pressco21 worktree의 로컬 프로젝트는 `브랜드스토리/브랜드페이지/`다.
- 이 로컬 폴더에는 `images/` 폴더가 없고 HTML/CSS/JS만 있다.
- 별도 `/Users/jangjiho/workspace/pressco21/archive/brand-intro-page`는 `brand-intro-page.git`을 origin으로 가진 Git repo지만, 현재 삭제/수정 상태가 많아 바로 배포 소스로 쓰기 위험하다.

### 4-2. 배포 대안 비교

| 대안 | 장점 | 단점 | 회의 판단 |
|---|---|---|---|
| GitHub Pages 유지 | 이미 URL 있음, 단순 정적 페이지 가능 | GitHub 공식 문서상 온라인 비즈니스용 무료 웹호스팅 목적은 아님, 1GB/100GB/10 builds soft limit, 이미지 많은 브랜드 페이지 관리 약함 | 임시 preview/히스토리 용도 |
| GitHub Pages 정리 후 계속 사용 | 기존 repo 활용 가능 | 별도 repo가 dirty하고 monorepo source와 drift 가능 | 정리 비용 대비 이점 낮음 |
| Cloudflare Pages | 정적 페이지/CDN에 강함, 무료 플랜 500 builds/month, preview deployments, custom domain, 파일 20,000개/25MiB 제한 | 초기 연결 필요 | 추천 preview/브랜드 랜딩 호스팅 후보 |
| Netlify | Drag & Drop과 Git 배포가 쉬움, 디자이너 수동 preview에 좋음 | 장기 운영 시 계정/플랜 관리 필요 | 디자이너 검수 preview에 좋음 |
| Vercel | PR preview/rollback 강함 | 순수 HTML/CSS 페이지에는 다소 과함 | 향후 Next/Astro 전환 시 후보 |
| 메이크샵 + CDN | 자사몰 전환/SEO/운영 일관성에 최적 | 배포 자동화/preview가 약함 | 최종 운영 권장 |

## 5. 추천 배포 아키텍처

### 추천안: “Cloudflare/Netlify Preview + 메이크샵 최종 반영”

```text
pressco21 repo
  ↓
브랜드스토리/브랜드페이지/에서 로컬 작업
  ↓
Cloudflare Pages 또는 Netlify로 preview 배포
  ↓
대표/디자이너/운영 검수
  ↓
이미지는 CDN 업로드
  ↓
메이크샵 브랜드페이지에 최종 HTML/CSS/JS/CND 경로 반영
```

### 이유

- 브랜드스토리는 자사몰 안에서 보여야 전환과 신뢰가 이어진다.
- GitHub Pages는 현재 preview로는 쓸 수 있지만 최종 운영 URL로 계속 쓰기에는 비즈니스/자산 관리 측면에서 애매하다.
- Cloudflare/Netlify preview를 두면 디자이너가 이미지 시안을 올려보고, 대표가 링크로 확인한 뒤, 승인본만 메이크샵에 반영할 수 있다.

## 6. 지금 당장 하면 안 되는 것

- dirty 상태인 `archive/brand-intro-page` repo에서 바로 push하지 않는다.
- GitHub Pages URL을 최종 운영 URL로 확정하지 않는다.
- 실제 사진 없이 만든 무드샘플을 사실 증빙 섹션에 그대로 쓰지 않는다.
- 메이크샵 운영 페이지를 preview 없이 바로 갈아엎지 않는다.
- 이미지 파일을 한글 파일명으로 업로드하지 않는다.

## 7. 안전한 2단계 마이그레이션

### Phase 1 — 무드샘플 + Preview 정리

1. 무드샘플 6장 생성
2. 방향성 승인
3. `브랜드스토리/브랜드페이지/images/` 구조 생성
4. 로컬 preview 확인
5. Cloudflare Pages 또는 Netlify에 preview 배포

### Phase 2 — 실물 기반 최종 이미지 + 메이크샵 반영

1. 실제 원본 사진 선정
2. 승인된 무드 방향으로 사진 기반 리디자인
3. WebP/PNG 최적화
4. CDN 업로드
5. 메이크샵 페이지에 CDN 경로 반영
6. 운영 URL QA

## 8. 공식 근거 메모

- GitHub Pages limits: GitHub Pages는 사용량 제한이 있고, 온라인 비즈니스/e-commerce 웹호스팅 목적이 아님을 명시한다. https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Pages limits: Free plan에서 월 500 builds, 20,000 files, 단일 파일 25 MiB, preview deployments 지원. https://developers.cloudflare.com/pages/platform/limits/
- Netlify deploys: Git 연동 배포와 drag-and-drop 수동 배포를 지원한다. https://docs.netlify.com/deploy/create-deploys/
- Vercel for GitHub: GitHub push/PR마다 preview URL과 production domain 업데이트, rollback을 제공한다. https://vercel.com/docs/git/vercel-for-github

## 9. 다음 행동

1. 위 6개 무드샘플 프롬프트를 ChatGPT Pro에서 각 1장씩 만든다.
2. 6장을 한 화면에 놓고 Hero/기술/교육/저서/갤러리 방향성을 고른다.
3. 선택한 방향에 맞춰 실제 원본 사진을 찾는다.
4. 배포는 우선 Netlify Drag & Drop 또는 Cloudflare Pages preview 중 하나를 선택한다.
5. 최종 운영은 메이크샵 + CDN 반영으로 둔다.
