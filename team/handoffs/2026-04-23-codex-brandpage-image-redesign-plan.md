---
handoff_id: HOFF-2026-04-23-brandpage-image-redesign-plan
created_at: 2026-04-23T11:36:27+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [han-jihoon-cso, jung-yuna-cmo, choi-minseok-cto]
branch: work/workspace/ai-team-pilot-followup
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot
summary: GitHub Pages 브랜드페이지와 로컬 브랜드스토리/브랜드페이지 구조를 확인하고, ChatGPT Images 2.0(덕테이프) 기반 이미지 리디자인 계획을 팀미팅으로 정리했습니다.
decision: 브랜드페이지 이미지는 “예쁜 무드컷”보다 신뢰를 시각화하는 증거 설계로 다룹니다. 실물 증빙 섹션은 원본 사진 보존+배경/조명 정리, 히어로·전환·레거시 보조 컷은 AI 무드컷을 제한 허용합니다. workshop.png 반복은 제거하고 hero/philosophy/legacy를 다른 시각 역할로 분리합니다.
changed_artifacts:
  - docs/ai-development/chatgpt-images-manual-pipeline/brand-page-redesign-plan.md
  - docs/ai-development/chatgpt-images-manual-pipeline/README.md
  - docs/ai-development/chatgpt-images-manual-pipeline/queue.csv
  - team/handoffs/latest.md
verification:
  - Playwright로 운영 URL 접속 및 full-page screenshot 저장
  - 운영 페이지 이미지 inventory 확인: workshop.png 반복, transparent-specimen.png, book-1~4, gallery-1~10
  - 로컬 브랜드스토리/브랜드페이지 파일 구조 확인, images 폴더 없음 확인
  - OpenAI 공식 문서로 ChatGPT Images 2.0/Images with thinking/Pro image creation 관련 근거 확인
  - bash _tools/pressco21-check.sh 실행, Status OK
open_risks:
  - 실제 이미지 생성은 ChatGPT Pro 웹/앱에서 사람이 수행해야 하며 이 세션에서 생성 이미지는 없음
  - 로컬 프로젝트에는 images 폴더가 없어 실제 반입 시 폴더 생성/원본 동기화가 필요
  - 사실 증빙이 필요한 섹션에 AI가 없는 기관/현장/인물을 만들면 신뢰 리스크가 큼
  - team/handoffs/latest.md 커밋 정책은 이전과 동일하게 통합 전 확인 필요
next_step: 디자이너가 브랜드스토리 원본 사진 8~12장을 선정한 뒤 BS-HERO-001, BS-PHILOSOPHY-001, BS-INNOVATION-001부터 ChatGPT Pro 웹/앱에서 3안씩 생성하고 A/B/C 판정을 진행합니다.
learn_to_save:
  - 브랜드스토리 덕테이프 활용은 “실물 증거 보존 + 배경/조명/여백 개선”과 “AI 무드컷 제한 허용”을 분리해야 신뢰를 지킬 수 있습니다.
  - 현재 브랜드페이지는 workshop.png 반복 의존이 브랜드 밀도를 낮추므로 hero/philosophy/legacy를 먼저 분리하는 것이 최우선입니다.
  - 로컬 브랜드스토리/브랜드페이지는 images 폴더가 없으므로 코드 수정 전 이미지 폴더/manifest/원본 동기화 계획을 먼저 잡아야 합니다.
---

## 담당
윤하늘님(PM)

## 참여
한지훈님(CSO), 정유나님(CMO), 최민석님(CTO)

## 요약
운영 브랜드페이지와 로컬 프로젝트 구조를 확인한 뒤, 덕테이프 기반 이미지 리디자인 계획을 문서화했습니다. 핵심은 workshop.png 반복을 줄이고 Hero, Philosophy, Innovation, Legacy, Gallery, Publications의 이미지 역할을 분리하는 것입니다.

## 확인한 것
- 운영 URL을 Playwright로 확인했고 full-page screenshot을 저장했습니다.
- 운영 이미지 inventory에서 workshop.png가 hero/philosophy/legacy에 반복되는 구조를 확인했습니다.
- 로컬 `브랜드스토리/브랜드페이지/`에는 images 폴더가 없고 코드만 이미지 경로를 참조합니다.
- workspace scope check는 OK입니다.

## 남은 위험
- 실제 이미지 생성과 반입은 아직 하지 않았습니다.
- 원본 실물 사진 선정과 이미지 폴더 생성이 다음 단계입니다.
- AI 무드컷은 사실 증빙 섹션에 쓰면 신뢰 리스크가 있습니다.

## 다음
원본 사진 8~12장을 선정하고 `brand-page-redesign-plan.md`의 프롬프트 큐에 따라 Hero, Philosophy, Innovation부터 3안씩 생성합니다.
