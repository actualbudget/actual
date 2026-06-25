#!/bin/sh
# Cursor `beforeMCPExecution` adapter.
#
# Translates Cursor's MCP-call hook I/O to the shared guard in
# scripts/agent-hooks/github-comment-style.sh, which requires GitHub comments,
# reviews and issues to be prefixed with the robot emoji 🤖.
# Cursor input on stdin: { tool_name, tool_input, ... }. Output on stdout:
# { permission: "allow" | "deny", userMessage, agentMessage }.

input=$(cat)
# `CDPATH= cd` is an intentional empty-env prefix (not an assignment); silence the
# SC1007 false positive shellcheck raises for it.
# shellcheck disable=SC1007
ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)

allow() {
  jq -n '{permission:"allow"}'
  exit 0
}
deny() {
  jq -n --arg m "$1" \
    '{permission:"deny", userMessage:"Blocked by repo policy", agentMessage:$m}'
  exit 0
}

# Only police the github comment/review/issue writers; wave everything else by.
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
case "$tool" in
  mcp__github__add_issue_comment | \
    mcp__github__add_comment_to_pending_review | \
    mcp__github__add_reply_to_pull_request_comment | \
    mcp__github__pull_request_review_write | \
    mcp__github__issue_write | \
    mcp__github__sub_issue_write) ;;
  *) allow ;;
esac

# The shared guard already reads `.tool_input.body` / `.tool_input.title`, which
# is exactly the shape Cursor passes, so forward the payload unchanged. Exit 0
# allows, exit 2 + stderr means "add the 🤖 prefix". Fail closed on any other
# exit (matching guard-shell.sh) so a broken/missing guard can't silently
# disable enforcement; the message marks it as an execution problem, not a real
# policy denial. (The guard itself still fails *open* on a malformed payload —
# that's its own data-level choice and returns exit 0, handled above.)
status=0
err=$(printf '%s' "$input" | "$ROOT/scripts/agent-hooks/github-comment-style.sh" 2>&1) || status=$?
case "$status" in
  0) allow ;;
  2) deny "$err" ;;
  *) deny "github-comment-style guard failed (exit $status): $err" ;;
esac
