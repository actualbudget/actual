# PR and Commit Rules for AI Agents

This file lists the PR and commit rules you have to apply yourself.

## Pull Request Rules

### `[AI]` prefix on PR titles

**ALL pull request titles MUST be prefixed with `[AI]`** — you have to apply it
yourself.

**Examples:**

- `[AI] Fix type error in account validation`
- `Fix type error in account validation` (MISSING PREFIX — NOT ALLOWED)

### Do not fill in the PR template

- **NEVER fill in the PR template** (`.github/PULL_REQUEST_TEMPLATE.md`). Create
  the PR with that template as the body, unmodified — leave all blank spaces and
  placeholder comments as-is, and leave every checklist box unchecked. The human
  who tested the change fills in the Description, Related issue(s), Testing, and
  Checklist sections.
- **Exception**: if a human **explicitly asks** you to fill it out, do so **in
  Chinese**, using Chinese characters (简体中文) for all content you add.

## GitHub comment, review and issue prefix

**Prefix everything you post to GitHub with the robot emoji 🤖** — pull-request
and issue comments, pull-request reviews (including inline review comments), and
the title and body of issues you create. This keeps agent-authored content
visibly marked. It does **not** change PR titles (still `[AI] …`) or commit
messages (still `[AI] …`).

Write the text normally; just make sure 🤖 is the first character (for issues,
on both the title and the body).

This applies only to comments **you** author — bots like CodeRabbit post under
their own identity and are not affected.
