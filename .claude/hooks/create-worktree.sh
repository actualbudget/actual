#!/bin/bash
set -e

# Create a temporary worktree directory
WORKTREE_PATH=$(mktemp -d)
git worktree add --detach "$WORKTREE_PATH" HEAD

# Install dependencies in the new worktree
cd "$WORKTREE_PATH"
yarn install

# Output the worktree path for Claude Code
echo "$WORKTREE_PATH"
