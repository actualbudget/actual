# Browser testing playbook: feature / enhancement PR

For feature PRs we don't compare against edge — the feature didn't exist there. We just need to demonstrate, on the PR preview, that the new behavior works as advertised, and produce screenshots that **make the new functionality obvious**. Annotated shots beat raw shots: a red dashed box around the new chip/menu/setting tells the next reviewer where to look without reading any caption.

## Constants

- `PREVIEW_URL = https://deploy-preview-<num>.demo.actualbudget.org/`
- Output dir: `~/Downloads/pr-review-<num>/`
- Highlight script: `$(git rev-parse --show-toplevel)/.claude/skills/review-actual-pr/references/highlight-element.js`

## Step 1 — derive an exploration plan

From the PR title and body, list:

1. **What's new** in user terms (one sentence).
2. **Where it lives** in the UI (page / panel / menu).
3. **The path a user takes to use it** (3–8 steps).
4. **The end state** that proves it works.

If the PR description is sparse and you can't write a clear plan, ask the user before testing — there's no point screenshotting a feature you don't understand.

## Step 2 — open the preview and set up

```bash
playwright-cli open $PREVIEW_URL
playwright-cli snapshot
```

Standard demo setup:

1. Click "Don't use a server".
2. Click "View demo".

Wait for the budget to load. Set a sensible viewport so screenshots are presentable:

```bash
playwright-cli resize 1440 900
```

## Step 3 — walk the feature, screenshotting with annotations

For each meaningful step in the plan:

1. Navigate / click / fill as needed (use refs from `playwright-cli snapshot`).
2. Take a snapshot to find a stable selector for the _new_ UI element introduced by the PR. Prefer `data-testid` if present, then a role + accessible name, then a CSS selector. Avoid brittle nth-child chains.
3. Inject the highlight overlay:
   ```bash
   SELECTOR='<your selector>' LABEL='<short label, e.g. "New filter chip">' \
     playwright-cli run-code --filename=$HOME/.claude/skills/review-actual-pr/references/highlight-element.js
   ```
4. Screenshot:
   ```bash
   playwright-cli screenshot --filename=$HOME/Downloads/pr-review-<num>/feature-step-N.png
   ```
5. Remove the overlay so it doesn't bleed into the next shot:
   ```bash
   playwright-cli eval "document.querySelectorAll('[data-pr-highlight]').forEach(n => n.remove())"
   ```

If a step _changes the layout_ (modal opens, panel slides out), re-snapshot first — refs change.

## Step 4 — final clean shot

After the last annotated step, take one more screenshot **without** any overlay, in the feature's end state:

```bash
playwright-cli screenshot --filename=$HOME/Downloads/pr-review-<num>/feature-final.png
```

This gives the user a presentable shot to drop into release notes / PR descriptions later, separate from the QA evidence shots.

## Step 5 — verdict and report

State plainly:

- `Behavior matches PR description: yes / no / partially`
- For each step: a one-line note about what happened and which screenshot shows it.
- If anything in the PR description isn't actually visible in the build, call it out — the PR may need further work.

## When highlighting fails

If you can't find a stable selector for the new UI:

1. Take an unannotated snapshot first to confirm the element is on screen.
2. Try a coarser selector (the parent container).
3. As a last resort, skip annotation for that step but still take the screenshot, and note in the report which step lacks a highlight and why.

Never silently produce un-annotated shots when the user asked for highlighted ones — flag the gap so they know.

## Things to avoid

- **Don't** also test on edge. The feature isn't there. Comparing isn't useful.
- **Don't** clear localStorage between steps unless a step requires fresh state — it logs you out of the demo and forces redoing setup.
- **Don't** assume animations have finished. After a `click` that opens a panel, take a snapshot before screenshotting to make sure the post-animation state is what's captured.
