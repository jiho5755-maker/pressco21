#!/bin/zsh

pressco21_repo="${PRESSCO21_REPO:-$HOME/workspace/pressco21}"
pressco21_tools="$pressco21_repo/_tools"

save() {
  bash "$pressco21_tools/codex-save.sh" "$@"
}

branch() {
  bash "$pressco21_tools/codex-branch.sh" "$@"
}

resume() {
  bash "$pressco21_tools/codex-resume.sh" "$@"
}
