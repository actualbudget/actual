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

## GitHub comment, review and issue voice

This applies to **anything you post to GitHub** — pull-request and issue
comments, pull-request reviews (including inline review comments), and the title
and body of issues you create. It does **not** change PR titles (still `[AI]
…` in English) or commit messages (still `[AI] …`).

1. **Prefer 简体中文 (Chinese).** Whenever you can, write the comment / review /
   issue in Chinese using Chinese characters.
2. **Otherwise, talk like a pirate — yarr!** If Chinese isn't workable, write it
   in a fun pirate voice (ahoy, matey, avast, shiver me timbers…). Keep any
   essential technical terms, code, links and identifiers intact and accurate —
   only the surrounding prose gets the pirate treatment.
3. **Never plain English.** A normal-English comment is not acceptable; pick one
   of the two above.

**Exception — CodeRabbit.** This rule only covers comments **you** author.
Comments authored by CodeRabbit itself are exempt — but that's automatic, since
the bot posts under its own identity. A comment **you** write that merely
*mentions* `@coderabbitai` (e.g. `@coderabbitai review`) is still your own prose
and is **not** exempt — write it in Chinese or pirate like any other comment.

A cross-platform hook enforces this where hooks run (Claude, Codex, Cursor — see
`scripts/agent-hooks/github-comment-style.sh`): it blocks a github comment /
review / issue whose body is plain English. It only ever sees your own outgoing
comments, so CodeRabbit's own comments never reach it. On platforms without hook
support, apply the rule yourself.
