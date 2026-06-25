---
name: committing-actual-changes
description: Use whenever creating, drafting, finalizing, or amending a git commit or a pull request in the Actual Budget repo (actualbudget/actual) — including phrases like "commit this", "make a commit", "stage and commit", "open a PR", "create a pull request", "send this for review", "push these changes", "ship it", "submit a PR", "raise a PR", or any time finishing implementation work in this repo where committing or opening a PR is the natural next step. Also trigger when the user mentions the `[AI]` prefix, the PR template, git hooks, or `--no-verify` in this repo. The repo enforces strict, non-obvious rules for AI-generated contributions (mandatory `[AI]` prefix on every commit message and PR title, leaving the PR template blank, never skipping hooks, specific git-safety constraints, a pre-commit quality checklist) and not following them produces commits and PRs that have to be redone or manually fixed by a maintainer.
---

# Committing Changes in actualbudget/actual

Before creating any git commit or pull request in this repo, read:

**`.github/agents/pr-and-commit-rules.md`**

It is the authoritative source for the rules you must apply yourself: the `[AI]` PR-title prefix and leaving the PR template blank (and the Chinese exception). The mechanical commit/git rules are enforced by tooling and aren't restated there. Read it on every commit/PR session so any updates are picked up automatically.

## The one rule worth restating

Every commit message and every pull request title MUST begin with `[AI]`. Commit messages are checked by the git-guard hook (a missing prefix is blocked before the commit lands), so the one that needs _your_ attention is the PR title — nothing checks it for you, and the cost of forgetting it is high since the PR has to be renamed by hand. Examples:

- `[AI] Fix type error in account validation` — correct
- `Fix type error in account validation` — wrong, missing prefix

The PR-template rule and the rest live in the rules file. Read it before each commit/PR rather than relying on this skill's summary, because the rules file evolves and this skill deliberately does not restate it.

## Why this matters

Maintainers triage AI-authored contributions separately, and the `[AI]` prefix is what makes that triage fast — it also drives the automatic `"AI generated"` PR label, so getting the prefix right is the one action that gates the whole triage path. Without it the PR looks like a normal human contribution and the wrong review process gets applied. The "do not fill in the PR template" rule exists because the human is the one who actually tested the change and can write the Description / Testing / Checklist sections honestly — an AI-filled template misrepresents who did what.

The rules file is short. Read it.
