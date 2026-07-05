---
name: writing-release-notes
description: Use whenever adding, writing, drafting, or fixing a release note in the Actual Budget repo. This is the changelog entry that ships with a code change, living as a Markdown file in `upcoming-release-notes/`. Trigger for asks like "add a release note", "write the changelog entry", "add the release note for this PR/change", "create the upcoming release note", or any time finishing a user-facing change in this repo where a release note is the natural next step. These notes are published for humans to read, so they must be short, plain-language, and free of technical detail. Writing them like a commit message or with implementation jargon produces entries that get flagged and rewritten in review.
---

# Writing Release Notes for actualbudget/actual

Release notes are the user-facing changelog. Each code change adds one Markdown file to `upcoming-release-notes/`, and these get collected into the published changelog at the next release. The authoritative source is the **Writing Good Release Notes** section of `packages/docs/docs/contributing/index.md`. Read it if anything below is unclear.

## The file

Create `upcoming-release-notes/<slug>.md`, where `<slug>` is a **short, descriptive kebab-case slug** naming the change (e.g. `add-payee-autocomplete.md`, `fix-mobile-category-delete.md`). Do **not** use a PR number, since the PR link is resolved automatically at release time. (Numeric filenames like `1234.md` still work, but a slug is preferred.)

```markdown
---
category: Features
authors: [YourGitHubUsername]
---

Add payee autocomplete to the transaction entry form
```

- **`category`**: exactly one of `Features` (new feature), `Enhancements` (improvement to an existing feature), `Bugfix` (bug fix), or `Maintenance` (internal change with no user-visible effect).
- **`authors`**: array of the GitHub username(s) who did the work.

## Writing the entry

The body is the changelog line. It is read by everyday users, not developers.

- **One sentence.** Short and clear. No paragraphs, no bullet lists, no long prose.
- **Plain language, no technical detail.** Describe what changed for the user, not how it was built. Avoid file names, function names, internal component names, and implementation jargon. (Exception: `Maintenance` entries may be technical, since they are for internal changes.)
- **Phrase it as a command.** Start with a present-tense verb: "Add …", "Fix …", "Show …", not "Added …" or "Adds …".
- Generally match the PR title, but reword it if that reads more clearly to a user.

Good: `Fix incorrect balance when reconciling an account with future transactions`
Too technical: `Fix off-by-one in reconcileTransactions() when txn.date > today`
