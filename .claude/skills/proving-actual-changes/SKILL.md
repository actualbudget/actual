---
name: proving-actual-changes
description: Use when opening a PR that changes Actual app code, or when a PR's Proof section is missing or fails the PR description check ("add proof", "before and after", "record a video"). Covers capturing before and after screenshots or a video in a real browser (Playwright via `playwright-cli`, headless is fine) and attaching them, including from a fork.
---

# Proving a change works in actualbudget/actual

Proof is the change working in a real browser: **a before AND an after screenshot, or a video**, in the PR's "Proof" section. Passing tests are not proof. When nothing is user-visible (a refactor, types, tests), tick the Proof checkbox instead. Never tick it to skip verifying.

"Real browser" means the app actually running and rendered, not a mock-up or a description of what it would look like. A headless browser counts: the steps below drive Chromium through Playwright with `playwright-cli`.

## 1. Capture "before"

"Before" is the app without your change. The quickest source is the nightly build of `master` at `https://edge.actualbudget.org`:

```bash
PROOF=~/Downloads/pr-proof-$( (git branch --show-current | grep . || git rev-parse --short HEAD) | tr '/' '-')
mkdir -p "$PROOF"
echo "$PROOF"   # reuse this literal path if your shell does not keep variables

playwright-cli open https://edge.actualbudget.org
playwright-cli resize 1280 800
# First run: click "Don't use a server", then "View demo" (see AGENTS.md
# "Testing and previewing the app"). Navigate to the screen your change touches.
playwright-cli screenshot --filename="$PROOF/before.png"
```

Keep the proof folder outside the repository so the files are never committed.

Edge is the last nightly build of `master`. If your base differs (a stacked PR, or newer `master` commits), capture "before" from the merge base: commit your work, run `git switch --detach "$(git merge-base HEAD <base-branch>)"`, start the app as in step 2 and save `"$PROOF/before.png"`. Stop that server, then run `git checkout -` to return to where you were (`git switch -` fails if you started on a detached HEAD) and capture "after" from there.

For a brand-new feature there is no "before" state to show. Use two screenshots of the new flow (for example the entry point and the result), or a video. To point out the new UI in a screenshot, see "Highlighting elements in screenshots" in `.claude/skills/review-actual-pr/SKILL.md`.

## 2. Capture "after"

Run your branch:

```bash
yarn start   # in its own terminal; note the URL it prints

playwright-cli open <printed-url>
playwright-cli resize 1280 800
playwright-cli screenshot --filename="$PROOF/after.png"
```

Repeat the same demo setup and navigation as "before", so the only difference between the two captures is your change. When the change is an interaction rather than a static state, record it instead:

```bash
playwright-cli video-start "$PROOF/flow.webm"
# ...perform the interaction...
playwright-cli video-stop
```

Walk the path once before recording. Hold 1 to 2 seconds on the result (on the broken state, for a bug) and pause about half a second before each click. If you hunt for a control, record again.

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

For a video, use `![](./flow.webm)` on a line of its own. `gh` turns it into a bare link, which GitHub plays; a bare `./flow.webm` path is not rewritten.

```bash
# Run from the repository checkout. Paths in the body are resolved relative
# to the body file, so ./before.png means "$PROOF/before.png".
gh pr create --draft --title "..." --body-file "$PROOF/body.md" \
  --attach "$PROOF/before.png" --attach "$PROOF/after.png"
```

An attachment that the body does not reference is appended to the end of the description, outside the "Proof" section, where it does not count. `gh` checks every file before uploading (it rejects a missing file, an unsupported type or an image over 10 MB) and changes nothing if one fails.

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

Tell the human which files in `$PROOF` to drag into "Proof". Never open a PR whose description claims proof it does not contain.

## What CI checks

The "Proof" section needs two images or one video, or its ticked box. CI cannot tell whether they show your change; reviewers can.
