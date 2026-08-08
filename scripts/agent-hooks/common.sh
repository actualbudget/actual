#!/bin/sh
# Shared helpers for the agent-hook scripts. Source this file; don't execute it.

# Every hook parses its stdin payload with jq — a hard prerequisite. Call this
# before the first jq use so a missing jq fails with an actionable message,
# distinct from a malformed-payload error. PreToolUse hooks get a "Blocked:"
# message (exit 2 blocks the call); PostToolUse hooks pass "advisory" — the
# tool call already ran, so the message reports the skipped hook instead of
# claiming a block. Exit 2 stays in both modes: it is the only exit code that
# feeds stderr back to the agent rather than dropping it.
require_jq() {
  command -v jq >/dev/null 2>&1 && return 0
  if [ "${1:-}" = advisory ]; then
    echo "Agent hook skipped: 'jq' is required but was not found on PATH. Install jq (https://jqlang.org). (scripts/agent-hooks/${0##*/})" >&2
  else
    echo "Blocked: the agent hooks require 'jq', which was not found on PATH. Install jq (https://jqlang.org) and retry. (scripts/agent-hooks/${0##*/})" >&2
  fi
  exit 2
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
