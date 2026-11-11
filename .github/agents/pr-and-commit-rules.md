# PR and Commit Rules for AI Agents

This file lists the PR and commit rules you have to apply yourself.

## Pull Request Rules

### Draft PRs

Open a PR as a draft while the work is still in progress, and mark it ready for
review once it is done.

### PR description

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) as the body and keep
every heading. A hook checks the body when you create the PR through the
GitHub MCP tool, and CI checks it on the PR itself however it was created.

- **Leave the "Human Summary" section empty and every box in the "Checklist"
  section unchecked.** The human author writes the summary in their own words and ticks
  the checklist; CI fails the PR until the summary is filled in.
- **You may write the "Description" and "Testing" sections**, but keep them to
  150 words in total. Say what changed and how to test it — no filler.

### Proof is mandatory

**Every PR that changes app code must prove that it works.** Maintainers
should not have to test a change by hand to see what it does.

Verify the change in a real browser before opening the PR, and put a before
AND an after screenshot, or a video, in the "Proof" section. Passing tests are
not proof. The commands for capturing and attaching it, including from a fork,
are in `.claude/skills/proving-actual-changes/SKILL.md`.

Tick the checkbox in the "Proof" section only when there is truly nothing to
show (a refactor, types, tests) — never to skip the verification.

## Do not create GitHub issues

**Agents must never create GitHub issues.** Filing an issue is a human
decision — neither the GitHub MCP tools (`issue_write` with method `create`)
nor the `gh` CLI (`gh issue create`) may be used to open one; agent hooks
block both. If you believe an issue should exist, share the proposed title
and body with the user and let them file it. Updating existing issues (and
commenting on them) remains allowed.

## GitHub comment, review and issue prefix

**Prefix everything you post to GitHub with the robot emoji 🤖** — pull-request
and issue comments, pull-request reviews (including inline review comments), and
the title and body of issues you edit. This keeps agent-authored content
visibly marked. PR titles and commit messages take no prefix.

Write the text normally; just make sure 🤖 is the first character (for issues,
on both the title and the body).

This applies only to comments **you** author — bots like CodeRabbit post under
their own identity and are not affected.
