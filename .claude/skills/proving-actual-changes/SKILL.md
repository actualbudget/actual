---
name: proving-actual-changes
description: Use whenever a change to Actual Budget app code is about to become a pull request, or an existing PR is missing proof — including phrases like "open a PR", "add proof", "attach screenshots", "before and after", "record a video of the change", "the PR description check is failing", or any time implementation work in this repo is finished and needs to be shown working. Every PR that changes app code must include a before AND an after screenshot (or a video) captured from a real browser, placed in the "Proof" section of the PR description; CI blocks the PR without it. This skill covers running the app, capturing the proof, and attaching it — including from a fork, where the usual upload command is not allowed.
---

# Proving a change works in actualbudget/actual

Maintainers should not have to run a change by hand to see what it does. Passing tests are not proof: proof is the change working in a real browser, captured as **a before AND an after screenshot, or a video**, in the "Proof" section of the PR description. The rules are in `.github/agents/pr-and-commit-rules.md`; this is how to follow them.

Skip all of this only when the change has no user-visible effect at all (a refactor, types, tests). Then tick the checkbox in the "Proof" section instead. Never tick it to avoid the verification.

## 1. Capture "before"

"Before" is the app without your change. The quickest source is the nightly build of `master` at `https://edge.actualbudget.org`:

```bash
PROOF=~/Downloads/pr-proof-$(git branch --show-current | tr '/' '-')
mkdir -p "$PROOF"

playwright-cli open https://edge.actualbudget.org
playwright-cli resize 1280 800
# First run: click "Don't use a server", then "View demo" (see AGENTS.md
# "Testing and previewing the app"). Navigate to the screen your change touches.
playwright-cli screenshot --filename="$PROOF/before.png"
```

Keep the proof folder outside the repository so the files are never committed.

For a brand-new feature there is no "before" state to show. Use two screenshots of the new flow (for example the entry point and the result), or a video. To point out the new UI in a screenshot, see "Highlighting elements in screenshots" in `.claude/skills/review-actual-pr/SKILL.md`.

## 2. Capture "after"

Run your branch:

```bash
yarn start   # serves the app on http://localhost:3001

playwright-cli open http://localhost:3001
playwright-cli resize 1280 800
playwright-cli screenshot --filename="$PROOF/after.png"
```

Repeat the same demo setup and navigation as "before", so the only difference between the two captures is your change. When the change is an interaction rather than a static state, record it instead:

```bash
playwright-cli video-start "$PROOF/flow.webm"
# ...perform the interaction...
playwright-cli video-stop
```

Look at what you captured (Read the PNG) before attaching it. A screenshot of a loading spinner or the wrong screen is not proof.

If `playwright-cli` is not on PATH, try `npx --no-install playwright-cli`; if that fails too, say so and stop rather than claiming a verification you did not do.

## 3. Attach it

Write the PR body to `$PROOF/body.md`, starting from `.github/PULL_REQUEST_TEMPLATE.md`, and reference the images **inside the "Proof" section** by relative path. `gh` uploads the files and rewrites the paths:

```markdown
## Proof

| Before                  | After                 |
| ----------------------- | --------------------- |
| ![Before](./before.png) | ![After](./after.png) |
```

```bash
# Run from the repository checkout. Paths in the body are resolved relative
# to the body file, so ./before.png means "$PROOF/before.png".
gh pr create --draft --title "..." --body-file "$PROOF/body.md" \
  --attach "$PROOF/before.png" --attach "$PROOF/after.png"
```

An attachment that the body does not reference is appended to the end of the description, which is outside the "Proof" section and does not count. After creating the PR, run `gh pr view --json body --jq .body` and confirm the uploaded links sit under "## Proof"; move them with `gh pr edit --body-file` if not. Do this for videos in particular.

`--attach` needs `gh` 2.99 or newer and push access to the repository.

### From a fork

Without push access to `actualbudget/actual`, `--attach` is refused there. Upload to your own fork instead and reuse the links, which are readable by everyone and survive deletion of the comment they were uploaded with:

```bash
FORK=<your-username>/actual
# Any pull request in your fork works as a place to upload to. If the fork has
# none, open a scratch draft PR there from your branch first.
URL=$(gh pr comment <fork-pr-number> --repo "$FORK" --body "proof upload" \
  --attach "$PROOF/before.png" --attach "$PROOF/after.png")
ID=${URL##*issuecomment-}
gh api "repos/$FORK/issues/comments/$ID" --jq .body   # prints the uploaded links
gh api -X DELETE "repos/$FORK/issues/comments/$ID"    # tidy up
```

Paste the printed `https://github.com/user-attachments/assets/...` links into the "Proof" section of the upstream PR body as `![Before](...)` and `![After](...)` (a video is just its bare link on a line of its own).

### If attaching fails

Tell the human exactly which files in the proof folder to drag into the "Proof" section. Never open a PR whose description claims proof it does not contain.

## What CI checks

The "PR description" check fails a PR that changes app code unless the "Proof" section has at least two images or one video, or its checkbox is ticked. It cannot tell whether the images show your change — reviewers can, and will close PRs whose proof is not real.
