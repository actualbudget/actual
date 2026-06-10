#!/bin/sh
# Shared agent guard for new-file creation (Claude PreToolUse[Write],
# Codex PreToolUse[file-edit]). Cursor can only run this advisorily (its
# afterFileEdit cannot block) — see .cursor/hooks/after-file-edit.sh.
#
# New TypeScript files must be type-strict: block creating a brand-new file that
# contains `// @ts-strict-ignore`. Existing files (241 of them) are grandfathered
# automatically because this only fires when the target path does not yet exist.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0
case "$file" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

# Only guard new files; edits to existing files are untouched.
[ -f "$file" ] && exit 0

content=$(printf '%s' "$input" | jq -r '.tool_input.content // empty')
case "$content" in
  *"@ts-strict-ignore"*)
    echo "Blocked: new files must be type-strict — remove '// @ts-strict-ignore' and fix the types instead (AGENTS.md)." >&2
    exit 2
    ;;
esac
exit 0
