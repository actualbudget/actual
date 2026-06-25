#!/bin/sh
# Shared agent guard for pull-request creation, wired for Claude (PreToolUse),
# Codex (PreToolUse) and Cursor (beforeMCPExecution via adapter).
#
# Agents must NOT fill in the PR template: when creating a pull request the body
# must be the repo's blank template (.github/PULL_REQUEST_TEMPLATE.md),
# unmodified, so the human who tested the change fills in the Description,
# Testing and Checklist sections (AGENTS.md / pr-and-commit-rules.md). Reads
# `.tool_input.body` on stdin and blocks (exit 2 + stderr) if it isn't the
# pristine template.
#
# Comparison ignores cosmetic differences only: CR/LF, trailing whitespace per
# line, and leading/trailing blank lines. Any real content (a filled-in section,
# a checked box, extra prose) makes the body differ and is blocked.

block() {
  echo "$1" >&2
  exit 2
}

input=$(cat)

# Resolve the repo root regardless of which agent invoked us, then the template.
. "$(dirname "$0")/common.sh"
ROOT=$(resolve_repo_root)
template="$ROOT/.github/PULL_REQUEST_TEMPLATE.md"

# If we can't find the template, fail open — never block PR creation just because
# the comparison baseline is missing.
[ -f "$template" ] || exit 0

# Fail open on a malformed/empty payload: a parsing hiccup must not wedge PR
# creation. (The Cursor/Codex/Claude wiring still fails closed if THIS script
# can't execute at all.)
body=$(printf '%s' "$input" | jq -r '.tool_input.body // empty' 2>/dev/null) || exit 0

# Canonicalise: drop CR, strip per-line trailing whitespace, and trim leading and
# trailing blank lines, so only meaningful content differences remain.
canon() {
  printf '%s\n' "$1" | awk '
    { sub(/\r$/, ""); sub(/[[:space:]]+$/, ""); lines[NR] = $0 }
    END {
      s = 1; e = NR
      while (s <= e && lines[s] == "") s++
      while (e >= s && lines[e] == "") e--
      for (i = s; i <= e; i++) print lines[i]
    }'
}

[ "$(canon "$body")" = "$(canon "$(cat "$template")")" ] && exit 0

block "Blocked: don't fill in the PR template. Create the pull request with the repo's blank template (.github/PULL_REQUEST_TEMPLATE.md) as the body, unmodified — the human who tested the change fills in the Description, Testing and Checklist sections (AGENTS.md). (scripts/agent-hooks/pr-template-blank.sh)"
