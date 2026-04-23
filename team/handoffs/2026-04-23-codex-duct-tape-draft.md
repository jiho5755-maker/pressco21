---
handoff_id: HOFF-2026-04-23-chatgpt-images-duct-tape
created_at: 2026-04-23T11:02:23+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [han-jihoon-cso, jung-yuna-cmo, choi-minseok-cto]
branch: work/workspace/ai-team-pilot-followup
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-ai-team-pilot
summary: ChatGPT Images 2.0을 내부 별칭 “덕테이프”로 보고, ChatGPT Pro 웹/앱 수동 생성 기반의 추가 API 비용 0원 이미지 자산 파이프라인을 기획했습니다.
decision: API 기반 이미지 생성은 이번 전략에서 제외하고, 사람이 ChatGPT Pro에서 생성·저장·검수·반입하는 수동 자산 공급망으로 운영합니다. 우선 적용은 파트너클래스와 자사몰 재료/키트 이미지입니다.
changed_artifacts:
  - docs/ai-development/chatgpt-images-manual-pipeline/README.md
  - docs/ai-development/chatgpt-images-manual-pipeline/one-page-brief.md
  - docs/ai-development/chatgpt-images-manual-pipeline/prompt-pack.md
  - docs/ai-development/chatgpt-images-manual-pipeline/queue.csv
  - docs/ai-development/chatgpt-images-manual-pipeline/asset-metadata.schema.json
  - docs/ai-development/chatgpt-images-manual-pipeline/review-checklist.md
  - docs/ai-development/chatgpt-images-manual-pipeline/weekly-report-template.md
  - _tools/p21-ai-image-asset-check.py
  - team/handoffs/latest.md
verification:
  - OpenAI 공식 Help/Release Notes로 ChatGPT Images 2.0, Images with thinking, Pro image creation, 이미지 편집/관리, API 과금 여부 확인
  - python3 _tools/p21-ai-image-asset-check.py docs/ai-development/chatgpt-images-manual-pipeline --metadata-only 실행
  - /tmp 샘플 메타데이터+이미지 파일로 p21-ai-image-asset-check.py PASS 확인
  - bash _tools/pressco21-check.sh 실행, workspace scope Status OK
open_risks:
  - 실제 이미지 자산 폴더 assets/manual-ai-images/는 아직 만들지 않았고 별도 적용 브랜치에서 생성하는 것이 안전합니다.
  - team/handoffs/latest.md는 이전 handoff에서도 workspace scope 커밋 정책 리스크가 언급되었으므로 통합 전 정책 확인이 필요합니다.
  - ChatGPT Pro/Images 사용 한도와 UI 동작은 OpenAI 정책에 따라 변동될 수 있어 운영 시작 전 재확인이 필요합니다.
next_step: 파트너클래스를 파일럿 1순위로 확정하고 queue.csv의 6개 planned 항목부터 ChatGPT Pro 웹/앱에서 수동 생성 테스트를 진행합니다.
learn_to_save:
  - 장지호님은 이미지 생성 자동화보다 ChatGPT Pro 플랜을 활용한 추가 비용 0원 수동 생성 워크플로우를 선호합니다.
  - 이미지 생성은 API 비용 발생안을 먼저 제안하지 말고, Pro 웹/앱 수동 생성 + 검수 + 반입 체계를 우선 제안해야 합니다.
  - 덕테이프/ChatGPT Images 2.0은 PRESSCO21에서 “예쁜 이미지”보다 상세페이지·배너·제안서 전환율을 올리는 시각 영업 자산으로 다룹니다.
---

## 담당
윤하늘님(PM)

## 참여
한지훈님(CSO), 정유나님(CMO), 최민석님(CTO)

## 요약
ChatGPT Images 2.0을 활용한 “덕테이프” 전략을 회의 형태로 정리했습니다. 추가 API 비용 없이 ChatGPT Pro 웹/앱에서 사람이 이미지를 생성하고, 파일명·메타데이터·검수 기준을 붙여 프로젝트에 반입하는 운영 체계를 문서와 검증 도구로 만들었습니다.

## 확인한 것
- OpenAI 공식 문서로 2026-04-21 ChatGPT Images 2.0 공개와 Pro 포함 이미지 생성 기능을 확인했습니다.
- 수동 자산 파이프라인 문서, 1페이지 보고서, 프롬프트 팩, 작업 큐, 검수표, 주간 리포트 템플릿을 만들었습니다.
- 메타데이터 검증 도구를 만들고 샘플 PASS를 확인했습니다.
- workspace scope check는 OK입니다.

## 남은 위험
- 실제 이미지 파일 반입은 아직 하지 않았습니다.
- ChatGPT 이미지 사용 한도와 UI 동작은 변동 가능성이 있습니다.
- handoff 파일 커밋 정책은 통합 전 확인이 필요합니다.

## 다음
파트너클래스 파일럿을 먼저 진행하고, `queue.csv`의 planned 항목 6개를 실제 ChatGPT Pro 웹/앱에서 생성해 A/B/C/D 검수를 시작합니다.
