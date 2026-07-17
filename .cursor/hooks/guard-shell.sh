#!/bin/sh
# Cursor `beforeShellExecution` adapter.
#
# Translates Cursor's hook I/O to the shared guard in
# scripts/agent-hooks/git-guard.sh. Cursor input on stdin: { command, cwd, ... }.
# Output on stdout: { permission: "allow" | "deny", userMessage, agentMessage }.

input=$(cat)
ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)

deny() {
  jq -n --arg m "$1" \
    '{permission:"deny", userMessage:"Blocked by repo policy", agentMessage:$m}'
  exit 0
}
allow() {
  jq -n '{permission:"allow"}'
  exit 0
}

# Fail closed: a malformed payload (jq parse failure / missing command) must
# deny, not silently allow.
cmd=$(printf '%s' "$input" | jq -re '.command // empty') ||
  deny "Invalid Cursor hook payload: could not read .command."
cwd=$(printf '%s' "$input" | jq -r '.cwd // ""')

# Cursor passes cwd rather than a literal `cd packages/...`, so catch
# yarn-run-from-a-workspace here before delegating.
case "$cwd" in
  "$ROOT"/packages | "$ROOT"/packages/*)
    case "$cmd" in
      yarn* | *" yarn "*)
        deny "Run yarn from the repo root, not a child workspace (AGENTS.md). Use 'yarn workspace <name> <cmd>' from $ROOT." ;;
    esac ;;
esac

# Delegate the git-safety checks to the shared guard (reads .tool_input.command).
# Fail closed: deny on a block (exit 2) AND on any unexpected guard failure.
status=0
err=$(printf '{"tool_input":{"command":%s}}' "$(jq -n --arg c "$cmd" '$c')" |
  "$ROOT/scripts/agent-hooks/git-guard.sh" 2>&1) || status=$?
case "$status" in
  0) allow ;;
  2) deny "$err" ;;
  *) deny "git-guard failed (exit $status): $err" ;;
esac
