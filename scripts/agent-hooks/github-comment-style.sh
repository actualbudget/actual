#!/bin/sh
# Shared agent guard for GitHub comments / reviews / issues, wired for Claude
# (PreToolUse), Codex (PreToolUse) and Cursor (beforeMCPExecution via adapter).
#
# Every comment, review or issue an agent posts to GitHub must be prefixed with
# the robot emoji 🤖, so agent-authored content is always visibly marked. Reads
# the text from `.tool_input.body` (and `.tool_input.title` for issues) on
# stdin; each non-empty field must start with 🤖 (after any leading whitespace),
# otherwise the call is blocked (exit 2 + stderr) so the agent fixes it.
#
# This only ever runs on the agent's own outgoing comments — bots like CodeRabbit
# post under their own identity and never pass through this hook.

block() {
  echo "$1" >&2
  exit 2
}

input=$(cat)

# 🤖 = U+1F916, UTF-8 F0 9F A4 96. Build it from raw bytes so the prefix check is
# locale- and file-encoding-independent.
robot=$(printf '\360\237\244\226')

# Fail closed on a malformed payload — invalid JSON, or a missing/non-object
# `.tool_input` — matching git-guard.sh / guard-shell.sh, so a payload we can't
# read can't silently bypass the prefix check. A genuinely absent body/title
# within a valid `.tool_input` is fine (nothing to mark).
fields=$(printf '%s' "$input" | jq -e '.tool_input | objects' 2>/dev/null) ||
  block "Blocked: could not read the hook payload (.tool_input). (scripts/agent-hooks/github-comment-style.sh)"
body=$(printf '%s' "$fields" | jq -r '.body // empty')
title=$(printf '%s' "$fields" | jq -r '.title // empty')

# A field passes if it's empty/whitespace-only (nothing to mark) or, after
# stripping leading whitespace, begins with the robot emoji.
starts_with_robot() {
  # ${1%%[![:space:]]*} is the leading whitespace; strip it off the front. A
  # whitespace-only (or empty) field strips down to "" and passes too.
  trimmed=${1#"${1%%[![:space:]]*}"}
  case "$trimmed" in
    "" | "$robot"*) return 0 ;;
    *) return 1 ;;
  esac
}

starts_with_robot "$title" ||
  block "Blocked: GitHub issue titles must start with the robot emoji 🤖 to mark them as agent-authored. Prefix the title with 🤖 and try again. (scripts/agent-hooks/github-comment-style.sh)"
starts_with_robot "$body" ||
  block "Blocked: GitHub comments, reviews and issues must start with the robot emoji 🤖 to mark them as agent-authored. Prefix the body with 🤖 and try again. (scripts/agent-hooks/github-comment-style.sh)"

exit 0
