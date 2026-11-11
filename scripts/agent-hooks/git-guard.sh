#!/bin/sh
# Shared agent guard for shell/Bash commands (Claude PreToolUse[Bash],
# Codex PreToolUse[^Bash$], Cursor beforeShellExecution via adapter).
#
# Deterministically enforces the project's git-safety, gh and workspace rules
# that used to live as prose in AGENTS.md / .github/agents/pr-and-commit-rules.md.
# Reads the command from `.tool_input.command` on stdin. Exit code 2 + stderr
# blocks the call and feeds the reason back to the agent.
#
# Best-effort by design: it catches the honest mistakes agents actually make
# (plain push-to-main, --no-verify, yarn in a workspace). It does NOT try to
# defend against deliberate evasion via unusual shell forms (git global options
# before the subcommand, etc.) — CI and branch protection are the real gates for
# what lands.

block() {
  echo "$1" >&2
  exit 2
}

# A missing jq gets its own actionable block, distinct from the
# malformed-payload block below.
. "$(dirname "$0")/common.sh"
require_jq

# Fail closed: a malformed payload (jq parse failure) blocks rather than allows.
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) ||
  block "Blocked: could not parse the hook payload (.tool_input.command)."
[ -z "$cmd" ] && exit 0

# Enforce: always run yarn from the repo root, never in a child workspace.
# Catch cd/pushd into a package dir, or `yarn --cwd packages/...`.
case "$cmd" in
  *"cd packages/"* | *"cd ./packages/"* | *"cd packages "* | *"cd ./packages "* | \
    *"pushd packages/"* | *"pushd ./packages/"* | *"pushd packages "* | *"pushd ./packages "* | \
    *"yarn --cwd packages/"* | *"yarn --cwd ./packages/"* | *"yarn --cwd packages "* | *"yarn --cwd ./packages "* | \
    *"yarn --cwd=packages/"* | *"yarn --cwd=./packages/"* | *"yarn --cwd=packages "* | *"yarn --cwd=./packages "*)
    case "$cmd" in
      *yarn*)
        block "Blocked: run yarn from the repo root, not a child workspace (AGENTS.md). Use 'yarn workspace <name> <cmd>' from the root instead." ;;
    esac ;;
esac

# Never create GitHub issues from the shell — filing an issue is a human
# decision (.github/agents/pr-and-commit-rules.md). Requires `gh` as a whole
# token followed by "issue create", matching the real CLI form
# (`gh [flags] issue create …`); like the git checks below this is best-effort,
# not evasion-proof (a hand-rolled `gh api` call is out of scope).
case " $cmd " in
  *" gh "*"issue create"*)
    block "Blocked: agents must not create GitHub issues — filing an issue is a human decision (.github/agents/pr-and-commit-rules.md). Share the proposed issue title and body with the user instead." ;;
esac

# Everything below only applies to actual git invocations. Match `git` as a
# whole token (not a substring) so commands that merely mention git — e.g.
# `rg "git config" AGENTS.md` — aren't falsely blocked.
is_git=0
set -f
for tok in $cmd; do
  [ "$tok" = "git" ] && {
    is_git=1
    break
  }
done
set +f
[ "$is_git" -eq 1 ] || exit 0

# Never skip git hooks.
case "$cmd" in
  *--no-verify* | *--no-gpg-sign*)
    block "Blocked: skipping git hooks (--no-verify/--no-gpg-sign) is forbidden." ;;
esac

# Never change git config (reads are fine).
case "$cmd" in
  *"git config"*)
    case "$cmd" in
      *--get* | *--list* | *" -l "* | *" -l") ;;
      *) block "Blocked: 'git config' changes are forbidden." ;;
    esac ;;
esac

# Never force-push or push to main/master.
case "$cmd" in
  *"git push"*)
    case "$cmd" in
      *--force* | *" -f "* | *" -f")
        block "Blocked: force push only on explicit user request. Use --force-with-lease and confirm with the user first." ;;
    esac
    # Match main/master only as a whole ref/token (padding avoids matching
    # branches like "maintenance" or "main-feature"). Also catch explicit
    # refspecs like `HEAD:refs/heads/main` / `origin refs/heads/master`.
    case " $cmd " in
      *" main "* | *" master "* | *":main "* | *":master "* | \
        *" refs/heads/main "* | *" refs/heads/master "* | \
        *":refs/heads/main "* | *":refs/heads/master "*)
        block "Blocked: never push to main/master. Push the feature branch instead." ;;
    esac ;;
esac

exit 0
