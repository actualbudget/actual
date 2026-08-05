#!/bin/sh
# Shared helpers for the agent-hook scripts. Source this file; don't execute it.

# Every hook parses its stdin payload with jq — a hard prerequisite. Call this
# before the first jq use so a missing jq fails closed with an actionable
# message, distinct from a malformed-payload error. Exit 2 blocks the tool
# call; for PostToolUse hooks (which can't block) it still surfaces the
# message to the agent instead of silently skipping the hook's work.
require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "Blocked: the agent hooks require 'jq', which was not found on PATH. Install jq (https://jqlang.org) and retry. (scripts/agent-hooks/${0##*/})" >&2
    exit 2
  fi
}

# Resolve the repo root regardless of which agent invoked the hook.
# Optional $1: a directory hint for the `git` fallback (e.g. an edited file's dir).
resolve_repo_root() {
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    printf '%s\n' "$CLAUDE_PROJECT_DIR"
    return 0
  fi
  _hint=${1:-.}
  _root=$(git -C "$_hint" rev-parse --show-toplevel 2>/dev/null) || _root=
  [ -n "$_root" ] || _root=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
  printf '%s\n' "$_root"
}
