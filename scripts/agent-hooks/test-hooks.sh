#!/bin/sh
# Executable checks for the agent-hook scripts. Run from anywhere:
#   scripts/agent-hooks/test-hooks.sh
# Exits non-zero on the first failing check. Needs jq on PATH (the missing-jq
# cases simulate its absence via a stripped PATH sandbox).
set -u
cd "$(dirname "$0")" || exit 1

pass=0
fail() {
  echo "FAIL: $1" >&2
  exit 1
}
ok() { pass=$((pass + 1)); }

# PATH sandbox containing everything the hooks use except jq.
nojq=$(mktemp -d)
trap 'rm -rf "$nojq"' EXIT
for t in sh bash cat sed printf echo dirname git grep awk basename env; do
  p=$(command -v "$t" 2>/dev/null) && ln -s "$p" "$nojq/$t"
done

payload='{"tool_input":{"command":"git status"}}'

# Missing jq: every hook exits 2 with a message naming jq and the script.
for s in git-guard github-comment-style no-strict-ignore-new-file \
  pr-template-blank format-edited-file prefer-one-component check-on-stop; do
  out=$(printf '%s' "$payload" | PATH="$nojq" "./$s.sh" 2>&1)
  rc=$?
  [ "$rc" -eq 2 ] || fail "$s.sh without jq: want exit 2, got $rc"
  case "$out" in
    *jq*"$s.sh"*) ok ;;
    *) fail "$s.sh without jq: message must mention jq and the script, got: $out" ;;
  esac
done

# PostToolUse hooks must report an advisory, not claim a block — the edit
# already happened.
for s in format-edited-file prefer-one-component; do
  out=$(printf '%s' "$payload" | PATH="$nojq" "./$s.sh" 2>&1)
  case "$out" in
    Blocked:*) fail "$s.sh without jq: PostToolUse must not claim a block, got: $out" ;;
    *skipped*) ok ;;
    *) fail "$s.sh without jq: expected a skipped-hook advisory, got: $out" ;;
  esac
done

command -v jq >/dev/null 2>&1 ||
  fail "jq is required to run the remaining checks ($pass passed so far)"

# Malformed JSON fails closed in the guards that must block.
printf '%s' 'not json' | ./git-guard.sh 2>/dev/null &&
  fail "git-guard.sh: malformed JSON must block"
ok
printf '%s' 'not json' | ./github-comment-style.sh 2>/dev/null &&
  fail "github-comment-style.sh: malformed JSON must block"
ok

# Missing fields are a no-op (nothing to enforce) or an intentional fail-open.
printf '%s' '{"tool_input":{}}' | ./git-guard.sh ||
  fail "git-guard.sh: empty tool_input must allow"
ok
printf '%s' '{"tool_input":{}}' | ./format-edited-file.sh ||
  fail "format-edited-file.sh: missing file_path must exit 0"
ok
printf '%s' '{"tool_input":{}}' | ./pr-template-blank.sh ||
  fail "pr-template-blank.sh: missing body must fail open"
ok
printf '%s' '{"stop_hook_active":true}' | ./check-on-stop.sh ||
  fail "check-on-stop.sh: stop_hook_active must exit 0"
ok

# Guard behavior spot checks.
printf '%s' "$payload" | ./git-guard.sh ||
  fail "git-guard.sh: benign git command must pass"
ok
printf '%s' '{"tool_input":{"command":"git push origin main"}}' | ./git-guard.sh 2>/dev/null &&
  fail "git-guard.sh: push to main must block"
ok
printf '%s' '{"tool_input":{"command":"git commit -m \"no prefix\""}}' | ./git-guard.sh 2>/dev/null &&
  fail "git-guard.sh: commit without [AI] prefix must block"
ok
printf '%s' '{"tool_input":{"command":"git commit -m \"[AI] ok\""}}' | ./git-guard.sh ||
  fail "git-guard.sh: [AI]-prefixed commit must pass"
ok
printf '%s' '{"tool_input":{"body":"hello"}}' | ./github-comment-style.sh 2>/dev/null &&
  fail "github-comment-style.sh: body without robot emoji must block"
ok
printf '%s' '{"tool_input":{"body":"🤖 hello"}}' | ./github-comment-style.sh ||
  fail "github-comment-style.sh: robot-prefixed body must pass"
ok

echo "OK: $pass checks passed"
