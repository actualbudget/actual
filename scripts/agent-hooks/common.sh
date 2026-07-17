#!/bin/sh
# Shared helpers for the agent-hook scripts. Source this file; don't execute it.

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
