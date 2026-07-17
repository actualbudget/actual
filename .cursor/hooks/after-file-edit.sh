#!/bin/sh
# Cursor `afterFileEdit` adapter.
#
# afterFileEdit is informational-only: it can format the edited file (a side
# effect on disk) and PRINT advisories to Cursor's Hooks output channel, but it
# cannot block or message the agent. So under Cursor the new-file rules
# (no @ts-strict-ignore, one component per file) are advisory, not enforced.
# Cursor input on stdin: { file_path, edits, ... }.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0
ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
payload=$(jq -n --arg f "$file" '{tool_input:{file_path:$f}}')

# Format/lint the edited file (side effect on disk).
printf '%s' "$payload" | "$ROOT/scripts/agent-hooks/format-edited-file.sh" >/dev/null 2>&1

dir=$(dirname "$file")
# Normalize to a repo-root-relative path so the git pathspec is unambiguous
# whether Cursor passed an absolute or relative file_path.
abs=$(CDPATH= cd "$dir" 2>/dev/null && pwd)/$(basename "$file")
rel=${abs#"$ROOT"/}
is_new() { ! git -C "$ROOT" ls-files --error-unmatch "$rel" >/dev/null 2>&1; }

# Advisory: new file that is not type-strict.
case "$file" in
  *.ts | *.tsx)
    if is_new && grep -q "@ts-strict-ignore" "$file" 2>/dev/null; then
      echo "[actual] Advisory: new file '$file' uses // @ts-strict-ignore — new files should be type-strict (AGENTS.md)."
    fi ;;
esac

# Advisory: new .tsx with multiple components (reuse the shared check).
msg=$(printf '%s' "$payload" | "$ROOT/scripts/agent-hooks/prefer-one-component.sh" 2>&1)
[ -n "$msg" ] && echo "[actual] Advisory: $msg"

exit 0
