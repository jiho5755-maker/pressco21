---
handoff_id: HOFF-2026-04-23-claude-design
created_at: 2026-04-23T00:00:00+09:00
runtime: claude
owner_agent_id: choi-minseok-cto
contributors: [han-jihoon-cso, park-seoyeon-cfo, jung-yuna-cmo, kim-dohyun-coo]
branch: work/workspace/claude-shared-agent-ecosystem
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem
summary: ChatGPT Images 2.0 + Figma MCP + Claude Code 3도구 디자인 파이프라인 기획 완료. Figma Brand Master 파일에 토큰 30개+스타일 8개 등록. FigJam 디자이너 에셋 입력 보드 생성. 추가 비용 0원.
decision: 이미지 생성 주력은 ChatGPT Pro(브라우저 무제한), nano-banana는 보조. n8n API 호출은 비용 발생하므로 Phase 2. 디자이너가 FigJam 보드 기입 완료 후 Figma 토큰 검수/수정 → 라이브러리 발행 순서로 진행.
changed_artifacts:
  - Figma Brand Master tw2xLLJ7mSLdUgZKnbYwGJ (컬러 17 + Spacing 8 + Radius 5 + Typography 8)
  - FigJam 에셋 입력 보드 QK8vytF1T207L8Y63ZxGWI (8섹션)
  - docs/brand-design-guide-for-designers.md
  - docs/generate-brand-guide-docx.py
  - docs/generate-figma-setup-guide.py
  - ~/Desktop/PRESSCO21_브랜드_디자인_가이드.docx
verification:
  - Figma MCP whoami 연결 확인 (Pro, jiho5755@gmail.com)
  - Brand Master 스크린샷 확인 (컬러 스와치 + 타이포 + Guard Rails)
  - FigJam 8섹션 스크린샷 검수 (인트로 한글 깨짐 → 스티커 기반 수정 → 재확인 OK)
  - 커밋 3e1c48a pushed
next_step: 디자이너(다경/승해)가 FigJam 보드 기입 완료 후 → Figma 토큰 검수/수정 → 라이브러리 발행 → 5월 어버이날 캠페인 PoC 1건 실행.
open_risks:
  - Figma 토큰 값이 AI 임시 설정이므로 디자이너 검수 전까지 실제 브랜드와 불일치 가능
  - FigJam shape-with-text의 한글 렌더링 제한 (안내 바 일부 텍스트 잘림, 실사용 스티커는 정상)
learn_to_save:
  - FigJam에서 한글은 sticky가 안정적, shapeWithText는 렌더링 깨짐 발생
  - 팀미팅(5명 병렬 C-Suite)은 전략 기획에 효과적 — 각 관점이 교차 검증됨
---

## 담당
최민석님(CTO)

## 참여
한지훈님(CSO), 박서연님(CFO), 정유나님(CMO), 김도현님(COO)

## 요약
ChatGPT Images 2.0 + Figma MCP + Claude Code 3도구 디자인 파이프라인을 기획하고,
Figma에 브랜드 토큰을 등록하고, 디자이너가 에셋을 기입할 FigJam 보드를 만들었습니다.
추가 비용 0원(기존 구독 내)으로 상세페이지 제작 3~5일을 40분으로 단축하는 구조입니다.

## 확인한 것
- Figma Pro 연결 정상 (jiho5755@gmail.com)
- Brand Master 토큰 30개 + 스타일 8개 등록 확인
- FigJam 보드 8섹션 한글 렌더링 정상 (인트로 수정 후)

## 남은 위험
- 토큰 값이 AI 임시 설정 — 디자이너 검수 전까지 실제 브랜드와 불일치 가능

## 다음
- 디자이너에게 FigJam 보드 링크 공유 → 기입 완료 후 토큰 검수 → 5월 캠페인 PoC
