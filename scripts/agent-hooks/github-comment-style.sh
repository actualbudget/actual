#!/bin/sh
# Shared agent guard for GitHub comments / reviews / issues, wired for Claude
# (PreToolUse), Codex (PreToolUse) and Cursor (beforeMCPExecution via adapter).
#
# Enforces the project's voice for anything an agent posts to GitHub: PR/issue
# comments, pull-request reviews, and newly created issues. The rule:
#
#   1. Prefer 简体中文 (Chinese). If the body is written in Chinese, it passes.
#   2. Otherwise, talk like a pirate — yarr! A body sprinkled with pirate
#      flavour (ahoy, matey, avast, shiver me timbers, …) passes too.
#   3. Plain English with neither of the above is blocked (exit 2 + stderr) so
#      the agent rewrites it before the comment lands.
#
# Reads the comment text from `.tool_input.body` (and `.tool_input.title` for
# issues) on stdin — the Claude/Codex MCP payload shape. The Cursor adapter
# (.cursor/hooks/before-mcp-github.sh) normalises Cursor's payload to match.
#
# Best-effort by design, like the other guards here: it catches the honest
# default (an agent firing off a plain-English comment) without trying to police
# every phrasing. Detection of "is this Chinese / is this pirate" is heuristic.

block() {
  echo "$1" >&2
  exit 2
}

# Buffer stdin once: it's a single stream, so we can't run jq against it twice.
input=$(cat)

# Fail open on a malformed/empty payload: a parsing hiccup must never wedge the
# agent's ability to comment. (Contrast git-guard, which fails closed — here the
# downside of a miss is a wrongly-toned comment, not an unsafe git operation.)
body=$(printf '%s' "$input" | jq -r '.tool_input.body // empty' 2>/dev/null) || exit 0
title=$(printf '%s' "$input" | jq -r '.tool_input.title // empty' 2>/dev/null) || true
text=$(printf '%s\n%s' "$title" "$body")

# Nothing to check (e.g. a tool call that carries no prose) — let it through.
[ -n "$(printf '%s' "$text" | tr -d '[:space:]')" ] || exit 0

# Note on CodeRabbit: comments *authored by* CodeRabbit are exempt, but that's
# automatic and needs no check here — this hook only ever runs on the agent's own
# outgoing comments (its PreToolUse / beforeMCPExecution tool calls), and the bot
# posts through its own GitHub identity, never through this agent. A comment that
# merely *mentions* @coderabbitai is still the agent's own prose, so it is NOT
# exempt (otherwise name-dropping the bot would be a trivial way to post plain
# English).

# 1. Chinese? Detect CJK by UTF-8 lead byte in the C locale — locale- and
#    grep-flavour-independent (grep -P's \x{...} needs a UTF-8 locale we can't
#    assume). Lead bytes E3–E9 (\343–\351) cover CJK punctuation, kana and the
#    Unified Ideographs (U+3000–U+9FFF); accented Latin (C2–C3 leads) is excluded
#    so an "é" in plain English can't slip past as "Chinese".
cjk=$(printf '[\343-\351]')
if printf '%s' "$text" | LC_ALL=C grep -q "$cjk"; then
  exit 0
fi

# 2. Pirate? Look for the unmistakable markers, case-insensitively, as whole
#    words so "yearn" / "barrel" don't masquerade as "ye" / "arr".
if printf '%s' "$text" | grep -qiE '(^|[^[:alpha:]])(y?arr+|y?aar+|ahoy|matey|avast|aye|ye|booty|landlubber|scallywag|scurvy|buccaneer|me hearties|shiver me timbers|jolly roger|walk the plank|davy jones|yo-?ho)([^[:alpha:]]|$)' 2>/dev/null; then
  exit 0
fi

block "Blocked: GitHub comments, reviews and issues must be in 简体中文 (preferred) or, failing that, written in a fun pirate voice — yarr! Rewrite the body in Chinese, or hoist the colours and talk like a pirate, then post again. (scripts/agent-hooks/github-comment-style.sh)"
