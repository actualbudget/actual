#!/bin/sh
# Agent hook (PostToolUse / afterFileEdit), shared across Claude, Codex, Cursor.
#
# "Prefer one component per file" — surfaced as a soft warning for *newly
# created* .tsx files only. Existing multi-component files are grandfathered
# (skipped if already tracked by git), and this never touches `yarn lint`, so
# react/no-multi-comp stays out of .oxlintrc.json.

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  *.tsx) ;;
  *) exit 0 ;;
esac

dir=$(dirname "$file")

# Resolve the repo root regardless of which agent invoked us.
. "$(dirname "$0")/common.sh"
ROOT=$(resolve_repo_root "$dir")

# Normalize to an absolute + repo-root-relative path so the git pathspec is
# unambiguous whether the agent passed an absolute or relative file_path.
abs=$(CDPATH= cd "$dir" 2>/dev/null && pwd)/$(basename "$file")
rel=${abs#"$ROOT"/}

# Only new (untracked) files; grandfather everything already in git.
git -C "$ROOT" ls-files --error-unmatch "$rel" >/dev/null 2>&1 && exit 0

BIN="$ROOT/node_modules/.bin"
[ -x "$BIN/oxlint" ] || exit 0

out=$(cd "$ROOT" && "$BIN/oxlint" -D react/no-multi-comp "$abs" 2>&1)
case "$out" in
  *no-multi-comp*)
    echo "Prefer one component per file — this new file defines multiple components; split them into separate files (AGENTS.md)." >&2
    exit 2
    ;;
esac
exit 0
