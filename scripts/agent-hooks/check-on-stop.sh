#!/usr/bin/env bash
# Agent hook (Stop), shared across Claude and Codex.
#
# When the agent finishes its turn, run typecheck + test for each workspace this
# branch has touched (scoped — far cheaper than the whole-monorepo check).
# Failures are surfaced back to the agent via exit code 2 so it can fix them.
# Adapted from a suggestion by @StephenBrown2 on PR #8089.
set -uo pipefail

# Read the hook payload (Claude provides stop_hook_active to prevent loops).
payload=$(cat 2>/dev/null || true)
if printf '%s' "$payload" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

# Resolve the repo root regardless of which agent invoked us.
. "$(dirname "$0")/common.sh"
ROOT=$(resolve_repo_root)
cd "$ROOT" 2>/dev/null || exit 0

# Skip if dependencies aren't installed.
[ -f "$ROOT/node_modules/.yarn-state.yml" ] || exit 0

# Collect changed files, NUL-delimited so paths with spaces survive: this
# branch's commits vs master, plus tracked + untracked working-tree changes.
base=$(git merge-base HEAD origin/master 2>/dev/null || true)
files=()
while IFS= read -r -d '' f; do
  [ -n "$f" ] && files+=("$f")
done < <(
  {
    [ -n "$base" ] && git diff -z --name-only "$base"...HEAD
    git diff -z --name-only HEAD
    git ls-files -z --others --exclude-standard
  } 2>/dev/null
)
[ "${#files[@]}" -gt 0 ] || exit 0

# Map changed source files to the workspace dir that owns them (deduped).
declare -A seen
ws_dirs=()
for f in "${files[@]}"; do
  case "$f" in
    *.js | *.mjs | *.jsx | *.ts | *.tsx) ;;
    *) continue ;;
  esac
  d=$(dirname "$f")
  while [ "$d" != "." ] && [ "$d" != "/" ]; do
    if [ -f "$ROOT/$d/package.json" ]; then
      [ -n "${seen[$d]:-}" ] || {
        seen[$d]=1
        ws_dirs+=("$d")
      }
      break
    fi
    d=$(dirname "$d")
  done
done
[ "${#ws_dirs[@]}" -gt 0 ] || exit 0

fail=0
report=""
for d in "${ws_dirs[@]}"; do
  # One jq read per package.json: name + which scripts exist.
  IFS=$'\t' read -r name tc te < <(
    jq -r '[.name // "",
            (if .scripts.typecheck then "tc" else "" end),
            (if .scripts.test then "test" else "" end)] | @tsv' "$ROOT/$d/package.json"
  )
  [ -n "$name" ] || continue

  if [ "$tc" = "tc" ]; then
    if ! out=$(yarn workspace "$name" run typecheck 2>&1); then
      report="$report"$'\n'"[typecheck failed: $name]"$'\n'"$(printf '%s' "$out" | tail -25)"
      fail=1
    fi
  fi
  if [ "$te" = "test" ]; then
    if ! out=$(yarn workspace "$name" run test 2>&1); then
      report="$report"$'\n'"[tests failed: $name]"$'\n'"$(printf '%s' "$out" | tail -25)"
      fail=1
    fi
  fi
done

if [ "$fail" -eq 1 ]; then
  printf 'Stop check found failures in touched workspaces:%s\n' "$report" >&2
  exit 2
fi
exit 0
