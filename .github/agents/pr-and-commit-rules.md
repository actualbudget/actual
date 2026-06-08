# PR and Commit Rules for AI Agents

The mechanical commit and git rules are handled by tooling. This file lists only
the rules you have to apply yourself.

## Pull Request Rules

### `[AI]` prefix on PR titles

**ALL pull request titles MUST be prefixed with `[AI]`.** This isn't enforced
automatically — you have to apply it yourself.

**Examples:**

- `[AI] Fix type error in account validation`
- `Fix type error in account validation` (MISSING PREFIX — NOT ALLOWED)

### Do not fill in the PR template

- **NEVER fill in the PR template** (`.github/PULL_REQUEST_TEMPLATE.md`). Leave all
  blank spaces and placeholder comments as-is — the human who tested the change
  fills in the Description, Related issue(s), Testing, and Checklist sections.
- **Exception**: if a human **explicitly asks** you to fill it out, do so **in
  Chinese**, using Chinese characters (简体中文) for all content you add.
