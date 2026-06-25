#!/bin/sh
# Cursor `beforeMCPExecution` adapter.
#
# Dispatches github MCP calls to the matching shared guard in
# scripts/agent-hooks/: comment/review/issue writers must be 🤖-prefixed
# (github-comment-style.sh), and create_pull_request must leave the PR template
# blank (pr-template-blank.sh).
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

# Pick the guard for this tool; wave everything else by.
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
case "$tool" in
  mcp__github__add_issue_comment | \
    mcp__github__add_comment_to_pending_review | \
    mcp__github__add_reply_to_pull_request_comment | \
    mcp__github__pull_request_review_write | \
    mcp__github__issue_write | \
    mcp__github__sub_issue_write)
    guard=github-comment-style.sh ;;
  mcp__github__create_pull_request)
    guard=pr-template-blank.sh ;;
  *) allow ;;
esac

# Each guard reads the same `.tool_input.*` payload Cursor passes, so forward it
# unchanged. Exit 0 allows, exit 2 + stderr is a real policy denial. Fail closed
# on any other exit (matching guard-shell.sh) so a broken/missing guard can't
# silently disable enforcement; the message marks it as an execution problem.
# (Each guard itself fails *open* on a malformed payload, returning exit 0.)
status=0
err=$(printf '%s' "$input" | "$ROOT/scripts/agent-hooks/$guard" 2>&1) || status=$?
case "$status" in
  0) allow ;;
  2) deny "$err" ;;
  *) deny "$guard failed (exit $status): $err" ;;
esac
