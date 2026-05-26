---
name: review-actual-pr
description: Comprehensive review of a pull request in the actualbudget/actual repo. Performs an offline code review against the repo's CODE_REVIEW_GUIDELINES.md and AGENTS.md (no GitHub comments are ever posted), then browser-tests the change with playwright-cli. For bug PRs, reproduces the issue on edge.actualbudget.org first and verifies the fix on the Netlify preview; for feature/enhancement PRs, exercises the change on the preview and captures annotated screenshots highlighting the new functionality. Use whenever the user asks to review, test, validate, vet, sanity-check, QA, or otherwise look at a PR / pull request in the Actual Budget repo — including phrases like "review #1234", "check this PR", "test the fix in 1234", "does PR 1234 work", "validate PR 1234", or when given a github.com/actualbudget/actual/pull/N URL. Trigger even when the user doesn't explicitly say "review".
allowed-tools: Bash(gh:*) Bash(playwright-cli:*) Bash(npx:*) Bash(mkdir:*) Bash(ls:*) Bash(git:*) Read Edit Write
---

# Review an Actual Budget PR

This skill reviews a pull request in `actualbudget/actual` end-to-end: a thorough code review against the repo's documented rules, plus a browser-based functional test using `playwright-cli`. **It never posts anything back to GitHub.** All findings come back to the chat as suggested changes the user can apply themselves.

## Why this skill exists

Reviewing a PR thoroughly involves three things that are tedious to do by hand: reading the diff against the repo's many style/correctness rules, opening the right Netlify preview, and (for bugs) confirming the same scenario on the live edge build to prove the fix actually changes behavior. This skill collapses that into one flow.

## Hard rules

These rules exist because violating them defeats the purpose of an offline review or causes harm:

- **Never** run `gh pr comment`, `gh pr review`, `gh api ... /comments`, or anything else that writes to the PR thread. Output goes to the chat only.
- **Never** push commits, create branches, or modify the working tree of the repo. Reading is fine; writing is not.
- **Never** fabricate a reproduction. If the demo budget doesn't have the data needed to reproduce a bug, surface that to the user and stop — partial evidence is worse than no evidence.
- Before running anything that touches GitHub, check `git config user.name` / `user.email`; if the identity isn't yours (e.g. a CI bot or shared account), be doubly careful that no command in this skill could write to the PR — comments from the wrong identity are worse than no comments.

## Workflow

### 1. Resolve input → PR number

Accept any of: `7756`, `#7756`, `actualbudget/actual#7756`, or a full `https://github.com/actualbudget/actual/pull/7756` URL. Strip to the integer PR number. The repo is always `actualbudget/actual`.

### 2. Fetch metadata + diff

```bash
mkdir -p ~/Downloads/pr-review-<num>
gh pr view <num> --repo actualbudget/actual \
  --json number,title,body,labels,state,isDraft,headRefName,headRepository,baseRefName,files,url,author,additions,deletions \
  > ~/Downloads/pr-review-<num>/pr.json
gh pr diff <num> --repo actualbudget/actual \
  > ~/Downloads/pr-review-<num>/diff.patch
```

If the PR is `closed` or `merged`, tell the user and ask whether to continue (the preview URL may still work for merged PRs for a while). If `isDraft` is true, note it but proceed.

**Re-runs.** If `~/Downloads/pr-review-<num>/review.md` already exists from a previous run, read it before doing anything else. Compare its `head SHA` (recorded in the report header — see step 6) against the current PR head:

```bash
gh pr view <num> --repo actualbudget/actual --json headRefOid -q .headRefOid
```

- If the SHA matches, the previous review is still valid — surface a one-paragraph summary of what changed since (nothing, in this case) and ask the user whether to re-run testing, re-run code review, or just reprint the prior report. Don't redo work the user didn't ask for.
- If the SHA differs, fetch the diff between the old and new head (`git fetch origin pull/<num>/head` if needed, then `git diff <old-sha> <new-sha>`) so the new review can call out what changed since last time. Move the previous report to `review.<old-sha-short>.md` so it's preserved as history rather than overwritten.

### 3. Classify: bug vs feature/enhancement

Auto-detect using these signals, in order of strength:

- **Bug** if any label name matches (case-insensitive) `bug`, `defect`, `regression`, OR title starts with `fix:`, `bug:`, `hotfix:`, `[AI] fix`, `[AI] bug`, OR body contains `Fixes #` / `Closes #` linked to an issue with a `bug` label.
- **Feature / enhancement** if any label matches `enhancement`, `feature`, `feature request`, `improvement`, OR title starts with `feat:`, `feature:`, `enhancement:`, `[AI] add`, `[AI] feat`, OR the diff adds substantial new components/pages.
- **Other** (refactor, chore, docs, deps): tell the user the PR doesn't look like a user-facing change, do the code review only, skip browser testing unless the user insists.

If both signals fire (rare) or neither fires confidently, ask via `AskUserQuestion`. Don't guess.

### 4. Code review

Read `references/code-review-rubric.md` first — it's the condensed rule set. Then walk the diff and produce findings in three tiers:

- **Critical** — bugs, security issues, broken types/build, data loss risk, anything that would harm users.
- **Important** — repo-rule violations: new `@ts-strict-ignore`, new `eslint-disable` / `oxlint-disable`, untranslated user-facing strings, new UI-tweak settings, `as` where `satisfies` would work, missing `FinancialText`/`tnum` on standalone financial numbers, `any`/`unknown` without justification, wrong import sources (e.g. `useNavigate` from react-router instead of `src/hooks`), `[AI]` prefix missing from PR title.
- **Suggestions** — clarity, naming, dead code, repeated patterns worth extracting, unnecessary mocks in tests.

For every finding, include:

- `path:line` (or `path:line-line` for ranges) — pulled from the diff hunks, not approximated.
- One- or two-sentence description of the problem.
- A concrete suggested change — actual replacement code or a unified-diff snippet — that the user can paste. Don't give vague advice like "consider refactoring"; give the refactor.

If the PR has zero findings in a tier, say so explicitly ("no Critical issues found") rather than omitting the heading. The user wants to see that the dimension was checked.

### 5. Browser testing

Branch on classification.

#### Bug PR

Follow `references/browser-testing-bug.md`. The shape is:

1. Open `https://edge.actualbudget.org/`, do the standard demo setup, reproduce the bug per the PR/issue description, save `~/Downloads/pr-review-<num>/before-edge.png`.
2. Open `https://deploy-preview-<num>.demo.actualbudget.org/`, do the same setup, attempt the same repro, save `~/Downloads/pr-review-<num>/after-preview.png`.
3. State plainly:
   - `Bug reproduces on edge: yes/no`
   - `Bug reproduces on preview: yes/no`
   - `Verdict: fix confirmed / fix not visible / repro inconclusive`

If the preview URL doesn't load (404, 502, build still running), wait briefly and retry once; if it still fails, report it and stop the testing phase. The code review still ships.

#### Feature / enhancement PR

Follow `references/browser-testing-feature.md`. The shape is:

1. Open `https://deploy-preview-<num>.demo.actualbudget.org/` only — do **not** also open edge for features.
2. Do the standard demo setup.
3. Derive an exploration plan from the PR title + body (what's new, where in the UI, what user-visible behavior).
4. Walk through the feature step by step. At each meaningful step, take an annotated screenshot — use `references/highlight-element.js` (described below) to outline the new UI before screenshotting.
5. Take one final clean (un-annotated) screenshot of the feature in its end state, so the user has a presentable reference too.

All screenshots go to `~/Downloads/pr-review-<num>/`.

### 6. Output the report

Build the report as one markdown document with this exact shape:

```
# PR #<num>: <title>

**Author:** <author> · **Classification:** <bug | feature | other> · **Diff:** +<additions> / −<deletions>
**Head SHA:** <full sha> · **Reviewed:** <ISO 8601 timestamp>

## Code review

### Critical
- ...

### Important
- ...

### Suggestions
- ...

## Testing

<narrative — what was reproduced/exercised, on which environment, what happened>

**Screenshots:**
- `~/Downloads/pr-review-<num>/<file>.png` — <one-line caption>

**Verdict:** <one line>

---

_No comments were posted to GitHub. All suggestions above are local recommendations._
```

The `Head SHA` and `Reviewed` lines are mandatory — they're what makes re-runs (step 2) able to detect staleness. The trailing offline-review line is mandatory too.

**Save the report and print it:**

```bash
# Save first so it survives anything that happens to the chat
cat > ~/Downloads/pr-review-<num>/review.md <<'EOF'
<the full report markdown>
EOF
```

Then print the same content to chat. Saving is non-negotiable — the whole point is the user can come back to `~/Downloads/pr-review-<num>/` later and find the screenshots, the diff, the metadata, and the review notes that explain them, all in one place.

If you have structured intermediate data worth keeping (e.g., parsed findings as a list), also drop it as `~/Downloads/pr-review-<num>/findings.json` — it's optional but cheap and useful for any tooling the user wires up later.

The folder layout after a successful run looks like:

```
~/Downloads/pr-review-<num>/
├── pr.json              # gh pr view output
├── diff.patch           # gh pr diff output
├── review.md            # the markdown report
├── findings.json        # optional structured findings
├── before-edge.png      # bug PRs only
├── after-preview.png    # bug PRs only
├── feature-step-N.png   # feature PRs, annotated
└── feature-final.png    # feature PRs, clean
```

## Standard demo setup

For both edge and preview testing, the first-run flow is:

1. Wait for the setup screen to render.
2. Click **"Don't use a server"**.
3. Click **"View demo"**.

This loads a populated test budget with realistic accounts, transactions, categories, and budgeted amounts — far more useful than starting empty (per `AGENTS.md` "Testing and previewing the app"). The demo data is the same on edge and preview, so reproductions translate directly.

If the page already shows a budget (state was preserved from a previous session), use it as-is. If you need a fresh state, clear localStorage:

```bash
playwright-cli localstorage-clear
playwright-cli reload
```

## Highlighting elements in screenshots

For feature PRs, use `references/highlight-element.js` via `playwright-cli run-code` to draw a red dashed bounding box and a label callout over the new UI before screenshotting. Pass the selector and label as environment-style arguments.

Resolve the script path from the repo root so this works for any contributor:

```bash
SKILL_DIR="$(git rev-parse --show-toplevel)/.claude/skills/review-actual-pr"

SELECTOR='[data-testid="new-thing"]' LABEL='New filter chip' \
  playwright-cli run-code --filename="$SKILL_DIR/references/highlight-element.js"
playwright-cli screenshot --filename="$HOME/Downloads/pr-review-<num>/feature-step-1.png"
# remove overlay before next step so unrelated screenshots stay clean
playwright-cli eval "document.querySelectorAll('[data-pr-highlight]').forEach(n => n.remove())"
```

If you can't find a stable selector for the new UI, use a CSS selector that matches what's actually in the DOM after a `playwright-cli snapshot` — don't fall back to silently un-annotated screenshots, since highlighting is the point of feature shots.

## Tooling assumptions

- `gh` is authenticated for read access to `actualbudget/actual`. A read-only identity (bot, CI, or personal account) is fine — see the hard rule above about not writing back.
- `playwright-cli` is on PATH (typically installed via the `playwright-cli` skill). If it isn't, fall back to `npx --no-install playwright-cli`; if that also fails, surface it and stop the browser-testing phase rather than guessing at an alternative tool.
- Output goes to `~/Downloads/pr-review-<num>/` (exists on macOS, Linux, and Windows). If a contributor prefers a different location, they can override it — but keep everything for one run in a single directory so the report and its screenshots stay together.

## Reference files

- `references/code-review-rubric.md` — condensed rules from `CODE_REVIEW_GUIDELINES.md` + `AGENTS.md`. Read before reviewing the diff.
- `references/browser-testing-bug.md` — step-by-step playbook for bug PRs (edge → preview).
- `references/browser-testing-feature.md` — step-by-step playbook for feature PRs (preview only, annotated).
- `references/highlight-element.js` — overlay script for annotated screenshots.
