---
name: committing-actual-changes
description: Use whenever creating, drafting, finalizing, or amending a git commit or a pull request in the Actual Budget repo (actualbudget/actual) — including phrases like "commit this", "make a commit", "stage and commit", "open a PR", "create a pull request", "send this for review", "push these changes", "ship it", "submit a PR", "raise a PR", or any time finishing implementation work in this repo where committing or opening a PR is the natural next step. Also trigger when the user mentions the `[AI]` prefix, the "AI generated" label, the PR template, git hooks, or `--no-verify` in this repo. The repo enforces strict, non-obvious rules for AI-generated contributions (mandatory `[AI]` prefix on every commit message and PR title, mandatory "AI generated" label, leaving the PR template blank, never skipping hooks, specific git-safety constraints, a pre-commit quality checklist) and not following them produces commits and PRs that have to be redone or manually fixed by a maintainer.
---

# Committing Changes in actualbudget/actual

Before creating any git commit or pull request in this repo, read:

**`.github/agents/pr-and-commit-rules.md`**

It is the authoritative source for the `[AI]` prefix requirement, the git-safety rules, the pre-commit quality checklist (`yarn typecheck`, `yarn lint:fix`, relevant tests, translated strings), the "AI generated" PR label, the rule about leaving the PR template blank, and the quick-reference workflow. Read it on every commit/PR session so any updates to those rules are picked up automatically.

## The one rule worth restating

Every commit message and every pull request title MUST begin with `[AI]`. This is the single most-violated rule and the cost of forgetting it is high — the commit has to be amended or the PR has to be renamed by hand. Examples:

- `[AI] Fix type error in account validation` — correct
- `Fix type error in account validation` — wrong, missing prefix

Everything else (git safety, hooks, label, PR template, pre-commit checklist) lives in the rules file. Read it before each commit/PR rather than relying on this skill's summary, because the rules file evolves and this skill deliberately does not restate it.

## Why this matters

Maintainers triage AI-authored contributions separately, and the `[AI]` prefix plus the "AI generated" label are what make that triage fast. Without them the PR looks like a normal human contribution and the wrong review process gets applied. The "do not fill in the PR template" rule exists because the human is the one who actually tested the change and can write the Description / Testing / Checklist sections honestly — an AI-filled template misrepresents who did what. The hook-skipping prohibition (`--no-verify`, `--no-gpg-sign`) exists because this codebase enforces formatting and lint at commit time deliberately; bypassing the hook is how broken code lands on a branch.

The rules file is short. Read it.
