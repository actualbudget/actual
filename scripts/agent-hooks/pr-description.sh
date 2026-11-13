#!/bin/sh
# Shared agent guard for pull-request creation, wired for Claude (PreToolUse),
# Codex (PreToolUse) and Cursor (beforeMCPExecution via adapter).
#
# Reads `.tool_input.body` on stdin and blocks (exit 2 + stderr) if the body
# breaks the PR description rules (.github/agents/pr-and-commit-rules.md). The
# rules live in packages/ci-actions/src/pr-description/check.mjs, shared with
# the CI check (.github/workflows/pr-description.yml); this runs them in agent
# mode.

input=$(cat)

. "$(dirname "$0")/common.sh"
# A missing jq fails closed here; the fail-open below is only for payloads jq
# itself can't make sense of.
require_jq

ROOT=$(resolve_repo_root)

# Fail open when there's no body to check: a parse failure or an absent/null
# `.tool_input.body` must not wedge PR creation. (The Cursor/Codex/Claude wiring
# still fails closed if THIS script can't execute at all.) `jq -re` exits
# non-zero for both cases; an empty-string body, however, is a real submission
# and still falls through to the check below.
body=$(printf '%s' "$input" | jq -re '.tool_input.body' 2>/dev/null) || exit 0

# Any failure blocks, including a missing node or checker (fail closed).
errors=$(printf '%s' "$body" | node "$ROOT/packages/ci-actions/bin/pr-description-check.mjs" --agent 2>&1) && exit 0

echo "Blocked: the pull request body doesn't follow .github/PULL_REQUEST_TEMPLATE.md (see .github/agents/pr-and-commit-rules.md):
$errors
(scripts/agent-hooks/pr-description.sh)" >&2
exit 2
