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

# Fail open on a malformed/empty payload: a parsing hiccup must never wedge the
# agent's ability to comment.
body=$(printf '%s' "$input" | jq -r '.tool_input.body // empty' 2>/dev/null) || exit 0
title=$(printf '%s' "$input" | jq -r '.tool_input.title // empty' 2>/dev/null) || true

# A field passes if it's empty/whitespace-only (nothing to mark) or, after
# stripping leading whitespace, begins with the robot emoji.
starts_with_robot() {
  field=$1
  [ -n "$(printf '%s' "$field" | tr -d '[:space:]')" ] || return 0
  # ${field%%[![:space:]]*} is the leading whitespace; strip it off the front.
  trimmed=${field#"${field%%[![:space:]]*}"}
  case "$trimmed" in
    "$robot"*) return 0 ;;
    *) return 1 ;;
  esac
}

starts_with_robot "$title" ||
  block "Blocked: GitHub issue titles must start with the robot emoji 🤖 to mark them as agent-authored. Prefix the title with 🤖 and try again. (scripts/agent-hooks/github-comment-style.sh)"
starts_with_robot "$body" ||
  block "Blocked: GitHub comments, reviews and issues must start with the robot emoji 🤖 to mark them as agent-authored. Prefix the body with 🤖 and try again. (scripts/agent-hooks/github-comment-style.sh)"

exit 0
