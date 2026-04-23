# Claude Prompt Packet — Shared Agent Ecosystem Update

아래 프롬프트를 현재 Claude Code 세션에 그대로 전달하면 된다.

```text
Read these in order:

1. AGENTS.md
2. CLAUDE.md
3. HARNESS.md
4. docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md
5. docs/ai-native-upgrade/shared-agent-kernel/claude-compact-update-2026-04-21.md
6. docs/ai-native-upgrade/shared-agent-kernel/README.md
7. docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml
8. docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md
9. docs/ai-native-upgrade/shared-agent-kernel/memory-spine-spec-v1.md
10. docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md
11. docs/ai-native-upgrade/shared-agent-kernel/runtime-divergence-matrix-v1.md
12. docs/ai-native-upgrade/shared-agent-kernel/handoff-examples-v1.md
13. docs/ai-native-upgrade/shared-agent-kernel/canonical-roster-migration-plan-v1.md
14. docs/ai-native-upgrade/shared-agent-kernel/cross-runtime-review-checklist-v1.md
15. docs/ai-native-upgrade/shared-agent-kernel/templates/README.md
16. docs/ai-native-upgrade/shared-agent-kernel/templates/playbook.template.md
17. docs/ai-native-upgrade/shared-agent-kernel/templates/failures.template.md
18. docs/ai-native-upgrade/shared-agent-kernel/templates/founder-preferences.template.md
19. docs/ai-native-upgrade/shared-agent-kernel/templates/growth-log.template.md
20. docs/ai-native-upgrade/shared-agent-kernel/templates/handoff.template.yaml
21. .claude/skills/pressco21-claude-ecosystem/SKILL.md

You are responsible only for the Claude-side adapter of the PRESSCO21 shared agent ecosystem.

Your role now:
- Build the Claude-side continuity / frontdoor / named-agent experience
- Use official Claude plugin / marketplace / hook / skill / subagent patterns as the primary standard
- Keep founder-facing output aligned to the canonical core roster
- Treat the shared-kernel docs as the current contract baseline

Important constraints:
- Do not rewrite shared-kernel contracts unless truly necessary
- If you believe the shared kernel must change, propose the change separately instead of freelancing across layers
- Do not copy OMX low-level runtime mechanics into Claude
- Keep people names before tool names in founder-facing UX
- Save only if it changes future behavior

Focus especially on:
1. SessionStart continuity design
2. SessionEnd / Stop continuity design
3. named-agent founder-facing UX
4. plugin / marketplace structure for the Claude side
5. safe read/write behavior into the shared memory spine

Output required:
- Summary
- Changed files
- Verification
- Shared-kernel impact
- Open risks
- Learnings to save
```
