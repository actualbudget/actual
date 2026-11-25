---
name: committing-actual-changes
description: Use when creating or amending a git commit or a pull request in the Actual Budget repo (actualbudget/actual) ("commit this", "open a PR", "push these changes", "ship it"), when finishing work where committing or opening a PR is the natural next step, or when the user mentions the PR template, git hooks, or `--no-verify`.
---

# Committing Changes in actualbudget/actual

The repo enforces strict, non-obvious rules for AI-generated contributions: a fixed PR description format with a human-only summary, never skipping hooks, specific git-safety constraints and a pre-commit quality checklist. Commits and PRs that ignore them have to be redone or fixed by hand by a maintainer.

Before creating any git commit or pull request in this repo, read:

**`.github/agents/pr-and-commit-rules.md`**

It is the authoritative source for the rules you must apply yourself, chiefly the PR description format: which sections you may write, and which stay blank for the human author. A hook blocks PR creation through the GitHub MCP tool when the body breaks those rules, and CI checks every PR. The mechanical commit/git rules are enforced by tooling and aren't restated there.

The rules file is short and it evolves, so read it on every commit/PR session rather than relying on memory.
