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

## GitHub comment, review and issue prefix

**Prefix everything you post to GitHub with the robot emoji 🤖** — pull-request
and issue comments, pull-request reviews (including inline review comments), and
the title and body of issues you create. This keeps agent-authored content
visibly marked. It does **not** change PR titles (still `[AI] …`) or commit
messages (still `[AI] …`).

Write the text normally; just make sure 🤖 is the first character (for issues,
on both the title and the body).

A cross-platform hook enforces this where hooks run (Claude, Codex, Cursor — see
`scripts/agent-hooks/github-comment-style.sh`): it blocks a github comment /
review / issue whose body (or, for issues, title) does not start with 🤖. It only
ever sees your own outgoing comments, so bots like CodeRabbit are unaffected. On
platforms without hook support, apply the rule yourself.
