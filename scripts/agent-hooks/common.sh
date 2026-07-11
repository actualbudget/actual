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

# Make `yarn` resolvable in hook environments. Hooks often run with a minimal
# PATH that lacks nvm/corepack shims, so `yarn` fails with "command not found"
# even though the repo is fully set up. Optional $1: repo root (for .nvmrc).
# Returns non-zero if no yarn could be found; callers should skip their check
# rather than report that as a typecheck/test failure.
resolve_yarn() {
  command -v yarn >/dev/null 2>&1 && return 0

  _root=${1:-.}
  _nvm_versions=${NVM_DIR:-$HOME/.nvm}/versions/node
  if [ -d "$_nvm_versions" ]; then
    # Prefer the version pinned by .nvmrc; fall back to any installed version.
    _want=$(tr -d 'v[:space:]' <"$_root/.nvmrc" 2>/dev/null)
    _bin=""
    for _d in "$_nvm_versions/v${_want:-}"*/bin; do
      [ -x "$_d/yarn" ] && _bin=$_d
    done
    if [ -z "$_bin" ]; then
      for _d in "$_nvm_versions"/v*/bin; do
        [ -x "$_d/yarn" ] && _bin=$_d
      done
    fi
    if [ -n "$_bin" ]; then
      PATH="$_bin:$PATH"
      export PATH
    fi
  fi

  command -v yarn >/dev/null 2>&1
}
